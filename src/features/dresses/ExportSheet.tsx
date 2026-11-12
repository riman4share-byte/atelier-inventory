import { useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  EXPORT_ROW_LIMIT,
  fetchDressesForExport,
  newShareToken,
  shareLinkUrl,
  useCreateShareLink,
  useRevokeShareLink,
  useShareLinks,
  type DressRow,
} from './api';
import type { StatusFilter } from './dressSearch';
import {
  DEFAULT_EXPORT_COLUMNS,
  EXPORT_DATE_COLUMN,
  QR_URL_COLUMN,
  excelCompatibleCsv,
  exportRows,
} from './exportData';
import { buildExcelWorkbook } from './excelExport';
import { buildCatalogHtml, buildStockReportHtml, printHtml } from './printDocument';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { SegmentedControl, type SegmentOption } from '@/components/ui/SegmentedControl';
import { XIcon } from '@/components/icons';
import { useAtelierBranding } from '@/features/branding/useAtelierBranding';
import { cx } from '@/lib/cx';

type ExportFormat = 'excel' | 'csv' | 'catalog' | 'report' | 'share';
type ExportScope = 'filters' | 'selected' | 'all';
/** `none` marks "no segment of the pair is selected" while the wide scope is on. */
type ScopeChoice = ExportScope | 'none';

const FORMATS: ReadonlyArray<{ value: ExportFormat; labelKey: string }> = [
  { value: 'excel', labelKey: 'export.formatExcel' },
  { value: 'csv', labelKey: 'export.formatCsv' },
  { value: 'catalog', labelKey: 'export.formatCatalog' },
  { value: 'report', labelKey: 'export.formatReport' },
  { value: 'share', labelKey: 'export.formatShare' },
];

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadCsv(bytes: Uint8Array, filename: string): void {
  downloadBlob(new Blob([bytes.buffer], { type: 'text/csv;charset=utf-8' }), filename);
}

function countByStatus(dresses: DressRow[]): Record<DressRow['status'], number> {
  const counts = { available: 0, reserved: 0, rented: 0, sold: 0 };
  for (const dress of dresses) counts[dress.status] += 1;
  return counts;
}

/**
 * One scannable QR per dress, keyed by dress code. The link carries the
 * dress's unguessable public token, never its sequential code.
 */
async function catalogQrCodes(dresses: DressRow[]): Promise<Record<string, string>> {
  const origin = window.location.origin;
  // The QR library is only needed when a catalog is actually printed, so it
  // is fetched here rather than shipped in the first download.
  const QRCode = (await import('qrcode')).default;
  const entries = await Promise.all(
    dresses.map(async (dress) => [
      dress.code,
      await QRCode.toDataURL(`${origin}/d/${dress.public_token}`, { margin: 1, width: 240 }),
    ]),
  );
  return Object.fromEntries(entries);
}

interface ExportSheetProps {
  open: boolean;
  onClose: () => void;
  search: string;
  status: StatusFilter;
  selectedIds: string[];
  initialScope?: ExportScope;
}

/** A column toggle — a hairline cell that reads as on or off. */
function ColumnToggle({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cx(
        'h-7 shrink-0 rounded-field border px-2 text-caption font-semibold tracking-tight transition-colors',
        selected
          ? 'border-accent-line bg-accent-bg text-accent'
          : 'border-line bg-surface text-muted hover:border-line-strong hover:text-ink',
      )}
    >
      {children}
    </button>
  );
}

