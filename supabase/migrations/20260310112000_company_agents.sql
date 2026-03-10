alter table public.contacts
add column if not exists is_company_agent boolean not null default false;

alter table public.contacts
add column if not exists agent_rank smallint;

alter table public.contacts
drop constraint if exists contacts_agent_rank_check;

alter table public.contacts
add constraint contacts_agent_rank_check
check (agent_rank between 1 and 3 or agent_rank is null);

update public.contacts
set agent_rank = null
where is_company_agent = false;

create index if not exists idx_contacts_company_agent_rank
on public.contacts(company_id, is_company_agent, agent_rank);
