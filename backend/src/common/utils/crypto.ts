import argon2 from 'argon2';
import crypto from 'crypto';

export class CryptoUtil {
  /**
   * Hashes a password using Argon2id with memory cost and time cost options.
   */
  static async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16, // 64 MB
      timeCost: 3,
      parallelism: 1,
    });
  }

  /**
   * Verifies an Argon2id password hash.
   */
  static async verifyPassword(hash: string, plain: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch {
      return false;
    }
  }

  /**
   * Generates a cryptographically secure random token (hex or url-safe base64).
   */
  static generateRandomToken(bytes: number = 32): string {
    return crypto.randomBytes(bytes).toString('hex');
  }

  /**
   * Generates a set of 10 alphanumeric backup recovery codes for 2FA.
   */
  static generateRecoveryCodes(count: number = 10): { raw: string[]; hashed: Promise<string[]> } {
    const rawCodes: string[] = [];
    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(5).toString('hex').toUpperCase();
      const formatted = `${code.slice(0, 5)}-${code.slice(5)}`;
      rawCodes.push(formatted);
    }

    const hashed = Promise.all(rawCodes.map((code) => CryptoUtil.hashString(code)));

    return { raw: rawCodes, hashed };
  }

  /**
   * Fast SHA-256 string hash for tokens and recovery code matching.
   */
  static hashString(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Computes SHA-256 checksum from a buffer.
   */
  static computeChecksum(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }
}
