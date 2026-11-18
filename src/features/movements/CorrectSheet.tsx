import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCreateMovement } from './api';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { Sheet } from '@/components/ui/Sheet';
import { TextArea } from '@/components/ui/TextArea';
import type { DressMovementRow } from './api';

interface CorrectSheetProps {
  open: boolean;
  onClose: () => void;
  dressId: string;
  dressCode: string;
  movement: DressMovementRow;
}

/**
 * Creates a correcting movement that reverses a ledger entry.
 *
 * The ledger is append-only: a mistake is not deleted, it is corrected by a
 * new entry that points at the original via `corrects_movement_id`. The
 * availability logic already ignores superseded movements.
 */
export function CorrectSheet({ open, onClose, dressId, dressCode, movement }: CorrectSheetProps) {
  const { t } = useTranslation();
  const [notes, setNotes] = useState('');
  const [errorText, setErrorText] = useState<string | null>(null);

  const createMovement = useCreateMovement();

  if (!open) return null;

  const oppositeDirection = movement.direction === 'out' ? 'in' : 'out';
  const oppositeReason = movement.direction === 'out' ? 'return' : movement.reason;

  const submit = async () => {
    setErrorText(null);
    try {
      await createMovement.mutateAsync({
        dress_id: dressId,
        direction: oppositeDirection,
        reason: oppositeReason as 'rental' | 'sale_delivery' | 'fitting' | 'alteration' | 'cleaning' | 'photoshoot' | 'return' | 'other',
        customer_id: movement.customer_id,
        from_location: movement.to_location,
        to_location: movement.from_location ?? 'in_atelier',
        due_at: null,
        condition_notes: notes.trim() || `Correction of movement ${movement.id}`,
        corrects_movement_id: movement.id,
      });
      onClose();
    } catch {
      setErrorText(t('movements.saveFailed'));
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      testId="correct-sheet"
      maxHeight="85dvh"
      title={t('movements.correctTitle', { code: dressCode })}
    >
      <div className="flex flex-col gap-3">
        <Panel>
          <p className="text-small text-ink">
            {t('movements.correctBody', { direction: t(`movements.direction.${movement.direction}`), reason: t(`movements.reason.${movement.reason}`) })}
          </p>
        </Panel>
        <Panel>
          <TextArea
            label={t('movements.conditionNotes')}
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
        <Button onClick={() => void submit()} loading={createMovement.isPending}>
          {t('movements.correct')}
        </Button>
      </div>
    </Sheet>
  );
}
