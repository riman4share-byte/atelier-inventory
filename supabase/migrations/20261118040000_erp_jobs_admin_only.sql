-- erp_jobs: only admins may enqueue or read.
drop policy if exists "erp_jobs: staff read" on public.erp_jobs;
drop policy if exists "erp_jobs: staff insert" on public.erp_jobs;
create policy "erp_jobs: admin read" on public.erp_jobs for select
  to authenticated using (public.is_admin());
create policy "erp_jobs: admin insert" on public.erp_jobs for insert
  to authenticated with check (public.is_admin());
