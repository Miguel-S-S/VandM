-- =====================================================================
-- V&M Artículos Deportivos · Etapa 1
-- Pegar completo en Supabase > SQL Editor > Run
-- =====================================================================

-- ---------- Perfiles y roles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'cliente' check (role in ('admin','cliente','duena')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)));
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helpers de rol (security definer para evitar recursión en RLS)
create or replace function public.current_role_name()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('admin','duena') from public.profiles where id = auth.uid()), false)
$$;
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false)
$$;

-- ---------- Catálogo ----------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  position int not null default 0
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  description text default '',
  images text[] not null default '{}',
  active boolean not null default true,
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Cada peso (1 kg, 2 kg, ... 8 kg) es una variante con su precio y stock
create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  label text not null,
  weight_kg numeric(6,2),
  price numeric(12,2) not null check (price >= 0),
  stock int not null default 0 check (stock >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists product_variants_product_idx on public.product_variants(product_id);

-- Configuración del sitio (colores, fuente, redes, WhatsApp, entrega...)
create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- ---------- Auditoría de cambios (precio, stock, activo, nombre) ----------
create table if not exists public.audit_log (
  id bigserial primary key,
  table_name text not null,
  record_id uuid,
  action text not null,
  field text,
  old_value text,
  new_value text,
  context text,
  changed_by uuid default auth.uid(),
  changed_at timestamptz not null default now()
);

create or replace function public.audit_variants()
returns trigger language plpgsql security definer set search_path = public as $$
declare pname text;
begin
  select name into pname from public.products where id = coalesce(new.product_id, old.product_id);
  if tg_op = 'INSERT' then
    insert into audit_log(table_name, record_id, action, field, new_value, context)
    values ('product_variants', new.id, 'INSERT', 'price', new.price::text, pname || ' · ' || new.label);
  elsif tg_op = 'UPDATE' then
    if new.price is distinct from old.price then
      insert into audit_log(table_name, record_id, action, field, old_value, new_value, context)
      values ('product_variants', new.id, 'UPDATE', 'price', old.price::text, new.price::text, pname || ' · ' || new.label);
    end if;
    if new.stock is distinct from old.stock then
      insert into audit_log(table_name, record_id, action, field, old_value, new_value, context)
      values ('product_variants', new.id, 'UPDATE', 'stock', old.stock::text, new.stock::text, pname || ' · ' || new.label);
    end if;
    if new.active is distinct from old.active then
      insert into audit_log(table_name, record_id, action, field, old_value, new_value, context)
      values ('product_variants', new.id, 'UPDATE', 'active', old.active::text, new.active::text, pname || ' · ' || new.label);
    end if;
  elsif tg_op = 'DELETE' then
    insert into audit_log(table_name, record_id, action, field, old_value, context)
    values ('product_variants', old.id, 'DELETE', 'price', old.price::text, coalesce(pname,'') || ' · ' || old.label);
    return old;
  end if;
  return new;
end $$;

drop trigger if exists trg_audit_variants on public.product_variants;
create trigger trg_audit_variants after insert or update or delete on public.product_variants
  for each row execute function public.audit_variants();

create or replace function public.audit_products()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at = now();
  if tg_op = 'UPDATE' then
    if new.name is distinct from old.name then
      insert into audit_log(table_name, record_id, action, field, old_value, new_value, context)
      values ('products', new.id, 'UPDATE', 'name', old.name, new.name, new.name);
    end if;
    if new.active is distinct from old.active then
      insert into audit_log(table_name, record_id, action, field, old_value, new_value, context)
      values ('products', new.id, 'UPDATE', 'active', old.active::text, new.active::text, new.name);
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_audit_products on public.products;
create trigger trg_audit_products before update on public.products
  for each row execute function public.audit_products();

-- ---------- Seguridad (RLS) ----------
alter table public.profiles         enable row level security;
alter table public.categories       enable row level security;
alter table public.products         enable row level security;
alter table public.product_variants enable row level security;
alter table public.site_settings    enable row level security;
alter table public.audit_log        enable row level security;

-- profiles
drop policy if exists "profiles_select_own_or_staff" on public.profiles;
create policy "profiles_select_own_or_staff" on public.profiles for select
  using (id = auth.uid() or public.is_staff());
drop policy if exists "profiles_update_own_name" on public.profiles;
create policy "profiles_update_own_name" on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid() and role = public.current_role_name());
drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all" on public.profiles for all
  using (public.is_admin()) with check (public.is_admin());

-- catálogo: lectura pública (solo activos), escritura solo staff
drop policy if exists "categories_read" on public.categories;
create policy "categories_read" on public.categories for select using (true);
drop policy if exists "categories_write" on public.categories;
create policy "categories_write" on public.categories for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists "products_read" on public.products;
create policy "products_read" on public.products for select using (active or public.is_staff());
drop policy if exists "products_write" on public.products;
create policy "products_write" on public.products for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists "variants_read" on public.product_variants;
create policy "variants_read" on public.product_variants for select using (active or public.is_staff());
drop policy if exists "variants_write" on public.product_variants;
create policy "variants_write" on public.product_variants for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists "settings_read" on public.site_settings;
create policy "settings_read" on public.site_settings for select using (true);
drop policy if exists "settings_write" on public.site_settings;
create policy "settings_write" on public.site_settings for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists "audit_read" on public.audit_log;
create policy "audit_read" on public.audit_log for select using (public.is_staff());

-- ---------- Storage para fotos ----------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "product_images_read" on storage.objects;
create policy "product_images_read" on storage.objects for select
  using (bucket_id = 'product-images');
drop policy if exists "product_images_insert" on storage.objects;
create policy "product_images_insert" on storage.objects for insert
  with check (bucket_id = 'product-images' and public.is_staff());
drop policy if exists "product_images_update" on storage.objects;
create policy "product_images_update" on storage.objects for update
  using (bucket_id = 'product-images' and public.is_staff());
drop policy if exists "product_images_delete" on storage.objects;
create policy "product_images_delete" on storage.objects for delete
  using (bucket_id = 'product-images' and public.is_staff());

-- ---------- Datos iniciales ----------
insert into public.categories (slug, name, position) values
  ('tobilleras', 'Tobilleras', 1),
  ('sandbags',   'Sandbags',   2),
  ('corebags',   'Corebags',   3),
  ('gusanos',    'Gusanos',    4)
on conflict (slug) do nothing;

-- ---------- Después de registrarte en la app ----------
-- Convertí tu usuario en administrador (cambiá el mail):
--   update public.profiles set role = 'admin' where email = 'tu@mail.com';
-- Y para la dueña del negocio:
--   update public.profiles set role = 'duena' where email = 'duena@mail.com';
