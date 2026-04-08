'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Search, LayoutGrid, List } from 'lucide-react';
import { ImageCard } from './ImageCard';
import type { IImage } from '@/types/image';

interface ImageGalleryProps {
  refreshTrigger?: number;
  onSelectImage?: (image: IImage) => void;
}

type ViewMode = 'grid' | 'list';

export function ImageGallery({ refreshTrigger, onSelectImage }: ImageGalleryProps) {
  const [images, setImages] = useState<IImage[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>('grid');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchImages = useCallback(async (searchValue: string, pageNum: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(pageNum), limit: '20' });
      if (searchValue.trim()) params.set('search', searchValue.trim());
      const res = await fetch(`/api/images?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch images');
      const data = await res.json();
      setImages(data.images);
      setTotal(data.total);
      setPages(data.pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading images');
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchImages(search, 1);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, fetchImages]);

  // Re-fetch on page change or refresh trigger
  useEffect(() => {
    fetchImages(search, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, refreshTrigger]);

  function handleAltTextSaved(updated: IImage) {
    setImages((prev) => prev.map((img) => (img._id === updated._id ? updated : img)));
  }

  function handleDeleted(id: string) {
    setImages((prev) => prev.filter((img) => img._id !== id));
    setTotal((prev) => prev - 1);
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
      {/* Toolbar: search + view toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Search */}
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

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* View toggle */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {viewToggleBtn('grid', LayoutGrid)}
          {viewToggleBtn('list', List)}
        </div>
      </div>

      {/* Status */}
      {!loading && !error && (
        <p style={{ fontSize: '13px', color: 'var(--color-foreground-muted)' }}>
          {total === 0 ? 'No images found.' : `${total} image${total !== 1 ? 's' : ''}`}
        </p>
      )}

      {loading && (
        <p style={{ fontSize: '13px', color: 'var(--color-foreground-muted)' }}>Loading…</p>
      )}

      {error && (
        <p style={{ fontSize: '13px', color: 'var(--color-error, #dc2626)' }}>{error}</p>
      )}

      {/* Grid view */}
      {!loading && images.length > 0 && view === 'grid' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '16px',
          }}
        >
          {images.map((image) => (
            <ImageCard
              key={image._id}
              image={image}
              onAltTextSaved={handleAltTextSaved}
              onDeleted={handleDeleted}
              onSelect={onSelectImage ? () => onSelectImage(image) : undefined}
            />
          ))}
        </div>
      )}

      {/* List view */}
      {!loading && images.length > 0 && view === 'list' && (
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
                <th style={{ ...thStyle, textAlign: 'left' }}>Size</th>
                <th style={{ ...thStyle, textAlign: 'left' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {images.map((image) => (
                <ImageCard
                  key={image._id}
                  image={image}
                  variant="row"
                  onAltTextSaved={handleAltTextSaved}
                  onDeleted={handleDeleted}
                  onSelect={onSelectImage ? () => onSelectImage(image) : undefined}
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
