import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { useCustomers, useCustomerMovements } from '@/features/movements/api';

function CustomerList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const customers = useCustomers(search);

  return (
    <Screen title={t('customers.title')} subtitle={t('customers.subtitle')}>
      <div className="flex flex-1 flex-col gap-4" data-testid="customers-page">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('customers.search')}
          className="min-h-tap w-full rounded-field border-[1.5px] border-line bg-surface px-3 py-2.5 text-input text-ink placeholder:text-muted"
        />
        {customers.isLoading ? (
          <div className="flex justify-center py-8"><Spinner className="h-6 w-6 text-accent" /></div>
        ) : (customers.data ?? []).length === 0 ? (
          <p className="rounded-card bg-soft p-4 text-small text-muted">{t('customers.empty')}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {(customers.data ?? []).map((customer) => (
              <button
                key={customer.id}
                type="button"
                onClick={() => navigate(`/customers/${customer.id}`)}
                className="flex items-center gap-3 rounded-card bg-surface p-3 text-start"
              >
                <div className="flex-1">
                  <p className="text-small font-semibold text-ink">{customer.full_name}</p>
                  <p className="text-note text-muted">{customer.phone ?? customer.email ?? '—'}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </Screen>
  );
}

function CustomerDetail({ id }: { id: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const customers = useCustomers('');
  const customer = (customers.data ?? []).find((c) => c.id === id);
  const movements = useCustomerMovements(id);

  return (
    <Screen title={customer?.full_name ?? t('customers.title')}>
      <div className="flex flex-1 flex-col gap-4 pb-4">
        {customer ? (
          <div className="rounded-card bg-soft p-4">
            <p className="text-small text-ink"><span className="text-muted">{t('customers.phone')}: </span>{customer.phone ?? '—'}</p>
            <p className="text-small text-ink"><span className="text-muted">{t('customers.email')}: </span>{customer.email ?? '—'}</p>
            {customer.notes ? <p className="mt-2 text-small text-muted">{customer.notes}</p> : null}
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <p className="text-caption font-semibold text-muted">{t('customers.movements')}</p>
          {movements.isLoading ? (
            <div className="flex justify-center py-4"><Spinner className="h-5 w-5 text-accent" /></div>
          ) : (movements.data ?? []).length === 0 ? (
            <p className="text-small text-muted">{t('customers.noMovements')}</p>
          ) : (
            (movements.data ?? []).map((m) => (
              <div key={m.id} className="rounded-field bg-surface px-3 py-2">
                <p className="text-small font-semibold text-ink">
                  {t(`movements.direction.${m.direction}`)} · {t(`movements.reason.${m.reason}`)}
                </p>
                <p className="text-note text-muted">
                  {new Date(m.occurred_at).toLocaleString()} → {m.to_location}
                  {m.due_at ? ` · ${t('movements.due')} ${new Date(m.due_at).toLocaleDateString()}` : ''}
                </p>
                {m.condition_notes ? <p className="mt-1 text-note text-ink">{m.condition_notes}</p> : null}
              </div>
            ))
          )}
        </div>

        <Button variant="secondary" onClick={() => navigate('/customers')} className="w-full">
          {t('common.back', { defaultValue: 'Back' })}
        </Button>
      </div>
    </Screen>
  );
}

export function CustomersPage() {
  const params = useParams<{ id: string }>();
  if (params.id) return <CustomerDetail id={params.id} />;
  return <CustomerList />;
}
