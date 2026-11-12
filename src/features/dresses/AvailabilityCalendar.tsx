import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Panel } from '@/components/ui/Panel';
import { cx } from '@/lib/cx';
import { bookingsFromMovements, bookedDays, dayKey } from '@/features/movements/availability';
import type { DressMovementRow } from '@/features/movements/api';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface AvailabilityCalendarProps {
  movements: DressMovementRow[];
  /** How many months to show, starting from the current one. */
  months?: number;
}

/**
 * A compact month grid showing which days a dress is booked.
 *
 * Booked days are shaded. Free days are plain. The owner can see at a
 * glance whether a dress is available on a given date, without reading
 * through the movement timeline.
 */
export function AvailabilityCalendar({ movements, months = 2 }: AvailabilityCalendarProps) {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language.startsWith('ar');

  const booked = useMemo(() => bookedDays(bookingsFromMovements(movements)), [movements]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthStarts: Date[] = [];
  for (let i = 0; i < months; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    monthStarts.push(d);
  }

  return (
    <Panel title={t('movements.availability')}>
      <div className="flex flex-col gap-4">
        {monthStarts.map((monthStart) => (
          <MonthGrid key={monthStart.toISOString()} monthStart={monthStart} booked={booked} today={today} isArabic={isArabic} />
        ))}
        <div className="flex items-center gap-3 text-note text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-surface-2" /> {t('movements.freeDay')}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-accent-bg border border-accent-line" /> {t('movements.bookedDay')}
          </span>
        </div>
      </div>
    </Panel>
  );
}

function MonthGrid({ monthStart, booked, today, isArabic }: { monthStart: Date; booked: Set<string>; today: Date; isArabic: boolean }) {
  const monthLabel = monthStart.toLocaleDateString(isArabic ? 'ar' : 'en', { month: 'long', year: 'numeric' });

  // First day of the month, shifted so Monday is 0.
  const firstDay = new Date(monthStart);
  const offset = (firstDay.getDay() + 6) % 7; // Monday = 0

  const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();

  const cells: Array<{ day: number | null; key: string | null; isBooked: boolean; isPast: boolean; isToday: boolean }> = [];
  for (let i = 0; i < offset; i++) {
    cells.push({ day: null, key: null, isBooked: false, isPast: false, isToday: false });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(monthStart.getFullYear(), monthStart.getMonth(), day);
    const key = dayKey(date);
    cells.push({
      day,
      key,
      isBooked: booked.has(key),
      isPast: date < today,
      isToday: date.getTime() === today.getTime(),
    });
  }

  return (
    <div>
      <p className="mb-2 text-small font-semibold text-ink">{monthLabel}</p>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {WEEKDAYS.map((weekday) => (
          <div key={weekday} className="py-1 text-[10px] font-semibold uppercase tracking-wider text-faint">
            {weekday}
          </div>
        ))}
        {cells.map((cell, index) => (
          <div
            key={index}
            className={cx(
              'grid h-7 place-items-center rounded-sm text-[11px] font-mono',
              cell.day === null
                ? ''
                : cell.isBooked
                  ? 'bg-accent-bg text-accent border border-accent-line'
                  : cell.isPast
                    ? 'text-faint'
                    : 'text-ink',
              cell.isToday ? 'ring-1 ring-accent' : '',
            )}
          >
            {cell.day ?? ''}
          </div>
        ))}
      </div>
    </div>
  );
}
