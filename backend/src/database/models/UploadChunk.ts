import mongoose, { Schema, Document } from 'mongoose';

export interface IUploadChunkDoc extends Document {
  uploadId: string;
  userId: mongoose.Types.ObjectId;
  partNumber: number;
  totalParts: number;
  dataBase64: string;
  createdAt: Date;
}

const UploadChunkSchema = new Schema<IUploadChunkDoc>(
  {
    uploadId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    partNumber: {
      type: Number,
      required: true,
    },
    totalParts: {
      type: Number,
      required: true,
    },
    dataBase64: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 86400, // Auto-cleanup orphan chunks after 24 hours
    },
  },
  {
    timestamps: true,
  }
);

UploadChunkSchema.index({ uploadId: 1, partNumber: 1 }, { unique: true });

export const UploadChunkModel = mongoose.model<IUploadChunkDoc>(
  'UploadChunk',
  UploadChunkSchema
);
