import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { FullScreenLoader } from '@/components/layout/FullScreenLoader';
import { Screen } from '@/components/layout/Screen';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { ImageIcon, LinkIcon, PencilIcon, QrIcon, TrashIcon } from '@/components/icons';
import {
  dressErrorMessage,
  useCreateDress,
  useDress,
  useDressPhotos,
  useSoftDeleteDress,
  useSuggestedCode,
  useUpdateDress,
  type DressRow,
} from './api';
import { useDressMovements } from '@/features/movements/api';
import { CheckOutSheet } from '@/features/movements/CheckOutSheet';
import { CheckInSheet } from '@/features/movements/CheckInSheet';
import { ReserveSheet } from '@/features/movements/ReserveSheet';
import { AvailabilityCalendar } from './AvailabilityCalendar';
import { emptyDressForm, DressForm, dressRowToForm, formToPayload } from './DressForm';
import { categoryLabel, toCategory } from './categories';
import { useDescribeDress, aiErrorMessage } from '@/features/ai/api';
import { useAtelierBranding } from '@/features/branding/useAtelierBranding';
import { DressAiReview } from '@/features/ai/DressAiReview';
import { PhotoGallery } from '@/features/photos/PhotoGallery';
import { useEnqueueErpSync } from '@/features/erp/api';
import { BackgroundCleaner } from '@/features/cleanup/BackgroundCleaner';
import { buildHangTagHtml, printHtml } from '@/features/dresses/printDocument';

const STATUS_OPTIONS: ReadonlyArray<{ value: DressRow['status']; labelKey: string }> = [
  { value: 'available', labelKey: 'status.available' },
  { value: 'reserved', labelKey: 'status.reserved' },
  { value: 'rented', labelKey: 'status.rented' },
  { value: 'sold', labelKey: 'status.sold' },
];

const LISTING_LABELS: Record<DressRow['listing_type'], string> = {
  sale: 'dress.listingSale',
  rent: 'dress.listingRent',
  both: 'dress.listingBoth',
};

/**
 * The name to show for a dress. A dress that has not been named yet falls
 * back to its code, which is also the page eyebrow — showing both would
 * print the same thing twice.
 */
function displayName(dress: DressRow, language: string): string {
  const isArabic = language.startsWith('ar');
  const primary = isArabic ? dress.name_ar : dress.name_en;
  const fallback = isArabic ? dress.name_en : dress.name_ar;
  return primary || fallback || dress.code;
}

/** Create flow: /dresses/new */
function CreateDress() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const suggested = useSuggestedCode(true);
  const create = useCreateDress();

  if (suggested.isPending) return <FullScreenLoader />;

  const initialValues = emptyDressForm(suggested.data ?? '');

  return (
    <Screen title={t('dress.newTitle')}>
      <div className="flex flex-1 flex-col gap-4 pb-4">
        <DressForm
          initial={initialValues}
          savingLabel={t('dress.saving')}
          pending={create.isPending}
          submitError={
            create.isError
              ? dressErrorMessage(create.error) === 'duplicate_code'
                ? t('dress.errors.duplicateCode')
                : t('dress.errors.saveFailed')
              : null
          }
          onSubmit={(values) => {
            const suggestedCode = suggested.data ?? '';
            const code = values.code.trim() === suggestedCode.trim() ? '' : values.code.trim();
            create.mutate(formToPayload({ ...values, code }), {
              onSuccess: (dress) => navigate(`/dresses/${dress.id}`, { replace: true }),
            });
          }}
          onCancel={() => navigate('/dresses')}
        />
      </div>
    </Screen>
  );
}

