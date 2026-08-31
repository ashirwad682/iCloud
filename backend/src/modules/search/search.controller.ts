import { Router, Response, NextFunction } from 'express';
import { authGuard, AuthenticatedRequest } from '../../common/guards/auth.guard';
import { MediaModel } from '../../database/models/Media';
import { storageService } from '../storage/storage.service';

const router = Router();

// GET /api/v1/search (Global multi-attribute search across filename, date, camera, city, AI tags, OCR text)
router.get('/', authGuard, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const q = (req.query.q as string || '').trim();
    if (!q) {
      return res.json({ success: true, data: [] });
    }

    const regex = new RegExp(q, 'i');

    const items = await MediaModel.find({
      ownerId: req.user!._id,
      isDeleted: false,
      isHidden: { $ne: true },
      isSharedAlbumMedia: { $ne: true },
      $or: [
        { originalName: regex },
        { 'aiMetadata.tags': regex },
        { 'aiMetadata.categories': regex },
        { 'aiMetadata.ocrText': regex },
        { 'metadata.make': regex },
        { 'metadata.model': regex },
        { 'metadata.city': regex },
        { 'metadata.country': regex },
      ],
    })
      .sort({ capturedAt: -1 })
      .limit(50)
      .lean();

    const enhanced = await Promise.all(
      items.map(async (item) => ({
        ...item,
        thumbnailUrl: item.thumbnailKey
          ? await storageService.getPresignedDownloadUrl(item.thumbnailKey, 1800)
          : await storageService.getPresignedDownloadUrl(item.storageKey, 1800),
        previewUrl: item.previewKey
          ? await storageService.getPresignedDownloadUrl(item.previewKey, 1800)
          : undefined,
      }))
    );

    res.json({
      success: true,
      data: enhanced,
      query: q,
      totalMatches: enhanced.length,
    });
  } catch (error) {
    next(error);
  }
});

export const searchRouter = router;
