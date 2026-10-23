import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { Client, Expense, MonthData, Revenue } from '../types/finance';

// Initial Mock Data based on Excel
const initialClients: Client[] = [
  { id: 'c1', name: 'Estrela Consultoria', defaultBaseValue: 4500 },
  { id: 'c2', name: 'Estrela Automação', defaultBaseValue: 1450 },
  { id: 'c3', name: 'Estrela CV', defaultBaseValue: 2000 },
  { id: 'c4', name: 'Dois irmãos', defaultBaseValue: 7500 },
  { id: 'c5', name: 'Bento Gonçalves', defaultBaseValue: 0 },
  { id: 'c6', name: 'Nova Santa Rita', defaultBaseValue: 0 },
];

const initialMonths: MonthData[] = [
  { id: '2026-08', label: 'Agosto 2026', initialBalance: -3106.52 },
  { id: '2026-09', label: 'Setembro 2026', initialBalance: -1958.19 },
  { id: '2026-10', label: 'Outubro 2026', initialBalance: -431.04 },
  { id: '2026-11', label: 'Novembro 2026', initialBalance: 1961.94 },
  { id: '2026-12', label: 'Dezembro 2026', initialBalance: 6525.12 },
];

const initialRevenues: Revenue[] = [
  // Agosto
  { id: 'r1', monthId: '2026-08', clientId: 'c1', amount: 4500, tax: 400.5 },
  { id: 'r2', monthId: '2026-08', clientId: 'c2', amount: 1450, tax: 449.5 },
  { id: 'r3', monthId: '2026-08', clientId: 'c3', amount: 2000, tax: 178 },
  { id: 'r4', monthId: '2026-08', clientId: 'c4', amount: 7500, tax: 667.5 },
  
  // Setembro
  { id: 'r5', monthId: '2026-09', clientId: 'c1', amount: 4500, tax: 400.5 },
  { id: 'r6', monthId: '2026-09', clientId: 'c2', amount: 1450, tax: 449.5 },
  { id: 'r7', monthId: '2026-09', clientId: 'c3', amount: 2000, tax: 178 },
  { id: 'r8', monthId: '2026-09', clientId: 'c4', amount: 7500, tax: 667.5 },
];

const initialExpenses: Expense[] = [
  // Agosto
  { id: 'e1', monthId: '2026-08', category: 'FP', amount: 11000 },
  { id: 'e2', monthId: '2026-08', category: 'Impostos NF', amount: 1695.5 },
  { id: 'e3', monthId: '2026-08', category: 'Adiantamento', amount: 500 },
  { id: 'e4', monthId: '2026-08', category: 'Gasolina', amount: 252.68, description: 'Gasolina 06/08' },
  { id: 'e5', monthId: '2026-08', category: 'Gasolina', amount: 283.73, description: 'Gasolina 10/08' },
  { id: 'e6', monthId: '2026-08', category: 'Gasolina', amount: 286.27, description: 'Gasolina 16/08' },
  
  // Setembro
  { id: 'e7', monthId: '2026-09', category: 'FP', amount: 11000 },
  { id: 'e8', monthId: '2026-09', category: 'Impostos NF', amount: 1695.5 },
  { id: 'e9', monthId: '2026-09', category: 'Gasolina', amount: 340.07, description: 'Gasolina 03/09' },
];

export interface AppState {
  clients: Client[];
  revenues: Revenue[];
  expenses: Expense[];
  months: MonthData[];
  
  addClient: (client: Omit<Client, 'id'>) => void;
  updateClient: (id: string, data: Partial<Client>) => void;
  deleteClient: (id: string) => void;

  addRevenue: (revenue: Omit<Revenue, 'id'>) => void;
  updateRevenue: (id: string, data: Partial<Revenue>) => void;
  deleteRevenue: (id: string) => void;

  addExpense: (expense: Omit<Expense, 'id'>) => void;
  updateExpense: (id: string, data: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;

  updateMonthInitialBalance: (monthId: string, balance: number) => void;
  getInitialBalance: (monthId: string) => number;
}

export const useFinanceStore = create<AppState>((set, get) => ({
  clients: initialClients,
  revenues: initialRevenues,
  expenses: initialExpenses,
  months: initialMonths,

  addClient: (client) => set((state) => ({
    clients: [...state.clients, { ...client, id: uuidv4() }]
  })),
  updateClient: (id, data) => set((state) => ({
    clients: state.clients.map(c => c.id === id ? { ...c, ...data } : c)
  })),
  deleteClient: (id) => set((state) => ({
    clients: state.clients.filter(c => c.id !== id),
  })),

  addRevenue: (revenue) => set((state) => ({
    revenues: [...state.revenues, { ...revenue, id: uuidv4() }]
  })),
  updateRevenue: (id, data) => set((state) => ({
    revenues: state.revenues.map(r => r.id === id ? { ...r, ...data } : r)
  })),
  deleteRevenue: (id) => set((state) => ({
    revenues: state.revenues.filter(r => r.id !== id)
  })),

  addExpense: (expense) => set((state) => ({
    expenses: [...state.expenses, { ...expense, id: uuidv4() }]
  })),
  updateExpense: (id, data) => set((state) => ({
    expenses: state.expenses.map(e => e.id === id ? { ...e, ...data } : e)
  })),
  deleteExpense: (id) => set((state) => ({
    expenses: state.expenses.filter(e => e.id !== id)
  })),

  updateMonthInitialBalance: (monthId, balance) => set((state) => ({
    months: state.months.map(m => m.id === monthId ? { ...m, initialBalance: balance } : m)
  })),

  getInitialBalance: (monthId) => {
    const state = get();
    const monthIndex = state.months.findIndex(m => m.id === monthId);
    if (monthIndex <= 0) {
      // First month or not found, return its stored initial balance
      const month = state.months.find(m => m.id === monthId);
      return month ? month.initialBalance : 0;
    }

    // For subsequent months, recursively get previous month's initial balance + its net change
    const prevMonth = state.months[monthIndex - 1];
    const prevInitial = state.getInitialBalance(prevMonth.id);
    
    const prevRevs = state.revenues.filter(r => r.monthId === prevMonth.id);
    const prevExps = state.expenses.filter(e => e.monthId === prevMonth.id);
    
    const prevTotalRev = prevRevs.reduce((acc, r) => acc + r.amount, 0);
    const prevTotalTax = prevRevs.reduce((acc, r) => acc + r.tax, 0);
    const prevTotalExp = prevExps.reduce((acc, e) => acc + e.amount, 0);

    return prevInitial + (prevTotalRev - prevTotalTax) - prevTotalExp;
  }
}));
