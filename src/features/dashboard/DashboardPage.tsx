import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/layout/Screen';
import { ExportSheet } from '@/features/dresses/ExportSheet';
import {
  countByStatus,
  listedSaleValue,
  listedRentValue,
  needsAttention,
  useDashboardState,
} from './api';
import { useMovementSummary } from '@/features/movements/api';
import { useAllMovements } from '@/features/movements/api';
import { exportMovementsToExcel } from '@/features/movements/export';
import { cx } from '@/lib/cx';

const STATUS_TILE_CLASSES: Record<string, string> = {
  available: 'bg-ok-bg text-ok',
  reserved: 'bg-warn-bg text-warn',
  rented: 'bg-info-bg text-info',
  sold: 'bg-off-bg text-off',
};

export function DashboardPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const dashboard = useDashboardState();
  const rows = dashboard.rows;
  const movementSummary = useMovementSummary();
  const allMovements = useAllMovements({});
  const [exportOpen, setExportOpen] = useState(false);

  const counts = countByStatus(rows);
  const total = rows.length;
  const attention = needsAttention(rows, i18n.language);
  const recent = rows.slice(0, 5);

  // A failed query must never look like an empty atelier.
  if (dashboard.isError) {
    return (
      <Screen title={t('dashboard.title')} subtitle={t('dashboard.subtitle')}>
        <div className="flex flex-1 flex-col items-center gap-3 rounded-card bg-soft px-6 py-10 text-center">
          <p className="text-body font-semibold text-ink">{t('gallery.loadFailedTitle')}</p>
          <p className="text-small text-muted">{t('gallery.loadFailedBody')}</p>
          <Button variant="secondary" className="w-auto px-4" onClick={dashboard.refetch}>
            {t('common.retry')}
          </Button>
        </div>
      </Screen>
    );
  }

  return (
    <Screen title={t('dashboard.title')} subtitle={t('dashboard.subtitle')}>
      <div className="flex flex-1 flex-col gap-4" data-testid="dashboard">
        <div className="rounded-card bg-brand px-4 py-4 text-white shadow-frame">
          <p className="text-caption opacity-90">{t('dashboard.greeting')}</p>
          <p className="mt-1 text-hero font-serif font-semibold">{t('dashboard.headline')}</p>
          <div className="mt-3 flex gap-2">
            <span className="rounded-[12px] bg-white/20 px-2.5 py-1.5 text-note font-semibold">
              <strong className="block text-body">{total}</strong>
              {t('gallery.heroLabel')}
            </span>
            <span className="rounded-[12px] bg-white/20 px-2.5 py-1.5 text-note font-semibold">
              <strong className="block text-body">{counts.reserved}</strong>
              {t('dashboard.outReserved')}
            </span>
            <span className="rounded-[12px] bg-white/20 px-2.5 py-1.5 text-note font-semibold">
              <strong className="block text-body">{attention.length}</strong>
              {t('dashboard.needInfo')}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5" role="group" aria-label={t('dashboard.countsLabel')}>
          {(['available', 'reserved', 'rented', 'sold'] as const).map((value) => (
            <div key={value} className={cx('rounded-tile p-3', STATUS_TILE_CLASSES[value])}>
              <strong className="block text-hero font-serif font-semibold">{counts[value]}</strong>
              <small className="text-caption font-semibold">{t(`status.${value}`)}</small>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-tile bg-soft p-3" data-testid="sale-value">
            <p className="text-note text-muted">{t('dashboard.saleValue')}</p>
            <p className="mt-1 text-body font-serif font-bold text-ink">
              {t('format.currency', { value: listedSaleValue(rows) })}
            </p>
          </div>
          <div className="rounded-tile bg-soft p-3" data-testid="rent-value">
            <p className="text-note text-muted">{t('dashboard.rentValue')}</p>
            <p className="mt-1 text-body font-serif font-bold text-ink">
              {t('format.currency', { value: listedRentValue(rows) })}
            </p>
            <p className="text-note text-muted">{t('dashboard.perDayNote')}</p>
          </div>
        </div>

        {(() => {
          const s = movementSummary.data;
          if (!s) return null;
          return (
            <div className="grid grid-cols-2 gap-2.5" data-testid="movement-summary">
              <div className="rounded-tile bg-soft p-3">
                <strong className="block text-hero font-serif font-semibold text-ink">{s.outNow}</strong>
                <small className="text-caption font-semibold text-muted">{t('dashboard.outNow')}</small>
              </div>
              <div className="rounded-tile bg-soft p-3">
                <strong className="block text-hero font-serif font-semibold text-ink">{s.overdue}</strong>
                <small className="text-caption font-semibold text-muted">{t('dashboard.overdue')}</small>
              </div>
              <div className="rounded-tile bg-soft p-3">
                <strong className="block text-hero font-serif font-semibold text-ink">{s.dueThisWeek}</strong>
                <small className="text-caption font-semibold text-muted">{t('dashboard.dueThisWeek')}</small>
              </div>
              <div className="rounded-tile bg-soft p-3">
                <strong className="block text-hero font-serif font-semibold text-ink">{s.reservedThisMonth}</strong>
                <small className="text-caption font-semibold text-muted">{t('dashboard.reservedThisMonth')}</small>
              </div>
            </div>
          );
        })()}

        <div className="flex flex-col gap-2">
          <p className="text-caption font-semibold text-muted">{t('dashboard.attention')}</p>
          {total === 0 ? (
            <p className="rounded-card bg-soft p-3 text-small text-muted">
              {t('dashboard.attentionEmpty')}
            </p>
          ) : attention.length === 0 ? (
            <p className="rounded-card bg-soft p-3 text-small text-muted">
              {t('dashboard.attentionNone')}
            </p>
          ) : (
            attention.map((item) => (
              <button
                key={`${item.kind}-${item.code}`}
                type="button"
                onClick={() => {
                  setExportOpen(false);
                  navigate(`/dresses?view=table&initialSearch=${encodeURIComponent(item.code)}`);
                }}
                className="flex min-h-tap items-center gap-3 rounded-field bg-surface px-3 py-2 text-start"
              >
                <span className="flex-1 text-small font-semibold text-ink">
                  {t(`dashboard.attention${item.kind.charAt(0).toUpperCase()}${item.kind.slice(1)}`, {
                    code: item.code,
                    name: item.name,
                  })}
                </span>
                <span className="rounded-pill bg-warn-bg px-2.5 py-[3px] text-note font-bold text-warn">
                  {t('dashboard.fix')}
                </span>
              </button>
            ))
          )}
        </div>

        {recent.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-caption font-semibold text-muted">{t('dashboard.recent')}</p>
            {recent.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => navigate(`/dresses/${row.id}`)}
                className="flex min-h-tap items-center gap-3 rounded-field bg-surface px-3 py-2 text-start"
              >
                <span className="flex-1">
                  <span className="block text-small font-semibold text-ink">
                    {(i18n.language.startsWith('ar') ? row.name_ar : row.name_en) || row.code}
                  </span>
                  <span className="text-note text-muted">
                    {row.code} · {row.created_at.slice(0, 10)}
                  </span>
                </span>
                <span className="text-note text-muted">{t(`status.${row.status}`)}</span>
              </button>
            ))}
          </div>
        ) : null}

        <Button
          variant="secondary"
          onClick={() => setExportOpen(true)}
          className="mt-1"
          data-testid="export-inventory"
        >
          {t('dashboard.export')}
        </Button>
        <Button
          variant="secondary"
          onClick={() => exportMovementsToExcel(allMovements.data ?? [], `movements-${new Date().toISOString().slice(0, 10)}.xlsx`)}
          className="mt-1"
          data-testid="export-movements"
        >
          {t('dashboard.exportMovements')}
        </Button>
      </div>

      <ExportSheet
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        search=""
        status="all"
        selectedIds={[]}
        initialScope="all"
      />
    </Screen>
  );
}
