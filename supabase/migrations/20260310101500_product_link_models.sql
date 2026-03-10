alter table public.product_company_links
add column if not exists product_model text not null default '';

alter table public.product_company_links
drop constraint if exists product_company_links_product_id_company_id_relation_type_key;

alter table public.product_company_links
drop constraint if exists product_company_links_unique_relation_model;

alter table public.product_company_links
add constraint product_company_links_unique_relation_model
unique (product_id, company_id, relation_type, product_model);

create index if not exists idx_product_links_product_model
on public.product_company_links(product_model);
