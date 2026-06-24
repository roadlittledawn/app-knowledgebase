'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { FileUploader } from '@/components/FileUploader';
import { FileGallery } from '@/components/FileGallery';
import { FileDetailPanel } from '@/components/FileDetailPanel';
import type { IFileAttachment } from '@/types/file-attachment';

export default function FilesPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [uploaderOpen, setUploaderOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedFile, setSelectedFile] = useState<IFileAttachment | null>(null);

  useEffect(() => {
    fetch('/api/admin/stats').then((res) => {
      if (res.status === 401) {
        router.push('/login');
      } else {
        setAuthChecked(true);
      }
    });
  }, [router]);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[var(--color-background)]" />
    );
  }

  function handleUploadComplete(file: IFileAttachment) {
    setRefreshTrigger((t) => t + 1);
    setUploaderOpen(false);
    setSelectedFile(file);
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background)' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={22} style={{ color: 'var(--color-primary)' }} />
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-foreground)', margin: 0 }}>
                File Library
              </h1>
              <p style={{ fontSize: '13px', color: 'var(--color-foreground-muted)', marginTop: '2px' }}>
                Upload and manage files for embedding or download in entries
              </p>
            </div>
          </div>

          <button
            onClick={() => setUploaderOpen((o) => !o)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              background: 'var(--color-primary)',
              color: 'var(--color-primary-foreground)',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {uploaderOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {uploaderOpen ? 'Hide Uploader' : 'Upload File'}
          </button>
        </div>

        {/* Collapsible uploader */}
        {uploaderOpen && (
          <div style={{ marginBottom: '24px' }}>
            <FileUploader onUploadComplete={handleUploadComplete} />
          </div>
        )}

        {/* Gallery */}
        <FileGallery
          refreshTrigger={refreshTrigger}
          onSelectFile={setSelectedFile}
        />
      </div>

      {/* Detail panel */}
      <FileDetailPanel file={selectedFile} onClose={() => setSelectedFile(null)} />
    </div>
  );
}
