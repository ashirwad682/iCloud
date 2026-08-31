import mongoose, { Schema, Document } from 'mongoose';

export interface IShareAccessLog extends Document {
  _id: mongoose.Types.ObjectId;
  shareId: mongoose.Types.ObjectId;
  action: 'VIEW' | 'DOWNLOAD' | 'PASSWORD_ATTEMPT' | 'ZIP_ARCHIVE';
  mediaId?: mongoose.Types.ObjectId;
  authenticatedUserId?: mongoose.Types.ObjectId;
  ipAddress?: string;
  userAgent?: string;
  isSuccessful: boolean;
  timestamp: Date;
}

const ShareAccessLogSchema = new Schema<IShareAccessLog>(
  {
    shareId: {
      type: Schema.Types.ObjectId,
      ref: 'Share',
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: ['VIEW', 'DOWNLOAD', 'PASSWORD_ATTEMPT', 'ZIP_ARCHIVE'],
      required: true,
    },
    mediaId: {
      type: Schema.Types.ObjectId,
      ref: 'Media',
    },
    authenticatedUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    isSuccessful: {
      type: Boolean,
      default: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      expires: 60 * 60 * 24 * 90, // Auto-purge privacy log after 90 days
    },
  },
  {
    timestamps: false,
  }
);

ShareAccessLogSchema.index({ shareId: 1, timestamp: -1 });

export const ShareAccessLogModel = mongoose.model<IShareAccessLog>(
  'ShareAccessLog',
  ShareAccessLogSchema
);
