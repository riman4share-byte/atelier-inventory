import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCustomers, useCreateCustomer, useCreateMovement } from './api';
import { Button } from '@/components/ui/Button';

const REASONS = ['rental', 'sale_delivery', 'fitting', 'alteration', 'cleaning', 'photoshoot', 'other'] as const;

interface CheckOutSheetProps {
  open: boolean;
  onClose: () => void;
  dressId: string;
  dressCode: string;
}

/** Bottom sheet to check a dress out to a customer. */
export function CheckOutSheet({ open, onClose, dressId, dressCode }: CheckOutSheetProps) {
  const { t } = useTranslation();
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

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end" data-testid="checkout-sheet">
      <button type="button" aria-label={t('common.close')} onClick={onClose} className="flex-1 bg-black/30" />
      <div className="max-h-[90dvh] overflow-y-auto rounded-sheet border border-line bg-surface p-4">
        <h2 className="mb-3 text-title">{t('movements.checkOutTitle', { code: dressCode })}</h2>

        <div className="flex flex-col gap-3">
          {/* Customer */}
          <div>
            <label className="mb-1 block text-caption font-semibold text-muted">{t('movements.customer')}</label>
            <input
              value={customerSearch}
              onChange={(event) => {
                setCustomerSearch(event.target.value);
                setSelectedCustomerId(null);
              }}
              placeholder={t('movements.searchCustomer')}
              className="min-h-tap w-full rounded-field border-[1.5px] border-line bg-surface px-3 py-2 text-input text-ink placeholder:text-muted"
            />
            {customerSearch.trim() && !selectedCustomerId ? (
              <div className="mt-1 max-h-32 overflow-y-auto rounded-field bg-soft">
                {(customers.data ?? []).map((customer) => (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => {
                      setSelectedCustomerId(customer.id);
                      setCustomerSearch(customer.full_name);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-start text-small text-ink hover:bg-surface"
                  >
                    <span className="font-semibold">{customer.full_name}</span>
                    {customer.phone ? <span className="text-muted">{customer.phone}</span> : null}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setNewName(customerSearch.trim());
                    setSelectedCustomerId(null);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-start text-small font-semibold text-accent"
                >
                  {t('movements.addNewCustomer', { name: customerSearch.trim() })}
                </button>
              </div>
            ) : null}
          </div>

          {newName && !selectedCustomerId ? (
            <div className="rounded-field bg-soft p-3">
              <p className="mb-2 text-caption font-semibold text-muted">{t('movements.newCustomer')}</p>
              <input
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder={t('movements.fullName')}
                className="min-h-tap mb-2 w-full rounded-field border-[1.5px] border-line bg-surface px-3 py-2 text-input text-ink"
              />
              <input
                value={newPhone}
                onChange={(event) => setNewPhone(event.target.value)}
                placeholder={t('movements.phone')}
                className="min-h-tap w-full rounded-field border-[1.5px] border-line bg-surface px-3 py-2 text-input text-ink"
              />
            </div>
          ) : null}

          {/* Reason */}
          <div>
            <label className="mb-1 block text-caption font-semibold text-muted">{t('movements.reason')}</label>
            <select
              value={reason}
              onChange={(event) => setReason(event.target.value as 'rental' | 'sale_delivery' | 'fitting' | 'alteration' | 'cleaning' | 'photoshoot' | 'return' | 'other')}
              className="min-h-tap w-full rounded-field border-[1.5px] border-line bg-surface px-3 py-2 text-input text-ink"
            >
              {REASONS.map((value) => (
                <option key={value} value={value}>
                  {t(`movements.reason.${value}`)}
                </option>
              ))}
            </select>
          </div>

          {/* Due date */}
          <div>
            <label className="mb-1 block text-caption font-semibold text-muted">{t('movements.dueDate')}</label>
            <input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              className="min-h-tap w-full rounded-field border-[1.5px] border-line bg-surface px-3 py-2 text-input text-ink"
            />
          </div>

          {/* Deposit */}
          <div>
            <label className="mb-1 block text-caption font-semibold text-muted">{t('movements.deposit')}</label>
            <input
              type="number"
              value={deposit}
              onChange={(event) => setDeposit(event.target.value)}
              placeholder="0"
              className="min-h-tap w-full rounded-field border-[1.5px] border-line bg-surface px-3 py-2 text-input text-ink"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1 block text-caption font-semibold text-muted">{t('movements.conditionNotes')}</label>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={2}
              className="min-h-tap w-full rounded-field border-[1.5px] border-line bg-surface px-3 py-2 text-input text-ink"
            />
          </div>

          {errorText ? <p className="text-small text-danger">{errorText}</p> : null}

          <Button
            onClick={() => void submit()}
            loading={createMovement.isPending || createCustomer.isPending}
            className="w-full"
          >
            {t('movements.checkOut')}
          </Button>
        </div>
      </div>
    </div>
  );
}
