'use client';

/**
 * MonacoPane Component
 * Monaco editor wrapper with dynamic import (SSR disabled) and theme sync
 *
 * Requirements:
 * - 6.9: Load Monaco dynamically with SSR disabled to prevent server-side rendering issues
 * - 6.10: Sync the Monaco theme with the application dark/light mode
 * - 8.12: Support text selection tracking for AI writing assistance
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { Theme } from '@/lib/theme';
import type { editor, IRange } from 'monaco-editor';

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
  onSelectionChange?: (selectedText: string | undefined) => void;
}

/**
 * Map app theme to Monaco theme (Requirement 6.10)
 * - dark mode uses 'vs-dark'
 * - light mode uses 'light'
 */
function getMonacoTheme(appTheme: Theme): string {
  return appTheme === 'dark' ? 'vs-dark' : 'light';
}

/**
 * Detect iOS/iPadOS (including iPadOS “desktop mode”).
 * Used to disable Monaco’s custom context menu so the native iOS paste menu works reliably.
 */
function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }

  const userAgent = navigator.userAgent ?? navigator.vendor ?? '';
  const isIPhoneOrIPad = /iPad|iPhone|iPod/.test(userAgent);
  const isIPadDesktopMode = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;

  return isIPhoneOrIPad || isIPadDesktopMode;
}

export function MonacoPane({
  value,
  onChange,
  theme,
  language = 'mdx',
  onSelectionChange,
}: MonacoPaneProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const isIOS = useMemo(() => isIOSDevice(), []);
  const [pasteLabel, setPasteLabel] = useState('Paste');

  const flashPasteLabel = useCallback((label: string) => {
    setPasteLabel(label);
    setTimeout(() => setPasteLabel('Paste'), 2000);
  }, []);

  const handleChange = (newValue: string | undefined) => {
    onChange(newValue ?? '');
  };

  // Handle editor mount to set up selection tracking (Requirement 8.12)
  const handleEditorDidMount = useCallback(
    (editorInstance: editor.IStandaloneCodeEditor) => {
      editorRef.current = editorInstance;

      if (onSelectionChange) {
        // Track selection changes
        editorInstance.onDidChangeCursorSelection(() => {
          const selection = editorInstance.getSelection();
          if (selection && !selection.isEmpty()) {
            const selectedText = editorInstance.getModel()?.getValueInRange(selection);
            onSelectionChange(selectedText || undefined);
          } else {
            onSelectionChange(undefined);
          }
        });
      }
    },
    [onSelectionChange]
  );

  /**
   * iOS-specific paste handler.
   *
   * On iOS Safari, Monaco's touch-event interception prevents the browser's
   * native long-press paste popover from ever appearing. Disabling Monaco's
   * custom context menu (contextmenu: false) removes the non-functional Monaco
   * paste option but leaves users with no way to paste at all. This handler
   * bridges that gap: it reads the clipboard via the Clipboard API (which iOS
   * honours when invoked from a direct user gesture such as a button tap) and
   * inserts the text at the current cursor position / selection.
   */
  const handleIOSPaste = useCallback(async () => {
    const editorInstance = editorRef.current;
    if (!editorInstance) return;

    try {
      const text = await navigator.clipboard.readText();
      if (!text) {
        flashPasteLabel('Nothing to paste');
        return;
      }

      const selection = editorInstance.getSelection();
      const position = editorInstance.getPosition();

      let range: IRange;
      if (selection && !selection.isEmpty()) {
        range = selection;
      } else if (position) {
        range = {
          startLineNumber: position.lineNumber,
          startColumn: position.column,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        };
      } else {
        range = { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 };
      }

      editorInstance.executeEdits('ios-paste', [{ range, text }]);
      editorInstance.focus();
    } catch {
      // Clipboard access denied or API unavailable.
      flashPasteLabel('Paste unavailable');
    }
  }, [flashPasteLabel]);

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <Editor
        height="100%"
        language={language}
        value={value}
        theme={getMonacoTheme(theme)}
        onChange={handleChange}
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          wordWrap: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          padding: { top: 16, bottom: 16 },
          // Disable Monaco's custom context menu on iOS: it captures long-press
          // events but clipboard insertion never fires, leaving paste broken.
          // The iOS paste button below provides clipboard paste instead.
          contextmenu: !isIOS,
        }}
      />
      {isIOS && (
        <button
          onClick={handleIOSPaste}
          aria-label="Paste from clipboard"
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 10,
            padding: '4px 10px',
            fontSize: 13,
            borderRadius: 6,
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
            color: 'var(--color-foreground)',
            cursor: 'pointer',
            opacity: 0.85,
          }}
        >
          {pasteLabel}
        </button>
      )}
    </div>
  );
}
