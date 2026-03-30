'use client';

/**
 * React Error Boundary component
 * Catches JavaScript errors in child component tree and displays fallback UI
 * Requirement 15.1: THE System SHALL render MDX content using next-mdx-remote
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorFallback, CompactErrorFallback, MDXErrorFallback } from './ErrorFallback';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((props: { error: Error; resetErrorBoundary: () => void }) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
  resetKeys?: unknown[];
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Generic Error Boundary component
 * Wraps children and catches any errors that occur during rendering
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console in development
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    // Reset error state if resetKeys change
    if (this.state.hasError && this.props.resetKeys) {
      const hasResetKeyChanged = this.props.resetKeys.some(
        (key, index) => key !== prevProps.resetKeys?.[index]
      );
      if (hasResetKeyChanged) {
        this.resetErrorBoundary();
      }
    }
  }

  resetErrorBoundary = (): void => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (hasError && error) {
      // Custom fallback render function
      if (typeof fallback === 'function') {
        return fallback({ error, resetErrorBoundary: this.resetErrorBoundary });
      }

      // Custom fallback element
      if (fallback) {
        return fallback;
      }

      // Default fallback
      return <ErrorFallback error={error} resetErrorBoundary={this.resetErrorBoundary} />;
    }

    return children;
  }
}

/**
 * Compact Error Boundary for smaller sections
 */
export class CompactErrorBoundary extends Component<
  Omit<ErrorBoundaryProps, 'fallback'>,
  ErrorBoundaryState
> {
  constructor(props: Omit<ErrorBoundaryProps, 'fallback'>) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('CompactErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  resetErrorBoundary = (): void => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children } = this.props;

    if (hasError && error) {
      return <CompactErrorFallback error={error} resetErrorBoundary={this.resetErrorBoundary} />;
    }

    return children;
  }
}

/**
 * MDX Content Error Boundary
 * Specialized for MDX rendering errors
 */
export class MDXErrorBoundary extends Component<
  Omit<ErrorBoundaryProps, 'fallback'>,
  ErrorBoundaryState
> {
  constructor(props: Omit<ErrorBoundaryProps, 'fallback'>) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('MDXErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    // Reset when resetKeys change (e.g., when content changes)
    if (this.state.hasError && this.props.resetKeys) {
      const hasResetKeyChanged = this.props.resetKeys.some(
        (key, index) => key !== prevProps.resetKeys?.[index]
      );
      if (hasResetKeyChanged) {
        this.setState({ hasError: false, error: null });
      }
    }
  }

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children } = this.props;

    if (hasError && error) {
      return <MDXErrorFallback error={error} />;
    }

    return children;
  }
}

/**
 * Higher-order component to wrap a component with an error boundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
): React.FC<P> {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';

  const ComponentWithErrorBoundary: React.FC<P> = (props) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${displayName})`;

  return ComponentWithErrorBoundary;
}

export default ErrorBoundary;
