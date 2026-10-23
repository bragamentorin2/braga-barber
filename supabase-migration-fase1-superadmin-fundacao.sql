-- =========================================================================
-- BRAGA MENTORING - FASE 1: FUNDACAO SEGURA DO SUPER-ADMIN
-- Migration: fase1-superadmin-fundacao
-- Executar no Supabase SQL Editor (copiar e colar o conteudo completo)
-- ATENCAO: executar em UNICA transacao no SQL Editor do Supabase
-- =========================================================================

-- =========================================================================
-- SECAO 1: TABELA admin_users
-- Fonte de autoridade do Super-Admin vinculada ao auth.users por UUID.
-- Nenhum cliente comum pode se autopromover a administrador.
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.admin_users (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'owner')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id)
);

COMMENT ON TABLE public.admin_users IS
  'Tabela de autoridade administrativa. Apenas registros aqui conferem acesso ao painel Super-Admin.';

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- O proprio admin pode ver seu registro
CREATE POLICY "admin_users: own record"
  ON public.admin_users FOR SELECT
  USING (auth.uid() = user_id);

-- Nenhum usuario pode inserir diretamente (seed via script privilegiado)
-- =========================================================================
-- SECAO 2: FUNCAO fn_is_admin (antes das tabelas que a referenciam)
-- SECURITY DEFINER com search_path fixo para evitar recursao em RLS
-- =========================================================================

CREATE OR REPLACE FUNCTION public.fn_is_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = p_user_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_is_admin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_is_admin(UUID) TO authenticated;

