import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { DressStatus } from '@/lib/database.types';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { GownIcon } from '@/components/icons';
import { TABLE_PAGE_SIZE, useDressesTable, type TableSort } from './api';
import { paletteForCode, StatusPill } from './StatusPill';

const SORTABLE: ReadonlyArray<{ column: TableSort['column']; labelKey: string }> = [
  { column: 'code', labelKey: 'table.colCode' },
  { column: 'name_en', labelKey: 'table.colName' },
  { column: 'status', labelKey: 'table.colStatus' },
  { column: 'sale_price', labelKey: 'table.colSale' },
  { column: 'rent_price', labelKey: 'table.colRent' },
  { column: 'created_at', labelKey: 'table.colAdded' },
];

const ALL_COLUMNS: ReadonlyArray<{ id: string; labelKey: string }> = [
  { id: 'code', labelKey: 'table.colCode' },
  { id: 'name', labelKey: 'table.colName' },
  { id: 'status', labelKey: 'table.colStatus' },
  { id: 'listing', labelKey: 'table.colListing' },
  { id: 'size', labelKey: 'table.colSize' },
  { id: 'color', labelKey: 'table.colColor' },
  { id: 'fabrics', labelKey: 'table.colFabrics' },
  { id: 'sale', labelKey: 'table.colSale' },
  { id: 'rent', labelKey: 'table.colRent' },
  { id: 'materials', labelKey: 'table.colMaterials' },
  { id: 'added', labelKey: 'table.colAdded' },
];

const DEFAULT_VISIBLE = ['code', 'name', 'status', 'sale', 'materials', 'added'];

export interface SavedView {
  name: string;
  search: string;
  status: DressStatus | 'all';
  visible: string[];
  sort: TableSort;
}

const VIEWS_STORAGE_KEY = 'dresses-table-views';
const COLUMNS_STORAGE_KEY = 'dresses-table-columns';

function loadSaved(): SavedView[] {
  try {
    const raw = localStorage.getItem(VIEWS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedView[]) : [];
  } catch {
    return [];
  }
}

export interface DressesTableProps {
  search: string;
  status: DressStatus | 'all';
  sort: TableSort;
  onSort: (sort: TableSort) => void;
  onApplyView: (view: { search: string; status: DressStatus | 'all' }) => void;
  selected: ReadonlySet<string>;
  onSelectionChange: (ids: ReadonlySet<string>) => void;
  onExportSelected: () => void;
}

