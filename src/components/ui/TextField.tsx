import { useId, type InputHTMLAttributes } from 'react';
import { cx } from '@/lib/cx';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
  /** Renders the value in the monospaced face — use for codes, prices, counts. */
  mono?: boolean;
}

/**
 * Label, control and message on a strict vertical rhythm. The label is
 * uppercase and wide-tracked like an instrument panel legend, not a sentence.
 */
export function TextField({
  label,
  hint,
  error,
  mono,
  id,
  className,
  ...rest
}: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={inputId}
        className="eyebrow text-[10px] font-medium tracking-widest text-muted"
      >
        {label}
      </label>
      {hint ? (
        <p id={hintId} className="text-note text-faint">
          {hint}
        </p>
      ) : null}
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        className={cx(
          'h-9 rounded-field border border-line bg-surface px-2.5 text-body text-ink',
          'placeholder:text-faint focus:border-accent',
          mono && 'font-mono tracking-tight',
          error && 'border-danger',
          className,
        )}
        {...rest}
      />
      {error ? (
        <p id={errorId} className="text-note text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
