import { Router, Response, NextFunction } from 'express';
import { authGuard, AuthenticatedRequest } from '../../common/guards/auth.guard';
import { MediaModel } from '../../database/models/Media';
import { UserModel } from '../../database/models/User';
import { storageService } from './storage.service';

const router = Router();

// GET /api/v1/storage/usage (Comprehensive breakdown of user storage)
router.get('/usage', authGuard, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;

    // Aggregate storage by category
    const [stats] = await MediaModel.aggregate([
      { $match: { ownerId: user._id } },
      {
        $group: {
          _id: null,
          totalMediaBytes: {
            $sum: { $cond: [{ $eq: ['$isDeleted', false] }, '$size', 0] },
          },
          photosBytes: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$isDeleted', false] }, { $eq: ['$mediaType', 'PHOTO'] }] },
                '$size',
                0,
              ],
            },
          },
          videosBytes: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$isDeleted', false] }, { $eq: ['$mediaType', 'VIDEO'] }] },
                '$size',
                0,
              ],
            },
          },
          trashBytes: {
            $sum: { $cond: [{ $eq: ['$isDeleted', true] }, '$size', 0] },
          },
          totalCount: { $sum: 1 },
          photosCount: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$isDeleted', false] }, { $eq: ['$mediaType', 'PHOTO'] }] },
                1,
                0,
              ],
            },
          },
          videosCount: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$isDeleted', false] }, { $eq: ['$mediaType', 'VIDEO'] }] },
                1,
                0,
              ],
            },
          },
          trashCount: {
            $sum: { $cond: [{ $eq: ['$isDeleted', true] }, 1, 0] },
          },
        },
      },
    ]);

    const totalUsed = (stats?.totalMediaBytes || 0) + (stats?.trashBytes || 0);
    const quota = user.storageQuotaBytes;
    const remainingBytes = Math.max(0, quota - totalUsed);
    const usedPercentage = Math.min(100, Math.round((totalUsed / quota) * 100));

    // Get 5 largest files
    const largestFiles = await MediaModel.find({ ownerId: user._id, isDeleted: false })
      .sort({ size: -1 })
      .limit(5)
      .lean();

    const enhancedLargest = await Promise.all(
      largestFiles.map(async (f) => ({
        ...f,
        thumbnailUrl: f.thumbnailKey
          ? await storageService.getPresignedDownloadUrl(f.thumbnailKey, 1800)
          : await storageService.getPresignedDownloadUrl(f.storageKey, 1800),
      }))
    );

    res.json({
      success: true,
      data: {
        usedBytes: totalUsed,
        quotaBytes: quota,
        remainingBytes,
        usedPercentage,
        photosBytes: stats?.photosBytes || 0,
        videosBytes: stats?.videosBytes || 0,
        trashBytes: stats?.trashBytes || 0,
        photosCount: stats?.photosCount || 0,
        videosCount: stats?.videosCount || 0,
        trashCount: stats?.trashCount || 0,
        largestFiles: enhancedLargest,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/storage/duplicates (Find potential duplicate photos by checksum or pHash)
router.get('/duplicates', authGuard, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const duplicates = await MediaModel.aggregate([
      { $match: { ownerId: req.user!._id, isDeleted: false } },
      {
        $group: {
          _id: '$checksum',
          count: { $sum: 1 },
          items: { $push: '$$ROOT' },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ]);

    res.json({ success: true, data: duplicates });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/storage/upgrade-plan (Upgrade user's storage plan)
router.post('/upgrade-plan', authGuard, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { planTier } = req.body;
    let quotaBytes = 15 * 1024 * 1024 * 1024;

    switch (planTier) {
      case '50GB':
        quotaBytes = 50 * 1024 * 1024 * 1024;
        break;
      case '200GB':
        quotaBytes = 200 * 1024 * 1024 * 1024;
        break;
      case '2TB':
        quotaBytes = 2 * 1024 * 1024 * 1024 * 1024;
        break;
      case '6TB':
        quotaBytes = 6 * 1024 * 1024 * 1024 * 1024;
        break;
      case '12TB':
        quotaBytes = 12 * 1024 * 1024 * 1024 * 1024;
        break;
      case '15GB':
      default:
        quotaBytes = 15 * 1024 * 1024 * 1024;
        break;
    }

    const updatedUser = await UserModel.findByIdAndUpdate(
      req.user!._id,
      { $set: { storageQuotaBytes: quotaBytes } },
      { new: true }
    );

    res.json({
      success: true,
      message: `Successfully upgraded to the ${planTier} storage plan!`,
      data: {
        user: updatedUser,
        storageQuotaBytes: quotaBytes,
        planTier,
      },
    });
  } catch (error) {
    next(error);
  }
});

export const storageRouter = router;
