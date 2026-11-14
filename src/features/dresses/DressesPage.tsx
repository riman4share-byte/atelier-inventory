import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GownIcon, PlusIcon, SearchIcon, XIcon } from '@/components/icons';
import { Screen } from '@/components/layout/Screen';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { CATEGORY_FILTERS, STATUS_FILTERS, type CategoryFilter, type StatusFilter } from './dressSearch';
import { categoryLabel } from './categories';
import {
  useBulkSetStatus,
  useDressCounts,
  useDresses,
  useRestoreDress,
  type DressRow,
  type TableSort,
} from './api';
import { paletteForCode, StatusPill } from './StatusPill';
import { DressesTable, BulkBar } from './DressesTable';
import { ExportSheet } from './ExportSheet';
import { cx } from '@/lib/cx';

interface UndoClaim {
  id: string;
  code: string;
}

/** Pick the name in the current language, falling back to the other and the code. */
function displayName(dress: DressRow, language: string): string {
  const isArabic = language.startsWith('ar');
  const primary = isArabic ? dress.name_ar : dress.name_en;
  const fallback = isArabic ? dress.name_en : dress.name_ar;
  return primary || fallback || dress.code;
}

function DressTile({ dress, language, onOpen }: { dress: DressRow; language: string; onOpen: () => void }) {
  const { t } = useTranslation();
  const palette = paletteForCode(dress.code);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex flex-col overflow-hidden rounded-card border border-line bg-surface text-start transition-colors hover:border-line-strong"
      data-testid="dress-tile"
    >
      <span
        className={cx(
          'flex aspect-[3/4] w-full items-center justify-center border-b border-line',
          palette.tile,
        )}
      >
        <GownIcon className={cx('h-10 w-auto', palette.icon)} />
      </span>
      <span className="flex flex-1 flex-col gap-1 px-2.5 py-2">
        <span className="block truncate text-small font-semibold leading-snug text-ink">
          {displayName(dress, language)}
        </span>
        <span className="mt-auto flex items-center justify-between gap-2">
          <span className="font-mono text-[11px] tracking-tight text-muted">{dress.code}</span>
          <StatusPill status={dress.status} label={t(`status.${dress.status}`)} />
        </span>
      </span>
    </button>
  );
}

