import mongoose, { Schema, Model, Types } from 'mongoose';

export interface ImageDocument {
  _id: Types.ObjectId;
  filename: string;
  s3Key: string;
  url: string;
  altText: string;
  sizeBytes: number;
  mimeType: string;
  createdAt: Date;
  updatedAt: Date;
}

const ImageSchema = new Schema<ImageDocument>(
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
    altText: {
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

ImageSchema.index({ createdAt: -1 });

export const Image: Model<ImageDocument> =
  (mongoose.models.Image as Model<ImageDocument>) ||
  mongoose.model<ImageDocument>('Image', ImageSchema);

export default Image;
