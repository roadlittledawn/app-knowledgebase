'use client';

import { useState } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';

interface CopyMarkdownButtonProps {
  markdownUrl: string;
}

export function CopyMarkdownButton({ markdownUrl }: CopyMarkdownButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      const res = await fetch(markdownUrl);
      const text = await res.text();
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy markdown:', err);
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
        {copied ? <Check size={12} /> : <Copy size={12} />}
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}
