/**
 * Theme management hook with system preference detection
 *
 * Provides theme state and controls for:
 * - System: follows OS preference
 * - Light: forces light mode
 * - Dark: forces dark mode
 */

import { useState, useEffect, useCallback } from 'react';
import { getStorageItem, setStorageItem, STORAGE_KEYS } from '../utils/storage';

/**
 * Available theme options
 */
export type Theme = 'system' | 'light' | 'dark';

/**
 * Resolved theme (what is actually applied)
 */
export type ResolvedTheme = 'light' | 'dark';

/**
 * Return type of useTheme hook
 */
export interface UseThemeReturn {
  /** Current theme setting (system/light/dark) */
  theme: Theme;
  /** Resolved theme that is actually applied (light/dark) */
  resolvedTheme: ResolvedTheme;
  /** Update the theme setting */
  setTheme: (theme: Theme) => void;
}

/**
 * Media query for detecting system dark mode preference
 */
const DARK_MODE_QUERY = '(prefers-color-scheme: dark)';

/**
 * Get the system's preferred color scheme
 */
function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia(DARK_MODE_QUERY).matches ? 'dark' : 'light';
}

/**
 * Resolve theme setting to actual theme
 */
function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === 'system') {
    return getSystemTheme();
  }
  return theme;
}

/**
 * Apply theme to document root element
 */
function applyTheme(resolvedTheme: ResolvedTheme): void {
  const root = document.documentElement;
  if (resolvedTheme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

/**
 * Hook for managing theme with system preference detection
 *
 * @example
 * ```tsx
 * const { theme, resolvedTheme, setTheme } = useTheme();
 *
 * // Show current theme
 * console.log(`Theme: ${theme}, Resolved: ${resolvedTheme}`);
 *
 * // Change theme
 * setTheme('dark');
 * ```
 */
export function useTheme(): UseThemeReturn {
  // Initialize theme from storage or default to 'system'
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = getStorageItem(STORAGE_KEYS.THEME);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
    return 'system';
  });

  // Track the resolved theme (what is actually displayed)
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    return resolveTheme(theme);
  });

  // Update theme and persist to storage
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    setStorageItem(STORAGE_KEYS.THEME, newTheme);
  }, []);

  // Apply theme changes and listen for system preference changes
  useEffect(() => {
    const resolved = resolveTheme(theme);
    setResolvedTheme(resolved);
    applyTheme(resolved);

    // If using system theme, listen for preference changes
    if (theme === 'system') {
      const mediaQuery = window.matchMedia(DARK_MODE_QUERY);

      const handleChange = (e: MediaQueryListEvent) => {
        const newResolved = e.matches ? 'dark' : 'light';
        setResolvedTheme(newResolved);
        applyTheme(newResolved);
      };

      // Use addEventListener for modern browsers
      mediaQuery.addEventListener('change', handleChange);

      return () => {
        mediaQuery.removeEventListener('change', handleChange);
      };
    }
  }, [theme]);

  return {
    theme,
    resolvedTheme,
    setTheme,
  };
}
