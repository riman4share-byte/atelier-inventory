import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCreateMovement } from './api';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { TextArea } from '@/components/ui/TextArea';
import { XIcon } from '@/components/icons';

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

export function CheckInSheet({ open, onClose, dressId, dressCode, currentCustomerId }: CheckInSheetProps) {
  const { t } = useTranslation();
  const locationId = useId();
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
      <div className="flex max-h-[85dvh] flex-col overflow-y-auto rounded-t-sheet border-t border-line bg-surface pb-safe">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-line bg-surface px-3 py-2">
          <h2 className="text-title font-semibold tracking-tight text-ink">
            <TitleWithCode title={t('movements.checkInTitle', { code: dressCode })} code={dressCode} />
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

          {errorText ? (
            <p className="text-small text-danger" role="alert">
              {errorText}
            </p>
          ) : null}

          <Button onClick={() => void submit()} loading={createMovement.isPending}>
            {t('movements.checkIn')}
          </Button>
        </div>
      </div>
    </div>
  );
}
