import mongoose, { Schema, Document } from 'mongoose';
import { config } from '../../config/env.config';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatarUrl?: string;
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  
  // 2FA
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  twoFactorRecoveryCodes: string[]; // Hashed recovery codes
  
  // Roles & Permissions
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  
  // Storage Quota
  storageQuotaBytes: number;
  storageUsedBytes: number;
  
  // Privacy & Preferences
  aiFeaturesEnabled: boolean;
  faceGroupingEnabled: boolean;
  locationMetadataEnabled: boolean;
  themePreference: 'light' | 'dark' | 'system';
  
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    avatarUrl: {
      type: String,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
    },
    passwordResetToken: {
      type: String,
    },
    passwordResetExpires: {
      type: Date,
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
      index: true,
    },
    twoFactorSecret: {
      type: String,
    },
    twoFactorRecoveryCodes: {
      type: [String],
      default: [],
    },
    role: {
      type: String,
      enum: ['USER', 'ADMIN', 'SUPER_ADMIN'],
      default: 'USER',
      index: true,
    },
    storageQuotaBytes: {
      type: Number,
      default: config.DEFAULT_STORAGE_QUOTA_BYTES,
    },
    storageUsedBytes: {
      type: Number,
      default: 0,
    },
    aiFeaturesEnabled: {
      type: Boolean,
      default: true,
    },
    faceGroupingEnabled: {
      type: Boolean,
      default: false,
    },
    locationMetadataEnabled: {
      type: Boolean,
      default: true,
    },
    themePreference: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'dark',
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: any) {
        delete ret.passwordHash;
        delete ret.twoFactorSecret;
        delete ret.twoFactorRecoveryCodes;
        delete ret.emailVerificationToken;
        delete ret.passwordResetToken;
        delete ret.passwordResetExpires;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const UserModel = mongoose.model<IUser>('User', UserSchema);
