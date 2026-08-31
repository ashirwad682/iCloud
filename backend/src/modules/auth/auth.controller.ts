import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authService } from './auth.service';
import { authGuard, AuthenticatedRequest } from '../../common/guards/auth.guard';
import { parseDeviceInfo } from '../../common/utils/ua';
import { authRateLimiter } from '../../common/middleware/rate-limiter.middleware';

const router = Router();

// Validation Schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters with upper, lower, and numbers'),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  twoFactorCode: z.string().optional(),
});

const verify2FASchema = z.object({
  tempToken: z.string().min(1),
  code: z.string().min(6),
});

const enable2FASchema = z.object({
  token: z.string().min(6),
});

const disable2FASchema = z.object({
  passwordConfirm: z.string().min(1),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

// POST /api/v1/auth/register
router.post('/register', authRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = registerSchema.parse(req.body);
    const deviceInfo = parseDeviceInfo(req);
    const result = await authService.register(data, deviceInfo);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/auth/login
router.post('/login', authRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = loginSchema.parse(req.body);
    const deviceInfo = parseDeviceInfo(req);
    const result = await authService.login(data, deviceInfo);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/auth/verify-2fa-challenge
router.post('/verify-2fa-challenge', authRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = verify2FASchema.parse(req.body);
    const deviceInfo = parseDeviceInfo(req);
    const result = await authService.verify2FAChallenge(data.tempToken, data.code, deviceInfo);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/auth/refresh
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = refreshTokenSchema.parse(req.body);
    const deviceInfo = parseDeviceInfo(req);
    const result = await authService.refreshToken(data.refreshToken, deviceInfo);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/auth/logout
router.post('/logout', authGuard, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await authService.logout(req.session!._id.toString(), req.user!._id.toString());
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/auth/me
router.get('/me', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    data: {
      user: req.user!.toJSON(),
      session: req.session,
    },
  });
});

// POST /api/v1/auth/2fa/setup
router.post('/2fa/setup', authGuard, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await authService.setup2FA(req.user!);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/auth/2fa/enable
router.post('/2fa/enable', authGuard, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = enable2FASchema.parse(req.body);
    const result = await authService.enable2FA(req.user!, data.token);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/auth/2fa/disable
router.post('/2fa/disable', authGuard, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = disable2FASchema.parse(req.body);
    const result = await authService.disable2FA(req.user!, data.passwordConfirm);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/auth/verify-password (Verify user password to unlock hidden album / sensitive settings)
router.post('/verify-password', authGuard, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      password: z.string().min(1, 'Password is required'),
    });
    const { password } = schema.parse(req.body);
    const { CryptoUtil } = await import('../../common/utils/crypto');
    const { AppError } = await import('../../common/middleware/error.middleware');
    const isValid = await CryptoUtil.verifyPassword(req.user!.passwordHash, password);
    if (!isValid) {
      throw new AppError('Incorrect password. Please try again.', 401, 'INVALID_PASSWORD');
    }
    res.json({ success: true, message: 'Password verified successfully.' });
  } catch (error) {
    next(error);
  }
});

export const authRouter = router;
