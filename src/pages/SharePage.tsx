import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSharedDresses } from '@/features/dresses/api';
import { Spinner } from '@/components/ui/Spinner';

/**
 * Public read-only page behind a share link (Phase 3). No login, no app
 * shell, no navigation: whatever the creator shared is all there is. Status
 * never shows; prices only when the link was created with show_prices.
 */
export function SharePage() {
  const { t, i18n } = useTranslation();
  const { token = '' } = useParams<{ token: string }>();
  const dresses = useSharedDresses(token);

  const isArabic = i18n.language.startsWith('ar');
  const pick = (en: string, ar: string | null): string => (isArabic ? ar || en : en);

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col px-5 py-10" dir={isArabic ? 'rtl' : 'ltr'}>
      <header className="pb-6">
        <h1 className="text-hero font-serif font-semibold text-ink">{t('app.name')}</h1>
        <p className="mt-1 text-small text-muted">{t('share.pageSubtitle')}</p>
      </header>

      {dresses.isPending ? (
        <div className="flex justify-center py-14">
          <Spinner className="h-6 w-6 text-accent" />
        </div>
      ) : dresses.isError || (dresses.data ?? []).length === 0 ? (
        <div className="rounded-card bg-soft p-6 text-center">
          <p className="text-body font-semibold text-ink">{t('share.unavailableTitle')}</p>
          <p className="mt-2 text-small text-muted">{t('share.unavailableBody')}</p>
        </div>
      ) : (
        <main className="flex flex-1 flex-col gap-5" data-testid="share-list">
          {dresses.data?.map((dress) => (
            <article key={dress.id} className="rounded-card bg-surface p-4 shadow-frame">
              <h2 className="text-title font-serif font-semibold text-ink">
                {pick(dress.name_en, dress.name_ar) || dress.code}
              </h2>
              <p className="mt-0.5 text-note text-muted">{dress.code}</p>
              {pick(dress.description_en ?? '', dress.description_ar ?? '') ? (
                <p className="mt-3 text-small text-ink">
                  {pick(dress.description_en ?? '', dress.description_ar ?? '')}
                </p>
              ) : null}
              {dress.sale_price !== null || dress.rent_price !== null ? (
                <p className="mt-3 flex gap-4 text-small font-bold text-ink">
                  {dress.sale_price !== null ? (
                    <span>
                      <span className="font-medium text-muted">{t('dress.salePrice')}: </span>
                      {dress.sale_price}
                    </span>
                  ) : null}
                  {dress.rent_price !== null ? (
                    <span>
                      <span className="font-medium text-muted">{t('dress.rentPrice')}: </span>
                      {dress.rent_price}
                    </span>
                  ) : null}
                </p>
              ) : null}
            </article>
          ))}
          <p className="text-note text-muted">{t('share.footerNote')}</p>
        </main>
      )}
    </div>
  );
}