export function DressesTable({
  search,
  status,
  sort,
  onSort,
  onApplyView,
  selected,
  onSelectionChange,
}: DressesTableProps) {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const [visible, setVisible] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(COLUMNS_STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as string[]) : null;
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      // fall back to defaults
    }
    return DEFAULT_VISIBLE;
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [views, setViews] = useState<SavedView[]>(loadSaved);
  const [viewsOpen, setViewsOpen] = useState(false);
  const [viewName, setViewName] = useState('');

  const table = useDressesTable({ search, status, sort, page });

  useEffect(() => {
    localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(visible));
  }, [visible]);

  const rows = table.data?.rows ?? [];
  const total = table.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / TABLE_PAGE_SIZE));

  const allOnPageSelected = rows.length > 0 && rows.every((row) => selected.has(row.id));
  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  };
  const toggleAll = () => {
    const next = new Set(selected);
    if (allOnPageSelected) rows.forEach((row) => next.delete(row.id));
    else rows.forEach((row) => next.add(row.id));
    onSelectionChange(next);
  };

  const setSaved = (next: SavedView[]) => {
    setViews(next);
    localStorage.setItem(VIEWS_STORAGE_KEY, JSON.stringify(next));
  };

  return (
    <div className="flex flex-1 flex-col gap-3" data-testid="dresses-table">
      <div className="flex items-center justify-between">
        <p className="text-caption text-muted">{t('table.count', { count: total })}</p>
        <div className="flex gap-2">
          <button
            type="button"
            aria-expanded={viewsOpen}
            onClick={() => setViewsOpen((open) => !open)}
            className="min-h-tap rounded-pill bg-soft px-3 text-caption font-semibold text-ink"
          >
            {t('table.views')}
          </button>
          <button
            type="button"
            aria-expanded={pickerOpen}
            onClick={() => setPickerOpen((open) => !open)}
            className="min-h-tap rounded-pill bg-soft px-3 text-caption font-semibold text-ink"
          >
            {t('table.columns')}
          </button>
        </div>
      </div>

      {viewsOpen ? (
        <div className="rounded-card bg-soft p-3">
          <div className="flex gap-2">
            <input
              value={viewName}
              onChange={(event) => setViewName(event.target.value)}
              placeholder={t('table.viewName')}
              aria-label={t('table.viewName')}
              className="min-h-tap flex-1 rounded-field border-[1.5px] border-line bg-surface px-3 py-2 text-input text-ink placeholder:text-muted"
            />
            <Button
              variant="secondary"
              className="min-h-tap w-auto px-3"
              onClick={() => {
                const name = viewName.trim();
                if (!name) return;
                setSaved(
                  [
                    { name, search, status, visible: [...visible], sort },
                    ...views.filter((view) => view.name !== name),
                  ].slice(0, 10),
                );
                setViewName('');
              }}
            >
              {t('table.saveView')}
            </Button>
          </div>
          {views.map((view) => (
            <div key={view.name} className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setVisible(view.visible);
                  onSort(view.sort);
                  onApplyView({ search: view.search, status: view.status });
                }}
                className="min-h-tap flex-1 rounded-field bg-surface px-3 text-start text-small font-semibold text-ink"
              >
                {view.name}
              </button>
              <button
                type="button"
                onClick={() => setSaved(views.filter((saved) => saved !== view))}
                className="min-h-tap rounded-pill bg-danger-bg px-3 text-caption font-semibold text-danger"
              >
                {t('table.deleteView')}
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {pickerOpen ? (
        <div className="rounded-card bg-soft p-3">
          <div className="flex flex-wrap gap-2">
            {ALL_COLUMNS.map((column) => {
              const on = visible.includes(column.id);
              return (
                <button
                  key={column.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    setVisible((current) =>
                      on ? current.filter((id) => id !== column.id) : [...current, column.id],
                    )
                  }
                  className={
                    on
                      ? 'min-h-tap rounded-pill bg-accent px-3 text-caption font-semibold text-accent-ink'
                      : 'min-h-tap rounded-pill bg-surface px-3 text-caption font-semibold text-ink'
                  }
                >
                  {t(column.labelKey)}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-note text-muted">{t('table.columnsHint')}</p>
        </div>
      ) : null}

      <div
        className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4"
        role="group"
        aria-label={t('table.sortLabel')}
      >
        {SORTABLE.map((item) => (
          <button
            key={item.column}
            type="button"
            onClick={() =>
              onSort({
                column: item.column,
                dir: sort.column === item.column && sort.dir === 'asc' ? 'desc' : 'asc',
              })
            }
            className={
              sort.column === item.column
                ? 'min-h-tap shrink-0 rounded-pill bg-accent px-3 text-caption font-semibold text-accent-ink'
                : 'min-h-tap shrink-0 rounded-pill bg-soft px-3 text-caption font-semibold text-ink'
            }
          >
            {t(item.labelKey)} {sort.column === item.column ? (sort.dir === 'asc' ? '↑' : '↓') : ''}
          </button>
        ))}
      </div>

      {table.isPending ? (
        <div className="flex justify-center py-8">
          <Spinner className="h-6 w-6 text-accent" />
        </div>
      ) : table.isError ? (
        <div className="flex flex-col items-center gap-3 rounded-card bg-soft px-6 py-10 text-center">
          <p className="text-body font-semibold text-ink">{t('gallery.loadFailedTitle')}</p>
          <p className="text-small text-muted">{t('gallery.loadFailedBody')}</p>
          <Button variant="secondary" className="min-h-tap w-auto px-4" onClick={() => void table.refetch()}>
            {t('common.retry')}
          </Button>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-card bg-soft px-6 py-10 text-center">
          <GownIcon className="h-16 w-auto text-accent opacity-70" />
          <p className="text-body font-semibold text-ink">{t('gallery.emptyFilteredTitle')}</p>
          <p className="text-small text-muted">{t('gallery.emptyFilteredBody')}</p>
        </div>
      ) : (
        <div className="-mx-4 overflow-x-auto px-4">
          <table className="w-full min-w-[560px]">
            <thead>
              <tr>
                <th scope="col" className="sticky left-0 top-0 z-10 bg-surface p-2 text-start">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={toggleAll}
                    aria-label={t('table.selectAll')}
                    className="h-4 w-4"
                  />
                </th>
                <th scope="col" className="sticky top-0 z-10 bg-surface p-2" />
                {ALL_COLUMNS.filter((column) => visible.includes(column.id)).map((column) => (
                  <th
                    key={column.id}
                    scope="col"
                    className="sticky top-0 z-10 whitespace-nowrap border-b border-line bg-surface p-2 text-start text-note font-semibold text-muted"
                  >
                    {t(column.labelKey)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} data-testid="table-row" className="border-b border-line">
                  <td className="sticky left-0 z-10 bg-surface p-2 align-middle">
                    <input
                      type="checkbox"
                      checked={selected.has(row.id)}
                      onChange={() => toggleOne(row.id)}
                      aria-label={t('table.selectRow', { code: row.code })}
                      className="h-4 w-4"
                    />
                  </td>
                  <td className="p-2 align-middle">
                    <span className={`grid h-9 w-9 place-items-center rounded-[11px] ${paletteForCode(row.code).tile}`}>
                      <GownIcon className={`h-5 w-auto ${paletteForCode(row.code).icon}`} />
                    </span>
                  </td>
                  {visible.includes('code') && (
                    <td className="whitespace-nowrap p-2 text-small font-semibold text-ink">{row.code}</td>
                  )}
                  {visible.includes('name') && (
                    <td className="p-2 text-small text-ink">{row.name_en || row.code}</td>
                  )}
                  {visible.includes('status') && (
                    <td className="p-2">
                      <StatusPill status={row.status} label={t(`status.${row.status}`)} />
                    </td>
                  )}
                  {visible.includes('listing') && (
                    <td className="whitespace-nowrap p-2 text-small text-ink">
                      {t(`dress.listing${row.listing_type.charAt(0).toUpperCase()}${row.listing_type.slice(1)}`)}
                    </td>
                  )}
                  {visible.includes('size') && <td className="p-2 text-small text-ink">{row.size_label ?? ''}</td>}
                  {visible.includes('color') && <td className="p-2 text-small text-ink">{row.color ?? ''}</td>}
                  {visible.includes('fabrics') && (
                    <td className="p-2 text-small text-ink">{row.fabrics.join(', ')}</td>
                  )}
                  {visible.includes('sale') && (
                    <td className="p-2 text-small text-ink">
                      {row.sale_price === null ? '' : String(row.sale_price)}
                    </td>
                  )}
                  {visible.includes('rent') && (
                    <td className="p-2 text-small text-ink">
                      {row.rent_price === null ? '' : String(row.rent_price)}
                    </td>
                  )}
                  {visible.includes('materials') && (
                    <td className="p-2 text-small text-ink">
                      {String(row.dress_materials?.[0]?.count ?? 0)}
                    </td>
                  )}
                  {visible.includes('added') && (
                    <td className="whitespace-nowrap p-2 text-small text-ink">{row.created_at.slice(0, 10)}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > TABLE_PAGE_SIZE ? (
        <div className="flex items-center justify-between">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setPage((current) => Math.max(0, current - 1))}
            className="min-h-tap rounded-pill bg-soft px-4 text-caption font-semibold text-ink disabled:opacity-50"
          >
            {t('table.prev')}
          </button>
          <span className="text-caption text-muted">
            {t('table.pageOf', { current: page + 1, total: pageCount })}
          </span>
          <button
            type="button"
            disabled={page >= pageCount - 1}
            onClick={() => setPage((current) => current + 1)}
            className="min-h-tap rounded-pill bg-soft px-4 text-caption font-semibold text-ink disabled:opacity-50"
          >
            {t('table.next')}
          </button>
        </div>
      ) : null}
    </div>
  );
}

interface BulkBarProps {
  count: number;
  pending: boolean;
  onStatus: (status: DressStatus) => void;
  onExport: () => void;
  onClear: () => void;
}

/** Shows when rows are selected in the table: change status in bulk or export. */
export function BulkBar({ count, pending, onStatus, onExport, onClear }: BulkBarProps) {
  const { t } = useTranslation();
  if (count === 0) return null;
  return (
    <div
      className="pb-safe fixed inset-x-3 bottom-24 z-30 flex flex-wrap items-center gap-2 rounded-btn bg-gradient-to-r from-accent to-accent2 px-3 py-2 text-white shadow-frame"
      data-testid="bulk-bar"
    >
      <span className="text-small font-bold">{t('table.selected', { count })}</span>
      {(['available', 'reserved', 'rented', 'sold'] as const).map((value) => (
        <button
          key={value}
          type="button"
          disabled={pending}
          onClick={() => onStatus(value)}
          className="min-h-tap rounded-pill bg-white/25 px-3 text-caption font-semibold text-white disabled:opacity-60"
        >
          {t(`status.${value}`)}
        </button>
      ))}
      <button
        type="button"
        onClick={onExport}
        className="min-h-tap rounded-pill bg-white px-3 text-caption font-bold text-accent"
      >
        {t('table.bulkExport')}
      </button>
      <button
        type="button"
        onClick={onClear}
        className="min-h-tap px-2 text-caption font-bold text-white/80"
        aria-label={t('table.clearSelection')}
      >
        ✕
      </button>
    </div>
  );
}
