'use client';

/**
 * ChatInput Component
 *
 * Text input for sending chat messages with submit button.
 * Requirement 7.8: Chat UI components
 */

import { useState, useRef, useEffect, KeyboardEvent, FormEvent } from 'react';

interface ChatInputProps {
  onSubmit: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSubmit,
  disabled = false,
  placeholder = 'Ask a question about the knowledgebase...',
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [message]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSubmit(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter without Shift
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-3 items-end">
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="w-full px-4 py-3 rounded-lg resize-none
            bg-[var(--color-input)] border border-[var(--color-input-border)]
            text-[var(--color-foreground)] placeholder-[var(--color-input-placeholder)]
            focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors"
          aria-label="Chat message input"
        />
      </div>
      <button
        type="submit"
        disabled={disabled || !message.trim()}
        className="px-4 py-3 rounded-lg font-medium
          bg-[var(--color-primary)] text-[var(--color-primary-foreground)]
          hover:bg-[var(--color-primary-hover)]
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors"
        aria-label="Send message"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-5 h-5"
        >
          <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
        </svg>
      </button>
    </form>
  );
}

export default ChatInput;
