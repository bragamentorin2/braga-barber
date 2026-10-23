import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useFinance } from '@/contexts/FinanceContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { HistoryMonthExpensesDialog } from '@/components/history/HistoryMonthExpensesDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter, X } from 'lucide-react';

export function History() {
  const { months, expenses, getInitialBalance, getMonthRevenues, getMonthProlabores, getMonthProvisions, getMonthPLProvisions, loading } = useFinance();

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  // Generate history data for all existing months
  const historyData = months.map(m => {
    const mRevs = getMonthRevenues(m.id);
    const mExps = [
      ...expenses.filter(e => e.monthId === m.id && e.category !== 'FP'),
      ...getMonthProlabores(m.id),
      ...getMonthProvisions(m.id),
      ...getMonthPLProvisions(m.id)
    ];
    
    const initialBalance = getInitialBalance(m.id);
    const totalRevenue = mRevs.reduce((acc, r) => acc + r.amount, 0);
    const totalTax = mRevs.reduce((acc, r) => acc + r.tax, 0);
    const totalExpenses = mExps.reduce((acc, e) => acc + e.amount, 0);
    
    const netBalance = Math.round((initialBalance + (totalRevenue - totalTax) - totalExpenses) * 100) / 100;

    return {
      id: m.id,
      label: m.label,
      initialBalance,
      totalRevenue,
      totalTax,
      totalExpenses,
      netBalance,
      mExps
    };
  }).reverse(); // Most recent first

  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');

  const availableYears = useMemo(() => {
    const years = new Set(months.map(m => m.id.split('-')[0]));
    return Array.from(years).sort().reverse();
  }, [months]);

  const availableMonths = [
    { value: '01', label: 'Janeiro' }, { value: '02', label: 'Fevereiro' },
    { value: '03', label: 'Março' }, { value: '04', label: 'Abril' },
    { value: '05', label: 'Maio' }, { value: '06', label: 'Junho' },
    { value: '07', label: 'Julho' }, { value: '08', label: 'Agosto' },
    { value: '09', label: 'Setembro' }, { value: '10', label: 'Outubro' },
    { value: '11', label: 'Novembro' }, { value: '12', label: 'Dezembro' },
  ];

  const filteredHistory = useMemo(() => {
    return historyData.filter(d => {
      const [y, m] = d.id.split('-');
      if (filterYear !== 'all' && y !== filterYear) return false;
      if (filterMonth !== 'all' && m !== filterMonth) return false;
      return true;
    });
  }, [historyData, filterYear, filterMonth]);

  return (
    <AppLayout title="Histórico Consolidado">
      <div className="max-w-6xl mx-auto space-y-6 pb-8">

        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
            <CardTitle>Resumo Mensal</CardTitle>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-muted/30 px-2 py-1 rounded-lg border border-border">
                <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground pr-1">
                  <Filter className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline whitespace-nowrap">Filtros:</span>
                </div>
                <Select value={filterYear} onValueChange={setFilterYear}>
                  <SelectTrigger className="w-[120px] h-8 text-xs bg-background border-none shadow-sm">
                    <SelectValue placeholder="Qualquer Ano" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Qualquer Ano</SelectItem>
                    {availableYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="w-px h-4 bg-border shrink-0" />
                <Select value={filterMonth} onValueChange={setFilterMonth}>
                  <SelectTrigger className="w-[130px] h-8 text-xs bg-background border-none shadow-sm">
                    <SelectValue placeholder="Qualquer Mês" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Qualquer Mês</SelectItem>
                    {availableMonths.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                {(filterYear !== 'all' || filterMonth !== 'all') && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 ml-0.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                    onClick={() => { setFilterYear('all'); setFilterMonth('all'); }}
                    title="Limpar filtros"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-border">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Mês</TableHead>
                    <TableHead className="text-right hidden md:table-cell">Saldo Inicial</TableHead>
                    <TableHead className="text-right hidden md:table-cell">Faturamento</TableHead>
                    <TableHead className="text-right hidden md:table-cell">Impostos</TableHead>
                    <TableHead className="text-right hidden md:table-cell">Despesas</TableHead>
                    <TableHead className="text-right">Saldo Final</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                        <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                        <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                        <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                        Nenhum dado histórico encontrado para os filtros selecionados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredHistory.map((data) => (
                      <TableRow key={data.id}>
                        <TableCell className="font-medium">{data.label}</TableCell>
                        <TableCell className="text-right hidden md:table-cell">{formatCurrency(data.initialBalance)}</TableCell>
                        <TableCell className="text-right text-emerald-500 hidden md:table-cell">{formatCurrency(data.totalRevenue)}</TableCell>
                        <TableCell className="text-right text-red-400 hidden md:table-cell">{formatCurrency(data.totalTax)}</TableCell>
                        <TableCell className="text-right hidden md:table-cell">
                          <HistoryMonthExpensesDialog 
                            monthLabel={data.label} 
                            expenses={data.mExps} 
                            totalValue={data.totalExpenses} 
                          />
                        </TableCell>
                        <TableCell className={cn(
                          "text-right font-bold",
                          data.netBalance >= 0 ? "text-primary" : "text-destructive"
                        )}>
                          {formatCurrency(data.netBalance)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