/** One dress: view with edit and soft delete, or the edit form. */
function ExistingDress({ id }: { id: string }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isDraft = searchParams.get('draft') === '1';
  const dressQuery = useDress(id);
  const photosQuery = useDressPhotos(id, { enabled: dressQuery.data?.found === true });
  const movementsQuery = useDressMovements(id);
  const statusUpdate = useUpdateDress();
  const formUpdate = useUpdateDress();
  const softDelete = useSoftDeleteDress();
  const describe = useDescribeDress();
  const erpSync = useEnqueueErpSync();
  // The atelier's name and logo, for the printed tag.
  const branding = useAtelierBranding();

  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteFailed, setDeleteFailed] = useState(false);
  const [aiOpen, setAiOpen] = useState(isDraft);
  const [aiDraft, setAiDraft] = useState<import('@/features/ai/api').DressDraft | null>(null);
  const [aiRaw, setAiRaw] = useState<unknown>(null);
  const [aiModel, setAiModel] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  // The photograph was refused: it is not a garment. The AI panel does not
  // open; the reason is shown instead.
  const [aiRejected, setAiRejected] = useState<{ subject: string; reason: string } | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [reserveOpen, setReserveOpen] = useState(false);
  // The background remover is a tool, not part of the page: it opens only
  // when the owner asks for it.
  const [cleanerOpen, setCleanerOpen] = useState(false);

  // Auto-trigger AI on draft dresses with photos and no name yet
  useEffect(() => {
    if (!isDraft) return;
    if (!dressQuery.data?.found || !dressQuery.data.dress) return;
    const dress = dressQuery.data.dress;
    if (dress.name_en || dress.description_en) return;
    if (photosQuery.isLoading) return;
    if ((photosQuery.data ?? []).length === 0) return;
    if (describe.isPending || describe.data) return;
    setAiError(null);
    setAiRejected(null);
    describe.mutate({ dress }, {
      onSuccess: (result) => {
          // The photo was refused: it is not a garment. Nothing to review.
          if (result && 'rejected' in result && result.rejected) {
            setAiRejected({ subject: result.subject, reason: result.reason });
            setAiOpen(false);
            return;
          }
          // A malformed answer must not crash the page.
          if (!result || !('draft' in result) || !result.draft) { setAiError('unknown'); return; }
          setAiDraft(result.draft);
          setAiRaw(result.raw);
          setAiModel(result.model);
          setAiOpen(true);
        },
      onError: (error) => setAiError(aiErrorMessage(error)),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDraft, dressQuery.data, photosQuery.data, photosQuery.isLoading]);

  if (dressQuery.isLoading || photosQuery.isLoading) return <FullScreenLoader />;

  if (dressQuery.isError) {
    return (
      <Screen eyebrow={t('nav.dresses')} title={t('screens.dresses.title')}>
        <Panel className="flex flex-col items-center gap-3 px-6 py-10 text-center">
          <p className="text-body font-semibold text-ink">{t('dress.errors.loadFailedTitle')}</p>
          <p className="text-small text-muted">{t('dress.errors.loadFailedBody')}</p>
          <Button variant="secondary" className="w-auto px-4" onClick={() => void dressQuery.refetch()}>
            {t('common.retry')}
          </Button>
        </Panel>
      </Screen>
    );
  }

  if (!dressQuery.data?.found || !dressQuery.data.dress) {
    return (
      <Screen eyebrow={t('nav.dresses')} title={t('screens.dresses.title')}>
        <Panel className="flex flex-col items-center gap-3 px-6 py-10 text-center">
          <p className="text-body font-semibold text-ink">{t('dress.errors.notFoundTitle')}</p>
          <p className="text-small text-muted">{t('dress.errors.notFoundBody')}</p>
          <Button variant="secondary" className="w-auto px-4" onClick={() => navigate('/dresses')}>
            {t('dress.errors.backToList')}
          </Button>
        </Panel>
      </Screen>
    );
  }

  const dress = dressQuery.data.dress;
  const photos = photosQuery.data ?? [];

  if (editing) {
    return (
      <Screen title={t('dress.editTitle')} subtitle={dress.code}>
        <div className="flex flex-1 flex-col gap-4 pb-4">
          <DressForm
            initial={dressRowToForm(dress)}
            savingLabel={t('dress.saving')}
            pending={formUpdate.isPending}
            submitError={
              formUpdate.isError
                ? dressErrorMessage(formUpdate.error) === 'duplicate_code'
                  ? t('dress.errors.duplicateCode')
                  : t('dress.errors.saveFailed')
                : null
            }
            onSubmit={(values) =>
              formUpdate.mutate(
                { id: dress.id, values: formToPayload(values) },
                { onSuccess: () => setEditing(false) },
              )
            }
            onCancel={() => setEditing(false)}
          />
        </div>
      </Screen>
    );
  }

  const attributes = [
    {
      label: t('dress.category'),
      value: categoryLabel(dress.category, i18n.language.startsWith('ar')),
    },
    { label: t('dress.silhouette'), value: dress.silhouette },
    { label: t('dress.neckline'), value: dress.neckline },
    { label: t('dress.sleeves'), value: dress.sleeves },
    { label: t('dress.color'), value: dress.color },
    { label: t('dress.size'), value: dress.size_label },
  ].filter((attribute) => Boolean(attribute.value));

  const name = displayName(dress, i18n.language);
  // A dress that has no name yet shows the code as its eyebrow; repeating it
  // as the title would print the same value twice.
  const title = name === dress.code ? t('capture.draftName') : name;

  return (
    <Screen
      eyebrow={dress.code}
      title={title}
      subtitle={t(`status.${dress.status}`)}
    >
      <div
        className="flex flex-1 flex-col gap-3 pb-2 lg:grid lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start lg:gap-5"
      >
        {/* Left column: the visual record — photos and the AI panel. */}
        <div className="flex flex-col gap-3">
          <PhotoGallery dress={dress} photos={photos} />

          {isDraft ? (
            <div className="rounded-card border border-accent-line bg-accent-bg px-3 py-2.5 text-small text-ink">
              <span className="eyebrow mb-1 block text-accent">Draft</span>
              {t('dress.draftBanner')}
            </div>
          ) : null}

          {photos.length > 0 && !isDraft ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCleanerOpen(true)}
            >
              <ImageIcon className="h-3.5 w-3.5" />
              {t('cleanup.open')}
            </Button>
          ) : null}

          {aiOpen && aiDraft ? (
            <DressAiReview
              draft={aiDraft}
              pending={describe.isPending}
              onApply={(draft) => {
                formUpdate.mutate(
                  {
                    id: dress.id,
                    values: {
                      name_en: draft.name_en,
                      name_ar: draft.name_ar,
                      description_en: draft.description_en,
                      description_ar: draft.description_ar,
                      category: toCategory(draft.category),
                      silhouette: draft.silhouette,
                      neckline: draft.neckline,
                      sleeves: draft.sleeves,
                      color: draft.color,
                      fabrics: draft.fabrics,
                      ai_raw: aiRaw as never,
                      ai_model: aiModel,
                    },
                  },
                  { onSuccess: () => { setAiOpen(false); navigate(`/dresses/${dress.id}`, { replace: true }); } },
                );
              }}
              onRegenerate={() => {
                setAiError(null);
                setAiRejected(null);
                describe.mutate({ dress }, {
                  onSuccess: (result) => {
                    if (result && 'rejected' in result && result.rejected) {
                      setAiRejected({ subject: result.subject, reason: result.reason });
                      setAiOpen(false);
                      return;
                    }
                    if (!result || !('draft' in result) || !result.draft) { setAiError('unknown'); return; }
                    setAiDraft(result.draft); setAiRaw(result.raw); setAiModel(result.model); setAiOpen(true);
                  },
                  onError: (error) => setAiError(aiErrorMessage(error)),
                });
              }}
              onCancel={() => setAiOpen(false)}
            />
          ) : (
            <div className="flex flex-col gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setAiError(null);
                  setAiRejected(null);
                  describe.mutate({ dress }, {
                    onSuccess: (result) => {
                      if (result && 'rejected' in result && result.rejected) {
                        setAiRejected({ subject: result.subject, reason: result.reason });
                        setAiOpen(false);
                        return;
                      }
                      // A malformed answer must not crash the page.
                      if (!result || !('draft' in result) || !result.draft) { setAiError('unknown'); return; }
                      setAiDraft(result.draft); setAiRaw(result.raw); setAiModel(result.model); setAiOpen(true);
                    },
                    onError: (error) => setAiError(aiErrorMessage(error)),
                  });
                }}
                loading={describe.isPending}
                disabled={photos.length === 0}
              >
                {t('ai.describe')}
              </Button>
              {photos.length === 0 ? (
                <p className="text-note text-muted">{t('ai.needsPhotos')}</p>
              ) : null}
              {aiRejected ? (
                <Panel
                  className="border-warn-line bg-warn-bg px-3 py-3"
                  role="status"
                  data-testid="ai-rejected"
                >
                  <span className="eyebrow mb-1 block text-warn">{t('ai.notAGarment')}</span>
                  <p className="text-small text-ink">
                    {aiRejected.subject
                      ? t('ai.notAGarmentBody', { subject: aiRejected.subject })
                      : t('ai.notAGarmentBodyNoSubject')}
                  </p>
                  {aiRejected.reason ? (
                    <p className="mt-1 text-note text-muted">{aiRejected.reason}</p>
                  ) : null}
                </Panel>
              ) : null}
              {aiError ? (
                <p className="text-small text-danger" role="alert">
                  {aiError === 'no_key'
                    ? t('ai.noKey')
                    : aiError === 'no_photos'
                      ? t('ai.needsPhotos')
                      : aiError === 'unauthorized'
                        ? t('ai.notSignedIn')
                        : aiError === 'bad_image'
                          ? t('ai.badImage')
                          : aiError === 'parse_error'
                            ? t('ai.parseFailed')
                            : aiError === 'rate_limited'
                              ? t('ai.rateLimited')
                              : aiError === 'provider_error' || aiError === 'network_error'
                                ? t('ai.providerFailed')
                                : t('ai.failed')}
                </p>
              ) : null}
            </div>
          )}
        </div>

        {/* Right column: the facts and the actions. */}
        <div className="flex flex-col gap-3">

        <div>
          <span className="eyebrow mb-1.5 block">{t('dress.statusLabel')}</span>
          <SegmentedControl
            label={t('dress.statusLabel')}
            options={STATUS_OPTIONS.map((option) => ({
              value: option.value,
              label: t(option.labelKey),
            }))}
            value={dress.status}
            onChange={(value) =>
              statusUpdate.mutate({ id: dress.id, values: { status: value } })
            }
          />
          {statusUpdate.isError ? (
            <p className="mt-1.5 text-note text-danger" role="alert">
              {t('dress.errors.saveFailed')}
            </p>
          ) : null}
        </div>

        {!isDraft ? (
          <>
        {/* Where is it now + movement actions */}
        <Panel title={t('movements.whereNow')} data-testid="where-now">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-body font-semibold text-ink">
              {t(`movements.location.${dress.location ?? 'in_atelier'}`)}
            </p>
            {dress.current_customer_id ? (
              <p className="font-mono text-[11px] tracking-tight text-muted">
                {t('movements.withCustomer', { id: dress.current_customer_id })}
              </p>
            ) : null}
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {dress.location === 'in_atelier' || dress.location === 'other' ? (
              <Button variant="secondary" size="sm" className="w-auto px-2.5" onClick={() => setCheckoutOpen(true)}>
                {t('movements.checkOut')}
              </Button>
            ) : (
              <Button variant="secondary" size="sm" className="w-auto px-2.5" onClick={() => setCheckinOpen(true)}>
                {t('movements.checkIn')}
              </Button>
            )}
            <Button variant="secondary" size="sm" className="w-auto px-2.5" onClick={() => setReserveOpen(true)}>
              {t('movements.reserve')}
            </Button>
          </div>
        </Panel>

        {/* Timeline */}
        {(movementsQuery.data?.length ?? 0) > 0 ? (
          <Panel title={t('movements.timeline')} flush>
            <ul className="divide-y divide-line">
              {(movementsQuery.data ?? []).map((movement) => (
                <li key={movement.id} className="px-3 py-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-small font-semibold text-ink">
                      {t(`movements.direction.${movement.direction}`)} ·{' '}
                      <span className="font-normal text-muted">
                        {t(`movements.reason.${movement.reason}`)}
                      </span>
                    </p>
                    <span className="shrink-0 font-mono text-[11px] tracking-tight text-muted">
                      {new Date(movement.occurred_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-0.5 font-mono text-[11px] tracking-tight text-faint">
                    {movement.to_location}
                    {movement.due_at
                      ? ` · ${t('movements.due')} ${new Date(movement.due_at).toLocaleDateString()}`
                      : ''}
                  </p>
                  {movement.condition_notes ? (
                    <p className="mt-1 text-note text-ink">{movement.condition_notes}</p>
                  ) : null}
                  {movement.direction === 'out' ? (
                    <button
                      type="button"
                      onClick={async () => {
                        const { printHtml, buildReceiptHtml } = await import('@/features/dresses/printDocument');
                        printHtml(buildReceiptHtml(movement, dress.code, t('app.name')));
                      }}
                      className="mt-1 font-mono text-[11px] font-semibold uppercase tracking-widest text-accent"
                    >
                      {t('movements.printReceipt')}
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </Panel>
        ) : null}

        </>
        ) : null}

        <Panel title={t('dress.listingLabel')}>
          <p className="text-body font-semibold text-ink">{t(LISTING_LABELS[dress.listing_type])}</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {dress.sale_price !== null ? (
              <div className="rounded-field border border-line bg-surface-2 px-2.5 py-1.5">
                <p className="eyebrow">{t('dress.salePrice')}</p>
                <p className="mt-0.5 font-mono text-small font-semibold tracking-tight text-ink">
                  {dress.sale_price}
                </p>
              </div>
            ) : null}
            {dress.rent_price !== null ? (
              <div className="rounded-field border border-line bg-surface-2 px-2.5 py-1.5">
                <p className="eyebrow">{t('dress.rentPrice')}</p>
                <p className="mt-0.5 font-mono text-small font-semibold tracking-tight text-ink">
                  {dress.rent_price}
                </p>
              </div>
            ) : null}
          </div>
        </Panel>

        {attributes.length > 0 || dress.fabrics.length > 0 ? (
          <Panel title={t('dress.silhouette')} data-testid="dress-attributes" flush>
            <dl className="divide-y divide-line">
              {attributes.map((attribute) => (
                <div key={attribute.label} className="flex items-baseline justify-between gap-3 px-3 py-1.5">
                  <dt className="text-note text-muted">{attribute.label}</dt>
                  <dd className="text-small text-ink">{attribute.value}</dd>
                </div>
              ))}
              {dress.fabrics.length > 0 ? (
                <div className="flex items-baseline justify-between gap-3 px-3 py-1.5">
                  <dt className="shrink-0 text-note text-muted">{t('dress.fabrics')}</dt>
                  <dd className="text-small text-ink">{dress.fabrics.join(', ')}</dd>
                </div>
              ) : null}
            </dl>
          </Panel>
        ) : null}

        {dress.description_en || dress.description_ar ? (
          <div className="flex flex-col gap-2">
            {dress.description_en ? (
              <p className="text-small leading-relaxed text-ink" dir="ltr">
                {dress.description_en}
              </p>
            ) : null}
            {dress.description_ar ? (
              <p className="text-small leading-relaxed text-ink" dir="rtl">
                {dress.description_ar}
              </p>
            ) : null}
          </div>
        ) : null}

        {movementsQuery.data && movementsQuery.data.length > 0 ? (
          <AvailabilityCalendar movements={movementsQuery.data} />
        ) : null}

        <div className="flex gap-2 pt-1">
          <Button variant="secondary" onClick={() => setEditing(true)} className="flex-1">
            <PencilIcon className="h-3.5 w-3.5" />
            {t('dress.edit')}
          </Button>
          <Button
            variant={confirmingDelete ? 'danger' : 'secondary'}
            onClick={() => {
              if (!confirmingDelete) {
                setConfirmingDelete(true);
                return;
              }
              softDelete.mutate(dress.id, {
                onSuccess: () =>
                  navigate('/dresses', { state: { undo: { id: dress.id, code: dress.code } } }),
                onError: () => {
                  setDeleteFailed(true);
                  setConfirmingDelete(false);
                },
              });
            }}
            className="flex-1"
          >
            <TrashIcon className="h-3.5 w-3.5" />
            {confirmingDelete ? t('dress.confirmDelete') : t('dress.delete')}
          </Button>
        </div>

        {confirmingDelete ? (
          <p className="text-note text-muted">{t('dress.deleteWarning')}</p>
        ) : null}
        {deleteFailed ? (
          <p className="text-small text-danger" role="alert">
            {t('dress.errors.deleteFailed')}
          </p>
        ) : null}

        {!isDraft ? (
          <>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={async () => {
                // The tag carries the unguessable public token, not the code.
                const url = `${window.location.origin}/d/${dress.public_token}`;
                const QRCode = (await import('qrcode')).default;
                const qr = await QRCode.toDataURL(url, { margin: 1, width: 240 });
                printHtml(buildHangTagHtml(dress, branding.atelierName, qr, branding.logoUrl));
              }}
            >
              <QrIcon className="h-3.5 w-3.5" />
              {t('dress.printTag')}
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                erpSync.mutate({
                  dressId: dress.id,
                  code: dress.code,
                  name: dress.name_en || dress.code,
                  description: dress.description_en,
                  fabrics: dress.fabrics,
                  color: dress.color,
                  size_label: dress.size_label,
                  category: dress.category,
                })
              }
              loading={erpSync.isPending}
            >
              <LinkIcon className="h-3.5 w-3.5" />
              {t('dress.syncErp')}
            </Button>
            </div>

            {/* The ERPNext state, so tapping the button is not a black box.
                The item is created by the agent on the atelier server, so
                "synced" can take up to half a minute to appear. */}
            <p className="mt-1.5 text-note text-muted" data-testid="erp-state">
              {erpSync.isPending
                ? t('dress.erpQueued')
                : dress.erp_sync_status === 'synced' && dress.erp_item_code
                  ? t('dress.erpSynced', { code: dress.erp_item_code })
                  : t('dress.erpNotSynced')}
            </p>
          </>
        ) : null}

        </div>

        <CheckOutSheet open={checkoutOpen} onClose={() => setCheckoutOpen(false)} dressId={dress.id} dressCode={dress.code} />
        <CheckInSheet open={checkinOpen} onClose={() => setCheckinOpen(false)} dressId={dress.id} dressCode={dress.code} currentCustomerId={dress.current_customer_id} />
        <ReserveSheet open={reserveOpen} onClose={() => setReserveOpen(false)} dressId={dress.id} dressCode={dress.code} />
        {cleanerOpen ? (
          <BackgroundCleaner
            dressId={dress.id}
            photos={photos}
            onClose={() => setCleanerOpen(false)}
          />
        ) : null}
      </div>
    </Screen>
  );
}
/** Create flow: /dresses/new */
export function DressDetailPage() {
  const { id } = useParams<{ id: string }>();
  if (id === 'new') return <CreateDress />;
  // Any other id (including a hand-typed empty one) renders the dress page,
  // which shows its own not-found panel.
  return <ExistingDress id={id ?? ''} />;
}
