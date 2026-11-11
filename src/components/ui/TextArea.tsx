import { useId, type TextareaHTMLAttributes } from 'react';
import { cx } from '@/lib/cx';

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  /** Renders the value in the monospaced face. */
  mono?: boolean;
}

/** Multi-line variant of TextField with the same tokens. */
export function TextArea({ label, error, mono, id, className, ...rest }: TextAreaProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;

  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={inputId}
        className="eyebrow text-[10px] font-medium tracking-widest text-muted"
      >
        {label}
      </label>
      <textarea
        id={inputId}
        rows={rest.rows ?? 3}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cx(
          'rounded-field border border-line bg-surface px-2.5 py-2 text-body leading-relaxed text-ink',
          'placeholder:text-faint focus:border-accent',
          mono && 'font-mono',
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
