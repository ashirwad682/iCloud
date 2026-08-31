import mongoose, { Schema, Document } from 'mongoose';
import { AlbumMemberRole } from './AlbumMember';

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'REVOKED';

export interface IAlbumInvitation extends Document {
  _id: mongoose.Types.ObjectId;
  albumId: mongoose.Types.ObjectId;
  inviterId: mongoose.Types.ObjectId;
  recipientEmail: string;
  token: string;
  tokenHash: string;
  role: AlbumMemberRole;
  expiresAt: Date;
  status: InvitationStatus;
  acceptedAt?: Date;
  declinedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AlbumInvitationSchema = new Schema<IAlbumInvitation>(
  {
    albumId: {
      type: Schema.Types.ObjectId,
      ref: 'Album',
      required: true,
      index: true,
    },
    inviterId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    recipientEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
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
    role: {
      type: String,
      enum: ['OWNER', 'EDITOR', 'VIEWER'],
      default: 'VIEWER',
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'REVOKED'],
      default: 'PENDING',
      index: true,
    },
    acceptedAt: {
      type: Date,
    },
    declinedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

AlbumInvitationSchema.index({ albumId: 1, recipientEmail: 1, status: 1 });

export const AlbumInvitationModel = mongoose.model<IAlbumInvitation>(
  'AlbumInvitation',
  AlbumInvitationSchema
);
