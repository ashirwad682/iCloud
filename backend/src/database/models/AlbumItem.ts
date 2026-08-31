import mongoose, { Schema, Document } from 'mongoose';

export interface IAlbumItem extends Document {
  _id: mongoose.Types.ObjectId;
  albumId: mongoose.Types.ObjectId;
  mediaId: mongoose.Types.ObjectId;
  ownerId: mongoose.Types.ObjectId;
  order: number;
  addedAt: Date;
}

const AlbumItemSchema = new Schema<IAlbumItem>(
  {
    albumId: {
      type: Schema.Types.ObjectId,
      ref: 'Album',
      required: true,
      index: true,
    },
    mediaId: {
      type: Schema.Types.ObjectId,
      ref: 'Media',
      required: true,
      index: true,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

// Prevent duplicate media in the same album
AlbumItemSchema.index({ albumId: 1, mediaId: 1 }, { unique: true });
AlbumItemSchema.index({ albumId: 1, order: 1 });

export const AlbumItemModel = mongoose.model<IAlbumItem>('AlbumItem', AlbumItemSchema);
