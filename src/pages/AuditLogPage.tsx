import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { Screen } from '@/components/layout/Screen';
import { Panel } from '@/components/ui/Panel';
import { Spinner } from '@/components/ui/Spinner';

interface AuditEntry {
  id: string;
  entity: string;
  entity_id: string | null;
  action: string;
  user_id: string | null;
  diff: Record<string, unknown> | null;
  created_at: string;
}

function useAuditLog() {
  return useQuery({
    queryKey: ['audit_log'],
    queryFn: async (): Promise<AuditEntry[]> => {
      const client = supabase as NonNullable<typeof supabase>;
      const { data, error } = await client
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as AuditEntry[];
    },
  });
}

export function AuditLogPage() {
  const { t } = useTranslation();
  const log = useAuditLog();

  return (
    <Screen eyebrow="Admin" title="Audit log" subtitle="Who changed what, and when">
      {log.isPending ? (
        <div className="flex justify-center py-10">
          <Spinner className="h-5 w-5 text-accent" />
        </div>
      ) : log.isError ? (
        <Panel>
          <p className="text-small text-danger">{t('gallery.loadFailedBody')}</p>
        </Panel>
      ) : (log.data ?? []).length === 0 ? (
        <Panel>
          <p className="text-small text-muted">No entries yet.</p>
        </Panel>
      ) : (
        <Panel flush>
          <ul className="divide-y divide-line">
            {(log.data ?? []).map((entry) => (
              <li key={entry.id} className="px-3 py-2">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-small font-semibold text-ink">
                    {entry.action} · {entry.entity}
                  </p>
                  <span className="shrink-0 font-mono text-[11px] tracking-tight text-muted">
                    {new Date(entry.created_at).toLocaleString()}
                  </span>
                </div>
                {entry.entity_id ? (
                  <p className="mt-0.5 font-mono text-[11px] tracking-tight text-faint">
                    {entry.entity_id}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </Screen>
  );
}
