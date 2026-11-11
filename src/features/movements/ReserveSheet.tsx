import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCreateReservation } from './api';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { TextArea } from '@/components/ui/TextArea';
import { TextField } from '@/components/ui/TextField';
import { XIcon } from '@/components/icons';

interface ReserveSheetProps {
  open: boolean;
  onClose: () => void;
  dressId: string;
  dressCode: string;
}

/**
 * Renders a translated title with the dress code set in the monospaced face:
 * the code is the record identifier, the words around it are prose.
 */
function TitleWithCode({ title, code }: { title: string; code: string }) {
  const index = title.indexOf(code);
  if (index < 0) return <>{title}</>;
  return (
    <>
      {title.slice(0, index)}
      <span className="font-mono tracking-tight">{code}</span>
      {title.slice(index + code.length)}
    </>
  );
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
      <div className="flex max-h-[85dvh] flex-col overflow-y-auto rounded-t-sheet border-t border-line bg-surface pb-safe">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-line bg-surface px-3 py-2">
          <h2 className="text-title font-semibold tracking-tight text-ink">
            <TitleWithCode title={t('movements.reserveTitle', { code: dressCode })} code={dressCode} />
          </h2>
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
          {/* The window the dress is held for — dates are the record. */}
          <Panel>
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-2">
                <TextField
                  label={t('movements.fromDate')}
                  type="date"
                  mono
                  value={fromDate}
                  onChange={(event) => setFromDate(event.target.value)}
                />
                <TextField
                  label={t('movements.toDate')}
                  type="date"
                  mono
                  value={toDate}
                  onChange={(event) => setToDate(event.target.value)}
                />
              </div>
              <TextField
                label={t('movements.eventDate')}
                type="date"
                mono
                value={eventDate}
                onChange={(event) => setEventDate(event.target.value)}
              />
            </div>
          </Panel>

          <Panel>
            <TextArea
              label={t('movements.notes')}
              rows={2}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </Panel>

          {errorText ? (
            <p className="text-small text-danger" role="alert">
              {errorText}
            </p>
          ) : null}

          <Button onClick={() => void submit()} loading={createReservation.isPending}>
            {t('movements.reserve')}
          </Button>
        </div>
      </div>
    </div>
  );
}
