-- --------------------------------------------------------
-- RPC 1: CRIAR TRANSAÇÃO (Atomicidade + Blindagem Tenant)
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION create_personal_transaction(
  p_month_id text,
  p_type text,
  p_amount numeric,
  p_category_id uuid DEFAULT NULL,
  p_category_name text DEFAULT NULL,
  p_reserve_id uuid DEFAULT NULL,
  p_provision_id uuid DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_receipt_date date DEFAULT NULL,
  p_pl_provision_ref text DEFAULT NULL
) RETURNS personal_transactions
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_user_id uuid;
  v_transaction personal_transactions;
  v_delta numeric := 0;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Acesso negado: Operação exige autenticação.';
  END IF;

  IF p_reserve_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM personal_reserves WHERE id = p_reserve_id AND user_id = v_user_id) THEN
      RAISE EXCEPTION 'A reserva informada não existe ou pertence a outro usuário.';
    END IF;
  END IF;

  IF p_provision_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM personal_provisions WHERE id = p_provision_id AND user_id = v_user_id) THEN
      RAISE EXCEPTION 'A provisão informada não existe ou pertence a outro usuário.';
    END IF;
  END IF;

  INSERT INTO personal_transactions (
    user_id, month_id, type, category_id, category_name, reserve_id, provision_id,
    description, amount, receipt_date, pl_provision_ref
  ) VALUES (
    v_user_id, p_month_id, p_type, p_category_id, p_category_name, p_reserve_id, p_provision_id,
    p_description, p_amount, p_receipt_date, p_pl_provision_ref
  )
  RETURNING * INTO v_transaction;

  IF (p_type = 'aporte' OR p_type = 'resgate') AND p_reserve_id IS NOT NULL THEN
    IF p_type = 'aporte' THEN
      v_delta := p_amount;
    ELSE
      v_delta := -p_amount;
    END IF;

    UPDATE personal_reserves
    SET current_balance = COALESCE(current_balance, 0) + v_delta
    WHERE id = p_reserve_id AND user_id = v_user_id;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Falha de concorrência: A reserva sumiu durante a operação.';
    END IF;
  END IF;

  RETURN v_transaction;
END;
$$;


-- --------------------------------------------------------
-- RPC 2: EXCLUIR TRANSAÇÃO (Estorno Seguro)
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION delete_personal_transaction(
  p_transaction_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_user_id uuid;
  v_tx personal_transactions;
  v_delta numeric := 0;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Acesso negado: Operação exige autenticação.';
  END IF;

  SELECT * INTO v_tx
  FROM personal_transactions
  WHERE id = p_transaction_id AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transação não encontrada ou permissão negada.';
  END IF;

  IF (v_tx.type = 'aporte' OR v_tx.type = 'resgate') AND v_tx.reserve_id IS NOT NULL THEN
    IF v_tx.type = 'aporte' THEN
      v_delta := -v_tx.amount;
    ELSE
      v_delta := v_tx.amount;
    END IF;

    UPDATE personal_reserves
    SET current_balance = COALESCE(current_balance, 0) + v_delta
    WHERE id = v_tx.reserve_id AND user_id = v_user_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Não foi possível realizar o estorno pois a reserva correspondente não foi encontrada (pode ter sido excluída). Operação cancelada.';
    END IF;
  END IF;

  DELETE FROM personal_transactions
  WHERE id = p_transaction_id AND user_id = v_user_id;
END;
$$;
