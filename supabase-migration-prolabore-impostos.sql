-- ============================================================
-- Migration: Adicionar campos INSS e IRRF ao pró-labore
-- Executar via Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Adiciona colunas na tabela partner_contracts
ALTER TABLE partner_contracts
  ADD COLUMN IF NOT EXISTS inss_pct  numeric(5, 2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS irrf_pct  numeric(5, 2) DEFAULT NULL;

-- 2. Comentários para documentar
COMMENT ON COLUMN partner_contracts.inss_pct IS 'Percentual de INSS sobre o pró-labore bruto (ex: 7.50 = 7,5%)';
COMMENT ON COLUMN partner_contracts.irrf_pct IS 'Percentual de IRRF sobre o pró-labore bruto (ex: 15.00 = 15%)';
