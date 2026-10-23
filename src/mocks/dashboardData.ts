export interface FinancialMetric {
  title: string;
  value: number;
  change?: string;
  trend?: "up" | "down" | "neutral";
  subtitle?: string;
}

export interface ClientRevenue {
  id: string;
  name: string;
  billed: number;
  tax: number;
  net: number;
}

export interface ExpenseItem {
  id: string;
  category: string;
  amount: number;
}

export interface MonthlyHistory {
  month: string;
  revenue: number;
  net: number;
}

export const mockMetrics: Record<string, FinancialMetric> = {
  revenue: {
    title: "Faturamento",
    value: 48750.0,
    change: "+12,5% vs. mês anterior",
    trend: "up"
  },
  taxes: {
    title: "Impostos",
    value: 7312.50,
  },
  expenses: {
    title: "Despesas",
    value: 4850.0,
    change: "-2,1% vs. mês anterior",
    trend: "down"
  },
  prolabore: {
    title: "Pró-labore",
    value: 8000.0,
  },
  net: {
    title: "Saldo Líquido",
    value: 28587.50,
    change: "+8,4% vs. mês anterior",
    trend: "up"
  }
};

export const mockClients: ClientRevenue[] = [
  { id: "c1", name: "Cliente Alpha", billed: 12000, tax: 1800, net: 10200 },
  { id: "c2", name: "Cliente Beta", billed: 9500, tax: 1425, net: 8075 },
  { id: "c3", name: "Cliente Gamma", billed: 8000, tax: 1200, net: 6800 },
  { id: "c4", name: "Cliente Delta", billed: 6750, tax: 1012.50, net: 5737.50 },
];

export const mockExpenses: ExpenseItem[] = [
  { id: "e1", category: "Software", amount: 850.0 },
  { id: "e2", category: "Serviços", amount: 1200.0 },
  { id: "e3", category: "Operacional", amount: 1450.0 },
  { id: "e4", category: "Outros", amount: 1350.0 },
];

export const mockHistory: MonthlyHistory[] = [
  { month: "Abr", revenue: 41000, net: 23000 },
  { month: "Mai", revenue: 42500, net: 24500 },
  { month: "Jun", revenue: 40000, net: 22000 },
  { month: "Jul", revenue: 45000, net: 26500 },
  { month: "Ago", revenue: 43500, net: 25000 },
  { month: "Set", revenue: 48750, net: 28587.50 },
];
