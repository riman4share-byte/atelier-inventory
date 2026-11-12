import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/layout/Screen';
import { Panel } from '@/components/ui/Panel';

/**
 * A single help section: a title and a short paragraph. Kept deliberately
 * short so the owner can read it on a tablet in a minute.
 */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Panel title={title}>
      <div className="flex flex-col gap-2 text-small leading-relaxed text-ink">{children}</div>
    </Panel>
  );
}

/**
 * Plain-English help for the atelier owner and staff.
 *
 * The app has a lot of moving parts (dresses, photos, materials, customers,
 * movements, exports, the public page, settings). This page is the one place
 * that explains all of them in one screen, so a new staff member on a shared
 * tablet can find their way without asking.
 */
export function HelpPage() {
  const { t } = useTranslation();
  return (
    <Screen title={t('help.title')} subtitle={t('help.subtitle')}>
      <div className="flex flex-1 flex-col gap-3">
        <Section title={t('help.whatTitle')}>
          <p>{t('help.whatBody')}</p>
        </Section>

        <Section title={t('help.startTitle')}>
          <p>{t('help.startBody1')}</p>
          <p>{t('help.startBody2')}</p>
        </Section>

        <Section title={t('help.dressesTitle')}>
          <p>{t('help.dressesBody1')}</p>
          <p>{t('help.dressesBody2')}</p>
          <p>{t('help.dressesBody3')}</p>
        </Section>

        <Section title={t('help.categoriesTitle')}>
          <p>{t('help.categoriesBody')}</p>
        </Section>

        <Section title={t('help.photosTitle')}>
          <p>{t('help.photosBody1')}</p>
          <p>{t('help.photosBody2')}</p>
        </Section>

        <Section title={t('help.materialsTitle')}>
          <p>{t('help.materialsBody')}</p>
        </Section>

        <Section title={t('help.customersTitle')}>
          <p>{t('help.customersBody')}</p>
        </Section>

        <Section title={t('help.movementsTitle')}>
          <p>{t('help.movementsBody1')}</p>
          <p>{t('help.movementsBody2')}</p>
          <p>{t('help.movementsBody3')}</p>
        </Section>

        <Section title={t('help.exportTitle')}>
          <p>{t('help.exportBody1')}</p>
          <p>{t('help.exportBody2')}</p>
          <p>{t('help.exportBody3')}</p>
        </Section>

        <Section title={t('help.publicTitle')}>
          <p>{t('help.publicBody1')}</p>
          <p>{t('help.publicBody2')}</p>
        </Section>

        <Section title={t('help.settingsTitle')}>
          <p>{t('help.settingsBody1')}</p>
          <p>{t('help.settingsBody2')}</p>
          <p>{t('help.settingsBody3')}</p>
        </Section>

        <Section title={t('help.cameraTitle')}>
          <p>{t('help.cameraBody1')}</p>
          <p>{t('help.cameraBody2')}</p>
        </Section>

        <Section title={t('help.faqTitle')}>
          <p>{t('help.faq1')}</p>
          <p>{t('help.faq2')}</p>
          <p>{t('help.faq3')}</p>
        </Section>
      </div>
    </Screen>
  );
}
