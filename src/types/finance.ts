export type ExpenseCategory = "FP" | "Impostos NF" | "Adiantamento" | "Gasolina" | string;

export interface ClientContract {
  id: string;
  clientId: string;
  amount: number;
  startMonthId: string;
  isGross: boolean;
  taxPercentage: number;
}

export interface Client {
  id: string;
  name: string;
  defaultBaseValue?: number; // valor base / mensalidade
  phone?: string;            // contato / WhatsApp (opcional)
  notes?: string;            // observações gerais
}

export interface Partner {
  id: string;
  name: string;
}

export interface PartnerContract {
  id: string;
  partnerId: string;
  amount: number;
  startMonthId: string;
  categoryId?: string | null;
  inssPct?: number | null;  // % INSS sobre o bruto (ex: 7.5)
  irrfPct?: number | null;  // % IRRF sobre o bruto (ex: 15.0)
}

export interface ExpenseProvision {
  id: string;
  category: string;
  categoryId?: string | null;
  monthlyAmount: number;
  startMonthId: string;
  endMonthId?: string;
  description?: string;
}

export interface ProvisionOverride {
  id: string;
  provisionId: string;
  monthId: string;
  isZeroed: boolean;
}

export type PLPeriodicity = 'trimestral' | 'quadrimestral' | 'semestral' | 'anual';

export interface PLProvision {
  id: string;
  partnerId: string;
  amount: number;
  periodicity: PLPeriodicity;
  startMonthId: string; // 'YYYY-MM'
  endMonthId?: string;
  categoryId?: string | null;
}

export interface Revenue {
  id: string;
  monthId: string;
  clientId?: string;
  amount: number;
  tax: number;
  status?: string;
  description?: string;
  date?: string; // YYYY-MM-DD
  itemId?: string;
  itemType?: 'service' | 'product' | 'daily_batch' | 'custom';
  quantity?: number;
}

export interface Expense {
  id: string;
  monthId: string;
  category: ExpenseCategory;
  amount: number;
  description?: string;
  date?: string; // YYYY-MM-DD
}

export interface MonthData {
  id: string; // e.g. "2026-08"
  label: string; // e.g. "Agosto 2026"
  initialBalance: number;
}

export interface AppState {
  clients: Client[];
  revenues: Revenue[];
  expenses: Expense[];
  months: MonthData[];
  
  // Actions
  addClient: (client: Omit<Client, "id">) => void;
  updateClient: (id: string, data: Partial<Client>) => void;
  deleteClient: (id: string) => void;

  addRevenue: (revenue: Omit<Revenue, "id">) => void;
  updateRevenue: (id: string, data: Partial<Revenue>) => void;
  deleteRevenue: (id: string) => void;

  addExpense: (expense: Omit<Expense, "id">) => void;
  updateExpense: (id: string, data: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;

  updateMonthInitialBalance: (monthId: string, balance: number) => void;
  getInitialBalance: (monthId: string) => number;
}
