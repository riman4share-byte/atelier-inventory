import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMaterials, useCreateMaterial, useAdjustStock } from './api';
import { MATERIAL_CATEGORIES } from './categories';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/layout/Screen';
import { Spinner } from '@/components/ui/Spinner';
import { TextField } from '@/components/ui/TextField';
import { Panel } from '@/components/ui/Panel';
import { PlusIcon } from '@/components/icons';
import { cx } from '@/lib/cx';

// The list must match the database enum exactly (see categories.ts).
const CATEGORIES = MATERIAL_CATEGORIES;

export function MaterialsPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [nameEn, setNameEn] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [cat, setCat] = useState<string>('fabric');
  const [stock, setStock] = useState('0');
  const [threshold, setThreshold] = useState('0');
  const [adjustId, setAdjustId] = useState<string | null>(null);
  const [adjustDelta, setAdjustDelta] = useState('1');
  const [adjustReason, setAdjustReason] = useState('purchase');

  const materials = useMaterials(search, category);
  const create = useCreateMaterial();
  const adjust = useAdjustStock();

  const submitNew = async () => {
    if (!nameEn.trim()) return;
    await create.mutateAsync({
      name_en: nameEn.trim(),
      name_ar: nameAr.trim() || nameEn.trim(),
      category: cat as never,
      unit: 'piece',
      stock_qty: Number(stock) || 0,
      low_stock_threshold: Number(threshold) || 0,
    });
    setShowForm(false);
    setNameEn(''); setNameAr(''); setStock('0'); setThreshold('0');
  };

  return (
    <Screen title={t('materials.title')} subtitle={t('materials.subtitle')}>
      <div className="flex flex-1 flex-col gap-3" data-testid="materials-page">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <TextField
              label={t('materials.search')}
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <Button
            variant={showForm ? 'ghost' : 'secondary'}
            fullWidth={false}
            onClick={() => setShowForm((v) => !v)}
          >
            <PlusIcon className="h-4 w-4" />
            {showForm ? t('common.close') : t('materials.add')}
          </Button>
        </div>

        {/* Category filter — a row of cells, the active one in accent. */}
        <div
          role="group"
          aria-label={t('materials.title')}
          className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4"
        >
          <button
            type="button"
            aria-pressed={category === 'all'}
            onClick={() => setCategory('all')}
            className={cx(
              'h-8 shrink-0 rounded-field border px-2.5 text-caption font-semibold tracking-tight transition-colors',
              category === 'all'
                ? 'border-accent bg-accent text-accent-ink'
                : 'border-line bg-surface text-muted hover:border-line-strong hover:text-ink',
            )}
          >
            {t('materials.all')}
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
              className={cx(
                'h-8 shrink-0 rounded-field border px-2.5 text-caption font-semibold tracking-tight transition-colors',
                category === c
                  ? 'border-accent bg-accent text-accent-ink'
                  : 'border-line bg-surface text-muted hover:border-line-strong hover:text-ink',
              )}
            >
              {t(`materials.cat.${c}`)}
            </button>
          ))}
        </div>

        {materials.isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner className="h-5 w-5 text-accent" />
          </div>
        ) : (materials.data ?? []).length === 0 ? (
          <Panel className="px-3 py-6 text-center">
            <p className="text-small text-muted">{t('materials.empty')}</p>
          </Panel>
        ) : (
          <Panel flush>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse">
                <thead>
                  <tr className="border-b border-line">
                    <th scope="col" className="px-3 py-1.5 text-start">
                      <span className="eyebrow">{t('table.colName')}</span>
                    </th>
                    <th scope="col" className="px-3 py-1.5 text-end">
                      <span className="eyebrow">{t('materials.stock')}</span>
                    </th>
                    <th scope="col" className="px-3 py-1.5 text-start">
                      <span className="eyebrow">{t('table.colStatus')}</span>
                    </th>
                    <th scope="col" className="px-3 py-1.5" />
                  </tr>
                </thead>
                <tbody>
                  {(materials.data ?? []).map((m) => {
                    const low = Number(m.stock_qty) <= Number(m.low_stock_threshold);
                    return (
                      <tr
                        key={m.id}
                        data-testid="material-row"
                        className="border-b border-line transition-colors last:border-b-0 hover:bg-surface-2"
                      >
                        <td className="max-w-[240px] px-3 py-2 align-middle">
                          <span className="block truncate text-small font-semibold text-ink">
                            {m.name_en}
                          </span>
                          <span className="mt-0.5 block truncate font-mono text-micro uppercase tracking-widest text-muted">
                            {m.category}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-end align-middle">
                          <span className="font-mono text-body font-semibold tracking-tight text-ink">
                            {m.stock_qty}
                          </span>
                          <span className="ms-1 font-mono text-note text-faint">{m.unit}</span>
                        </td>
                        <td className="px-3 py-2 align-middle">
                          {low ? (
                            <span className="inline-flex items-center rounded-pill border border-warn-line bg-warn-bg px-1.5 py-0.5 font-mono text-micro font-semibold uppercase tracking-widest text-warn">
                              {t('materials.low')}
                            </span>
                          ) : (
                            <span className="font-mono text-note text-faint">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-end align-middle">
                          <Button
                            variant="secondary"
                            size="sm"
                            fullWidth={false}
                            className="px-2.5"
                            onClick={() => setAdjustId(m.id)}
                          >
                            {t('materials.adjust')}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        )}

        {showForm ? (
          <Panel title={t('materials.add')}>
            <div className="flex flex-col gap-2.5">
              <TextField
                label={t('materials.nameEn')}
                value={nameEn}
                onChange={(event) => setNameEn(event.target.value)}
                dir="ltr"
              />
              <TextField
                label={t('materials.nameAr')}
                value={nameAr}
                onChange={(event) => setNameAr(event.target.value)}
                dir="rtl"
              />
              {/* Category — a labelled select, matching the field rhythm. */}
              <div className="flex flex-col gap-1">
                <label htmlFor="material-category" className="eyebrow">
                  {t('materials.title')}
                </label>
                <select
                  id="material-category"
                  value={cat}
                  onChange={(event) => setCat(event.target.value)}
                  className="h-9 rounded-field border border-line bg-surface px-2.5 text-body text-ink focus:border-accent"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {t(`materials.cat.${c}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <TextField
                  label={t('materials.stock')}
                  type="number"
                  value={stock}
                  onChange={(event) => setStock(event.target.value)}
                  mono
                />
                <TextField
                  label={t('materials.threshold')}
                  type="number"
                  value={threshold}
                  onChange={(event) => setThreshold(event.target.value)}
                  mono
                />
              </div>
              <Button onClick={() => void submitNew()} loading={create.isPending}>
                {t('materials.save')}
              </Button>
            </div>
          </Panel>
        ) : null}

        {adjustId ? (
          <div
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4"
            data-testid="adjust-sheet"
          >
            <div className="w-full max-w-sm rounded-card border border-line bg-surface p-3">
              <p className="eyebrow mb-2">{t('materials.adjustStock')}</p>
              <div className="flex flex-col gap-2.5">
                <TextField
                  label={t('materials.stock')}
                  type="number"
                  value={adjustDelta}
                  onChange={(event) => setAdjustDelta(event.target.value)}
                  mono
                />
                <div className="flex flex-col gap-1">
                  <label htmlFor="adjust-reason" className="eyebrow">
                    {t('movements.reasonLabel')}
                  </label>
                  <select
                    id="adjust-reason"
                    value={adjustReason}
                    onChange={(event) => setAdjustReason(event.target.value)}
                    className="h-9 rounded-field border border-line bg-surface px-2.5 text-body text-ink focus:border-accent"
                  >
                    <option value="purchase">{t('materials.reason.purchase')}</option>
                    <option value="used">{t('materials.reason.used')}</option>
                    <option value="adjustment">{t('materials.reason.adjustment')}</option>
                    <option value="return">{t('materials.reason.return')}</option>
                  </select>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button variant="secondary" onClick={() => setAdjustId(null)}>
                  {t('common.close')}
                </Button>
                <Button
                  onClick={async () => {
                    await adjust.mutateAsync({
                      materialId: adjustId,
                      delta: Number(adjustDelta),
                      reason: adjustReason as 'purchase' | 'used' | 'adjustment' | 'return',
                    });
                    setAdjustId(null); setAdjustDelta('1');
                  }}
                  loading={adjust.isPending}
                >
                  {t('materials.save')}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Screen>
  );
}
