alter table public.email_logs
add column if not exists open_count integer not null default 0,
add column if not exists click_count integer not null default 0,
add column if not exists opened_at timestamptz,
add column if not exists clicked_at timestamptz;

create index if not exists idx_email_logs_provider_message_id
  on public.email_logs(provider_message_id);
