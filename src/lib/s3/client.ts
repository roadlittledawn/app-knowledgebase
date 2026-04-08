import { S3Client } from '@aws-sdk/client-s3';

let client: S3Client | null = null;

export function getS3Client(): S3Client {
  if (!client) {
    client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }
  return client;
}

export function getS3BucketName(): string {
  const bucket = process.env.AWS_S3_BUCKET_NAME;
  if (!bucket) throw new Error('AWS_S3_BUCKET_NAME is not configured');
  return bucket;
}

export function getS3PublicUrl(bucket: string, region: string, s3Key: string): string {
  return `https://${bucket}.s3.${region}.amazonaws.com/${s3Key}`;
}

export function isS3Configured(): boolean {
  return !!(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_S3_BUCKET_NAME
  );
}
