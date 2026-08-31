import { Router, Response, NextFunction } from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import { z } from 'zod';
import { authGuard, AuthenticatedRequest } from '../../common/guards/auth.guard';
import { MediaModel } from '../../database/models/Media';
import { UserModel } from '../../database/models/User';
import { UploadSessionModel } from '../../database/models/UploadSession';
import { UploadChunkModel } from '../../database/models/UploadChunk';
import { storageService } from '../storage/storage.service';
import { mediaQueueService } from '../../queue/media-queue';
import { CryptoUtil } from '../../common/utils/crypto';
import { AppError } from '../../common/middleware/error.middleware';
import { uploadRateLimiter } from '../../common/middleware/rate-limiter.middleware';
import { socketGateway } from '../../websocket/socket.gateway';
import sharp from 'sharp';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max per single-part upload
  },
});

function normalizeMimeType(mimeType: string, filename: string): string {
  const lower = filename.toLowerCase();
  if (mimeType && mimeType !== 'application/octet-stream' && mimeType !== 'binary/octet-stream') {
    return mimeType;
  }
  if (/\.(mp4|m4v)$/i.test(lower)) return 'video/mp4';
  if (/\.mov$/i.test(lower)) return 'video/quicktime';
  if (/\.webm$/i.test(lower)) return 'video/webm';
  if (/\.mkv$/i.test(lower)) return 'video/x-matroska';
  if (/\.avi$/i.test(lower)) return 'video/x-msvideo';
  if (/\.3gp$/i.test(lower)) return 'video/3gpp';
  if (/\.flv$/i.test(lower)) return 'video/x-flv';
  if (/\.(jpg|jpeg)$/i.test(lower)) return 'image/jpeg';
  if (/\.png$/i.test(lower)) return 'image/png';
  if (/\.webp$/i.test(lower)) return 'image/webp';
  if (/\.gif$/i.test(lower)) return 'image/gif';
  if (/\.svg$/i.test(lower)) return 'image/svg+xml';
  if (/\.(heic|heif)$/i.test(lower)) return 'image/heic';
  if (/\.avif$/i.test(lower)) return 'image/avif';
  return mimeType || 'application/octet-stream';
}

