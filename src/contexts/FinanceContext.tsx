import { createContext, useContext } from 'react';
import { useSupabaseFinance, type ExpenseCategoryRow } from '@/hooks/useSupabaseFinance';
import type { Client, Expense, MonthData, Revenue, ClientContract, Partner, PartnerContract, ExpenseProvision, ProvisionOverride, PLProvision, PLPeriodicity } from '@/types/finance';

interface FinanceContextType {
  clients: Client[];
  clientContracts: ClientContract[];
  revenues: Revenue[];
  expenses: Expense[];
  months: MonthData[];
  partners: Partner[];
  partnerContracts: PartnerContract[];
  loading: boolean;
  addClient: (client: Omit<Client, 'id'>, contractsToCreate?: Omit<ClientContract, 'id' | 'createdAt' | 'clientId'>[]) => Promise<string | undefined>;
  updateClient: (id: string, data: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  addClientContract: (contract: Omit<ClientContract, 'id'>) => Promise<void>;
  updateClientContract: (id: string, data: Partial<ClientContract>) => Promise<void>;
  deleteClientContract: (id: string) => Promise<void>;
  addPartner: (partner: Omit<Partner, 'id'>, initialContractAmount?: number, startMonthId?: string, initialCategoryId?: string) => Promise<void>;
  updatePartner: (id: string, data: Partial<Partner>) => Promise<void>;
  deletePartner: (id: string) => Promise<void>;
  addPartnerContract: (partnerId: string, amount: number, startMonthId: string, categoryId?: string) => Promise<void>;
  updatePartnerContract: (id: string, data: Partial<PartnerContract>) => Promise<void>;
  deletePartnerContract: (id: string) => Promise<void>;
  addRevenue: (revenue: Omit<Revenue, 'id'>) => Promise<void>;
  updateRevenue: (id: string, data: Partial<Revenue>) => Promise<void>;
  deleteRevenue: (id: string) => Promise<void>;
  addExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;
  updateExpense: (id: string, data: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  getInitialBalance: (monthId: string) => number;
  updateInitialBalance: (monthId: string, balance: number) => Promise<void>;
  getActiveContract: (clientId: string, monthId: string) => ClientContract | undefined;
  getMonthRevenues: (monthId: string) => Revenue[];
  getMonthProlabores: (monthId: string) => Expense[];
  expenseCategories: ExpenseCategoryRow[];
  expenseProvisions: ExpenseProvision[];
  provisionOverrides: ProvisionOverride[];
  addExpenseProvision: (categoryId: string, categoryName: string, monthlyAmount: number, startMonthId: string, endMonthId?: string, description?: string) => Promise<void>;
  updateExpenseProvision: (id: string, updates: Partial<ExpenseProvision>) => Promise<void>;
  deleteExpenseProvision: (id: string) => Promise<void>;
  zeroProvisionForMonth: (provisionId: string, monthId: string) => Promise<void>;
  getMonthProvisions: (monthId: string) => Expense[];
  getProvisionInfo: (category: string, monthId: string) => { provision: ExpenseProvision; realTotal: number; remaining: number } | null;
  plProvisions: PLProvision[];
  addPLProvision: (partnerId: string, amount: number, periodicity: PLPeriodicity, startMonthId: string, endMonthId?: string, categoryId?: string) => Promise<void>;
  updatePLProvision: (id: string, updates: Partial<PLProvision>) => Promise<void>;
  deletePLProvision: (id: string) => Promise<void>;
  shiftPLProvision: (id: string, originalMonthId: string, newMonthId: string, newAmount: number, newDescription: string) => Promise<void>;
  getMonthPLProvisions: (monthId: string) => Expense[];
  reload: () => Promise<void>;
}

const FinanceContext = createContext<FinanceContextType | null>(null);

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const finance = useSupabaseFinance();
  return <FinanceContext.Provider value={finance}>{children}</FinanceContext.Provider>;
}

export function useFinance(): FinanceContextType {
  const context = useContext(FinanceContext);
  if (!context) throw new Error('useFinance must be used within a FinanceProvider');
  return context;
}
