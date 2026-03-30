'use client';

/**
 * MessageBubble Component
 *
 * Displays a single chat message with appropriate styling for user/assistant.
 * Requirement 7.8: Chat UI components
 */

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

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
        <div className="whitespace-pre-wrap break-words">
          {content}
          {isStreaming && <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse" />}
        </div>
      </div>
    </div>
  );
}

export default MessageBubble;
