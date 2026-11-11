import { useState } from 'react';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import type { DressStatus, ListingType } from '@/lib/database.types';
import type { DressRow } from './api';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { TextArea } from '@/components/ui/TextArea';
import { TextField } from '@/components/ui/TextField';

const STATUS_OPTIONS: ReadonlyArray<{ value: DressStatus; labelKey: string }> = [
  { value: 'available', labelKey: 'status.available' },
  { value: 'reserved', labelKey: 'status.reserved' },
  { value: 'rented', labelKey: 'status.rented' },
  { value: 'sold', labelKey: 'status.sold' },
];

const LISTING_OPTIONS: ReadonlyArray<{ value: ListingType; labelKey: string }> = [
  { value: 'sale', labelKey: 'dress.listingSale' },
  { value: 'rent', labelKey: 'dress.listingRent' },
  { value: 'both', labelKey: 'dress.listingBoth' },
];

const formSchema = z
  .object({
    code: z.string().trim().max(24),
    name_en: z.string(),
    name_ar: z.string(),
    description_en: z.string(),
    description_ar: z.string(),
    silhouette: z.string(),
    neckline: z.string(),
    sleeves: z.string(),
    color: z.string(),
    size_label: z.string(),
    fabricsText: z.string(),
    notes: z.string(),
    status: z.enum(['available', 'reserved', 'rented', 'sold']),
    listing_type: z.enum(['sale', 'rent', 'both']),
    sale_price: z.string(),
    rent_price: z.string(),
  })
  .superRefine((values, ctx) => {
    for (const field of ['sale_price', 'rent_price'] as const) {
      const raw = values[field].trim();
      if (raw === '') continue;
      const parsed = Number(raw);
      if (!Number.isFinite(parsed)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: 'not_a_number' });
      } else if (parsed < 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: 'negative' });
      }
    }
  });

export type DressFormValues = z.infer<typeof formSchema>;

export function emptyDressForm(suggestedCode: string): DressFormValues {
  return {
    code: suggestedCode,
    name_en: '',
    name_ar: '',
    description_en: '',
    description_ar: '',
    silhouette: '',
    neckline: '',
    sleeves: '',
    color: '',
    size_label: '',
    fabricsText: '',
    notes: '',
    status: 'available',
    listing_type: 'both',
    sale_price: '',
    rent_price: '',
  };
}

export function dressRowToForm(dress: DressRow): DressFormValues {
  return {
    code: dress.code,
    name_en: dress.name_en,
    name_ar: dress.name_ar,
    description_en: dress.description_en ?? '',
    description_ar: dress.description_ar ?? '',
    silhouette: dress.silhouette ?? '',
    neckline: dress.neckline ?? '',
    sleeves: dress.sleeves ?? '',
    color: dress.color ?? '',
    size_label: dress.size_label ?? '',
    fabricsText: dress.fabrics.join(', '),
    notes: dress.notes ?? '',
    status: dress.status,
    listing_type: dress.listing_type,
    sale_price: dress.sale_price === null ? '' : String(dress.sale_price),
    rent_price: dress.rent_price === null ? '' : String(dress.rent_price),
  };
}

/** The database shape produced by the form (empty strings → null where allowed). */
export interface DressFormPayload {
  code: string;
  name_en: string;
  name_ar: string;
  description_en: string | null;
  description_ar: string | null;
  silhouette: string | null;
  neckline: string | null;
  sleeves: string | null;
  color: string | null;
  size_label: string | null;
  fabrics: string[];
  notes: string | null;
  status: DressStatus;
  listing_type: ListingType;
  sale_price: number | null;
  rent_price: number | null;
}

export function formToPayload(values: DressFormValues): DressFormPayload {
  const toOptionalText = (text: string) => {
    const trimmed = text.trim();
    return trimmed === '' ? null : trimmed;
  };
  const toOptionalPrice = (text: string) => {
    const trimmed = text.trim();
    return trimmed === '' ? null : Number(trimmed);
  };
  return {
    code: values.code.trim(),
    name_en: values.name_en.trim(),
    name_ar: values.name_ar.trim(),
    description_en: toOptionalText(values.description_en),
    description_ar: toOptionalText(values.description_ar),
    silhouette: toOptionalText(values.silhouette),
    neckline: toOptionalText(values.neckline),
    sleeves: toOptionalText(values.sleeves),
    color: toOptionalText(values.color),
    size_label: toOptionalText(values.size_label),
    fabrics: values.fabricsText
      .split(',')
      .map((fabric) => fabric.trim())
      .filter((fabric) => fabric !== ''),
    notes: toOptionalText(values.notes),
    status: values.status,
    listing_type: values.listing_type,
    sale_price: toOptionalPrice(values.sale_price),
    rent_price: toOptionalPrice(values.rent_price),
  };
}

interface DressFormProps {
  initial: DressFormValues;
  savingLabel: string;
  pending: boolean;
  /** Error from the last save attempt, already mapped to a message string or null. */
  submitError: string | null;
  onSubmit: (values: DressFormValues) => void;
  onCancel: () => void;
}

