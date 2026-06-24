'use client';

import { useEffect, useState } from 'react';
import { X, ExternalLink, Download } from 'lucide-react';
import Link from 'next/link';
import type { IFileAttachment } from '@/types/file-attachment';
import { formatBytes } from '@/lib/utils';

interface ReferencingEntry {
  _id: string;
  slug: string;
  title: string;
}

interface FileDetailPanelProps {
  file: IFileAttachment | null;
  onClose: () => void;
}

export function FileDetailPanel({ file, onClose }: FileDetailPanelProps) {
  const [entries, setEntries] = useState<ReferencingEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [entriesError, setEntriesError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) return;

    let cancelled = false;

    async function fetchEntries() {
      setLoadingEntries(true);
      setEntriesError(null);
      try {
        const res = await fetch(`/api/files/${file!._id}/entries`);
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
  }, [file]);

  if (!file) return null;

  const isEmbeddable = file.mimeType === 'text/html' || file.mimeType === 'application/pdf';

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
            File Details
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
          {/* Metadata */}
          <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 12px', margin: 0 }}>
            <dt style={dtStyle}>Filename</dt>
            <dd style={ddStyle}>{file.filename}</dd>

            <dt style={dtStyle}>Description</dt>
            <dd style={ddStyle}>{file.description || <em>None</em>}</dd>

            <dt style={dtStyle}>Size</dt>
            <dd style={ddStyle}>{formatBytes(file.sizeBytes)}</dd>

            <dt style={dtStyle}>Type</dt>
            <dd style={ddStyle}>{file.mimeType}</dd>

            <dt style={dtStyle}>Uploaded</dt>
            <dd style={ddStyle}>{new Date(file.createdAt).toLocaleDateString()}</dd>

            <dt style={dtStyle}>Embeddable</dt>
            <dd style={ddStyle}>{isEmbeddable ? 'Yes (iframe)' : 'No (download only)'}</dd>
          </dl>

          {/* Action links */}
          <div style={{ display: 'flex', gap: '16px' }}>
            <a
              href={file.url}
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
            <a
              href={file.url}
              download={file.filename}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                color: 'var(--color-primary)',
                textDecoration: 'none',
              }}
            >
              <Download size={14} />
              Download
            </a>
          </div>

          {/* Usage snippets */}
          <div>
            <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-foreground-muted)', marginBottom: '8px' }}>
              MDX Usage
            </p>
            {isEmbeddable && (
              <div style={{ marginBottom: '8px' }}>
                <p style={{ fontSize: '11px', color: 'var(--color-foreground-muted)', marginBottom: '4px' }}>
                  Embed (iframe):
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
                  {`<iframe src="${file.url}" width="100%" height="500" sandbox="allow-scripts" />`}
                </code>
              </div>
            )}
            <div>
              <p style={{ fontSize: '11px', color: 'var(--color-foreground-muted)', marginBottom: '4px' }}>
                Download link:
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
                {`[${file.filename}](${file.url})`}
              </code>
            </div>
          </div>

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
              {file.url}
            </code>
          </div>

          {/* Referencing entries */}
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-foreground)', marginBottom: '8px' }}>
              Entries referencing this file
            </h3>
            {loadingEntries && (
              <p style={{ fontSize: '13px', color: 'var(--color-foreground-muted)' }}>Scanning…</p>
            )}
            {entriesError && (
              <p style={{ fontSize: '13px', color: 'var(--color-error, #dc2626)' }}>{entriesError}</p>
            )}
            {!loadingEntries && !entriesError && entries.length === 0 && (
              <p style={{ fontSize: '13px', color: 'var(--color-foreground-muted)', fontStyle: 'italic' }}>
                No entries reference this file.
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
