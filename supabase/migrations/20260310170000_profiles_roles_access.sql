alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists phone text,
  add column if not exists position text,
  add column if not exists department text;

update public.profiles
set
  first_name = coalesce(first_name, nullif(split_part(coalesce(full_name, ''), ' ', 1), '')),
  last_name = coalesce(last_name, nullif(trim(regexp_replace(coalesce(full_name, ''), '^\S+\s*', '')), '')),
  position = coalesce(position, 'Sales Representative'),
  department = coalesce(department, 'Sales');

update public.profiles
set full_name = coalesce(
  nullif(trim(concat_ws(' ', first_name, last_name)), ''),
  full_name
);

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('admin', 'manager', 'commercial', 'standard_user'));

create or replace function public.sync_profile_full_name()
returns trigger
language plpgsql
as $$
begin
  if new.first_name is not null or new.last_name is not null then
    new.full_name := coalesce(
      nullif(trim(concat_ws(' ', new.first_name, new.last_name)), ''),
      new.full_name
    );
  end if;

  if new.position is null or btrim(new.position) = '' then
    new.position := 'Sales Representative';
  end if;

  if new.department is null or btrim(new.department) = '' then
    new.department := 'Sales';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_profiles_sync_full_name on public.profiles;
create trigger trg_profiles_sync_full_name
before insert or update on public.profiles
for each row
execute function public.sync_profile_full_name();

create or replace function public.is_manager(uid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = uid and role in ('admin', 'manager', 'commercial')
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_profiles integer;
  target_role text;
  base_name text;
  v_first_name text;
  v_last_name text;
begin
  select count(*) into existing_profiles from public.profiles;
  target_role := case when existing_profiles = 0 then 'admin' else 'standard_user' end;

  base_name := coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1));
  v_first_name := nullif(split_part(base_name, ' ', 1), '');
  v_last_name := nullif(trim(regexp_replace(base_name, '^\S+\s*', '')), '');

  insert into public.profiles (
    id,
    full_name,
    first_name,
    last_name,
    role,
    position,
    department
  )
  values (
    new.id,
    base_name,
    v_first_name,
    v_last_name,
    target_role,
    'Sales Representative',
    'Sales'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;
