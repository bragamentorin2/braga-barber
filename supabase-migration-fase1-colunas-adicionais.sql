-- =========================================================================
-- MIGRATION: EXTENSÃO DE COLUNAS DA TABELA ESTABLISHMENTS
-- Complementa a Fase 1 adicionando os campos de gestão da mentoria
-- =========================================================================

ALTER TABLE public.establishments ADD COLUMN IF NOT EXISTS cnpj_or_cpf TEXT;
ALTER TABLE public.establishments ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.establishments ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.establishments ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'starter';
ALTER TABLE public.establishments ADD COLUMN IF NOT EXISTS monthly_fee NUMERIC DEFAULT 0;
ALTER TABLE public.establishments ADD COLUMN IF NOT EXISTS due_day INT DEFAULT 10;
ALTER TABLE public.establishments ADD COLUMN IF NOT EXISTS monthly_revenue_estimate NUMERIC DEFAULT 0;
ALTER TABLE public.establishments ADD COLUMN IF NOT EXISTS professionals_count INT DEFAULT 1;
ALTER TABLE public.establishments ADD COLUMN IF NOT EXISTS license_expires_at DATE;
ALTER TABLE public.establishments ADD COLUMN IF NOT EXISTS notes TEXT;

-- Atualizar rpc_admin_list_establishments para recarregar retorno
CREATE OR REPLACE FUNCTION public.rpc_admin_list_establishments()
RETURNS SETOF public.establishments LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.fn_is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado: operacao restrita ao Super-Admin.';
  END IF;
  RETURN QUERY SELECT * FROM public.establishments ORDER BY created_at DESC;
END;
$$;

-- Atualizar rpc_get_my_establishment para recarregar retorno
CREATE OR REPLACE FUNCTION public.rpc_get_my_establishment()
RETURNS SETOF public.establishments LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT * FROM public.establishments
    WHERE user_id = auth.uid()
    LIMIT 1;
END;
$$;
