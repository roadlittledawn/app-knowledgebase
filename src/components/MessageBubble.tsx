'use client';

/**
 * MessageBubble Component
 *
 * Displays a single chat message with appropriate styling for user/assistant.
 * Assistant messages are rendered as markdown (headings, lists, links, code, etc.);
 * user messages are rendered as plain text.
 * Requirement 7.8: Chat UI components
 */

import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

/** Markdown element styling for assistant answers (readability-focused). */
const markdownComponents: Components = {
  h1: ({ children }) => <h1 className="text-lg font-semibold mt-3 mb-2 first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="text-base font-semibold mt-3 mb-2 first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="text-sm font-semibold mt-3 mb-1 first:mt-0">{children}</h3>,
  p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0 leading-relaxed">{children}</p>,
  ul: ({ children }) => <ul className="my-2 ml-5 list-disc space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 ml-5 list-decimal space-y-1">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[var(--color-primary)] underline hover:no-underline"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-[var(--color-border)] pl-3 text-[var(--color-foreground-muted)]">
      {children}
    </blockquote>
  ),
  code: ({ className, children }) => {
    const isBlock = (className ?? '').includes('language-');
    if (isBlock) {
      return <code className={className}>{children}</code>;
    }
    return (
      <code className="rounded bg-[var(--color-background)] px-1.5 py-0.5 text-[0.85em] font-mono">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="my-2 overflow-x-auto rounded-md bg-[var(--color-background)] p-3 text-[0.85em] font-mono">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-[var(--color-border)] px-2 py-1 text-left font-semibold">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-[var(--color-border)] px-2 py-1">{children}</td>
  ),
  hr: () => <hr className="my-3 border-[var(--color-border)]" />,
};

export function MessageBubble({ role, content, isStreaming = false }: MessageBubbleProps) {
  const isUser = role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] px-4 py-3 rounded-lg ${
          isUser
            ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
            : 'bg-[var(--color-surface)] text-[var(--color-foreground)] border border-[var(--color-border)]'
        }`}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap break-words">{content}</div>
        ) : (
          <div className="break-words text-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {content}
            </ReactMarkdown>
            {isStreaming && (
              <span className="inline-block w-2 h-4 ml-1 align-middle bg-current animate-pulse" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default MessageBubble;
