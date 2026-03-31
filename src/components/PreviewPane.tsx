'use client';

/**
 * PreviewPane Component
 * Renders live MDX preview with debounced serialization
 *
 * Requirements:
 * - 6.3: Serialize MDX with 600ms debounce on content changes
 * - 6.4: Return serialized MDX compatible with next-mdx-remote rendering
 * - 6.5: Render preview using the same DDS component map as entry detail pages
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { MDXRemoteSerializeResult } from 'next-mdx-remote';
import { MDXContent } from './mdx/MDXContent';

interface PreviewPaneProps {
  mdx: string;
}

interface PreviewResponse {
  serialized: MDXRemoteSerializeResult;
}

interface PreviewErrorResponse {
  error: string;
}

const DEBOUNCE_DELAY = 600; // 600ms debounce as per requirement 6.3

export function PreviewPane({ mdx }: PreviewPaneProps) {
  const [serialized, setSerialized] = useState<MDXRemoteSerializeResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track the latest mdx value to avoid stale closures
  const latestMdxRef = useRef(mdx);
  latestMdxRef.current = mdx;

  // Track the debounce timer
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Track if component is mounted to avoid state updates after unmount
  const isMountedRef = useRef(true);

  const fetchPreview = useCallback(async (content: string) => {
    if (!isMountedRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mdx: content }),
      });

      if (!isMountedRef.current) return;

      if (!response.ok) {
        const errorData = (await response.json()) as PreviewErrorResponse;
        setError(errorData.error || 'Failed to serialize MDX');
        setSerialized(null);
      } else {
        const data = (await response.json()) as PreviewResponse;
        setSerialized(data.serialized);
        setError(null);
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to fetch preview');
      setSerialized(null);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  // Debounced effect for MDX changes
  useEffect(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // If content is empty, clear the preview immediately
    if (!mdx.trim()) {
      setSerialized(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    // Set loading state immediately to show user something is happening
    setIsLoading(true);

    // Set up debounced fetch
    timerRef.current = setTimeout(() => {
      // Use the latest mdx value from ref to avoid stale closure
      fetchPreview(latestMdxRef.current);
    }, DEBOUNCE_DELAY);

    // Cleanup on unmount or when mdx changes
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [mdx, fetchPreview]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // Render loading state
  if (isLoading && !serialized) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--color-foreground-muted)]">
        <div className="flex items-center gap-2">
          <svg
            className="animate-spin h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="text-sm">Rendering preview...</span>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="p-4">
        <div className="bg-[var(--color-error)]/10 border border-[var(--color-error)]/30 rounded-md p-4">
          <h4 className="text-sm font-medium text-[var(--color-error)] mb-1">Preview Error</h4>
          <p className="text-sm text-[var(--color-foreground-muted)]">{error}</p>
        </div>
      </div>
    );
  }

  // Render empty state
  if (!serialized) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--color-foreground-muted)]">
        <p className="text-sm italic">Start typing to see preview...</p>
      </div>
    );
  }

  // Render MDX content using the same component map as entry detail pages
  return (
    <div className="prose dark:prose-invert max-w-none p-4 [&_p]:my-2">
      {isLoading && (
        <div className="absolute top-2 right-2 text-xs text-[var(--color-foreground-muted)]">
          Updating...
        </div>
      )}
      <MDXContent source={serialized} />
    </div>
  );
}
