-- =========================================================
-- 1. ADIÇÃO DA COLUNA PROVISION_ID NAS TRANSAÇÕES REAIS
-- =========================================================
ALTER TABLE personal_transactions 
ADD COLUMN IF NOT EXISTS provision_id UUID REFERENCES personal_provisions(id) ON DELETE RESTRICT;

-- Impede dois pagamentos da mesma provisão no mesmo mês
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_provision_payment 
ON personal_transactions (provision_id, month_id) 
WHERE provision_id IS NOT NULL;

-- =========================================================
-- 2. CRIAÇÃO DA TABELA DE EXCEÇÕES MENSAIS
-- =========================================================
CREATE TABLE IF NOT EXISTS personal_provision_exceptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provision_id UUID REFERENCES personal_provisions(id) ON DELETE CASCADE NOT NULL,
  month_id TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Impede mais de uma exceção por mês para a mesma provisão
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_provision_exception
ON personal_provision_exceptions (provision_id, month_id);

-- =========================================================
-- 3. SEGURANÇA E RLS
-- =========================================================
ALTER TABLE personal_provision_exceptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own personal_provision_exceptions" 
  ON personal_provision_exceptions FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own personal_provision_exceptions" 
  ON personal_provision_exceptions FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own personal_provision_exceptions" 
  ON personal_provision_exceptions FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own personal_provision_exceptions" 
  ON personal_provision_exceptions FOR DELETE 
  USING (auth.uid() = user_id);

-- =========================================================
-- 4. TRIGGERS DE INTEGRIDADE (OWNERSHIP CRUZADO)
-- =========================================================
CREATE OR REPLACE FUNCTION check_provision_ownership()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.provision_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM personal_provisions 
      WHERE id = NEW.provision_id AND user_id = NEW.user_id
    ) THEN
      RAISE EXCEPTION 'Erro de Segurança: A provisão informada não existe ou pertence a outro usuário.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_check_transaction_provision_ownership ON personal_transactions;
CREATE TRIGGER tr_check_transaction_provision_ownership
BEFORE INSERT OR UPDATE ON personal_transactions
FOR EACH ROW
EXECUTE FUNCTION check_provision_ownership();

DROP TRIGGER IF EXISTS tr_check_exception_provision_ownership ON personal_provision_exceptions;
CREATE TRIGGER tr_check_exception_provision_ownership
BEFORE INSERT OR UPDATE ON personal_provision_exceptions
FOR EACH ROW
EXECUTE FUNCTION check_provision_ownership();
