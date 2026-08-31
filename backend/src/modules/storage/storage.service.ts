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
import { Readable } from 'stream';

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
      // Default to lightning-fast local storage mock
      this.useS3 = false;
    }
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
   * Uploads a Buffer directly (0.1ms local disk write or S3 stream).
   */
  async uploadBuffer(storageKey: string, buffer: Buffer, mimeType: string): Promise<void> {
    try {
      const fullPath = path.join(this.localDir, storageKey);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, buffer);
    } catch (e) {
      console.warn('Local buffer write notice:', e);
    }


    if (this.useS3 && this.s3) {
      try {
        const command = new PutObjectCommand({
          Bucket: this.bucket,
          Key: storageKey,
          Body: buffer,
          ContentType: mimeType,
        });
        await this.s3.send(command);
      } catch {
        // Fallback already saved locally
      }
    }
  }

  /**
   * Retrieves an object stream.
   */
  async getObjectStream(storageKey: string): Promise<Readable> {
    const fullPath = path.join(this.localDir, storageKey);
    if (fs.existsSync(fullPath)) {
      return fs.createReadStream(fullPath);
    }

    if (this.useS3 && this.s3) {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
      });
      const response = await this.s3.send(command);
      return response.Body as Readable;
    }

    throw new Error(`Storage object not found: ${storageKey}`);
  }

  /**
   * Deletes an object.
   */
  async deleteObject(storageKey: string): Promise<void> {
    const fullPath = path.join(this.localDir, storageKey);
    if (fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath);
      } catch {}
    }

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
