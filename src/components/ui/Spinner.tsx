import { cx } from '@/lib/cx';

/** A thin, fast spinner — 1.5px stroke, matching the icon weight. */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'inline-block animate-spin rounded-full border-[1.5px] border-current border-t-transparent',
        className,
      )}
    />
  );
}
