import { useTranslation } from 'react-i18next';
import { GemIcon } from '@/components/icons';
import { Screen } from '@/components/layout/Screen';

export function MaterialsPage() {
  const { t } = useTranslation();
  return (
    <Screen title={t('screens.materials.title')}>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-card bg-c4 px-6 py-12 text-center">
        <GemIcon className="h-12 w-12 text-ok" />
        <p className="max-w-[30ch] text-small text-ink">{t('screens.materials.body')}</p>
      </div>
    </Screen>
  );
}
