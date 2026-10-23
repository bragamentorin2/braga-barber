// ============================================================
// Gráfico de Evolução Patrimonial + Projeção dos próximos meses
// ============================================================
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Info, TrendingUp } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';
import type { usePersonalWallet } from '@/hooks/usePersonalWallet';
import { usePrivacyStore } from '@/store/usePrivacyStore';

type WalletHook = ReturnType<typeof usePersonalWallet>;



function getMonthLabel(monthId: string) {
  const [y, m] = monthId.split('-');
  return new Date(parseInt(y), parseInt(m) - 1, 1)
    .toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
}

// Gera range de meses YYYY-MM: do startMonthId até hoje + N meses futuros
function generateMonthRange(startMonthId: string, futureMonths = 6): string[] {
  const now = new Date();
  const [sy, sm] = startMonthId.split('-').map(Number);
  const months: string[] = [];
  let y = sy, m = sm;

  // Limite: mês atual + futureMonths
  const limitDate = new Date(now.getFullYear(), now.getMonth() + futureMonths, 1);

  while (true) {
    months.push(`${y}-${String(m).padStart(2, '0')}`);
    const cur = new Date(y, m - 1, 1);
    if (cur >= limitDate) break;
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return months;
}

interface Props {
  wallet: WalletHook;
  partnerName: string;
  getPjExpenses: (monthId: string) => Array<{ id: string; category: string; amount: number; description?: string }>;
}

// Tooltip customizado
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-3 text-xs shadow-xl min-w-[180px]">
      <p className="text-[#94a3b8] mb-2 font-medium">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-4 mb-0.5">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-semibold text-white">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function PersonalEvolutionChart({ wallet, partnerName, getPjExpenses }: Props) {
  const { settings, getMonthSummary } = wallet;
  const { showValues } = usePrivacyStore();

  const fmt = (v: number) => {
    if (!showValues) return 'R$ •••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  };
  
  const fmtShort = (v: number) => {
    if (!showValues) return 'R$ •••••';
    if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
    if (Math.abs(v) >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}K`;
    return fmt(v);
  };

  const [showProjection, setShowProjection] = useState(true); // ON por padrão
  const [showInfo, setShowInfo] = useState(false);

  const today = new Date().toISOString().slice(0, 7);

  const allMonths = useMemo(() => {
    if (!settings?.startMonthId) return [];
    return generateMonthRange(settings.startMonthId, 6);
  }, [settings?.startMonthId]);

  // Calcula summary para TODOS os meses (passados e futuros)
  const chartData = useMemo(() => {
    if (!settings || allMonths.length === 0) return [];

    return allMonths.map(monthId => {
      const summary = getMonthSummary(monthId, getPjExpenses, partnerName);
      const isPast = monthId < today;
      const isCurrent = monthId === today;
      const isFuture = monthId > today;

      return {
        month: getMonthLabel(monthId),
        monthId,
        isPast,
        isCurrent,
        isFuture,
        // Linha histórica: só meses passados e atual
        disponivel: !isFuture ? summary.realBalance : null,
        patrimonio: !isFuture ? summary.netWorth : null,
        // Linha de projeção: só meses futuros (+ ponto de conexão no mês atual)
        projDisponivel: !isPast ? summary.projectedBalance : null,
        projPatrimonio: !isPast ? summary.netWorth : null,
        // Valores brutos para tooltip (sempre disponível)
        valDisponivel: isFuture ? summary.projectedBalance : summary.realBalance,
        valPatrimonio: summary.netWorth,
      };
    });
  }, [allMonths, getPjExpenses, getMonthSummary, partnerName, settings, today]);

  // Variação média histórica (delta mês a mês) — para info ao usuário
  const historicalAvg = useMemo(() => {
    const real = chartData.filter(d => d.isPast && d.disponivel !== null);
    if (real.length < 2) return null;
    const deltas = real.slice(1).map((d, i) => (d.disponivel ?? 0) - (real[i].disponivel ?? 0));
    return deltas.reduce((a, b) => a + b, 0) / deltas.length;
  }, [chartData]);

  const hasRealData = chartData.filter(d => !d.isFuture && d.disponivel !== null).length >= 1;
  const hasFutureData = chartData.some(d => d.isFuture);

  if (!settings?.isActive || allMonths.length === 0) return null;

  const todayLabel = getMonthLabel(today);

  return (
    <Card className="border-primary/10">
      <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" /> Evolução Patrimonial
        </CardTitle>

        <div className="flex items-center gap-3">
          {/* Toggle projeção futura */}
          {hasFutureData && (
            <button
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowProjection(p => !p)}
            >
              <div className={`w-8 h-4 rounded-full transition-colors relative ${showProjection ? 'bg-primary' : 'bg-muted'}`}>
                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${showProjection ? 'left-4' : 'left-0.5'}`} />
              </div>
              <span className={showProjection ? 'text-primary font-medium' : ''}>Projeção</span>
            </button>
          )}

          {/* Info */}
          <div className="relative">
            <button
              className="text-muted-foreground hover:text-primary transition-colors"
              onMouseEnter={() => setShowInfo(true)}
              onMouseLeave={() => setShowInfo(false)}
            >
              <Info className="w-3.5 h-3.5" />
            </button>
            {showInfo && (
              <div className="absolute right-0 top-6 w-72 p-3 rounded-xl text-xs text-white shadow-xl z-50" style={{ background: 'linear-gradient(135deg, #16e0c4 0%, #0891b2 100%)' }}>
                <p className="font-semibold mb-1">📊 Evolução Patrimonial</p>
                <p className="leading-relaxed opacity-90 mb-1">
                  <strong>Histórico</strong> — saldo real acumulado mês a mês desde o início da Carteira.
                </p>
                <p className="leading-relaxed opacity-90">
                  <strong>Projeção</strong> — saldo estimado para os próximos 6 meses com base nas suas provisões e renda configurada.
                  {historicalAvg !== null && (
                    <> Variação média histórica: <strong>{historicalAvg >= 0 ? '+' : ''}{fmt(historicalAvg)}/mês</strong>.</>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0">
        {!hasRealData ? (
          <div className="text-center py-10 text-sm text-muted-foreground space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <TrendingUp className="w-7 h-7 text-primary opacity-60" />
            </div>
            <div>
              <p className="font-medium">Gráfico acumulará dados mês a mês</p>
              <p className="text-xs opacity-60 mt-1">
                Os dados aparecem a partir do primeiro mês ativo da Carteira.<br/>
                {hasFutureData && 'A projeção dos próximos meses já está disponível abaixo.'}
              </p>
            </div>
            {/* Preview futuro mesmo sem histórico */}
            {hasFutureData && showProjection && (
              <div className="mt-2">
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="gradProj" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#16e0c4" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#16e0c4" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="gradProjPat" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#6b7280' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickFormatter={fmtShort} width={60} />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="projDisponivel" name="Projeção Saldo" stroke="#16e0c4" strokeWidth={1.5} strokeDasharray="5 3" fill="url(#gradProj)" dot={false} connectNulls />
                    <Area type="monotone" dataKey="projPatrimonio" name="Projeção Patrimônio" stroke="#8b5cf6" strokeWidth={1.5} strokeDasharray="5 3" fill="url(#gradProjPat)" dot={false} connectNulls />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="gradDisp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16e0c4" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#16e0c4" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gradPat" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gradProjDisp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16e0c4" stopOpacity={0.08}/>
                  <stop offset="95%" stopColor="#16e0c4" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gradProjPat" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.08}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickFormatter={fmtShort} width={62} />
              <RechartsTooltip content={<CustomTooltip />} />
              <ReferenceLine
                x={todayLabel}
                stroke="#16e0c4"
                strokeDasharray="4 2"
                label={{ value: 'Hoje', fill: '#16e0c4', fontSize: 10 }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />

              {/* Linhas históricas (passado + mês atual) */}
              <Area
                type="monotone" dataKey="disponivel" name="Saldo Disponível"
                stroke="#16e0c4" strokeWidth={2} fill="url(#gradDisp)"
                dot={false} connectNulls={false}
              />
              <Area
                type="monotone" dataKey="patrimonio" name="Patrimônio Total"
                stroke="#8b5cf6" strokeWidth={2} fill="url(#gradPat)"
                dot={false} connectNulls={false}
              />

              {/* Linhas de projeção (mês atual + futuros) */}
              {showProjection && (
                <>
                  <Area
                    type="monotone" dataKey="projDisponivel" name="Projeção Saldo"
                    stroke="#16e0c4" strokeWidth={1.5} strokeDasharray="6 3"
                    fill="url(#gradProjDisp)" dot={false} connectNulls
                  />
                  <Area
                    type="monotone" dataKey="projPatrimonio" name="Projeção Patrimônio"
                    stroke="#8b5cf6" strokeWidth={1.5} strokeDasharray="6 3"
                    fill="url(#gradProjPat)" dot={false} connectNulls
                  />
                </>
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
