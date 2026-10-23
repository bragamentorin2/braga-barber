// ============================================================
// Tipos: Carteira Pessoal (Personal Wallet)
// ============================================================

export interface PersonalWalletSettings {
  id: string;
  userId: string;
  isActive: boolean;
  startMonthId: string;       // YYYY-MM
  initialBalance: number;
  savingsGoalPct: number;     // % meta de poupança (ex: 20)
}

export interface PersonalCategory {
  id: string;
  userId: string;
  name: string;
  icon: string;
  color: string;
}

export interface PersonalProvision {
  id: string;
  userId: string;
  categoryId: string | null;
  categoryName: string;
  description?: string;     // nota opcional — aparece em verde abaixo do nome
  monthlyAmount: number;
  startMonthId: string;
  endMonthId?: string | null;  // null = sem data final (exclui do banco)
}

export interface PersonalProvisionException {
  id: string;
  userId: string;
  provisionId: string;
  monthId: string;
  amount: number;
  createdAt?: string;
}

export interface PersonalReserve {
  id: string;
  userId: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  goalAmount?: number;
  currentBalance: number;
}

export type PersonalTransactionType = 'despesa' | 'aporte' | 'resgate' | 'pl_receipt';

export interface PersonalTransaction {
  id: string;
  userId: string;
  monthId: string;             // YYYY-MM
  type: PersonalTransactionType;
  categoryId?: string | null;
  categoryName?: string;
  reserveId?: string | null;
  provisionId?: string | null; // UUID da provisão quando for pagamento
  description?: string;
  amount: number;
  receiptDate?: string;        // ISO date (para pl_receipt)
  plProvisionRef?: string;     // ex: "2026-10" = mês do PL da PJ
  createdAt: string;
}

export type AllocationRuleType = 'percentage' | 'fixed';

export interface PersonalAllocationRule {
  id: string;
  userId: string;
  label: string;
  reserveId?: string | null;
  allocationType: AllocationRuleType;
  value: number;              // % ou valor fixo
  sortOrder: number;
}

// -----------------------------------------------
// Tipo composto: representa uma receita PF projetada
// (espelho das saídas de Pró-labore / Retirada PL da PJ)
// -----------------------------------------------
export interface PersonalIncome {
  id: string;                 // id da despesa da PJ (ou id virtual temp-fp-/temp-pl-)
  monthId: string;
  source: 'prolabore' | 'pl'; // tipo da receita
  partnerName: string;
  amount: number;
  isVirtual: boolean;         // true = projeção / false = lançamento real confirmado
  receiptConfirmed?: boolean; // true = usuário deu "ok recebido" (pl_receipt)
}

// -----------------------------------------------
// Tipo composto: resumo do mês na Carteira Pessoal
// -----------------------------------------------
export interface PersonalMonthSummary {
  monthId: string;
  initialBalance: number;

  // Receitas (espelhadas da PJ)
  prolaboreTotal: number;
  plTotal: number;            // PL confirmado (pl_receipt existe) — entra no saldo
  projectedPlTotal: number;   // PL lançado na PJ mas não confirmado — só projeção na UI
  totalIncome: number;

  // Despesas (provisões + gastos reais do mês)
  provisionTotal: number;
  expenseTotal: number;
  totalExpenses: number;

  // Saldos
  realBalance: number;        // saldo real em conta (sem deduzir provisões não pagas)
  projectedBalance: number;   // saldo projetado deduzindo provisões pendentes
  availableBalance: number;   // saldo real disponível em caixa/conta corrente (igual a realBalance)
  savingsTarget: number;      // quanto deveria poupar (% da receita)
  totalReserves: number;      // soma de todas as caixinhas
  netWorth: number;           // realBalance + totalReserves
}
