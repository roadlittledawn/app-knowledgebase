'use client';

/**
 * MessageList Component
 *
 * Displays a scrollable list of chat messages.
 * Requirement 7.8: Chat UI components
 */

import { useRef, useEffect } from 'react';
import { MessageBubble } from './MessageBubble';
import { SourceCitations, type SourceCitation } from './SourceCitations';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface MessageListProps {
  messages: ChatMessage[];
  streamingContent?: string;
  sources?: SourceCitation[];
}

export function MessageList({ messages, streamingContent, sources }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  if (messages.length === 0 && !streamingContent) {
    return (
      <div className="flex-1 flex items-center justify-center text-[var(--color-foreground-muted)]">
        <div className="text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-12 h-12 mx-auto mb-4 opacity-50"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
            />
          </svg>
          <p className="text-lg font-medium">Start a conversation</p>
          <p className="text-sm mt-1">Ask questions about the knowledgebase</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <MessageBubble key={message.id} role={message.role} content={message.content} />
      ))}
      {streamingContent && (
        <MessageBubble role="assistant" content={streamingContent} isStreaming />
      )}
      {sources && sources.length > 0 && !streamingContent && (
        <div className="px-0 pb-2">
          <SourceCitations sources={sources} />
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}

export default MessageList;
