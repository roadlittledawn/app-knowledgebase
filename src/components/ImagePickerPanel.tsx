'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, Search, Copy, FileImage, Check } from 'lucide-react';
import type { IImage } from '@/types/image';
import { formatBytes } from '@/lib/utils';

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export function ImagePickerPanel() {
  // Upload state
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [lastUploaded, setLastUploaded] = useState<IImage | null>(null);

  // Search state
  const [search, setSearch] = useState('');
  const [images, setImages] = useState<IImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Copy state
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [copiedMarkdown, setCopiedMarkdown] = useState<string | null>(null);

  // Upload functionality
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    if (!file.type.startsWith('image/')) {
      setUploadError('Only image files are allowed.');
      return;
    }
    if (file.size > MAX_SIZE) {
      setUploadError('File size must not exceed 10MB.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/images', { method: 'POST', body: formData });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setUploadError(data.error || 'Upload failed.');
        return;
      }
      const data = await res.json();
      setLastUploaded(data.image);
      // Reset input
      if (inputRef.current) inputRef.current.value = '';
    } catch {
      setUploadError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  // Search functionality with debouncing
  const fetchImages = useCallback(async (searchValue: string) => {
    if (!searchValue.trim()) {
      setImages([]);
      return;
    }

    setLoading(true);
    setSearchError(null);
    try {
      const params = new URLSearchParams({ 
        search: searchValue.trim(),
        limit: '5' // Only show first 5 matches
      });
      const res = await fetch(`/api/images?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to search images');
      const data = await res.json();
      setImages(data.images);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Error searching images');
      setImages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchImages(search);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, fetchImages]);

  // Copy functionality
  async function handleCopyUrl(url: string) {
    await navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  }

  async function handleCopyMarkdown(image: IImage) {
    const markdown = `![${image.altText || image.filename}](${image.url})`;
    await navigator.clipboard.writeText(markdown);
    setCopiedMarkdown(image.url);
    setTimeout(() => setCopiedMarkdown(null), 2000);
  }


  return (
    <div className="p-4 space-y-4 h-full flex flex-col">
      {/* Upload Section */}
      <div>
        <h3 className="text-sm font-medium text-[var(--color-foreground)] mb-2">Upload Image</h3>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm border border-[var(--color-border)] rounded-md hover:bg-[var(--color-surface-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Upload className="w-4 h-4" />
          {uploading ? 'Uploading...' : 'Choose File'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          disabled={uploading}
        />
        {uploadError && (
          <p className="text-xs text-[var(--color-error)] mt-1">{uploadError}</p>
        )}
        
        {/* Show last uploaded image */}
        {lastUploaded && (
          <div className="mt-3 p-2 border border-[var(--color-border)] rounded-md bg-[var(--color-surface)]">
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={lastUploaded.url}
                  alt={lastUploaded.altText || lastUploaded.filename}
                  className="w-12 h-12 object-cover rounded border"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[var(--color-foreground)] truncate">
                  {lastUploaded.filename}
                </p>
                <p className="text-xs text-[var(--color-foreground-muted)] truncate font-mono bg-[var(--color-background)] px-1 rounded mt-1">
                  {lastUploaded.url}
                </p>
                <div className="flex gap-1 mt-2">
                  <button
                    onClick={() => handleCopyUrl(lastUploaded.url)}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-[var(--color-primary)] text-[var(--color-primary-foreground)] rounded hover:opacity-90"
                  >
                    {copiedUrl === lastUploaded.url ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    URL
                  </button>
                  <button
                    onClick={() => handleCopyMarkdown(lastUploaded)}
                    className="flex items-center gap-1 px-2 py-1 text-xs border border-[var(--color-border)] rounded hover:bg-[var(--color-surface-hover)]"
                  >
                    {copiedMarkdown === lastUploaded.url ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    Markdown
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Search Section */}
      <div className="flex-1 flex flex-col min-h-0">
        <h3 className="text-sm font-medium text-[var(--color-foreground)] mb-2">Find Existing Images</h3>
        
        {/* Search Input */}
        <div className="relative mb-3">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--color-foreground-muted)]" />
          <input
            type="text"
            placeholder="Search by filename..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm bg-[var(--color-background)] border border-[var(--color-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
        </div>

        {/* Search Results */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {loading && (
            <p className="text-xs text-[var(--color-foreground-muted)]">Searching...</p>
          )}
          
          {searchError && (
            <p className="text-xs text-[var(--color-error)]">{searchError}</p>
          )}
          
          {!loading && !searchError && search.trim() && images.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileImage className="w-8 h-8 text-[var(--color-foreground-muted)] mb-2" />
              <p className="text-xs text-[var(--color-foreground-muted)]">No images found</p>
            </div>
          )}
          
          {!loading && images.length > 0 && (
            <div className="space-y-2">
              {images.map((image) => (
                <div
                  key={image._id}
                  className="flex items-start gap-2 p-2 border border-[var(--color-border)] rounded-md bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)]"
                >
                  <div className="flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.url}
                      alt={image.altText || image.filename}
                      className="w-12 h-12 object-cover rounded border"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[var(--color-foreground)] truncate">
                      {image.filename}
                    </p>
                    <p className="text-xs text-[var(--color-foreground-muted)]">
                      {formatBytes(image.sizeBytes)}
                    </p>
                    <div className="flex gap-1 mt-2">
                      <button
                        onClick={() => handleCopyUrl(image.url)}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-[var(--color-primary)] text-[var(--color-primary-foreground)] rounded hover:opacity-90"
                      >
                        {copiedUrl === image.url ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        URL
                      </button>
                      <button
                        onClick={() => handleCopyMarkdown(image)}
                        className="flex items-center gap-1 px-2 py-1 text-xs border border-[var(--color-border)] rounded hover:bg-[var(--color-surface-hover)]"
                      >
                        {copiedMarkdown === image.url ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        Markdown
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}