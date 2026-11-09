import type { Config } from 'tailwindcss';

/**
 * Design tokens live as CSS variables in src/styles/index.css (Appendix A).
 * Everything here maps to a token so light/dark and future themes need no
 * component changes and no hex value ever appears in a className.
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
        serif: ['Fraunces Variable', 'Iowan Old Style', 'Palatino Linotype', 'Palatino', 'Georgia', 'serif'],
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        arabic: ['Cairo Variable', 'Noto Naskh Arabic', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        note: ['11px', { lineHeight: '1.4' }],
        caption: ['12px', { lineHeight: '1.4' }],
        small: ['13px', { lineHeight: '1.45' }],
        body: ['14px', { lineHeight: '1.5' }],
        input: ['16px', { lineHeight: '1.4' }],
        title: ['20px', { lineHeight: '1.3' }],
        hero: ['24px', { lineHeight: '1.2' }],
      },
      borderRadius: {
        pill: '99px',
        field: '12px',
        btn: '16px',
        tile: '18px',
        card: '20px',
        sheet: '30px',
      },
      boxShadow: {
        btn: '0 8px 16px -10px var(--accent)',
        frame: '0 14px 34px -18px var(--accent)',
      },
      spacing: {
        4.5: '1.125rem',
      },
      minHeight: {
        tap: '44px',
      },
      minWidth: {
        tap: '44px',
      },
      backgroundImage: {
        brand: 'linear-gradient(135deg, var(--accent) 0%, var(--accent2) 100%)',
      },
    },
  },
  plugins: [],
} satisfies Config;
