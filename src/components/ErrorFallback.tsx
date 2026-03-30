'use client';

/**
 * Error fallback UI component
 * Displays a user-friendly error message when an error boundary catches an error
 * Requirement 15.1: THE System SHALL render MDX content using next-mdx-remote
 */

import React from 'react';

export interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary?: () => void;
  title?: string;
  showDetails?: boolean;
}

/**
 * Default error fallback component
 */
export function ErrorFallback({
  error,
  resetErrorBoundary,
  title = 'Something went wrong',
  showDetails = process.env.NODE_ENV === 'development',
}: ErrorFallbackProps) {
  return (
    <div
      role="alert"
      className="error-fallback"
      style={{
        padding: '2rem',
        margin: '1rem',
        borderRadius: '8px',
        backgroundColor: 'var(--color-error-bg, #fef2f2)',
        border: '1px solid var(--color-error-border, #fecaca)',
        color: 'var(--color-error-text, #991b1b)',
      }}
    >
      <h2
        style={{
          margin: '0 0 1rem 0',
          fontSize: '1.25rem',
          fontWeight: 600,
        }}
      >
        {title}
      </h2>

      <p
        style={{
          margin: '0 0 1rem 0',
          color: 'var(--color-error-text-secondary, #b91c1c)',
        }}
      >
        {error.message || 'An unexpected error occurred'}
      </p>

      {showDetails && error.stack && (
        <details
          style={{
            marginBottom: '1rem',
          }}
        >
          <summary
            style={{
              cursor: 'pointer',
              color: 'var(--color-error-text-secondary, #b91c1c)',
              marginBottom: '0.5rem',
            }}
          >
            Error details
          </summary>
          <pre
            style={{
              padding: '1rem',
              backgroundColor: 'var(--color-error-code-bg, #fee2e2)',
              borderRadius: '4px',
              overflow: 'auto',
              fontSize: '0.75rem',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {error.stack}
          </pre>
        </details>
      )}

      {resetErrorBoundary && (
        <button
          onClick={resetErrorBoundary}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: 'var(--color-error-button-bg, #dc2626)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: 500,
          }}
        >
          Try again
        </button>
      )}
    </div>
  );
}

/**
 * Compact error fallback for smaller sections
 */
export function CompactErrorFallback({
  error,
  resetErrorBoundary,
}: Omit<ErrorFallbackProps, 'title' | 'showDetails'>) {
  return (
    <div
      role="alert"
      className="error-fallback-compact"
      style={{
        padding: '1rem',
        borderRadius: '4px',
        backgroundColor: 'var(--color-error-bg, #fef2f2)',
        border: '1px solid var(--color-error-border, #fecaca)',
        color: 'var(--color-error-text, #991b1b)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
      }}
    >
      <span style={{ fontSize: '1.25rem' }}>⚠️</span>
      <span style={{ flex: 1 }}>{error.message || 'Something went wrong'}</span>
      {resetErrorBoundary && (
        <button
          onClick={resetErrorBoundary}
          style={{
            padding: '0.25rem 0.5rem',
            backgroundColor: 'transparent',
            color: 'var(--color-error-text, #991b1b)',
            border: '1px solid currentColor',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.75rem',
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
}

/**
 * MDX content error fallback
 */
export function MDXErrorFallback({ error }: { error: Error }) {
  return (
    <div
      role="alert"
      className="mdx-error-fallback"
      style={{
        padding: '1.5rem',
        margin: '1rem 0',
        borderRadius: '8px',
        backgroundColor: 'var(--color-warning-bg, #fffbeb)',
        border: '1px solid var(--color-warning-border, #fcd34d)',
        color: 'var(--color-warning-text, #92400e)',
      }}
    >
      <h3
        style={{
          margin: '0 0 0.5rem 0',
          fontSize: '1rem',
          fontWeight: 600,
        }}
      >
        Content rendering error
      </h3>
      <p
        style={{
          margin: 0,
          fontSize: '0.875rem',
        }}
      >
        There was a problem rendering this content. The MDX may contain syntax errors.
      </p>
      {process.env.NODE_ENV === 'development' && (
        <pre
          style={{
            marginTop: '1rem',
            padding: '0.75rem',
            backgroundColor: 'var(--color-warning-code-bg, #fef3c7)',
            borderRadius: '4px',
            overflow: 'auto',
            fontSize: '0.75rem',
            whiteSpace: 'pre-wrap',
          }}
        >
          {error.message}
        </pre>
      )}
    </div>
  );
}

export default ErrorFallback;
