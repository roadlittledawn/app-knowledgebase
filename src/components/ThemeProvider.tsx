'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import {
  type Theme,
  getStoredTheme,
  setStoredTheme,
  THEME_STORAGE_KEY,
} from '@/lib/theme/theme-script';

/**
 * ThemeProvider context provider
 *
 * Requirements:
 * - 12.1: Default to dark mode when no user preference is stored
 * - 12.4: Persist preference to localStorage when user toggles theme
 */

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

// Helper to get initial theme safely (works during SSR)
function getInitialTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'dark';
  }
  return getStoredTheme();
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  // Initialize with stored theme or dark as default (Requirement 12.1)
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  const applyTheme = useCallback((newTheme: Theme) => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(newTheme);
    document.documentElement.style.colorScheme = newTheme;
  }, []);

  // Listen for storage changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY && e.newValue) {
        const newTheme = e.newValue === 'light' ? 'light' : 'dark';
        setThemeState(newTheme);
        applyTheme(newTheme);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [applyTheme]);

  const setTheme = useCallback(
    (newTheme: Theme) => {
      setThemeState(newTheme);
      setStoredTheme(newTheme); // Persist to localStorage (Requirement 12.4)
      applyTheme(newTheme);
    },
    [applyTheme]
  );

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  const value: ThemeContextValue = {
    theme,
    setTheme,
    toggleTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
