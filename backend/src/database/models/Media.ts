import mongoose, { Schema, Document } from 'mongoose';

export interface IMediaMetadata {
  make?: string;
  model?: string;
  lens?: string;
  focalLength?: number;
  iso?: number;
  fNumber?: number;
  exposureTime?: string;
  latitude?: number;
  longitude?: number;
  city?: string;
  country?: string;
  colorPalette?: string[];
}

export interface IAIMetadata {
  tags: string[];
  categories: string[];
  ocrText?: string;
  pHash?: string;
  detectedObjects?: string[];
  faceCount?: number;
}

export interface IMedia extends Document {
  _id: mongoose.Types.ObjectId;
  ownerId: mongoose.Types.ObjectId;
  originalName: string;
  storageKey: string;
  mediaType: 'PHOTO' | 'VIDEO' | 'LIVE_PHOTO';
  mimeType: string;
  size: number;
  checksum: string; // SHA-256
  
  // Dimensions & Video specs
  width?: number;
  height?: number;
  duration?: number; // In seconds
  aspectRatio?: number;
  
  // Timestamps
  capturedAt: Date;
  uploadedAt: Date;
  
  // Storage keys for derivatives
  thumbnailKey?: string;  // WebP 300px
  previewKey?: string;    // WebP 1200px
  largeKey?: string;      // WebP 2400px
  posterKey?: string;     // Video poster frame
  hlsMasterKey?: string;  // Video HLS m3u8
  
  // State
  status: 'UPLOADING' | 'QUARANTINE' | 'PROCESSING' | 'READY' | 'FAILED';
  processingError?: string;
  isFavorite: boolean;
  isHidden?: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  isSharedAlbumMedia?: boolean;
  
  // Metadata & AI
  metadata?: IMediaMetadata;
  aiMetadata?: IAIMetadata;
  
  createdAt: Date;
  updatedAt: Date;
}

const MediaSchema = new Schema<IMedia>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    originalName: {
      type: String,
      required: true,
      trim: true,
    },
    storageKey: {
      type: String,
      required: true,
      unique: true,
    },
    mediaType: {
      type: String,
      enum: ['PHOTO', 'VIDEO', 'LIVE_PHOTO'],
      required: true,
      index: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    checksum: {
      type: String,
      required: true,
      index: true,
    },
    width: {
      type: Number,
    },
    height: {
      type: Number,
    },
    duration: {
      type: Number,
    },
    aspectRatio: {
      type: Number,
    },
    capturedAt: {
      type: Date,
      required: true,
      index: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    thumbnailKey: {
      type: String,
    },
    previewKey: {
      type: String,
    },
    largeKey: {
      type: String,
    },
    posterKey: {
      type: String,
    },
    hlsMasterKey: {
      type: String,
    },
    status: {
      type: String,
      enum: ['UPLOADING', 'QUARANTINE', 'PROCESSING', 'READY', 'FAILED'],
      default: 'PROCESSING',
      index: true,
    },
    processingError: {
      type: String,
    },
    isFavorite: {
      type: Boolean,
      default: false,
      index: true,
    },
    isHidden: {
      type: Boolean,
      default: false,
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    isSharedAlbumMedia: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      index: true,
    },
    metadata: {
      make: String,
      model: String,
      lens: String,
      focalLength: Number,
      iso: Number,
      fNumber: Number,
      exposureTime: String,
      latitude: Number,
      longitude: Number,
      city: String,
      country: String,
      colorPalette: [String],
    },
    aiMetadata: {
      tags: { type: [String], default: [] },
      categories: { type: [String], default: [] },
      ocrText: String,
      pHash: String,
      detectedObjects: { type: [String], default: [] },
      faceCount: Number,
    },
  },
  {
    timestamps: true,
  }
);

// High-performance compound indexes for timeline, favorites, trash, and duplicate detection
MediaSchema.index({ ownerId: 1, isDeleted: 1, capturedAt: -1 });
MediaSchema.index({ ownerId: 1, isFavorite: 1, isDeleted: 1, capturedAt: -1 });
MediaSchema.index({ ownerId: 1, mediaType: 1, isDeleted: 1, capturedAt: -1 });
MediaSchema.index({ ownerId: 1, checksum: 1 });
MediaSchema.index({ ownerId: 1, isDeleted: 1, deletedAt: -1 });
MediaSchema.index({ 'aiMetadata.tags': 1, ownerId: 1 });
MediaSchema.index({ 'metadata.city': 1, ownerId: 1 });

export const MediaModel = mongoose.model<IMedia>('Media', MediaSchema);
