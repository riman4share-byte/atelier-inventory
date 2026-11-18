-- Turnover days: how many days after a return before a dress can go out again.
-- 0 keeps the current behaviour (available the next day).
alter table public.app_settings
  add column if not exists turnover_days smallint not null default 0
  check (turnover_days >= 0 and turnover_days <= 14);
