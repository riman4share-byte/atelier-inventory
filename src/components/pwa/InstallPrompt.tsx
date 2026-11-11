import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { XIcon } from '@/components/icons';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** Shows an "Install app" button when the browser offers it (Android Chrome). */
export function InstallPrompt() {
  const { t } = useTranslation();
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('pwa-install-dismissed') === '1');

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (dismissed || !event) return null;

  return (
    <div className="pb-safe fixed inset-x-3 bottom-20 z-40 flex items-center gap-2 rounded-card border border-line bg-surface px-3 py-2 md:bottom-4">
      <span className="flex-1 text-small text-ink">{t('pwa.installPrompt')}</span>
      <Button
        size="sm"
        className="w-auto px-2.5"
        onClick={async () => {
          await event.prompt();
          const choice = await event.userChoice;
          if (choice.outcome === 'accepted') setEvent(null);
        }}
      >
        {t('pwa.install')}
      </Button>
      <button
        type="button"
        aria-label={t('common.close')}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-field text-muted transition-colors hover:bg-surface-2 hover:text-ink"
        onClick={() => {
          localStorage.setItem('pwa-install-dismissed', '1');
          setDismissed(true);
        }}
      >
        <XIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
