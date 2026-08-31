import mongoose, { Schema, Document } from 'mongoose';

export interface IAlbumComment extends Document {
  _id: mongoose.Types.ObjectId;
  albumId: mongoose.Types.ObjectId;
  mediaId?: mongoose.Types.ObjectId;
  authorId: mongoose.Types.ObjectId;
  authorName: string;
  authorAvatar?: string;
  text: string;
  createdAt: Date;
  updatedAt: Date;
}

const AlbumCommentSchema = new Schema<IAlbumComment>(
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
      index: true,
    },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    authorName: {
      type: String,
      required: true,
      trim: true,
    },
    authorAvatar: {
      type: String,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
  },
  {
    timestamps: true,
  }
);

AlbumCommentSchema.index({ albumId: 1, createdAt: 1 });
AlbumCommentSchema.index({ mediaId: 1, createdAt: 1 });

export const AlbumCommentModel = mongoose.model<IAlbumComment>(
  'AlbumComment',
  AlbumCommentSchema
);
