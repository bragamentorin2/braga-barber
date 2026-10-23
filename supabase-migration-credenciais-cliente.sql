-- =========================================================================
-- BRAGA MENTORING - MIGRATION: CREDENCIAIS DE CLIENTES
-- Arquivo: supabase-migration-credenciais-cliente.sql
-- Objetivo: Criar colunas de senha e RPCs para provisionar credenciais
--           de acesso para clientes da consultoria.
--
-- Pré-requisitos:
-- 1. Migration fase1-superadmin-fundacao já executada
-- 2. Migration fase1-colunas-adicionais já executada
-- =========================================================================

-- =========================================================================
-- SEÇÃO 1: COLUNAS DE CONTROLE DE SENHA NA TABELA ESTABLISHMENTS
-- =========================================================================

ALTER TABLE public.establishments 
  ADD COLUMN IF NOT EXISTS temporary_password TEXT;

ALTER TABLE public.establishments 
  ADD COLUMN IF NOT EXISTS password_status TEXT DEFAULT 'temporary'
    CHECK (password_status IN ('temporary', 'changed'));

ALTER TABLE public.establishments 
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN public.establishments.temporary_password IS
  'Senha provisória ativa atribuída pelo consultor. Limpa quando o cliente troca pela definitiva.';
COMMENT ON COLUMN public.establishments.password_status IS
  'temporary = senha provisória ativa | changed = cliente já definiu senha definitiva.';
COMMENT ON COLUMN public.establishments.must_change_password IS
  'Se TRUE, o cliente será forçado a trocar a senha no próximo login.';

-- =========================================================================
-- SEÇÃO 2: EXTENSÃO DO CONSTRAINT DE STATUS
-- =========================================================================

DO $$
BEGIN
  ALTER TABLE public.establishments DROP CONSTRAINT IF EXISTS establishments_status_check;
  
  ALTER TABLE public.establishments 
    ADD CONSTRAINT establishments_status_check 
    CHECK (status IN ('active', 'inactive', 'suspended', 'trial', 'onboarding'));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Constraint de status já existe ou não pôde ser atualizado: %', SQLERRM;
END $$;

-- =========================================================================
-- SEÇÃO 3: RPC rpc_admin_set_client_credentials
-- Cria o usuário no auth.users (se não existir) ou atualiza a senha.
-- Vincula o user_id ao establishment correspondente.
-- Apenas admins podem executar.
-- =========================================================================

CREATE OR REPLACE FUNCTION public.rpc_admin_set_client_credentials(
  p_establishment_id UUID,
  p_email            TEXT,
  p_password         TEXT,
  p_owner_name       TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id    UUID;
  v_actor_email TEXT;
  v_user_id     UUID;
  v_est_name    TEXT;
BEGIN
  v_actor_id := auth.uid();
  
  IF NOT public.fn_is_admin(v_actor_id) THEN
    RAISE EXCEPTION 'Acesso negado: operação restrita ao Super-Admin.';
  END IF;

  SELECT email INTO v_actor_email FROM auth.users WHERE id = v_actor_id;
  SELECT name INTO v_est_name FROM public.establishments WHERE id = p_establishment_id;

  -- Verifica se já existe user com este e-mail
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = LOWER(TRIM(p_email));

  IF v_user_id IS NOT NULL THEN
    -- Usuário existe: atualiza a senha e metadata
    UPDATE auth.users SET
      encrypted_password = crypt(p_password, gen_salt('bf')),
      raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) 
        || jsonb_build_object(
          'must_change_password', TRUE,
          'name', COALESCE(p_owner_name, raw_user_meta_data->>'name', '')
        ),
      updated_at = NOW()
    WHERE id = v_user_id;
  ELSE
    -- Cria novo usuário
    v_user_id := gen_random_uuid();
    
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password,
      email_confirmed_at, raw_user_meta_data,
      aud, role, created_at, updated_at,
      confirmation_token, recovery_token
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      LOWER(TRIM(p_email)),
      crypt(p_password, gen_salt('bf')),
      NOW(),
      jsonb_build_object(
        'name', COALESCE(p_owner_name, ''),
        'must_change_password', TRUE
      ),
      'authenticated',
      'authenticated',
      NOW(),
      NOW(),
      '', ''
    );

    -- Cria identidade para login via e-mail
    INSERT INTO auth.identities (
      id, user_id, provider_id, provider, identity_data, 
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      v_user_id, v_user_id, LOWER(TRIM(p_email)), 'email',
      jsonb_build_object(
        'sub', v_user_id::TEXT,
        'email', LOWER(TRIM(p_email)),
        'email_verified', TRUE
      ),
      NOW(), NOW(), NOW()
    )
    ON CONFLICT (provider, provider_id) DO UPDATE SET
      identity_data = EXCLUDED.identity_data,
      updated_at = NOW();
  END IF;

  -- Vincula user_id ao establishment
  UPDATE public.establishments SET 
    user_id = v_user_id,
    temporary_password = p_password,
    password_status = 'temporary',
    must_change_password = TRUE
  WHERE id = p_establishment_id;

  -- Auditoria
  PERFORM public.fn_log_admin_action(
    v_actor_id, v_actor_email,
    'create_user',
    p_establishment_id, v_est_name,
    jsonb_build_object('client_email', p_email, 'user_id', v_user_id)
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'user_id', v_user_id,
    'email', LOWER(TRIM(p_email))
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_admin_set_client_credentials(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_admin_set_client_credentials(UUID, TEXT, TEXT, TEXT) TO authenticated;

-- =========================================================================
-- SEÇÃO 4: RPC rpc_client_confirm_first_access_password
-- =========================================================================

CREATE OR REPLACE FUNCTION public.rpc_client_confirm_first_access_password(
  p_new_password TEXT DEFAULT NULL
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado.';
  END IF;

  UPDATE public.establishments SET
    temporary_password = NULL,
    password_status = 'changed',
    must_change_password = FALSE
  WHERE user_id = v_user_id;

  UPDATE auth.users SET
    raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) 
      || jsonb_build_object(
        'must_change_password', FALSE,
        'password_changed_at', NOW()::TEXT
      ),
    updated_at = NOW()
  WHERE id = v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_client_confirm_first_access_password(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_client_confirm_first_access_password(TEXT) TO authenticated;

-- =========================================================================
-- SEÇÃO 5: ATUALIZAR RPCs DE LISTAGEM
-- =========================================================================

CREATE OR REPLACE FUNCTION public.rpc_admin_list_establishments()
RETURNS SETOF public.establishments LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.fn_is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado: operação restrita ao Super-Admin.';
  END IF;
  RETURN QUERY SELECT * FROM public.establishments ORDER BY created_at DESC;
END;
$$;

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

-- =========================================================================
-- VERIFICAÇÃO FINAL
-- =========================================================================

SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'establishments'
  AND column_name IN ('temporary_password', 'password_status', 'must_change_password')
ORDER BY column_name;
