import { useTranslation } from 'react-i18next';
import { CameraIcon } from '@/components/icons';
import { Screen } from '@/components/layout/Screen';

export function CapturePage() {
  const { t } = useTranslation();
  return (
    <Screen title={t('screens.capture.title')}>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-card bg-c2 px-6 py-12 text-center">
        <CameraIcon className="h-12 w-12 text-accent2" />
        <p className="max-w-[30ch] text-small text-ink">{t('screens.capture.body')}</p>
      </div>
    </Screen>
  );
}
