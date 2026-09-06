-- ============================================================
-- eBookly — Atualização P2P Checkout + Definições de Conta
-- Execute este script no Supabase SQL Editor.
-- ============================================================

-- 1. Novos campos na tabela profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mobile_money_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS payout_mkesh text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS contact_whatsapp text;

-- 2. Novo campo na tabela transactions para a foto do comprovativo
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS proof_image_url text;

-- 3. Atualizar constraint de payment_method para incluir mkesh
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_payment_method_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_payment_method_check
  CHECK (payment_method IN ('mpesa', 'emola', 'mkesh'));

-- 4. Bucket de storage para comprovativos
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "receipts_public_read" ON storage.objects;
CREATE POLICY "receipts_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'receipts');

DROP POLICY IF EXISTS "receipts_public_upload" ON storage.objects;
CREATE POLICY "receipts_public_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'receipts');

-- ============================================================
-- FIM DO SCRIPT
-- ============================================================
