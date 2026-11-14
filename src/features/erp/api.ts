import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useEnqueueErpSync() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ dressId, code, name, description, category, fabrics, color, size_label }: { dressId: string; code: string; name: string; description?: string | null; category?: string | null; fabrics?: string[] | null; color?: string | null; size_label?: string | null }) => {
      const db = supabase as NonNullable<typeof supabase>;
      const { data: job, error: jobError } = await db
        .from('erp_jobs')
        .insert({ type: 'create_dress_item', payload: { dressId, code, name, description, category, fabrics, color, size_label } })
        .select()
        .single();
      if (jobError) throw jobError;
      // Fire-and-forget: invoke the sync function
      await db.functions.invoke('erp-sync', { body: {} }).catch(() => { /* best effort */ });
      return job;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['erp_jobs'] }),
  });
}
