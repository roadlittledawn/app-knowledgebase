'use client';

/**
 * AIWritingPanel Component
 *
 * AI writing assistance panel with action buttons for Review, Improve, Expand,
 * Suggest Tags, and Suggest Title. Displays agent output in a tabbed artifact view
 * supporting multiple artifacts with an Apply button to insert content into Monaco.
 *
 * Requirements:
 * - 8.9: Display AI panel with action buttons for Review, Improve, Expand, Suggest Tags, Suggest Title
 * - 8.10: Display agent output in a tabbed artifact view supporting multiple artifacts
 * - 8.11: Provide an Apply button to insert agent output into the Monaco editor
 */

import { useState, useCallback } from 'react';
import type { EntryFrontmatter } from '@/types/entry';
import { Search, Sparkles, PenLine, Tags, Pin } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Writing action types supported by the panel
 */
type WritingAction = 'review' | 'improve' | 'expand' | 'suggest-tags' | 'suggest-title';

/**
 * Artifact representing a single AI output
 */
interface Artifact {
  id: string;
  action: WritingAction;
  content: string;
  timestamp: Date;
  isStreaming: boolean;
}

/**
 * Action button configuration
 */
interface ActionButton {
  action: WritingAction;
  label: string;
  description: string;
  icon: LucideIcon;
}

const ACTION_BUTTONS: ActionButton[] = [
  {
    action: 'review',
    label: 'Review',
    description: 'Review content for clarity and accuracy',
    icon: Search,
  },
  {
    action: 'improve',
    label: 'Improve',
    description: 'Enhance clarity and engagement',
    icon: Sparkles,
  },
  {
    action: 'expand',
    label: 'Expand',
    description: 'Add more details and examples',
    icon: PenLine,
  },
  {
    action: 'suggest-tags',
    label: 'Suggest Tags',
    description: 'Suggest relevant tags for this content',
    icon: Tags,
  },
  {
    action: 'suggest-title',
    label: 'Suggest Title',
    description: 'Suggest compelling titles',
    icon: Pin,
  },
];

interface AIWritingPanelProps {
  body: string;
  frontmatter: EntryFrontmatter;
  selection?: string;
  onApply: (content: string) => void;
}

