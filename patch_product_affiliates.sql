-- Permite ao produtor decidir, por produto, se aceita afiliados.
-- Produtos existentes permanecem disponíveis para afiliados.
alter table public.products
  add column if not exists affiliate_enabled boolean not null default true;

update public.products
set affiliate_enabled = true
where affiliate_enabled is null;