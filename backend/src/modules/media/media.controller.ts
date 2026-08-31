import { Request, Response, NextFunction, Router } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import archiver from 'archiver';
import { authGuard, AuthenticatedRequest } from '../../common/guards/auth.guard';
import { requireMediaOwnership } from '../../common/guards/idor.guard';
import { MediaModel } from '../../database/models/Media';
import { AlbumItemModel } from '../../database/models/AlbumItem';
import { storageService } from '../storage/storage.service';
import { AppError } from '../../common/middleware/error.middleware';
import { startOfDay, format, isToday, isYesterday } from 'date-fns';

const router = Router();

// GET /api/v1/media (Cursor-paginated gallery list with date groupings)
router.get('/', authGuard, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 1000, 2000);
    const cursor = req.query.cursor as string;
    const mediaType = (req.query.mediaType || req.query.type) as string;
    const filter = req.query.filter as string;
    const favoriteOnly = req.query.favorite === 'true' || filter === 'favorites';
    const hiddenOnly = req.query.hidden === 'true' || filter === 'hidden';
    const isRecents = filter === 'recents' || req.query.recents === 'true';
    const tag = req.query.tag as string;

    const query: any = {
      ownerId: req.user!._id,
      isDeleted: false,
      isSharedAlbumMedia: { $ne: true },
    };

    if (hiddenOnly) {
      query.isHidden = true;
    } else {
      query.isHidden = { $ne: true };
    }

    if (favoriteOnly) {
      query.isFavorite = true;
    }

    if (mediaType && ['PHOTO', 'VIDEO', 'LIVE_PHOTO'].includes(mediaType.toUpperCase())) {
      query.mediaType = mediaType.toUpperCase();
    }

    if (filter === 'videos') {
      query.mediaType = 'VIDEO';
    } else if (filter === 'photos') {
      query.mediaType = 'PHOTO';
    } else if (filter === 'selfies') {
      query.$or = [
        { 'aiMetadata.tags': { $in: ['Selfie', 'Portrait', 'Person', 'Face', 'People', 'Photos'] } },
        { originalName: /selfie/i },
        { originalName: /portrait/i },
      ];
    } else if (filter === 'screenshots') {
      query.$or = [
        { originalName: /screenshot/i },
        { originalName: /screen/i },
        { 'aiMetadata.tags': 'Screenshot' },
      ];
    } else if (filter === 'panoramas') {
      query.$or = [
        { originalName: /panorama/i },
        { originalName: /pano/i },
        { aspectRatio: { $gt: 2.0 } },
      ];
    }

    if (tag) {
      query['aiMetadata.tags'] = tag;
    }

    if (cursor) {
      const cursorDate = new Date(cursor);
      if (!isNaN(cursorDate.getTime())) {
        query[isRecents ? 'uploadedAt' : 'capturedAt'] = { $lt: cursorDate };
      }
    }

    const sortField = isRecents ? { uploadedAt: -1, _id: -1 } : { capturedAt: -1, _id: -1 };

    const items = await MediaModel.find(query)
      .sort(sortField as any)
      .limit(limit + 1)
      .lean();

    const hasMore = items.length > limit;
    const paginatedItems = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore
      ? paginatedItems[paginatedItems.length - 1].capturedAt.toISOString()
      : null;

    // Attach short-lived signed URLs or high-speed data URLs for thumbnails and previews
    const enhancedItems = await Promise.all(
      paginatedItems.map(async (item) => {
        let thumbUrl = item.thumbnailBase64
          ? `data:${item.mimeType || 'image/jpeg'};base64,${item.thumbnailBase64}`
          : (item.dataBase64
              ? `data:${item.mimeType || 'image/jpeg'};base64,${item.dataBase64}`
              : await storageService.getPresignedDownloadUrl(item.thumbnailKey || item.storageKey, 1800));

        let previewUrl = item.dataBase64
          ? `data:${item.mimeType || 'image/jpeg'};base64,${item.dataBase64}`
          : (item.previewKey ? await storageService.getPresignedDownloadUrl(item.previewKey, 1800) : thumbUrl);

        return {
          ...item,
          thumbnailUrl: thumbUrl,
          previewUrl: previewUrl,
        };
      })
    );


    // Group items into timeline sections (Today, Yesterday, Date)
    const timelineSections: Array<{
      dateKey: string;
      title: string;
      formattedDate: string;
      items: typeof enhancedItems;
    }> = [];

    const groupMap = new Map<string, typeof enhancedItems>();

    for (const item of enhancedItems) {
      const captured = new Date(item.capturedAt);
      const dateKey = format(startOfDay(captured), 'yyyy-MM-dd');

      if (!groupMap.has(dateKey)) {
        groupMap.set(dateKey, []);
      }
      groupMap.get(dateKey)!.push(item);
    }

    groupMap.forEach((groupItems, dateKey) => {
      const sampleDate = new Date(groupItems[0].capturedAt);
      let title = format(sampleDate, 'MMMM d, yyyy');
      if (isToday(sampleDate)) title = 'Today';
      else if (isYesterday(sampleDate)) title = 'Yesterday';

      timelineSections.push({
        dateKey,
        title,
        formattedDate: format(sampleDate, 'EEEE, MMMM d, yyyy'),
        items: groupItems,
      });
    });

    const totalPhotos = await MediaModel.countDocuments({
      ownerId: req.user!._id,
      isDeleted: false,
      isHidden: { $ne: true },
      isSharedAlbumMedia: { $ne: true },
      mediaType: 'PHOTO',
    });
    const totalVideos = await MediaModel.countDocuments({
      ownerId: req.user!._id,
      isDeleted: false,
      isHidden: { $ne: true },
      isSharedAlbumMedia: { $ne: true },
      mediaType: 'VIDEO',
    });

    res.json({
      success: true,
      data: {
        items: enhancedItems,
        timelineSections,
        nextCursor,
        hasMore,
        total: totalPhotos + totalVideos,
        totalPhotos,
        totalVideos,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/media/types-summary (Live counts and preview covers for Apple Media Types)
router.get('/types-summary', authGuard, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const ownerId = req.user!._id;
    const baseQuery = { ownerId, isDeleted: false, isHidden: { $ne: true }, isSharedAlbumMedia: { $ne: true } };

    const [
      videosCount,
      photosCount,
      selfiesCount,
      screenshotsCount,
      panoramasCount,
      videoCover,
      photoCover,
      selfieCover,
      screenshotCover,
      panoramaCover,
    ] = await Promise.all([
      MediaModel.countDocuments({ ...baseQuery, mediaType: 'VIDEO' }),
      MediaModel.countDocuments({ ...baseQuery, mediaType: 'PHOTO' }),
      MediaModel.countDocuments({
        ...baseQuery,
        $or: [
          { 'aiMetadata.tags': { $in: ['Selfie', 'Portrait', 'Person', 'Face', 'People', 'Photos'] } },
          { originalName: /selfie/i },
          { originalName: /portrait/i },
        ],
      }),
      MediaModel.countDocuments({
        ...baseQuery,
        $or: [
          { originalName: /screenshot/i },
          { originalName: /screen/i },
          { 'aiMetadata.tags': 'Screenshot' },
        ],
      }),
      MediaModel.countDocuments({
        ...baseQuery,
        $or: [
          { originalName: /panorama/i },
          { originalName: /pano/i },
          { aspectRatio: { $gt: 2.0 } },
        ],
      }),
      // Sample covers
      MediaModel.findOne({ ...baseQuery, mediaType: 'VIDEO' }).sort({ capturedAt: -1 }).lean(),
      MediaModel.findOne({ ...baseQuery, mediaType: 'PHOTO' }).sort({ capturedAt: -1 }).lean(),
      MediaModel.findOne({
        ...baseQuery,
        $or: [
          { 'aiMetadata.tags': { $in: ['Selfie', 'Portrait', 'Person', 'Face', 'People', 'Photos'] } },
          { originalName: /selfie/i },
          { originalName: /portrait/i },
        ],
      }).sort({ capturedAt: -1 }).lean(),
      MediaModel.findOne({
        ...baseQuery,
        $or: [
          { originalName: /screenshot/i },
          { originalName: /screen/i },
          { 'aiMetadata.tags': 'Screenshot' },
        ],
      }).sort({ capturedAt: -1 }).lean(),
      MediaModel.findOne({
        ...baseQuery,
        $or: [
          { originalName: /panorama/i },
          { originalName: /pano/i },
          { aspectRatio: { $gt: 2.0 } },
        ],
      }).sort({ capturedAt: -1 }).lean(),
    ]);

    const getCoverUrl = async (m: any) => {
      if (!m) return null;
      return await storageService.getPresignedDownloadUrl(m.thumbnailKey || m.storageKey, 1800);
    };

    res.json({
      success: true,
      data: {
        videos: { count: videosCount, coverUrl: await getCoverUrl(videoCover) },
        photos: { count: photosCount, coverUrl: await getCoverUrl(photoCover) },
        selfies: { count: selfiesCount, coverUrl: await getCoverUrl(selfieCover) },
        screenshots: { count: screenshotsCount, coverUrl: await getCoverUrl(screenshotCover) },
        panoramas: { count: panoramasCount, coverUrl: await getCoverUrl(panoramaCover) },
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/media/stream-raw (Direct high-speed media viewing)
router.get('/stream-raw', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const key = req.query.key as string;
    if (!key) {
      throw new AppError('Key parameter is required.', 400, 'MISSING_KEY');
    }

    if (key.endsWith('.webp')) res.setHeader('Content-Type', 'image/webp');
    else if (key.endsWith('.png') || key.endsWith('.PNG')) res.setHeader('Content-Type', 'image/png');
    else if (key.endsWith('.mp4') || key.endsWith('.MP4')) res.setHeader('Content-Type', 'video/mp4');
    else res.setHeader('Content-Type', 'image/jpeg');

    res.setHeader('Cache-Control', 'public, max-age=86400');
    const stream = await storageService.getObjectStream(key);
    stream.pipe(res);
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/media/:id (Get single media with original & preview signed URLs)
router.get('/:id', authGuard, requireMediaOwnership, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const media = (req as any).mediaResource;

    const originalUrl = media.dataBase64
      ? `data:${media.mimeType || 'image/jpeg'};base64,${media.dataBase64}`
      : await storageService.getPresignedDownloadUrl(
          media.storageKey,
          3600,
          media.originalName
        );

    const previewUrl = media.dataBase64
      ? `data:${media.mimeType || 'image/jpeg'};base64,${media.dataBase64}`
      : (media.previewKey
          ? await storageService.getPresignedDownloadUrl(media.previewKey, 3600)
          : originalUrl);

    const thumbnailUrl = media.thumbnailBase64
      ? `data:${media.mimeType || 'image/jpeg'};base64,${media.thumbnailBase64}`
      : (media.thumbnailKey
          ? await storageService.getPresignedDownloadUrl(media.thumbnailKey, 3600)
          : originalUrl);

    res.json({
      success: true,
      data: {
        ...media.toObject(),
        originalUrl,
        previewUrl,
        thumbnailUrl,
      },
    });

  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/media/:id (Update media properties e.g. favorite, hidden, tags, originalName)
router.patch('/:id', authGuard, requireMediaOwnership, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      isFavorite: z.boolean().optional(),
      isHidden: z.boolean().optional(),
      originalName: z.string().min(1).optional(),
      tags: z.array(z.string()).optional(),
    });

    const data = schema.parse(req.body);
    const media = (req as any).mediaResource;

    if (data.isFavorite !== undefined) media.isFavorite = data.isFavorite;
    if (data.isHidden !== undefined) media.isHidden = data.isHidden;
    if (data.originalName) media.originalName = data.originalName;
    if (data.tags && media.aiMetadata) media.aiMetadata.tags = data.tags;

    await media.save();
    res.json({ success: true, data: media });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/media/:id (Soft-delete media to Recently Deleted Trash)
router.delete('/:id', authGuard, requireMediaOwnership, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const media = (req as any).mediaResource;
    media.isDeleted = true;
    media.deletedAt = new Date();
    await media.save();

    res.json({ success: true, message: 'Media moved to Recently Deleted.' });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/media/bulk-favorite
router.post('/bulk-favorite', authGuard, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      mediaIds: z.array(z.string().min(1)),
      isFavorite: z.boolean(),
    });

    const { mediaIds, isFavorite } = schema.parse(req.body);

    await MediaModel.updateMany(
      {
        _id: { $in: mediaIds.map((id) => new mongoose.Types.ObjectId(id)) },
        ownerId: req.user!._id,
      },
      {
        $set: { isFavorite },
      }
    );

    res.json({ success: true, message: `Updated favorite status for ${mediaIds.length} items.` });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/media/bulk-delete (Soft-delete multiple items)
router.post('/bulk-delete', authGuard, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      mediaIds: z.array(z.string().min(1)),
    });

    const { mediaIds } = schema.parse(req.body);

    await MediaModel.updateMany(
      {
        _id: { $in: mediaIds.map((id) => new mongoose.Types.ObjectId(id)) },
        ownerId: req.user!._id,
      },
      {
        $set: { isDeleted: true, deletedAt: new Date() },
      }
    );

    res.json({ success: true, message: `Moved ${mediaIds.length} items to Recently Deleted.` });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/media/bulk-download (Streams a compressed ZIP archive of selected media)
router.post('/bulk-download', authGuard, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      mediaIds: z.array(z.string().min(1)).max(1000),
    });

    const { mediaIds } = schema.parse(req.body);

    const items = await MediaModel.find({
      _id: { $in: mediaIds.map((id) => new mongoose.Types.ObjectId(id)) },
      ownerId: req.user!._id,
      isDeleted: false,
    });

    if (items.length === 0) {
      throw new AppError('No valid media items selected for download.', 400, 'NO_ITEMS');
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="CloudVault-Media-${format(new Date(), 'yyyyMMdd-HHmmss')}.zip"`
    );

    // Level 1 = Ultra-fast streaming ZIP archive
    const archive = archiver('zip', { zlib: { level: 1 } });
    archive.pipe(res);

    for (const item of items) {
      try {
        const stream = await storageService.getObjectStream(item.storageKey);
        archive.append(stream, { name: item.originalName });
      } catch (err) {
        console.error(`Failed to append file to ZIP: ${item.originalName}`);
      }
    }

    await archive.finalize();
  } catch (error) {
    next(error);
  }
});

export const mediaRouter = router;
