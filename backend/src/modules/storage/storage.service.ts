import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../../config/env.config';
import fs from 'fs';
import path from 'path';
import { Readable, PassThrough } from 'stream';
import mongoose from 'mongoose';
import os from 'os';

export class StorageService {
  private s3: S3Client | null = null;
  private bucket: string;
  private useS3: boolean = false;
  private localDir: string;

  constructor() {
    this.bucket = config.S3_BUCKET;
    this.localDir = process.env.VERCEL
      ? path.join(os.tmpdir(), 'storage_mock')
      : path.resolve(__dirname, '../../../scratch/storage_mock');

    try {
      fs.mkdirSync(this.localDir, { recursive: true });
    } catch (e) {
      console.warn('Storage directory initialization notice:', e);
    }

    // Only configure S3 if not localhost minio or if explicitly configured
    if (config.S3_ACCESS_KEY && config.S3_SECRET_KEY && !config.S3_ENDPOINT.includes('localhost')) {
      try {
        this.s3 = new S3Client({
          endpoint: config.S3_ENDPOINT,
          region: config.S3_REGION,
          credentials: {
            accessKeyId: config.S3_ACCESS_KEY,
            secretAccessKey: config.S3_SECRET_KEY,
          },
          forcePathStyle: config.S3_FORCE_PATH_STYLE,
        });
        this.useS3 = true;
      } catch {
        this.useS3 = false;
      }
    } else {
      this.useS3 = false;
    }
  }

