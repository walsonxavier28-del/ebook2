-- ============================================================
-- eBookly — Schema completo do Supabase
-- Execute este script inteiro no Supabase SQL Editor.
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- 1. TABELA profiles
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text unique not null,
  phone_number text unique,
  is_super_admin boolean not null default false,
  payout_mpesa text,
  payout_emola text,
  affiliate_code text unique,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 2. TABELA products
-- ------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  price numeric(12, 2) not null check (price >= 0),
  cover_image_url text not null,
  file_url text not null,
  producer_id uuid not null references public.profiles (id) on delete cascade,
  checkout_slug text unique not null,
  status text not null default 'pending_review'
    check (status in ('pending_review', 'active', 'rejected')),
  rejection_reason text,
  affiliate_enabled boolean not null default true,
  affiliate_commission_percent numeric(5,2) not null default 20.00
    check (affiliate_commission_percent >= 0 and affiliate_commission_percent <= 100),
  created_at timestamptz not null default now()
);

create index if not exists idx_products_producer on public.products (producer_id);
create index if not exists idx_products_status on public.products (status);
create index if not exists idx_products_slug on public.products (checkout_slug);

-- ------------------------------------------------------------
-- 3. TABELA transactions
-- ------------------------------------------------------------
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  buyer_name text not null,
  buyer_email text not null,
  buyer_phone text not null,
  payment_method text not null check (payment_method in ('mpesa', 'emola')),
  amount numeric(12, 2) not null check (amount >= 0),
  proof_code text not null,
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'failed')),
  affiliate_id uuid references public.profiles (id),
  affiliate_commission_amount numeric(12,2),
  created_at timestamptz not null default now()
);

create index if not exists idx_transactions_product on public.transactions (product_id);
create index if not exists idx_transactions_status on public.transactions (status);

-- ------------------------------------------------------------
-- 4. TRIGGER: criação automática de perfil ao registar utilizador
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, phone_number, is_super_admin, affiliate_code)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    new.raw_user_meta_data ->> 'phone_number',
    new.email in ('walsonxavier28@gmail.com', 'kristendossantos17@gmail.com'),
    substring(replace(new.id::text, '-', '') from 1 for 8)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS)
-- ------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.transactions enable row level security;

-- Função auxiliar: verifica se o utilizador autenticado é admin
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and (
        is_super_admin = true
        or email in ('walsonxavier28@gmail.com', 'kristendossantos17@gmail.com')
      )
  );
$$;

-- ---------------- profiles ----------------
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------------- products ----------------
drop policy if exists "products_select_public_active" on public.products;
create policy "products_select_public_active"
  on public.products for select
  using (status = 'active');

drop policy if exists "products_select_own_producer" on public.products;
create policy "products_select_own_producer"
  on public.products for select
  using (producer_id = auth.uid());

drop policy if exists "products_select_admin" on public.products;
create policy "products_select_admin"
  on public.products for select
  using (public.is_admin());

drop policy if exists "products_insert_own_producer" on public.products;
create policy "products_insert_own_producer"
  on public.products for insert
  with check (producer_id = auth.uid());

drop policy if exists "products_update_own_producer" on public.products;
create policy "products_update_own_producer"
  on public.products for update
  using (producer_id = auth.uid() and status = 'pending_review')
  with check (producer_id = auth.uid());

drop policy if exists "products_update_admin" on public.products;
create policy "products_update_admin"
  on public.products for update
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------- transactions ----------------
drop policy if exists "transactions_insert_public" on public.transactions;
create policy "transactions_insert_public"
  on public.transactions for insert
  with check (true);

drop policy if exists "transactions_select_admin" on public.transactions;
create policy "transactions_select_admin"
  on public.transactions for select
  using (public.is_admin());

drop policy if exists "transactions_select_own_producer" on public.transactions;
create policy "transactions_select_own_producer"
  on public.transactions for select
  using (
    exists (
      select 1 from public.products
      where products.id = transactions.product_id
        and products.producer_id = auth.uid()
    )
  );

drop policy if exists "transactions_select_own_affiliate" on public.transactions;
create policy "transactions_select_own_affiliate"
  on public.transactions for select
  using (affiliate_id = auth.uid());

drop policy if exists "transactions_update_admin" on public.transactions;
create policy "transactions_update_admin"
  on public.transactions for update
  using (public.is_admin())
  with check (public.is_admin());

-- ------------------------------------------------------------
-- 6. STORAGE: bucket para capas e ficheiros PDF
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('product-assets', 'product-assets', true)
on conflict (id) do nothing;

drop policy if exists "product_assets_public_read" on storage.objects;
create policy "product_assets_public_read"
  on storage.objects for select
  using (bucket_id = 'product-assets');

drop policy if exists "product_assets_authenticated_upload" on storage.objects;
create policy "product_assets_authenticated_upload"
  on storage.objects for insert
  with check (bucket_id = 'product-assets' and auth.role() = 'authenticated');

-- ------------------------------------------------------------
-- 7. TABELA affiliations (Pedidos de Afiliação)
-- ------------------------------------------------------------
create table if not exists public.affiliations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  affiliate_id uuid not null references public.profiles (id) on delete cascade,
  producer_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  unique(product_id, affiliate_id)
);

create index if not exists idx_affiliations_product on public.affiliations (product_id);
create index if not exists idx_affiliations_affiliate on public.affiliations (affiliate_id);
create index if not exists idx_affiliations_producer on public.affiliations (producer_id);

alter table public.affiliations enable row level security;

-- Afiliados podem ver as suas próprias afiliações
drop policy if exists "affiliations_select_affiliate" on public.affiliations;
create policy "affiliations_select_affiliate"
  on public.affiliations for select
  using (affiliate_id = auth.uid());

-- Produtores podem ver as afiliações dos seus produtos
drop policy if exists "affiliations_select_producer" on public.affiliations;
create policy "affiliations_select_producer"
  on public.affiliations for select
  using (producer_id = auth.uid());

-- Admin pode ver tudo
drop policy if exists "affiliations_select_admin" on public.affiliations;
create policy "affiliations_select_admin"
  on public.affiliations for select
  using (public.is_admin());

-- Afiliados podem criar um pedido
drop policy if exists "affiliations_insert_affiliate" on public.affiliations;
create policy "affiliations_insert_affiliate"
  on public.affiliations for insert
  with check (affiliate_id = auth.uid());

-- Produtores podem atualizar o status dos pedidos dos seus produtos
drop policy if exists "affiliations_update_producer" on public.affiliations;
create policy "affiliations_update_producer"
  on public.affiliations for update
  using (producer_id = auth.uid())
  with check (producer_id = auth.uid());

-- ============================================================
-- FIM DO SCRIPT
-- ============================================================
