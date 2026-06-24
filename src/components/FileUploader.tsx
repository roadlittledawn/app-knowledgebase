'use client';

import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import type { IFileAttachment } from '@/types/file-attachment';

const MAX_SIZE = 50 * 1024 * 1024; // 50MB

interface FileUploaderProps {
  onUploadComplete: (file: IFileAttachment) => void;
}

export function FileUploader({ onUploadComplete }: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    if (file.size > MAX_SIZE) {
      setError('File size must not exceed 50MB.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/files', { method: 'POST', body: formData });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Upload failed.');
        return;
      }
      const data = await res.json();
      onUploadComplete(data.file);
      if (inputRef.current) inputRef.current.value = '';
    } catch {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div
        style={{
          border: '2px dashed var(--color-border)',
          borderRadius: '8px',
          padding: '24px',
          textAlign: 'center',
          background: 'var(--color-surface)',
        }}
      >
        <Upload
          size={24}
          style={{ margin: '0 auto 8px', color: 'var(--color-foreground-muted)' }}
        />
        <p style={{ fontSize: '14px', color: 'var(--color-foreground-secondary)', marginBottom: '12px' }}>
          {uploading ? 'Uploading…' : 'Select a file to upload (max 50MB)'}
        </p>
        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: '6px',
            background: 'var(--color-primary)',
            color: 'var(--color-primary-foreground)',
            fontSize: '14px',
            fontWeight: 500,
            cursor: uploading ? 'not-allowed' : 'pointer',
            opacity: uploading ? 0.6 : 1,
          }}
        >
          <Upload size={14} />
          {uploading ? 'Uploading…' : 'Choose File'}
          <input
            ref={inputRef}
            type="file"
            style={{ display: 'none' }}
            onChange={handleFileChange}
            disabled={uploading}
          />
        </label>
      </div>
      {error && (
        <p
          style={{
            marginTop: '8px',
            fontSize: '13px',
            color: 'var(--color-error, #dc2626)',
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
