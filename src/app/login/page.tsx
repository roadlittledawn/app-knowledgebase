'use client';

import { useState, FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * Login Page
 *
 * Requirements:
 * - 1.1: WHEN a user submits valid credentials on the login page, THE Auth_Service SHALL set an HTTP-only JWT cookie and redirect to the browse page
 * - 1.2: WHEN a user submits invalid credentials, THE Auth_Service SHALL return a 401 error and display an error message
 */

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Requirement 1.2: Display error message on invalid credentials
        setError(data.error || 'Login failed');
        return;
      }

      // Requirement 1.1: Redirect to browse page (or redirect param) on success
      const redirectTo = searchParams.get('redirect') || '/browse';
      router.push(redirectTo);
      router.refresh(); // Refresh to update auth state in TopNav
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-sm p-6 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] shadow-lg">
        <h1 className="text-xl font-semibold mb-6 text-center text-[var(--color-foreground)]">
          Sign in
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div
              role="alert"
              aria-live="polite"
              className="p-3 text-sm rounded-md bg-[var(--color-error-background)] border border-[var(--color-error)] text-[var(--color-error)]"
            >
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="username"
              className="block mb-1.5 text-sm font-medium text-[var(--color-foreground)]"
            >
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
              className="w-full px-3 py-2 text-sm rounded-md bg-[var(--color-input)] border border-[var(--color-input-border)] text-[var(--color-foreground)] placeholder-[var(--color-input-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:border-[var(--color-primary)] disabled:opacity-50"
              placeholder="Enter your username"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block mb-1.5 text-sm font-medium text-[var(--color-foreground)]"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className="w-full px-3 py-2 text-sm rounded-md bg-[var(--color-input)] border border-[var(--color-input-border)] text-[var(--color-foreground)] placeholder-[var(--color-input-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:border-[var(--color-primary)] disabled:opacity-50"
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 text-sm font-medium rounded-md bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:ring-offset-2 focus:ring-offset-[var(--color-background)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

function LoginFormFallback() {
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-sm p-6 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] shadow-lg">
        <h1 className="text-xl font-semibold mb-6 text-center text-[var(--color-foreground)]">
          Sign in
        </h1>
        <div className="flex justify-center py-8 text-[var(--color-foreground-secondary)]">
          Loading...
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormFallback />}>
      <LoginForm />
    </Suspense>
  );
}
