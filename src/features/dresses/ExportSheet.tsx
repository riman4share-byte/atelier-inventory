import { useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import * as XLSX from 'xlsx';
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
import { buildCatalogHtml, buildStockReportHtml, printHtml } from './printDocument';
import QRCode from 'qrcode';

type ExportFormat = 'excel' | 'csv' | 'catalog' | 'report' | 'share';
type ExportScope = 'filters' | 'selected' | 'all';

const FORMATS: ReadonlyArray<{ value: ExportFormat; labelKey: string }> = [
  { value: 'excel', labelKey: 'export.formatExcel' },
  { value: 'csv', labelKey: 'export.formatCsv' },
  { value: 'catalog', labelKey: 'export.formatCatalog' },
  { value: 'report', labelKey: 'export.formatReport' },
  { value: 'share', labelKey: 'export.formatShare' },
];

function downloadCsv(bytes: Uint8Array, filename: string): void {
  const blob = new Blob([bytes.buffer], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function countByStatus(dresses: DressRow[]): Record<DressRow['status'], number> {
  const counts = { available: 0, reserved: 0, rented: 0, sold: 0 };
  for (const dress of dresses) counts[dress.status] += 1;
  return counts;
}

/** One scannable QR per dress; the target route goes live in Phase 7. */async function catalogQrCodes(dresses: DressRow[]): Promise<Record<string, string>> {
  const origin = window.location.origin;
  const entries = await Promise.all(
    dresses.map(async (dress) => [
      dress.code,
      await QRCode.toDataURL(`${origin}/d/${dress.code}`, { margin: 0, width: 240 }),
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

function Chip({
  selected,
  disabled,
  onClick,
  children,
}: {
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={
        disabled
          ? 'min-h-tap shrink-0 rounded-pill bg-soft px-3 text-caption font-semibold text-muted opacity-60'
          : selected
            ? 'min-h-tap shrink-0 rounded-pill bg-accent px-3 text-caption font-semibold text-accent-ink'
            : 'min-h-tap shrink-0 rounded-pill bg-soft px-3 text-caption font-semibold text-ink'
      }
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
    const ids = effectiveScope === 'selected' ? selectedIds : undefined;
    return fetchDressesForExport({
      search,
      status: status === 'all' ? null : status,
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
        const rows = exportRows(dresses, [...activeColumns, QR_URL_COLUMN, EXPORT_DATE_COLUMN], origin);
        const sheet = XLSX.utils.aoa_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, sheet, 'Dresses');
        XLSX.writeFile(workbook, `dresses-${filenameDate}.xlsx`);
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
          buildCatalogHtml(dresses, { perPage, showPrices, atelierName: t('app.name'), qrByCode, photoUrlByCode }),
        );
        onClose();
        return;
      }
      if (format === 'report') {
        const dresses = await resolveSelection();
        printHtml(
          buildStockReportHtml(dresses, { atelierName: t('app.name'), counts: countByStatus(dresses) }),
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

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end" data-testid="export-sheet">
      <button type="button" aria-label={t('common.close')} onClick={onClose} className="flex-1 bg-black/30" />
      <div className="max-h-[85dvh] overflow-y-auto rounded-sheet border border-line bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-title">{t('export.title')}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="min-h-tap rounded-pill bg-soft px-3 text-caption font-bold text-ink"
          >
            ✕
          </button>
        </div>

        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-3">
          {FORMATS.map((item) => (
            <Chip key={item.value} selected={format === item.value} onClick={() => setFormat(item.value)}>
              {t(item.labelKey)}
            </Chip>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex gap-2" role="group" aria-label={t('export.scopeLabel')}>
            <Chip selected={effectiveScope === 'filters'} onClick={() => setScope('filters')}>
              {t('export.scopeFilters')}
            </Chip>
            <Chip
              selected={effectiveScope === 'selected'}
              disabled={!hasSelection}
              onClick={() => setScope('selected')}
            >
              {t('export.scopeSelected', { count: selectedIds.length })}
            </Chip>
            <Chip selected={effectiveScope === 'all'} onClick={() => setScope('all')}>
              {t('export.scopeAll')}
            </Chip>
          </div>

          {(format === 'excel' || format === 'csv') && (
            <div className="flex flex-wrap gap-2" role="group" aria-label={t('export.columnsLabel')}>
              {DEFAULT_EXPORT_COLUMNS.map((column) => (
                <Chip
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
                </Chip>
              ))}
            </div>
          )}

          {format === 'catalog' && (
            <div className="flex gap-2" role="group" aria-label={t('export.perPageLabel')}>
              {(['1', '2', '4'] as const).map((value) => (
                <Chip
                  key={value}
                  selected={String(perPage) === value}
                  onClick={() => setPerPage(Number(value) as 1 | 2 | 4)}
                >
                  {value} {t('export.perPageUnit')}
                </Chip>
              ))}
            </div>
          )}

          {format === 'share' && (
            <div className="flex gap-2" role="group" aria-label={t('share.expiryLabel')}>
              <Chip selected={expiry === 'never'} onClick={() => setExpiry('never')}>
                {t('share.expiryNever')}
              </Chip>
              <Chip selected={expiry === '24h'} onClick={() => setExpiry('24h')}>
                {t('share.expiry24h')}
              </Chip>
              <Chip selected={expiry === '7d'} onClick={() => setExpiry('7d')}>
                {t('share.expiry7d')}
              </Chip>
            </div>
          )}

          {(format === 'catalog' || format === 'share') && (
            <label className="flex min-h-tap items-center justify-between text-small font-semibold text-ink">
              <span>{format === 'catalog' ? t('export.showPrices') : t('share.showPrices')}</span>
              <input
                type="checkbox"
                checked={showPrices}
                onChange={(event) => setShowPrices(event.target.checked)}
                className="h-5 w-5"
              />
            </label>
          )}

          <p className="text-note text-muted">{t('export.englishOnlyNote')}</p>
          {errorText ? <p className="text-small text-danger">{errorText}</p> : null}

          <button
            type="button"
            disabled={busy}
            onClick={() => void run()}
            className="min-h-tap rounded-btn bg-brand py-[13px] text-body font-bold text-white shadow-btn disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? t('export.working') : t('export.generate')}
          </button>

          {createdLink ? (
            <div className="rounded-field bg-soft p-3" data-testid="created-share-link">
              <p className="text-note text-muted">{t('share.created')}</p>
              <p className="mt-1 break-all text-small text-ink">{createdLink}</p>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard
                    .writeText(createdLink)
                    .then(() => setCopied(createdLink))
                    .catch(() => setCopied(null));
                }}
                className="mt-2 min-h-tap rounded-pill bg-accent px-3 text-caption font-semibold text-accent-ink"
              >
                {copied === createdLink ? t('share.copied') : t('share.copy')}
              </button>
            </div>
          ) : null}

          {format === 'share' && (recentLinks.data?.length ?? 0) > 0 ? (
            <div className="flex flex-col gap-2">
              <p className="text-caption font-semibold text-muted">{t('share.recent')}</p>
              {recentLinks.data?.slice(0, 5).map((link) => (
                <div key={link.id} className="flex items-center gap-2 rounded-field bg-soft p-2.5">
                  <p className="flex-1 break-all text-note text-muted">
                    {shareLinkUrl(link.token, window.location.origin)}
                  </p>
                  {!link.revoked ? (
                    <button
                      type="button"
                      onClick={() => revokeShare.mutate(link.id)}
                      className="min-h-tap shrink-0 rounded-pill bg-danger-bg px-3 text-caption font-semibold text-danger"
                    >
                      {t('share.revoke')}
                    </button>
                  ) : (
                    <span className="shrink-0 rounded-pill bg-off-bg px-3 py-1 text-note font-semibold text-off">
                      {t('share.revoked')}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
