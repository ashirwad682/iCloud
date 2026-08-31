import mongoose, { Schema, Document } from 'mongoose';

export type AlbumMemberRole = 'OWNER' | 'EDITOR' | 'VIEWER';
export type AlbumMemberStatus = 'ACTIVE' | 'INVITED' | 'SUSPENDED';

export interface IAlbumMemberPermissions {
  view: boolean;
  contribute: boolean;
  comment: boolean;
  react: boolean;
  download: boolean;
  invite: boolean;
}

export interface IAlbumMember extends Document {
  _id: mongoose.Types.ObjectId;
  albumId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role: AlbumMemberRole;
  permissions: IAlbumMemberPermissions;
  status: AlbumMemberStatus;
  invitedBy?: mongoose.Types.ObjectId;
  joinedAt?: Date;
  lastActiveAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AlbumMemberSchema = new Schema<IAlbumMember>(
  {
    albumId: {
      type: Schema.Types.ObjectId,
      ref: 'Album',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['OWNER', 'EDITOR', 'VIEWER'],
      default: 'VIEWER',
      required: true,
    },
    permissions: {
      view: { type: Boolean, default: true },
      contribute: { type: Boolean, default: false },
      comment: { type: Boolean, default: true },
      react: { type: Boolean, default: true },
      download: { type: Boolean, default: true },
      invite: { type: Boolean, default: false },
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INVITED', 'SUSPENDED'],
      default: 'ACTIVE',
      index: true,
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    lastActiveAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound Unique Index: A user can have only one membership per album
AlbumMemberSchema.index({ albumId: 1, userId: 1 }, { unique: true });
AlbumMemberSchema.index({ userId: 1, status: 1 });

export const AlbumMemberModel = mongoose.model<IAlbumMember>('AlbumMember', AlbumMemberSchema);
