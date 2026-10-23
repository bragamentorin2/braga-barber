import { AppLayout } from '@/components/layout/AppLayout';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { ClientRevenueTable } from '@/components/dashboard/ClientRevenueTable';
import { ProjectionsVsRealizedCard } from '@/components/dashboard/ProjectionsVsRealizedCard';
import { useFinance } from '@/contexts/FinanceContext';
import { useMonth } from '@/contexts/MonthContext';
import type { FinancialMetric } from '@/mocks/dashboardData';

import { Navigate } from 'react-router-dom';
import { useBusinessProfile } from '@/contexts/BusinessProfileContext';

function navigateMonth(monthId: string, delta: number): string {
  const [year, month] = monthId.split('-').map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function Dashboard() {
  const { isSuperAdmin } = useBusinessProfile();
  if (isSuperAdmin) {
    return <Navigate to="/superadmin" replace />;
  }

  const { expenses, clients, getInitialBalance, getMonthRevenues, getMonthProlabores, getMonthProvisions, getMonthPLProvisions, loading } = useFinance();
  const { selectedMonthId } = useMonth();

  const previousMonthId = navigateMonth(selectedMonthId, -1);
  const currentMonthInitialBalance = getInitialBalance(selectedMonthId);

  const currentRevenues = getMonthRevenues(selectedMonthId);
  const currentExpenses = [
    ...expenses.filter(e => e.monthId === selectedMonthId && e.category !== 'FP'),
    ...getMonthProlabores(selectedMonthId),
    ...getMonthProvisions(selectedMonthId),
    ...getMonthPLProvisions(selectedMonthId),
  ];
  const prevRevenues = getMonthRevenues(previousMonthId);

  const totalRevenue = currentRevenues.reduce((acc, r) => acc + r.amount, 0);
  const totalTax = currentRevenues.reduce((acc, r) => acc + r.tax, 0);
  const totalProLabore = currentExpenses.filter(e => e.category === 'FP').reduce((acc, e) => acc + e.amount, 0);
  const totalOtherExpenses = currentExpenses.filter(e => e.category !== 'FP').reduce((acc, e) => acc + e.amount, 0);
  const netBalance = Math.round((currentMonthInitialBalance + (totalRevenue - totalTax) - currentExpenses.reduce((acc, e) => acc + e.amount, 0)) * 100) / 100;

  const prevTotalRevenue = prevRevenues.reduce((acc, r) => acc + r.amount, 0);
  const revenueChange = prevTotalRevenue > 0 ? ((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100 : 0;

  // Consolidação de faturamento por cliente / lançamento no mês
  const clientRevenueMap = new Map<string, { id: string; name: string; billed: number; tax: number; net: number }>();
  for (const rev of currentRevenues) {
    const key = rev.clientId || rev.id || 'avulso';
    const client = rev.clientId ? clients.find(c => c.id === rev.clientId) : undefined;
    const name = rev.description || client?.name || 'Cliente Avulso / Balcão';
    const existing = clientRevenueMap.get(key);
    if (existing) {
      existing.billed += rev.amount;
      existing.tax += rev.tax;
      existing.net += rev.amount - rev.tax;
    } else {
      clientRevenueMap.set(key, {
        id: key,
        name,
        billed: rev.amount,
        tax: rev.tax,
        net: rev.amount - rev.tax,
      });
    }
  }

  const clientRevenueData = Array.from(clientRevenueMap.values());

  const dashboardMetrics: Record<string, FinancialMetric> = {
    initial: { title: "Saldo Inicial", value: currentMonthInitialBalance },
    revenue: {
      title: "Faturamento (Bruto)",
      value: totalRevenue,
      change: revenueChange !== 0 ? `${revenueChange > 0 ? '+' : ''}${revenueChange.toFixed(1)}% vs. mês anterior` : undefined,
      trend: revenueChange > 0 ? 'up' : revenueChange < 0 ? 'down' : 'neutral'
    },
    outflows: { 
      title: "Total Saídas", 
      value: totalTax + totalOtherExpenses + totalProLabore,
      subtitle: "(Impostos, Pró-labore, Despesas)"
    },
    net: { title: "Saldo Líquido", value: netBalance },
  };

  return (
    <AppLayout>
      <div className="max-w-[1400px] mx-auto space-y-6 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard metric={dashboardMetrics.initial} />
          <MetricCard metric={dashboardMetrics.revenue} />
          <MetricCard metric={dashboardMetrics.outflows} />
          <MetricCard metric={dashboardMetrics.net} featured />
        </div>

        {/* Comparativo em Tempo Real: Projeções vs. Realizado */}
        <ProjectionsVsRealizedCard />

        <div>
          <ClientRevenueTable clients={clientRevenueData} />
        </div>
      </div>
    </AppLayout>
  );
}
