import mongoose, { Schema, Document } from 'mongoose';

export interface IUploadPart {
  partNumber: number;
  etag?: string;
  size: number;
  uploadedAt: Date;
}

export interface IUploadChunk {
  partNumber: number;
  dataBase64: string;
}

export interface IUploadSession extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  uploadId: string; // S3 Multipart Upload ID or internal session ID
  originalName: string;
  mimeType: string;
  size: number;
  checksum?: string;
  storageKey: string;
  totalParts: number;
  uploadedParts: IUploadPart[];
  chunks?: IUploadChunk[];
  albumId?: string;
  isHidden?: boolean;
  status: 'INITIATED' | 'UPLOADING' | 'COMPLETED' | 'ABORTED';
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}


const UploadSessionSchema = new Schema<IUploadSession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    uploadId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    checksum: {
      type: String,
    },
    storageKey: {
      type: String,
      required: true,
    },
    totalParts: {
      type: Number,
      default: 1,
    },
    albumId: {
      type: String,
    },
    isHidden: {
      type: Boolean,
      default: false,
    },
    chunks: [
      {
        partNumber: Number,
        dataBase64: String,
      },
    ],
    uploadedParts: [
      {
        partNumber: Number,
        etag: String,
        size: Number,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    status: {
      type: String,
      enum: ['INITIATED', 'UPLOADING', 'COMPLETED', 'ABORTED'],
      default: 'INITIATED',
      index: true,
    },

    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-cleanup expired upload sessions via TTL index
UploadSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const UploadSessionModel = mongoose.model<IUploadSession>(
  'UploadSession',
  UploadSessionSchema
);