export function AIWritingPanel({ body, frontmatter, selection, onApply }: AIWritingPanelProps) {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [activeArtifactId, setActiveArtifactId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Execute a writing action and stream the response
   */
  const executeAction = useCallback(
    async (action: WritingAction) => {
      setError(null);
      setIsLoading(true);

      // Create new artifact
      const artifactId = `${action}-${Date.now()}`;
      const newArtifact: Artifact = {
        id: artifactId,
        action,
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      };

      setArtifacts((prev) => [...prev, newArtifact]);
      setActiveArtifactId(artifactId);

      try {
        const response = await fetch('/api/ai/writing-agent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action,
            body,
            frontmatter,
            selection,
          }),
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
                  // Update artifact content
                  setArtifacts((prev) =>
                    prev.map((a) =>
                      a.id === artifactId ? { ...a, content: accumulatedContent } : a
                    )
                  );
                }

                if (data.done) {
                  // Stream complete
                  setArtifacts((prev) =>
                    prev.map((a) =>
                      a.id === artifactId
                        ? { ...a, content: accumulatedContent, isStreaming: false }
                        : a
                    )
                  );
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
        console.error('Writing agent error:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
        // Remove failed artifact
        setArtifacts((prev) => prev.filter((a) => a.id !== artifactId));
        if (activeArtifactId === artifactId) {
          const lastArtifact = artifacts[artifacts.length - 1];
          setActiveArtifactId(artifacts.length > 0 && lastArtifact ? lastArtifact.id : null);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [body, frontmatter, selection, artifacts, activeArtifactId]
  );

  /**
   * Handle applying artifact content to the editor
   */
  const handleApply = useCallback(() => {
    const activeArtifact = artifacts.find((a) => a.id === activeArtifactId);
    if (activeArtifact && activeArtifact.content) {
      onApply(activeArtifact.content);
    }
  }, [artifacts, activeArtifactId, onApply]);

  /**
   * Close an artifact tab
   */
  const closeArtifact = useCallback(
    (artifactId: string) => {
      setArtifacts((prev) => prev.filter((a) => a.id !== artifactId));
      if (activeArtifactId === artifactId) {
        const remaining = artifacts.filter((a) => a.id !== artifactId);
        const lastRemaining = remaining[remaining.length - 1];
        setActiveArtifactId(remaining.length > 0 && lastRemaining ? lastRemaining.id : null);
      }
    },
    [activeArtifactId, artifacts]
  );

  /**
   * Get display label for an action
   */
  const getActionLabel = (action: WritingAction): string => {
    return ACTION_BUTTONS.find((b) => b.action === action)?.label || action;
  };

  const activeArtifact = artifacts.find((a) => a.id === activeArtifactId);

  return (
    <div className="h-full flex flex-col bg-[var(--color-background-secondary)]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <h3 className="text-sm font-semibold text-[var(--color-foreground)]">
          AI Writing Assistant
        </h3>
        {selection && (
          <p className="text-xs text-[var(--color-foreground-muted)] mt-1">
            Using selected text as context
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="p-3 border-b border-[var(--color-border)]">
        <div className="flex flex-wrap gap-2">
          {ACTION_BUTTONS.map((button) => (
            <button
              key={button.action}
              onClick={() => executeAction(button.action)}
              disabled={isLoading}
              title={button.description}
              className={`
                px-3 py-1.5 text-xs font-medium rounded-md transition-colors
                flex items-center gap-1.5
                ${
                  isLoading
                    ? 'bg-[var(--color-surface)] text-[var(--color-foreground-muted)] cursor-not-allowed'
                    : 'bg-[var(--color-surface)] text-[var(--color-foreground)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)]'
                }
              `}
            >
              <button.icon className="w-3.5 h-3.5" />
              <span>{button.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-3 mt-3 p-3 rounded-lg bg-[var(--color-error-background)] text-[var(--color-error)] text-sm">
          {error}
        </div>
      )}

      {/* Artifact Tabs */}
      {artifacts.length > 0 && (
        <div className="flex items-center gap-1 px-3 pt-3 overflow-x-auto">
          {artifacts.map((artifact) => (
            <div
              key={artifact.id}
              className={`
                flex items-center gap-1 px-3 py-1.5 text-xs rounded-t-md cursor-pointer
                ${
                  activeArtifactId === artifact.id
                    ? 'bg-[var(--color-surface)] text-[var(--color-foreground)] border border-b-0 border-[var(--color-border)]'
                    : 'bg-[var(--color-background)] text-[var(--color-foreground-secondary)] hover:bg-[var(--color-surface-hover)]'
                }
              `}
              onClick={() => setActiveArtifactId(artifact.id)}
            >
              <span>{getActionLabel(artifact.action)}</span>
              {artifact.isStreaming && (
                <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-pulse" />
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeArtifact(artifact.id);
                }}
                className="ml-1 text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)] transition-colors"
                aria-label="Close tab"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Artifact Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {activeArtifact ? (
          <div className="p-4">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <pre className="whitespace-pre-wrap text-sm text-[var(--color-foreground)] bg-[var(--color-surface)] p-4 rounded-lg border border-[var(--color-border)] overflow-x-auto">
                {activeArtifact.content || (activeArtifact.isStreaming ? 'Generating...' : '')}
              </pre>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-[var(--color-foreground-muted)] text-sm">
            <p>Select an action above to get AI assistance</p>
          </div>
        )}
      </div>

      {/* Apply Button */}
      {activeArtifact && activeArtifact.content && !activeArtifact.isStreaming && (
        <div className="p-3 border-t border-[var(--color-border)] bg-[var(--color-surface)]">
          <button
            onClick={handleApply}
            className="w-full px-4 py-2 text-sm font-medium bg-[var(--color-primary)] text-[var(--color-primary-foreground)] rounded-md hover:opacity-90 transition-opacity"
          >
            Apply to Editor
          </button>
        </div>
      )}
    </div>
  );
}

export default AIWritingPanel;
