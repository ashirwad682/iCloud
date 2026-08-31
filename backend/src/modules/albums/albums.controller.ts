import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { authGuard, AuthenticatedRequest } from '../../common/guards/auth.guard';
import { requireAlbumOwnership } from '../../common/guards/idor.guard';
import { AlbumModel } from '../../database/models/Album';
import { AlbumItemModel } from '../../database/models/AlbumItem';
import { MediaModel } from '../../database/models/Media';
import { storageService } from '../storage/storage.service';
import { AppError } from '../../common/middleware/error.middleware';

const router = Router();

// GET /api/v1/albums (List all user albums with cover images)
router.get('/', authGuard, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const albums = await AlbumModel.find({ ownerId: req.user!._id, isShared: { $ne: true } })
      .sort({ updatedAt: -1 })
      .lean();

    const enhanced = await Promise.all(
      albums.map(async (album) => {
        let coverMedia: any = null;
        if (album.coverMediaId) {
          coverMedia = await MediaModel.findOne({
            _id: album.coverMediaId,
            isDeleted: false,
            isHidden: { $ne: true },
            isSharedAlbumMedia: { $ne: true },
          });
        }

        // Fallback: If cover is deleted, hidden, or unassigned, auto-select the latest valid photo in album
        if (!coverMedia) {
          const albumItems = await AlbumItemModel.find({ albumId: album._id })
            .sort({ addedAt: -1 })
            .limit(20)
            .lean();

          for (const item of albumItems) {
            const m = await MediaModel.findOne({
              _id: item.mediaId,
              isDeleted: false,
              isHidden: { $ne: true },
              isSharedAlbumMedia: { $ne: true },
            });
            if (m) {
              coverMedia = m;
              AlbumModel.updateOne(
                { _id: album._id },
                { $set: { coverMediaId: m._id } }
              ).catch(() => {});
              break;
            }
          }
        }

        let coverUrl = null;
        if (coverMedia) {
          coverUrl = await storageService.getPresignedDownloadUrl(
            coverMedia.thumbnailKey || coverMedia.storageKey,
            1800
          );
        }

        const albumItems = await AlbumItemModel.find({ albumId: album._id }).select('mediaId').lean();
        const validItemCount = await MediaModel.countDocuments({
          _id: { $in: albumItems.map((i) => i.mediaId) },
          isDeleted: false,
          isHidden: { $ne: true },
          isSharedAlbumMedia: { $ne: true },
        });

        // Sync stored itemCount if drifted
        if (album.itemCount !== validItemCount) {
          AlbumModel.updateOne({ _id: album._id }, { $set: { itemCount: validItemCount } }).catch(() => {});
        }

        return {
          ...album,
          itemCount: validItemCount,
          coverUrl,
        };
      })
    );

    res.json({ success: true, data: enhanced });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/albums (Create a new album)
router.post('/', authGuard, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      title: z.string().min(1, 'Album title is required').max(100),
      description: z.string().max(500).optional(),
      coverMediaId: z.string().optional(),
    });

    const data = schema.parse(req.body);

    const album = await AlbumModel.create({
      ownerId: req.user!._id,
      title: data.title.trim(),
      description: data.description?.trim(),
      coverMediaId: data.coverMediaId ? new mongoose.Types.ObjectId(data.coverMediaId) : undefined,
      itemCount: 0,
      isShared: false,
    });

    res.status(201).json({ success: true, data: album });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/albums/:id (Get album details and its items)
