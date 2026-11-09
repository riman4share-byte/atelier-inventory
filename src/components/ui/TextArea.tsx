import { useId, type TextareaHTMLAttributes } from 'react';
import { cx } from '@/lib/cx';

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

/** Multi-line variant of TextField with the same visual tokens. */
export function TextArea({ label, error, id, className, ...rest }: TextAreaProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-caption font-semibold text-muted">
        {label}
      </label>
      <textarea
        id={inputId}
        rows={rest.rows ?? 3}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cx(
          'rounded-field border-[1.5px] border-line bg-surface px-3 py-2.5 text-input text-ink',
          'placeholder:text-muted focus:border-accent',
          error && 'border-danger',
          className,
        )}
        {...rest}
      />
      {error ? (
        <p id={errorId} className="text-caption text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
