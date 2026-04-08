'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, Image as ImageIcon } from 'lucide-react';
import { ImageUploader } from '@/components/ImageUploader';
import { ImageGallery } from '@/components/ImageGallery';
import { ImageDetailPanel } from '@/components/ImageDetailPanel';
import type { IImage } from '@/types/image';

export default function ImagesPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [uploaderOpen, setUploaderOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedImage, setSelectedImage] = useState<IImage | null>(null);

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

  function handleUploadComplete(image: IImage) {
    setRefreshTrigger((t) => t + 1);
    setUploaderOpen(false);
    // Optionally show the detail panel for the new image
    setSelectedImage(image);
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
            <ImageIcon size={22} style={{ color: 'var(--color-primary)' }} />
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-foreground)', margin: 0 }}>
                Image Library
              </h1>
              <p style={{ fontSize: '13px', color: 'var(--color-foreground-muted)', marginTop: '2px' }}>
                Upload and manage images for use in entries
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
            {uploaderOpen ? 'Hide Uploader' : 'Upload Image'}
          </button>
        </div>

        {/* Collapsible uploader */}
        {uploaderOpen && (
          <div style={{ marginBottom: '24px' }}>
            <ImageUploader onUploadComplete={handleUploadComplete} />
          </div>
        )}

        {/* Gallery */}
        <ImageGallery
          refreshTrigger={refreshTrigger}
          onSelectImage={setSelectedImage}
        />
      </div>

      {/* Detail panel */}
      <ImageDetailPanel image={selectedImage} onClose={() => setSelectedImage(null)} />
    </div>
  );
}
