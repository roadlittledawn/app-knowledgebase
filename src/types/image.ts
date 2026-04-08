export interface IImage {
  _id: string;
  filename: string;
  s3Key: string;
  url: string;
  altText: string;
  sizeBytes: number;
  mimeType: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateImageInput {
  filename: string;
  s3Key: string;
  url: string;
  altText: string;
  sizeBytes: number;
  mimeType: string;
}

export interface UpdateImageInput {
  altText?: string;
}
