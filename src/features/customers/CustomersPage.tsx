import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { Spinner } from '@/components/ui/Spinner';
import { TextField } from '@/components/ui/TextField';
import { ChevronRightIcon, PersonIcon } from '@/components/icons';
import { useCustomers, useCustomerMovements } from '@/features/movements/api';

function CustomerList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const customers = useCustomers(search);

  return (
    <Screen title={t('customers.title')} subtitle={t('customers.subtitle')}>
      <div className="flex flex-1 flex-col gap-3" data-testid="customers-page">
        <TextField
          label={t('customers.search')}
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        {customers.isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner className="h-5 w-5 text-accent" />
          </div>
        ) : (customers.data ?? []).length === 0 ? (
          <Panel className="px-3 py-6 text-center">
            <p className="text-small text-muted">{t('customers.empty')}</p>
          </Panel>
        ) : (
          <Panel flush>
            <ul className="divide-y divide-line">
              {(customers.data ?? []).map((customer) => (
                <li key={customer.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/customers/${customer.id}`)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-start transition-colors hover:bg-surface-2"
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-field bg-surface-2 text-muted">
                      <PersonIcon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-small font-semibold text-ink">
                        {customer.full_name}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-caption tracking-tight text-muted">
                      {customer.phone ?? customer.email ?? '—'}
                    </span>
                    <ChevronRightIcon className="h-4 w-4 shrink-0 text-faint" />
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
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
      <div className="flex flex-1 flex-col gap-3 pb-4">
        {customer ? (
          <Panel>
            <dl className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="eyebrow">{t('customers.phone')}</dt>
                <dd className="min-w-0 truncate font-mono text-small tracking-tight text-ink" dir="ltr">
                  {customer.phone ?? '—'}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="eyebrow">{t('customers.email')}</dt>
                <dd className="min-w-0 truncate font-mono text-small tracking-tight text-ink" dir="ltr">
                  {customer.email ?? '—'}
                </dd>
              </div>
            </dl>
            {customer.notes ? (
              <p className="mt-3 border-t border-line pt-3 text-small text-muted">{customer.notes}</p>
            ) : null}
          </Panel>
        ) : null}

        <Panel title={t('customers.movements')} flush>
          {movements.isLoading ? (
            <div className="flex justify-center py-6">
              <Spinner className="h-5 w-5 text-accent" />
            </div>
          ) : (movements.data ?? []).length === 0 ? (
            <p className="px-3 py-3 text-small text-muted">{t('customers.noMovements')}</p>
          ) : (
            <ul className="divide-y divide-line">
              {(movements.data ?? []).map((m) => (
                <li key={m.id} className="px-3 py-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <p className="text-small font-semibold text-ink">
                      {t(`movements.direction.${m.direction}`)} · {t(`movements.reason.${m.reason}`)}
                    </p>
                    <span className="shrink-0 font-mono text-caption tracking-tight text-muted">
                      {new Date(m.occurred_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-0.5 font-mono text-caption tracking-tight text-faint">
                    → {m.to_location}
                    {m.due_at
                      ? ` · ${t('movements.due')} ${new Date(m.due_at).toLocaleDateString()}`
                      : ''}
                  </p>
                  {m.condition_notes ? (
                    <p className="mt-1 text-note text-ink">{m.condition_notes}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Button variant="secondary" onClick={() => navigate('/customers')}>
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
