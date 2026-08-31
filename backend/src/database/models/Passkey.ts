import mongoose, { Schema, Document } from 'mongoose';

export interface IPasskey extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  credentialId: string;
  publicKey: string;
  counter: number;
  transports?: string[];
  deviceName: string;
  createdAt: Date;
  lastUsedAt?: Date;
}

const PasskeySchema = new Schema<IPasskey>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    credentialId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    publicKey: {
      type: String,
      required: true,
    },
    counter: {
      type: Number,
      default: 0,
    },
    transports: {
      type: [String],
      default: [],
    },
    deviceName: {
      type: String,
      default: 'Passkey Device',
    },
    lastUsedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const PasskeyModel = mongoose.model<IPasskey>('Passkey', PasskeySchema);
