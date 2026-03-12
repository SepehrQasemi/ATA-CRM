alter table public.email_logs
add column if not exists sender_user_id uuid references public.profiles(id) on delete set null;

create index if not exists idx_email_logs_sender_user_id
  on public.email_logs(sender_user_id);

update public.email_logs l
set sender_user_id = coalesce(
  l.sender_user_id,
  (
    select lead.owner_id
    from public.leads lead
    where lead.id = l.lead_id
  )
)
where l.sender_user_id is null;

drop policy if exists "email_logs_rw_for_members" on public.email_logs;
create policy "email_logs_rw_for_members"
on public.email_logs for all
using (
  auth.role() = 'authenticated' and
  (public.is_admin(auth.uid()) or sender_user_id = auth.uid())
)
with check (
  auth.role() = 'authenticated' and
  (public.is_admin(auth.uid()) or sender_user_id = auth.uid())
);
