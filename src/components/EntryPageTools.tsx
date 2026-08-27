import Link from 'next/link';
import { FileText, Pencil } from 'lucide-react';
import { CopyMarkdownButton } from '@/components/CopyMarkdownButton';

interface EntryPageToolsProps {
  markdownUrl?: string;
  entryId: string;
  authenticated: boolean;
}

export function EntryPageTools({ markdownUrl, entryId, authenticated }: EntryPageToolsProps) {
  if (!markdownUrl && !authenticated) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-1 gap-y-2 mt-4 mb-8 pb-4 border-b border-[var(--color-border)]">
      {markdownUrl && (
        <>
          <a
            href={markdownUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-2 py-1 text-sm text-[var(--color-foreground-secondary)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-hover)] rounded-md transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            View as Markdown
          </a>
          <span className="w-px h-4 bg-[var(--color-border)]" aria-hidden="true" />
          <CopyMarkdownButton markdownUrl={markdownUrl} />
        </>
      )}
      {authenticated && (
        <Link
          href={`/entries/${entryId}/edit`}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 ml-auto text-sm font-medium text-[var(--color-primary)] bg-[var(--color-primary)]/10 hover:bg-[var(--color-primary)]/20 rounded-md transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
          Edit
        </Link>
      )}
    </div>
  );
}
