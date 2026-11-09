import type { ButtonHTMLAttributes } from 'react';
import { cx } from '@/lib/cx';
import { Spinner } from './Spinner';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  fullWidth?: boolean;
  loading?: boolean;
}

export function Button({
  variant = 'primary',
  fullWidth = true,
  loading = false,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cx(
        'inline-flex min-h-tap items-center justify-center gap-2 rounded-btn px-4 py-[13px] text-body font-bold transition-[filter]',
        'disabled:cursor-not-allowed disabled:opacity-60',
        variant === 'primary' ? 'bg-brand text-white shadow-btn hover:brightness-105' : 'bg-soft text-accent',
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}
