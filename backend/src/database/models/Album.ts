import mongoose, { Schema, Document } from 'mongoose';

export interface IAlbumSettings {
  allowContributions: boolean;
  allowComments: boolean;
  allowReactions: boolean;
  allowDownloads: boolean;
  isPublicLinkEnabled: boolean;
  requireLoginForPublic: boolean;
}

export interface IAlbum extends Document {
  _id: mongoose.Types.ObjectId;
  ownerId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  coverMediaId?: mongoose.Types.ObjectId;
  itemCount: number;
  isShared: boolean;
  settings: IAlbumSettings;
  memberCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const AlbumSchema = new Schema<IAlbum>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    coverMediaId: {
      type: Schema.Types.ObjectId,
      ref: 'Media',
    },
    itemCount: {
      type: Number,
      default: 0,
    },
    isShared: {
      type: Boolean,
      default: false,
      index: true,
    },
    settings: {
      allowContributions: { type: Boolean, default: true },
      allowComments: { type: Boolean, default: true },
      allowReactions: { type: Boolean, default: true },
      allowDownloads: { type: Boolean, default: true },
      isPublicLinkEnabled: { type: Boolean, default: false },
      requireLoginForPublic: { type: Boolean, default: false },
    },
    memberCount: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

AlbumSchema.index({ ownerId: 1, isShared: 1, updatedAt: -1 });

export const AlbumModel = mongoose.model<IAlbum>('Album', AlbumSchema);
