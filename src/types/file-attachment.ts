export interface IFileAttachment {
  _id: string;
  filename: string;
  s3Key: string;
  url: string;
  description: string;
  sizeBytes: number;
  mimeType: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFileAttachmentInput {
  filename: string;
  s3Key: string;
  url: string;
  description: string;
  sizeBytes: number;
  mimeType: string;
}

export interface UpdateFileAttachmentInput {
  description?: string;
}