export function DressForm({ initial, savingLabel, pending, submitError, onSubmit, onCancel }: DressFormProps) {
  const { t } = useTranslation();
  const [values, setValues] = useState<DressFormValues>(initial);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof DressFormValues, string>>>({});

  const set = <K extends keyof DressFormValues>(key: K, value: DressFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const submit = () => {
    const result = formSchema.safeParse(values);
    if (!result.success) {
      const errors: Partial<Record<keyof DressFormValues, string>> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof DressFormValues | undefined;
        if (key && !errors[key]) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    onSubmit(values);
  };

  const priceError = (field: 'sale_price' | 'rent_price') => {
    const issue = fieldErrors[field];
    if (issue === 'not_a_number') return t('dress.errors.notANumber');
    if (issue === 'negative') return t('dress.errors.negative');
    return undefined;
  };

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      noValidate
    >
      <Panel title={t('dress.nameEn')}>
        <div className="flex flex-col gap-2.5">
          <TextField
            label={t('dress.code')}
            value={values.code}
            onChange={(event) => set('code', event.target.value)}
            error={fieldErrors.code ? t('dress.errors.codeRequired') : undefined}
            aria-describedby={undefined}
            autoComplete="off"
            mono
          />
          <TextField
            label={t('dress.nameEn')}
            value={values.name_en}
            onChange={(event) => set('name_en', event.target.value)}
            dir="ltr"
          />
          <TextField
            label={t('dress.nameAr')}
            value={values.name_ar}
            onChange={(event) => set('name_ar', event.target.value)}
            dir="rtl"
          />
        </div>
      </Panel>

      <Panel title={t('dress.statusLabel')}>
        <div className="flex flex-col gap-2.5">
          <div>
            <span className="eyebrow mb-1.5 block">{t('dress.statusLabel')}</span>
            <SegmentedControl
              label={t('dress.statusLabel')}
              options={STATUS_OPTIONS.map((option) => ({ value: option.value, label: t(option.labelKey) }))}
              value={values.status}
              onChange={(value) => set('status', value)}
            />
          </div>

          <div>
            <span className="eyebrow mb-1.5 block">{t('dress.listingLabel')}</span>
            <SegmentedControl
              label={t('dress.listingLabel')}
              options={LISTING_OPTIONS.map((option) => ({ value: option.value, label: t(option.labelKey) }))}
              value={values.listing_type}
              onChange={(value) => set('listing_type', value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {(values.listing_type === 'sale' || values.listing_type === 'both') && (
              <TextField
                label={t('dress.salePrice')}
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={values.sale_price}
                onChange={(event) => set('sale_price', event.target.value)}
                error={priceError('sale_price')}
                mono
              />
            )}
            {(values.listing_type === 'rent' || values.listing_type === 'both') && (
              <TextField
                label={t('dress.rentPrice')}
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={values.rent_price}
                onChange={(event) => set('rent_price', event.target.value)}
                error={priceError('rent_price')}
                mono
              />
            )}
          </div>
        </div>
      </Panel>

      <Panel title={t('dress.silhouette')}>
        <div className="grid grid-cols-2 gap-2.5">
          <TextField
            label={t('dress.silhouette')}
            value={values.silhouette}
            onChange={(event) => set('silhouette', event.target.value)}
          />
          <TextField
            label={t('dress.neckline')}
            value={values.neckline}
            onChange={(event) => set('neckline', event.target.value)}
          />
          <TextField
            label={t('dress.sleeves')}
            value={values.sleeves}
            onChange={(event) => set('sleeves', event.target.value)}
          />
          <TextField
            label={t('dress.color')}
            value={values.color}
            onChange={(event) => set('color', event.target.value)}
          />
          <TextField
            label={t('dress.size')}
            value={values.size_label}
            onChange={(event) => set('size_label', event.target.value)}
            mono
          />
          <TextField
            label={t('dress.fabrics')}
            hint={t('dress.fabricsHint')}
            value={values.fabricsText}
            onChange={(event) => set('fabricsText', event.target.value)}
          />
        </div>
      </Panel>

      <Panel title={t('dress.descriptionEn')}>
        <div className="flex flex-col gap-2.5">
          <TextArea
            label={t('dress.descriptionEn')}
            value={values.description_en}
            onChange={(event) => set('description_en', event.target.value)}
            dir="ltr"
          />
          <TextArea
            label={t('dress.descriptionAr')}
            value={values.description_ar}
            onChange={(event) => set('description_ar', event.target.value)}
            dir="rtl"
          />
          <TextArea
            label={t('dress.notes')}
            value={values.notes}
            onChange={(event) => set('notes', event.target.value)}
          />
        </div>
      </Panel>

      {submitError ? (
        <p className="rounded-field border border-danger-line bg-danger-bg px-2.5 py-1.5 text-small text-danger" role="alert">
          {submitError}
        </p>
      ) : null}

      <div className="flex gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
          {t('dress.cancel')}
        </Button>
        <Button type="submit" loading={pending} className="flex-[2]">
          {pending ? savingLabel : t('dress.save')}
        </Button>
      </div>
    </form>
  );
}
