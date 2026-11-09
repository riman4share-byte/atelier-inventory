import { useTranslation } from 'react-i18next';
import { GownIcon } from '@/components/icons';
import { Screen } from '@/components/layout/Screen';

export function DressesPage() {
  const { t } = useTranslation();
  return (
    <Screen title={t('screens.dresses.title')}>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-card bg-c1 px-6 py-12 text-center">
        <GownIcon className="h-28 w-auto text-accent" />
        <p className="max-w-[30ch] text-small text-ink">{t('screens.dresses.body')}</p>
      </div>
    </Screen>
  );
}
