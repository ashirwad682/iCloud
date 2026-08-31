import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import archiver from 'archiver';
import { format } from 'date-fns';
import { authGuard, AuthenticatedRequest } from '../../common/guards/auth.guard';
import { ShareModel } from '../../database/models/Share';
import { ShareAccessLogModel } from '../../database/models/ShareAccessLog';
import { MediaModel } from '../../database/models/Media';
import { AlbumModel } from '../../database/models/Album';
import { AlbumItemModel } from '../../database/models/AlbumItem';
import { storageService } from '../storage/storage.service';
import { CryptoUtil } from '../../common/utils/crypto';
import { AppError } from '../../common/middleware/error.middleware';

const router = Router();

// POST /api/v1/shares (Create a new secure Cloud Link)
router.post('/', authGuard, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      targetType: z.enum(['MEDIA', 'ALBUM', 'BATCH']),
      targetId: z.string().optional(),
      targetIds: z.array(z.string()).optional(),
      title: z.string().optional(),
      password: z.string().optional(),
      expiresInDays: z.number().min(1).max(365).optional(),
      allowDownload: z.boolean().default(true),
      stripMetadata: z.boolean().default(true),
    });

    const data = schema.parse(req.body);
    const token = CryptoUtil.generateRandomToken(32); // 256-bit entropy
    const tokenHash = CryptoUtil.computeChecksum(Buffer.from(token));

    let passwordHash: string | undefined;
    let isPasswordProtected = false;
    if (data.password && data.password.trim().length > 0) {
      passwordHash = await CryptoUtil.hashPassword(data.password.trim());
      isPasswordProtected = true;
    }

    let expiresAt: Date | undefined;
    if (data.expiresInDays) {
      expiresAt = new Date(Date.now() + data.expiresInDays * 24 * 60 * 60 * 1000);
    }

    const share = await ShareModel.create({
      token,
      tokenHash,
      ownerId: req.user!._id,
      targetType: data.targetType,
      targetId: data.targetId ? new mongoose.Types.ObjectId(data.targetId) : undefined,
      targetIds: data.targetIds?.map((id) => new mongoose.Types.ObjectId(id)),
      title: data.title || 'Cloud Link',
      accessMode: isPasswordProtected ? 'PASSWORD' : 'PUBLIC',
      isPasswordProtected,
      passwordHash,
      permissions: {
        view: true,
        download: data.allowDownload,
        comment: false,
      },
      allowDownload: data.allowDownload,
      stripMetadata: data.stripMetadata,
      expiresAt,
      isRevoked: false,
    });

    res.status(201).json({
      success: true,
      data: {
        shareId: share._id,
        token: share.token,
        shareUrl: `/s/${share.token}`,
        isPasswordProtected: share.isPasswordProtected,
        expiresAt: share.expiresAt,
        allowDownload: share.allowDownload,
        stripMetadata: share.stripMetadata,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/shares (List owner's active Cloud Links)
router.get('/', authGuard, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shares = await ShareModel.find({
      ownerId: req.user!._id,
      isRevoked: false,
    }).sort({ createdAt: -1 });

    res.json({ success: true, data: shares });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/shares/:id/revoke (Revoke Cloud Link)
router.post('/:id/revoke', authGuard, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const share = await ShareModel.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user!._id },
      { $set: { isRevoked: true, revokedAt: new Date() } },
      { new: true }
    );

    if (!share) {
      throw new AppError('Share not found or already revoked.', 404, 'SHARE_NOT_FOUND');
    }

    res.json({ success: true, message: 'Cloud link revoked successfully.' });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/shares/:id (Delete / Revoke share)
router.delete('/:id', authGuard, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const share = await ShareModel.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user!._id },
      { $set: { isRevoked: true, revokedAt: new Date() } },
      { new: true }
    );

    if (!share) {
      throw new AppError('Share not found or already revoked.', 404, 'SHARE_NOT_FOUND');
    }

    res.json({ success: true, message: 'Share link revoked successfully.' });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/shares/public/:token (Public Cloud Link Access with Rate Limiting & Password Validation)
router.get('/public/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.params.token;
    const password = req.headers['x-share-password'] as string;

    const share = await ShareModel.findOne({ token, isRevoked: false });
    if (!share) {
      throw new AppError('Cloud link is unavailable, expired, or has been revoked.', 404, 'SHARE_NOT_FOUND');
    }

    // Server-side expiration enforcement
    if (share.expiresAt && new Date() > share.expiresAt) {
      throw new AppError('This cloud link has expired.', 410, 'SHARE_EXPIRED');
    }

    // Password verification
    if (share.isPasswordProtected && share.passwordHash) {
      if (!password) {
        return res.json({
          success: true,
          requiresPassword: true,
          title: share.title,
        });
      }

      const isValidPassword = await CryptoUtil.verifyPassword(share.passwordHash, password);
      if (!isValidPassword) {
        // Log failed password attempt
        ShareAccessLogModel.create({
          shareId: share._id,
          action: 'PASSWORD_ATTEMPT',
          isSuccessful: false,
        }).catch(() => {});

        throw new AppError('Incorrect link password. Please try again.', 401, 'INVALID_SHARE_PASSWORD');
      }
    }

    // Increment view analytics & log access with visitor IP and UserAgent
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Web Browser';

    ShareModel.updateOne({ _id: share._id }, { $inc: { accessCount: 1 }, $set: { lastAccessedAt: new Date() } }).exec();
    ShareAccessLogModel.create({
      shareId: share._id,
      action: 'VIEW',
      ipAddress,
      userAgent,
      isSuccessful: true,
      timestamp: new Date(),
    }).catch(() => {});

    let items: any[] = [];
    let albumInfo: any = null;

    if (share.targetType === 'MEDIA' && share.targetId) {
      const media = await MediaModel.findOne({ _id: share.targetId, isDeleted: false }).lean();
      if (media) items = [media];
    } else if (share.targetType === 'ALBUM' && share.targetId) {
      const album = await AlbumModel.findById(share.targetId).lean();
      if (album) {
        albumInfo = { title: album.title, description: album.description };
        const albumItems = await AlbumItemModel.find({ albumId: album._id }).lean();
        const mediaIds = albumItems.map((ai) => ai.mediaId);
        items = await MediaModel.find({ _id: { $in: mediaIds }, isDeleted: false, isHidden: { $ne: true } }).lean();
      }
    } else if (share.targetType === 'BATCH' && share.targetIds) {
      items = await MediaModel.find({ _id: { $in: share.targetIds }, isDeleted: false, isHidden: { $ne: true } }).lean();
    }

    // Enhance items with signed preview URLs and respect stripMetadata privacy
    const enhancedItems = await Promise.all(
      items.map(async (item) => {
        const thumbUrl = item.thumbnailKey
          ? await storageService.getPresignedDownloadUrl(item.thumbnailKey, 1800)
          : await storageService.getPresignedDownloadUrl(item.storageKey, 1800);

        const previewUrl = item.previewKey
          ? await storageService.getPresignedDownloadUrl(item.previewKey, 1800)
          : thumbUrl;

        let downloadUrl = null;
        if (share.allowDownload) {
          downloadUrl = await storageService.getPresignedDownloadUrl(
            item.storageKey,
            1800,
            item.originalName
          );
        }

        return {
          _id: item._id,
          originalName: item.originalName,
          mediaType: item.mediaType,
          width: item.width,
          height: item.height,
          capturedAt: item.capturedAt,
          thumbnailUrl: thumbUrl,
          previewUrl: previewUrl,
          downloadUrl,
          metadata: share.stripMetadata ? undefined : item.metadata,
        };
      })
    );

    res.json({
      success: true,
      data: {
        title: share.title,
        album: albumInfo,
        allowDownload: share.allowDownload,
        expiresAt: share.expiresAt,
        items: enhancedItems,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/shares/public/:token/download-all (Stream ZIP archive of authorized shared files)
router.post('/public/:token/download-all', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.params.token;
    const password = req.headers['x-share-password'] as string;

    const share = await ShareModel.findOne({ token, isRevoked: false });
    if (!share) {
      throw new AppError('Cloud link unavailable or revoked.', 404, 'SHARE_NOT_FOUND');
    }

    if (share.expiresAt && new Date() > share.expiresAt) {
      throw new AppError('This cloud link has expired.', 410, 'SHARE_EXPIRED');
    }

    if (!share.allowDownload) {
      throw new AppError('Downloads are disabled for this cloud link.', 403, 'DOWNLOAD_DISABLED');
    }

    if (share.isPasswordProtected && share.passwordHash) {
      const isValid = await CryptoUtil.verifyPassword(share.passwordHash, password || '');
      if (!isValid) {
        throw new AppError('Valid password required.', 401, 'INVALID_PASSWORD');
      }
    }

    let items: any[] = [];
    if (share.targetType === 'MEDIA' && share.targetId) {
      items = await MediaModel.find({ _id: share.targetId, isDeleted: false }).lean();
    } else if (share.targetType === 'ALBUM' && share.targetId) {
      const albumItems = await AlbumItemModel.find({ albumId: share.targetId }).lean();
      const mediaIds = albumItems.map((ai) => ai.mediaId);
      items = await MediaModel.find({ _id: { $in: mediaIds }, isDeleted: false, isHidden: { $ne: true } }).lean();
    } else if (share.targetType === 'BATCH' && share.targetIds) {
      items = await MediaModel.find({ _id: { $in: share.targetIds }, isDeleted: false, isHidden: { $ne: true } }).lean();
    }

    if (items.length === 0) {
      throw new AppError('No items available for download.', 400, 'NO_ITEMS');
    }

    // Increment download metrics with visitor IP and UserAgent
    const downloadIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip || '127.0.0.1';
    const downloadUa = req.headers['user-agent'] || 'Web Browser';

    ShareModel.updateOne({ _id: share._id }, { $inc: { downloadCount: 1 } }).exec();
    ShareAccessLogModel.create({
      shareId: share._id,
      action: 'DOWNLOAD',
      ipAddress: downloadIp,
      userAgent: downloadUa,
      isSuccessful: true,
      timestamp: new Date(),
    }).catch(() => {});

    res.attachment(`iCloud-Photos-${items.length}-items.zip`);

    const archive = archiver('zip', { zlib: { level: 5 } });
    archive.pipe(res);

    for (const item of items) {
      try {
        const { stream } = await storageService.getObjectStream(item.storageKey);
        archive.append(stream, { name: item.originalName });
      } catch (err) {
        console.error(`Skipping item ${item._id} during archive streaming`, err);
      }
    }

    await archive.finalize();
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/shares/public/:token/track-download (Track individual file download from public link)
router.post('/public/:token/track-download', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.params.token;
    const share = await ShareModel.findOne({ token, isRevoked: false });
    if (!share) {
      throw new AppError('Cloud link unavailable or revoked.', 404, 'SHARE_NOT_FOUND');
    }

    const downloadIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip || '127.0.0.1';
    const downloadUa = req.headers['user-agent'] || 'Web Browser';

    await ShareModel.updateOne({ _id: share._id }, { $inc: { downloadCount: 1 } });
    await ShareAccessLogModel.create({
      shareId: share._id,
      action: 'DOWNLOAD',
      ipAddress: downloadIp,
      userAgent: downloadUa,
      isSuccessful: true,
      timestamp: new Date(),
    });

    res.json({ success: true, message: 'Download recorded.' });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/shares/:id/analytics (Fetch share access analytics for owner)
router.get('/:id/analytics', authGuard, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const share = await ShareModel.findOne({ _id: req.params.id, ownerId: req.user!._id });
    if (!share) {
      throw new AppError('Share not found.', 404, 'SHARE_NOT_FOUND');
    }

    const logs = await ShareAccessLogModel.find({ shareId: share._id })
      .sort({ timestamp: -1 })
      .limit(100)
      .lean();

    // Map logs with friendly device/browser parsing
    const enrichedLogs = logs.map((log) => {
      const ua = log.userAgent || '';
      let device = 'Desktop';
      if (/iphone|ipad|ipod/i.test(ua)) device = 'Apple iOS Device';
      else if (/android/i.test(ua)) device = 'Android Device';
      else if (/macintosh|mac os x/i.test(ua)) device = 'MacBook / Mac';
      else if (/windows/i.test(ua)) device = 'Windows PC';

      let browser = 'Web Browser';
      if (/chrome/i.test(ua) && !/edg/i.test(ua)) browser = 'Chrome';
      else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Apple Safari';
      else if (/firefox/i.test(ua)) browser = 'Firefox';
      else if (/edg/i.test(ua)) browser = 'Microsoft Edge';

      return {
        _id: log._id,
        action: log.action,
        ipAddress: log.ipAddress || '127.0.0.1',
        userAgent: log.userAgent,
        device,
        browser,
        isSuccessful: log.isSuccessful,
        timestamp: log.timestamp,
      };
    });

    res.json({
      success: true,
      data: {
        shareId: share._id,
        title: share.title || 'Shared Media Link',
        views: share.accessCount,
        downloads: share.downloadCount,
        createdAt: share.createdAt,
        expiresAt: share.expiresAt,
        lastAccessedAt: share.lastAccessedAt,
        recentActivity: enrichedLogs,
      },
    });
  } catch (error) {
    next(error);
  }
});

export const sharesRouter = router;
