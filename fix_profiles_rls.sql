-- Permite que os compradores (público) consigam ler os dados de pagamento dos produtores
DROP POLICY IF EXISTS "profiles_select_public_producer" ON public.profiles;
CREATE POLICY "profiles_select_public_producer"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.producer_id = profiles.id AND products.status = 'active'
    )
  );
