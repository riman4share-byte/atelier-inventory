import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSharedDresses } from '@/features/dresses/api';
import { Spinner } from '@/components/ui/Spinner';

/**
 * Public read-only page behind a share link (Phase 3). No login, no app
 * shell, no navigation: whatever the creator shared is all there is. Status
 * never shows; prices only when the link was created with show_prices.
 *
 * This page is for a customer on a phone, not for staff, so it stays calm:
 * one centred column, hairline-framed cards, no chrome.
 */
export function SharePage() {
  const { t, i18n } = useTranslation();
  const { token = '' } = useParams<{ token: string }>();
  const dresses = useSharedDresses(token);

  const isArabic = i18n.language.startsWith('ar');
  const pick = (en: string, ar: string | null): string => (isArabic ? ar || en : en);

  return (
    <div
      className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-10"
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      <header className="pb-6">
        <h1 className="text-hero font-semibold tracking-tight text-ink">{t('app.name')}</h1>
        <p className="mt-1.5 text-small text-muted">{t('share.pageSubtitle')}</p>
      </header>

      {dresses.isPending ? (
        <div className="flex justify-center py-14">
          <Spinner className="h-5 w-5 text-accent" />
        </div>
      ) : dresses.isError || (dresses.data ?? []).length === 0 ? (
        <div className="rounded-card border border-line bg-surface p-5 text-center">
          <p className="text-body font-semibold text-ink">{t('share.unavailableTitle')}</p>
          <p className="mt-2 text-small text-muted">{t('share.unavailableBody')}</p>
        </div>
      ) : (
        <main className="flex flex-1 flex-col gap-3" data-testid="share-list">
          {dresses.data?.map((dress) => (
            <article key={dress.id} className="rounded-card border border-line bg-surface p-4">
              <h2 className="text-title font-semibold tracking-tight text-ink">
                {pick(dress.name_en, dress.name_ar) || dress.code}
              </h2>
              <p className="mt-1 font-mono text-caption tracking-tight text-muted">{dress.code}</p>
              {pick(dress.description_en ?? '', dress.description_ar ?? '') ? (
                <p className="mt-3 text-small leading-relaxed text-ink">
                  {pick(dress.description_en ?? '', dress.description_ar ?? '')}
                </p>
              ) : null}
              {dress.sale_price !== null || dress.rent_price !== null ? (
                <dl className="mt-3 flex flex-col gap-1 border-t border-line pt-3">
                  {dress.sale_price !== null ? (
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-small text-muted">{t('dress.salePrice')}</dt>
                      <dd className="font-mono text-body font-semibold tracking-tight text-ink">
                        {dress.sale_price}
                      </dd>
                    </div>
                  ) : null}
                  {dress.rent_price !== null ? (
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-small text-muted">{t('dress.rentPrice')}</dt>
                      <dd className="font-mono text-body font-semibold tracking-tight text-ink">
                        {dress.rent_price}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              ) : null}
            </article>
          ))}
          <p className="mt-1 text-note text-faint">{t('share.footerNote')}</p>
        </main>
      )}
    </div>
  );
}
