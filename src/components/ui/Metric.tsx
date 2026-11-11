import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';

interface MetricProps {
  label: string;
  value: ReactNode;
  /** Small note under the value — a unit, a qualifier, a warning. */
  hint?: ReactNode;
  /** A status stripe across the top of the tile. */
  tone?: 'accent' | 'ok' | 'warn' | 'info' | 'off' | 'danger' | 'none';
  size?: 'md' | 'lg';
  className?: string;
}

const TONE_BAR: Record<string, string> = {
  accent: 'bg-accent',
  ok: 'bg-ok',
  warn: 'bg-warn',
  info: 'bg-info',
  off: 'bg-off',
  danger: 'bg-danger',
};

/**
 * A single reading. The number is monospaced so a column of them aligns and
 * a digit change does not reflow the layout — the behaviour you want from an
 * instrument rather than a marketing page.
 */
export function Metric({ label, value, hint, tone = 'none', size = 'md', className }: MetricProps) {
  return (
    <div className={cx('relative overflow-hidden rounded-card border border-line bg-surface', className)}>
      {tone !== 'none' ? (
        <span aria-hidden="true" className={cx('absolute inset-x-0 top-0 h-0.5', TONE_BAR[tone])} />
      ) : null}
      <div className="px-3 pb-2.5 pt-3">
        <p className="eyebrow truncate">{label}</p>
        <p
          className={cx(
            'mt-1.5 font-mono font-semibold tracking-tight text-ink',
            size === 'lg' ? 'text-metric-lg' : 'text-metric',
          )}
        >
          {value}
        </p>
        {hint ? <p className="mt-1 truncate text-note text-muted">{hint}</p> : null}
      </div>
    </div>
  );
}
