import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { authGuard, AuthenticatedRequest } from '../../common/guards/auth.guard';
import { MediaModel } from '../../database/models/Media';
import { AlbumItemModel } from '../../database/models/AlbumItem';
import { UserModel } from '../../database/models/User';
import { storageService } from '../storage/storage.service';
import { config } from '../../config/env.config';
import { AppError } from '../../common/middleware/error.middleware';
import { differenceInDays, addDays } from 'date-fns';

const router = Router();

// GET /api/v1/trash (List recently deleted media with retention days left)
router.get('/', authGuard, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const items = await MediaModel.find({
      ownerId: req.user!._id,
      isDeleted: true,
    })
      .sort({ deletedAt: -1 })
      .lean();

    const retentionDays = config.TRASH_RETENTION_DAYS;

    const enhanced = await Promise.all(
      items.map(async (item) => {
        const deletedAt = item.deletedAt ? new Date(item.deletedAt) : new Date();
        const autoPurgeDate = addDays(deletedAt, retentionDays);
        const daysRemaining = Math.max(0, differenceInDays(autoPurgeDate, new Date()));

        const thumbUrl = item.thumbnailKey
          ? await storageService.getPresignedDownloadUrl(item.thumbnailKey, 1800)
          : await storageService.getPresignedDownloadUrl(item.storageKey, 1800);

        return {
          ...item,
          daysRemaining,
          thumbnailUrl: thumbUrl,
        };
      })
    );

    res.json({
      success: true,
      data: enhanced,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/trash/:id/restore (Restore single item from trash)
router.post('/:id/restore', authGuard, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const media = await MediaModel.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user!._id, isDeleted: true },
      { $set: { isDeleted: false, deletedAt: undefined } },
      { new: true }
    );

    if (!media) {
      throw new AppError('Media not found in trash.', 404, 'NOT_FOUND_IN_TRASH');
    }

    res.json({ success: true, message: 'Item restored to library.', data: media });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/trash/bulk-restore (Restore multiple items)
router.post('/bulk-restore', authGuard, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      mediaIds: z.array(z.string().min(1)),
    });

    const { mediaIds } = schema.parse(req.body);

    await MediaModel.updateMany(
      {
        _id: { $in: mediaIds.map((id) => new mongoose.Types.ObjectId(id)) },
        ownerId: req.user!._id,
        isDeleted: true,
      },
      {
        $set: { isDeleted: false, deletedAt: undefined },
      }
    );

    res.json({ success: true, message: `Restored ${mediaIds.length} items to library.` });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/trash/bulk-delete (Permanently delete multiple items)
router.post('/bulk-delete', authGuard, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      mediaIds: z.array(z.string().min(1)),
    });

    const { mediaIds } = schema.parse(req.body);
    const objectIds = mediaIds.map((id) => new mongoose.Types.ObjectId(id));

    const items = await MediaModel.find({
      _id: { $in: objectIds },
      ownerId: req.user!._id,
      isDeleted: true,
    });

    if (items.length === 0) {
      return res.json({ success: true, message: 'No matching items to delete.' });
    }

    let totalSizeReclaimed = 0;
    const allKeysToDelete: string[] = [];
    const mediaIdsToDelete: mongoose.Types.ObjectId[] = [];

    for (const item of items) {
      totalSizeReclaimed += item.size;
      mediaIdsToDelete.push(item._id);
      allKeysToDelete.push(item.storageKey);
      if (item.thumbnailKey) allKeysToDelete.push(item.thumbnailKey);
      if (item.previewKey) allKeysToDelete.push(item.previewKey);
      if (item.largeKey) allKeysToDelete.push(item.largeKey);
      if (item.posterKey) allKeysToDelete.push(item.posterKey);
    }

    await storageService.deleteObjects(allKeysToDelete);
    await AlbumItemModel.deleteMany({ mediaId: { $in: mediaIdsToDelete } });
    await MediaModel.deleteMany({ _id: { $in: mediaIdsToDelete } });

    await UserModel.updateOne(
      { _id: req.user!._id },
      { $inc: { storageUsedBytes: -totalSizeReclaimed } }
    );

    res.json({
      success: true,
      message: `Permanently deleted ${items.length} items. Reclaimed ${(
        totalSizeReclaimed / (1024 * 1024)
      ).toFixed(2)} MB.`,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/trash/:id (Permanently purge single item)
router.delete('/:id', authGuard, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const media = await MediaModel.findOne({
      _id: req.params.id,
      ownerId: req.user!._id,
      isDeleted: true,
    });

    if (!media) {
      throw new AppError('Media not found in trash.', 404, 'NOT_FOUND_IN_TRASH');
    }

    // Cascade delete storage objects
    const keysToDelete: string[] = [media.storageKey];
    if (media.thumbnailKey) keysToDelete.push(media.thumbnailKey);
    if (media.previewKey) keysToDelete.push(media.previewKey);
    if (media.largeKey) keysToDelete.push(media.largeKey);
    if (media.posterKey) keysToDelete.push(media.posterKey);

    await storageService.deleteObjects(keysToDelete);

    // Remove album references
    await AlbumItemModel.deleteMany({ mediaId: media._id });

    // Decrement user storage
    await UserModel.updateOne(
      { _id: req.user!._id },
      { $inc: { storageUsedBytes: -media.size } }
    );

    // Delete Media document
    await MediaModel.deleteOne({ _id: media._id });

    res.json({ success: true, message: 'Item permanently deleted.' });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/trash/empty (Empty entire trash permanently)
router.post('/empty', authGuard, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const items = await MediaModel.find({
      ownerId: req.user!._id,
      isDeleted: true,
    });

    if (items.length === 0) {
      return res.json({ success: true, message: 'Trash is already empty.' });
    }

    let totalSizeReclaimed = 0;
    const allKeysToDelete: string[] = [];
    const mediaIdsToDelete: mongoose.Types.ObjectId[] = [];

    for (const item of items) {
      totalSizeReclaimed += item.size;
      mediaIdsToDelete.push(item._id);
      allKeysToDelete.push(item.storageKey);
      if (item.thumbnailKey) allKeysToDelete.push(item.thumbnailKey);
      if (item.previewKey) allKeysToDelete.push(item.previewKey);
      if (item.largeKey) allKeysToDelete.push(item.largeKey);
      if (item.posterKey) allKeysToDelete.push(item.posterKey);
    }

    await storageService.deleteObjects(allKeysToDelete);
    await AlbumItemModel.deleteMany({ mediaId: { $in: mediaIdsToDelete } });
    await MediaModel.deleteMany({ _id: { $in: mediaIdsToDelete } });

    await UserModel.updateOne(
      { _id: req.user!._id },
      { $inc: { storageUsedBytes: -totalSizeReclaimed } }
    );

    res.json({
      success: true,
      message: `Permanently deleted ${items.length} items. Reclaimed ${(
        totalSizeReclaimed / (1024 * 1024)
      ).toFixed(2)} MB.`,
    });
  } catch (error) {
    next(error);
  }
});

export const trashRouter = router;
