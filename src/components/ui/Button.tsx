import type { ButtonHTMLAttributes } from 'react';
import { cx } from '@/lib/cx';
import { Spinner } from './Spinner';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  loading?: boolean;
}

/**
 * A control on a console: flat fill, 1px hairline, 34px tall. The primary
 * variant is the only place the accent hue appears, which is what keeps the
 * interface from turning into a wall of blue.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = true,
  loading = false,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  // Tailwind emits `.w-auto` before `.w-full`, so a `w-full` from this
  // component would beat a `w-auto` passed in `className` no matter how the
  // classes are ordered in the source. Detect an explicit width on the
  // caller's side and stand down.
  const callerSetsWidth = className?.split(/\s+/).some((token) => /^!?w-/.test(token));

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cx(
        'inline-flex select-none items-center justify-center gap-2 rounded-btn border font-semibold tracking-tight',
        'transition-colors duration-100 disabled:cursor-not-allowed disabled:opacity-45',
        size === 'sm' ? 'h-8 px-2.5 text-caption' : 'h-[34px] px-3.5 text-small',
        variant === 'primary' && 'border-accent bg-accent text-accent-ink hover:bg-accent-hover',
        variant === 'secondary' &&
          'border-line bg-surface-2 text-ink hover:border-line-strong hover:bg-surface-3',
        variant === 'ghost' && 'border-transparent bg-transparent text-muted hover:bg-surface-2 hover:text-ink',
        variant === 'danger' && 'border-danger-line bg-danger-bg text-danger hover:border-danger',
        fullWidth && !callerSetsWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner className="h-3.5 w-3.5" /> : null}
      {children}
    </button>
  );
}
