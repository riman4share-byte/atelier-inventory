import type { ReactNode } from 'react';
import { LanguageToggle } from './LanguageToggle';

interface ScreenProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}

/**
 * Standard phone-width screen: serif title, optional action, scrollable body.
 * The language switch sits on every screen so staff can flip languages
 * without opening the admin settings.
 */
export function Screen({ title, subtitle, action, children }: ScreenProps) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-start justify-between gap-3 px-4 pb-4 pt-safe">
        <div className="pt-5">
          <h1 className="text-title">{title}</h1>
          {subtitle ? <p className="mt-1 text-caption text-muted">{subtitle}</p> : null}
        </div>
        <div className="pt-4">{action ?? <LanguageToggle />}</div>
      </header>
      <div className="flex flex-1 flex-col px-4 pb-8">{children}</div>
    </div>
  );
}
