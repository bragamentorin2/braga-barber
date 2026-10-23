// ============================================================
// Dialog: Receber & Distribuir PL
// ============================================================
import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, PiggyBank, Sparkles } from 'lucide-react';
import { DatePicker } from '@/components/ui/DatePicker';
import type { usePersonalWallet } from '@/hooks/usePersonalWallet';
import type { PersonalIncome } from '@/types/personalWallet';

type WalletHook = ReturnType<typeof usePersonalWallet>;

import { usePrivacyStore } from '@/store/usePrivacyStore';

function parseBRL(raw: string): number {
  return parseFloat(raw.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plIncome: PersonalIncome;
  wallet: WalletHook;
  monthId: string;
  onConfirm: (
    distributions: Array<{ reserveId: string; amount: number; label: string }>,
    receiptDate: string,
  ) => Promise<void>;
}

export function PLReceiptDialog({ open, onOpenChange, plIncome, wallet, monthId, onConfirm }: Props) {
  const { reserves, allocationRules, suggestAllocation } = wallet;

  const today = new Date().toISOString().slice(0, 10);
  const [receiptDate, setReceiptDate] = useState(today);

  const { showValues } = usePrivacyStore();
  const fmt = (v: number) => {
    if (!showValues) return 'R$ •••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  };
  const [confirming, setConfirming] = useState(false);

  // Sugestões baseadas nas regras de destinação
  const suggestions = useMemo(() => suggestAllocation(plIncome.amount), [plIncome.amount, allocationRules]);

  // Estado editável das distribuições
  const [distributions, setDistributions] = useState<Array<{ reserveId: string; amount: number; label: string }>>(() =>
    suggestions
      .filter(s => s.rule.reserveId)
      .map(s => ({ reserveId: s.rule.reserveId!, amount: s.suggestedAmount, label: s.rule.label }))
  );

  const totalDistributed = distributions.reduce((acc, d) => acc + d.amount, 0);
  const remaining = plIncome.amount - totalDistributed;

  const handleConfirm = async () => {
    setConfirming(true);
    const validDist = distributions.filter(d => d.amount > 0 && d.reserveId);
    await onConfirm(validDist, receiptDate);
    setConfirming(false);
  };

  const updateDistAmount = (idx: number, value: string) => {
    const v = parseBRL(value);
    setDistributions(prev => prev.map((d, i) => i === idx ? { ...d, amount: v } : d));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-5 h-5 text-violet-400" />
            Receber & Distribuir PL
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Valor recebido */}
          <div className="rounded-xl p-4 bg-violet-500/10 border border-violet-500/20 text-center space-y-1">
            <p className="text-xs text-violet-300 font-medium uppercase tracking-wide">Valor Recebido</p>
            <p className="text-3xl font-bold text-violet-300">{fmt(plIncome.amount)}</p>
            <p className="text-xs text-muted-foreground">Retirada PL — {monthId}</p>
          </div>

          {/* Data de recebimento */}
          <div>
            <DatePicker
              label="Data do Recebimento"
              value={receiptDate}
              onChange={setReceiptDate}
            />
          </div>

          {/* Distribuição */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Destino dos Recursos</p>
              <div className={`text-xs font-medium px-2 py-0.5 rounded-full ${Math.abs(remaining) < 1 ? 'bg-emerald-500/10 text-emerald-500' : remaining > 0 ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'}`}>
                {remaining > 0 ? `Restante: ${fmt(remaining)}` : remaining < -0.5 ? `Excedido: ${fmt(-remaining)}` : '✓ Totalmente distribuído'}
              </div>
            </div>

            {distributions.length === 0 ? (
              <div className="text-center py-4 text-sm text-muted-foreground">
                <PiggyBank className="w-8 h-8 mx-auto mb-1 opacity-20" />
                Nenhuma regra de destinação configurada.
                <br />
                <span className="text-xs">Crie regras de destinação nas configurações da carteira.</span>
              </div>
            ) : (
              <div className="space-y-2">
                {distributions.map((dist, idx) => {
                  const reserve = reserves.find(r => r.id === dist.reserveId);
                  return (
                    <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: (reserve?.color || '#8b5cf6') + '20' }}
                      >
                        <PiggyBank className="w-4 h-4" style={{ color: reserve?.color || '#8b5cf6' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{dist.label}</p>
                        {reserve && <p className="text-xs text-muted-foreground">Saldo atual: {fmt(reserve.currentBalance)}</p>}
                      </div>
                      <div className="relative shrink-0 w-28">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                        <Input
                          className="pl-8 h-8 text-sm"
                          value={dist.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          onChange={e => updateDistAmount(idx, e.target.value)}
                          inputMode="decimal"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Saldo não distribuído fica na conta corrente */}
            {remaining > 0.5 && (
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-muted/30">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <span className="text-lg">🏦</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Conta Corrente (Disponível)</p>
                  <p className="text-xs text-muted-foreground">Ficará no saldo disponível</p>
                </div>
                <p className="font-semibold text-sm text-primary">{fmt(remaining)}</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={handleConfirm}
            disabled={confirming}
            className="gap-2 bg-violet-600 hover:bg-violet-700"
          >
            {confirming ? 'Confirmando...' : (
              <><CheckCircle2 className="w-4 h-4" /> Confirmar Recebimento</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
