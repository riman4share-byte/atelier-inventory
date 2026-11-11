import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '@/lib/cx';

interface PanelProps extends HTMLAttributes<HTMLElement> {
  /** Section legend — small, uppercase, wide tracking. */
  title?: string;
  /** Right-hand slot in the panel header: a count, a filter, a link. */
  action?: ReactNode;
  /** Removes the body padding for edge-to-edge tables. */
  flush?: boolean;
  children: ReactNode;
}

/**
 * A bordered section with a legend strip. Panels are the basic unit of the
 * console: flat surface, 1px hairline, no shadow, no floating card.
 */
export function Panel({
  title,
  action,
  flush,
  className,
  children,
  ...rest
}: PanelProps) {
  return (
    <section className={cx('rounded-card border border-line bg-surface', className)} {...rest}>
      {title ? (
        <header className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
          <h2 className="eyebrow">{title}</h2>
          {action}
        </header>
      ) : null}
      <div className={flush ? undefined : 'p-3'}>{children}</div>
    </section>
  );
}
