import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCheckInDress } from './api';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { Sheet } from '@/components/ui/Sheet';
import { TextArea } from '@/components/ui/TextArea';


interface CheckInSheetProps {
  open: boolean;
  onClose: () => void;
  dressId: string;
  dressCode: string;
  currentCustomerId: string | null;
}

const NEXT_LOCATIONS = ['in_atelier', 'alteration', 'cleaning', 'photoshoot', 'other'] as const;

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

export function CheckInSheet({ open, onClose, dressId, dressCode, currentCustomerId: _currentCustomerId }: CheckInSheetProps) {
  const { t } = useTranslation();
  const locationId = useId();
  const [nextLocation, setNextLocation] = useState<string>('in_atelier');
  const [notes, setNotes] = useState('');
  const [depositReturned, setDepositReturned] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const createMovement = useCheckInDress();

  if (!open) return null;

  const submit = async () => {
    setErrorText(null);
    try {
      await createMovement.mutateAsync({
        dress_id: dressId,
        to_location: nextLocation,
        condition_notes: notes.trim() || null,
        deposit_returned: depositReturned,
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
      testId="checkin-sheet"
      maxHeight="85dvh"
      title={<TitleWithCode title={t('movements.checkInTitle', { code: dressCode })} code={dressCode} />}
    >
      <div className="flex flex-col gap-3">
          {/* Where the dress goes back to. */}
          <Panel>
            <div className="flex flex-col gap-1">
              <label
                htmlFor={locationId}
                className="eyebrow text-[10px] font-medium tracking-widest text-muted"
              >
                {t('movements.nextLocation')}
              </label>
              <select
                id={locationId}
                value={nextLocation}
                onChange={(event) => setNextLocation(event.target.value)}
                className="h-9 rounded-field border border-line bg-surface px-2.5 text-body text-ink focus:border-accent"
              >
                {NEXT_LOCATIONS.map((value) => (
                  <option key={value} value={value}>
                    {t(`movements.location.${value}`)}
                  </option>
                ))}
              </select>
            </div>
          </Panel>

          <Panel>
            <TextArea
              label={t('movements.conditionNotes')}
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </Panel>

          <Panel>
            <label className="flex items-center gap-2 text-small text-ink">
              <input
                type="checkbox"
                checked={depositReturned}
                onChange={(event) => setDepositReturned(event.target.checked)}
                className="h-4 w-4 rounded border-line accent-accent"
              />
              {t('movements.depositReturned')}
            </label>
          </Panel>

          {errorText ? (
            <p className="text-small text-danger" role="alert">
              {errorText}
            </p>
          ) : null}

          <Button onClick={() => void submit()} loading={createMovement.isPending} className="w-full h-12 text-base">
            {t('movements.checkIn')}
          </Button>
        </div>
    </Sheet>
  );
}
