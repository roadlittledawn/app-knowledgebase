'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Search, LayoutGrid, List } from 'lucide-react';
import { FileCard } from './FileCard';
import type { IFileAttachment } from '@/types/file-attachment';

interface FileGalleryProps {
  refreshTrigger?: number;
  onSelectFile?: (file: IFileAttachment) => void;
}

type ViewMode = 'grid' | 'list';

export function FileGallery({ refreshTrigger, onSelectFile }: FileGalleryProps) {
  const [files, setFiles] = useState<IFileAttachment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>('list');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchFiles = useCallback(async (searchValue: string, pageNum: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(pageNum), limit: '20' });
      if (searchValue.trim()) params.set('search', searchValue.trim());
      const res = await fetch(`/api/files?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch files');
      const data = await res.json();
      setFiles(data.files);
      setTotal(data.total);
      setPages(data.pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading files');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchFiles(search, 1);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, fetchFiles]);

  useEffect(() => {
    fetchFiles(search, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, refreshTrigger]);

  function handleDescriptionSaved(updated: IFileAttachment) {
    setFiles((prev) => prev.map((f) => (f._id === updated._id ? updated : f)));
  }

  function handleDeleted(id: string) {
    setFiles((prev) => prev.filter((f) => f._id !== id));
    setTotal((prev) => prev - 1);
  }

  function handleReplaced(updated: IFileAttachment) {
    setFiles((prev) => prev.map((f) => (f._id === updated._id ? updated : f)));
  }

  const viewToggleBtn = (mode: ViewMode, Icon: typeof LayoutGrid) => (
    <button
      onClick={() => setView(mode)}
      title={mode === 'grid' ? 'Grid view' : 'List view'}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '7px',
        borderRadius: '6px',
        border: '1px solid var(--color-border)',
        background: view === mode ? 'var(--color-surface-hover)' : 'var(--color-surface)',
        color: view === mode ? 'var(--color-foreground)' : 'var(--color-foreground-secondary)',
        cursor: 'pointer',
      }}
    >
      <Icon size={16} />
    </button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ position: 'relative', flex: '0 1 360px' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-foreground-muted)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            placeholder="Search by filename…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              paddingLeft: '32px',
              paddingRight: '12px',
              paddingTop: '8px',
              paddingBottom: '8px',
              fontSize: '14px',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              background: 'var(--color-surface)',
              color: 'var(--color-foreground)',
            }}
          />
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', gap: '4px' }}>
          {viewToggleBtn('grid', LayoutGrid)}
          {viewToggleBtn('list', List)}
        </div>
      </div>

      {/* Status */}
      {!loading && !error && (
        <p style={{ fontSize: '13px', color: 'var(--color-foreground-muted)' }}>
          {total === 0 ? 'No files found.' : `${total} file${total !== 1 ? 's' : ''}`}
        </p>
      )}

      {loading && (
        <p style={{ fontSize: '13px', color: 'var(--color-foreground-muted)' }}>Loading…</p>
      )}

      {error && (
        <p style={{ fontSize: '13px', color: 'var(--color-error, #dc2626)' }}>{error}</p>
      )}

      {/* Grid view */}
      {!loading && files.length > 0 && view === 'grid' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '16px',
          }}
        >
          {files.map((file) => (
            <FileCard
              key={file._id}
              file={file}
              onDescriptionSaved={handleDescriptionSaved}
              onDeleted={handleDeleted}
              onReplaced={handleReplaced}
              onSelect={onSelectFile ? () => onSelectFile(file) : undefined}
            />
          ))}
        </div>
      )}

      {/* List view */}
      {!loading && files.length > 0 && view === 'list' && (
        <div
          style={{
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--color-background)' }}>
                <th style={thStyle} />
                <th style={{ ...thStyle, textAlign: 'left' }}>Filename</th>
                <th style={{ ...thStyle, textAlign: 'left' }}>Type</th>
                <th style={{ ...thStyle, textAlign: 'left' }}>Size</th>
                <th style={{ ...thStyle, textAlign: 'left' }}>Created</th>
                <th style={{ ...thStyle, textAlign: 'left' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <FileCard
                  key={file._id}
                  file={file}
                  variant="row"
                  onDescriptionSaved={handleDescriptionSaved}
                  onDeleted={handleDeleted}
                  onReplaced={handleReplaced}
                  onSelect={onSelectFile ? () => onSelectFile(file) : undefined}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            style={{
              padding: '6px 12px',
              fontSize: '13px',
              border: '1px solid var(--color-border)',
              borderRadius: '4px',
              background: 'var(--color-surface)',
              color: page <= 1 ? 'var(--color-foreground-muted)' : 'var(--color-foreground)',
              cursor: page <= 1 ? 'not-allowed' : 'pointer',
            }}
          >
            Previous
          </button>
          <span style={{ fontSize: '13px', color: 'var(--color-foreground-secondary)' }}>
            Page {page} of {pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page >= pages}
            style={{
              padding: '6px 12px',
              fontSize: '13px',
              border: '1px solid var(--color-border)',
              borderRadius: '4px',
              background: 'var(--color-surface)',
              color: page >= pages ? 'var(--color-foreground-muted)' : 'var(--color-foreground)',
              cursor: page >= pages ? 'not-allowed' : 'pointer',
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '8px 12px',
  fontSize: '11px',
  fontWeight: 600,
  color: 'var(--color-foreground-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  borderBottom: '1px solid var(--color-border)',
};
