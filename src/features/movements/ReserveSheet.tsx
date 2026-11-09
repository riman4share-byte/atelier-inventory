import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCreateReservation } from './api';
import { Button } from '@/components/ui/Button';

interface ReserveSheetProps {
  open: boolean;
  onClose: () => void;
  dressId: string;
  dressCode: string;
}

export function ReserveSheet({ open, onClose, dressId, dressCode }: ReserveSheetProps) {
  const { t } = useTranslation();
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [notes, setNotes] = useState('');
  const [errorText, setErrorText] = useState<string | null>(null);

  const createReservation = useCreateReservation();

  if (!open) return null;

  const submit = async () => {
    setErrorText(null);
    if (!fromDate || !toDate) {
      setErrorText(t('movements.datesRequired'));
      return;
    }
    try {
      await createReservation.mutateAsync({
        dress_id: dressId,
        from_date: fromDate,
        to_date: toDate,
        event_date: eventDate || null,
        notes: notes.trim() || null,
      });
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      setErrorText(message === 'conflict' ? t('movements.conflict') : t('movements.saveFailed'));
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end" data-testid="reserve-sheet">
      <button type="button" aria-label={t('common.close')} onClick={onClose} className="flex-1 bg-black/30" />
      <div className="max-h-[85dvh] overflow-y-auto rounded-sheet border border-line bg-surface p-4">
        <h2 className="mb-3 text-title">{t('movements.reserveTitle', { code: dressCode })}</h2>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-caption font-semibold text-muted">{t('movements.fromDate')}</label>
              <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)}
                className="min-h-tap w-full rounded-field border-[1.5px] border-line bg-surface px-3 py-2 text-input text-ink" />
            </div>
            <div>
              <label className="mb-1 block text-caption font-semibold text-muted">{t('movements.toDate')}</label>
              <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)}
                className="min-h-tap w-full rounded-field border-[1.5px] border-line bg-surface px-3 py-2 text-input text-ink" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-caption font-semibold text-muted">{t('movements.eventDate')}</label>
            <input type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)}
              className="min-h-tap w-full rounded-field border-[1.5px] border-line bg-surface px-3 py-2 text-input text-ink" />
          </div>
          <div>
            <label className="mb-1 block text-caption font-semibold text-muted">{t('movements.notes')}</label>
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={2}
              className="min-h-tap w-full rounded-field border-[1.5px] border-line bg-surface px-3 py-2 text-input text-ink" />
          </div>
          {errorText ? <p className="text-small text-danger">{errorText}</p> : null}
          <Button onClick={() => void submit()} loading={createReservation.isPending} className="w-full">
            {t('movements.reserve')}
          </Button>
        </div>
      </div>
    </div>
  );
}
