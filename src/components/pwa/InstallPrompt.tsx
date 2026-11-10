import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';

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
    <div className="pb-safe fixed inset-x-3 bottom-24 z-40 flex items-center gap-2 rounded-btn bg-gradient-to-r from-accent to-accent2 px-4 py-2 text-white shadow-frame">
      <span className="flex-1 text-small font-semibold">{t('pwa.installPrompt')}</span>
      <Button
        variant="secondary"
        className="min-h-tap w-auto px-3"
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
        className="min-h-tap px-2 text-caption font-bold text-white/80"
        onClick={() => {
          localStorage.setItem('pwa-install-dismissed', '1');
          setDismissed(true);
        }}
      >
        ✕
      </button>
    </div>
  );
}
