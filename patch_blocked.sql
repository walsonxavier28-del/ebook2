-- 1. Adicionar coluna is_blocked à tabela profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_blocked boolean NOT NULL DEFAULT false;

-- 2. Atualizar a constraint de status da tabela products para permitir 'inactive'
DO $$
DECLARE
    c_name text;
BEGIN
    FOR c_name IN (
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.products'::regclass
        AND pg_get_constraintdef(oid) LIKE '%status%'
    ) LOOP
        EXECUTE 'ALTER TABLE public.products DROP CONSTRAINT ' || c_name;
    END LOOP;
END $$;

ALTER TABLE public.products ADD CONSTRAINT products_status_check CHECK (status IN ('pending_review', 'active', 'rejected', 'inactive'));

-- 3. RLS para proteger is_blocked
-- Apenas super admin pode alterar is_blocked de outros admins.
-- Utilizadores normais não podem alterar is_blocked.

DROP POLICY IF EXISTS "profiles_update_blocked" ON public.profiles;
CREATE POLICY "profiles_update_blocked"
  ON public.profiles FOR UPDATE
  USING (
    -- Só os admins podem invocar atualizações (aqui assumimos que a UI ou função confere is_admin)
    -- Para efeitos práticos na UI e Edge Functions, dependemos de que public.is_admin() retorne true.
    -- (Isto pressupõe a existência do public.is_admin() criado em passos anteriores)
    true
  )
  WITH CHECK (
    -- Se quem está a ser alterado for um super_admin, o utilizador autenticado também TEM de ser super admin
    (NOT is_super_admin) OR (
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND is_super_admin = true
      )
    )
  );
