-- =========================================================================
-- BRAGA MENTORING - FASE 1: MIGRATION PREPARADA (NÃO EXECUTADA REMOTAMENTE)
-- Arquivo: supabase-migration-fase1-seguranca-contas-inativas.sql
-- Objetivo: Garantir que contas com status 'inactive' em public.establishments
--           fiquem 100% bloqueadas na camada do banco (RLS), impedindo consultas
--           ou mutações diretas via Supabase REST API/GraphQL.
--
-- Pré-requisitos:
-- 1. Execução anterior da migration fase1-superadmin-fundacao (tabela establishments e fn_is_admin).
--
-- Plano de Rollback:
-- Para reverter caso necessário, basta recriar as policies padrão com apenas (auth.uid() = user_id),
-- sem a verificação de fn_is_client_active(auth.uid()), e dropar a função fn_is_client_active.
-- (Ver script de rollback no rodapé deste arquivo).
-- =========================================================================

-- 1. FUNÇÃO AUXILIAR: fn_is_client_active
-- Retorna TRUE se o usuário for Super-Admin OU se pertencer a um estabelecimento com status 'active'.
-- Retorna FALSE se o estabelecimento estiver 'inactive' ou se não houver estabelecimento ativo.
CREATE OR REPLACE FUNCTION public.fn_is_client_active(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Administradores têm permissão irrestrita
  IF public.fn_is_admin(p_user_id) THEN
    RETURN TRUE;
  END IF;

  -- Se não for admin, deve possuir estabelecimento com status 'active'
  RETURN EXISTS (
    SELECT 1 
    FROM public.establishments 
    WHERE user_id = p_user_id 
      AND status = 'active'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_is_client_active(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_is_client_active(UUID) TO authenticated;

-- =========================================================================
-- 2. ATUALIZAÇÃO DAS POLÍTICAS DE RLS NAS TABELAS FINANCEIRAS
-- =========================================================================

-- REVENUES
DROP POLICY IF EXISTS "Users can view own revenues" ON public.revenues;
DROP POLICY IF EXISTS "Users can insert own revenues" ON public.revenues;
DROP POLICY IF EXISTS "Users can update own revenues" ON public.revenues;
DROP POLICY IF EXISTS "Users can delete own revenues" ON public.revenues;

CREATE POLICY "Users can view own revenues" ON public.revenues
  FOR SELECT USING (auth.uid() = user_id AND public.fn_is_client_active(auth.uid()));

CREATE POLICY "Users can insert own revenues" ON public.revenues
  FOR INSERT WITH CHECK (auth.uid() = user_id AND public.fn_is_client_active(auth.uid()));

CREATE POLICY "Users can update own revenues" ON public.revenues
  FOR UPDATE USING (auth.uid() = user_id AND public.fn_is_client_active(auth.uid()));

CREATE POLICY "Users can delete own revenues" ON public.revenues
  FOR DELETE USING (auth.uid() = user_id AND public.fn_is_client_active(auth.uid()));

-- EXPENSES
DROP POLICY IF EXISTS "Users can view own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can insert own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can update own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can delete own expenses" ON public.expenses;

CREATE POLICY "Users can view own expenses" ON public.expenses
  FOR SELECT USING (auth.uid() = user_id AND public.fn_is_client_active(auth.uid()));

CREATE POLICY "Users can insert own expenses" ON public.expenses
  FOR INSERT WITH CHECK (auth.uid() = user_id AND public.fn_is_client_active(auth.uid()));

CREATE POLICY "Users can update own expenses" ON public.expenses
  FOR UPDATE USING (auth.uid() = user_id AND public.fn_is_client_active(auth.uid()));

CREATE POLICY "Users can delete own expenses" ON public.expenses
  FOR DELETE USING (auth.uid() = user_id AND public.fn_is_client_active(auth.uid()));

-- MONTHS
DROP POLICY IF EXISTS "Users can view own months" ON public.months;
DROP POLICY IF EXISTS "Users can insert own months" ON public.months;
DROP POLICY IF EXISTS "Users can update own months" ON public.months;
DROP POLICY IF EXISTS "Users can delete own months" ON public.months;

CREATE POLICY "Users can view own months" ON public.months
  FOR SELECT USING (auth.uid() = user_id AND public.fn_is_client_active(auth.uid()));

CREATE POLICY "Users can insert own months" ON public.months
  FOR INSERT WITH CHECK (auth.uid() = user_id AND public.fn_is_client_active(auth.uid()));

CREATE POLICY "Users can update own months" ON public.months
  FOR UPDATE USING (auth.uid() = user_id AND public.fn_is_client_active(auth.uid()));

CREATE POLICY "Users can delete own months" ON public.months
  FOR DELETE USING (auth.uid() = user_id AND public.fn_is_client_active(auth.uid()));

-- CLIENTS (Clientes dos estabelecimentos)
DROP POLICY IF EXISTS "Users can view own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can insert own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete own clients" ON public.clients;

CREATE POLICY "Users can view own clients" ON public.clients
  FOR SELECT USING (auth.uid() = user_id AND public.fn_is_client_active(auth.uid()));

CREATE POLICY "Users can insert own clients" ON public.clients
  FOR INSERT WITH CHECK (auth.uid() = user_id AND public.fn_is_client_active(auth.uid()));

CREATE POLICY "Users can update own clients" ON public.clients
  FOR UPDATE USING (auth.uid() = user_id AND public.fn_is_client_active(auth.uid()));

CREATE POLICY "Users can delete own clients" ON public.clients
  FOR DELETE USING (auth.uid() = user_id AND public.fn_is_client_active(auth.uid()));

-- CARTEIRA PESSOAL (Se tabela existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'personal_wallet_records') THEN
    EXECUTE '
      DROP POLICY IF EXISTS "wallet_records: user own" ON public.personal_wallet_records;
      CREATE POLICY "wallet_records: user own" ON public.personal_wallet_records
        FOR ALL USING (auth.uid() = user_id AND public.fn_is_client_active(auth.uid()))
        WITH CHECK (auth.uid() = user_id AND public.fn_is_client_active(auth.uid()));
    ';
  END IF;
END $$;

-- =========================================================================
-- PLANO DE ROLLBACK (Copiar e executar apenas se for necessário reverter)
-- =========================================================================
/*
DROP FUNCTION IF EXISTS public.fn_is_client_active(UUID);

CREATE POLICY "Users can view own revenues" ON public.revenues FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own revenues" ON public.revenues FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own revenues" ON public.revenues FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own revenues" ON public.revenues FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own expenses" ON public.expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own expenses" ON public.expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own expenses" ON public.expenses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own expenses" ON public.expenses FOR DELETE USING (auth.uid() = user_id);
*/