function useDebouncedValue(value: string, delayMs: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export function DressesPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const view = searchParams.get('view') === 'table' ? 'table' : 'grid';
  // Dashboards and error lists can send the user into a filtered table with
  // initialSearch; read it once and clean the URL.
  const initialSearch = searchParams.get('initialSearch') ?? '';
  const [searchInput, setSearchInput] = useState(initialSearch);
  const search = useDebouncedValue(searchInput, 300);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [sort, setSort] = useState<TableSort>({ column: 'created_at', dir: 'desc' });
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [exportOpen, setExportOpen] = useState(false);

  const counts = useDressCounts();
  const dresses = useDresses({ search, status, category });
  const bulkStatus = useBulkSetStatus();
  const restore = useRestoreDress();

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = dresses;

  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin: '240px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Claim the undo payload left by the detail page, then clear the history
  // state so a refresh never shows the snackbar again.
  const [undo, setUndo] = useState<UndoClaim | null>(
    (location.state as { undo?: UndoClaim } | null)?.undo ?? null,
  );
  useEffect(() => {
    navigate(location.pathname + location.search, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!undo) return;
    const timer = setTimeout(() => setUndo(null), 7000);
    return () => clearTimeout(timer);
  }, [undo]);

  const chips = STATUS_FILTERS.map((value) => ({
    value,
    label: value === 'all' ? t('gallery.chipAll') : t(`status.${value}`),
  }));

  // The kind of garment: wedding, party, engagement, veil, jumpsuit.
  const categoryChips = CATEGORY_FILTERS.map((value) => ({
    value,
    label:
      value === 'all'
        ? t('gallery.chipAllCategories')
        : categoryLabel(value, i18n.language.startsWith('ar')),
  }));

  const tiles = dresses.data?.pages.flat() ?? [];
  const hasFilters = Boolean(searchInput) || status !== 'all' || category !== 'all';
  const setView = (next: 'grid' | 'table') => {
    const params = new URLSearchParams(searchParams);
    if (next === 'grid') params.delete('view');
    else params.set('view', next);
    setSearchParams(params, { replace: true });
  };

  return (
    <Screen
      eyebrow={t('nav.dresses')}
      title={t('screens.dresses.title')}
      subtitle={`${counts.isLoading ? '…' : (counts.data?.total ?? '–')} ${t('gallery.heroLabel')}`}
      action={
        <Button size="sm" className="w-auto px-2.5" onClick={() => navigate('/dresses/new')}>
          <PlusIcon className="h-3.5 w-3.5" />
          {t('gallery.add')}
        </Button>
      }
    >
      <div className="flex flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            label={t('gallery.viewLabel')}
            options={[
              { value: 'grid', label: t('gallery.viewGrid') },
              { value: 'table', label: t('gallery.viewTable') },
            ]}
            value={view}
            onChange={(value) => setView(value as 'grid' | 'table')}
          />
          <div className="relative min-w-[180px] flex-1">
            <SearchIcon className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              aria-label={t('gallery.searchLabel')}
              placeholder={t('gallery.searchPlaceholder')}
              className="h-8 w-full rounded-field border border-line bg-surface pl-7 pr-2 text-body text-ink placeholder:text-faint focus:border-accent"
            />
          </div>
        </div>

        <div
          className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-0.5"
          role="group"
          aria-label={t('gallery.filtersLabel')}
        >
          {chips.map((chip) => (
            <button
              key={chip.value}
              type="button"
              aria-pressed={status === chip.value}
              onClick={() => setStatus(chip.value)}
              className={cx(
                'h-9 shrink-0 rounded-field border px-2.5 text-[11px] font-semibold uppercase tracking-wider transition-colors',
                status === chip.value
                  ? 'border-accent bg-accent text-accent-ink'
                  : 'border-line bg-surface text-muted hover:border-line-strong hover:text-ink',
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* The kind of garment: wedding, party, engagement, veil, jumpsuit. */}
        <div
          className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-0.5"
          role="group"
          aria-label={t('dress.category')}
        >
          {categoryChips.map((chip) => (
            <button
              key={chip.value}
              type="button"
              aria-pressed={category === chip.value}
              onClick={() => setCategory(chip.value)}
              className={cx(
                'h-9 shrink-0 rounded-field border px-2.5 text-[11px] font-semibold uppercase tracking-wider transition-colors',
                category === chip.value
                  ? 'border-accent bg-accent text-accent-ink'
                  : 'border-line bg-surface text-muted hover:border-line-strong hover:text-ink',
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {view === 'table' ? (
          <DressesTable
            search={search}
            status={status}
            category={category}
            sort={sort}
            onSort={setSort}
            onApplyView={(next) => {
              setSearchInput(next.search);
              setStatus(next.status);
              if (next.category) setCategory(next.category);
            }}
            selected={selected}
            onSelectionChange={setSelected}
            onExportSelected={() => setExportOpen(true)}
          />
        ) : dresses.isError ? (
          <div className="flex flex-col items-center gap-3 rounded-card border border-line bg-surface-2 px-6 py-10 text-center">
            <p className="text-body font-semibold text-ink">{t('gallery.loadFailedTitle')}</p>
            <p className="text-small text-muted">{t('gallery.loadFailedBody')}</p>
            <Button variant="secondary" className="w-auto px-4" onClick={() => void dresses.refetch()}>
              {t('common.retry')}
            </Button>
          </div>
        ) : tiles.length === 0 && dresses.isSuccess ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-card border border-line bg-surface-2 px-6 py-10 text-center">
            <GownIcon className="h-16 w-auto text-faint" />
            {hasFilters ? (
              <>
                <p className="text-body font-semibold text-ink">{t('gallery.emptyFilteredTitle')}</p>
                <p className="text-small text-muted">{t('gallery.emptyFilteredBody')}</p>
                <Button
                  variant="secondary"
                  className="w-auto px-4"
                  onClick={() => {
                    setSearchInput('');
                    setStatus('all');
                    setCategory('all');
                  }}
                >
                  {t('gallery.clearFilters')}
                </Button>
              </>
            ) : (
              <>
                <p className="max-w-[30ch] text-body font-semibold text-ink">
                  {t('gallery.emptyTitle')}
                </p>
                <p className="max-w-[34ch] text-small text-muted">{t('gallery.emptyBody')}</p>
                <Button className="w-auto px-4" onClick={() => navigate('/dresses/new')}>
                  <PlusIcon className="h-3.5 w-3.5" />
                  {t('gallery.add')}
                </Button>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {dresses.isLoading
                ? Array.from({ length: 4 }, (_, index) => (
                    <div
                      key={index}
                      className="animate-pulse rounded-card border border-line bg-surface-2"
                      style={{ aspectRatio: '4 / 5' }}
                      aria-hidden="true"
                    />
                  ))
                : tiles.map((dress) => (
                    <DressTile
                      key={dress.id}
                      dress={dress}
                      language={i18n.language}
                      onOpen={() => navigate(`/dresses/${dress.id}`)}
                    />
                  ))}
            </div>
            <div ref={sentinelRef} aria-hidden="true" className="h-4" />
            {dresses.isFetchingNextPage ? (
              <div className="flex justify-center py-2">
                <Spinner className="h-4 w-4 text-accent" />
              </div>
            ) : null}
          </>
        )}
      </div>

      {/* Undo snackbar after a soft delete on the detail page */}
      {undo ? (
        <div
          className="pb-safe fixed inset-x-3 bottom-20 z-20 flex items-center gap-2 rounded-card border border-line bg-surface px-3 py-2"
          role="status"
          data-testid="undo-snackbar"
        >
          <span className="flex-1 truncate text-small text-ink">
            {t('snack.deleted', { code: undo.code })}
          </span>
          <Button
            size="sm"
            variant="secondary"
            className="w-auto px-2.5"
            onClick={() => {
              restore.mutate(undo.id, {
                onSuccess: () => setUndo(null),
                onError: () => setUndo(null),
              });
            }}
          >
            {t('snack.undo')}
          </Button>
          <button
            type="button"
            aria-label={t('snack.dismiss')}
            onClick={() => setUndo(null)}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-field text-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <XIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      {/* Bulk bar (table selection) */}
      <BulkBar
        count={selected.size}
        pending={bulkStatus.isPending}
        onStatus={(nextStatus) =>
          bulkStatus.mutate(
            { ids: [...selected], status: nextStatus },
            { onSuccess: () => setSelected(new Set()) },
          )
        }
        onExport={() => setExportOpen(true)}
        onClear={() => setSelected(new Set())}
      />

      {/* Export sheet (gallery + table share it) */}
      <ExportSheet
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        search={search}
        status={status}
        category={category}
        selectedIds={[...selected]}
      />
    </Screen>
  );
}
