import { Router, Response, NextFunction } from 'express';
import { authGuard, AuthenticatedRequest } from '../../common/guards/auth.guard';
import { requireRole } from '../../common/guards/idor.guard';
import { UserModel } from '../../database/models/User';
import { MediaModel } from '../../database/models/Media';
import { SessionModel } from '../../database/models/Session';
import { AuditLogModel } from '../../database/models/AuditLog';

const router = Router();

// GET /api/v1/admin/telemetry (Admin metrics and health)
router.get(
  '/telemetry',
  authGuard,
  requireRole('ADMIN', 'SUPER_ADMIN'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const totalUsers = await UserModel.countDocuments();
      const totalMedia = await MediaModel.countDocuments();
      const activeSessions = await SessionModel.countDocuments({ isActive: true });

      const [storageAgg] = await MediaModel.aggregate([
        { $group: { _id: null, totalBytes: { $sum: '$size' } } },
      ]);

      const recentAuditLogs = await AuditLogModel.find()
        .sort({ timestamp: -1 })
        .limit(10)
        .lean();

      res.json({
        success: true,
        data: {
          totalUsers,
          totalMedia,
          activeSessions,
          totalStorageBytes: storageAgg?.totalBytes || 0,
          systemStatus: 'HEALTHY',
          uptime: process.uptime(),
          recentAuditLogs,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export const adminRouter = router;
