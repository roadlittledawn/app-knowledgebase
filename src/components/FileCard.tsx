'use client';

import { useState, useRef } from 'react';
import { Copy, Pencil, ExternalLink, Trash2, Check, RefreshCw, FileText } from 'lucide-react';
import type { IFileAttachment } from '@/types/file-attachment';
import { formatBytes } from '@/lib/utils';

interface FileCardProps {
  file: IFileAttachment;
  variant?: 'card' | 'row';
  onDescriptionSaved: (file: IFileAttachment) => void;
  onDeleted: (id: string) => void;
  onReplaced?: (file: IFileAttachment) => void;
  onSelect?: () => void;
}

export function FileCard({ file, variant = 'card', onDescriptionSaved, onDeleted, onReplaced, onSelect }: FileCardProps) {
  const [editingDesc, setEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState(file.description);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [copied, setCopied] = useState(false);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  async function handleCopyUrl() {
    await navigator.clipboard.writeText(file.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSaveDesc() {
    setSaving(true);
    try {
      const res = await fetch(`/api/files/${file._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: descValue }),
      });
      if (res.ok) {
        const data = await res.json();
        onDescriptionSaved(data.file);
        setEditingDesc(false);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleReplace(e: React.ChangeEvent<HTMLInputElement>) {
    const newFile = e.target.files?.[0];
    if (!newFile) return;

    if (newFile.name !== file.filename) {
      alert(`Replacement file must have the same name: "${file.filename}"`);
      if (replaceInputRef.current) replaceInputRef.current.value = '';
      return;
    }

    setReplacing(true);
    try {
      const formData = new FormData();
      formData.append('file', newFile);

      const res = await fetch(`/api/files/${file._id}`, { method: 'PUT', body: formData });
      if (res.ok) {
        const data = await res.json();
        onReplaced?.(data.file);
      }
    } finally {
      setReplacing(false);
      if (replaceInputRef.current) replaceInputRef.current.value = '';
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${file.filename}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/files/${file._id}`, { method: 'DELETE' });
      if (res.ok) {
        onDeleted(file._id);
      }
    } finally {
      setDeleting(false);
    }
  }

  function getFileExtension(): string {
    const parts = file.filename.split('.');
    if (parts.length <= 1) return '';
    return (parts.pop() ?? '').toUpperCase();
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
        onClick={() => { setEditingDesc(true); setDescValue(file.description); }}
        title="Edit description"
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

      <button
        onClick={() => replaceInputRef.current?.click()}
        disabled={replacing}
        title="Replace file"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '6px',
          borderRadius: '4px',
          border: 'none',
          background: 'transparent',
          color: replacing ? 'var(--color-foreground-muted)' : 'var(--color-foreground-secondary)',
          cursor: replacing ? 'not-allowed' : 'pointer',
        }}
      >
        <RefreshCw size={14} />
      </button>
      <input
        ref={replaceInputRef}
        type="file"
        style={{ display: 'none' }}
        onChange={handleReplace}
      />

      <a
        href={file.url}
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

  const descEditor = (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
      <input
        value={descValue}
        onChange={(e) => setDescValue(e.target.value)}
        placeholder="Description"
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
          if (e.key === 'Enter') handleSaveDesc();
          if (e.key === 'Escape') { setEditingDesc(false); setDescValue(file.description); }
        }}
        autoFocus
      />
      <button
        onClick={handleSaveDesc}
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
        onClick={() => { setEditingDesc(false); setDescValue(file.description); }}
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

  // Row variant
  if (variant === 'row') {
    return (
      <tr
        style={{
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
        }}
      >
        <td style={{ padding: '8px 12px', width: '56px' }}>
          <div
            onClick={onSelect}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '4px',
              background: 'var(--color-background)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: onSelect ? 'pointer' : 'default',
            }}
          >
            <FileText size={20} style={{ color: 'var(--color-foreground-muted)' }} />
          </div>
        </td>

        <td style={{ padding: '8px 12px' }}>
          {editingDesc ? (
            descEditor
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
                title={file.filename}
              >
                {file.filename}
              </p>
              {file.description && (
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
                  title={file.description}
                >
                  {file.description}
                </p>
              )}
            </>
          )}
        </td>

        <td
          style={{
            padding: '8px 12px',
            fontSize: '13px',
            color: 'var(--color-foreground-secondary)',
            whiteSpace: 'nowrap',
          }}
        >
          {getFileExtension()}
        </td>

        <td
          style={{
            padding: '8px 12px',
            fontSize: '13px',
            color: 'var(--color-foreground-secondary)',
            whiteSpace: 'nowrap',
          }}
        >
          {formatBytes(file.sizeBytes)}
        </td>

        <td
          style={{
            padding: '8px 12px',
            fontSize: '13px',
            color: 'var(--color-foreground-secondary)',
            whiteSpace: 'nowrap',
          }}
        >
          {new Date(file.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
        </td>

        <td style={{ padding: '8px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            {actions}
          </div>
        </td>
      </tr>
    );
  }

  // Card variant
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
      <div
        style={{
          height: '120px',
          background: 'var(--color-background)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '4px',
          overflow: 'hidden',
          cursor: onSelect ? 'pointer' : 'default',
        }}
        onClick={onSelect}
      >
        <FileText size={32} style={{ color: 'var(--color-foreground-muted)' }} />
        {getFileExtension() && (
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-foreground-muted)' }}>
            {getFileExtension()}
          </span>
        )}
      </div>

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
          title={file.filename}
        >
          {file.filename}
        </p>
        <p style={{ fontSize: '12px', color: 'var(--color-foreground-muted)' }}>
          {formatBytes(file.sizeBytes)}
        </p>

        {editingDesc ? (
          descEditor
        ) : (
          <p
            style={{
              fontSize: '12px',
              color: 'var(--color-foreground-secondary)',
              fontStyle: file.description ? 'normal' : 'italic',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={file.description || 'No description'}
          >
            {file.description || 'No description'}
          </p>
        )}
      </div>

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
