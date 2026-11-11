import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { DressStatus } from '@/lib/database.types';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { GownIcon, XIcon } from '@/components/icons';
import { TABLE_PAGE_SIZE, useDressesTable, type TableSort } from './api';
import { paletteForCode, StatusPill } from './StatusPill';
import { cx } from '@/lib/cx';

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

/** A small toggle used for the column picker and the sort selector. */
function Chip({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={cx(
        'h-7 shrink-0 rounded-field border px-2.5 text-[11px] font-semibold uppercase tracking-wider transition-colors',
        active
          ? 'border-accent bg-accent text-accent-ink'
          : 'border-line bg-surface text-muted hover:border-line-strong hover:text-ink',
      )}
    >
      {children}
    </button>
  );
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
    <div className="flex flex-1 flex-col gap-2.5" data-testid="dresses-table">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[11px] tracking-tight text-muted">
          {t('table.count', { count: total })}
        </p>
        <div className="flex gap-1.5">
          <Chip active={viewsOpen} onClick={() => setViewsOpen((open) => !open)}>
            {t('table.views')}
          </Chip>
          <Chip active={pickerOpen} onClick={() => setPickerOpen((open) => !open)}>
            {t('table.columns')}
          </Chip>
        </div>
      </div>

      {viewsOpen ? (
        <div className="rounded-card border border-line bg-surface-2 p-2.5">
          <div className="flex gap-2">
            <input
              value={viewName}
              onChange={(event) => setViewName(event.target.value)}
              placeholder={t('table.viewName')}
              aria-label={t('table.viewName')}
              className="h-8 flex-1 rounded-field border border-line bg-surface px-2 text-body text-ink placeholder:text-faint focus:border-accent"
            />
            <Button
              variant="secondary"
              size="sm"
              className="w-auto"
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
                className="h-8 flex-1 rounded-field border border-line bg-surface px-2 text-start text-small font-semibold text-ink transition-colors hover:border-line-strong"
              >
                {view.name}
              </button>
              <button
                type="button"
                onClick={() => setSaved(views.filter((saved) => saved !== view))}
                className="h-8 shrink-0 rounded-field border border-danger-line bg-danger-bg px-2 text-[11px] font-semibold uppercase tracking-wider text-danger transition-colors hover:border-danger"
              >
                {t('table.deleteView')}
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {pickerOpen ? (
        <div className="rounded-card border border-line bg-surface-2 p-2.5">
          <div className="flex flex-wrap gap-1.5">
            {ALL_COLUMNS.map((column) => {
              const on = visible.includes(column.id);
              return (
                <Chip
                  key={column.id}
                  active={on}
                  onClick={() =>
                    setVisible((current) =>
                      on ? current.filter((id) => id !== column.id) : [...current, column.id],
                    )
                  }
                >
                  {t(column.labelKey)}
                </Chip>
              );
            })}
          </div>
          <p className="mt-2 text-note text-muted">{t('table.columnsHint')}</p>
        </div>
      ) : null}

      <div
        className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4"
        role="group"
        aria-label={t('table.sortLabel')}
      >
        {SORTABLE.map((item) => (
          <Chip
            key={item.column}
            active={sort.column === item.column}
            onClick={() =>
              onSort({
                column: item.column,
                dir: sort.column === item.column && sort.dir === 'asc' ? 'desc' : 'asc',
              })
            }
          >
            {t(item.labelKey)}
            {sort.column === item.column ? (
              <span aria-hidden="true" className="ml-1 font-mono">
                {sort.dir === 'asc' ? '↑' : '↓'}
              </span>
            ) : null}
          </Chip>
        ))}
      </div>

      {table.isPending ? (
        <div className="flex justify-center py-8">
          <Spinner className="h-5 w-5 text-accent" />
        </div>
      ) : table.isError ? (
        <div className="flex flex-col items-center gap-3 rounded-card border border-line bg-surface-2 px-6 py-10 text-center">
          <p className="text-body font-semibold text-ink">{t('gallery.loadFailedTitle')}</p>
          <p className="text-small text-muted">{t('gallery.loadFailedBody')}</p>
          <Button variant="secondary" className="w-auto px-4" onClick={() => void table.refetch()}>
            {t('common.retry')}
          </Button>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-card border border-line bg-surface-2 px-6 py-10 text-center">
          <GownIcon className="h-16 w-auto text-faint" />
          <p className="text-body font-semibold text-ink">{t('gallery.emptyFilteredTitle')}</p>
          <p className="text-small text-muted">{t('gallery.emptyFilteredBody')}</p>
        </div>
      ) : (
        <div className="-mx-4 overflow-x-auto px-4">
          <div className="min-w-[560px] rounded-card border border-line bg-surface">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className="sticky start-0 top-0 z-10 bg-surface p-2 text-start">
                    <input
                      type="checkbox"
                      checked={allOnPageSelected}
                      onChange={toggleAll}
                      aria-label={t('table.selectAll')}
                      className="h-4 w-4 accent-[var(--accent)]"
                    />
                  </th>
                  <th scope="col" className="sticky top-0 z-10 bg-surface p-2" />
                  {ALL_COLUMNS.filter((column) => visible.includes(column.id)).map((column) => (
                    <th
                      key={column.id}
                      scope="col"
                      className="sticky top-0 z-10 whitespace-nowrap border-b border-line bg-surface px-2 py-1.5 text-start"
                    >
                      <span className="eyebrow">{t(column.labelKey)}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    data-testid="table-row"
                    className="border-b border-line transition-colors last:border-b-0 hover:bg-surface-2"
                  >
                    <td className="sticky start-0 z-10 bg-surface p-2 align-middle">
                      <input
                        type="checkbox"
                        checked={selected.has(row.id)}
                        onChange={() => toggleOne(row.id)}
                        aria-label={t('table.selectRow', { code: row.code })}
                        className="h-4 w-4 accent-[var(--accent)]"
                      />
                    </td>
                    <td className="p-2 align-middle">
                      <span
                        className={`grid h-7 w-7 place-items-center rounded-field ${paletteForCode(row.code).tile}`}
                      >
                        <GownIcon className={`h-4 w-auto ${paletteForCode(row.code).icon}`} />
                      </span>
                    </td>
                    {visible.includes('code') && (
                      <td className="whitespace-nowrap p-2 font-mono text-[11.5px] tracking-tight text-ink">
                        {row.code}
                      </td>
                    )}
                    {visible.includes('name') && (
                      <td className="max-w-[220px] truncate p-2 text-small text-ink">
                        {row.name_en || row.code}
                      </td>
                    )}
                    {visible.includes('status') && (
                      <td className="p-2">
                        <StatusPill status={row.status} label={t(`status.${row.status}`)} />
                      </td>
                    )}
                    {visible.includes('listing') && (
                      <td className="whitespace-nowrap p-2 text-small text-ink">
                        {t(
                          `dress.listing${row.listing_type.charAt(0).toUpperCase()}${row.listing_type.slice(1)}`,
                        )}
                      </td>
                    )}
                    {visible.includes('size') && (
                      <td className="p-2 font-mono text-[11.5px] text-ink">{row.size_label ?? ''}</td>
                    )}
                    {visible.includes('color') && (
                      <td className="p-2 text-small text-ink">{row.color ?? ''}</td>
                    )}
                    {visible.includes('fabrics') && (
                      <td className="max-w-[200px] truncate p-2 text-small text-ink">
                        {row.fabrics.join(', ')}
                      </td>
                    )}
                    {visible.includes('sale') && (
                      <td className="p-2 text-right font-mono text-[11.5px] tracking-tight text-ink">
                        {row.sale_price === null ? '' : String(row.sale_price)}
                      </td>
                    )}
                    {visible.includes('rent') && (
                      <td className="p-2 text-right font-mono text-[11.5px] tracking-tight text-ink">
                        {row.rent_price === null ? '' : String(row.rent_price)}
                      </td>
                    )}
                    {visible.includes('materials') && (
                      <td className="p-2 text-right font-mono text-[11.5px] tracking-tight text-ink">
                        {String(row.dress_materials?.[0]?.count ?? 0)}
                      </td>
                    )}
                    {visible.includes('added') && (
                      <td className="whitespace-nowrap p-2 font-mono text-[11.5px] tracking-tight text-muted">
                        {row.created_at.slice(0, 10)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {total > TABLE_PAGE_SIZE ? (
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="w-auto px-3"
            disabled={page === 0}
            onClick={() => setPage((current) => Math.max(0, current - 1))}
          >
            {t('table.prev')}
          </Button>
          <span className="font-mono text-[11px] tracking-tight text-muted">
            {t('table.pageOf', { current: page + 1, total: pageCount })}
          </span>
          <Button
            variant="secondary"
            size="sm"
            className="w-auto px-3"
            disabled={page >= pageCount - 1}
            onClick={() => setPage((current) => current + 1)}
          >
            {t('table.next')}
          </Button>
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
      className="pb-safe fixed inset-x-3 bottom-20 z-30 flex flex-wrap items-center gap-1.5 rounded-card border border-line bg-surface px-2.5 py-2 md:bottom-4"
      data-testid="bulk-bar"
    >
      <span className="mr-1 font-mono text-[11px] font-semibold tracking-tight text-ink">
        {t('table.selected', { count })}
      </span>
      {(['available', 'reserved', 'rented', 'sold'] as const).map((value) => (
        <button
          key={value}
          type="button"
          disabled={pending}
          onClick={() => onStatus(value)}
          className="h-7 rounded-field border border-line bg-surface-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted transition-colors hover:border-line-strong hover:text-ink disabled:opacity-50"
        >
          {t(`status.${value}`)}
        </button>
      ))}
      <Button size="sm" className="w-auto px-2.5" onClick={onExport}>
        {t('table.bulkExport')}
      </Button>
      <button
        type="button"
        onClick={onClear}
        className="grid h-7 w-7 shrink-0 place-items-center rounded-field text-muted transition-colors hover:bg-surface-2 hover:text-ink"
        aria-label={t('table.clearSelection')}
      >
        <XIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
