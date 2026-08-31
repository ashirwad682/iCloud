import mongoose, { Schema, Document } from 'mongoose';

export interface IAlbumReaction extends Document {
  _id: mongoose.Types.ObjectId;
  albumId: mongoose.Types.ObjectId;
  mediaId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  userName: string;
  reactionType: 'HEART' | 'THUMBS_UP' | 'LAUGH' | 'CLAP' | 'FIRE';
  createdAt: Date;
}

const AlbumReactionSchema = new Schema<IAlbumReaction>(
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
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    userName: {
      type: String,
      required: true,
    },
    reactionType: {
      type: String,
      enum: ['HEART', 'THUMBS_UP', 'LAUGH', 'CLAP', 'FIRE'],
      default: 'HEART',
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

AlbumReactionSchema.index({ mediaId: 1, userId: 1, reactionType: 1 }, { unique: true });

export const AlbumReactionModel = mongoose.model<IAlbumReaction>(
  'AlbumReaction',
  AlbumReactionSchema
);
