-- ============================================================
-- eBookly — Wallet & Withdrawal Schema
-- ============================================================

-- 1.1 Saldo agregado por utilizador
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS wallet_balance numeric(12,2) not null default 0;

-- 1.2 Livro-razão (Wallet Ledger)
CREATE TABLE IF NOT EXISTS public.wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  amount numeric(12,2) not null,
  type text not null check (type in ('sale_earning', 'affiliate_commission', 'withdrawal', 'withdrawal_fee', 'adjustment')),
  reference_transaction_id uuid references public.transactions (id),
  reference_withdrawal_id uuid, -- Será references public.withdrawal_requests (id), mas criaremos a constraint no fim se necessário
  description text,
  created_at timestamptz not null default now()
);
CREATE INDEX IF NOT EXISTS idx_wallet_ledger_profile on public.wallet_ledger (profile_id);

-- 1.3 Pedidos de saque
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  requested_amount numeric(12,2) not null check (requested_amount > 0),
  fee_amount numeric(12,2) not null,
  net_amount numeric(12,2) not null,
  payout_method text not null check (payout_method in ('mpesa', 'emola', 'mkesh')),
  payout_number text not null,
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  processed_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_profile on public.withdrawal_requests (profile_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status on public.withdrawal_requests (status);

-- Adicionar foreign key para withdrawal_requests
ALTER TABLE public.wallet_ledger ADD CONSTRAINT fk_wallet_ledger_withdrawal 
FOREIGN KEY (reference_withdrawal_id) REFERENCES public.withdrawal_requests (id) ON DELETE SET NULL;

-- 1.4 RLS
ALTER TABLE public.wallet_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wallet_ledger_select_own" ON public.wallet_ledger;
CREATE POLICY "wallet_ledger_select_own"
  ON public.wallet_ledger FOR SELECT
  USING (profile_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "withdrawal_requests_select_own" ON public.withdrawal_requests;
CREATE POLICY "withdrawal_requests_select_own"
  ON public.withdrawal_requests FOR SELECT
  USING (profile_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "withdrawal_requests_insert_own" ON public.withdrawal_requests;
CREATE POLICY "withdrawal_requests_insert_own"
  ON public.withdrawal_requests FOR INSERT
  WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "withdrawal_requests_update_admin" ON public.withdrawal_requests;
CREATE POLICY "withdrawal_requests_update_admin"
  ON public.withdrawal_requests FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 2. CÁLCULO DA TAXA DE SAQUE
CREATE OR REPLACE FUNCTION public.calculate_withdrawal_fee(amount numeric)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  tier integer;
BEGIN
  IF amount < 1000 THEN
    RETURN 2;
  END IF;
  tier := floor(amount / 1000);
  RETURN tier * 5;
END;
$$;

-- 3. TRIGGER PARA SINCRONIZAR SALDO
CREATE OR REPLACE FUNCTION public.apply_wallet_ledger_entry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET wallet_balance = wallet_balance + NEW.amount
  WHERE id = NEW.profile_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_wallet_ledger_insert ON public.wallet_ledger;
CREATE TRIGGER on_wallet_ledger_insert
  AFTER INSERT ON public.wallet_ledger
  FOR EACH ROW EXECUTE PROCEDURE public.apply_wallet_ledger_entry();

-- Permitir inserção de ledger de forma segura (normalmente via admin/functions backend)
DROP POLICY IF EXISTS "wallet_ledger_insert_public" ON public.wallet_ledger;
CREATE POLICY "wallet_ledger_insert_public"
  ON public.wallet_ledger FOR INSERT
  WITH CHECK (true); -- Permitimos por enquanto para a function supabase client side poder inserir
