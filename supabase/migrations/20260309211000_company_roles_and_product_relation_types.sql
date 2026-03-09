alter table public.companies
add column if not exists company_role text not null default 'both'
check (company_role in ('supplier', 'customer', 'both'));

create index if not exists idx_companies_company_role on public.companies(company_role);

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = con.connamespace
    where nsp.nspname = 'public'
      and rel.relname = 'product_company_links'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%relation_type%'
  loop
    execute format(
      'alter table public.product_company_links drop constraint %I',
      constraint_name
    );
  end loop;
end $$;

update public.product_company_links
set relation_type = 'traded'
where relation_type in ('supplier', 'customer');

alter table public.product_company_links
drop constraint if exists product_company_links_relation_type_check;

alter table public.product_company_links
add constraint product_company_links_relation_type_check
check (relation_type in ('traded', 'potential'));
