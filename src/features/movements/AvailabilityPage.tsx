import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { Spinner } from '@/components/ui/Spinner';
import { cx } from '@/lib/cx';
import { CATEGORY_FILTERS, type CategoryFilter } from '@/features/dresses/dressSearch';
import { categoryLabel } from '@/features/dresses/categories';
import {
  useAvailabilityDresses,
  useAvailabilityMovements,
  useAvailabilityReservations,
  type AvailabilityDress,
} from './api';
import {
  applyBuffer,
  dayKey,
  dressAvailability,
  endOfDay,
  movementBookings,
  parseDay,
  reservationBookings,
  startOfDay,
  TURNOVER_DAYS,
  type Availability,
  type BlockingRange,
} from './availability';

/** The name in the interface language, falling back to the other one, then the code. */
function dressLabel(dress: AvailabilityDress, language: string): string {
  const arabic = language.startsWith('ar');
  return (
    (arabic ? dress.name_ar : dress.name_en) ||
    (arabic ? dress.name_en : dress.name_ar) ||
    dress.code
  );
}

/**
 * "18–20 Nov 2026" when the span sits inside one month, "18 Nov – 3 Dec 2026"
 * otherwise. The year is always shown: a hold in a past year must not read
 * like one next week.
 */
function formatSpan(from: Date, to: Date, language: string): string {
  const locale = language.startsWith('ar') ? 'ar-AE' : 'en-GB';
  const sameMonth = from.getFullYear() === to.getFullYear() && from.getMonth() === to.getMonth();
  const start = from.toLocaleDateString(
    locale,
    sameMonth ? { day: 'numeric' } : { day: 'numeric', month: 'short' },
  );
  const end = to.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  return `${start} – ${end}`;
}

/** Why a dress cannot go out, in one line: sold, held, or standing somewhere else. */
function Reason({ availability }: { availability: Exclude<Availability, { free: true }> }) {
  const { t, i18n } = useTranslation();
  if (availability.reason === 'sold') return <>{t('availability.reasonSold')}</>;
  if (availability.reason === 'state') {
    if (availability.kind === 'status') return <>{t(`status.${availability.value}`)}</>;
    return <>{t(`movements.location.${availability.value}`)}</>;
  }
  const span = availability.range;
  if (span.to === null) {
    return <>{t('availability.reasonOut', { span: formatSpan(span.from, span.from, i18n.language) })}</>;
  }
  return (
    <>
      {t(span.kind === 'reserved' ? 'availability.reasonReserved' : 'availability.reasonBooked', {
        span: formatSpan(span.from, span.to, i18n.language),
      })}
    </>
  );
}

interface Row {
  dress: AvailabilityDress;
  availability: Availability;
}

/**
 * Availability by date.
 *
 * The atelier's real question is never "what is the status of RF-0031?" but
 * "which dresses can a bride take on the 20th?". This screen answers that: a
 * window of days, the dresses nothing is holding, and next to them the reason
 * each unavailable dress cannot go out.
 */
