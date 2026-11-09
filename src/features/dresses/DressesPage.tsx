import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GownIcon } from '@/components/icons';
import { Screen } from '@/components/layout/Screen';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Spinner } from '@/components/ui/Spinner';
import { STATUS_FILTERS, type StatusFilter } from './dressSearch';
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
      className="flex flex-col rounded-tile bg-surface p-0 text-start"
      data-testid="dress-tile"
    >
      <span
        className={cx(
          'flex aspect-[3/4] w-full items-center justify-center rounded-tile',
          palette.tile,
        )}
      >
        <GownIcon className={cx('h-14 w-auto drop-shadow-md', palette.icon)} />
      </span>
      <span className="px-1 pb-2 pt-2">
        <span className="block truncate text-body font-serif font-semibold text-ink">
          {displayName(dress, language)}
        </span>
        <span className="mt-1 flex items-center gap-2">
          <span className="text-note text-muted">{dress.code}</span>
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
  const [sort, setSort] = useState<TableSort>({ column: 'created_at', dir: 'desc' });
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [exportOpen, setExportOpen] = useState(false);

  const counts = useDressCounts();
  const dresses = useDresses({ search, status });
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
    navigate(location.pathname + location.search, { replace: true, state: null });
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

  const tiles = dresses.data?.pages.flat() ?? [];
  const hasFilters = Boolean(searchInput) || status !== 'all';
  const setView = (next: 'grid' | 'table') => {
    const params = new URLSearchParams(searchParams);
    if (next === 'grid') params.delete('view');
    else params.set('view', next);
    setSearchParams(params, { replace: true });
  };

  return (
    <Screen
      title={t('screens.dresses.title')}
      subtitle={`${counts.isLoading ? '…' : (counts.data?.total ?? '–')} ${t('gallery.heroLabel')}`}
      action={
        <button
          type="button"
          onClick={() => navigate('/dresses/new')}
          className="min-h-tap rounded-pill bg-brand px-4 text-body font-bold text-white shadow-btn"
        >
          {t('gallery.add')}
        </button>
      }
    >
      <div className="flex flex-1 flex-col gap-4">
        <SegmentedControl
          label={t('gallery.viewLabel')}
          options={[
            { value: 'grid', label: t('gallery.viewGrid') },
            { value: 'table', label: t('gallery.viewTable') },
          ]}
          value={view}
          onChange={(value) => setView(value as 'grid' | 'table')}
        />

        <input
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          aria-label={t('gallery.searchLabel')}
          placeholder={t('gallery.searchPlaceholder')}
          className="min-h-tap w-full rounded-field border-[1.5px] border-line bg-surface px-3 py-2.5 text-input text-ink placeholder:text-muted focus:border-accent"
        />

        <div
          className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
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
                'min-h-tap shrink-0 rounded-pill px-3.5 text-caption font-semibold',
                status === chip.value ? 'bg-accent text-accent-ink' : 'bg-soft text-ink',
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
            sort={sort}
            onSort={setSort}
            onApplyView={(next) => {
              setSearchInput(next.search);
              setStatus(next.status);
            }}
            selected={selected}
            onSelectionChange={setSelected}
            onExportSelected={() => setExportOpen(true)}
          />
        ) : dresses.isError ? (
          <div className="flex flex-col items-center gap-3 rounded-card bg-soft px-6 py-10 text-center">
            <p className="text-body font-semibold text-ink">{t('gallery.loadFailedTitle')}</p>
            <p className="text-small text-muted">{t('gallery.loadFailedBody')}</p>
            <button
              type="button"
              onClick={() => void dresses.refetch()}
              className="min-h-tap rounded-pill bg-accent px-4 text-body font-bold text-accent-ink"
            >
              {t('common.retry')}
            </button>
          </div>
        ) : tiles.length === 0 && dresses.isSuccess ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-card bg-soft px-6 py-10 text-center">
            <GownIcon className="h-20 w-auto text-accent opacity-70" />
            {hasFilters ? (
              <>
                <p className="text-body font-semibold text-ink">{t('gallery.emptyFilteredTitle')}</p>
                <p className="text-small text-muted">{t('gallery.emptyFilteredBody')}</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('');
                    setStatus('all');
                  }}
                  className="min-h-tap rounded-pill bg-accent px-4 text-body font-bold text-accent-ink"
                >
                  {t('gallery.clearFilters')}
                </button>
              </>
            ) : (
              <>
                <p className="max-w-[30ch] text-body font-semibold text-ink">
                  {t('gallery.emptyTitle')}
                </p>
                <p className="max-w-[34ch] text-small text-muted">{t('gallery.emptyBody')}</p>
                <button
                  type="button"
                  onClick={() => navigate('/dresses/new')}
                  className="min-h-tap rounded-pill bg-accent px-4 text-body font-bold text-accent-ink"
                >
                  {t('gallery.add')}
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2.5">
              {dresses.isLoading
                ? Array.from({ length: 4 }, (_, index) => (
                    <div
                      key={index}
                      className="animate-pulse rounded-tile bg-soft"
                      style={{ aspectRatio: '3 / 4' }}
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
                <Spinner className="h-5 w-5 text-accent" />
              </div>
            ) : null}
          </>
        )}
      </div>

      {/* Undo snackbar after a soft delete on the detail page */}
      {undo ? (
        <div
          className="pb-safe fixed inset-x-3 bottom-24 z-20 flex items-center gap-2 rounded-btn bg-gradient-to-r from-accent to-accent2 px-4 py-2 text-white shadow-frame"
          role="status"
          data-testid="undo-snackbar"
        >
          <span className="flex-1 text-small font-semibold">
            {t('snack.deleted', { code: undo.code })}
          </span>
          <button
            type="button"
            onClick={() => {
              restore.mutate(undo.id, {
                onSuccess: () => setUndo(null),
                onError: () => setUndo(null),
              });
            }}
            className="min-h-tap rounded-pill bg-white/25 px-3 text-caption font-bold text-white"
          >
            {t('snack.undo')}
          </button>
          <button
            type="button"
            aria-label={t('snack.dismiss')}
            onClick={() => setUndo(null)}
            className="min-h-tap px-1 text-caption font-bold text-white/80"
          >
            ✕
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
        selectedIds={[...selected]}
      />
    </Screen>
  );
}
