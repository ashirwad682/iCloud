import mongoose, { Schema, Document } from 'mongoose';

export interface ISession extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  deviceId: string;
  deviceName: string;
  ipAddress: string;
  userAgent: string;
  browser: string;
  os: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  approximateLocation?: string;
  refreshTokenHash: string;
  isActive: boolean;
  lastActiveAt: Date;
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SessionSchema = new Schema<ISession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    deviceId: {
      type: String,
      required: true,
      index: true,
    },
    deviceName: {
      type: String,
      default: 'Unknown Device',
    },
    ipAddress: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
      required: true,
    },
    browser: {
      type: String,
      default: 'Browser',
    },
    os: {
      type: String,
      default: 'Operating System',
    },
    deviceType: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet', 'unknown'],
      default: 'unknown',
    },
    approximateLocation: {
      type: String,
      default: 'Local Network',
    },
    refreshTokenHash: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    revokedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast lookup of active user sessions
SessionSchema.index({ userId: 1, isActive: 1, lastActiveAt: -1 });

export const SessionModel = mongoose.model<ISession>('Session', SessionSchema);
