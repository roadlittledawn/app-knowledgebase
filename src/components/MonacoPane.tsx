'use client';

/**
 * MonacoPane Component
 * Monaco editor wrapper with dynamic import (SSR disabled) and theme sync
 *
 * Requirements:
 * - 6.9: Load Monaco dynamically with SSR disabled to prevent server-side rendering issues
 * - 6.10: Sync the Monaco theme with the application dark/light mode
 */

import dynamic from 'next/dynamic';
import type { Theme } from '@/lib/theme';

// Dynamically import Monaco editor with SSR disabled (Requirement 6.9)
const Editor = dynamic(() => import('@monaco-editor/react').then((mod) => mod.default), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[var(--color-background)]">
      <span className="text-sm text-[var(--color-foreground-muted)]">Loading editor...</span>
    </div>
  ),
});

interface MonacoPaneProps {
  value: string;
  onChange: (value: string) => void;
  theme: Theme;
  language?: string;
}

/**
 * Map app theme to Monaco theme (Requirement 6.10)
 * - dark mode uses 'vs-dark'
 * - light mode uses 'light'
 */
function getMonacoTheme(appTheme: Theme): string {
  return appTheme === 'dark' ? 'vs-dark' : 'light';
}

export function MonacoPane({ value, onChange, theme, language = 'mdx' }: MonacoPaneProps) {
  const handleChange = (newValue: string | undefined) => {
    onChange(newValue ?? '');
  };

  return (
    <Editor
      height="100%"
      language={language}
      value={value}
      theme={getMonacoTheme(theme)}
      onChange={handleChange}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: 'on',
        wordWrap: 'on',
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        padding: { top: 16, bottom: 16 },
      }}
    />
  );
}
