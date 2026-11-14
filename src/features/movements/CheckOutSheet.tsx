import { useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCustomers, useCreateCustomer, useCreateMovement, useDressMovements } from './api';
import { bookingsFromMovements, conflictsWithBooking } from './availability';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { Sheet } from '@/components/ui/Sheet';
import { TextArea } from '@/components/ui/TextArea';
import { TextField } from '@/components/ui/TextField';


const REASONS = ['rental', 'sale_delivery', 'fitting', 'alteration', 'cleaning', 'photoshoot', 'other'] as const;

interface CheckOutSheetProps {
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

/** Bottom sheet to check a dress out to a customer. */
export function CheckOutSheet({ open, onClose, dressId, dressCode }: CheckOutSheetProps) {
  const { t } = useTranslation();
  const reasonId = useId();
  const listId = useId();
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [reason, setReason] = useState<'rental' | 'sale_delivery' | 'fitting' | 'alteration' | 'cleaning' | 'photoshoot' | 'return' | 'other'>('rental');
  const [dueDate, setDueDate] = useState('');
  const [deposit, setDeposit] = useState('');
  const [notes, setNotes] = useState('');
  const [errorText, setErrorText] = useState<string | null>(null);

  const customers = useCustomers(customerSearch);
  const createCustomer = useCreateCustomer();
  const createMovement = useCreateMovement();
  const movementsQuery = useDressMovements(dressId);

  // Bookings already on this dress. If the chosen due date overlaps one of
  // them, warn before saving — a double-booked dress is the one mistake a
  // rental shop cannot afford.
  const bookings = useMemo(
    () => bookingsFromMovements(movementsQuery.data ?? []),
    [movementsQuery.data],
  );
  const conflict = useMemo(() => {
    if (!dueDate) return null;
    const from = new Date();
    const to = new Date(dueDate);
    if (Number.isNaN(to.getTime())) return null;
    return conflictsWithBooking(bookings, from, to);
  }, [bookings, dueDate]);

  if (!open) return null;

  const submit = async () => {
    setErrorText(null);
    let customerId = selectedCustomerId;
    if (!customerId && newName.trim()) {
      try {
        const created = await createCustomer.mutateAsync({
          full_name: newName.trim(),
          phone: newPhone.trim() || null,
        });
        customerId = created.id;
      } catch {
        setErrorText(t('movements.saveFailed'));
        return;
      }
    }
    if (!customerId) {
      setErrorText(t('movements.pickCustomer'));
      return;
    }
    try {
      await createMovement.mutateAsync({
        dress_id: dressId,
        direction: 'out',
        reason,
        customer_id: customerId,
        from_location: 'in_atelier',
        to_location: 'with_customer',
        due_at: dueDate ? new Date(dueDate).toISOString() : null,
        deposit_amount: deposit ? Number(deposit) : null,
        condition_notes: notes.trim() || null,
      });
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      setErrorText(message === 'conflict' ? t('movements.conflict') : t('movements.saveFailed'));
    }
  };

  const showSuggestions = Boolean(customerSearch.trim()) && !selectedCustomerId;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      testId="checkout-sheet"
      title={<TitleWithCode title={t('movements.checkOutTitle', { code: dressCode })} code={dressCode} />}
    >
      <div className="flex flex-col gap-3">
          {/* Custody: who is taking the dress. */}
          <Panel>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <TextField
                  label={t('movements.customer')}
                  placeholder={t('movements.searchCustomer')}
                  value={customerSearch}
                  role="combobox"
                  aria-expanded={showSuggestions}
                  aria-controls={listId}
                  aria-autocomplete="list"
                  onChange={(event) => {
                    setCustomerSearch(event.target.value);
                    setSelectedCustomerId(null);
                  }}
                />
                {showSuggestions ? (
                  <div className="overflow-hidden rounded-field border border-line bg-surface">
                    <ul id={listId} role="listbox" className="divide-y divide-line">
                      {(customers.data ?? []).map((customer) => (
                        <li key={customer.id} role="presentation">
                          <button
                            type="button"
                            role="option"
                            aria-selected={false}
                            onClick={() => {
                              setSelectedCustomerId(customer.id);
                              setCustomerSearch(customer.full_name);
                            }}
                            className="flex w-full items-center gap-2 px-2.5 py-1.5 text-start text-small text-ink transition-colors hover:bg-surface-2"
                          >
                            <span className="font-semibold">{customer.full_name}</span>
                            {customer.phone ? (
                              <span className="font-mono text-note text-muted">{customer.phone}</span>
                            ) : null}
                          </button>
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      onClick={() => {
                        setNewName(customerSearch.trim());
                        setSelectedCustomerId(null);
                      }}
                      className="w-full border-t border-line px-2.5 py-1.5 text-start text-caption font-semibold text-accent transition-colors hover:bg-surface-2"
                    >
                      {t('movements.addNewCustomer', { name: customerSearch.trim() })}
                    </button>
                  </div>
                ) : null}
              </div>

              {newName && !selectedCustomerId ? (
                <div className="flex flex-col gap-3 border-t border-line pt-3">
                  <p className="eyebrow">{t('movements.newCustomer')}</p>
                  <TextField
                    label={t('movements.fullName')}
                    value={newName}
                    onChange={(event) => setNewName(event.target.value)}
                  />
                  <TextField
                    label={t('movements.phone')}
                    mono
                    value={newPhone}
                    onChange={(event) => setNewPhone(event.target.value)}
                  />
                </div>
              ) : null}
            </div>
          </Panel>

          {/* The movement itself: reason, return date, money taken. */}
          <Panel>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label
                  htmlFor={reasonId}
                  className="eyebrow text-[10px] font-medium tracking-widest text-muted"
                >
                  {t('movements.reasonLabel')}
                </label>
                <select
                  id={reasonId}
                  value={reason}
                  onChange={(event) => setReason(event.target.value as 'rental' | 'sale_delivery' | 'fitting' | 'alteration' | 'cleaning' | 'photoshoot' | 'return' | 'other')}
                  className="h-9 rounded-field border border-line bg-surface px-2.5 text-body text-ink focus:border-accent"
                >
                  {REASONS.map((value) => (
                    <option key={value} value={value}>
                      {t(`movements.reason.${value}`)}
                    </option>
                  ))}
                </select>
              </div>

              <TextField
                label={t('movements.dueDate')}
                type="date"
                mono
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
              {conflict ? (
                <p className="rounded-card border border-danger-line bg-danger-bg px-3 py-2 text-small text-danger" role="alert">
                  {t('movements.conflict')}
                </p>
              ) : null}

              <TextField
                label={t('movements.deposit')}
                type="number"
                mono
                inputMode="decimal"
                placeholder="0"
                value={deposit}
                onChange={(event) => setDeposit(event.target.value)}
              />
            </div>
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

          <Button
            onClick={() => void submit()}
            loading={createMovement.isPending || createCustomer.isPending}
          >
            {t('movements.checkOut')}
          </Button>
        </div>
    </Sheet>
  );
}
