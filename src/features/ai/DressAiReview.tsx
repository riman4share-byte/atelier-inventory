import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { DressDraft } from './api';
import { Button } from '@/components/ui/Button';

interface DressAiReviewProps {
  draft: DressDraft;
  pending: boolean;
  onApply: (draft: DressDraft) => void;
  onRegenerate: () => void;
  onCancel: () => void;
}

/** Editable review of an AI-generated dress draft. AI-filled values are marked. */
export function DressAiReview({ draft, pending, onApply, onRegenerate, onCancel }: DressAiReviewProps) {
  const { t } = useTranslation();
  const [values, setValues] = useState<DressDraft>(draft);

  const update = <K extends keyof DressDraft>(key: K, value: DressDraft[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const fabricsText = values.fabrics.join(', ');
  const materialsText = values.suggested_materials.join(', ');

  return (
    <div className="flex flex-col gap-3 rounded-card bg-soft p-4" data-testid="ai-review">
      <div className="flex items-center justify-between">
        <h3 className="text-title">{t('ai.title')}</h3>
        <span className="rounded-pill bg-accent px-2.5 py-1 text-note font-bold text-accent-ink">
          {t('ai.aiBadge')}
        </span>
      </div>
      <p className="text-note text-muted">{t('ai.hint')}</p>

      <label className="flex flex-col gap-1 text-small font-semibold text-ink">
        {t('dress.nameEn')}
        <input
          value={values.name_en}
          onChange={(event) => update('name_en', event.target.value)}
          className="min-h-tap rounded-field border-[1.5px] border-line bg-surface px-3 py-2 text-input text-ink"
        />
      </label>
      <label className="flex flex-col gap-1 text-small font-semibold text-ink">
        {t('dress.nameAr')}
        <input
          dir="rtl"
          value={values.name_ar}
          onChange={(event) => update('name_ar', event.target.value)}
          className="min-h-tap rounded-field border-[1.5px] border-line bg-surface px-3 py-2 text-input text-ink"
        />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-small font-semibold text-ink">
          {t('dress.silhouette')}
          <input
            value={values.silhouette}
            onChange={(event) => update('silhouette', event.target.value)}
            className="min-h-tap rounded-field border-[1.5px] border-line bg-surface px-3 py-2 text-input text-ink"
          />
        </label>
        <label className="flex flex-col gap-1 text-small font-semibold text-ink">
          {t('dress.neckline')}
          <input
            value={values.neckline}
            onChange={(event) => update('neckline', event.target.value)}
            className="min-h-tap rounded-field border-[1.5px] border-line bg-surface px-3 py-2 text-input text-ink"
          />
        </label>
        <label className="flex flex-col gap-1 text-small font-semibold text-ink">
          {t('dress.sleeves')}
          <input
            value={values.sleeves}
            onChange={(event) => update('sleeves', event.target.value)}
            className="min-h-tap rounded-field border-[1.5px] border-line bg-surface px-3 py-2 text-input text-ink"
          />
        </label>
        <label className="flex flex-col gap-1 text-small font-semibold text-ink">
          {t('dress.color')}
          <input
            value={values.color}
            onChange={(event) => update('color', event.target.value)}
            className="min-h-tap rounded-field border-[1.5px] border-line bg-surface px-3 py-2 text-input text-ink"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-small font-semibold text-ink">
        {t('dress.fabrics')}
        <input
          value={fabricsText}
          onChange={(event) =>
            update(
              'fabrics',
              event.target.value
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean),
            )
          }
          className="min-h-tap rounded-field border-[1.5px] border-line bg-surface px-3 py-2 text-input text-ink"
        />
      </label>

      <label className="flex flex-col gap-1 text-small font-semibold text-ink">
        {t('dress.descriptionEn')}
        <textarea
          value={values.description_en}
          onChange={(event) => update('description_en', event.target.value)}
          rows={3}
          className="min-h-tap rounded-field border-[1.5px] border-line bg-surface px-3 py-2 text-input text-ink"
        />
      </label>
      <label className="flex flex-col gap-1 text-small font-semibold text-ink">
        {t('dress.descriptionAr')}
        <textarea
          dir="rtl"
          value={values.description_ar}
          onChange={(event) => update('description_ar', event.target.value)}
          rows={3}
          className="min-h-tap rounded-field border-[1.5px] border-line bg-surface px-3 py-2 text-input text-ink"
        />
      </label>

      <p className="text-note text-muted">
        {t('ai.suggestedMaterials')}: {materialsText || '—'}
      </p>
      <p className="text-note text-muted">
        {t('ai.confidence')}: {values.confidence} · {t('ai.modelNote')}
      </p>

      <div className="flex gap-2 pt-1">
        <Button variant="secondary" onClick={onCancel} className="flex-1">
          {t('common.cancel')}
        </Button>
        <Button variant="secondary" onClick={onRegenerate} loading={pending} className="flex-1">
          {t('ai.regenerate')}
        </Button>
        <Button onClick={() => onApply(values)} loading={pending} className="flex-1">
          {t('ai.apply')}
        </Button>
      </div>
    </div>
  );
}
