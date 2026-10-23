-- =========================================================================
-- BRAGA MENTORING - MIGRAÇÃO PARA GESTÃO DE CLIENTES E SUPERADMIN
-- Adiciona suporte a estabelecimentos (tenants), licenças e segmento
-- (Execução opcional: a aplicação já conta com persistência e fallback local)
-- =========================================================================

-- 1. Coluna de segmento de negócio na tabela company_settings
ALTER TABLE IF EXISTS company_settings 
ADD COLUMN IF NOT EXISTS business_segment TEXT DEFAULT 'barbershop';

-- 2. Tabela de estabelecimentos gerenciados pelo SuperAdmin/Consultor
CREATE TABLE IF NOT EXISTS establishments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  segment TEXT NOT NULL DEFAULT 'barbershop',
  owner_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  cnpj_or_cpf TEXT,
  city TEXT,
  state TEXT DEFAULT 'SP',
  status TEXT NOT NULL DEFAULT 'active',
  plan TEXT NOT NULL DEFAULT 'mentorship_vip',
  monthly_fee NUMERIC DEFAULT 497,
  due_day INT DEFAULT 10,
  monthly_revenue_estimate NUMERIC DEFAULT 0,
  professionals_count INT DEFAULT 1,
  license_expires_at TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

-- RLS para estabelecimentos (acesso liberado a usuários autenticados)
ALTER TABLE establishments ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'establishments' AND policyname = 'Allow all authenticated users access to establishments'
  ) THEN
    CREATE POLICY "Allow all authenticated users access to establishments" 
    ON establishments FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
