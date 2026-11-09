import { useId, type InputHTMLAttributes } from 'react';
import { cx } from '@/lib/cx';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

export function TextField({ label, hint, error, id, className, ...rest }: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-caption font-semibold text-muted">
        {label}
      </label>
      {hint ? <p className="text-note text-muted">{hint}</p> : null}
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cx(
          'min-h-tap rounded-field border-[1.5px] border-line bg-surface px-3 py-2.5 text-input text-ink',
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
