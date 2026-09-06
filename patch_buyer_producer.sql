-- Correções e adições pontuais ao schema

-- 4.1 Ligar transação ao comprador logado
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS buyer_id uuid REFERENCES public.profiles (id);

-- RLS: comprador vê as próprias compras
DROP POLICY IF EXISTS "transactions_select_own_buyer" ON public.transactions;
CREATE POLICY "transactions_select_own_buyer"
  ON public.transactions FOR SELECT
  USING (buyer_id = auth.uid());

-- 2.2 Produtor pode aprovar/rejeitar pagamentos dos próprios produtos
DROP POLICY IF EXISTS "transactions_update_producer" ON public.transactions;
CREATE POLICY "transactions_update_producer"
  ON public.transactions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = transactions.product_id
        AND products.producer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = transactions.product_id
        AND products.producer_id = auth.uid()
    )
  );
