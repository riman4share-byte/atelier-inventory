import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { RefreshIcon } from '@/components/icons';
import { useOfflineSync } from '@/features/offline/useQueue';

/**
 * A strip above the bottom navigation that appears only while something is
 * waiting to upload. It tells staff their photos are safe, and lets them try
 * again immediately instead of waiting for the background worker.
 */
export function PendingUploads() {
  const { t } = useTranslation();
  const { pending, syncing, syncNow } = useOfflineSync();

  if (pending === 0) return null;

  return (
    <div
      className="shrink-0 border-t border-line bg-surface-2 px-4 py-2"
      role="status"
      data-testid="pending-uploads"
    >
      <div className="flex items-center gap-3">
        <span className="min-w-0 flex-1">
          <span className="eyebrow mb-0.5 block text-warn">{t('offline.pendingTitle')}</span>
          <span className="block truncate text-small text-ink">
            {t('offline.pendingBody', { count: pending })}
          </span>
        </span>
        <Button
          variant="secondary"
          size="sm"
          className="w-auto shrink-0 px-2.5"
          loading={syncing}
          onClick={syncNow}
        >
          <RefreshIcon className="h-3.5 w-3.5" />
          {t('offline.retry')}
        </Button>
      </div>
    </div>
  );
}
