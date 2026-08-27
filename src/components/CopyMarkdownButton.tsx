'use client';

import { useState } from 'react';
import { Copy, Check, X } from 'lucide-react';

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
    <button
      type="button"
      onClick={handleCopy}
      title="Copy as Markdown"
      className="inline-flex items-center gap-1.5 px-2 py-1 text-sm text-[var(--color-foreground-secondary)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-hover)] rounded-md transition-colors cursor-pointer"
    >
      {status === 'copied' && <Check className="w-3.5 h-3.5 text-[var(--color-success,#22c55e)]" />}
      {status === 'error' && <X className="w-3.5 h-3.5 text-[var(--color-error)]" />}
      {status === 'idle' && <Copy className="w-3.5 h-3.5" />}
      {status === 'copied' ? 'Copied' : status === 'error' ? 'Failed' : 'Copy Markdown'}
    </button>
  );
}
