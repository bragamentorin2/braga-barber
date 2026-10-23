-- ============================================
-- ESQUEMA DO BANCO DE DADOS - Gestão Financeira
-- Execute este SQL no Supabase SQL Editor
-- Settings > SQL Editor > New Query
-- ============================================

-- Tabela de Clientes
CREATE TABLE IF NOT EXISTS clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  default_base_value NUMERIC(12,2) DEFAULT 0,
  type TEXT DEFAULT 'assessoria',        -- 'assessoria' | 'automacao' (legado)
  has_assessoria BOOLEAN DEFAULT FALSE,  -- cliente tem assessoria?
  has_automacao  BOOLEAN DEFAULT FALSE,  -- cliente tem automacao?
  has_servico    BOOLEAN DEFAULT FALSE,  -- cliente tem serviço pontual?
  service_date   TEXT,                   -- YYYY-MM do serviço pontual
  service_value  NUMERIC(12,2),          -- valor do serviço pontual
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- MIGRATION (se a tabela já existia sem essas colunas):
-- ALTER TABLE clients ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'assessoria';
-- ALTER TABLE clients ADD COLUMN IF NOT EXISTS has_assessoria BOOLEAN DEFAULT FALSE;
-- ALTER TABLE clients ADD COLUMN IF NOT EXISTS has_automacao  BOOLEAN DEFAULT FALSE;
-- ALTER TABLE clients ADD COLUMN IF NOT EXISTS has_servico    BOOLEAN DEFAULT FALSE;
-- ALTER TABLE clients ADD COLUMN IF NOT EXISTS service_date   TEXT;
-- ALTER TABLE clients ADD COLUMN IF NOT EXISTS service_value  NUMERIC(12,2);

-- Tabela de Histórico de Contratos dos Clientes
CREATE TABLE IF NOT EXISTS client_contracts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  start_month_id TEXT NOT NULL,
  is_gross BOOLEAN DEFAULT TRUE,              -- valor bruto ou líquido?
  tax_percentage NUMERIC(5,2) DEFAULT 8.9,    -- % imposto
  contract_type TEXT DEFAULT 'assessoria',    -- 'assessoria' | 'automacao'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- MIGRATION (se a tabela já existia sem essas colunas):
-- ALTER TABLE client_contracts ADD COLUMN IF NOT EXISTS is_gross       BOOLEAN DEFAULT TRUE;
-- ALTER TABLE client_contracts ADD COLUMN IF NOT EXISTS tax_percentage NUMERIC(5,2) DEFAULT 8.9;
-- ALTER TABLE client_contracts ADD COLUMN IF NOT EXISTS contract_type  TEXT DEFAULT 'assessoria';

-- Tabela de Sócios
CREATE TABLE IF NOT EXISTS partners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Histórico de Contratos dos Sócios
CREATE TABLE IF NOT EXISTS partner_contracts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  partner_id UUID REFERENCES partners(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  start_month_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- Tabela de Meses (controle de saldo inicial)
CREATE TABLE IF NOT EXISTS months (
  id TEXT PRIMARY KEY,           -- formato 'YYYY-MM', ex: '2026-08'
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  label TEXT NOT NULL,           -- ex: 'Agosto 2026'
  initial_balance NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (id, user_id)
);

-- Tabela de Receitas
CREATE TABLE IF NOT EXISTS revenues (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  month_id TEXT NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL,
  tax NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Despesas
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  month_id TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Categorias de Despesa
CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  observation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, name)
);

-- Tabela de Provisões de Despesas (por sócio / categoria)
CREATE TABLE IF NOT EXISTS expense_provisions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category TEXT,                                              -- nome legado (mantido para retrocompatibilidade)
  category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL, -- vínculo com expense_categories
  partner_id UUID REFERENCES partners(id) ON DELETE CASCADE, -- sócio vinculado
  monthly_amount NUMERIC(12,2) NOT NULL,
  start_month_id TEXT NOT NULL,    -- formato 'YYYY-MM'
  end_month_id TEXT,               -- formato 'YYYY-MM' (opcional)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- MIGRATION (se a tabela já existia sem essas colunas):
-- ALTER TABLE expense_provisions ADD COLUMN IF NOT EXISTS category_id  UUID REFERENCES expense_categories(id) ON DELETE SET NULL;
-- ALTER TABLE expense_provisions ADD COLUMN IF NOT EXISTS partner_id   UUID REFERENCES partners(id) ON DELETE CASCADE;
-- ALTER TABLE expense_provisions ADD COLUMN IF NOT EXISTS end_month_id TEXT;

-- ============================================
-- MIGRATION: Se a tabela já existe sem a coluna observation, execute:
-- ALTER TABLE expense_categories ADD COLUMN IF NOT EXISTS observation TEXT;
-- ============================================

