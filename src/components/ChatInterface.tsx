'use client';

/**
 * ChatInterface Component
 *
 * Main chat interface combining message list, input, and source citations.
 * Handles SSE streaming from the chat API.
 *
 * Requirement 7.8: Chat UI components
 */

import { useState, useCallback } from 'react';
import { MessageList, type ChatMessage } from './MessageList';
import { ChatInput } from './ChatInput';
import { SourceCitations, type SourceCitation } from './SourceCitations';

interface ChatInterfaceProps {
  initialMessages?: ChatMessage[];
}

export function ChatInterface({ initialMessages = [] }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [streamingContent, setStreamingContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sources, setSources] = useState<SourceCitation[]>([]);

  const handleSubmit = useCallback(
    async (content: string) => {
      // Clear previous error and sources
      setError(null);
      setSources([]);

      // Add user message
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content,
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setStreamingContent('');

      try {
        // Prepare messages for API
        const apiMessages = [...messages, userMessage].map((m) => ({
          role: m.role,
          content: m.content,
        }));

        // Make SSE request
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ messages: apiMessages }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP error ${response.status}`);
        }

        // Process SSE stream
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body');
        }

        const decoder = new TextDecoder();
        let accumulatedContent = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.delta) {
                  accumulatedContent += data.delta;
                  setStreamingContent(accumulatedContent);
                }

                if (data.done) {
                  // Stream complete, add assistant message
                  const assistantMessage: ChatMessage = {
                    id: `assistant-${Date.now()}`,
                    role: 'assistant',
                    content: accumulatedContent,
                  };
                  setMessages((prev) => [...prev, assistantMessage]);
                  setStreamingContent('');

                  // Set sources if provided
                  if (data.sources) {
                    setSources(data.sources);
                  }
                }

                if (data.error) {
                  throw new Error(data.error);
                }
              } catch {
                // Ignore JSON parse errors for incomplete chunks
                if (line.trim() !== 'data: ') {
                  console.warn('Failed to parse SSE data:', line);
                }
              }
            }
          }
        }
      } catch (err) {
        console.error('Chat error:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
        setStreamingContent('');
      } finally {
        setIsLoading(false);
      }
    },
    [messages]
  );

  const handleClearChat = useCallback(() => {
    setMessages([]);
    setSources([]);
    setError(null);
    setStreamingContent('');
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
        <h2 className="text-lg font-semibold">AI Chat</h2>
        {messages.length > 0 && (
          <button
            onClick={handleClearChat}
            className="text-sm text-[var(--color-foreground-secondary)] hover:text-[var(--color-foreground)] transition-colors"
          >
            Clear chat
          </button>
        )}
      </div>

      {/* Messages */}
      <MessageList messages={messages} streamingContent={streamingContent} />

      {/* Sources */}
      {sources.length > 0 && (
        <div className="px-4 pb-2">
          <SourceCitations sources={sources} />
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="mx-4 mb-2 p-3 rounded-lg bg-[var(--color-error-background)] text-[var(--color-error)] text-sm">
          {error}
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-[var(--color-border)]">
        <ChatInput onSubmit={handleSubmit} disabled={isLoading} />
      </div>
    </div>
  );
}

export default ChatInterface;
