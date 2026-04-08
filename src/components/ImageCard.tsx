'use client';

import { useState } from 'react';
import { Copy, Pencil, ExternalLink, Trash2, Check } from 'lucide-react';
import type { IImage } from '@/types/image';

interface ImageCardProps {
  image: IImage;
  variant?: 'card' | 'row';
  onAltTextSaved: (image: IImage) => void;
  onDeleted: (id: string) => void;
  onSelect?: () => void;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ImageCard({ image, variant = 'card', onAltTextSaved, onDeleted, onSelect }: ImageCardProps) {
  const [editingAlt, setEditingAlt] = useState(false);
  const [altValue, setAltValue] = useState(image.altText);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleCopyUrl() {
    await navigator.clipboard.writeText(image.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSaveAlt() {
    setSaving(true);
    try {
      const res = await fetch(`/api/images/${image._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ altText: altValue }),
      });
      if (res.ok) {
        const data = await res.json();
        onAltTextSaved(data.image);
        setEditingAlt(false);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${image.filename}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/images/${image._id}`, { method: 'DELETE' });
      if (res.ok) {
        onDeleted(image._id);
      }
    } finally {
      setDeleting(false);
    }
  }

  const actions = (
    <>
      <button
        onClick={handleCopyUrl}
        title="Copy URL"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '6px',
          borderRadius: '4px',
          border: 'none',
          background: copied ? 'var(--color-success-background, #d1fae5)' : 'transparent',
          color: copied ? 'var(--color-success, #065f46)' : 'var(--color-foreground-secondary)',
          cursor: 'pointer',
        }}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>

      <button
        onClick={() => { setEditingAlt(true); setAltValue(image.altText); }}
        title="Edit alt text"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '6px',
          borderRadius: '4px',
          border: 'none',
          background: 'transparent',
          color: 'var(--color-foreground-secondary)',
          cursor: 'pointer',
        }}
      >
        <Pencil size={14} />
      </button>

      <a
        href={image.url}
        target="_blank"
        rel="noopener noreferrer"
        title="Open in new tab"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '6px',
          borderRadius: '4px',
          color: 'var(--color-foreground-secondary)',
          textDecoration: 'none',
        }}
      >
        <ExternalLink size={14} />
      </a>

      <button
        onClick={handleDelete}
        disabled={deleting}
        title="Delete"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '6px',
          borderRadius: '4px',
          border: 'none',
          background: 'transparent',
          color: deleting ? 'var(--color-foreground-muted)' : 'var(--color-error, #dc2626)',
          cursor: deleting ? 'not-allowed' : 'pointer',
        }}
      >
        <Trash2 size={14} />
      </button>
    </>
  );

  const altEditor = (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
      <input
        value={altValue}
        onChange={(e) => setAltValue(e.target.value)}
        placeholder="Alt text"
        style={{
          flex: 1,
          fontSize: '12px',
          padding: '3px 6px',
          border: '1px solid var(--color-border)',
          borderRadius: '4px',
          background: 'var(--color-background)',
          color: 'var(--color-foreground)',
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSaveAlt();
          if (e.key === 'Escape') { setEditingAlt(false); setAltValue(image.altText); }
        }}
        autoFocus
      />
      <button
        onClick={handleSaveAlt}
        disabled={saving}
        style={{
          fontSize: '11px',
          padding: '3px 8px',
          borderRadius: '4px',
          background: 'var(--color-primary)',
          color: 'var(--color-primary-foreground)',
          border: 'none',
          cursor: saving ? 'not-allowed' : 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        {saving ? '…' : 'Save'}
      </button>
      <button
        onClick={() => { setEditingAlt(false); setAltValue(image.altText); }}
        style={{
          fontSize: '11px',
          padding: '3px 6px',
          borderRadius: '4px',
          background: 'transparent',
          color: 'var(--color-foreground-secondary)',
          border: '1px solid var(--color-border)',
          cursor: 'pointer',
        }}
      >
        ✕
      </button>
    </div>
  );

  // ── Row variant (table row) ──────────────────────────────────────────────
  if (variant === 'row') {
    return (
      <tr
        style={{
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
        }}
      >
        {/* Thumbnail */}
        <td style={{ padding: '8px 12px', width: '56px' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.url}
            alt={image.altText || image.filename}
            onClick={onSelect}
            style={{
              width: '40px',
              height: '40px',
              objectFit: 'contain',
              borderRadius: '4px',
              background: 'var(--color-background)',
              cursor: onSelect ? 'pointer' : 'default',
              display: 'block',
            }}
          />
        </td>

        {/* Filename + alt text */}
        <td style={{ padding: '8px 12px' }}>
          {editingAlt ? (
            altEditor
          ) : (
            <>
              <p
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'var(--color-foreground)',
                  margin: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '320px',
                }}
                title={image.filename}
              >
                {image.filename}
              </p>
              {image.altText && (
                <p
                  style={{
                    fontSize: '11px',
                    color: 'var(--color-foreground-muted)',
                    margin: '2px 0 0',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '320px',
                  }}
                  title={image.altText}
                >
                  {image.altText}
                </p>
              )}
            </>
          )}
        </td>

        {/* File size */}
        <td
          style={{
            padding: '8px 12px',
            fontSize: '13px',
            color: 'var(--color-foreground-secondary)',
            whiteSpace: 'nowrap',
          }}
        >
          {formatBytes(image.sizeBytes)}
        </td>

        {/* Actions */}
        <td style={{ padding: '8px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            {actions}
          </div>
        </td>
      </tr>
    );
  }

  // ── Card variant (default) ───────────────────────────────────────────────
  return (
    <div
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        overflow: 'hidden',
        background: 'var(--color-surface)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Thumbnail */}
      <div
        style={{
          height: '160px',
          background: 'var(--color-background)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          cursor: onSelect ? 'pointer' : 'default',
        }}
        onClick={onSelect}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.url}
          alt={image.altText || image.filename}
          style={{ maxWidth: '100%', maxHeight: '160px', objectFit: 'contain' }}
        />
      </div>

      {/* Details */}
      <div style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <p
          style={{
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--color-foreground)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={image.filename}
        >
          {image.filename}
        </p>
        <p style={{ fontSize: '12px', color: 'var(--color-foreground-muted)' }}>
          {formatBytes(image.sizeBytes)}
        </p>

        {/* Alt text */}
        {editingAlt ? (
          altEditor
        ) : (
          <p
            style={{
              fontSize: '12px',
              color: 'var(--color-foreground-secondary)',
              fontStyle: image.altText ? 'normal' : 'italic',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={image.altText || 'No alt text'}
          >
            {image.altText || 'No alt text'}
          </p>
        )}
      </div>

      {/* Actions */}
      <div
        style={{
          display: 'flex',
          borderTop: '1px solid var(--color-border)',
          padding: '8px',
          gap: '4px',
        }}
      >
        {actions}
      </div>
    </div>
  );
}
