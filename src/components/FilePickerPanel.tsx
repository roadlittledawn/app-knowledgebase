'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, Search, Copy, FileText, Check, Code } from 'lucide-react';
import type { IFileAttachment } from '@/types/file-attachment';
import { formatBytes } from '@/lib/utils';

const MAX_SIZE = 50 * 1024 * 1024; // 50MB

export function FilePickerPanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [lastUploaded, setLastUploaded] = useState<IFileAttachment | null>(null);

  const [search, setSearch] = useState('');
  const [files, setFiles] = useState<IFileAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [copiedEmbed, setCopiedEmbed] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    if (file.size > MAX_SIZE) {
      setUploadError('File size must not exceed 50MB.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/files', { method: 'POST', body: formData });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setUploadError(data.error || 'Upload failed.');
        return;
      }
      const data = await res.json();
      setLastUploaded(data.file);
      if (inputRef.current) inputRef.current.value = '';
    } catch {
      setUploadError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  const fetchFiles = useCallback(async (searchValue: string) => {
    if (!searchValue.trim()) {
      setFiles([]);
      return;
    }

    setLoading(true);
    setSearchError(null);
    try {
      const params = new URLSearchParams({
        search: searchValue.trim(),
        limit: '5',
      });
      const res = await fetch(`/api/files?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to search files');
      const data = await res.json();
      setFiles(data.files);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Error searching files');
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchFiles(search);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, fetchFiles]);

  async function handleCopyUrl(url: string) {
    await navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  }

  async function handleCopyEmbed(file: IFileAttachment) {
    const isEmbeddable = file.mimeType === 'text/html' || file.mimeType === 'application/pdf';
    const snippet = isEmbeddable
      ? `<iframe src="${file.url}" width="100%" height="500" sandbox="allow-scripts" />`
      : `[${file.filename}](${file.url})`;
    await navigator.clipboard.writeText(snippet);
    setCopiedEmbed(file.url);
    setTimeout(() => setCopiedEmbed(null), 2000);
  }

  return (
    <div className="p-4 space-y-4 h-full flex flex-col">
      {/* Upload Section */}
      <div>
        <h3 className="text-sm font-medium text-[var(--color-foreground)] mb-2">Upload File</h3>
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
          className="hidden"
          onChange={handleFileChange}
          disabled={uploading}
        />
        {uploadError && (
          <p className="text-xs text-[var(--color-error)] mt-1">{uploadError}</p>
        )}

        {lastUploaded && (
          <div className="mt-3 p-2 border border-[var(--color-border)] rounded-md bg-[var(--color-surface)]">
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded border bg-[var(--color-background)]">
                <FileText className="w-6 h-6 text-[var(--color-foreground-muted)]" />
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
                    onClick={() => handleCopyEmbed(lastUploaded)}
                    className="flex items-center gap-1 px-2 py-1 text-xs border border-[var(--color-border)] rounded hover:bg-[var(--color-surface-hover)]"
                  >
                    {copiedEmbed === lastUploaded.url ? <Check className="w-3 h-3" /> : <Code className="w-3 h-3" />}
                    Snippet
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Search Section */}
      <div className="flex-1 flex flex-col min-h-0">
        <h3 className="text-sm font-medium text-[var(--color-foreground)] mb-2">Find Existing Files</h3>

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

        <div className="flex-1 min-h-0 overflow-y-auto">
          {loading && (
            <p className="text-xs text-[var(--color-foreground-muted)]">Searching...</p>
          )}

          {searchError && (
            <p className="text-xs text-[var(--color-error)]">{searchError}</p>
          )}

          {!loading && !searchError && search.trim() && files.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileText className="w-8 h-8 text-[var(--color-foreground-muted)] mb-2" />
              <p className="text-xs text-[var(--color-foreground-muted)]">No files found</p>
            </div>
          )}

          {!loading && files.length > 0 && (
            <div className="space-y-2">
              {files.map((file) => (
                <div
                  key={file._id}
                  className="flex items-start gap-2 p-2 border border-[var(--color-border)] rounded-md bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)]"
                >
                  <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded border bg-[var(--color-background)]">
                    <FileText className="w-6 h-6 text-[var(--color-foreground-muted)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[var(--color-foreground)] truncate">
                      {file.filename}
                    </p>
                    <p className="text-xs text-[var(--color-foreground-muted)]">
                      {formatBytes(file.sizeBytes)} · {file.mimeType}
                    </p>
                    <div className="flex gap-1 mt-2">
                      <button
                        onClick={() => handleCopyUrl(file.url)}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-[var(--color-primary)] text-[var(--color-primary-foreground)] rounded hover:opacity-90"
                      >
                        {copiedUrl === file.url ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        URL
                      </button>
                      <button
                        onClick={() => handleCopyEmbed(file)}
                        className="flex items-center gap-1 px-2 py-1 text-xs border border-[var(--color-border)] rounded hover:bg-[var(--color-surface-hover)]"
                      >
                        {copiedEmbed === file.url ? <Check className="w-3 h-3" /> : <Code className="w-3 h-3" />}
                        Snippet
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
