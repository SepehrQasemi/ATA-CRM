create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text unique,
  category text,
  unit text not null default 'kg',
  default_purchase_price numeric(12,2) not null default 0,
  default_sale_price numeric(12,2) not null default 0,
  is_active boolean not null default true,
  notes text,
  owner_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_company_links (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  relation_type text not null check (relation_type in ('supplier', 'customer')),
  last_price numeric(12,2),
  notes text,
  owner_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, company_id, relation_type)
);

create index if not exists idx_products_owner_id on public.products(owner_id);
create index if not exists idx_products_category on public.products(category);
create index if not exists idx_products_is_active on public.products(is_active);
create index if not exists idx_product_links_product_id on public.product_company_links(product_id);
create index if not exists idx_product_links_company_id on public.product_company_links(company_id);
create index if not exists idx_product_links_owner_id on public.product_company_links(owner_id);
create index if not exists idx_product_links_relation_type on public.product_company_links(relation_type);

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at
before update on public.products
for each row
execute function public.tg_set_updated_at();

drop trigger if exists trg_product_company_links_updated_at on public.product_company_links;
create trigger trg_product_company_links_updated_at
before update on public.product_company_links
for each row
execute function public.tg_set_updated_at();

alter table public.products enable row level security;
alter table public.product_company_links enable row level security;

drop policy if exists "products_rw_for_members" on public.products;
create policy "products_rw_for_members"
on public.products for all
using (
  auth.role() = 'authenticated' and
  (owner_id = auth.uid() or owner_id is null or public.is_admin(auth.uid()))
)
with check (
  auth.role() = 'authenticated' and
  (owner_id = auth.uid() or owner_id is null or public.is_admin(auth.uid()))
);

drop policy if exists "product_links_rw_for_members" on public.product_company_links;
create policy "product_links_rw_for_members"
on public.product_company_links for all
using (
  auth.role() = 'authenticated' and
  (owner_id = auth.uid() or owner_id is null or public.is_admin(auth.uid()))
)
with check (
  auth.role() = 'authenticated' and
  (owner_id = auth.uid() or owner_id is null or public.is_admin(auth.uid()))
);

