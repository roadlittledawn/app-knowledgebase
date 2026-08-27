'use client';

import { useState } from 'react';
import { Copy, Check, ExternalLink, X } from 'lucide-react';

interface CopyMarkdownButtonProps {
  markdownUrl: string;
}

export function CopyMarkdownButton({ markdownUrl }: CopyMarkdownButtonProps) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle');

  async function handleCopy() {
    try {
      const res = await fetch(markdownUrl);
      if (!res.ok) {
        throw new Error(`Markdown fetch failed with status ${res.status}`);
      }
      const text = await res.text();
      await navigator.clipboard.writeText(text);
      setStatus('copied');
    } catch (err) {
      console.error('Failed to copy markdown:', err);
      setStatus('error');
    } finally {
      setTimeout(() => setStatus('idle'), 2000);
    }
  }

  return (
    <div className="flex gap-2">
      <a
        href={markdownUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="View Markdown source"
        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md border border-[var(--color-border)] text-xs text-[var(--color-foreground-secondary)] hover:bg-[var(--color-surface)] transition-colors"
      >
        <ExternalLink size={12} />
        View as Markdown
      </a>
      <button
        onClick={handleCopy}
        title="Copy as Markdown"
        className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md border border-[var(--color-border)] text-xs text-[var(--color-foreground-secondary)] hover:bg-[var(--color-surface)] transition-colors"
      >
        {status === 'copied' && <Check size={12} />}
        {status === 'error' && <X size={12} />}
        {status === 'idle' && <Copy size={12} />}
        {status === 'copied' ? 'Copied' : status === 'error' ? 'Failed' : 'Copy'}
      </button>
    </div>
  );
}
