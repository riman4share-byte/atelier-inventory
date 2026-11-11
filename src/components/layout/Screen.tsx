import type { ReactNode } from 'react';
import { LanguageToggle } from './LanguageToggle';

interface ScreenProps {
  title: string;
  subtitle?: string;
  /** Small uppercase section label above the title — the instrument legend. */
  eyebrow?: string;
  action?: ReactNode;
  children: ReactNode;
}

/**
 * Screen chrome: a sticky hairline header carrying the section context, and a
 * body on a strict vertical rhythm. The language switch stays on every screen
 * so staff can flip languages without finding the owner settings.
 */
export function Screen({ title, subtitle, eyebrow, action, children }: ScreenProps) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 flex items-start gap-3 border-b border-line bg-surface px-4 pb-3 pt-3 pt-safe">
        <div className="min-w-0 flex-1">
          {eyebrow ? <p className="eyebrow mb-1">{eyebrow}</p> : null}
          <h1 className="truncate text-title font-semibold tracking-tight text-ink">{title}</h1>
          {subtitle ? <p className="mt-0.5 truncate text-note text-muted">{subtitle}</p> : null}
        </div>
        <div className="shrink-0 pt-0.5">{action ?? <LanguageToggle />}</div>
      </header>
      <div className="flex flex-1 flex-col gap-3 px-4 py-4">{children}</div>
    </div>
  );
}
