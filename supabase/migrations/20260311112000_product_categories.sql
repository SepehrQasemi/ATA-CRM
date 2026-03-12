create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  owner_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_product_categories_name on public.product_categories(name);
create index if not exists idx_product_categories_owner_id on public.product_categories(owner_id);

drop trigger if exists trg_product_categories_updated_at on public.product_categories;
create trigger trg_product_categories_updated_at
before update on public.product_categories
for each row
execute function public.tg_set_updated_at();

alter table public.product_categories enable row level security;

drop policy if exists "product_categories_rw_for_members" on public.product_categories;
create policy "product_categories_rw_for_members"
on public.product_categories for all
using (
  auth.role() = 'authenticated' and
  (owner_id = auth.uid() or owner_id is null or public.is_admin(auth.uid()))
)
with check (
  auth.role() = 'authenticated' and
  (owner_id = auth.uid() or owner_id is null or public.is_admin(auth.uid()))
);

insert into public.product_categories (name, description)
select distinct btrim(category), null
from public.products
where category is not null and btrim(category) <> ''
on conflict (name) do nothing;