  /**
   * Get MongoDB GridFSBucket instance
   */
  private getGridFSBucket(): mongoose.mongo.GridFSBucket | null {
    if (mongoose.connection && mongoose.connection.readyState === 1 && mongoose.connection.db) {
      return new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: 'cloudvault_media',
      });
    }
    return null;
  }

  /**
   * Generates a structured storage key for media:
   * users/{userId}/media/{year}/{month}/{mediaId}/{variant}
   */
  generateKey(
    userId: string,
    mediaId: string,
    variant: 'original' | 'thumbnail' | 'preview' | 'large' | 'poster' | 'hls' = 'original',
    extension: string = ''
  ): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const ext = extension ? (extension.startsWith('.') ? extension : `.${extension}`) : '';

    return `users/${userId}/media/${year}/${month}/${mediaId}/${variant}${ext}`;
  }

  /**
   * Generates a download URL.
   */
  async getPresignedDownloadUrl(
    storageKey: string,
    expiresInSeconds: number = 900,
    downloadFilename?: string
  ): Promise<string> {
    if (this.useS3 && this.s3) {
      try {
        const command = new GetObjectCommand({
          Bucket: this.bucket,
          Key: storageKey,
          ResponseContentDisposition: downloadFilename
            ? `attachment; filename="${encodeURIComponent(downloadFilename)}"`
            : undefined,
        });
        return await getSignedUrl(this.s3, command, { expiresIn: expiresInSeconds });
      } catch {
        // Fallback
      }
    }
    return `/api/v1/media/stream-raw?key=${encodeURIComponent(storageKey)}`;
  }

  /**
   * Generates a presigned upload URL.
   */
  async getPresignedUploadUrl(
    storageKey: string,
    mimeType: string,
    expiresInSeconds: number = 900
  ): Promise<string> {
    if (this.useS3 && this.s3) {
      try {
        const command = new PutObjectCommand({
          Bucket: this.bucket,
          Key: storageKey,
          ContentType: mimeType,
        });
        return await getSignedUrl(this.s3, command, { expiresIn: expiresInSeconds });
      } catch {
        // Fallback
      }
    }
    return `/api/v1/uploads/direct-stream?key=${encodeURIComponent(storageKey)}`;
  }

  /**
   * Uploads a Buffer directly (writes to disk, GridFS, and S3).
   */
  async uploadBuffer(storageKey: string, buffer: Buffer, mimeType: string): Promise<void> {
    // 1. Write to local disk cache
    try {
      const fullPath = path.join(this.localDir, storageKey);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, buffer);
    } catch (e) {
      console.warn('Local buffer write notice:', e);
    }

    // 2. Upload to MongoDB GridFS for persistent multi-device cloud storage
    try {
      const bucket = this.getGridFSBucket();
      if (bucket) {
        // Remove existing if any
        const existing = await bucket.find({ filename: storageKey }).toArray();
        if (existing && existing.length > 0) {
          for (const f of existing) {
            try {
              await bucket.delete(f._id);
            } catch {}
          }
        }

        await new Promise<void>((resolve, reject) => {
          const uploadStream = bucket.openUploadStream(storageKey, {
            contentType: mimeType,
            metadata: { uploadedAt: new Date() },
          });
          uploadStream.on('finish', () => resolve());
          uploadStream.on('error', (err) => reject(err));
          uploadStream.end(buffer);
        });
      }
    } catch (e) {
      console.warn('GridFS upload notice:', e);
    }

    // 3. Upload to S3 if configured
    if (this.useS3 && this.s3) {
      try {
        const command = new PutObjectCommand({
          Bucket: this.bucket,
          Key: storageKey,
          Body: buffer,
          ContentType: mimeType,
        });
        await this.s3.send(command);
      } catch {}
    }
  }

  /**
   * Retrieves an object stream (supports local disk, S3, and MongoDB GridFS).
   */
  async getObjectStream(storageKey: string, range?: { start: number; end?: number }): Promise<{ stream: Readable; contentLength?: number; contentType?: string }> {
    const fullPath = path.join(this.localDir, storageKey);
    if (fs.existsSync(fullPath)) {
      const stats = fs.statSync(fullPath);
      const totalSize = stats.size;
      if (range) {
        const start = range.start;
        const end = range.end !== undefined ? Math.min(range.end, totalSize - 1) : totalSize - 1;
        return {
          stream: fs.createReadStream(fullPath, { start, end }),
          contentLength: end - start + 1,
        };
      }
      return {
        stream: fs.createReadStream(fullPath),
        contentLength: totalSize,
      };
    }

    // Check GridFS
    const bucket = this.getGridFSBucket();
    if (bucket) {
      const files = await bucket.find({ filename: storageKey }).toArray();
      if (files && files.length > 0) {
        const file = files[0];
        const totalSize = file.length;
        const contentType = (file.contentType as string) || (file.metadata as any)?.contentType;

        if (range) {
          const start = range.start;
          const end = range.end !== undefined ? Math.min(range.end, totalSize - 1) : totalSize - 1;
          const downloadStream = bucket.openDownloadStreamByName(storageKey, {
            start,
            end: end + 1,
          });
          return {
            stream: downloadStream,
            contentLength: end - start + 1,
            contentType,
          };
        }

        return {
          stream: bucket.openDownloadStreamByName(storageKey),
          contentLength: totalSize,
          contentType,
        };
      }
    }

    if (this.useS3 && this.s3) {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
        Range: range ? `bytes=${range.start}-${range.end !== undefined ? range.end : ''}` : undefined,
      });
      const response = await this.s3.send(command);
      return {
        stream: response.Body as Readable,
        contentLength: response.ContentLength,
        contentType: response.ContentType,
      };
    }

    throw new Error(`Storage object not found: ${storageKey}`);
  }

  /**
   * Deletes an object across local disk, GridFS, and S3.
   */
  async deleteObject(storageKey: string): Promise<void> {
    const fullPath = path.join(this.localDir, storageKey);
    if (fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath);
      } catch {}
    }

    try {
      const bucket = this.getGridFSBucket();
      if (bucket) {
        const files = await bucket.find({ filename: storageKey }).toArray();
        for (const f of files) {
          try {
            await bucket.delete(f._id);
          } catch {}
        }
      }
    } catch {}

    if (this.useS3 && this.s3) {
      try {
        const command = new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: storageKey,
        });
        await this.s3.send(command);
      } catch {}
    }
  }

  /**
   * Deletes multiple objects.
   */
  async deleteObjects(storageKeys: string[]): Promise<void> {
    for (const key of storageKeys) {
      await this.deleteObject(key);
    }
  }
}

export const storageService = new StorageService();