export function ExportSheet({
  open,
  onClose,
  search,
  status,
  selectedIds,
  initialScope = 'filters',
}: ExportSheetProps) {
  const { t } = useTranslation();
  const columnsLegendId = useId();
  const [format, setFormat] = useState<ExportFormat>('excel');
  const [scope, setScope] = useState<ExportScope>(initialScope);
  const [showPrices, setShowPrices] = useState(false);
  const [perPage, setPerPage] = useState<1 | 2 | 4>(1);
  const [expiry, setExpiry] = useState<'never' | '24h' | '7d'>('7d');
  const [busy, setBusy] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [disabledColumns, setDisabledColumns] = useState<ReadonlySet<string>>(new Set());
  // The atelier's name and logo, for the printed documents.
  const branding = useAtelierBranding();
  const recentLinks = useShareLinks();
  const createShare = useCreateShareLink();
  const revokeShare = useRevokeShareLink();

  const hasSelection = selectedIds.length > 0;
  const effectiveScope: ExportScope =
    scope === 'selected' && !hasSelection ? 'filters' : scope;

  const activeColumns = useMemo(
    () =>
      DEFAULT_EXPORT_COLUMNS.filter((column) => !disabledColumns.has(column.id)),
    [disabledColumns],
  );

  if (!open) return null;

  const resolveSelection = async (): Promise<DressRow[]> => {
    // "Everything" ignores the current filters; "selected" uses the ids.
    const ids = effectiveScope === 'selected' ? selectedIds : undefined;
    return fetchDressesForExport({
      search: effectiveScope === 'all' ? '' : search,
      status: effectiveScope === 'all' ? null : status === 'all' ? null : status,
      ids,
    });
  };

  const run = async () => {
    setBusy(true);
    setErrorText(null);
    try {
      const origin = window.location.origin;
      const filenameDate = new Date().toISOString().slice(0, 10);
      if (format === 'excel') {
        const dresses = await resolveSelection();
        const columns = [...activeColumns, QR_URL_COLUMN, EXPORT_DATE_COLUMN];
        // The spreadsheet library is large. Loading it only when an Excel
        // export is actually requested keeps it out of the first download.
        const ExcelJS = await import('exceljs');

        // The logo is put into the sheet, so the file carries the atelier's
        // mark rather than only the app's.
        let logoDataUrl: string | null = null;
        if (branding.logoUrl) {
          try {
            const response = await fetch(branding.logoUrl);
            if (response.ok) {
              const blob = await response.blob();
              logoDataUrl = await new Promise<string | null>((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
                reader.onerror = () => resolve(null);
                reader.readAsDataURL(blob);
              });
            }
          } catch {
            logoDataUrl = null;
          }
        }

        const now = new Date();
        const workbook = await buildExcelWorkbook(
          ExcelJS,
          dresses,
          columns,
          origin,
          {
            atelierName: branding.atelierName,
            logoDataUrl,
            tagline: branding.tagline,
            contact: branding.contact,
            poweredBy: branding.poweredBy,
          },
          {
            title: t('export.excelTitle'),
            generatedAt: now.toLocaleString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
            summary: t('export.excelSummary', { count: dresses.length }),
            sheetName: t('export.excelSheetName'),
            tableName: 'Dresses',
          },        );

        const buffer = await workbook.xlsx.writeBuffer();
        downloadBlob(
          new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          }),
          `dresses-${filenameDate}.xlsx`,
        );
        onClose();
        return;
      }
      if (format === 'csv') {
        const dresses = await resolveSelection();
        const rows = exportRows(dresses, [...activeColumns, QR_URL_COLUMN, EXPORT_DATE_COLUMN], origin);
        downloadCsv(excelCompatibleCsv(rows), `dresses-${filenameDate}.csv`);
        onClose();
        return;
      }
      if (format === 'catalog') {
        const dresses = await resolveSelection();
        const [qrByCode, photoUrlByCode] = await Promise.all([
          catalogQrCodes(dresses),
          import('@/features/photos/api').then((photos) => photos.firstPhotoUrls(dresses)),
        ]);
        printHtml(
          buildCatalogHtml(dresses, {
            perPage,
            showPrices,
            atelierName: branding.atelierName,
            logoUrl: branding.logoUrl,
            poweredBy: branding.poweredBy,
            qrByCode,
            photoUrlByCode,
          }),
        );
        onClose();
        return;
      }
      if (format === 'report') {
        const dresses = await resolveSelection();
        printHtml(
          buildStockReportHtml(dresses, {
            atelierName: branding.atelierName,
            logoUrl: branding.logoUrl,
            poweredBy: branding.poweredBy,
            counts: countByStatus(dresses),
          }),
        );
        onClose();
        return;
      }

      // Share link: created inside the sheet so the link can be copied.
      const dresses = await resolveSelection();
      const hours: number | null = expiry === '24h' ? 24 : expiry === '7d' ? 168 : null;
      const token = newShareToken();
      await createShare.mutateAsync({
        token,
        dress_ids: dresses.map((dress) => dress.id),
        show_prices: showPrices,
        expires_at:
          hours === null ? null : new Date(Date.now() + hours * 3600_000).toISOString(),
      });
      setCreatedLink(shareLinkUrl(token, origin));
    } catch (error) {
      setErrorText(
        error instanceof Error && error.message === 'too_many_rows'
          ? t('export.tooManyRows', { limit: EXPORT_ROW_LIMIT })
          : t('export.failed'),
      );
    } finally {
      setBusy(false);
    }
  };

  const formatOptions: ReadonlyArray<SegmentOption<ExportFormat>> = FORMATS.map((item) => ({
    value: item.value,
    label: t(item.labelKey),
  }));

  const scopeOptions: ReadonlyArray<SegmentOption<ScopeChoice>> = [
    { value: 'filters', label: t('export.scopeFilters') },
    { value: 'selected', label: t('export.scopeSelected', { count: selectedIds.length }) },
  ];

  const perPageOptions: ReadonlyArray<SegmentOption<'1' | '2' | '4'>> = (['1', '2', '4'] as const).map(
    (value) => ({ value, label: `${value} ${t('export.perPageUnit')}` }),
  );

  const expiryOptions: ReadonlyArray<SegmentOption<'never' | '24h' | '7d'>> = [
    { value: 'never', label: t('share.expiryNever') },
    { value: '24h', label: t('share.expiry24h') },
    { value: '7d', label: t('share.expiry7d') },
  ];

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end" data-testid="export-sheet">
      <button
        type="button"
        aria-label={t('common.close')}
        onClick={onClose}
        className="flex-1 bg-black/30"
      />
      <div className="flex max-h-[85dvh] flex-col overflow-y-auto rounded-t-sheet border-t border-line bg-surface pb-safe">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-line bg-surface px-3 py-2">
          <h2 className="text-title font-semibold tracking-tight text-ink">{t('export.title')}</h2>
          <Button
            variant="ghost"
            size="sm"
            fullWidth={false}
            aria-label={t('common.close')}
            onClick={onClose}
            className="w-8 !px-0"
          >
            <XIcon className="h-4 w-4" />
          </Button>
        </header>

        <div className="flex flex-col gap-3 px-3 pb-3 pt-3">
          <Panel>
            <div className="flex flex-col gap-3">
              {/* Format */}
              <div className="no-scrollbar -mx-3 overflow-x-auto px-3">
                <div className="w-max">
                  <SegmentedControl
                    label={t('export.title')}
                    options={formatOptions}
                    value={format}
                    onChange={(value) => setFormat(value)}
                  />
                </div>
              </div>

              {/* Scope — the filtered pair, then the wide scope on its own. */}
              <div className="flex flex-col gap-2 border-t border-line pt-3">
                <p className="eyebrow">{t('export.scopeLabel')}</p>
                <SegmentedControl
                  label={t('export.scopeLabel')}
                  options={scopeOptions}
                  value={effectiveScope === 'all' ? 'none' : effectiveScope}
                  onChange={(value) => {
                    if (value === 'none') return;
                    // Without a selection there is nothing to export by id.
                    setScope(value === 'selected' && !hasSelection ? 'filters' : value);
                  }}
                />
                {/* "Everything" ignores the filters, so it has a wider blast
                    radius than a filtered scope. It sits outside the segmented
                    pair, in its own full-width cell, and never reads as a
                    third tab. */}
                <button
                  type="button"
                  aria-pressed={effectiveScope === 'all'}
                  onClick={() => setScope('all')}
                  className={cx(
                    'flex w-full items-center justify-between gap-2 rounded-field border px-2.5 py-1.5 transition-colors',
                    effectiveScope === 'all'
                      ? 'border-accent-line bg-accent-bg text-accent'
                      : 'border-line-strong bg-surface text-ink hover:bg-surface-2',
                  )}
                >
                  <span className="eyebrow">{t('export.scopeAll')}</span>
                  <span
                    aria-hidden="true"
                    className={cx(
                      'h-1.5 w-1.5 rounded-full',
                      effectiveScope === 'all' ? 'bg-accent' : 'bg-faint',
                    )}
                  />
                </button>
              </div>

              {/* Columns */}
              {(format === 'excel' || format === 'csv') && (
                <div
                  role="group"
                  aria-label={t('export.columnsLabel')}
                  aria-labelledby={columnsLegendId}
                  className="flex flex-col gap-2 border-t border-line pt-3"
                >
                  <p id={columnsLegendId} className="eyebrow">
                    {t('export.columnsLabel')}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {DEFAULT_EXPORT_COLUMNS.map((column) => (
                      <ColumnToggle
                        key={column.id}
                        selected={!disabledColumns.has(column.id)}
                        onClick={() =>
                          setDisabledColumns((current) => {
                            const next = new Set(current);
                            if (next.has(column.id)) next.delete(column.id);
                            else next.add(column.id);
                            return next;
                          })
                        }
                      >
                        {t(`export.column.${column.id}`)}
                      </ColumnToggle>
                    ))}
                  </div>
                </div>
              )}

              {/* Layout */}
              {format === 'catalog' && (
                <div className="flex flex-col gap-2 border-t border-line pt-3">
                  <p className="eyebrow">{t('export.perPageLabel')}</p>
                  <SegmentedControl
                    label={t('export.perPageLabel')}
                    options={perPageOptions}
                    value={String(perPage) as '1' | '2' | '4'}
                    onChange={(value) => setPerPage(Number(value) as 1 | 2 | 4)}
                  />
                </div>
              )}

              {/* Link lifetime */}
              {format === 'share' && (
                <div className="flex flex-col gap-2 border-t border-line pt-3">
                  <p className="eyebrow">{t('share.expiryLabel')}</p>
                  <SegmentedControl
                    label={t('share.expiryLabel')}
                    options={expiryOptions}
                    value={expiry}
                    onChange={(value) => setExpiry(value)}
                  />
                </div>
              )}

              {/* Prices */}
              {(format === 'catalog' || format === 'share') && (
                <label className="flex items-center justify-between gap-3 border-t border-line pt-3">
                  <span className="text-small font-semibold text-ink">
                    {format === 'catalog' ? t('export.showPrices') : t('share.showPrices')}
                  </span>
                  <input
                    type="checkbox"
                    checked={showPrices}
                    onChange={(event) => setShowPrices(event.target.checked)}
                    className="h-4 w-4 accent-accent"
                  />
                </label>
              )}

              <p className="border-t border-line pt-3 text-note text-muted">
                {t('export.englishOnlyNote')}
              </p>
              {errorText ? (
                <p className="text-small text-danger" role="alert">
                  {errorText}
                </p>
              ) : null}
            </div>
          </Panel>

          <Button onClick={() => void run()} loading={busy}>
            {busy ? t('export.working') : t('export.generate')}
          </Button>

          {createdLink ? (
            <div
              className="rounded-card border border-line bg-surface-2 p-3"
              data-testid="created-share-link"
            >
              <p className="eyebrow">{t('share.created')}</p>
              <p className="mt-1.5 break-all font-mono text-note text-ink">{createdLink}</p>
              <Button
                variant="secondary"
                size="sm"
                fullWidth={false}
                className="mt-2 px-3"
                onClick={() => {
                  void navigator.clipboard
                    .writeText(createdLink)
                    .then(() => setCopied(createdLink))
                    .catch(() => setCopied(null));
                }}
              >
                {copied === createdLink ? t('share.copied') : t('share.copy')}
              </Button>
            </div>
          ) : null}

          {format === 'share' && (recentLinks.data?.length ?? 0) > 0 ? (
            <Panel title={t('share.recent')} flush>
              <ul className="divide-y divide-line">
                {recentLinks.data?.slice(0, 5).map((link) => (
                  <li key={link.id} className="flex items-center gap-2 px-3 py-2">
                    <p className="min-w-0 flex-1 break-all font-mono text-note text-muted">
                      {shareLinkUrl(link.token, window.location.origin)}
                    </p>
                    {!link.revoked ? (
                      <Button
                        variant="danger"
                        size="sm"
                        fullWidth={false}
                        className="shrink-0 px-2.5"
                        onClick={() => revokeShare.mutate(link.id)}
                      >
                        {t('share.revoke')}
                      </Button>
                    ) : (
                      <span className="shrink-0 rounded-pill bg-off-bg px-2 py-0.5 font-mono text-micro uppercase tracking-widest text-off">
                        {t('share.revoked')}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
        </div>
      </div>
    </div>
  );
}
