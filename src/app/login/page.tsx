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
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        backgroundColor: 'var(--color-background)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          padding: '2rem',
          backgroundColor: 'var(--color-surface)',
          borderRadius: '8px',
          border: '1px solid var(--color-border)',
          boxShadow: '0 4px 6px var(--shadow-color)',
        }}
      >
        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 600,
            marginBottom: '1.5rem',
            textAlign: 'center',
            color: 'var(--color-foreground)',
          }}
        >
          Sign in to Knowledgebase
        </h1>

        <form onSubmit={handleSubmit}>
          {error && (
            <div
              role="alert"
              aria-live="polite"
              style={{
                padding: '0.75rem 1rem',
                marginBottom: '1rem',
                backgroundColor: 'var(--color-error-background)',
                border: '1px solid var(--color-error)',
                borderRadius: '6px',
                color: 'var(--color-error)',
                fontSize: '0.875rem',
              }}
            >
              {error}
            </div>
          )}

          <div style={{ marginBottom: '1rem' }}>
            <label
              htmlFor="username"
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: 'var(--color-foreground)',
              }}
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
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                fontSize: '1rem',
                backgroundColor: 'var(--color-input)',
                border: '1px solid var(--color-input-border)',
                borderRadius: '6px',
                color: 'var(--color-foreground)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--color-primary)';
                e.target.style.boxShadow = '0 0 0 2px var(--color-ring)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--color-input-border)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label
              htmlFor="password"
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: 'var(--color-foreground)',
              }}
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
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                fontSize: '1rem',
                backgroundColor: 'var(--color-input)',
                border: '1px solid var(--color-input-border)',
                borderRadius: '6px',
                color: 'var(--color-foreground)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--color-primary)';
                e.target.style.boxShadow = '0 0 0 2px var(--color-ring)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--color-input-border)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              fontSize: '1rem',
              fontWeight: 500,
              backgroundColor: isLoading ? 'var(--color-foreground-muted)' : 'var(--color-primary)',
              color: 'var(--color-primary-foreground)',
              border: 'none',
              borderRadius: '6px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.currentTarget.style.backgroundColor = 'var(--color-primary)';
              }
            }}
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
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        backgroundColor: 'var(--color-background)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          padding: '2rem',
          backgroundColor: 'var(--color-surface)',
          borderRadius: '8px',
          border: '1px solid var(--color-border)',
          boxShadow: '0 4px 6px var(--shadow-color)',
        }}
      >
        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 600,
            marginBottom: '1.5rem',
            textAlign: 'center',
            color: 'var(--color-foreground)',
          }}
        >
          Sign in to Knowledgebase
        </h1>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '2rem',
            color: 'var(--color-foreground-secondary)',
          }}
        >
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