// POST /api/v1/uploads/direct (Direct Multipart File Upload with Inline Processing)
router.post(
  '/direct',
  authGuard,
  uploadRateLimiter,
  upload.single('file'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw new AppError('File payload is missing.', 400, 'FILE_MISSING');
      }

      const user = req.user!;
      const file = req.file;

      // 1. Quota Check
      if (user.storageUsedBytes + file.size > user.storageQuotaBytes) {
        throw new AppError(
          'Storage quota exceeded. Please upgrade storage or delete existing items.',
          403,
          'QUOTA_EXCEEDED'
        );
      }

      // 2. Validate MIME type & Extension
      const lowerName = file.originalname.toLowerCase();
      const normalizedMime = normalizeMimeType(file.mimetype, file.originalname);
      const isVideo = normalizedMime.startsWith('video/') || /\.(mp4|mov|avi|mkv|webm|3gp|m4v|flv)$/i.test(lowerName);
      const isImage = normalizedMime.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg|heic|heif|bmp|tiff|avif|ico)$/i.test(lowerName);

      if (!isImage && !isVideo) {
        throw new AppError('Unsupported file format. Only photos and videos are accepted.', 400, 'UNSUPPORTED_MEDIA_TYPE');
      }

      // 3. Compute Checksum (SHA-256)
      const checksum = CryptoUtil.computeChecksum(file.buffer);

      const mediaId = new mongoose.Types.ObjectId();
      const mediaType = isVideo ? 'VIDEO' : 'PHOTO';
      const storageKey = storageService.generateKey(user._id.toString(), mediaId.toString(), 'original');

      let thumbnailKey = storageKey;
      let previewKey = storageKey;
      let width = 0;
      let height = 0;
      let aspectRatio = 1;
      let dominantHex = '#0B0F19';

      const uploadPromises: Promise<any>[] = [
        storageService.uploadBuffer(storageKey, file.buffer, normalizedMime),
      ];

      let dataBase64: string | undefined = undefined;
      let thumbnailBase64: string | undefined = undefined;

      // Store base64 in MongoDB only if <= 4MB to prevent 16MB document limit overflow
      if (file.size <= 4 * 1024 * 1024) {
        dataBase64 = file.buffer.toString('base64');
      }

      // 4. Fast Image Processing
      if (isImage) {
        try {
          thumbnailKey = storageService.generateKey(user._id.toString(), mediaId.toString(), 'thumbnail', 'webp');
          previewKey = storageService.generateKey(user._id.toString(), mediaId.toString(), 'preview', 'webp');

          const imageSharp = sharp(file.buffer);
          const [metadata, thumbBuffer, previewBuffer, stats] = await Promise.all([
            imageSharp.metadata(),
            imageSharp
              .clone()
              .resize({ width: 320, height: 320, fit: 'cover' })
              .webp({ quality: 82 })
              .toBuffer(),
            imageSharp
              .clone()
              .resize({ width: 1400, height: 1400, fit: 'inside', withoutEnlargement: true })
              .webp({ quality: 88 })
              .toBuffer(),
            imageSharp.stats().catch(() => null),
          ]);

          width = metadata.width || 0;
          height = metadata.height || 0;
          if (width && height) {
            aspectRatio = width / height;
          }

          if (stats && stats.dominant) {
            const { r, g, b } = stats.dominant;
            dominantHex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
          }

          if (thumbBuffer) {
            thumbnailBase64 = thumbBuffer.toString('base64');
          }

          uploadPromises.push(storageService.uploadBuffer(thumbnailKey, thumbBuffer, 'image/webp'));
          uploadPromises.push(storageService.uploadBuffer(previewKey, previewBuffer, 'image/webp'));
        } catch (err) {
          console.warn(`Inline Sharp processing skipped for ${file.originalname}:`, err);
          thumbnailKey = storageKey;
          previewKey = storageKey;
        }
      }

      // Execute storage uploads concurrently
      await Promise.all(uploadPromises);

      const isHidden =
        req.body.isHidden === 'true' ||
        req.body.hidden === 'true' ||
        req.body.isHidden === true;

      // 5. Create Instant-Ready Media Record
      const media = await MediaModel.create({
        _id: mediaId,
        ownerId: user._id,
        originalName: file.originalname,
        storageKey,
        originalKey: storageKey,
        thumbnailKey,
        previewKey,
        mediaType,
        mimeType: normalizedMime,
        size: file.size,
        width,
        height,
        aspectRatio,
        checksum,
        dataBase64,
        thumbnailBase64: thumbnailBase64 || dataBase64,
        capturedAt: new Date(),
        uploadedAt: new Date(),
        status: 'READY',
        isFavorite: false,
        isHidden,
        isDeleted: false,
        metadata: {
          colorPalette: [dominantHex],
        },
        aiMetadata: {
          tags: [isImage ? 'Photos' : 'Videos'],
          categories: [isImage ? 'Photos' : 'Videos'],
        },
      });

      // 6. Update User Storage Used
      await UserModel.updateOne(
        { _id: user._id },
        { $inc: { storageUsedBytes: file.size } }
      );

      // 7. Auto-link to album if specified
      const albumId = req.body.albumId;
      if (albumId && mongoose.Types.ObjectId.isValid(albumId)) {
        try {
          const { AlbumItemModel } = await import('../../database/models/AlbumItem');
          const { AlbumModel } = await import('../../database/models/Album');
          
          const targetAlbum = await AlbumModel.findById(albumId);
          if (targetAlbum && targetAlbum.isShared) {
            media.isSharedAlbumMedia = true;
            await media.save();
          }

          await AlbumItemModel.updateOne(
            { albumId: new mongoose.Types.ObjectId(albumId), mediaId: media._id },
            {
              $setOnInsert: {
                albumId: new mongoose.Types.ObjectId(albumId),
                mediaId: media._id,
                ownerId: user._id,
                addedAt: new Date(),
              },
            },
            { upsert: true }
          );
          const totalCount = await AlbumItemModel.countDocuments({ albumId: new mongoose.Types.ObjectId(albumId) });
          await AlbumModel.updateOne(
            { _id: new mongoose.Types.ObjectId(albumId) },
            { $set: { itemCount: totalCount, coverMediaId: media._id } }
          );
        } catch (e) {
          console.warn('Could not auto-link upload to album:', e);
        }
      }

      // Generate immediate signed URLs or base64 data URLs for instant UI hydration
      const thumbnailUrl = media.thumbnailBase64
        ? `data:${media.mimeType || 'image/jpeg'};base64,${media.thumbnailBase64}`
        : await storageService.getPresignedDownloadUrl(thumbnailKey, 1800);
      const previewUrl = media.dataBase64
        ? `data:${media.mimeType || 'image/jpeg'};base64,${media.dataBase64}`
        : await storageService.getPresignedDownloadUrl(previewKey, 1800);

      const enhancedMedia = {
        ...media.toObject(),
        thumbnailUrl,
        previewUrl,
      };

      // Notify WebSocket clients
      socketGateway.emitMediaProcessing(user._id.toString(), media._id.toString(), 'READY', 'Upload complete', enhancedMedia);

      res.status(201).json({
        success: true,
        data: {
          media: enhancedMedia,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/uploads/chunk (High-speed binary / chunked upload for videos and large media)
router.post(
  '/chunk',
  authGuard,
  upload.single('chunk'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const uploadId = req.body.uploadId;
      const originalName = req.body.originalName;
      const mimeType = req.body.mimeType || 'application/octet-stream';
      const size = Number(req.body.size);
      const partNumber = Number(req.body.partNumber);
      const totalParts = Number(req.body.totalParts);
      const albumId = req.body.albumId;
      const isHidden = req.body.isHidden === 'true' || req.body.isHidden === true;

      if (!uploadId || !originalName || isNaN(size) || isNaN(partNumber) || isNaN(totalParts)) {
        throw new AppError('Invalid chunk upload parameters.', 400, 'INVALID_PARAMS');
      }

      let chunkBuffer: Buffer | null = null;
      if (req.file && req.file.buffer) {
        chunkBuffer = req.file.buffer;
      } else if (req.body.chunkBase64) {
        chunkBuffer = Buffer.from(req.body.chunkBase64, 'base64');
      }

      if (!chunkBuffer || chunkBuffer.length === 0) {
        throw new AppError('Chunk data is missing.', 400, 'CHUNK_MISSING');
      }

      const user = req.user!;
      const normalizedMime = normalizeMimeType(mimeType, originalName);

      // Quota check on first chunk
      if (partNumber === 1) {
        if (user.storageUsedBytes + size > user.storageQuotaBytes) {
          throw new AppError('Storage quota exceeded.', 403, 'QUOTA_EXCEEDED');
        }
      }

      // Store chunk in dedicated UploadChunk collection (binary Buffer or Base64)
      await UploadChunkModel.updateOne(
        { uploadId, partNumber },
        {
          $set: {
            uploadId,
            userId: user._id,
            partNumber,
            totalParts,
            dataBuffer: chunkBuffer,
          },
        },
        { upsert: true }
      );

      // Count received parts
      const receivedCount = await UploadChunkModel.countDocuments({ uploadId });

      if (receivedCount < totalParts) {
        return res.json({
          success: true,
          data: {
            uploadId,
            receivedParts: receivedCount,
            totalParts,
            isComplete: false,
          },
        });
      }

      // All chunks received! Retrieve and assemble in sequence
      const allChunks = await UploadChunkModel.find({ uploadId })
        .sort({ partNumber: 1 })
        .lean();

      const fullBuffer = Buffer.concat(
        allChunks.map((c) => (c.dataBuffer as Buffer) || Buffer.from(c.dataBase64 || '', 'base64'))
      );

      // Clean up chunks
      await UploadChunkModel.deleteMany({ uploadId });

      const lowerName = originalName.toLowerCase();
      const isVideo = normalizedMime.startsWith('video/') || /\.(mp4|mov|avi|mkv|webm|3gp|m4v|flv)$/i.test(lowerName);
      const isImage = !isVideo;
      const mediaId = new mongoose.Types.ObjectId();
      const storageKey = storageService.generateKey(user._id.toString(), mediaId.toString(), 'original');
      let thumbnailKey = storageKey;
      let previewKey = storageKey;
      let width = 0;
      let height = 0;
      let aspectRatio = 1;
      let dominantHex = '#0B0F19';

      // Upload assembled fullBuffer to StorageService (GridFS & local disk & S3)
      await storageService.uploadBuffer(storageKey, fullBuffer, normalizedMime);

      let dataBase64: string | undefined = undefined;
      let thumbnailBase64: string | undefined = undefined;

      // Only store base64 in MongoDB if <= 4MB
      if (fullBuffer.length <= 4 * 1024 * 1024) {
        dataBase64 = fullBuffer.toString('base64');
      }

      if (isImage) {
        try {
          thumbnailKey = storageService.generateKey(user._id.toString(), mediaId.toString(), 'thumbnail', 'webp');
          previewKey = storageService.generateKey(user._id.toString(), mediaId.toString(), 'preview', 'webp');
          const imageSharp = sharp(fullBuffer);
          const [metadata, thumbBuffer, previewBuffer, stats] = await Promise.all([
            imageSharp.metadata(),
            imageSharp.clone().resize({ width: 320, height: 320, fit: 'cover' }).webp({ quality: 82 }).toBuffer(),
            imageSharp.clone().resize({ width: 1400, height: 1400, fit: 'inside', withoutEnlargement: true }).webp({ quality: 88 }).toBuffer(),
            imageSharp.stats().catch(() => null),
          ]);
          width = metadata.width || 0;
          height = metadata.height || 0;
          if (width && height) aspectRatio = width / height;
          if (stats && stats.dominant) {
            const { r, g, b } = stats.dominant;
            dominantHex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
          }
          if (thumbBuffer) {
            thumbnailBase64 = thumbBuffer.toString('base64');
            await storageService.uploadBuffer(thumbnailKey, thumbBuffer, 'image/webp');
          }
          if (previewBuffer) {
            await storageService.uploadBuffer(previewKey, previewBuffer, 'image/webp');
          }
        } catch (err) {
          console.warn(`Chunk Sharp processing notice for ${originalName}:`, err);
        }
      }

      // Create Media Record
      const media = await MediaModel.create({
        _id: mediaId,
        ownerId: user._id,
        originalName,
        storageKey,
        originalKey: storageKey,
        thumbnailKey,
        previewKey,
        mediaType: isVideo ? 'VIDEO' : 'PHOTO',
        mimeType: normalizedMime,
        size: fullBuffer.length,
        width,
        height,
        aspectRatio,
        checksum: CryptoUtil.computeChecksum(fullBuffer),
        dataBase64,
        thumbnailBase64: thumbnailBase64 || (isImage && fullBuffer.length <= 4 * 1024 * 1024 ? dataBase64 : undefined),
        capturedAt: new Date(),
        uploadedAt: new Date(),
        status: 'READY',
        isFavorite: false,
        isHidden: !!isHidden,
        isDeleted: false,
        metadata: {
          colorPalette: [dominantHex],
        },
        aiMetadata: {
          tags: [isImage ? 'Photos' : 'Videos'],
          categories: [isImage ? 'Photos' : 'Videos'],
        },
      });

      // Update User storage
      await UserModel.updateOne({ _id: user._id }, { $inc: { storageUsedBytes: fullBuffer.length } });

      // Auto-link album if requested
      if (albumId && mongoose.Types.ObjectId.isValid(albumId)) {
        try {
          const { AlbumItemModel } = await import('../../database/models/AlbumItem');
          const { AlbumModel } = await import('../../database/models/Album');
          await AlbumItemModel.updateOne(
            { albumId: new mongoose.Types.ObjectId(albumId), mediaId: media._id },
            {
              $setOnInsert: {
                albumId: new mongoose.Types.ObjectId(albumId),
                mediaId: media._id,
                ownerId: user._id,
                addedAt: new Date(),
              },
            },
            { upsert: true }
          );
          const totalCount = await AlbumItemModel.countDocuments({ albumId: new mongoose.Types.ObjectId(albumId) });
          await AlbumModel.updateOne({ _id: new mongoose.Types.ObjectId(albumId) }, { $set: { itemCount: totalCount, coverMediaId: media._id } });
        } catch {}
      }

      const streamUrl = await storageService.getPresignedDownloadUrl(storageKey, 3600);
      const thumbnailUrl = media.thumbnailBase64
        ? `data:${media.mimeType || 'image/jpeg'};base64,${media.thumbnailBase64}`
        : streamUrl;
      const previewUrl = media.dataBase64
        ? `data:${media.mimeType || 'image/jpeg'};base64,${media.dataBase64}`
        : streamUrl;

      const enhancedMedia = {
        ...media.toObject(),
        thumbnailUrl,
        previewUrl,
        originalUrl: streamUrl,
      };

      // Notify via WebSocket
      socketGateway.emitMediaProcessing(user._id.toString(), media._id.toString(), 'READY', 'Upload complete', enhancedMedia);

      res.status(201).json({
        success: true,
        data: {
          media: enhancedMedia,
          isComplete: true,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);


// POST /api/v1/uploads/initiate-resumable (Initiate large chunked / resumable upload)

router.post(
  '/initiate-resumable',
  authGuard,
  uploadRateLimiter,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const schema = z.object({
        originalName: z.string().min(1),
        mimeType: z.string().min(1),
        size: z.number().positive(),
        checksum: z.string().optional(),
        totalParts: z.number().int().min(1).default(1),
      });

      const data = schema.parse(req.body);
      const user = req.user!;

      // Quota check
      if (user.storageUsedBytes + data.size > user.storageQuotaBytes) {
        throw new AppError('Storage quota exceeded.', 403, 'QUOTA_EXCEEDED');
      }

      const mediaId = new mongoose.Types.ObjectId();
      const storageKey = storageService.generateKey(
        user._id.toString(),
        mediaId.toString(),
        'original'
      );

      const uploadId = CryptoUtil.generateRandomToken(16);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      const uploadSession = await UploadSessionModel.create({
        userId: user._id,
        uploadId,
        originalName: data.originalName,
        mimeType: data.mimeType,
        size: data.size,
        checksum: data.checksum,
        storageKey,
        totalParts: data.totalParts,
        status: 'INITIATED',
        expiresAt,
      });

      const presignedUploadUrl = await storageService.getPresignedUploadUrl(
        storageKey,
        data.mimeType,
        3600
      );

      res.status(201).json({
        success: true,
        data: {
          uploadId: uploadSession.uploadId,
          storageKey,
          presignedUploadUrl,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/uploads/complete-resumable (Complete upload session & trigger processing)
router.post(
  '/complete-resumable',
  authGuard,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const schema = z.object({
        uploadId: z.string().min(1),
      });

      const { uploadId } = schema.parse(req.body);
      const user = req.user!;

      const uploadSession = await UploadSessionModel.findOne({
        uploadId,
        userId: user._id,
      });

      if (!uploadSession) {
        throw new AppError('Upload session not found.', 404, 'UPLOAD_SESSION_NOT_FOUND');
      }

      const isVideo = uploadSession.mimeType.startsWith('video/');
      const mediaType = isVideo ? 'VIDEO' : 'PHOTO';

      const media = await MediaModel.create({
        ownerId: user._id,
        originalName: uploadSession.originalName,
        storageKey: uploadSession.storageKey,
        originalKey: uploadSession.storageKey,
        mediaType,
        mimeType: uploadSession.mimeType,
        size: uploadSession.size,
        checksum: uploadSession.checksum || CryptoUtil.generateRandomToken(16),
        capturedAt: new Date(),
        uploadedAt: new Date(),
        status: 'PROCESSING',
        isFavorite: false,
        isDeleted: false,
      });

      // Update user storage
      await UserModel.updateOne(
        { _id: user._id },
        { $inc: { storageUsedBytes: uploadSession.size } }
      );

      uploadSession.status = 'COMPLETED';
      await uploadSession.save();

      // Trigger background worker
      await mediaQueueService.addJob({
        mediaId: media._id.toString(),
        userId: user._id.toString(),
        originalKey: uploadSession.storageKey,
        mimeType: uploadSession.mimeType,
        originalName: uploadSession.originalName,
      });

      res.json({ success: true, data: media });
    } catch (error) {
      next(error);
    }
  }
);

export const uploadsRouter = router;
