import { Router, Response, NextFunction } from 'express';
import { authGuard, AuthenticatedRequest } from '../../common/guards/auth.guard';
import { SessionModel } from '../../database/models/Session';
import { SecurityEventModel } from '../../database/models/SecurityEvent';
import { AppError } from '../../common/middleware/error.middleware';
import { z } from 'zod';

const router = Router();

// GET /api/v1/security/sessions (List user active sessions)
router.get('/', authGuard, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const sessions = await SessionModel.find({
      userId: req.user!._id,
      isActive: true,
    }).sort({ lastActiveAt: -1 });

    const currentSessionId = req.session!._id.toString();

    const formatted = sessions.map((s) => ({
      _id: s._id,
      deviceId: s.deviceId,
      deviceName: s.deviceName,
      ipAddress: s.ipAddress,
      browser: s.browser,
      os: s.os,
      deviceType: s.deviceType,
      approximateLocation: s.approximateLocation,
      lastActiveAt: s.lastActiveAt,
      createdAt: s.createdAt,
      isCurrent: s._id.toString() === currentSessionId,
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/security/sessions/:id/rename (Rename device)
router.patch('/:id/rename', authGuard, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({ deviceName: z.string().min(1).max(50) });
    const { deviceName } = schema.parse(req.body);

    const session = await SessionModel.findOneAndUpdate(
      { _id: req.params.id, userId: req.user!._id, isActive: true },
      { $set: { deviceName } },
      { new: true }
    );

    if (!session) {
      throw new AppError('Session not found.', 404, 'SESSION_NOT_FOUND');
    }

    res.json({ success: true, data: session });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/security/sessions/:id (Revoke a specific session)
router.delete('/:id', authGuard, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const session = await SessionModel.findOneAndUpdate(
      { _id: req.params.id, userId: req.user!._id, isActive: true },
      { $set: { isActive: false, revokedAt: new Date() } },
      { new: true }
    );

    if (!session) {
      throw new AppError('Session not found or already revoked.', 404, 'SESSION_NOT_FOUND');
    }

    await SecurityEventModel.create({
      userId: req.user!._id,
      action: 'SESSION_REVOKED',
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'CloudVault Web',
      result: 'SUCCESS',
      details: `Revoked session on ${session.deviceName}`,
    });

    res.json({ success: true, message: 'Session revoked successfully.' });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/security/sessions/revoke-others (Log out all other devices)
router.post('/revoke-others', authGuard, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const currentSessionId = req.session!._id;

    await SessionModel.updateMany(
      {
        userId: req.user!._id,
        _id: { $ne: currentSessionId },
        isActive: true,
      },
      {
        $set: { isActive: false, revokedAt: new Date() },
      }
    );

    await SecurityEventModel.create({
      userId: req.user!._id,
      action: 'ALL_OTHER_SESSIONS_REVOKED',
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'CloudVault Web',
      result: 'SUCCESS',
      details: 'Terminated all other active sessions.',
    });

    res.json({ success: true, message: 'All other sessions have been logged out.' });
  } catch (error) {
    next(error);
  }
});

export const sessionsRouter = router;
