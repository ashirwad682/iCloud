import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  title: string;
  message: string;
  type:
    | 'UPLOAD_SUCCESS'
    | 'UPLOAD_FAILED'
    | 'SECURITY_ALERT'
    | 'SHARE'
    | 'STORAGE_WARNING'
    | 'SYSTEM';
  isRead: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: [
        'UPLOAD_SUCCESS',
        'UPLOAD_FAILED',
        'SECURITY_ALERT',
        'SHARE',
        'STORAGE_WARNING',
        'SYSTEM',
      ],
      default: 'SYSTEM',
      index: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);

NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

export const NotificationModel = mongoose.model<INotification>(
  'Notification',
  NotificationSchema
);
