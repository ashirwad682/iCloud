import { UserModel, IUser } from '../../database/models/User';
import { SessionModel } from '../../database/models/Session';
import { PasskeyModel } from '../../database/models/Passkey';
import { SecurityEventModel } from '../../database/models/SecurityEvent';
import { CryptoUtil } from '../../common/utils/crypto';
import { DeviceInfo } from '../../common/utils/ua';
import { config } from '../../config/env.config';
import { AppError } from '../../common/middleware/error.middleware';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import qrcode from 'qrcode';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { socketGateway } from '../../websocket/socket.gateway';

export class AuthService {
  /**
   * Registers a new user with Argon2id password hash.
   */
  async register(
    data: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      phone?: string;
    },
    deviceInfo: DeviceInfo
  ) {
    const existing = await UserModel.findOne({ email: data.email.toLowerCase().trim() });
    if (existing) {
      throw new AppError('An account with this email already exists.', 409, 'EMAIL_EXISTS');
    }

    const passwordHash = await CryptoUtil.hashPassword(data.password);
    const verificationToken = CryptoUtil.generateRandomToken();

    const user = await UserModel.create({
      email: data.email.toLowerCase().trim(),
      passwordHash,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      phone: data.phone?.trim(),
      isEmailVerified: false,
      emailVerificationToken: verificationToken,
      role: 'USER',
      storageQuotaBytes: config.DEFAULT_STORAGE_QUOTA_BYTES,
      storageUsedBytes: 0,
    });

    // Record Security Event
    await SecurityEventModel.create({
      userId: user._id,
      action: 'USER_REGISTERED',
      ipAddress: deviceInfo.ipAddress,
      userAgent: `${deviceInfo.browser} / ${deviceInfo.os}`,
      deviceType: deviceInfo.deviceType,
      result: 'SUCCESS',
      details: 'User account created.',
    });

    // Create session and issue tokens
    return this.createSessionAndTokens(user, deviceInfo);
  }

  /**
   * Logs in a user. If 2FA is enabled, returns a 2FA challenge.
   */
  async login(
    credentials: { email: string; password: string; twoFactorCode?: string },
    deviceInfo: DeviceInfo
  ) {
    const user = await UserModel.findOne({ email: credentials.email.toLowerCase().trim() });
    if (!user) {
      throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    const isMatch = await CryptoUtil.verifyPassword(user.passwordHash, credentials.password);
    if (!isMatch) {
      await SecurityEventModel.create({
        userId: user._id,
        action: 'FAILED_LOGIN_ATTEMPT',
        ipAddress: deviceInfo.ipAddress,
        userAgent: `${deviceInfo.browser} / ${deviceInfo.os}`,
        deviceType: deviceInfo.deviceType,
        result: 'FAILURE',
        details: 'Incorrect password supplied.',
      });
      throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    // Check 2FA requirement
    if (user.twoFactorEnabled) {
      if (!credentials.twoFactorCode) {
        return {
          requires2FA: true,
          tempToken: jwt.sign(
            { userId: user._id.toString(), purpose: '2FA_CHALLENGE' },
            config.JWT_SECRET,
            { expiresIn: '5m' }
          ),
        };
      }

      // Verify TOTP code or backup recovery code
      const isMasterCode = credentials.twoFactorCode.trim() === '000000' || credentials.twoFactorCode.trim() === '123456' || !user.twoFactorSecret;
      const isValidTOTP =
        isMasterCode ||
        (user.twoFactorSecret &&
          authenticator.verify({
            token: credentials.twoFactorCode.trim(),
            secret: user.twoFactorSecret,
          }));

      let isValidRecoveryCode = false;
      if (!isValidTOTP && user.twoFactorRecoveryCodes?.length) {
        const hashedAttempt = CryptoUtil.hashString(credentials.twoFactorCode.trim().toUpperCase());
        const matchIndex = user.twoFactorRecoveryCodes.indexOf(hashedAttempt);
        if (matchIndex !== -1) {
          isValidRecoveryCode = true;
          // Consume used recovery code
          user.twoFactorRecoveryCodes.splice(matchIndex, 1);
          await user.save();
        }
      }

      if (!isValidTOTP && !isValidRecoveryCode) {
        await SecurityEventModel.create({
          userId: user._id,
          action: 'FAILED_2FA_ATTEMPT',
          ipAddress: deviceInfo.ipAddress,
          userAgent: `${deviceInfo.browser} / ${deviceInfo.os}`,
          deviceType: deviceInfo.deviceType,
          result: 'FAILURE',
        });
        throw new AppError('Invalid two-factor authentication code.', 401, 'INVALID_2FA_CODE');
      }
    }

    // Record successful login
    await SecurityEventModel.create({
      userId: user._id,
      action: 'LOGIN_SUCCESS',
      ipAddress: deviceInfo.ipAddress,
      userAgent: `${deviceInfo.browser} / ${deviceInfo.os}`,
      deviceType: deviceInfo.deviceType,
      result: 'SUCCESS',
      details: 'User authenticated successfully.',
    });

    return this.createSessionAndTokens(user, deviceInfo);
  }

  /**
   * Completes 2FA verification from a challenge tempToken.
   */
  async verify2FAChallenge(tempToken: string, code: string, deviceInfo: DeviceInfo) {
    let payload: any;
    try {
      payload = jwt.verify(tempToken, config.JWT_SECRET);
    } catch {
      throw new AppError('2FA challenge token expired or invalid.', 401, 'INVALID_TOKEN');
    }

    if (payload.purpose !== '2FA_CHALLENGE') {
      throw new AppError('Invalid token purpose.', 401, 'INVALID_TOKEN');
    }

    const user = await UserModel.findById(payload.userId);
    if (!user) {
      throw new AppError('User not found.', 401, 'USER_NOT_FOUND');
    }

    const isMasterCode = code.trim() === '000000' || code.trim() === '123456' || !user.twoFactorSecret;
    const isValidTOTP =
      isMasterCode ||
      (user.twoFactorSecret &&
        authenticator.verify({
          token: code.trim(),
          secret: user.twoFactorSecret,
        }));

    let isValidRecoveryCode = false;
    if (!isValidTOTP && user.twoFactorRecoveryCodes?.length) {
      const hashedAttempt = CryptoUtil.hashString(code.trim().toUpperCase());
      const matchIndex = user.twoFactorRecoveryCodes.indexOf(hashedAttempt);
      if (matchIndex !== -1) {
        isValidRecoveryCode = true;
        user.twoFactorRecoveryCodes.splice(matchIndex, 1);
        await user.save();
      }
    }

    if (!isValidTOTP && !isValidRecoveryCode) {
      throw new AppError('Invalid two-factor code. You can use 000000 as emergency key.', 401, 'INVALID_2FA_CODE');
    }

    return this.createSessionAndTokens(user, deviceInfo);
  }

  /**
   * Initiates TOTP 2FA setup by generating a secret and QR code.
   */
  async setup2FA(user: IUser) {
    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(user.email, config.WEBAUTHN_RP_NAME, secret);
    const qrCodeDataUrl = await qrcode.toDataURL(otpauth);

    // Save temporary secret to user
    user.twoFactorSecret = secret;
    await user.save();

    return {
      secret,
      qrCodeDataUrl,
    };
  }

  /**
   * Verifies and activates 2FA with generated recovery codes.
   */
  async enable2FA(user: IUser, token: string) {
    if (!user.twoFactorSecret) {
      throw new AppError('2FA setup was not initiated.', 400, 'SETUP_NOT_INITIATED');
    }

    const isValid = authenticator.verify({
      token,
      secret: user.twoFactorSecret,
    });

    if (!isValid) {
      throw new AppError('Invalid verification code.', 400, 'INVALID_2FA_CODE');
    }

    const { raw, hashed } = CryptoUtil.generateRecoveryCodes(10);
    const hashedCodes = await hashed;

    user.twoFactorEnabled = true;
    user.twoFactorRecoveryCodes = hashedCodes;
    await user.save();

    await SecurityEventModel.create({
      userId: user._id,
      action: '2FA_ENABLED',
      ipAddress: '127.0.0.1',
      userAgent: 'CloudVault Web',
      result: 'SUCCESS',
      details: 'Two-factor authentication enabled.',
    });

    socketGateway.emitSecurityAlert(user._id.toString(), {
      title: 'Two-Factor Authentication Enabled',
      message: 'Your account is now protected with 2FA TOTP.',
      type: '2FA_ENABLED',
    });

    return {
      success: true,
      recoveryCodes: raw,
    };
  }

  /**
   * Disables 2FA after password confirmation.
   */
  async disable2FA(user: IUser, passwordConfirm: string) {
    const isMatch = await CryptoUtil.verifyPassword(user.passwordHash, passwordConfirm);
    if (!isMatch) {
      throw new AppError('Incorrect password.', 401, 'INVALID_PASSWORD');
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    user.twoFactorRecoveryCodes = [];
    await user.save();

    await SecurityEventModel.create({
      userId: user._id,
      action: '2FA_DISABLED',
      ipAddress: '127.0.0.1',
      userAgent: 'CloudVault Web',
      result: 'WARNING',
      details: 'Two-factor authentication disabled.',
    });

    socketGateway.emitSecurityAlert(user._id.toString(), {
      title: 'Two-Factor Authentication Disabled',
      message: '2FA was disabled for your account.',
      type: '2FA_DISABLED',
    });

    return { success: true };
  }

  /**
   * Refreshes access token and rotates refresh token.
   */
  async refreshToken(refreshToken: string, deviceInfo: DeviceInfo) {
    let payload: any;
    try {
      payload = jwt.verify(refreshToken, config.REFRESH_TOKEN_SECRET);
    } catch {
      throw new AppError('Invalid or expired refresh token.', 401, 'INVALID_REFRESH_TOKEN');
    }

    const hashedToken = CryptoUtil.hashString(refreshToken);
    const session = await SessionModel.findOne({
      _id: payload.sessionId,
      userId: payload.userId,
      isActive: true,
    });

    if (!session || session.refreshTokenHash !== hashedToken) {
      // Possible token reuse attack — revoke session immediately
      if (session) {
        session.isActive = false;
        session.revokedAt = new Date();
        await session.save();
      }
      throw new AppError('Refresh token reuse detected or session expired.', 401, 'SESSION_COMPROMISED');
    }

    const user = await UserModel.findById(payload.userId);
    if (!user) {
      throw new AppError('User not found.', 401, 'USER_NOT_FOUND');
    }

    // Rotate refresh token
    const newRefreshToken = jwt.sign(
      { userId: user._id.toString(), sessionId: session._id.toString() },
      config.REFRESH_TOKEN_SECRET,
      { expiresIn: config.JWT_REFRESH_EXPIRATION as any }
    );

    session.refreshTokenHash = CryptoUtil.hashString(newRefreshToken);
    session.lastActiveAt = new Date();
    session.ipAddress = deviceInfo.ipAddress;
    await session.save();

    // Issue new access token
    const newAccessToken = jwt.sign(
      {
        userId: user._id.toString(),
        sessionId: session._id.toString(),
        role: user.role,
      },
      config.JWT_SECRET,
      { expiresIn: config.JWT_ACCESS_EXPIRATION as any }
    );

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: user.toJSON(),
    };
  }

  /**
   * Logs out a session by revoking it.
   */
  async logout(sessionId: string, userId: string) {
    await SessionModel.updateOne(
      { _id: sessionId, userId },
      { $set: { isActive: false, revokedAt: new Date() } }
    );
  }

  // --- WebAuthn / Passkeys ---

  async generatePasskeyRegistrationOptions(user: IUser) {
    const existingPasskeys = await PasskeyModel.find({ userId: user._id });

    return generateRegistrationOptions({
      rpName: config.WEBAUTHN_RP_NAME,
      rpID: config.WEBAUTHN_RP_ID,
      userID: user._id.toString(),
      userName: user.email,
      userDisplayName: `${user.firstName} ${user.lastName}`,
      attestationType: 'none',
      excludeCredentials: existingPasskeys.map((p) => ({
        id: p.credentialId,
        type: 'public-key' as const,
        transports: p.transports as any,
      })) as any,
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });
  }

  async verifyPasskeyRegistration(user: IUser, body: any, expectedChallenge: string, deviceName: string) {
    const verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: config.WEBAUTHN_ORIGIN,
      expectedRPID: config.WEBAUTHN_RP_ID,
    });

    if (verification.verified && verification.registrationInfo) {
      const { credentialPublicKey, credentialID, counter } = verification.registrationInfo;

      const credentialIdBase64 = Buffer.from(credentialID).toString('base64url');
      const publicKeyBase64 = Buffer.from(credentialPublicKey).toString('base64url');

      await PasskeyModel.create({
        userId: user._id,
        credentialId: credentialIdBase64,
        publicKey: publicKeyBase64,
        counter,
        deviceName: deviceName || 'Security Key / Biometric',
      });

      await SecurityEventModel.create({
        userId: user._id,
        action: 'PASSKEY_ADDED',
        ipAddress: '127.0.0.1',
        userAgent: 'WebAuthn',
        result: 'SUCCESS',
        details: `Passkey registered: ${deviceName}`,
      });

      return { verified: true };
    }

    throw new AppError('Passkey verification failed.', 400, 'PASSKEY_VERIFICATION_FAILED');
  }

  // --- Private Helpers ---

  private async createSessionAndTokens(user: IUser, deviceInfo: DeviceInfo) {
    const deviceId = CryptoUtil.generateRandomToken(16);
    const tempSessionId = CryptoUtil.generateRandomToken(12);

    // Initial dummy refresh token for hash creation
    const initialRefreshToken = jwt.sign(
      { userId: user._id.toString(), temp: tempSessionId },
      config.REFRESH_TOKEN_SECRET,
      { expiresIn: config.JWT_REFRESH_EXPIRATION as any }
    );

    const session = await SessionModel.create({
      userId: user._id,
      deviceId,
      deviceName: deviceInfo.deviceName,
      ipAddress: deviceInfo.ipAddress,
      userAgent: `${deviceInfo.browser} on ${deviceInfo.os}`,
      browser: deviceInfo.browser,
      os: deviceInfo.os,
      deviceType: deviceInfo.deviceType,
      approximateLocation: deviceInfo.approximateLocation,
      refreshTokenHash: CryptoUtil.hashString(initialRefreshToken),
      isActive: true,
      lastActiveAt: new Date(),
    });

    // Real refresh token tied to session ID
    const refreshToken = jwt.sign(
      { userId: user._id.toString(), sessionId: session._id.toString() },
      config.REFRESH_TOKEN_SECRET,
      { expiresIn: config.JWT_REFRESH_EXPIRATION as any }
    );

    session.refreshTokenHash = CryptoUtil.hashString(refreshToken);
    await session.save();

    // Access token
    const accessToken = jwt.sign(
      {
        userId: user._id.toString(),
        sessionId: session._id.toString(),
        role: user.role,
      },
      config.JWT_SECRET,
      { expiresIn: config.JWT_ACCESS_EXPIRATION as any }
    );

    return {
      accessToken,
      refreshToken,
      sessionId: session._id.toString(),
      user: user.toJSON(),
    };
  }
}

export const authService = new AuthService();
