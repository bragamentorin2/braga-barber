import React, { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useFinance } from '@/contexts/FinanceContext';
import { useMonth } from '@/contexts/MonthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AddRevenueDialog } from '@/components/finance/AddRevenueDialog';
import { EditRevenueDialog } from '@/components/finance/EditRevenueDialog';
import { AddExpenseDialog } from '@/components/finance/AddExpenseDialog';
import { EditExpenseDialog } from '@/components/finance/EditExpenseDialog';
import { EditProlaboreMonthDialog } from '@/components/finance/EditProlaboreMonthDialog';
import { SetInitialBalanceDialog } from '@/components/finance/SetInitialBalanceDialog';
import {
  Trash2,
  MoreVertical,
  Calendar,
  CalendarDays,
  Scissors,
  Package,
  Store,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Scale,
  ChevronDown,
  ChevronRight,
  Clock,
  Sparkles
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { usePrivacyStore } from '@/store/usePrivacyStore';

export function Financial() {
  const {
    clients,
    expenses,
    partners,
    getInitialBalance,
    getMonthRevenues,
    getMonthProlabores,
    getMonthProvisions,
    getMonthPLProvisions,
    deleteRevenue,
    deleteExpense,
    expenseProvisions,
    loading
  } = useFinance();

  const { selectedMonthId } = useMonth();
  const { showValues } = usePrivacyStore();

  // Alternador de Visão: Mensal ou Semanal
  const [viewMode, setViewMode] = useState<'monthly' | 'weekly'>('monthly');

  // Semana expandida na Visão Semanal (opcional)
  const [expandedWeek, setExpandedWeek] = useState<number | null>(1);

  const handleDeleteRevenue = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta receita?')) {
      await deleteRevenue(id);
      toast.success('Receita excluída com sucesso!');
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta despesa?')) {
      await deleteExpense(id);
      toast.success('Despesa excluída com sucesso!');
    }
  };

  const formatCurrency = (value: number) => {
    if (!showValues) return 'R$ •••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  // -------------------------------------------------------------
  // Cálculos do Mês Selecionado
  // -------------------------------------------------------------
  const initialBalance = getInitialBalance(selectedMonthId);
  const monthRevenues = getMonthRevenues(selectedMonthId);
  const totalRevenue = monthRevenues.reduce((acc, r) => acc + r.amount, 0);
  const totalTax = monthRevenues.reduce((acc, r) => acc + r.tax, 0);

  const monthExpenses = useMemo(() => {
    const list = [
      ...expenses.filter(e => e.monthId === selectedMonthId && e.category !== 'FP'),
      ...getMonthProlabores(selectedMonthId),
      ...getMonthProvisions(selectedMonthId),
      ...getMonthPLProvisions(selectedMonthId),
    ];

    if (totalTax > 0) {
      list.unshift({
        id: `temp-tax-auto`,
        monthId: selectedMonthId,
        category: 'Impostos NF',
        description: localStorage.getItem('cat_obs_Impostos NF') || 'Retenção Faturamento',
        amount: totalTax,
      });
    }

    return list;
  }, [expenses, selectedMonthId, totalTax, getMonthProlabores, getMonthProvisions, getMonthPLProvisions]);

  const totalExpenses = monthExpenses.reduce((acc, e) => acc + e.amount, 0);
  const netBalance = Math.round((initialBalance + totalRevenue - totalExpenses) * 100) / 100;
  const monthOperatingProfit = totalRevenue - totalExpenses;

  // -------------------------------------------------------------
  // Cálculos das Semanas (Para a Visão Semanal)
  // -------------------------------------------------------------
  const weeksData = useMemo(() => {
    const [year, month] = selectedMonthId.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();

    // Definição das semanas do mês
    const weeksDefinitions = [
      { weekNum: 1, startDay: 1, endDay: 7 },
      { weekNum: 2, startDay: 8, endDay: 14 },
      { weekNum: 3, startDay: 15, endDay: 21 },
      { weekNum: 4, startDay: 22, endDay: 28 },
    ];

    if (daysInMonth > 28) {
      weeksDefinitions.push({
        weekNum: 5,
        startDay: 29,
        endDay: daysInMonth,
      });
    }

    // Identificar dia de hoje para destacar a semana atual
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && (today.getMonth() + 1) === month;
    const currentDay = today.getDate();

    return weeksDefinitions.map((w) => {
      // Filtrar receitas da semana
      const weekRevs = monthRevenues.filter((r) => {
        if (!r.date) return w.weekNum === 1; // se não tem data, agrupa na 1ª semana
        const dayPart = parseInt(r.date.split('-')[2] || '1', 10);
        return dayPart >= w.startDay && dayPart <= w.endDay;
      });

      // Filtrar despesas da semana
      const weekExps = monthExpenses.filter((e) => {
        if (!e.date) {
          // Despesas fixas/virtuais distribuídas ou alocadas
          if (e.id.startsWith('temp-prov-') || e.id.startsWith('temp-fp-')) {
            return w.weekNum === 1;
          }
          return w.weekNum === 1;
        }
        const dayPart = parseInt(e.date.split('-')[2] || '1', 10);
        return dayPart >= w.startDay && dayPart <= w.endDay;
      });

      const revTotal = weekRevs.reduce((acc, r) => acc + r.amount, 0);
      const expTotal = weekExps.reduce((acc, e) => acc + e.amount, 0);
      const balance = revTotal - expTotal;
      const isCurrentWeek = isCurrentMonth && currentDay >= w.startDay && currentDay <= w.endDay;

      return {
        ...w,
        label: `Semana ${w.weekNum} (${String(w.startDay).padStart(2, '0')} a ${String(w.endDay).padStart(2, '0')})`,
        revenues: weekRevs,
        expenses: weekExps,
        revenueTotal: revTotal,
        expenseTotal: expTotal,
        balance,
        isCurrentWeek,
      };
    });
  }, [selectedMonthId, monthRevenues, monthExpenses]);

  // Auxiliar para ícone de receita
  const getRevenueIcon = (r: any) => {
    if (r.itemType === 'product') return <Package className="w-3.5 h-3.5 text-sky-400" />;
    if (r.itemType === 'daily_batch') return <Store className="w-3.5 h-3.5 text-amber-400" />;
    return <Scissors className="w-3.5 h-3.5 text-primary" />;
  };

  return (
    <AppLayout>
      <div className="max-w-[1400px] mx-auto space-y-6 pb-12">
        {/* Topo: Título + Alternador [ Mensal | Semanal ] */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/60">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-emerald-400" />
              Lançamentos Financeiros
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Gestão de faturamento, fechamento de caixa e controle de despesas do seu negócio.
            </p>
          </div>

          {/* Alternador de Visão */}
          <div className="flex items-center gap-1.5 p-1 bg-muted/40 rounded-xl border border-border self-start sm:self-auto">
            <button
              onClick={() => setViewMode('monthly')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                viewMode === 'monthly'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Visão Mensal
            </button>

            <button
              onClick={() => setViewMode('weekly')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                viewMode === 'weekly'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              Visão Semanal
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* RESUMO DE CARDS (KPIs)                                   */}
        {/* ========================================================= */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          <Card className="border-border bg-card flex flex-col justify-between shadow-sm">
            <CardHeader className="pb-1 p-3 sm:p-4">
              <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center justify-between gap-1">
                <span className="truncate">Saldo Inicial</span>
                <SetInitialBalanceDialog monthId={selectedMonthId} currentBalance={initialBalance} />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-lg sm:text-2xl font-bold text-foreground truncate">{formatCurrency(initialBalance)}</div>
              <span className="text-[10px] text-muted-foreground block truncate">Início do mês</span>
            </CardContent>
          </Card>

          <Card className="border-border bg-card flex flex-col justify-between shadow-sm">
            <CardHeader className="pb-1 p-3 sm:p-4">
              <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center justify-between gap-1">
                <span className="truncate">Faturamento Bruto</span>
                <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-lg sm:text-2xl font-bold text-emerald-400 truncate">{formatCurrency(totalRevenue)}</div>
              <span className="text-[10px] text-muted-foreground block truncate">{monthRevenues.length} lançamentos</span>
            </CardContent>
          </Card>

          <Card className="border-border bg-card flex flex-col justify-between shadow-sm">
            <CardHeader className="pb-1 p-3 sm:p-4">
              <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center justify-between gap-1">
                <span className="truncate">Despesas & Contas</span>
                <TrendingDown className="w-4 h-4 text-destructive shrink-0" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-lg sm:text-2xl font-bold text-destructive truncate">{formatCurrency(totalExpenses)}</div>
              <span className="text-[10px] text-muted-foreground block truncate">Saídas e deduções</span>
            </CardContent>
          </Card>

          <Card className={cn(
            "border-border flex flex-col justify-between shadow-sm transition-colors",
            netBalance >= 0 ? "bg-primary/5 border-primary/30" : "bg-destructive/5 border-destructive/30"
          )}>
            <CardHeader className="pb-1 p-3 sm:p-4">
              <CardTitle className="text-xs font-semibold text-primary flex items-center justify-between gap-1">
                <span className="truncate">Saldo em Caixa</span>
                <Scale className="w-4 h-4 text-primary shrink-0" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className={cn("text-lg sm:text-2xl font-bold truncate", netBalance >= 0 ? "text-primary" : "text-destructive")}>
                {formatCurrency(netBalance)}
              </div>
              <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                <span className="shrink-0">Op:</span>
                <span className={cn("font-bold truncate", monthOperatingProfit >= 0 ? "text-emerald-400" : "text-destructive")}>
                  {formatCurrency(monthOperatingProfit)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ========================================================= */}
        {/* ABA: VISÃO MENSAL                                         */}
        {/* ========================================================= */}
        {viewMode === 'monthly' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* TABELA DE FATURAMENTO / RECEITAS */}
            <Card className="border-border bg-card flex flex-col shadow-sm">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-5 border-b border-border">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
                    Faturamento (Receitas)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Entradas de serviços, produtos e caixas diários.
                  </CardDescription>
                </div>
                <div className="self-end sm:self-auto w-full sm:w-auto">
                  <AddRevenueDialog monthId={selectedMonthId} />
                </div>
              </CardHeader>

              <CardContent className="p-0 flex-1 flex flex-col">
                <div className="overflow-x-auto flex-1 min-h-[300px] scrollbar-thin scrollbar-thumb-primary/40 scrollbar-track-transparent">
                  <Table className="table-fixed w-full">
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="text-xs font-semibold">Identificação / Item</TableHead>
                        <TableHead className="text-xs font-semibold text-center w-[70px] px-1">Data</TableHead>
                        <TableHead className="text-xs font-semibold text-right w-[105px] px-2">Valor</TableHead>
                        <TableHead className="w-[44px] p-0 text-center"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow><TableCell colSpan={4} className="py-8"><Skeleton className="h-4 w-full" /></TableCell></TableRow>
                      ) : monthRevenues.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-12">
                            <Scissors className="w-8 h-8 opacity-30 mx-auto mb-2" />
                            Nenhum faturamento registrado neste mês. Clique em "Lançar Receita".
                          </TableCell>
                        </TableRow>
                      ) : (
                        monthRevenues.map((rev) => {
                          const client = clients.find(c => c.id === rev.clientId);
                          const title = rev.description || (client ? client.name : 'Cliente Avulso');
                          const dateDisplay = rev.date ? rev.date.split('-').reverse().slice(0, 2).join('/') : '-';

                          return (
                            <TableRow key={rev.id} className="hover:bg-muted/20">
                              <TableCell className="py-2.5 min-w-0 pr-1">
                                <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                                  <div className="w-7 h-7 rounded-lg bg-muted/40 flex items-center justify-center shrink-0">
                                    {getRevenueIcon(rev)}
                                  </div>
                                  <div className="min-w-0 flex-1 truncate">
                                    <div className="font-semibold text-xs sm:text-sm text-foreground truncate" title={title}>
                                      {title}
                                    </div>
                                    {client && rev.description && (
                                      <span className="text-[10px] text-muted-foreground block truncate">
                                        Cliente: {client.name}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </TableCell>

                              <TableCell className="text-center text-xs text-muted-foreground px-1 w-[70px]">
                                {dateDisplay}
                              </TableCell>

                              <TableCell className="text-right text-xs sm:text-sm font-bold text-emerald-400 px-2 w-[105px]">
                                {formatCurrency(rev.amount)}
                              </TableCell>

                              <TableCell className="text-center p-0 w-[44px]">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-foreground/80 hover:text-foreground hover:bg-muted inline-flex items-center justify-center">
                                      <MoreVertical className="h-3.5 w-3.5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-auto p-1.5">
                                    <div className="flex items-center gap-1">
                                      <EditRevenueDialog revenue={rev} />
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                        onClick={() => handleDeleteRevenue(rev.id)}
                                        title="Excluir receita"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* TABELA DE DESPESAS & DEDUÇÕES */}
            <Card className="border-border bg-card flex flex-col shadow-sm">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-5 border-b border-border">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-destructive shrink-0" />
                    Despesas & Deduções
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Custos fixos, insumos, produtos e pró-labore.
                  </CardDescription>
                </div>
                <div className="self-end sm:self-auto w-full sm:w-auto">
                  <AddExpenseDialog monthId={selectedMonthId} />
                </div>
              </CardHeader>

              <CardContent className="p-0 flex-1 flex flex-col">
                <div className="overflow-x-auto flex-1 min-h-[300px] scrollbar-thin scrollbar-thumb-primary/40 scrollbar-track-transparent">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="text-xs font-semibold">Categoria / Descrição</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Valor</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow><TableCell colSpan={3} className="py-8"><Skeleton className="h-4 w-full" /></TableCell></TableRow>
                      ) : monthExpenses.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground py-12">
                            <Scale className="w-8 h-8 opacity-30 mx-auto mb-2" />
                            Nenhuma despesa registrada neste mês.
                          </TableCell>
                        </TableRow>
                      ) : (
                        monthExpenses.map((exp) => (
                          <TableRow key={exp.id} className="hover:bg-muted/20">
                            <TableCell className="py-2.5">
                              <div className="flex flex-col gap-0.5">
                                <span className="font-semibold text-xs sm:text-sm text-foreground">{exp.category}</span>
                                {exp.description && (
                                  <span className="text-[10px] text-muted-foreground leading-tight truncate max-w-xs">{exp.description}</span>
                                )}
                              </div>
                            </TableCell>

                            <TableCell className="text-right text-xs sm:text-sm font-bold text-destructive">
                              {formatCurrency(exp.amount)}
                            </TableCell>

                            <TableCell className="text-right pr-3">
                              {exp.id.startsWith('temp-tax-') ? (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Auto</span>
                              ) : exp.id.startsWith('temp-fp-') ? (
                                <div className="flex items-center justify-end gap-1">
                                  <EditProlaboreMonthDialog
                                    monthId={selectedMonthId}
                                    partnerName={exp.description || ''}
                                    currentAmount={exp.amount}
                                  />
                                </div>
                              ) : exp.id.startsWith('temp-prov-') ? (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">Provisão</span>
                              ) : (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                                      <MoreVertical className="h-3.5 w-3.5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-auto p-1.5">
                                    <div className="flex items-center gap-1">
                                      <EditExpenseDialog expense={exp} />
                                      {!exp.id.startsWith('temp-pl-') && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                          onClick={() => handleDeleteExpense(exp.id)}
                                          title="Excluir"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      )}
                                    </div>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
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
        )}

        {/* ========================================================= */}
        {/* ABA: VISÃO SEMANAL (O CICLO REAL DA BARBEARIA/SALÃO)       */}
        {/* ========================================================= */}
        {viewMode === 'weekly' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-muted/30 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-primary shrink-0" />
                <span className="text-muted-foreground">
                  Acompanhe os fechamentos semanais de caixa e o fluxo financeiro de cada ciclo do mês.
                </span>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <AddExpenseDialog
                  monthId={selectedMonthId}
                  buttonVariant="outline"
                  buttonLabel="Lançar Despesa"
                  className="text-xs font-semibold"
                />
                <AddRevenueDialog
                  monthId={selectedMonthId}
                  buttonLabel="Lançar Receita"
                  className="gap-1.5 bg-primary text-primary-foreground font-semibold shadow-sm text-xs"
                />
              </div>
            </div>

            {/* LISTA DAS SEMANAS DO MÊS */}
            <div className="space-y-3">
              {weeksData.map((week) => {
                const isExpanded = expandedWeek === week.weekNum;
                const isPositive = week.balance >= 0;

                return (
                  <div
                    key={week.weekNum}
                    className={cn(
                      "rounded-2xl border transition-all overflow-hidden bg-card",
                      week.isCurrentWeek ? "border-primary/50 shadow-sm" : "border-border/80"
                    )}
                  >
                    {/* Header do Card Semanal (Clicável) */}
                    <button
                      type="button"
                      onClick={() => setExpandedWeek(isExpanded ? null : week.weekNum)}
                      className="w-full p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0",
                          week.isCurrentWeek ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground"
                        )}>
                          S{week.weekNum}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm sm:text-base text-foreground">{week.label}</span>
                            {week.isCurrentWeek && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                                Semana Atual
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground block mt-0.5">
                            {week.revenues.length} receitas • {week.expenses.length} despesas
                          </span>
                        </div>
                      </div>

                      {/* Métricas da Semana */}
                      <div className="flex items-center gap-6 sm:gap-8 self-end sm:self-auto">
                        <div className="text-right">
                          <span className="text-[10px] font-medium text-muted-foreground uppercase block">Faturamento</span>
                          <span className="text-sm font-bold text-emerald-400">{formatCurrency(week.revenueTotal)}</span>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] font-medium text-muted-foreground uppercase block">Despesas</span>
                          <span className="text-sm font-bold text-destructive">{formatCurrency(week.expenseTotal)}</span>
                        </div>

                        <div className="text-right min-w-[100px]">
                          <span className="text-[10px] font-medium text-muted-foreground uppercase block">Saldo Semanal</span>
                          <span className={cn("text-base font-extrabold", isPositive ? "text-emerald-400" : "text-destructive")}>
                            {formatCurrency(week.balance)}
                          </span>
                        </div>

                        <div className="text-muted-foreground/60 hidden sm:block">
                          {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                        </div>
                      </div>
                    </button>

                    {/* Conteúdo Expandido da Semana */}
                    {isExpanded && (
                      <div className="border-t border-border/60 bg-muted/10 p-4 sm:p-5 pt-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Receitas da Semana */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                                Receitas da Semana ({week.revenues.length})
                              </span>
                              <AddRevenueDialog
                                monthId={selectedMonthId}
                                defaultDate={`${selectedMonthId}-${String(week.startDay).padStart(2, '0')}`}
                                buttonVariant="ghost"
                                buttonSize="sm"
                                buttonLabel="+ Receita"
                                className="h-7 text-[11px] text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 px-2 font-semibold"
                              />
                            </div>

                            {week.revenues.length === 0 ? (
                              <p className="text-xs text-muted-foreground py-3 italic">
                                Nenhuma receita lançada nesta semana.
                              </p>
                            ) : (
                              <div className="divide-y divide-border/40 border border-border/60 rounded-xl bg-card overflow-hidden">
                                {week.revenues.map((r) => (
                                  <div key={r.id} className="p-3 flex items-center justify-between text-xs hover:bg-muted/20">
                                    <div className="flex items-center gap-2">
                                      {getRevenueIcon(r)}
                                      <span className="font-semibold text-foreground">{r.description || 'Cliente Avulso'}</span>
                                      {r.date && (
                                        <span className="text-[10px] text-muted-foreground">({r.date.split('-').reverse().slice(0, 2).join('/')})</span>
                                      )}
                                    </div>
                                    <span className="font-bold text-emerald-400">{formatCurrency(r.amount)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Despesas da Semana */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                <TrendingDown className="w-3.5 h-3.5 text-destructive" />
                                Despesas da Semana ({week.expenses.length})
                              </span>
                              <AddExpenseDialog
                                monthId={selectedMonthId}
                                defaultDate={`${selectedMonthId}-${String(week.startDay).padStart(2, '0')}`}
                                buttonVariant="ghost"
                                buttonSize="sm"
                                buttonLabel="+ Despesa"
                                className="h-7 text-[11px] text-destructive hover:text-destructive hover:bg-destructive/10 px-2 font-semibold"
                              />
                            </div>

                            {week.expenses.length === 0 ? (
                              <p className="text-xs text-muted-foreground py-3 italic">
                                Nenhuma despesa alocada nesta semana.
                              </p>
                            ) : (
                              <div className="divide-y divide-border/40 border border-border/60 rounded-xl bg-card overflow-hidden">
                                {week.expenses.map((e) => (
                                  <div key={e.id} className="p-3 flex items-center justify-between text-xs hover:bg-muted/20">
                                    <div>
                                      <span className="font-semibold text-foreground">{e.category}</span>
                                      {e.description && (
                                        <span className="text-[10px] text-muted-foreground block">{e.description}</span>
                                      )}
                                    </div>
                                    <span className="font-bold text-destructive">{formatCurrency(e.amount)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
