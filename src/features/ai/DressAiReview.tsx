import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { DressDraft } from './api';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { TextArea } from '@/components/ui/TextArea';
import { TextField } from '@/components/ui/TextField';
import { cx } from '@/lib/cx';

/** Confidence is reported by the model as a word; show it as a fixed token. */
const CONFIDENCE_TOKEN: Record<string, { token: string; tone: string }> = {
  high: { token: 'HIGH', tone: 'border-ok-line bg-ok-bg text-ok' },
  medium: { token: 'MEDIUM', tone: 'border-warn-line bg-warn-bg text-warn' },
  low: { token: 'LOW', tone: 'border-off-line bg-off-bg text-off' },
};

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
  const confidenceKey = values.confidence.trim().toLowerCase();
  const confidence = CONFIDENCE_TOKEN[confidenceKey] ?? {
    token: values.confidence.toUpperCase(),
    tone: 'border-line bg-surface-2 text-muted',
  };

  return (
    <div
      className="flex flex-col gap-3 rounded-card border border-line bg-surface p-3"
      data-testid="ai-review"
    >
      <div className="flex items-center justify-between gap-2 border-b border-line pb-2.5">
        <h3 className="text-title font-semibold tracking-tight text-ink">{t('ai.title')}</h3>
        <span className="rounded-pill border border-accent-line bg-accent-bg px-2 py-0.5 font-mono text-micro uppercase tracking-widest text-accent">
          {t('ai.aiBadge')}
        </span>
      </div>
      <p className="text-note text-muted">{t('ai.hint')}</p>

      <Panel>
        <div className="flex flex-col gap-3">
          <TextField
            label={t('dress.nameEn')}
            value={values.name_en}
            onChange={(event) => update('name_en', event.target.value)}
          />
          <TextField
            label={t('dress.nameAr')}
            dir="rtl"
            value={values.name_ar}
            onChange={(event) => update('name_ar', event.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <TextField
              label={t('dress.silhouette')}
              value={values.silhouette}
              onChange={(event) => update('silhouette', event.target.value)}
            />
            <TextField
              label={t('dress.neckline')}
              value={values.neckline}
              onChange={(event) => update('neckline', event.target.value)}
            />
            <TextField
              label={t('dress.sleeves')}
              value={values.sleeves}
              onChange={(event) => update('sleeves', event.target.value)}
            />
            <TextField
              label={t('dress.color')}
              value={values.color}
              onChange={(event) => update('color', event.target.value)}
            />
          </div>

          <TextField
            label={t('dress.fabrics')}
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
          />

          <TextArea
            label={t('dress.descriptionEn')}
            rows={3}
            value={values.description_en}
            onChange={(event) => update('description_en', event.target.value)}
          />
          <TextArea
            label={t('dress.descriptionAr')}
            dir="rtl"
            rows={3}
            value={values.description_ar}
            onChange={(event) => update('description_ar', event.target.value)}
          />
        </div>
      </Panel>

      {/* Read-only output from the model: what it saw, and how sure it is. */}
      <Panel title={t('ai.aiBadge')}>
        <dl className="divide-y divide-line">
          <div className="flex items-baseline justify-between gap-3 py-2">
            <dt className="text-caption text-muted">{t('ai.suggestedMaterials')}</dt>
            <dd className="text-end text-small text-ink">{materialsText || '—'}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3 py-2">
            <dt className="text-caption text-muted">{t('ai.confidence')}</dt>
            <dd>
              <span
                className={cx(
                  'rounded-pill border px-2 py-0.5 font-mono text-micro uppercase tracking-widest',
                  confidence.tone,
                )}
              >
                {confidence.token}
              </span>
            </dd>
          </div>
        </dl>
        <p className="mt-2 border-t border-line pt-2 text-note text-faint">{t('ai.modelNote')}</p>
      </Panel>

      <div className="flex gap-2 border-t border-line pt-3">
        <Button variant="ghost" onClick={onCancel} className="flex-1">
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