-- =========================================================================
-- SECAO 3: TABELA establishments
-- Clientes/estabelecimentos da consultoria.
-- NAO confundir com "clients" (clientes finais dos estabelecimentos).
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.establishments (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  owner_name TEXT NOT NULL,
  email      TEXT NOT NULL,
  phone      TEXT,
  name       TEXT NOT NULL,
  segment    TEXT NOT NULL DEFAULT 'barbershop'
               CHECK (segment IN ('barbershop', 'beauty_salon')),
  status     TEXT NOT NULL DEFAULT 'active'
               CHECK (status IN ('active', 'inactive')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.establishments IS
  'Clientes/estabelecimentos da consultoria Braga Mentoring. user_id vincula ao auth.users do responsavel.';
COMMENT ON COLUMN public.establishments.status IS
  'active = acesso liberado | inactive = acesso bloqueado';

CREATE INDEX IF NOT EXISTS idx_establishments_user_id ON public.establishments(user_id);
CREATE INDEX IF NOT EXISTS idx_establishments_email   ON public.establishments(email);
CREATE INDEX IF NOT EXISTS idx_establishments_status  ON public.establishments(status);

ALTER TABLE public.establishments ENABLE ROW LEVEL SECURITY;

-- Clientes leem apenas o proprio estabelecimento
CREATE POLICY "establishments: client reads own"
  ON public.establishments FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.fn_is_admin(auth.uid())
  );

-- Admins gerenciam todos os registros
CREATE POLICY "establishments: admin full access"
  ON public.establishments FOR ALL
  USING (public.fn_is_admin(auth.uid()))
  WITH CHECK (public.fn_is_admin(auth.uid()));

-- =========================================================================
-- SECAO 4: TRIGGER updated_at para establishments
-- =========================================================================

CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_establishments_updated_at ON public.establishments;
CREATE TRIGGER tr_establishments_updated_at
  BEFORE UPDATE ON public.establishments
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- =========================================================================
-- SECAO 5: TABELA admin_audit_logs
-- Historico de acoes administrativas. Somente admins podem ler.
-- Inserido apenas via funcoes SECURITY DEFINER.
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email        TEXT NOT NULL,
  action             TEXT NOT NULL CHECK (action IN (
    'create_establishment',
    'update_establishment',
    'activate_establishment',
    'deactivate_establishment',
    'delete_establishment',
    'create_user',
    'reset_password',
    'link_user'
  )),
  establishment_id   UUID REFERENCES public.establishments(id) ON DELETE SET NULL,
  establishment_name TEXT,
  details            JSONB DEFAULT '{}'::jsonb,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.admin_audit_logs IS
  'Historico de acoes administrativas. Sem dados sensiveis. Apenas admins podem ler.';

CREATE INDEX IF NOT EXISTS idx_audit_actor_id         ON public.admin_audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_establishment_id ON public.admin_audit_logs(establishment_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at       ON public.admin_audit_logs(created_at DESC);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs: admin read only"
  ON public.admin_audit_logs FOR SELECT
  USING (public.fn_is_admin(auth.uid()));

-- =========================================================================
-- SECAO 6: FUNCAO fn_log_admin_action
-- Registra auditoria. Chamada internamente por RPCs administrativas.
-- =========================================================================

CREATE OR REPLACE FUNCTION public.fn_log_admin_action(
  p_actor_id           UUID,
  p_actor_email        TEXT,
  p_action             TEXT,
  p_establishment_id   UUID    DEFAULT NULL,
  p_establishment_name TEXT    DEFAULT NULL,
  p_details            JSONB   DEFAULT '{}'::jsonb
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.admin_audit_logs (
    actor_id, actor_email, action,
    establishment_id, establishment_name, details
  ) VALUES (
    p_actor_id, p_actor_email, p_action,
    p_establishment_id, p_establishment_name, p_details
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_log_admin_action(UUID,TEXT,TEXT,UUID,TEXT,JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_log_admin_action(UUID,TEXT,TEXT,UUID,TEXT,JSONB) TO authenticated;

-- =========================================================================
-- SECAO 7: RPC rpc_check_is_admin
-- Usada pelo frontend para verificar se o usuario logado e administrador.
-- =========================================================================

CREATE OR REPLACE FUNCTION public.rpc_check_is_admin()
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.fn_is_admin(auth.uid());
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_check_is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_check_is_admin() TO authenticated;

-- =========================================================================
-- SECAO 8: RPC rpc_admin_list_establishments
-- Lista todos os estabelecimentos. Apenas admins.
-- =========================================================================

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

REVOKE ALL ON FUNCTION public.rpc_admin_list_establishments() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_admin_list_establishments() TO authenticated;

-- =========================================================================
-- SECAO 9: RPC rpc_admin_create_establishment
-- Cria estabelecimento com auditoria. Apenas admins.
-- =========================================================================

CREATE OR REPLACE FUNCTION public.rpc_admin_create_establishment(
  p_owner_name TEXT,
  p_email      TEXT,
  p_phone      TEXT,
  p_name       TEXT,
  p_segment    TEXT,
  p_status     TEXT DEFAULT 'active'
) RETURNS public.establishments LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id    UUID;
  v_actor_email TEXT;
  v_result      public.establishments;
BEGIN
  v_actor_id := auth.uid();
  IF NOT public.fn_is_admin(v_actor_id) THEN
    RAISE EXCEPTION 'Acesso negado: operacao restrita ao Super-Admin.';
  END IF;

  SELECT email INTO v_actor_email FROM auth.users WHERE id = v_actor_id;

  INSERT INTO public.establishments (
    owner_name, email, phone, name, segment, status, created_by
  ) VALUES (
    p_owner_name, p_email, p_phone, p_name, p_segment, p_status, v_actor_id
  ) RETURNING * INTO v_result;

  PERFORM public.fn_log_admin_action(
    v_actor_id, v_actor_email,
    'create_establishment',
    v_result.id, v_result.name,
    jsonb_build_object('email', p_email, 'segment', p_segment, 'status', p_status)
  );

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_admin_create_establishment(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_admin_create_establishment(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) TO authenticated;

-- =========================================================================
-- SECAO 10: RPC rpc_admin_update_establishment
-- Atualiza estabelecimento com auditoria. Apenas admins.
-- =========================================================================

CREATE OR REPLACE FUNCTION public.rpc_admin_update_establishment(
  p_id         UUID,
  p_owner_name TEXT DEFAULT NULL,
  p_email      TEXT DEFAULT NULL,
  p_phone      TEXT DEFAULT NULL,
  p_name       TEXT DEFAULT NULL,
  p_segment    TEXT DEFAULT NULL,
  p_status     TEXT DEFAULT NULL
) RETURNS public.establishments LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id    UUID;
  v_actor_email TEXT;
  v_old_status  TEXT;
  v_old_segment TEXT;
  v_result      public.establishments;
  v_action      TEXT := 'update_establishment';
BEGIN
  v_actor_id := auth.uid();
  IF NOT public.fn_is_admin(v_actor_id) THEN
    RAISE EXCEPTION 'Acesso negado: operacao restrita ao Super-Admin.';
  END IF;

  SELECT status, segment INTO v_old_status, v_old_segment
    FROM public.establishments WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Estabelecimento nao encontrado.';
  END IF;

  SELECT email INTO v_actor_email FROM auth.users WHERE id = v_actor_id;

  UPDATE public.establishments SET
    owner_name = COALESCE(p_owner_name, owner_name),
    email      = COALESCE(p_email,      email),
    phone      = COALESCE(p_phone,      phone),
    name       = COALESCE(p_name,       name),
    segment    = COALESCE(p_segment,    segment),
    status     = COALESCE(p_status,     status)
  WHERE id = p_id
  RETURNING * INTO v_result;

  IF p_status IS NOT NULL AND p_status <> v_old_status THEN
    v_action := CASE p_status
      WHEN 'active'   THEN 'activate_establishment'
      WHEN 'inactive' THEN 'deactivate_establishment'
      ELSE 'update_establishment'
    END;
  END IF;

  PERFORM public.fn_log_admin_action(
    v_actor_id, v_actor_email,
    v_action,
    v_result.id, v_result.name,
    jsonb_build_object(
      'old_status',  v_old_status,
      'new_status',  v_result.status,
      'old_segment', v_old_segment,
      'new_segment', v_result.segment
    )
  );

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_admin_update_establishment(UUID,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_admin_update_establishment(UUID,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) TO authenticated;

-- =========================================================================
-- SECAO 11: RPC rpc_admin_link_user_to_establishment
-- Vincula user_id a um estabelecimento. Apenas admins.
-- =========================================================================

CREATE OR REPLACE FUNCTION public.rpc_admin_link_user_to_establishment(
  p_establishment_id UUID,
  p_user_id          UUID
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id    UUID;
  v_actor_email TEXT;
  v_est_name    TEXT;
BEGIN
  v_actor_id := auth.uid();
  IF NOT public.fn_is_admin(v_actor_id) THEN
    RAISE EXCEPTION 'Acesso negado: operacao restrita ao Super-Admin.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Usuario nao encontrado no auth.users.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.establishments
    WHERE user_id = p_user_id AND id <> p_establishment_id
  ) THEN
    RAISE EXCEPTION 'Este usuario ja esta vinculado a outro estabelecimento.';
  END IF;

  SELECT name INTO v_est_name FROM public.establishments WHERE id = p_establishment_id;
  SELECT email INTO v_actor_email FROM auth.users WHERE id = v_actor_id;

  UPDATE public.establishments SET user_id = p_user_id WHERE id = p_establishment_id;

  PERFORM public.fn_log_admin_action(
    v_actor_id, v_actor_email,
    'link_user',
    p_establishment_id, v_est_name,
    jsonb_build_object('linked_user_id', p_user_id)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_admin_link_user_to_establishment(UUID,UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_admin_link_user_to_establishment(UUID,UUID) TO authenticated;

-- =========================================================================
-- SECAO 12: RPC rpc_admin_get_audit_logs
-- Lista historico administrativo. Apenas admins.
-- =========================================================================

CREATE OR REPLACE FUNCTION public.rpc_admin_get_audit_logs(p_limit INT DEFAULT 100)
RETURNS TABLE (
  id                 UUID,
  actor_email        TEXT,
  action             TEXT,
  establishment_name TEXT,
  details            JSONB,
  created_at         TIMESTAMPTZ
) LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.fn_is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado: operacao restrita ao Super-Admin.';
  END IF;

  RETURN QUERY
    SELECT al.id, al.actor_email, al.action,
           al.establishment_name, al.details, al.created_at
    FROM public.admin_audit_logs al
    ORDER BY al.created_at DESC
    LIMIT p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_admin_get_audit_logs(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_admin_get_audit_logs(INT) TO authenticated;

-- =========================================================================
-- SECAO 13: RPC rpc_get_my_establishment
-- Retorna o estabelecimento vinculado ao usuario logado (sem acesso cruzado).
-- =========================================================================

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

REVOKE ALL ON FUNCTION public.rpc_get_my_establishment() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_get_my_establishment() TO authenticated;

-- =========================================================================
-- SECAO 14: SEED - Primeiro administrador
-- braga.mentoring@gmail.com / UUID: 73956201-6ddc-467c-8665-c35323616ea4
-- =========================================================================

INSERT INTO public.admin_users (user_id, role, created_by)
VALUES (
  '73956201-6ddc-467c-8665-c35323616ea4',
  'owner',
  '73956201-6ddc-467c-8665-c35323616ea4'
)
ON CONFLICT (user_id) DO NOTHING;

-- =========================================================================
-- VERIFICACAO FINAL - executar apos a migration para confirmar
-- =========================================================================

SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('admin_users', 'establishments', 'admin_audit_logs')
ORDER BY table_name;

SELECT au.user_id, u.email, au.role, au.created_at
FROM public.admin_users au
JOIN auth.users u ON u.id = au.user_id;
