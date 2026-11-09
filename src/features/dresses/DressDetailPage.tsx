import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { FullScreenLoader } from '@/components/layout/FullScreenLoader';
import { Screen } from '@/components/layout/Screen';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
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
import { emptyDressForm, DressForm, dressRowToForm, formToPayload } from './DressForm';
import { useDescribeDress, aiErrorMessage } from '@/features/ai/api';
import { DressAiReview } from '@/features/ai/DressAiReview';
import { PhotoGallery } from '@/features/photos/PhotoGallery';
import { BackgroundCleaner } from '@/features/cleanup/BackgroundCleaner';
import { cx } from '@/lib/cx';
import { buildHangTagHtml, printHtml } from '@/features/dresses/printDocument';
import QRCode from 'qrcode';

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
  const dressQuery = useDress(id);
  const photosQuery = useDressPhotos(id, { enabled: dressQuery.data?.found === true });
  const statusUpdate = useUpdateDress();
  const formUpdate = useUpdateDress();
  const softDelete = useSoftDeleteDress();
  const describe = useDescribeDress();

  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteFailed, setDeleteFailed] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  if (dressQuery.isLoading || photosQuery.isLoading) return <FullScreenLoader />;

  if (dressQuery.isError) {
    return (
      <Screen title={t('screens.dresses.title')}>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-card bg-soft px-6 py-10 text-center">
          <p className="text-body font-semibold text-ink">{t('dress.errors.loadFailedTitle')}</p>
          <p className="text-small text-muted">{t('dress.errors.loadFailedBody')}</p>
          <Button
            variant="secondary"
            onClick={() => void dressQuery.refetch()}
            className="min-h-tap w-auto px-4"
          >
            {t('common.retry')}
          </Button>
        </div>
      </Screen>
    );
  }

  if (!dressQuery.data?.found || !dressQuery.data.dress) {
    return (
      <Screen title={t('screens.dresses.title')}>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-card bg-soft px-6 py-10 text-center">
          <p className="text-body font-semibold text-ink">{t('dress.errors.notFoundTitle')}</p>
          <p className="text-small text-muted">{t('dress.errors.notFoundBody')}</p>
          <Button
            variant="secondary"
            onClick={() => navigate('/dresses')}
            className="min-h-tap w-auto px-4"
          >
            {t('dress.errors.backToList')}
          </Button>
        </div>
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
    { label: t('dress.silhouette'), value: dress.silhouette },
    { label: t('dress.neckline'), value: dress.neckline },
    { label: t('dress.sleeves'), value: dress.sleeves },
    { label: t('dress.color'), value: dress.color },
    { label: t('dress.size'), value: dress.size_label },
  ].filter((attribute) => Boolean(attribute.value));

  return (
    <Screen
      title={displayName(dress, i18n.language)}
      subtitle={`${dress.code} · ${t(`status.${dress.status}`)}`}
    >
      <div className="flex flex-1 flex-col gap-5 pb-2">
        <PhotoGallery dress={dress} photos={photos} />

        {photos.length > 0 ? <BackgroundCleaner dressId={dress.id} photos={photos} /> : null}

        {aiOpen ? (
          <DressAiReview
            draft={describe.data!.draft}
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
                    silhouette: draft.silhouette,
                    neckline: draft.neckline,
                    sleeves: draft.sleeves,
                    color: draft.color,
                    fabrics: draft.fabrics,
                    ai_raw: describe.data!.raw as never,
                    ai_model: describe.data!.model,
                  },
                },
                { onSuccess: () => setAiOpen(false) },
              );
            }}
            onRegenerate={() => {
              setAiError(null);
              describe.mutate({ dress }, { onError: (error) => setAiError(aiErrorMessage(error)) });
            }}
            onCancel={() => setAiOpen(false)}
          />
        ) : (
          <div className="flex flex-col gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setAiError(null);
                describe.mutate({ dress }, {
                  onSuccess: () => setAiOpen(true),
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
            {aiError ? (
              <p className="text-small text-danger">
                {aiError === 'no_key'
                  ? t('ai.noKey')
                  : aiError === 'no_photos'
                    ? t('ai.needsPhotos')
                    : t('ai.failed')}
              </p>
            ) : null}
          </div>
        )}

        <div>
          <span className="mb-1.5 block text-caption font-semibold text-muted">
            {t('dress.statusLabel')}
          </span>
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
            <p className="mt-1.5 text-caption text-danger">{t('dress.errors.saveFailed')}</p>
          ) : null}
        </div>

        <div className="rounded-card bg-soft p-4">
          <p className="text-caption font-semibold text-muted">{t('dress.listingLabel')}</p>
          <p className="text-body font-semibold text-ink">{t(LISTING_LABELS[dress.listing_type])}</p>
          <div className="mt-2 flex gap-6">
            {dress.sale_price !== null ? (
              <p className="text-small text-ink">
                <span className="text-muted">{t('dress.salePrice')}: </span>
                <span className="font-bold">{dress.sale_price}</span>
              </p>
            ) : null}
            {dress.rent_price !== null ? (
              <p className="text-small text-ink">
                <span className="text-muted">{t('dress.rentPrice')}: </span>
                <span className="font-bold">{dress.rent_price}</span>
              </p>
            ) : null}
          </div>
        </div>

        {attributes.length > 0 || dress.fabrics.length > 0 ? (
          <div className="flex flex-wrap gap-2" data-testid="dress-attributes">
            {attributes.map((attribute) => (
              <span key={attribute.label} className="rounded-pill bg-soft px-3 py-1.5 text-caption font-medium text-ink">
                <span className="text-muted">{attribute.label}: </span>
                {attribute.value}
              </span>
            ))}
            {dress.fabrics.map((fabric) => (
              <span key={fabric} className="rounded-pill bg-soft px-3 py-1.5 text-caption font-medium text-ink">
                <span className="text-muted">{t('dress.fabrics')}: </span>
                {fabric}
              </span>
            ))}
          </div>
        ) : null}

        {dress.description_en || dress.description_ar ? (
          <div className="flex flex-col gap-2">
            {dress.description_en ? (
              <p className="text-small text-ink" dir="ltr">
                {dress.description_en}
              </p>
            ) : null}
            {dress.description_ar ? (
              <p className="text-small text-ink" dir="rtl">
                {dress.description_ar}
              </p>
            ) : null}
          </div>
        ) : null}

        {dress.notes ? (
          <p className="rounded-card bg-soft p-3 text-small text-muted">{dress.notes}</p>
        ) : null}

        <div className="flex gap-2 pt-2">
          <Button variant="secondary" onClick={() => setEditing(true)} className="flex-1">
            {t('dress.edit')}
          </Button>
          <Button
            variant={confirmingDelete ? 'primary' : 'secondary'}
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
            className={cx('flex-1', confirmingDelete && 'bg-danger text-white')}
          >
            {confirmingDelete ? t('dress.confirmDelete') : t('dress.delete')}
          </Button>
        </div>

        {confirmingDelete ? (
          <p className="text-note text-muted">{t('dress.deleteWarning')}</p>
        ) : null}
        {deleteFailed ? <p className="text-small text-danger">{t('dress.errors.deleteFailed')}</p> : null}

        <Button
          variant="secondary"
          onClick={async () => {
            const url = `${window.location.origin}/d/${dress.code}`;
            const qr = await QRCode.toDataURL(url, { margin: 0, width: 240 });
            printHtml(buildHangTagHtml(dress, t('app.name'), qr));
          }}
          className="w-full"
        >
          {t('dress.printTag')}
        </Button>
      </div>
    </Screen>
  );
}

export function DressDetailPage() {
  const { id } = useParams<{ id: string }>();
  if (id === 'new') return <CreateDress />;
  // Any other id (including a hand-typed empty one) renders the dress page,
  // which shows its own not-found panel.
  return <ExistingDress id={id ?? ''} />;
}
