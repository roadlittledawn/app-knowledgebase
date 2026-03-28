/**
 * Pre-paint theme detection script
 * This script runs before CSS loads to prevent flash of wrong theme (FOWT)
 * It must be injected as an inline script in the HTML head
 *
 * Requirements:
 * - 12.1: Default to dark mode when no user preference is stored
 * - 12.2: Execute pre-paint script in HTML head to set theme class before CSS loads
 * - 12.4: Persist preference to localStorage
 */

export const THEME_STORAGE_KEY = 'knowledgebase-theme';

export type Theme = 'dark' | 'light';

/**
 * Returns the inline script content to be injected in the HTML head
 * This script runs synchronously before any CSS is parsed
 */
export function getThemeScript(): string {
  return `
(function() {
  var STORAGE_KEY = '${THEME_STORAGE_KEY}';
  var stored = null;
  try {
    stored = localStorage.getItem(STORAGE_KEY);
  } catch (e) {}
  
  // Default to dark mode if no preference stored (Requirement 12.1)
  var theme = stored === 'light' ? 'light' : 'dark';
  
  document.documentElement.classList.remove('light', 'dark');
  document.documentElement.classList.add(theme);
  document.documentElement.style.colorScheme = theme;
})();
`.trim();
}

/**
 * Get the current theme from localStorage or default to dark
 */
export function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

/**
 * Store the theme preference in localStorage
 */
export function setStoredTheme(theme: Theme): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // localStorage may be unavailable (e.g., private browsing)
  }
}
