import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Screen } from '@/components/layout/Screen';
import { Panel } from '@/components/ui/Panel';
import { Spinner } from '@/components/ui/Spinner';
import { formatMoney } from '@/lib/format';

interface OutstandingDeposit {
  customer_id: string;
  customer_name: string;
  total_taken: number;
  total_returned: number;
  outstanding: number;
  movement_count: number;
}

function useOutstandingDeposits() {
  return useQuery({
    queryKey: ['deposits', 'outstanding'],
    queryFn: async (): Promise<OutstandingDeposit[]> => {
      const client = supabase as NonNullable<typeof supabase>;
      const { data: movements, error } = await client
        .from('dress_movements')
        .select('customer_id, deposit_amount, deposit_returned')
        .not('deposit_amount', 'is', null)
        .gt('deposit_amount', 0);
      if (error) throw error;

      const byCustomer = new Map<string, { taken: number; returned: number; count: number }>();
      for (const m of movements ?? []) {
        if (!m.customer_id) continue;
        const entry = byCustomer.get(m.customer_id) ?? { taken: 0, returned: 0, count: 0 };
        entry.taken += Number(m.deposit_amount ?? 0);
        if (m.deposit_returned) entry.returned += Number(m.deposit_amount ?? 0);
        entry.count += 1;
        byCustomer.set(m.customer_id, entry);
      }

      const customerIds = [...byCustomer.keys()];
      if (customerIds.length === 0) return [];

      const { data: customers } = await client
        .from('customers')
        .select('id, full_name')
        .in('id', customerIds);

      const nameMap = new Map((customers ?? []).map((c) => [c.id, c.full_name]));

      return customerIds
        .map((id) => {
          const entry = byCustomer.get(id)!;
          return {
            customer_id: id,
            customer_name: nameMap.get(id) ?? id.slice(0, 8),
            total_taken: entry.taken,
            total_returned: entry.returned,
            outstanding: entry.taken - entry.returned,
            movement_count: entry.count,
          };
        })
        .filter((d) => d.outstanding > 0)
        .sort((a, b) => b.outstanding - a.outstanding);
    },
  });
}

export function DepositsPage() {
  const deposits = useOutstandingDeposits();

  return (
    <Screen eyebrow="Admin" title="Deposits" subtitle="Outstanding deposit balances">
      {deposits.isPending ? (
        <div className="flex justify-center py-10">
          <Spinner className="h-5 w-5 text-accent" />
        </div>
      ) : deposits.isError ? (
        <Panel>
          <p className="text-small text-danger">Could not load deposits.</p>
        </Panel>
      ) : (deposits.data ?? []).length === 0 ? (
        <Panel>
          <p className="text-small text-muted">No outstanding deposits.</p>
        </Panel>
      ) : (
        <Panel flush>
          <ul className="divide-y divide-line">
            {(deposits.data ?? []).map((d) => (
              <li key={d.customer_id} className="px-3 py-2">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-small font-semibold text-ink">{d.customer_name}</p>
                  <span className="shrink-0 font-mono text-body font-semibold tracking-tight text-ink">
                    {formatMoney(d.outstanding, 'en')}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-muted">
                  {d.movement_count} movement{d.movement_count !== 1 ? 's' : ''} · taken {formatMoney(d.total_taken, 'en')} · returned {formatMoney(d.total_returned, 'en')}
                </p>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </Screen>
  );
}
