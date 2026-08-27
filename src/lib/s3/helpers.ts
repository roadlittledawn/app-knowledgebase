import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { getS3Client, getS3BucketName, getS3PublicUrl } from './client';
import { mdxToMarkdown } from '@/lib/mdx/mdx-to-markdown';

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

export async function uploadFileToS3(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<{ s3Key: string; url: string }> {
  const sanitized = sanitizeFilename(filename);
  const s3Key = `files/${randomUUID()}-${sanitized}`;
  const bucket = getS3BucketName();
  const region = process.env.AWS_REGION || 'us-east-1';

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: s3Key,
      Body: buffer,
      ContentType: mimeType,
      ContentDisposition: `inline; filename="${sanitized}"`,
    })
  );

  const url = getS3PublicUrl(bucket, region, s3Key);
  return { s3Key, url };
}

export async function overwriteFileInS3(
  s3Key: string,
  buffer: Buffer,
  mimeType: string
): Promise<void> {
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: getS3BucketName(),
      Key: s3Key,
      Body: buffer,
      ContentType: mimeType,
      ContentDisposition: `inline`,
    })
  );
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

function markdownKey(slug: string): string {
  return `markdown/${slug}.md`;
}

export function composeEntryMarkdown(title: string, body: string): string {
  return `# ${title}\n\n${mdxToMarkdown(body)}\n`;
}

export async function uploadMarkdownToS3(slug: string, markdown: string): Promise<void> {
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: getS3BucketName(),
      Key: markdownKey(slug),
      Body: markdown,
      ContentType: 'text/markdown; charset=utf-8',
    })
  );
}

/**
 * Unlike deleteFromS3, this does not swallow errors: callers (the entry
 * publish/unpublish sync logic) need to know if a delete failed so a
 * previously-public Markdown snapshot doesn't silently stay accessible.
 */
export async function deleteMarkdownFromS3(slug: string): Promise<void> {
  await getS3Client().send(
    new DeleteObjectCommand({
      Bucket: getS3BucketName(),
      Key: markdownKey(slug),
    })
  );
}