export function AvailabilityPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isArabic = i18n.language.startsWith('ar');

  const today = dayKey(new Date());
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [category, setCategory] = useState<CategoryFilter>('all');

  // Picking a start after the end (or the reverse) moves the other end with it,
  // so an impossible range cannot be entered at all.
  const changeFrom = (value: string) => {
    if (!value) return;
    setFrom(value);
    if (value > to) setTo(value);
  };
  const changeTo = (value: string) => {
    if (!value) return;
    setTo(value);
    if (value < from) setFrom(value);
  };

  const windowKey = useMemo(() => ({ from, to }), [from, to]);
  const dresses = useAvailabilityDresses();
  const movements = useAvailabilityMovements(windowKey);
  const reservations = useAvailabilityReservations(windowKey);

  const bookingsByDress = useMemo(() => {
    const map = new Map<string, BlockingRange[]>();
    const ranges = [
      ...movementBookings(movements.data ?? []),
      ...reservationBookings(reservations.data ?? []),
    ].map((range) => applyBuffer(range, TURNOVER_DAYS));
    for (const range of ranges) {
      const list = map.get(range.dressId);
      if (list) list.push(range);
      else map.set(range.dressId, [range]);
    }
    return map;
  }, [movements.data, reservations.data]);

  const dateWindow = useMemo(
    () => ({ from: startOfDay(parseDay(from)), to: endOfDay(parseDay(to)) }),
    [from, to],
  );

  const rows = useMemo<Row[]>(() => {
    const now = new Date();
    return (dresses.data ?? [])
      .filter((dress) => category === 'all' || dress.category === category)
      .map((dress) => ({
        dress,
        availability: dressAvailability({
          status: dress.status,
          location: dress.location,
          bookings: bookingsByDress.get(dress.id) ?? [],
          window: dateWindow,
          today: now,
        }),
      }));
  }, [dresses.data, category, bookingsByDress, dateWindow]);

  const free = rows.filter((row) => row.availability.free);
  const taken = rows.filter((row) => !row.availability.free);

  const loading = dresses.isLoading || movements.isLoading || reservations.isLoading;
  const failed = dresses.isError || movements.isError || reservations.isError;

  const categoryChips = CATEGORY_FILTERS.map((value) => ({
    value,
    label:
      value === 'all'
        ? t('gallery.chipAllCategories')
        : categoryLabel(value, isArabic),
  }));

  return (
    <Screen
      eyebrow={t('nav.dates')}
      title={t('availability.title')}
      subtitle={
        failed
          ? t('availability.subtitleFailed')
          : loading
            ? t('availability.subtitleEmpty')
            : t('availability.subtitle', { free: free.length, total: rows.length })
      }
    >
      <div className="flex flex-1 flex-col gap-3">
        <Panel>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="availability-from" className="eyebrow">
                {t('availability.from')}
              </label>
              <input
                id="availability-from"
                type="date"
                value={from}
                onChange={(event) => changeFrom(event.target.value)}
                className="h-9 w-full rounded-field border border-line bg-surface px-2.5 font-mono text-body text-ink focus:border-accent"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="availability-to" className="eyebrow">
                {t('availability.to')}
              </label>
              <input
                id="availability-to"
                type="date"
                value={to}
                min={from}
                onChange={(event) => changeTo(event.target.value)}
                className="h-9 w-full rounded-field border border-line bg-surface px-2.5 font-mono text-body text-ink focus:border-accent"
              />
            </div>
          </div>
        </Panel>

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

        {failed ? (
          <Panel className="flex flex-col items-center gap-3 px-6 py-10 text-center">
            <p className="text-body font-semibold text-ink">{t('gallery.loadFailedTitle')}</p>
            <p className="text-small text-muted">{t('gallery.loadFailedBody')}</p>
            <Button
              variant="secondary"
              className="w-auto px-4"
              onClick={() => {
                void dresses.refetch();
                void movements.refetch();
                void reservations.refetch();
              }}
            >
              {t('common.retry')}
            </Button>
          </Panel>
        ) : loading ? (
          <div className="flex justify-center py-10">
            <Spinner className="h-5 w-5 text-accent" />
          </div>
        ) : (
          <>
            <Panel
              title={t('availability.freeTitle')}
              flush
              action={
                <span className="rounded-pill bg-ok-bg px-1.5 py-0.5 font-mono text-[10px] font-semibold text-ok">
                  {free.length}
                </span>
              }
            >
              {free.length === 0 ? (
                <p className="px-3 py-3 text-small text-muted" data-testid="no-free">
                  {t('availability.noneFree')}
                </p>
              ) : (
                <ul className="divide-y divide-line" data-testid="free-list">
                  {free.map(({ dress }) => {
                    const name = dressLabel(dress, i18n.language);
                    return (
                      <li key={dress.id}>
                        <button
                          type="button"
                          onClick={() => navigate(`/dresses/${dress.id}`)}
                          className="flex w-full items-center gap-3 px-3 py-2 text-start transition-colors hover:bg-surface-2"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-small text-ink">{name}</span>
                            <span className="block truncate text-[11px] text-muted">
                              {categoryLabel(dress.category, isArabic)}
                            </span>
                          </span>
                          {/* A dress with no name yet shows its code once, not twice. */}
                          {name === dress.code ? null : (
                            <span className="shrink-0 font-mono text-[11px] tracking-tight text-muted">
                              {dress.code}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>

            {taken.length > 0 ? (
              <Panel
                title={t('availability.takenTitle')}
                flush
                action={
                  <span className="rounded-pill bg-off-bg px-1.5 py-0.5 font-mono text-[10px] font-semibold text-off">
                    {taken.length}
                  </span>
                }
              >
                <ul className="divide-y divide-line" data-testid="taken-list">
                  {taken.map(({ dress, availability }) => {
                    const name = dressLabel(dress, i18n.language);
                    return (
                      <li key={dress.id}>
                        <button
                          type="button"
                          onClick={() => navigate(`/dresses/${dress.id}`)}
                          className="flex w-full items-start gap-3 px-3 py-2 text-start transition-colors hover:bg-surface-2"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-small text-ink">{name}</span>
                            {name === dress.code ? null : (
                              <span className="block truncate font-mono text-[11px] tracking-tight text-faint">
                                {dress.code}
                              </span>
                            )}
                          </span>
                          <span className="max-w-[52%] shrink-0 text-end text-[11px] leading-tight text-muted">
                            {availability.free ? '' : <Reason availability={availability} />}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </Panel>
            ) : null}

            {rows.length === 0 ? (
              <Panel>
                <p className="text-small text-muted">{t('availability.empty')}</p>
              </Panel>
            ) : null}
          </>
        )}
      </div>
    </Screen>
  );
}
