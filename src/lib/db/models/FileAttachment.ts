import mongoose, { Schema, Model, Types } from 'mongoose';

export interface FileAttachmentDocument {
  _id: Types.ObjectId;
  filename: string;
  s3Key: string;
  url: string;
  description: string;
  sizeBytes: number;
  mimeType: string;
  createdAt: Date;
  updatedAt: Date;
}

const FileAttachmentSchema = new Schema<FileAttachmentDocument>(
  {
    filename: {
      type: String,
      required: [true, 'Filename is required'],
      trim: true,
    },
    s3Key: {
      type: String,
      required: [true, 'S3 key is required'],
      unique: true,
      index: true,
    },
    url: {
      type: String,
      required: [true, 'URL is required'],
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    sizeBytes: {
      type: Number,
      required: [true, 'File size is required'],
    },
    mimeType: {
      type: String,
      required: [true, 'MIME type is required'],
    },
  },
  {
    timestamps: true,
  }
);

FileAttachmentSchema.index({ createdAt: -1 });

export const FileAttachment: Model<FileAttachmentDocument> =
  (mongoose.models.FileAttachment as Model<FileAttachmentDocument>) ||
  mongoose.model<FileAttachmentDocument>('FileAttachment', FileAttachmentSchema);

export default FileAttachment;
