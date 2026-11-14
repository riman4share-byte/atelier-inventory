import { useEffect, useRef, type ReactNode } from 'react';
import { XIcon } from '@/components/icons';
import { Button } from '@/components/ui/Button';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  /** Max height of the sheet content. Defaults to 90dvh. */
  maxHeight?: string;
  /** Optional test id on the sheet container. */
  testId?: string;
}

/**
 * Bottom sheet with proper dialog semantics: role="dialog", aria-modal,
 * focus trap, Escape to close, and body scroll lock while open.
 *
 * Use this instead of hand-rolled fixed-position divs so every sheet behaves
 * the same way and is reachable by keyboard and screen readers.
 */
export function Sheet({ open, onClose, title, children, maxHeight = '90dvh', testId }: SheetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement as HTMLElement | null;
    // Lock body scroll.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus the first focusable element.
    const focusable = containerRef.current?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    focusable?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const container = containerRef.current;
      if (!container) return;
      const nodes = container.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
      previousFocus.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col justify-end"
      data-testid={testId}
      role="dialog"
      aria-modal="true"
      aria-label={typeof title === 'string' ? title : undefined}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="flex-1 bg-black/30"
        tabIndex={-1}
      />
      <div
        ref={containerRef}
        className="flex max-h-[90dvh] flex-col overflow-y-auto rounded-t-sheet border-t border-line bg-surface pb-safe"
        style={{ maxHeight }}
      >
        {title ? (
          <header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-line bg-surface px-3 py-2">
            <h2 className="text-title font-semibold tracking-tight text-ink">{title}</h2>
            <Button
              variant="ghost"
              size="sm"
              fullWidth={false}
              aria-label="Close"
              onClick={onClose}
              className="w-8 !px-0"
            >
              <XIcon className="h-4 w-4" />
            </Button>
          </header>
        ) : null}
        <div className="flex flex-col gap-3 px-3 pb-3 pt-3">{children}</div>
      </div>
    </div>
  );
}
