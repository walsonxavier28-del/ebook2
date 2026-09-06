-- ============================================================
-- Correção de Permissão para Administrador Suspender/Ativar Contas
-- Execute este script no SQL Editor do seu Supabase Dashboard.
-- ============================================================

-- 1. Garantir que a coluna is_blocked existe na tabela profiles
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

ALTER TABLE public.products ADD CONSTRAINT products_status_check 
  CHECK (status IN ('pending_review', 'active', 'rejected', 'inactive'));

-- 3. Atualizar a função is_admin() para garantir o reconhecimento dos administradores
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND (
        is_super_admin = true
        OR email IN ('walsonxavier28@gmail.com', 'kristendossantos17@gmail.com')
      )
  );
$$;

-- 4. RLS: Permitir que Administradores atualizem qualquer perfil (incluindo is_blocked)
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_blocked" ON public.profiles;

CREATE POLICY "profiles_update_admin"
  ON public.profiles FOR UPDATE
  USING (
    public.is_admin()
  )
  WITH CHECK (
    public.is_admin()
  );

-- 5. Criar Função RPC Segura para o Admin Suspender/Ativar Contas (bypassa RLS com segurança)
CREATE OR REPLACE FUNCTION public.admin_toggle_block(target_user_id uuid, block_status boolean)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_is_admin boolean;
  target_is_super_admin boolean;
BEGIN
  -- Verificar se quem está a chamar é administrador
  caller_is_admin := public.is_admin();
  IF NOT caller_is_admin THEN
    RAISE EXCEPTION 'Acesso negado: Apenas administradores podem suspender ou ativar contas.';
  END IF;

  -- Impedir suspender o próprio administrador
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Não é permitido suspender a sua própria conta de administrador.';
  END IF;

  -- Se o alvo for super_admin, apenas super_admin pode alterar
  SELECT is_super_admin INTO target_is_super_admin FROM public.profiles WHERE id = target_user_id;
  IF target_is_super_admin = true AND (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid()) != true THEN
    RAISE EXCEPTION 'Apenas um Super Administrador pode alterar o estado de outro Administrador.';
  END IF;

  -- Atualizar o perfil do utilizador
  UPDATE public.profiles
  SET is_blocked = block_status
  WHERE id = target_user_id;

  -- Se foi suspenso, desativar temporariamente os produtos ativos do produtor
  IF block_status = true THEN
    UPDATE public.products
    SET status = 'inactive'
    WHERE producer_id = target_user_id AND status = 'active';
  END IF;

  RETURN json_build_object('success', true, 'is_blocked', block_status);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_toggle_block(uuid, boolean) TO authenticated;
