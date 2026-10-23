import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCatalogStore } from '@/store/useCatalogStore';
import { useFinance } from '@/contexts/FinanceContext';
import { useProjectionsSettings } from '@/hooks/useProjectionsSettings';
import {
  Target,
  TrendingUp,
  Scissors,
  Package,
  DollarSign,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Minus,
  Plus,
  Scale,
  CalendarCheck,
  ArrowRight,
  Sliders,
  Award,
  Zap,
  Info,
  Save,
  RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';

export function Projections() {
  const { services, products } = useCatalogStore();
  const { expenseProvisions } = useFinance();
  const {
    settings,
    setSettings,
    isDirty,
    isSaving,
    lastSavedAt,
    saveSettings,
    discardChanges,
    loaded
  } = useProjectionsSettings();

  // Aba ativa de visualização (estado puramente de navegação na UI)
  const [activeTab, setActiveTab] = useState<'current' | 'goals'>('current');

  const {
    servicePrice,
    clientsPerDay,
    workDays,
    fixedExpenses,
    enableProducts,
    productConversionPercent,
    productSalePrice,
    productCostPrice,
    targetProfit,
  } = settings;

  // Setters do simulador de metas
  const setServicePrice = (val: number) => setSettings({ servicePrice: val });
  const setClientsPerDay = (val: number) => setSettings({ clientsPerDay: val });
  const setWorkDays = (val: number) => setSettings({ workDays: val });
  const setFixedExpenses = (val: number) => setSettings({ fixedExpenses: val });
  const setEnableProducts = (val: boolean) => setSettings({ enableProducts: val });
  const setProductConversionPercent = (val: number) => setSettings({ productConversionPercent: val });
  const setProductSalePrice = (val: number) => setSettings({ productSalePrice: val });
  const setProductCostPrice = (val: number) => setSettings({ productCostPrice: val });
  const setTargetProfit = (val: number) => setSettings({ targetProfit: val });

  // Médias do Catálogo e Provisões
  const avgCatalogService = useMemo(() => {
    if (services.length === 0) return 50;
    const sum = services.reduce((acc, s) => acc + s.price, 0);
    return Math.round(sum / services.length);
  }, [services]);

  const currentProvisionsSum = useMemo(() => {
    if (!expenseProvisions || expenseProvisions.length === 0) return 6000;
    const sum = expenseProvisions.reduce((acc: number, p) => acc + Number(p.monthlyAmount || 0), 0);
    return sum > 0 ? sum : 6000;
  }, [expenseProvisions]);

  const handleApplyCatalog = () => {
    setServicePrice(avgCatalogService);
    toast.success(`Preço médio do catálogo (R$ ${avgCatalogService}) aplicado!`);
  };

  const handleApplyProvisions = () => {
    setFixedExpenses(currentProvisionsSum);
    toast.success(`Despesas fixas atualizadas com o Financeiro (R$ ${currentProvisionsSum.toLocaleString('pt-BR')})!`);
  };

  // Formatação em Reais
  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

  // -------------------------------------------------------------
  // Mecânica de Cálculos Financeiros
  // -------------------------------------------------------------
  const totalClients = useMemo(() => clientsPerDay * workDays, [clientsPerDay, workDays]);
  const serviceRevenue = useMemo(() => totalClients * servicePrice, [totalClients, servicePrice]);

  // Produtos
  const productProfitPerUnit = Math.max(0, productSalePrice - productCostPrice);
  const productsSold = useMemo(() => {
    if (!enableProducts) return 0;
    return Math.round(totalClients * (productConversionPercent / 100));
  }, [enableProducts, totalClients, productConversionPercent]);

  const productRevenue = useMemo(() => productsSold * productSalePrice, [productsSold, productSalePrice]);
  const productProfit = useMemo(() => productsSold * productProfitPerUnit, [productsSold, productProfitPerUnit]);

  // Totais Consolidados
  const grossRevenue = serviceRevenue + productRevenue;
  const netProfit = serviceRevenue + productProfit - fixedExpenses;
  const netMargin = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;
  const isProfitable = netProfit >= 0;

  // Ponto de Equilíbrio
  const avgProfitPerClient = useMemo(() => {
    const sMargin = servicePrice;
    const pMargin = enableProducts ? (productConversionPercent / 100) * productProfitPerUnit : 0;
    return sMargin + pMargin;
  }, [servicePrice, enableProducts, productConversionPercent, productProfitPerUnit]);

  const breakEvenClients = useMemo(() => {
    if (avgProfitPerClient <= 0) return 0;
    return Math.ceil(fixedExpenses / avgProfitPerClient);
  }, [fixedExpenses, avgProfitPerClient]);

  const breakEvenClientsPerDay = useMemo(() => {
    if (workDays <= 0) return '0.0';
    return (breakEvenClients / workDays).toFixed(1);
  }, [breakEvenClients, workDays]);

  const breakEvenDay = useMemo(() => {
    if (clientsPerDay <= 0) return 0;
    return Math.min(workDays, Math.ceil(breakEvenClients / clientsPerDay));
  }, [breakEvenClients, clientsPerDay, workDays]);

  // -------------------------------------------------------------
  // Cálculos da Meta Reversa (Como Chegar na Meta)
  // -------------------------------------------------------------
  const requiredTotalContribution = fixedExpenses + targetProfit;
  const profitGap = Math.max(0, targetProfit - netProfit);

  // Caminho 1: Por Volume de Clientes
  const goalClientsNeeded = useMemo(() => {
    if (avgProfitPerClient <= 0) return 0;
    return Math.ceil(requiredTotalContribution / avgProfitPerClient);
  }, [requiredTotalContribution, avgProfitPerClient]);

  const goalClientsPerDay = useMemo(() => {
    if (workDays <= 0) return '0.0';
    return (goalClientsNeeded / workDays).toFixed(1);
  }, [goalClientsNeeded, workDays]);

  const goalClientsDiff = (parseFloat(goalClientsPerDay) - clientsPerDay).toFixed(1);

  // Caminho 2: Por Preço do Corte (mantendo a mesma quantidade de clientes)
  const goalRequiredTicket = useMemo(() => {
    if (totalClients <= 0) return 0;
    const neededFromServices = requiredTotalContribution - productProfit;
    return Math.max(0, Math.ceil(neededFromServices / totalClients));
  }, [requiredTotalContribution, productProfit, totalClients]);

  const goalTicketDiff = goalRequiredTicket - servicePrice;

  // Caminho 3: Por Venda de Pomadas/Cosméticos
  const extraProductsNeeded = productProfitPerUnit > 0 ? Math.ceil(profitGap / productProfitPerUnit) : 0;
  const extraProductsPerDay = workDays > 0 ? (extraProductsNeeded / workDays).toFixed(1) : '0.0';

  return (
    <AppLayout>
      <div className="w-full flex-1 flex flex-col gap-5 pb-12 max-w-6xl mx-auto">
        {/* Cabeçalho do Módulo */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 pb-3 border-b border-border/60">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Target className="w-4 h-4" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Projeções & Metas
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Simule a capacidade de cadeira, ponto de equilíbrio e estratégias para alavancar seu lucro.
            </p>
          </div>

          {/* Alternador de Abas */}
          <div className="flex items-center gap-1.5 p-1 bg-muted/40 rounded-xl border border-border shrink-0 self-start sm:self-auto">
            <button
              onClick={() => setActiveTab('current')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'current'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              Cenário Atual & Ponto de Equilíbrio
            </button>
            <button
              onClick={() => setActiveTab('goals')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'goals'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Simulador de Metas: "Como Lucrar Mais?"
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* ABA 1: CENÁRIO ATUAL & PONTO DE EQUILÍBRIO                */}
        {/* ========================================================= */}
        {activeTab === 'current' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* COLUNA ESQUERDA: PARÂMETROS DE TRABALHO (5 COLUNAS) */}
            <div className="lg:col-span-5 space-y-4">
              
              {/* Card 1: Atendimento na Cadeira */}
              <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                    <Scissors className="w-4 h-4 text-primary" />
                    Atendimento na Cadeira
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleApplyCatalog}
                    className="h-7 text-xs text-primary hover:bg-primary/10 px-2 gap-1"
                    title="Puxar ticket médio do catálogo cadastrado"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Usar Catálogo
                  </Button>
                </div>

                {/* Preço do Corte */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-foreground">Valor Médio por Corte / Serviço</span>
                    <span className="font-bold text-sm text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                      {formatBRL(servicePrice)}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5">
                    {[40, 50, 60, 75].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setServicePrice(val)}
                        className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all border ${
                          servicePrice === val
                            ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                            : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted/60 hover:text-foreground'
                        }`}
                      >
                        R$ {val}
                      </button>
                    ))}
                  </div>

                  <div className="pt-1">
                    <input
                      type="range"
                      min="25"
                      max="150"
                      step="5"
                      value={servicePrice}
                      onChange={(e) => setServicePrice(Number(e.target.value))}
                      className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>
                </div>

                {/* Clientes por Dia */}
                <div className="space-y-2 pt-2 border-t border-border/40">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-foreground">Quantos Clientes Atendidos por Dia?</span>
                    <span className="font-bold text-sm text-primary">
                      {clientsPerDay} clientes/dia
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 shrink-0 rounded-lg"
                      onClick={() => setClientsPerDay(Math.max(1, clientsPerDay - 1))}
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </Button>
                    <input
                      type="range"
                      min="1"
                      max="22"
                      step="1"
                      value={clientsPerDay}
                      onChange={(e) => setClientsPerDay(Number(e.target.value))}
                      className="flex-1 h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 shrink-0 rounded-lg"
                      onClick={() => setClientsPerDay(Math.min(30, clientsPerDay + 1))}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Dias Trabalhados */}
                <div className="space-y-2 pt-2 border-t border-border/40">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-foreground">Dias Trabalhados no Mês</span>
                    <span className="font-bold text-xs text-foreground">{workDays} dias/mês</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: '20 dias', desc: 'Seg a Sex', val: 20 },
                      { label: '24 dias', desc: 'Seg a Sáb', val: 24 },
                      { label: '26 dias', desc: 'Folga 1x', val: 26 },
                    ].map((p) => (
                      <button
                        key={p.val}
                        type="button"
                        onClick={() => setWorkDays(p.val)}
                        className={`p-2 rounded-xl text-center transition-all border flex flex-col items-center ${
                          workDays === p.val
                            ? 'bg-primary/10 border-primary text-primary font-bold'
                            : 'bg-muted/20 border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                        }`}
                      >
                        <span className="text-xs font-bold">{p.label}</span>
                        <span className="text-[10px] opacity-70">{p.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-muted/30 border border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Capacidade total no mês:</span>
                  <span className="font-bold text-foreground">{totalClients} atendimentos</span>
                </div>
              </div>

              {/* Card 2: Custos Fixos Mensais */}
              <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                    <Scale className="w-4 h-4 text-amber-400" />
                    Custos Fixos Mensais
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleApplyProvisions}
                    className="h-7 text-xs text-amber-400 hover:bg-amber-400/10 px-2 gap-1"
                    title="Puxar soma das provisões do módulo financeiro"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Puxar Financeiro
                  </Button>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Aluguel, Luz, Água, DAS/MEI, Internet, etc.</span>
                    <span className="font-bold text-sm text-amber-400">{formatBRL(fixedExpenses)}</span>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5">
                    {[4000, 6000, 8000, 10000].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setFixedExpenses(val)}
                        className={`py-1.5 px-1.5 rounded-lg text-xs font-semibold transition-all border ${
                          fixedExpenses === val
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                            : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted/60 hover:text-foreground'
                        }`}
                      >
                        {formatBRL(val)}
                      </button>
                    ))}
                  </div>

                  <div className="pt-1">
                    <input
                      type="range"
                      min="2000"
                      max="18000"
                      step="500"
                      value={fixedExpenses}
                      onChange={(e) => setFixedExpenses(Number(e.target.value))}
                      className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Card 3: Venda de Produtos (Opcional) */}
              <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                    <Package className="w-4 h-4 text-sky-400" />
                    Venda de Produtos (Pomadas / Óleos)
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableProducts}
                      onChange={(e) => setEnableProducts(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                {!enableProducts ? (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Ative caso revenda cosméticos aos clientes para calcular a margem adicional gerada.
                  </p>
                ) : (
                  <div className="space-y-4 pt-2 border-t border-border/60">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-medium text-foreground">A cada 10 clientes, quantos compram produto?</span>
                        <span className="font-bold text-xs text-sky-400">
                          {(productConversionPercent / 10).toFixed(0)} a cada 10 ({productConversionPercent}%)
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[10, 20, 30].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => setProductConversionPercent(pct)}
                            className={`py-1 rounded-lg text-xs font-semibold border ${
                              productConversionPercent === pct
                                ? 'bg-sky-500/20 text-sky-300 border-sky-500/50'
                                : 'bg-muted/20 text-muted-foreground border-border hover:bg-muted/50'
                            }`}
                          >
                            {pct}% dos clientes
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <Label className="text-[11px] text-muted-foreground">Preço de Venda Médio</Label>
                        <div className="font-bold text-sm text-foreground mt-0.5">{formatBRL(productSalePrice)}</div>
                      </div>
                      <div>
                        <Label className="text-[11px] text-muted-foreground">Lucro Limpo p/ Unidade</Label>
                        <div className="font-bold text-sm text-emerald-400 mt-0.5">{formatBRL(productProfitPerUnit)}</div>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs text-sky-300 flex justify-between">
                      <span>Lucro extra estimado com produtos:</span>
                      <strong className="text-emerald-400">+{formatBRL(productProfit)}/mês</strong>
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* COLUNA DIREITA: BALANÇO & PONTO DE EQUILÍBRIO (7 COLUNAS) */}
            <div className="lg:col-span-7 space-y-5">
              
              {/* HERO CARD: O BALANÇO DO MÊS */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card via-card to-primary/5 border border-primary/20 p-6 shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
                  <div>
                    <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                      Faturamento Bruto Projetado
                    </span>
                    <div className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight mt-1">
                      {formatBRL(grossRevenue)}
                    </div>
                    <span className="text-xs text-muted-foreground mt-0.5 block">
                      {totalClients} cortes no mês {enableProducts && `+ ${productsSold} produtos`}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-muted/40 border border-border/80 flex flex-col sm:items-end">
                    <span className="text-xs font-semibold text-muted-foreground">Sobra Líquida no Bolso:</span>
                    <div className={`text-2xl sm:text-3xl font-extrabold mt-0.5 ${isProfitable ? 'text-emerald-400' : 'text-destructive'}`}>
                      {formatBRL(netProfit)}
                    </div>
                    <span className="text-xs font-bold text-muted-foreground mt-0.5">
                      Margem Líquida: <strong className={isProfitable ? 'text-emerald-400' : 'text-destructive'}>{netMargin.toFixed(0)}%</strong>
                    </span>
                  </div>
                </div>

                {/* Relação Visual Faturamento vs Contas */}
                <div className="pt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Custos Fixos: <strong className="text-amber-400">{formatBRL(fixedExpenses)}</strong></span>
                    <span>Lucro Real: <strong className="text-emerald-400">{formatBRL(Math.max(0, netProfit))}</strong></span>
                  </div>

                  <div className="w-full h-3 rounded-full bg-muted/60 overflow-hidden flex">
                    {grossRevenue > 0 && (
                      <>
                        <div
                          style={{ width: `${Math.min(100, (fixedExpenses / grossRevenue) * 100)}%` }}
                          className="bg-amber-500 h-full transition-all duration-300"
                          title="Despesas Fixas"
                        />
                        {netProfit > 0 && (
                          <div
                            style={{ width: `${Math.min(100, (netProfit / grossRevenue) * 100)}%` }}
                            className="bg-emerald-500 h-full transition-all duration-300"
                            title="Lucro Líquido"
                          />
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* O "DIA DA VIRADA" (PONTO DE EQUILÍBRIO) */}
              <div className="p-6 rounded-2xl bg-card border border-border/80 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-base text-foreground">
                    <CalendarCheck className="w-5 h-5 text-sky-400" />
                    O "Dia da Virada" (Ponto de Equilíbrio)
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    {breakEvenClients} cortes necessários
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-muted/30 border border-border/60 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      No <strong className="text-sky-400 font-extrabold">{breakEvenDay}º dia de trabalho</strong> você quita todas as contas do mês!
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed pl-6">
                    Até o dia {breakEvenDay}, todo atendimento serve para pagar os custos fixos ({formatBRL(fixedExpenses)}). 
                    Do dia {Math.min(workDays, breakEvenDay + 1)} até o dia {workDays}, <strong>100% do que entra é lucro limpo no seu bolso</strong>.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-center pt-1">
                  <div className="p-3.5 rounded-xl bg-card border border-border">
                    <div className="text-xl font-extrabold text-foreground">{breakEvenClientsPerDay}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">cortes/dia para empatar</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-card border border-border">
                    <div className="text-xl font-extrabold text-emerald-400">{Math.max(0, clientsPerDay - parseFloat(breakEvenClientsPerDay)).toFixed(1)}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">cortes de lucro limpo/dia</div>
                  </div>
                </div>
              </div>

              {/* CARD DE INSIGHTS DA BRAGA MENTORING */}
              <div className="p-5 rounded-2xl border border-primary/20 bg-primary/5 flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="space-y-1 text-xs leading-relaxed">
                  <strong className="text-foreground block font-bold text-sm">
                    Diagnóstico da Braga Mentoring:
                  </strong>
                  <p className="text-muted-foreground">
                    Sua operação atual gera <strong>{formatBRL(netProfit)}</strong> de lucro limpo ({netMargin.toFixed(0)}% de margem). 
                    Para descobrir como acelerar esse resultado sem necessariamente trabalhar mais horas, acesse a aba <strong>Simulador de Metas</strong> acima.
                  </p>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* ABA 2: SIMULADOR DE METAS: "COMO LUCRAR MAIS?"            */}
        {/* ========================================================= */}
        {activeTab === 'goals' && (
          <div className="space-y-6">
            
            {/* HERO DA META: DEFINA SEU OBJETIVO */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-card via-card to-primary/5 border border-primary/20 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs uppercase tracking-wider font-semibold text-primary flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5" />
                    Planejamento Financeiro & Metas
                  </span>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-foreground mt-1">
                    Quanto você quer que sobre limpo no seu bolso todo mês?
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Seu lucro líquido atual no modelo simulado é de <strong className="text-foreground">{formatBRL(netProfit)}</strong>.
                  </p>
                </div>

                {/* Seletor de Meta */}
                <div className="flex flex-col sm:items-end gap-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">Meta de Lucro Líquido:</span>
                  <div className="flex flex-wrap items-center gap-1.5 bg-muted/30 p-1.5 rounded-xl border border-border">
                    {[6000, 8000, 10000, 12000, 15000].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setTargetProfit(v)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          targetProfit === v
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {formatBRL(v)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Diagnóstico do Gap */}
              <div className="p-4 rounded-xl bg-muted/40 border border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-muted-foreground">
                    Para pagar todas as contas fixas ({formatBRL(fixedExpenses)}) e sobrar <strong>{formatBRL(targetProfit)}</strong> limpo, 
                    sua operação precisa gerar <strong>{formatBRL(requiredTotalContribution)}</strong> de margem total.
                  </span>
                </div>
                {profitGap > 0 ? (
                  <span className="px-3 py-1 rounded-full font-bold text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                    Faltam {formatBRL(profitGap)}/mês para a meta
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full font-bold text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                    🎉 Meta já atingida no cenário atual!
                  </span>
                )}
              </div>
            </div>

            {/* 3 CAMINHOS ESTRATÉGICOS (RESPONSIVOS: 1 COL MOBILE, 3 COLS DESKTOP) */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                Escolha a melhor estratégia para o momento da sua barbearia:
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Caminho 1: Volume */}
                <div className="p-5 rounded-2xl border border-border bg-card shadow-sm flex flex-col justify-between space-y-4 hover:border-primary/40 transition-all">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 uppercase tracking-wide">
                        Estratégia 1: Volume
                      </span>
                      <Scissors className="w-4 h-4 text-primary" />
                    </div>
                    <h4 className="text-base font-bold text-foreground">
                      Mais Atendimentos por Dia
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Ideal para quem tem horários vagos na cadeira (terças, quartas) e quer preencher a agenda.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-1">
                    <span className="text-xs text-muted-foreground block">Nova Meta de Agenda:</span>
                    <div className="text-2xl font-extrabold text-foreground">
                      {goalClientsPerDay} cortes/dia
                    </div>
                    <span className="text-xs font-semibold text-emerald-400 block">
                      {parseFloat(goalClientsDiff) > 0 ? `+${goalClientsDiff} clientes por dia` : 'Meta já batida no volume atual'}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-muted-foreground pt-1 border-t border-border/40">
                    <div className="flex justify-between">
                      <span>Preço mantido:</span>
                      <strong className="text-foreground">{formatBRL(servicePrice)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Total no mês:</span>
                      <strong className="text-foreground">{goalClientsNeeded} clientes</strong>
                    </div>
                  </div>
                </div>

                {/* Caminho 2: Preço & Combos */}
                <div className="p-5 rounded-2xl border border-border bg-card shadow-sm flex flex-col justify-between space-y-4 hover:border-emerald-500/40 transition-all">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wide">
                        Estratégia 2: Preço & Combos
                      </span>
                      <DollarSign className="w-4 h-4 text-emerald-400" />
                    </div>
                    <h4 className="text-base font-bold text-foreground">
                      Aumentar o Ticket Médio
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Ideal para quem já tem a agenda cheia ({clientsPerDay} clientes/dia) e não tem tempo físico para atender mais.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-1">
                    <span className="text-xs text-muted-foreground block">Novo Valor por Serviço:</span>
                    <div className="text-2xl font-extrabold text-emerald-400">
                      {formatBRL(goalRequiredTicket)}
                    </div>
                    <span className="text-xs font-semibold text-emerald-400 block">
                      {goalTicketDiff > 0 ? `+${formatBRL(goalTicketDiff)} a mais por corte` : 'Preço atual já atinge a meta'}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-muted-foreground pt-1 border-t border-border/40">
                    <div className="flex justify-between">
                      <span>Volume mantido:</span>
                      <strong className="text-foreground">{clientsPerDay} clientes/dia</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Como fazer:</span>
                      <strong className="text-foreground">Combos (Cabelo + Barba)</strong>
                    </div>
                  </div>
                </div>

                {/* Caminho 3: Venda Casada de Produtos */}
                <div className="p-5 rounded-2xl border border-border bg-card shadow-sm flex flex-col justify-between space-y-4 hover:border-sky-500/40 transition-all">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 uppercase tracking-wide">
                        Estratégia 3: Venda Casada
                      </span>
                      <Package className="w-4 h-4 text-sky-400" />
                    </div>
                    <h4 className="text-base font-bold text-foreground">
                      Pomadas & Cosméticos
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      O jeito mais inteligente de lucrar mais sem precisar passar 1 minuto a mais de pé na cadeira.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-1">
                    <span className="text-xs text-muted-foreground block">Venda Extra Necessária:</span>
                    <div className="text-2xl font-extrabold text-sky-400">
                      +{extraProductsNeeded} itens/mês
                    </div>
                    <span className="text-xs font-semibold text-sky-400 block">
                      Apenas ~{extraProductsPerDay} produtos por dia
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-muted-foreground pt-1 border-t border-border/40">
                    <div className="flex justify-between">
                      <span>Cortes mantidos:</span>
                      <strong className="text-foreground">{clientsPerDay} clientes/dia</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Lucro por item:</span>
                      <strong className="text-emerald-400">{formatBRL(productProfitPerUnit)}</strong>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* TABELA COMPARATIVA RESUMIDA */}
            <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm space-y-3">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Scale className="w-4 h-4 text-primary" />
                Resumo Comparativo dos Cenários
              </h4>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="py-2.5 px-3 font-semibold">Cenário</th>
                      <th className="py-2.5 px-3 font-semibold">Cortes / Dia</th>
                      <th className="py-2.5 px-3 font-semibold">Preço do Corte</th>
                      <th className="py-2.5 px-3 font-semibold">Produtos / Mês</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Faturamento Total</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Lucro no Bolso</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    <tr className="hover:bg-muted/20">
                      <td className="py-2.5 px-3 font-semibold text-muted-foreground">Cenário Atual</td>
                      <td className="py-2.5 px-3">{clientsPerDay} clientes</td>
                      <td className="py-2.5 px-3">{formatBRL(servicePrice)}</td>
                      <td className="py-2.5 px-3">{productsSold} itens</td>
                      <td className="py-2.5 px-3 text-right">{formatBRL(grossRevenue)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-foreground">{formatBRL(netProfit)}</td>
                    </tr>
                    <tr className="hover:bg-muted/20 bg-primary/5">
                      <td className="py-2.5 px-3 font-bold text-primary">Opção 1: Volume</td>
                      <td className="py-2.5 px-3 font-bold text-primary">{goalClientsPerDay} clientes</td>
                      <td className="py-2.5 px-3">{formatBRL(servicePrice)}</td>
                      <td className="py-2.5 px-3">{productsSold} itens</td>
                      <td className="py-2.5 px-3 text-right">{formatBRL(requiredTotalContribution)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-400">{formatBRL(targetProfit)}</td>
                    </tr>
                    <tr className="hover:bg-muted/20 bg-emerald-500/5">
                      <td className="py-2.5 px-3 font-bold text-emerald-400">Opção 2: Preço</td>
                      <td className="py-2.5 px-3">{clientsPerDay} clientes</td>
                      <td className="py-2.5 px-3 font-bold text-emerald-400">{formatBRL(goalRequiredTicket)}</td>
                      <td className="py-2.5 px-3">{productsSold} itens</td>
                      <td className="py-2.5 px-3 text-right">{formatBRL(requiredTotalContribution)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-400">{formatBRL(targetProfit)}</td>
                    </tr>
                    <tr className="hover:bg-muted/20 bg-sky-500/5">
                      <td className="py-2.5 px-3 font-bold text-sky-400">Opção 3: Produtos</td>
                      <td className="py-2.5 px-3">{clientsPerDay} clientes</td>
                      <td className="py-2.5 px-3">{formatBRL(servicePrice)}</td>
                      <td className="py-2.5 px-3 font-bold text-sky-400">+{extraProductsNeeded} itens</td>
                      <td className="py-2.5 px-3 text-right">{formatBRL(grossRevenue + (extraProductsNeeded * productSalePrice))}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-400">{formatBRL(targetProfit)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* DICA DE MENTOR DA BRAGA MENTORING */}
            <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center shrink-0 mt-0.5">
                <Award className="w-4 h-4" />
              </div>
              <div className="space-y-1 text-xs leading-relaxed">
                <strong className="text-foreground block font-bold">
                  Recomendação do Mentor:
                </strong>
                <p className="text-muted-foreground">
                  A estratégia ideal raramente é 100% em uma única opção. O melhor caminho quase sempre é <strong>híbrido</strong>: 
                  aumentar R$ 5 no corte + oferecer 1 pomada a cada 5 clientes. Assim você alcança sua meta sem sobrecarregar sua rotina física de trabalho.
                </p>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Barra Flutuante de Salvamento (Aparece quando há alterações não salvas) */}
      {isDirty && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-xl bg-card/95 backdrop-blur-xl border border-primary/30 rounded-2xl p-3 sm:p-3.5 shadow-2xl shadow-black/90 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-2.5 min-w-0 pl-1">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Sliders className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-foreground block truncate">
                Simulação com alterações não salvas
              </span>
              <span className="text-[10px] text-muted-foreground block truncate">
                Grave no banco para fixar estas metas no seu perfil
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={discardChanges}
              disabled={isSaving}
              className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Descartar</span>
            </Button>
            <Button
              size="sm"
              onClick={saveSettings}
              disabled={isSaving}
              className="h-8 text-xs font-semibold bg-primary text-primary-foreground gap-1.5 shadow-md shadow-primary/20"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span className="hidden sm:inline">Salvando...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar no Banco</span>
                </>
              )}
            </Button>
          </div>
        </div>
      )}

    </AppLayout>
  );
}
