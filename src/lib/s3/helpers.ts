import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { getS3Client, getS3BucketName, getS3PublicUrl } from './client';

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_').toLowerCase();
}

export async function uploadToS3(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<{ s3Key: string; url: string }> {
  const sanitized = sanitizeFilename(filename);
  const s3Key = `images/${randomUUID()}-${sanitized}`;
  const bucket = getS3BucketName();
  const region = process.env.AWS_REGION || 'us-east-1';

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: s3Key,
      Body: buffer,
      ContentType: mimeType,
    })
  );

  const url = getS3PublicUrl(bucket, region, s3Key);
  return { s3Key, url };
}

export async function deleteFromS3(s3Key: string): Promise<void> {
  try {
    await getS3Client().send(
      new DeleteObjectCommand({
        Bucket: getS3BucketName(),
        Key: s3Key,
      })
    );
  } catch (error) {
    console.error('Failed to delete S3 object:', s3Key, error);
  }
}
