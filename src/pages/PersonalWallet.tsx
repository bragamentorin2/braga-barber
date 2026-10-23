// ============================================================
// Página: Carteira Pessoal
// ============================================================
import { useState, useMemo, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useFinance } from '@/contexts/FinanceContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePersonalWallet } from '@/hooks/usePersonalWallet';
import { useMonth } from '@/contexts/MonthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Wallet, TrendingUp, TrendingDown, PiggyBank, ArrowDownLeft,
  ArrowUpRight, Plus, CheckCircle2, Clock, Banknote, ChevronRight,
  BarChart3, Settings, Undo2, ChevronDown, ChevronUp
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PersonalReservesPanel } from '@/components/wallet/PersonalReservesPanel';
import { PersonalExpensesPanel } from '@/components/wallet/PersonalExpensesPanel';
import { PersonalEvolutionChart } from '@/components/wallet/PersonalEvolutionChart';
import { PLReceiptDialog } from '@/components/wallet/PLReceiptDialog';
import { toast } from 'sonner';

import { usePrivacyStore } from '@/store/usePrivacyStore';

export function PersonalWallet() {
  const { user } = useAuth();
  const { partners, partnerContracts, getMonthProlabores, getMonthProvisions, getMonthPLProvisions, expenses, loading: finLoading } = useFinance();
  const { selectedMonthId } = useMonth();
  const wallet = usePersonalWallet();
  const { showValues } = usePrivacyStore();
  const fmt = useCallback((v: number) => {
    if (!showValues) return 'R$ •••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  }, [showValues]);
  
  const [plDialogOpen, setPlDialogOpen] = useState(false);
  const [selectedPLIncome, setSelectedPLIncome] = useState<any>(null);
  const [incomesListOpen, setIncomesListOpen] = useState(() => localStorage.getItem('wallet_incomes_open') !== 'false'); // aberto por padrao
  const toggleIncomesList = () => {
    setIncomesListOpen(prev => {
      const next = !prev;
      localStorage.setItem('wallet_incomes_open', String(next));
      return next;
    });
  };

  // Descobre o nome do sócio logado (pelo e-mail vs lista de sócios - heurística: pega o primeiro partner do user)
  // Como user_id já isola os dados, o parceiro do usuário logado é o único que aparece nas despesas dele.
  const myPartner = partners[0]; // O hook já filtra por user_id — apenas os parceiros do usuário logado
  const myPartnerName = myPartner?.name || '';
  // Contratos do socio logado - necessario para calcular o pro-labore liquido na carteira pessoal
  const myPartnerContracts = myPartner
    ? partnerContracts.filter(c => c.partnerId === myPartner.id)
    : [];

  // Constrói o array de despesas da PJ de um mês específico (incluindo provisões da empresa)
  const getPjExpensesForMonth = useCallback((mId: string) => [
    ...expenses.filter(e => e.monthId === mId && e.category !== 'FP'),
    ...getMonthProlabores(mId),
    ...getMonthProvisions(mId),
    ...getMonthPLProvisions(mId),
  ], [expenses, getMonthProlabores, getMonthProvisions, getMonthPLProvisions]);

  const summary = useMemo(() =>
    wallet.getMonthSummary(selectedMonthId, getPjExpensesForMonth, myPartnerName, myPartnerContracts),
    [selectedMonthId, getPjExpensesForMonth, myPartnerName, myPartnerContracts, wallet.transactions, wallet.provisions, wallet.reserves, wallet.settings]
  );

  const incomes = useMemo(() =>
    wallet.getPersonalIncomes(selectedMonthId, getPjExpensesForMonth(selectedMonthId), myPartnerName, myPartnerContracts),
    [selectedMonthId, getPjExpensesForMonth, myPartnerName, wallet.transactions]
  );

  const plIncomes = incomes.filter(i => i.source === 'pl');
  const prolaboreIncomes = incomes.filter(i => i.source === 'prolabore');

  if (!wallet.settings?.isActive) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto flex flex-col items-center justify-center gap-6 py-24 text-center">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Wallet className="w-10 h-10 text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Carteira Pessoal</h2>
            <p className="text-muted-foreground max-w-md">
              Sua carteira pessoal ainda não está ativa. Ative-a em <strong>Definições &gt; Perfil &amp; Conta</strong> para começar a acompanhar seu patrimônio pessoal.
            </p>
          </div>
          <Link to="/settings?tab=wallet">
            <Button className="gap-2">
              <Settings className="w-4 h-4" /> Ativar Carteira Pessoal
            </Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  const isLoading = finLoading || wallet.loading;

  return (
    <AppLayout>
      <div className="max-w-[1400px] mx-auto space-y-6 pb-8">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Minha Carteira</h2>
              {myPartnerName && <p className="text-xs text-muted-foreground">{myPartnerName}</p>}
            </div>
          </div>
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Saldo Inicial */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Saldo Inicial</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-7 w-28" /> : (
                <div className="text-xl font-bold">{fmt(summary.initialBalance)}</div>
              )}
            </CardContent>
          </Card>

          {/* Receitas (PJ → PF) */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> Entradas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-7 w-28" /> : (
                <div className="space-y-0.5">
                  {/* Valor confirmado (PL recebido + pró-labore) */}
                  <div className="text-xl font-bold text-emerald-500">{fmt(summary.totalIncome)}</div>
                  <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-1.5 gap-y-0.5">
                    {summary.plTotal > 0 && (
                      <span className="whitespace-nowrap">PL: {fmt(summary.plTotal)}</span>
                    )}
                    {summary.plTotal > 0 && summary.prolaboreTotal > 0 && (
                      <span className="text-muted-foreground/40">·</span>
                    )}
                    {summary.prolaboreTotal > 0 && (
                      <span className="whitespace-nowrap">Pró-labore: {fmt(summary.prolaboreTotal)}</span>
                    )}
                  </div>
                  {/* PL projetado (lançado na PJ mas ainda não confirmado) */}
                  {summary.projectedPlTotal > 0 && (
                    <div className="text-[11px] text-amber-400/70 flex items-center gap-1 mt-0.5">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400/50" />
                      PL aguardando: {fmt(summary.projectedPlTotal)}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Despesas */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <TrendingDown className="w-3.5 h-3.5 text-red-500" /> Despesas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-7 w-28" /> : (
                <div className="space-y-0.5">
                  <div className="text-xl font-bold text-red-500">{fmt(summary.totalExpenses)}</div>
                  {summary.savingsTarget > 0 && (
                    <div className="text-[11px] text-muted-foreground">
                      Meta poupar: {fmt(summary.savingsTarget)} ({wallet.settings.savingsGoalPct}%)
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Saldo Atual */}
          <Card className={cn(
            'border-primary/50 shadow-md shadow-primary/10',
            summary.projectedBalance < 0 && 'border-destructive/50 shadow-destructive/10'
          )}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-primary" /> Saldo Atual
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-7 w-28" /> : (
                <div className="space-y-1.5">
                  <div>
                    <div className={cn(
                      'text-2xl font-bold',
                      summary.projectedBalance >= 0 ? 'text-primary' : 'text-destructive'
                    )}>
                      {fmt(summary.projectedBalance)}
                    </div>
                    <div className="text-[11px] text-muted-foreground font-medium">
                      Previsão do mês
                    </div>
                  </div>

                  <div className="pt-1.5 border-t border-border/40 space-y-0.5 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Saldo em conta (caixa):</span>
                      <span className={cn('font-semibold', summary.realBalance >= 0 ? 'text-emerald-500' : 'text-destructive')}>
                        {fmt(summary.realBalance)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Patrimônio total:</span>
                      <span className="font-medium text-foreground/90">{fmt(summary.netWorth)}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Seção principal: 2 colunas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 xl:gap-6">

          {/* Coluna Esquerda: Receitas + Caixinhas */}
          <div className="space-y-4">

            {/* Receitas PF */}
            <Card className={cn(!incomesListOpen && "h-[140px]")}>
              <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-emerald-500" /> Entradas do Mês
                  </CardTitle>
                  <span className="text-xs text-emerald-500 font-bold">{fmt(summary.totalIncome)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground transition-colors"
                    onClick={toggleIncomesList}
                    title={incomesListOpen ? 'Ocultar lista' : 'Expandir lista'}
                  >
                    {incomesListOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </CardHeader>
              {incomesListOpen && (
                <CardContent className="p-4 pt-0 space-y-1.5">
                {isLoading ? (
                  <div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
                ) : incomes.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Sem entradas projetadas para este mês.</p>
                ) : (
                  <>
                    {prolaboreIncomes.map(income => (
                      <div key={income.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                            <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Pró-labore</p>
                            <p className="text-xs text-muted-foreground">{income.partnerName}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-emerald-500">{fmt(income.amount)}</p>
                          <span className="text-[10px] text-muted-foreground">
                            {income.isVirtual ? 'Projeção' : 'Lançado'}
                          </span>
                        </div>
                      </div>
                    ))}

                    {plIncomes.map(income => (
                      <div key={income.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-violet-500/5 border border-violet-500/10">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                            <ArrowDownLeft className="w-4 h-4 text-violet-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Retirada PL</p>
                            <p className="text-xs text-muted-foreground">{income.partnerName}</p>
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          <div>
                            <p className="font-semibold text-violet-400">{fmt(income.amount)}</p>
                            <span className="text-[10px] text-muted-foreground">
                              {income.receiptConfirmed ? 'Recebido ✓' : income.isVirtual ? 'Aguardando' : 'Lançado'}
                            </span>
                          </div>
                          {/* Receber: disponível para qualquer PL não confirmado.
                              A guarda contra valores ficticiios está em getMonthSummary
                              (plReceiptExists), que só conta PL no income após a confirmação. */}
                          {!income.receiptConfirmed && (
                            <Button
                              size="sm"
                              className="h-7 text-xs bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 border border-violet-500/30 gap-1"
                              variant="ghost"
                              onClick={() => { setSelectedPLIncome(income); setPlDialogOpen(true); }}
                            >
                              <CheckCircle2 className="w-3 h-3" /> Receber
                            </Button>
                          )}
                          {income.receiptConfirmed && (
                            <div className="flex items-center gap-1.5">
                              <div className="w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1"
                                  onClick={async () => {
                                  if (!window.confirm('Desfazer o recebimento deste PL? O valor será estornado do caixa e os saldos ajustados automaticamente.')) return;
                                  try {
                                    await wallet.undoPLReceipt(selectedMonthId);
                                    toast.success('Recebimento de PL estornado com sucesso!');
                                  } catch (e: any) {
                                    toast.error('Erro ao estornar PL: ' + e.message);
                                  }
                                }}
                              >
                                <Undo2 className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </>
                )}
                </CardContent>
              )}
              {!incomesListOpen && incomes.length > 0 && (
                <CardContent className="p-4 pt-0">
                  <p className="text-xs text-muted-foreground text-center py-1">
                    {incomes.length} entradas — clique em <ChevronDown className="w-3 h-3 inline-block align-text-bottom mx-1" /> para expandir
                  </p>
                </CardContent>
              )}
            </Card>

            {/* Caixinhas */}
            <PersonalReservesPanel wallet={wallet} monthId={selectedMonthId} availableBalance={summary.availableBalance} />
          </div>

          {/* Coluna Direita: Despesas + Gráfico */}
          <div className="space-y-4">
            <PersonalExpensesPanel wallet={wallet} monthId={selectedMonthId} />
            <PersonalEvolutionChart wallet={wallet} partnerName={myPartnerName} getPjExpenses={getPjExpensesForMonth} />
          </div>
        </div>
      </div>

      {/* Dialog de Recebimento & Distribuição do PL */}
      {selectedPLIncome && (
        <PLReceiptDialog
          open={plDialogOpen}
          onOpenChange={setPlDialogOpen}
          plIncome={selectedPLIncome}
          wallet={wallet}
          monthId={selectedMonthId}
          onConfirm={async (distributions, receiptDate) => {
            try {
              await wallet.confirmPLReceipt(
                selectedMonthId,
                selectedPLIncome.amount,
                receiptDate,
                distributions,
              );
              toast.success('PL confirmado e distribuído com sucesso!');
              setPlDialogOpen(false);
            } catch (e: any) {
              toast.error('Erro ao confirmar PL: ' + e.message);
            }
          }}
        />
      )}
    </AppLayout>
  );
}
