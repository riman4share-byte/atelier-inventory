import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Metric } from '@/components/ui/Metric';
import { Panel } from '@/components/ui/Panel';
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
import { useAllMovements, useMovementNames } from '@/features/movements/api';
import { exportMovementsToExcel } from '@/features/movements/export';
import { useAtelierBranding } from '@/features/branding/useAtelierBranding';
import { formatMoney, formatNumber } from '@/lib/format';
import { DownloadIcon, QrIcon } from '@/components/icons';

export function DashboardPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const dashboard = useDashboardState();
  const rows = dashboard.rows;
  const movementSummary = useMovementSummary();
  const allMovements = useAllMovements({});
const movementNames = useMovementNames(allMovements.data ?? []);
// The atelier's name and logo, for the exported sheet.
const branding = useAtelierBranding();
  const [exportOpen, setExportOpen] = useState(false);

  const counts = countByStatus(rows);
  const total = rows.length;
  const attention = needsAttention(rows, i18n.language);
  const recent = rows.slice(0, 6);

  // A failed query must never look like an empty atelier.
  if (dashboard.isError) {
    return (
      <Screen eyebrow={t('nav.home')} title={t('dashboard.title')} subtitle={t('dashboard.subtitle')}>
        <Panel className="flex flex-col items-center gap-3 px-6 py-10 text-center">
          <p className="text-body font-semibold text-ink">{t('gallery.loadFailedTitle')}</p>
          <p className="text-small text-muted">{t('gallery.loadFailedBody')}</p>
          <Button variant="secondary" className="w-auto px-4" onClick={dashboard.refetch}>
            {t('common.retry')}
          </Button>
        </Panel>
      </Screen>
    );
  }

  const s = movementSummary.data;

  return (
    <Screen eyebrow={t('nav.home')} title={t('dashboard.title')} subtitle={t('dashboard.subtitle')}>
      <div className="flex flex-1 flex-col gap-3" data-testid="dashboard">
        {/* Status strip — the headline readings, in one hairline frame. */}
        <Panel flush>
          <div className="grid grid-cols-2 divide-x divide-y divide-line sm:grid-cols-4 sm:divide-y-0">
            {(['available', 'reserved', 'rented', 'sold'] as const).map((value) => (
              <div key={value} className="px-3 py-2.5">
                <p className="eyebrow">{t(`status.${value}`)}</p>
                <p className="mt-1 font-mono text-metric font-semibold tracking-tight text-ink">
                  {counts[value]}
                </p>
              </div>
            ))}
          </div>
        </Panel>

        <div className="grid grid-cols-2 gap-3">
          <Metric
            label={t('dashboard.saleValue')}
            value={t('format.currency', { value: formatMoney(listedSaleValue(rows), i18n.language) })}
            hint={`${formatNumber(total, i18n.language)} ${t('gallery.heroLabel')}`}
          />
          <Metric
            label={t('dashboard.rentValue')}
            value={t('format.currency', { value: formatMoney(listedRentValue(rows), i18n.language) })}
            hint={t('dashboard.perDayNote')}
          />
        </div>

        {s ? (
          <Panel title={t('dashboard.movementSummary')} flush>
            <div className="grid grid-cols-2 divide-x divide-y divide-line sm:grid-cols-4 sm:divide-y-0">
              {[
                { label: t('dashboard.outNow'), value: s.outNow, tone: 'accent' as const },
                { label: t('dashboard.overdue'), value: s.overdue, tone: 'warn' as const },
                { label: t('dashboard.dueThisWeek'), value: s.dueThisWeek, tone: 'info' as const },
                {
                  label: t('dashboard.reservedThisMonth'),
                  value: s.reservedThisMonth,
                  tone: 'off' as const,
                },
              ].map((item) => (
                <div key={item.label} className="relative px-3 py-2.5">
                  <span
                    aria-hidden="true"
                    className={`absolute inset-x-0 top-0 h-0.5 ${
                      item.tone === 'accent'
                        ? 'bg-accent'
                        : item.tone === 'warn'
                          ? 'bg-warn'
                          : item.tone === 'info'
                            ? 'bg-info'
                            : 'bg-off'
                    }`}
                  />
                  <p className="eyebrow truncate">{item.label}</p>
                  <p className="mt-1 font-mono text-metric font-semibold tracking-tight text-ink">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </Panel>
        ) : null}

        {/* Exceptions first — this is the list the owner actually acts on. */}
        <Panel
          title={t('dashboard.attention')}
          action={
            attention.length > 0 ? (
              <span className="rounded-pill bg-warn-bg px-1.5 py-0.5 font-mono text-[10px] font-semibold text-warn">
                {attention.length}
              </span>
            ) : null
          }
          flush
        >
          {total === 0 ? (
            <p className="px-3 py-3 text-small text-muted">{t('dashboard.attentionEmpty')}</p>
          ) : attention.length === 0 ? (
            <p className="px-3 py-3 text-small text-muted">{t('dashboard.attentionNone')}</p>
          ) : (
            <ul className="divide-y divide-line">
              {attention.map((item) => (
                <li key={`${item.kind}-${item.code}`}>
                  <button
                    type="button"
                    onClick={() => {
                      setExportOpen(false);
                      navigate(`/dresses?view=table&initialSearch=${encodeURIComponent(item.code)}`);
                    }}
                    className="flex w-full items-center gap-3 px-3 py-2 text-start transition-colors hover:bg-surface-2"
                  >
                    <span className="flex-1 truncate text-small text-ink">
                      {t(
                        `dashboard.attention${item.kind.charAt(0).toUpperCase()}${item.kind.slice(1)}`,
                        { code: item.code, name: item.name },
                      )}
                    </span>
                    <span className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-warn">
                      {t('dashboard.fix')}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {recent.length > 0 ? (
          <Panel title={t('dashboard.recent')} flush>
            <ul className="divide-y divide-line">
              {recent.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/dresses/${row.id}`)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-start transition-colors hover:bg-surface-2"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-small text-ink">
                        {(i18n.language.startsWith('ar') ? row.name_ar : row.name_en) || row.code}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-[11px] tracking-tight text-muted">
                      {row.code}
                    </span>
                    <span className="shrink-0 font-mono text-[11px] tracking-tight text-faint">
                      {row.created_at.slice(0, 10)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
        ) : null}

        <div className="mt-1 grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setExportOpen(true)}
            data-testid="export-inventory"
          >
            <DownloadIcon className="h-3.5 w-3.5" />
            {t('dashboard.export')}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              void exportMovementsToExcel(
                allMovements.data ?? [],
                `movements-${new Date().toISOString().slice(0, 10)}.xlsx`,
                {
                  dresses: movementNames.data?.dresses ?? {},
                  customers: movementNames.data?.customers ?? {},
                },
                {
                  atelierName: branding.atelierName,
                  logoDataUrl: null,
                  tagline: branding.tagline,
                  contact: branding.contact,
                  poweredBy: branding.poweredBy,
                },
                {
                  title: t('export.movementsTitle'),
                  generatedAt: new Date().toLocaleString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
                  summary: t('export.movementsSummary', { count: allMovements.data?.length ?? 0 }),
                  sheetName: t('export.movementsSheetName'),
                  tableName: 'Movements',
                },
              )
            }
            data-testid="export-movements"
          >
            <QrIcon className="h-3.5 w-3.5" />
            {t('dashboard.exportMovements')}
          </Button>
        </div>
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
