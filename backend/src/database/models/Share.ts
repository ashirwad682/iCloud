import mongoose, { Schema, Document } from 'mongoose';

export type ShareAccessMode = 'PUBLIC' | 'PASSWORD' | 'AUTHENTICATED';

export interface ISharePermissions {
  view: boolean;
  download: boolean;
  comment: boolean;
}

export interface IShare extends Document {
  _id: mongoose.Types.ObjectId;
  token: string;
  tokenHash: string;
  ownerId: mongoose.Types.ObjectId;
  targetType: 'MEDIA' | 'ALBUM' | 'BATCH';
  targetId?: mongoose.Types.ObjectId;
  targetIds?: mongoose.Types.ObjectId[];
  title?: string;
  accessMode: ShareAccessMode;
  isPasswordProtected: boolean;
  passwordHash?: string;
  permissions: ISharePermissions;
  allowDownload: boolean;
  stripMetadata: boolean;
  expiresAt?: Date;
  isRevoked: boolean;
  revokedAt?: Date;
  accessCount: number;
  downloadCount: number;
  lastAccessedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ShareSchema = new Schema<IShare>(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      index: true,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: ['MEDIA', 'ALBUM', 'BATCH'],
      required: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      refPath: 'targetType',
    },
    targetIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Media',
      },
    ],
    title: {
      type: String,
      trim: true,
    },
    accessMode: {
      type: String,
      enum: ['PUBLIC', 'PASSWORD', 'AUTHENTICATED'],
      default: 'PUBLIC',
    },
    isPasswordProtected: {
      type: Boolean,
      default: false,
    },
    passwordHash: {
      type: String,
    },
    permissions: {
      view: { type: Boolean, default: true },
      download: { type: Boolean, default: true },
      comment: { type: Boolean, default: false },
    },
    allowDownload: {
      type: Boolean,
      default: true,
    },
    stripMetadata: {
      type: Boolean,
      default: true, // Privacy-by-default for public links
    },
    expiresAt: {
      type: Date,
      index: true,
    },
    isRevoked: {
      type: Boolean,
      default: false,
      index: true,
    },
    revokedAt: {
      type: Date,
    },
    accessCount: {
      type: Number,
      default: 0,
    },
    downloadCount: {
      type: Number,
      default: 0,
    },
    lastAccessedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

ShareSchema.index({ ownerId: 1, isRevoked: 1, createdAt: -1 });

export const ShareModel = mongoose.model<IShare>('Share', ShareSchema);
