import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCreateMovement } from './api';
import { Button } from '@/components/ui/Button';

interface CheckInSheetProps {
  open: boolean;
  onClose: () => void;
  dressId: string;
  dressCode: string;
  currentCustomerId: string | null;
}

const NEXT_LOCATIONS = ['in_atelier', 'alteration', 'cleaning', 'photoshoot', 'other'] as const;

export function CheckInSheet({ open, onClose, dressId, dressCode, currentCustomerId }: CheckInSheetProps) {
  const { t } = useTranslation();
  const [nextLocation, setNextLocation] = useState<string>('in_atelier');
  const [notes, setNotes] = useState('');
  const [errorText, setErrorText] = useState<string | null>(null);

  const createMovement = useCreateMovement();

  if (!open) return null;

  const submit = async () => {
    setErrorText(null);
    try {
      await createMovement.mutateAsync({
        dress_id: dressId,
        direction: 'in',
        reason: 'return',
        customer_id: currentCustomerId,
        from_location: 'with_customer',
        to_location: nextLocation,
        condition_notes: notes.trim() || null,
      });
      onClose();
    } catch {
      setErrorText(t('movements.saveFailed'));
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end" data-testid="checkin-sheet">
      <button type="button" aria-label={t('common.close')} onClick={onClose} className="flex-1 bg-black/30" />
      <div className="max-h-[85dvh] overflow-y-auto rounded-sheet border border-line bg-surface p-4">
        <h2 className="mb-3 text-title">{t('movements.checkInTitle', { code: dressCode })}</h2>
        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-caption font-semibold text-muted">{t('movements.nextLocation')}</label>
            <select
              value={nextLocation}
              onChange={(event) => setNextLocation(event.target.value)}
              className="min-h-tap w-full rounded-field border-[1.5px] border-line bg-surface px-3 py-2 text-input text-ink"
            >
              {NEXT_LOCATIONS.map((value) => (
                <option key={value} value={value}>
                  {t(`movements.location.${value}`)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-caption font-semibold text-muted">{t('movements.conditionNotes')}</label>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              className="min-h-tap w-full rounded-field border-[1.5px] border-line bg-surface px-3 py-2 text-input text-ink"
            />
          </div>
          {errorText ? <p className="text-small text-danger">{errorText}</p> : null}
          <Button onClick={() => void submit()} loading={createMovement.isPending} className="w-full">
            {t('movements.checkIn')}
          </Button>
        </div>
      </div>
    </div>
  );
}