-- Tabela de Provisoes de Participacao nos Lucros (PL)
CREATE TABLE IF NOT EXISTS pl_provisions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  partner_id UUID REFERENCES partners(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  periodicity TEXT NOT NULL CHECK (periodicity IN ('trimestral','quadrimestral','semestral','anual')),
  start_month_id TEXT NOT NULL,   -- formato 'YYYY-MM'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Row Level Security (RLS) - Segurança
-- Cada utilizador só vê os seus próprios dados
-- ============================================

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE months ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenues ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE pl_provisions ENABLE ROW LEVEL SECURITY;

-- Politicas para pl_provisions
CREATE POLICY "Users can view own pl_provisions" ON pl_provisions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own pl_provisions" ON pl_provisions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pl_provisions" ON pl_provisions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own pl_provisions" ON pl_provisions FOR DELETE USING (auth.uid() = user_id);

-- Políticas para expense_categories
CREATE POLICY "Users can view own expense_categories" ON expense_categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own expense_categories" ON expense_categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own expense_categories" ON expense_categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own expense_categories" ON expense_categories FOR DELETE USING (auth.uid() = user_id);

-- Políticas para clients
CREATE POLICY "Users can view own clients" ON clients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own clients" ON clients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own clients" ON clients FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own clients" ON clients FOR DELETE USING (auth.uid() = user_id);

-- Políticas para client_contracts
ALTER TABLE client_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own client_contracts" ON client_contracts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own client_contracts" ON client_contracts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own client_contracts" ON client_contracts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own client_contracts" ON client_contracts FOR DELETE USING (auth.uid() = user_id);

-- Políticas para partners
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own partners" ON partners FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own partners" ON partners FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own partners" ON partners FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own partners" ON partners FOR DELETE USING (auth.uid() = user_id);

-- Políticas para partner_contracts
ALTER TABLE partner_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own partner_contracts" ON partner_contracts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own partner_contracts" ON partner_contracts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own partner_contracts" ON partner_contracts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own partner_contracts" ON partner_contracts FOR DELETE USING (auth.uid() = user_id);

-- Políticas para months
CREATE POLICY "Users can view own months" ON months FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own months" ON months FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own months" ON months FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own months" ON months FOR DELETE USING (auth.uid() = user_id);

-- Políticas para revenues
CREATE POLICY "Users can view own revenues" ON revenues FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own revenues" ON revenues FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own revenues" ON revenues FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own revenues" ON revenues FOR DELETE USING (auth.uid() = user_id);

-- Políticas para expenses
CREATE POLICY "Users can view own expenses" ON expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own expenses" ON expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own expenses" ON expenses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own expenses" ON expenses FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- Tabela de Logs (Heartbeat diário do sistema)
-- Tabela global de sistema — sem user_id
-- Contém exatamente UMA linha com id_logs = 1
-- Atualizada automaticamente todo dia às 03:01 UTC (00:01 BRT)
-- pelo job pg_cron 'daily-heartbeat-job'
-- ============================================

CREATE TABLE IF NOT EXISTS logs (
  id_logs      BIGINT PRIMARY KEY DEFAULT 1,        -- ID fixo; sempre a linha 1
  data_atual   TIMESTAMPTZ NOT NULL DEFAULT NOW(),   -- Timestamp da última execução
  data_proxima TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours', -- Próxima execução prevista
  updated_at   TIMESTAMPTZ DEFAULT NOW()             -- Auditoria da última modificação
);

-- Linha inicial única (inserida uma única vez na criação)
INSERT INTO logs (id_logs, data_atual, data_proxima)
VALUES (1, NOW(), NOW() + INTERVAL '24 hours')
ON CONFLICT (id_logs) DO NOTHING;

-- RLS para logs (tabela de sistema — sem filtro por user_id)
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode ler (para diagnóstico se necessário)
CREATE POLICY "Authenticated can read logs"
  ON logs FOR SELECT
  TO authenticated
  USING (true);

-- Nenhuma policy de escrita para authenticated/anon
-- A escrita é feita exclusivamente via pg_cron (service_role)

-- ============================================
-- Heartbeat diário via pg_cron
-- ATENÇÃO: Execute em sessão separada no SQL Editor
-- Requer: CREATE EXTENSION IF NOT EXISTS pg_cron;
-- ============================================

-- Extensão pg_cron (já habilitada no Supabase)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Função de atualização diária
-- CREATE OR REPLACE FUNCTION fn_daily_heartbeat()
-- RETURNS void AS $$
-- BEGIN
--   UPDATE logs
--   SET
--     data_atual   = NOW(),
--     data_proxima = NOW() + INTERVAL '24 hours',
--     updated_at   = NOW()
--   WHERE id_logs = 1;
-- END;
-- $$ LANGUAGE plpgsql;

-- Agendamento do job: 03:01 UTC = 00:01 BRT (UTC-3)
-- SELECT cron.schedule(
--   'daily-heartbeat-job',
--   '1 3 * * *',
--   'SELECT fn_daily_heartbeat()'
-- );

-- Para verificar o job registrado:
-- SELECT * FROM cron.job WHERE jobname = 'daily-heartbeat-job';

-- Para verificar histórico de execuções:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- ============================================
-- Novidades / Release Notes (Notificações)
-- ============================================

CREATE TABLE IF NOT EXISTS release_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  module_name TEXT NOT NULL,
  summary TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela para controle de lidas por usuário
CREATE TABLE IF NOT EXISTS user_read_releases (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  release_id UUID REFERENCES release_notes(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, release_id)
);

-- Habilitar RLS
ALTER TABLE release_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_read_releases ENABLE ROW LEVEL SECURITY;

-- Políticas para release_notes (Qualquer autenticado pode ler, mas não editar)
CREATE POLICY "Authenticated users can view release_notes" 
  ON release_notes FOR SELECT 
  TO authenticated USING (true);
  
-- Políticas para user_read_releases (Usuário só vê e insere o seu)
CREATE POLICY "Users can view own read releases" 
  ON user_read_releases FOR SELECT 
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own read releases" 
  ON user_read_releases FOR INSERT 
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own read releases" 
  ON user_read_releases FOR DELETE 
  TO authenticated USING (auth.uid() = user_id);
