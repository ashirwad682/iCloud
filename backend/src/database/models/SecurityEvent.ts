import mongoose, { Schema, Document } from 'mongoose';

export interface ISecurityEvent extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  action: string;
  ipAddress: string;
  userAgent: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  location?: string;
  result: 'SUCCESS' | 'FAILURE' | 'WARNING';
  details?: string;
  resourceId?: string;
  timestamp: Date;
}

const SecurityEventSchema = new Schema<ISecurityEvent>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    ipAddress: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
      required: true,
    },
    deviceType: String,
    browser: String,
    os: String,
    location: String,
    result: {
      type: String,
      enum: ['SUCCESS', 'FAILURE', 'WARNING'],
      default: 'SUCCESS',
      index: true,
    },
    details: String,
    resourceId: String,
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);

SecurityEventSchema.index({ userId: 1, timestamp: -1 });

export const SecurityEventModel = mongoose.model<ISecurityEvent>(
  'SecurityEvent',
  SecurityEventSchema
);
