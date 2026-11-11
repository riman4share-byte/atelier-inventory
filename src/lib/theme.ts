/**
 * Theme control.
 *
 * The palette has always had a light and a dark scheme; until now the app
 * followed the operating system and gave the user no say. This adds an
 * explicit choice — light, dark, or follow the system — persisted per device
 * and applied as a `data-theme` attribute on the document element.
 */

export const THEMES = ['light', 'dark', 'system'] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_STORAGE_KEY = 'atelier.theme';

export function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && (THEMES as readonly string[]).includes(value);
}

export function readStoredTheme(): Theme {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(raw) ? raw : 'system';
  } catch {
    return 'system';
  }
}

export function storeTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage can be unavailable (private mode, disabled cookies). The theme
    // still applies for this session; it just will not be remembered.
  }
}

/** What the user sees right now, once "system" is resolved. */
export function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    return typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  return theme;
}

/**
 * Applies the theme to the document and keeps the browser chrome (the Android
 * status bar and the installed-PWA title bar) in the same colour, so a dark
 * app does not sit under a white bar.
 */
export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);

  const resolved = resolveTheme(theme);
  root.style.colorScheme = resolved;

  const meta = document.querySelector('meta[name="theme-color"]:not([media])');
  if (meta) meta.setAttribute('content', resolved === 'dark' ? '#0a0a0c' : '#f1f5f9');
}

/** Listens for the OS switching while the theme is set to "system". */
export function watchSystemTheme(onChange: (resolved: 'light' | 'dark') => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => undefined;
  const query = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = () => onChange(query.matches ? 'dark' : 'light');
  query.addEventListener('change', handler);
  return () => query.removeEventListener('change', handler);
}
