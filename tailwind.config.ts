import type { Config } from 'tailwindcss';

/**
 * INSTRUMENT — Tailwind tokens.
 *
 * Every colour resolves to a CSS variable in src/styles/index.css, so the
 * light and dark schemes share one set of class names. There are no shadows
 * and no gradients in this file by design: separation is done with 1px
 * hairlines and tonal steps.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        'surface-3': 'var(--surface-3)',
        ink: 'var(--ink)',
        muted: 'var(--muted)',
        faint: 'var(--faint)',
        line: 'var(--line)',
        'line-strong': 'var(--line-strong)',
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          ink: 'var(--accent-ink)',
          bg: 'var(--accent-bg)',
          line: 'var(--accent-line)',
        },
        ok: {
          DEFAULT: 'var(--ok)',
          bg: 'var(--ok-bg)',
          line: 'var(--ok-line)',
        },
        warn: {
          DEFAULT: 'var(--warn)',
          bg: 'var(--warn-bg)',
          line: 'var(--warn-line)',
        },
        info: {
          DEFAULT: 'var(--info)',
          bg: 'var(--info-bg)',
          line: 'var(--info-line)',
        },
        off: {
          DEFAULT: 'var(--off)',
          bg: 'var(--off-bg)',
          line: 'var(--off-line)',
        },
        danger: {
          DEFAULT: 'var(--danger)',
          bg: 'var(--danger-bg)',
          line: 'var(--danger-line)',
        },
        c1: 'var(--c1)',
        c2: 'var(--c2)',
        c3: 'var(--c3)',
        c4: 'var(--c4)',
      },
      fontFamily: {
        sans: ['Instrument Sans Variable', 'Segoe UI', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['Instrument Serif', 'Georgia', 'serif'],
        mono: ['Geist Mono Variable', 'SFMono-Regular', 'ui-monospace', 'Cascadia Mono', 'monospace'],
        arabic: ['Cairo Variable', 'Noto Naskh Arabic', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Dense technical scale. Data is monospaced by convention, not by
        // accident — see the `num` utility and the mono font token.
        micro: ['10px', { lineHeight: '1.3' }],
        eyebrow: ['10px', { lineHeight: '1.2' }],
        note: ['11px', { lineHeight: '1.4' }],
        caption: ['11.5px', { lineHeight: '1.4' }],
        small: ['12.5px', { lineHeight: '1.45' }],
        body: ['13.5px', { lineHeight: '1.5' }],
        input: ['16px', { lineHeight: '1.4' }],
        title: ['17px', { lineHeight: '1.25' }],
        hero: ['20px', { lineHeight: '1.15' }],
        metric: ['24px', { lineHeight: '1' }],
        'metric-lg': ['30px', { lineHeight: '1' }],
      },
      letterSpacing: {
        tight: '-0.02em',
        tighter: '-0.03em',
        widest: '0.08em',
      },
      borderRadius: {
        none: '0px',
        sm: '2px',
        pill: '3px',
        field: '4px',
        btn: '4px',
        tile: '4px',
        card: '6px',
        sheet: '6px',
      },
      // No boxShadow entries: this interface has none. Depth is tonal.
      spacing: {
        4.5: '1.125rem',
      },
      minHeight: {
        tap: '40px',
        btn: '32px',
      },
      minWidth: {
        tap: '40px',
        btn: '32px',
      },
    },
  },
  plugins: [],
} satisfies Config;