router.get('/:id', authGuard, requireAlbumOwnership, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const album = (req as any).albumResource;

    const albumItems = await AlbumItemModel.find({ albumId: album._id })
      .sort({ order: 1, addedAt: -1 })
      .lean();

    const mediaIds = albumItems.map((item) => item.mediaId);
    const mediaList = await MediaModel.find({
      _id: { $in: mediaIds },
      isDeleted: false,
      isHidden: { $ne: true },
      isSharedAlbumMedia: { $ne: true },
    }).lean();

    const mediaMap = new Map(mediaList.map((m) => [m._id.toString(), m]));

    const itemsWithUrls = await Promise.all(
      albumItems
        .filter((item) => mediaMap.has(item.mediaId.toString()))
        .map(async (item) => {
          const media = mediaMap.get(item.mediaId.toString())!;
          const thumbnailUrl = media.thumbnailKey
            ? await storageService.getPresignedDownloadUrl(media.thumbnailKey, 1800)
            : await storageService.getPresignedDownloadUrl(media.storageKey, 1800);

          const previewUrl = media.previewKey
            ? await storageService.getPresignedDownloadUrl(media.previewKey, 1800)
            : thumbnailUrl;

          return {
            ...media,
            albumItemId: item._id,
            addedAt: item.addedAt,
            thumbnailUrl,
            previewUrl,
          };
        })
    );

    const albumObj = {
      ...(album.toObject ? album.toObject() : album),
      itemCount: itemsWithUrls.length,
    };

    res.json({
      success: true,
      data: {
        album: albumObj,
        items: itemsWithUrls,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/albums/:id/media (Add media items to album)
router.post('/:id/media', authGuard, requireAlbumOwnership, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      mediaIds: z.array(z.string().min(1)).min(1),
    });

    const { mediaIds } = schema.parse(req.body);
    const album = (req as any).albumResource;

    // Verify ownership of the media files being added
    const validMedia = await MediaModel.find({
      _id: { $in: mediaIds.map((id) => new mongoose.Types.ObjectId(id)) },
      ownerId: req.user!._id,
      isDeleted: false,
    });

    let addedCount = 0;
    for (const media of validMedia) {
      try {
        await AlbumItemModel.create({
          albumId: album._id,
          mediaId: media._id,
          ownerId: req.user!._id,
          addedAt: new Date(),
        });
        addedCount++;
      } catch (err: any) {
        // Ignore duplicate album item index violations
      }
    }

    // Set first media as cover if album had none
    if (!album.coverMediaId && validMedia.length > 0) {
      album.coverMediaId = validMedia[0]._id;
    }

    const totalCount = await AlbumItemModel.countDocuments({ albumId: album._id });
    album.itemCount = totalCount;
    await album.save();

    res.json({
      success: true,
      message: `Added ${addedCount} items to ${album.title}.`,
      itemCount: totalCount,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/albums/:id/media/:mediaId (Remove item from album without deleting file)
router.delete('/:id/media/:mediaId', authGuard, requireAlbumOwnership, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const album = (req as any).albumResource;
    const mediaId = req.params.mediaId;

    await AlbumItemModel.deleteOne({
      albumId: album._id,
      mediaId: new mongoose.Types.ObjectId(mediaId),
    });

    const totalCount = await AlbumItemModel.countDocuments({ albumId: album._id });
    album.itemCount = totalCount;
    await album.save();

    res.json({ success: true, message: 'Item removed from album.', itemCount: totalCount });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/albums/:id (Update album title, description, cover)
router.patch('/:id', authGuard, requireAlbumOwnership, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      coverMediaId: z.string().optional(),
    });

    const data = schema.parse(req.body);
    const album = (req as any).albumResource;

    if (data.title) album.title = data.title;
    if (data.description !== undefined) album.description = data.description;
    if (data.coverMediaId) album.coverMediaId = new mongoose.Types.ObjectId(data.coverMediaId);

    await album.save();
    res.json({ success: true, data: album });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/albums/:id (Delete album container, files remain in library)
router.delete('/:id', authGuard, requireAlbumOwnership, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const album = (req as any).albumResource;

    await AlbumItemModel.deleteMany({ albumId: album._id });
    await AlbumModel.deleteOne({ _id: album._id });

    res.json({ success: true, message: 'Album deleted successfully.' });
  } catch (error) {
    next(error);
  }
});

export const albumsRouter = router;
