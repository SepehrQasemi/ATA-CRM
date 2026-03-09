create table if not exists public.automation_execution_locks (
  id uuid primary key default gen_random_uuid(),
  job_name text not null,
  lock_key text not null unique,
  lead_id uuid references public.leads(id) on delete cascade,
  window_start timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_automation_execution_locks_job
  on public.automation_execution_locks(job_name);

create index if not exists idx_automation_execution_locks_lead
  on public.automation_execution_locks(lead_id);

alter table public.automation_execution_locks enable row level security;

drop policy if exists "automation_execution_locks_admin_only" on public.automation_execution_locks;
create policy "automation_execution_locks_admin_only"
on public.automation_execution_locks for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));
