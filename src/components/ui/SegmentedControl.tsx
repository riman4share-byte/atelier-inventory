import { cx } from '@/lib/cx';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  label: string;
  options: ReadonlyArray<SegmentOption<T>>;
  value: T;
  onChange: (value: T) => void;
}

/**
 * A segmented switch, drawn as a row of cells inside a single hairline frame.
 * The active cell is the accent; everything else is neutral. Reads like a
 * hardware toggle rather than a set of pills.
 */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <div role="group" aria-label={label} className="inline-flex overflow-hidden rounded-field border border-line">
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={cx(
              'h-8 px-3 text-caption font-semibold tracking-tight transition-colors duration-100',
              index > 0 && 'border-l border-line',
              selected
                ? 'bg-accent text-accent-ink'
                : 'bg-surface text-muted hover:bg-surface-2 hover:text-ink',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
