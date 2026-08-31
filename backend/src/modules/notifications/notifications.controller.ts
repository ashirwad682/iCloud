import { Router, Response, NextFunction } from 'express';
import { authGuard, AuthenticatedRequest } from '../../common/guards/auth.guard';
import { NotificationModel } from '../../database/models/Notification';

const router = Router();

// GET /api/v1/notifications (List user notifications)
router.get('/', authGuard, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const notifications = await NotificationModel.find({ userId: req.user!._id })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    const unreadCount = await NotificationModel.countDocuments({
      userId: req.user!._id,
      isRead: false,
    });

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/notifications/mark-read (Mark all or specific notification as read)
router.post('/mark-read', authGuard, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const notificationId = req.body.notificationId;

    if (notificationId) {
      await NotificationModel.updateOne(
        { _id: notificationId, userId: req.user!._id },
        { $set: { isRead: true } }
      );
    } else {
      await NotificationModel.updateMany(
        { userId: req.user!._id, isRead: false },
        { $set: { isRead: true } }
      );
    }

    res.json({ success: true, message: 'Notifications marked as read.' });
  } catch (error) {
    next(error);
  }
});

export const notificationsRouter = router;
