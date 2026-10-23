import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useFinance } from '@/contexts/FinanceContext';
import { useMonth } from '@/contexts/MonthContext';
import { useProjectionsSettings } from '@/hooks/useProjectionsSettings';
import { useBusinessProfile } from '@/contexts/BusinessProfileContext';
import { Link } from 'react-router-dom';
import {
  Target,
  TrendingUp,
  Scissors,
  Package,
  DollarSign,
  Scale,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  Zap,
  Award
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function ProjectionsVsRealizedCard() {
  const { expenses, getMonthRevenues, getMonthProlabores, getMonthProvisions, getMonthPLProvisions } = useFinance();
  const { selectedMonthId } = useMonth();
  const { settings, loaded } = useProjectionsSettings();
  const { segment, terms } = useBusinessProfile();

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

  // -------------------------------------------------------------
  // DADOS REALIZADOS NO MÊS SELECIONADO
  // -------------------------------------------------------------
  const revenues = useMemo(() => getMonthRevenues(selectedMonthId), [getMonthRevenues, selectedMonthId]);
  
  const monthExpenses = useMemo(() => {
    return [
      ...expenses.filter(e => e.monthId === selectedMonthId && e.category !== 'FP'),
      ...getMonthProlabores(selectedMonthId),
      ...getMonthProvisions(selectedMonthId),
      ...getMonthPLProvisions(selectedMonthId),
    ];
  }, [expenses, selectedMonthId, getMonthProlabores, getMonthProvisions, getMonthPLProvisions]);

  const totalRealRevenue = useMemo(() => revenues.reduce((acc, r) => acc + r.amount, 0), [revenues]);
  const totalRealExpenses = useMemo(() => monthExpenses.reduce((acc, e) => acc + e.amount, 0), [monthExpenses]);

  // Cortes e atendimentos realizados (soma das quantidades registradas)
  const totalRealCuts = useMemo(() => {
    return revenues
      .filter(r => r.itemType === 'service' || r.itemType === 'daily_batch' || !r.itemType)
      .reduce((acc, r) => acc + (r.quantity ?? 1), 0);
  }, [revenues]);

  // Produtos vendidos realizados
  const totalRealProducts = useMemo(() => {
    return revenues
      .filter(r => r.itemType === 'product')
      .reduce((acc, r) => acc + (r.quantity ?? 1), 0);
  }, [revenues]);

  // Faturamento de serviços vs produtos
  const realServiceRevenue = useMemo(() => {
    return revenues
      .filter(r => r.itemType !== 'product')
      .reduce((acc, r) => acc + r.amount, 0);
  }, [revenues]);

  // Ticket Médio Real de Cortes
  const realAvgTicket = useMemo(() => {
    if (totalRealCuts <= 0) return settings.servicePrice;
    return Math.round(realServiceRevenue / totalRealCuts);
  }, [totalRealCuts, realServiceRevenue, settings.servicePrice]);

  // -------------------------------------------------------------
  // METAS / PROJEÇÕES SALVAS DO USUÁRIO
  // -------------------------------------------------------------
  const projectedClients = useMemo(() => {
    return (settings.clientsPerDay || 8) * (settings.workDays || 20);
  }, [settings.clientsPerDay, settings.workDays]);

  const projectedServiceRevenue = useMemo(() => {
    return projectedClients * (settings.servicePrice || 50);
  }, [projectedClients, settings.servicePrice]);

  const projectedProducts = useMemo(() => {
    if (!settings.enableProducts) return 0;
    return Math.round(projectedClients * ((settings.productConversionPercent || 20) / 100));
  }, [settings.enableProducts, projectedClients, settings.productConversionPercent]);

  const projectedProductRevenue = useMemo(() => {
    return projectedProducts * (settings.productSalePrice || 45);
  }, [projectedProducts, settings.productSalePrice]);

  const projectedTotalRevenue = useMemo(() => {
    return projectedServiceRevenue + projectedProductRevenue;
  }, [projectedServiceRevenue, projectedProductRevenue]);

  const projectedFixedExpenses = settings.fixedExpenses || 4000;

  // -------------------------------------------------------------
  // PERCENTUAIS DE ATINGIMENTO DAS METAS
  // -------------------------------------------------------------
  const revenuePercent = projectedTotalRevenue > 0
    ? Math.min(100, Math.round((totalRealRevenue / projectedTotalRevenue) * 100))
    : 0;

  const clientsPercent = projectedClients > 0
    ? Math.min(100, Math.round((totalRealCuts / projectedClients) * 100))
    : 0;

  // -------------------------------------------------------------
  // ANÁLISE DE PONTO DE EQUILÍBRIO (BREAK-EVEN REALIZADO)
  // -------------------------------------------------------------
  const breakEvenTargetExpenses = Math.max(totalRealExpenses, projectedFixedExpenses);
  const isBreakEvenReached = totalRealRevenue >= breakEvenTargetExpenses && breakEvenTargetExpenses > 0;
  const breakEvenProgress = breakEvenTargetExpenses > 0
    ? Math.min(100, Math.round((totalRealRevenue / breakEvenTargetExpenses) * 100))
    : 0;

  const missingRevenueToBreakEven = Math.max(0, breakEvenTargetExpenses - totalRealRevenue);
  const missingCutsToBreakEven = realAvgTicket > 0
    ? Math.ceil(missingRevenueToBreakEven / realAvgTicket)
    : 0;

  return (
    <Card className="border-border bg-card shadow-sm overflow-hidden">
      {/* Cabeçalho do Card */}
      <CardHeader className="p-4 sm:p-5 border-b border-border/80 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base sm:text-lg font-bold text-foreground">
                Projeções vs. Realizado no Mês
              </CardTitle>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {segment === 'barbershop' ? 'Barbearia' : 'Salão / Studio'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Acompanhamento em tempo real entre as metas planejadas e as entradas efetivas de caixa.
            </p>
          </div>
        </div>

        <Button
          asChild
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10 shrink-0 self-start sm:self-auto"
        >
          <Link to="/projecoes">
            <span>Ajustar Metas</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </Button>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-5">
        {/* Grid de 4 Indicadores de Progresso */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          
          {/* Card 1: Faturamento */}
          <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 flex flex-col justify-between space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                Faturamento
              </span>
              <span className="font-bold text-emerald-400 text-xs">
                {revenuePercent}% da meta
              </span>
            </div>

            <div>
              <div className="text-lg sm:text-xl font-bold text-foreground truncate">
                {formatBRL(totalRealRevenue)}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                Meta projetada: <strong className="text-foreground">{formatBRL(projectedTotalRevenue)}</strong>
              </div>
            </div>

            <div className="w-full bg-muted/60 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${revenuePercent}%` }}
              />
            </div>
          </div>

          {/* Card 2: Clientes / Cortes */}
          <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 flex flex-col justify-between space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                <Scissors className="w-3.5 h-3.5 text-primary" />
                {segment === 'barbershop' ? 'Cortes / Clientes' : 'Atendimentos'}
              </span>
              <span className="font-bold text-primary text-xs">
                {clientsPercent}%
              </span>
            </div>

            <div>
              <div className="text-lg sm:text-xl font-bold text-foreground truncate">
                {totalRealCuts} <span className="text-xs font-normal text-muted-foreground">atendimentos</span>
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                Meta do mês: <strong className="text-foreground">{projectedClients} cortes</strong>
              </div>
            </div>

            <div className="w-full bg-muted/60 h-2 rounded-full overflow-hidden">
              <div
                className="bg-primary h-full rounded-full transition-all duration-500"
                style={{ width: `${clientsPercent}%` }}
              />
            </div>
          </div>

          {/* Card 3: Ticket Médio */}
          <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 flex flex-col justify-between space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Ticket Médio
              </span>
              <span className={cn(
                "text-[10px] font-bold px-1.5 py-0.2 rounded",
                realAvgTicket >= (settings.servicePrice || 50)
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-amber-500/20 text-amber-400"
              )}>
                {realAvgTicket >= (settings.servicePrice || 50) ? 'Na meta' : 'Abaixo da meta'}
              </span>
            </div>

            <div>
              <div className="text-lg sm:text-xl font-bold text-foreground truncate">
                {formatBRL(realAvgTicket)}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                Preço projetado: <strong className="text-foreground">{formatBRL(settings.servicePrice || 50)}</strong>
              </div>
            </div>

            <span className="text-[10px] text-muted-foreground">
              {totalRealProducts > 0 ? `+ ${totalRealProducts} produtos vendidos` : 'Nenhum produto vendido'}
            </span>
          </div>

          {/* Card 4: Despesas Reais vs Planejadas */}
          <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 flex flex-col justify-between space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-destructive" />
                Despesas & Custos
              </span>
              <span className="text-[10px] font-semibold text-muted-foreground">
                Mês atual
              </span>
            </div>

            <div>
              <div className="text-lg sm:text-xl font-bold text-destructive truncate">
                {formatBRL(totalRealExpenses)}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                Previsão fixa: <strong className="text-foreground">{formatBRL(projectedFixedExpenses)}</strong>
              </div>
            </div>

            <div className="text-[10px] text-muted-foreground truncate">
              {totalRealExpenses <= projectedFixedExpenses
                ? 'Dentro do teto de custos planejados'
                : 'Acima da previsão de custos fixos'}
            </div>
          </div>

        </div>

        {/* ========================================================= */}
        {/* BANNER INTELIGENTE: PONTO DE EQUILÍBRIO (BREAK-EVEN)      */}
        {/* ========================================================= */}
        {isBreakEvenReached ? (
          <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/15 via-emerald-500/5 to-transparent p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-emerald-400">
                    Ponto de Equilíbrio Atingido no Mês!
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    100% Coberto
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Parabéns! Suas receitas ({formatBRL(totalRealRevenue)}) já cobriram todos os custos e despesas ({formatBRL(breakEvenTargetExpenses)}) deste mês. A partir de agora, cada novo corte ou produto vendido gera lucro líquido real para sua barbearia!
                </p>
              </div>
            </div>
            <div className="text-right shrink-0 self-end sm:self-auto">
              <span className="text-xs font-semibold text-emerald-400 block">Sobra Operacional</span>
              <span className="text-lg font-bold text-foreground">{formatBRL(totalRealRevenue - breakEvenTargetExpenses)}</span>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                <Clock className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-amber-300">
                    Em Busca do Ponto de Equilíbrio
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {breakEvenProgress}% coberto
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Faltam <strong className="text-foreground">{formatBRL(missingRevenueToBreakEven)}</strong> (aproximadamente <strong className="text-amber-300">{missingCutsToBreakEven} cortes</strong> no ticket médio atual) para pagar todas as contas fixas e cruzar o ponto de equilíbrio deste mês.
                </p>
                <div className="w-full max-w-md bg-muted/60 h-2 rounded-full overflow-hidden mt-2">
                  <div
                    className="bg-amber-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${breakEvenProgress}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="text-right shrink-0 self-end sm:self-auto">
              <span className="text-[11px] font-semibold text-muted-foreground block">Custos a Cobrir</span>
              <span className="text-base font-bold text-foreground">{formatBRL(breakEvenTargetExpenses)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
