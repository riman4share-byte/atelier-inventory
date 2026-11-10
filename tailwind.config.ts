import type { Config } from 'tailwindcss';

/**
 * Industrial design tokens — neutral, dense, no decoration.
 * Components use semantic classes (bg-surface, text-ink, rounded-card, ...)
 * so changing tokens here re-themes the whole app.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        ink: 'var(--ink)',
        muted: 'var(--muted)',
        line: 'var(--line)',
        soft: 'var(--soft)',
        accent: {
          DEFAULT: 'var(--accent)',
          ink: 'var(--accent-ink)',
        },
        accent2: 'var(--accent2)',
        gold: 'var(--gold)',
        c1: 'var(--c1)',
        c2: 'var(--c2)',
        c3: 'var(--c3)',
        c4: 'var(--c4)',
        ok: {
          DEFAULT: 'var(--ok)',
          bg: 'var(--ok-bg)',
        },
        warn: {
          DEFAULT: 'var(--warn)',
          bg: 'var(--warn-bg)',
        },
        info: {
          DEFAULT: 'var(--info)',
          bg: 'var(--info-bg)',
        },
        off: {
          DEFAULT: 'var(--off)',
          bg: 'var(--off-bg)',
        },
        danger: {
          DEFAULT: 'var(--danger)',
          bg: 'var(--danger-bg)',
        },
      },
      fontFamily: {
        serif: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        arabic: ['Cairo Variable', 'Noto Naskh Arabic', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        note: ['11px', { lineHeight: '1.4' }],
        caption: ['12px', { lineHeight: '1.4' }],
        small: ['13px', { lineHeight: '1.45' }],
        body: ['14px', { lineHeight: '1.5' }],
        input: ['16px', { lineHeight: '1.4' }],
        title: ['18px', { lineHeight: '1.3' }],
        hero: ['22px', { lineHeight: '1.2' }],
      },
      borderRadius: {
        pill: '4px',
        field: '4px',
        btn: '4px',
        tile: '4px',
        card: '4px',
        sheet: '8px',
      },
      boxShadow: {
        btn: '0 1px 2px rgba(0,0,0,0.08)',
        frame: '0 2px 8px rgba(0,0,0,0.12)',
      },
      spacing: {
        4.5: '1.125rem',
      },
      minHeight: {
        tap: '40px',
      },
      minWidth: {
        tap: '40px',
      },
      backgroundImage: {
        brand: 'linear-gradient(135deg, var(--accent) 0%, var(--accent2) 100%)',
      },
    },
  },
  plugins: [],
} satisfies Config;