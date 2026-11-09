import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMaterials, useCreateMaterial, useAdjustStock } from './api';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/layout/Screen';
import { Spinner } from '@/components/ui/Spinner';
import { cx } from '@/lib/cx';

const CATEGORIES = ['fabric', 'lace', 'bead', 'crystal', 'pearl', 'thread', 'other'] as const;

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
      <div className="flex flex-1 flex-col gap-4" data-testid="materials-page">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('materials.search')}
          className="min-h-tap w-full rounded-field border-[1.5px] border-line bg-surface px-3 py-2.5 text-input text-ink placeholder:text-muted"
        />
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          <button type="button" onClick={() => setCategory('all')}
            className={cx('min-h-tap shrink-0 rounded-pill px-3 text-caption font-semibold', category === 'all' ? 'bg-accent text-accent-ink' : 'bg-soft text-ink')}>
            {t('materials.all')}
          </button>
          {CATEGORIES.map((c) => (
            <button key={c} type="button" onClick={() => setCategory(c)}
              className={cx('min-h-tap shrink-0 rounded-pill px-3 text-caption font-semibold', category === c ? 'bg-accent text-accent-ink' : 'bg-soft text-ink')}>
              {t(`materials.cat.${c}`)}
            </button>
          ))}
        </div>

        {materials.isLoading ? (
          <div className="flex justify-center py-8"><Spinner className="h-6 w-6 text-accent" /></div>
        ) : (materials.data ?? []).length === 0 ? (
          <p className="rounded-card bg-soft p-4 text-small text-muted">{t('materials.empty')}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {(materials.data ?? []).map((m) => {
              const low = Number(m.stock_qty) <= Number(m.low_stock_threshold);
              return (
                <div key={m.id} className="flex items-center gap-3 rounded-card bg-surface p-3" data-testid="material-row">
                  <div className="flex-1">
                    <p className="text-small font-semibold text-ink">{m.name_en}</p>
                    <p className="text-note text-muted">{m.category} · {m.stock_qty} {m.unit}</p>
                  </div>
                  {low ? <span className="rounded-pill bg-warn-bg px-2 py-0.5 text-note font-bold text-warn">{t('materials.low')}</span> : null}
                  <button type="button" onClick={() => setAdjustId(m.id)}
                    className="min-h-tap rounded-pill bg-soft px-3 text-caption font-semibold text-ink">
                    {t('materials.adjust')}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <Button variant="secondary" onClick={() => setShowForm((v) => !v)} className="w-full">
          {showForm ? t('common.close') : t('materials.add')}
        </Button>

        {showForm ? (
          <div className="flex flex-col gap-2 rounded-card bg-soft p-4">
            <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder={t('materials.nameEn')}
              className="min-h-tap w-full rounded-field border-[1.5px] border-line bg-surface px-3 py-2 text-input text-ink" />
            <input value={nameAr} onChange={(e) => setNameAr(e.target.value)} placeholder={t('materials.nameAr')}
              className="min-h-tap w-full rounded-field border-[1.5px] border-line bg-surface px-3 py-2 text-input text-ink" />
            <select value={cat} onChange={(e) => setCat(e.target.value)}
              className="min-h-tap w-full rounded-field border-[1.5px] border-line bg-surface px-3 py-2 text-input text-ink">
              {CATEGORIES.map((c) => <option key={c} value={c}>{t(`materials.cat.${c}`)}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input type="number" value={stock} onChange={(e) => setStock(e.target.value)} placeholder={t('materials.stock')}
                className="min-h-tap w-full rounded-field border-[1.5px] border-line bg-surface px-3 py-2 text-input text-ink" />
              <input type="number" value={threshold} onChange={(e) => setThreshold(e.target.value)} placeholder={t('materials.threshold')}
                className="min-h-tap w-full rounded-field border-[1.5px] border-line bg-surface px-3 py-2 text-input text-ink" />
            </div>
            <Button onClick={() => void submitNew()} loading={create.isPending} className="w-full">{t('materials.save')}</Button>
          </div>
        ) : null}

        {adjustId ? (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4" data-testid="adjust-sheet">
            <div className="w-full max-w-sm rounded-card bg-surface p-4">
              <h3 className="mb-2 text-title">{t('materials.adjustStock')}</h3>
              <input type="number" value={adjustDelta} onChange={(e) => setAdjustDelta(e.target.value)}
                className="min-h-tap mb-2 w-full rounded-field border-[1.5px] border-line bg-surface px-3 py-2 text-input text-ink" />
              <select value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)}
                className="min-h-tap mb-3 w-full rounded-field border-[1.5px] border-line bg-surface px-3 py-2 text-input text-ink">
                <option value="purchase">{t('materials.reason.purchase')}</option>
                <option value="used">{t('materials.reason.used')}</option>
                <option value="adjustment">{t('materials.reason.adjustment')}</option>
                <option value="return">{t('materials.reason.return')}</option>
              </select>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setAdjustId(null)} className="flex-1">{t('common.close')}</Button>
                <Button onClick={async () => {
                  await adjust.mutateAsync({ materialId: adjustId, delta: Number(adjustDelta), reason: adjustReason as 'purchase' | 'used' | 'adjustment' | 'return' });
                  setAdjustId(null); setAdjustDelta('1');
                }} loading={adjust.isPending} className="flex-1">{t('materials.save')}</Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Screen>
  );
}
