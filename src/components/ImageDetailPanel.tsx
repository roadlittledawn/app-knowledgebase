'use client';

import { useEffect, useState } from 'react';
import { X, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import type { IImage } from '@/types/image';

interface ReferencingEntry {
  _id: string;
  slug: string;
  title: string;
}

interface ImageDetailPanelProps {
  image: IImage | null;
  onClose: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ImageDetailPanel({ image, onClose }: ImageDetailPanelProps) {
  const [entries, setEntries] = useState<ReferencingEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [entriesError, setEntriesError] = useState<string | null>(null);

  useEffect(() => {
    if (!image) return;

    let cancelled = false;

    async function fetchEntries() {
      setLoadingEntries(true);
      setEntriesError(null);
      try {
        const res = await fetch(`/api/images/${image!._id}/entries`);
        const data = await res.json();
        if (!cancelled) setEntries(data.entries || []);
      } catch {
        if (!cancelled) setEntriesError('Failed to load referencing entries');
      } finally {
        if (!cancelled) setLoadingEntries(false);
      }
    }

    fetchEntries();
    return () => { cancelled = true; };
  }, [image]);

  if (!image) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'flex-end',
      }}
    >
      {/* Backdrop */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.3)',
        }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '420px',
          height: '100vh',
          background: 'var(--color-surface)',
          borderLeft: '1px solid var(--color-border)',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-foreground)', margin: 0 }}>
            Image Details
          </h2>
          <button
            onClick={onClose}
            style={{
              padding: '4px',
              borderRadius: '4px',
              border: 'none',
              background: 'transparent',
              color: 'var(--color-foreground-secondary)',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Thumbnail */}
          <div
            style={{
              background: 'var(--color-background)',
              borderRadius: '6px',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.url}
              alt={image.altText || image.filename}
              style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain' }}
            />
          </div>

          {/* Metadata */}
          <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 12px', margin: 0 }}>
            <dt style={dtStyle}>Filename</dt>
            <dd style={ddStyle}>{image.filename}</dd>

            <dt style={dtStyle}>Alt text</dt>
            <dd style={ddStyle}>{image.altText || <em>None</em>}</dd>

            <dt style={dtStyle}>Size</dt>
            <dd style={ddStyle}>{formatBytes(image.sizeBytes)}</dd>

            <dt style={dtStyle}>Type</dt>
            <dd style={ddStyle}>{image.mimeType}</dd>

            <dt style={dtStyle}>Uploaded</dt>
            <dd style={ddStyle}>{new Date(image.createdAt).toLocaleDateString()}</dd>
          </dl>

          {/* View link */}
          <a
            href={image.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              color: 'var(--color-primary)',
              textDecoration: 'none',
            }}
          >
            <ExternalLink size={14} />
            Open in new tab
          </a>

          {/* URL */}
          <div>
            <p style={{ fontSize: '12px', color: 'var(--color-foreground-muted)', marginBottom: '4px' }}>
              S3 URL
            </p>
            <code
              style={{
                display: 'block',
                fontSize: '11px',
                padding: '8px',
                background: 'var(--color-background)',
                borderRadius: '4px',
                wordBreak: 'break-all',
                color: 'var(--color-foreground-secondary)',
              }}
            >
              {image.url}
            </code>
          </div>

          {/* Referencing entries */}
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-foreground)', marginBottom: '8px' }}>
              Entries referencing this image
            </h3>
            {loadingEntries && (
              <p style={{ fontSize: '13px', color: 'var(--color-foreground-muted)' }}>Scanning…</p>
            )}
            {entriesError && (
              <p style={{ fontSize: '13px', color: 'var(--color-error, #dc2626)' }}>{entriesError}</p>
            )}
            {!loadingEntries && !entriesError && entries.length === 0 && (
              <p style={{ fontSize: '13px', color: 'var(--color-foreground-muted)', fontStyle: 'italic' }}>
                No entries reference this image.
              </p>
            )}
            {!loadingEntries && entries.length > 0 && (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {entries.map((entry) => (
                  <li key={entry._id}>
                    <Link
                      href={`/entries/${entry.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: '13px',
                        color: 'var(--color-primary)',
                        textDecoration: 'none',
                      }}
                    >
                      {entry.title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const dtStyle: React.CSSProperties = {
  fontSize: '12px',
  color: 'var(--color-foreground-muted)',
  alignSelf: 'start',
  paddingTop: '2px',
};

const ddStyle: React.CSSProperties = {
  fontSize: '13px',
  color: 'var(--color-foreground)',
  margin: 0,
  wordBreak: 'break-word',
};
