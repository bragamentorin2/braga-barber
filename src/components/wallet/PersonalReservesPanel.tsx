// ============================================================
// Painel de Caixinhas / Reservas
// ============================================================
import { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PiggyBank, Plus, ArrowUpRight, ArrowDownLeft, Trash2, Target, ArrowRightLeft, ChevronDown, ChevronUp, History, MoreVertical, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';
import type { usePersonalWallet } from '@/hooks/usePersonalWallet';
import type { PersonalReserve } from '@/types/personalWallet';

type WalletHook = ReturnType<typeof usePersonalWallet>;

import { usePrivacyStore } from '@/store/usePrivacyStore';

function parseBRL(raw: string): number {
  return parseFloat(raw.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
}

const RESERVE_COLORS = [
  '#8b5cf6', '#16e0c4', '#f59e0b', '#ef4444', '#3b82f6', '#10b981', '#ec4899', '#f97316',
];

interface Props { wallet: WalletHook; monthId: string; availableBalance: number; }

export function PersonalReservesPanel({ wallet, monthId, availableBalance }: Props) {
  const { reserves, addReserve, updateReserve, deleteReserve, resetReserve, deleteReserveForce, reorderReserves, addTransaction, deleteTransaction, transactions } = wallet;
  const { showValues } = usePrivacyStore();

  const fmt = (v: number) => {
    if (!showValues) return 'R$ •••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  };

  const [createOpen, setCreateOpen] = useState(false);
  const [reorderOpen, setReorderOpen] = useState(false);
  const [listOpen, setListOpen] = useState(() => localStorage.getItem('wallet_reserves_open') === 'true');
  const toggleListOpen = () => {
    setListOpen(prev => {
      const next = !prev;
      localStorage.setItem('wallet_reserves_open', String(next));
      return next;
    });
  };
  const [moveOpen, setMoveOpen] = useState<{ reserve: PersonalReserve; direction: 'aporte' | 'resgate' } | null>(null);
  const [transferOpen, setTransferOpen] = useState<PersonalReserve | null>(null);
  const [historyOpen, setHistoryOpen] = useState<PersonalReserve | null>(null);

  const moveReserve = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= reserves.length) return;
    const newReserves = [...reserves];
    const [moved] = newReserves.splice(index, 1);
    newReserves.splice(targetIndex, 0, moved);
    reorderReserves(newReserves.map(r => r.id));
  };

  // Drag & Drop state para caixinhas
  const dragReserveIndexRef = useRef<number | null>(null);
  const [dragOverReserveIndex, setDragOverReserveIndex] = useState<number | null>(null);

  const handleReserveDragStart = useCallback((index: number) => {
    dragReserveIndexRef.current = index;
  }, []);

  const handleReserveDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverReserveIndex(index);
  }, []);

  const handleReserveDrop = useCallback((dropIndex: number) => {
    const dragIndex = dragReserveIndexRef.current;
    if (dragIndex === null || dragIndex === dropIndex) {
      dragReserveIndexRef.current = null;
      setDragOverReserveIndex(null);
      return;
    }
    const newReserves = [...reserves];
    const [moved] = newReserves.splice(dragIndex, 1);
    newReserves.splice(dropIndex, 0, moved);
    reorderReserves(newReserves.map(r => r.id));
    dragReserveIndexRef.current = null;
    setDragOverReserveIndex(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reserves, reorderReserves]);

  const handleReserveDragEnd = useCallback(() => {
    dragReserveIndexRef.current = null;
    setDragOverReserveIndex(null);
  }, []);

  // ============================================================
  // PRINCÍPIO DE COMPETÊNCIA: saldo de cada caixinha é calculado
  // a partir das transações até o mês selecionado (não do campo
  // current_balance do BD, que é cumulativo global e inclui meses futuros).
  // ============================================================
  const getReserveBalanceAtMonth = (reserveId: string): number => {
    return transactions
      .filter(t => t.reserveId === reserveId && t.monthId <= monthId)
      .reduce((acc, t) => {
        if (t.type === 'aporte') return acc + t.amount;
        if (t.type === 'resgate') return acc - t.amount;
        return acc;
      }, 0);
  };

  // Formulário de nova reserva
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newGoal, setNewGoal] = useState('');
  const [newColor, setNewColor] = useState(RESERVE_COLORS[0]);
  const [saving, setSaving] = useState(false);

  // Formulário de movimentação
  const [moveAmount, setMoveAmount] = useState('');
  const [moveDesc, setMoveDesc] = useState('');
  const [moveSaving, setMoveSaving] = useState(false);

  // Formulário de transferência
  const [transferDestId, setTransferDestId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferSaving, setTransferSaving] = useState(false);

  const totalReserves = reserves.reduce((acc, r) => acc + getReserveBalanceAtMonth(r.id), 0);

  const handleCreate = async () => {
    if (!newName.trim()) { toast.error('Informe o nome da reserva.'); return; }
    setSaving(true);
    try {
      await addReserve({
        name: newName.trim(),
        description: newDesc.trim() || undefined,
        icon: 'piggy-bank',
        color: newColor,
        goalAmount: parseBRL(newGoal) || undefined,
      });
      toast.success('Reserva criada!');
      setCreateOpen(false);
      setNewName(''); setNewDesc(''); setNewGoal(''); setNewColor(RESERVE_COLORS[0]);
    } catch (e: any) {
      toast.error('Erro: ' + e.message);
    }
    setSaving(false);
  };

  const handleMove = async () => {
    if (!moveOpen) return;
    const amount = parseBRL(moveAmount);
    if (!amount || amount <= 0) { toast.error('Informe um valor válido.'); return; }
    // Usa saldo do mês para validação (competência)
    const balanceAtMonth = getReserveBalanceAtMonth(moveOpen.reserve.id);
    if (moveOpen.direction === 'resgate' && amount > balanceAtMonth) {
      toast.error('Saldo insuficiente na caixinha.'); return;
    }
    if (moveOpen.direction === 'aporte' && amount > availableBalance) {
      toast.error('Você não tem saldo disponível suficiente na carteira para fazer este aporte.'); return;
    }
    setMoveSaving(true);
    try {
      await addTransaction({
        monthId,
        type: moveOpen.direction,
        reserveId: moveOpen.reserve.id,
        description: moveDesc.trim() || (moveOpen.direction === 'aporte' ? 'Aporte' : 'Resgate'),
        amount,
      });
      toast.success(moveOpen.direction === 'aporte' ? 'Aporte realizado!' : 'Resgate realizado!');
      setMoveOpen(null);
      setMoveAmount(''); setMoveDesc('');
    } catch (e: any) {
      toast.error('Erro: ' + e.message);
    }
    setMoveSaving(false);
  };

  const handleTransfer = async () => {
    if (!transferOpen) return;
    const amount = parseBRL(transferAmount);
    if (!amount || amount <= 0) { toast.error('Informe um valor válido.'); return; }
    if (!transferDestId) { toast.error('Selecione a caixinha de destino.'); return; }
    if (transferDestId === transferOpen.id) { toast.error('A caixinha de destino deve ser diferente da de origem.'); return; }
    // Valida contra saldo do mês (competência)
    const sourceBalanceAtMonth = getReserveBalanceAtMonth(transferOpen.id);
    if (amount > sourceBalanceAtMonth) { toast.error('Saldo insuficiente na caixinha de origem.'); return; }
    const destReserve = reserves.find(r => r.id === transferDestId);
    if (!destReserve) return;

    setTransferSaving(true);
    try {
      // 1. Resgate da origem
      await addTransaction({
        monthId,
        type: 'resgate',
        reserveId: transferOpen.id,
        description: `Transferência → ${destReserve.name}`,
        amount,
      });
      // 2. Aporte no destino
      await addTransaction({
        monthId,
        type: 'aporte',
        reserveId: transferDestId,
        description: `Transferência ← ${transferOpen.name}`,
        amount,
      });
      toast.success(`${fmt(amount)} transferido de "${transferOpen.name}" para "${destReserve.name}"!`);
      setTransferOpen(null);
      setTransferAmount(''); setTransferDestId('');
    } catch (e: any) {
      toast.error('Erro na transferência: ' + e.message);
    }
    setTransferSaving(false);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <PiggyBank className="w-4 h-4 text-violet-400" /> Caixinhas
            </CardTitle>
            <span className="text-xs text-muted-foreground">
              Total: {fmt(totalReserves)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Desktop: botão Lançar */}
            <Button variant="outline" size="sm" className="hidden sm:inline-flex h-8 text-xs gap-1" onClick={() => setCreateOpen(true)}>
              <Plus className="w-3 h-3" /> Lançar
            </Button>

            {/* Menu de ações: exibido exclusivamente em Mobile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground sm:hidden"
                  title="Mais opções"
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => setCreateOpen(true)} className="gap-2 text-xs cursor-pointer">
                  <Plus className="w-3.5 h-3.5 text-primary" />
                  <span>+ Nova Caixinha</span>
                </DropdownMenuItem>
                {reserves.length > 1 && (
                  <DropdownMenuItem onClick={() => setReorderOpen(true)} className="gap-2 text-xs cursor-pointer">
                    <ArrowUpDown className="w-3.5 h-3.5 text-blue-400" />
                    <span>Ordenar Caixinhas</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <button
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground transition-colors"
              onClick={toggleListOpen}
              title={listOpen ? 'Ocultar lista' : 'Expandir lista'}
            >
              {listOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </CardHeader>
        {listOpen && (
          <CardContent className="p-4 pt-0 space-y-3">
            {reserves.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              <PiggyBank className="w-8 h-8 mx-auto mb-2 opacity-20" />
              Nenhuma caixinha criada ainda.
            </div>
          ) : (
            <div className="space-y-3">
              {reserves.map((reserve, index) => {
                const balanceAtMonth = getReserveBalanceAtMonth(reserve.id);
                const pct = reserve.goalAmount ? Math.min(100, (balanceAtMonth / reserve.goalAmount) * 100) : null;
                const isDragOverReserve = dragOverReserveIndex === index;
                return (
                  <div
                    key={reserve.id}
                    draggable={reserves.length > 1}
                    onDragStart={() => handleReserveDragStart(index)}
                    onDragOver={(e) => handleReserveDragOver(e, index)}
                    onDrop={() => handleReserveDrop(index)}
                    onDragEnd={handleReserveDragEnd}
                    className={cn(
                      "group relative rounded-lg border border-border p-3 space-y-2 transition-all hover:border-border/80",
                      reserves.length > 1 && "cursor-grab active:cursor-grabbing",
                      isDragOverReserve && "border-t-2 border-primary/60 bg-primary/5 shadow-md shadow-primary/10"
                    )}
                    style={{ borderLeftColor: reserve.color, borderLeftWidth: 3 }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {/* Handle drag + setas (desktop) */}
                        {reserves.length > 1 && (
                          <div className="hidden sm:flex flex-col items-center justify-center -ml-1 mr-0.5 opacity-0 group-hover:opacity-100 transition-opacity gap-0.5">
                            {/* Ícone de arrastar */}
                            <span className="text-muted-foreground/60 hover:text-primary cursor-grab" title="Arrastar para reordenar">
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                              </svg>
                            </span>
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={(e) => { e.stopPropagation(); moveReserve(index, 'up'); }}
                              className={cn(
                                "w-4 h-4 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors",
                                index === 0 && "opacity-20 cursor-not-allowed hover:bg-transparent"
                              )}
                              title="Mover para cima"
                            >
                              <ChevronUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              disabled={index === reserves.length - 1}
                              onClick={(e) => { e.stopPropagation(); moveReserve(index, 'down'); }}
                              className={cn(
                                "w-4 h-4 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors",
                                index === reserves.length - 1 && "opacity-20 cursor-not-allowed hover:bg-transparent"
                              )}
                              title="Mover para baixo"
                            >
                              <ChevronDown className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ backgroundColor: reserve.color + '20' }}>
                          <PiggyBank className="w-3.5 h-3.5" style={{ color: reserve.color }} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{reserve.name}</p>
                          {reserve.description && <p className="text-[11px] text-muted-foreground">{reserve.description}</p>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm" style={{ color: reserve.color }}>{fmt(balanceAtMonth)}</p>
                        {reserve.goalAmount && (
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1 justify-end">
                            <Target className="w-2.5 h-2.5" /> {fmt(reserve.goalAmount)}
                          </p>
                        )}
                      </div>
                    </div>

                    {pct !== null && (
                      <Progress value={pct} className="h-1.5" style={{ '--progress-color': reserve.color } as any} />
                    )}

                    <div className="flex items-center justify-end gap-1 flex-wrap pt-1">
                      {/* Extrato da caixinha */}
                      <Button
                        variant="ghost" size="sm"
                        className="h-6 text-[11px] text-blue-400 hover:bg-blue-400/10 gap-1 px-2"
                        title="Ver extrato de transações e histórico"
                        onClick={() => setHistoryOpen(reserve)}
                      >
                        <History className="w-3 h-3" /> Extrato
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        className="h-6 text-[11px] text-emerald-500 hover:bg-emerald-500/10 gap-1 px-2"
                        onClick={() => setMoveOpen({ reserve, direction: 'aporte' })}
                      >
                        <ArrowUpRight className="w-3 h-3" /> Aportar
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        className="h-6 text-[11px] text-amber-500 hover:bg-amber-500/10 gap-1 px-2"
                        onClick={() => setMoveOpen({ reserve, direction: 'resgate' })}
                      >
                        <ArrowDownLeft className="w-3 h-3" /> Resgatar
                      </Button>
                      {/* Transferir — só disponível se saldo do mês > 0 e há ao menos 2 caixinhas */}
                      {reserves.length >= 2 && balanceAtMonth > 0 && (
                        <Button
                          variant="ghost" size="sm"
                          className="h-6 text-[11px] text-blue-400 hover:bg-blue-500/10 gap-1 px-2"
                          title="Transferir para outra caixinha"
                          onClick={() => { setTransferOpen(reserve); setTransferDestId(''); setTransferAmount(''); }}
                        >
                          <ArrowRightLeft className="w-3 h-3" /> Transferir
                        </Button>
                      )}
                      <Button
                        variant="ghost" size="icon"
                        disabled={balanceAtMonth > 0}
                        className={cn(
                          "h-6 w-6",
                          balanceAtMonth > 0
                            ? "opacity-25 cursor-not-allowed text-muted-foreground hover:bg-transparent"
                            : "text-destructive hover:bg-destructive/10"
                        )}
                        title={balanceAtMonth > 0 ? "Resgate ou zere o saldo antes de excluir esta caixinha" : "Excluir caixinha"}
                        onClick={async () => {
                          if (balanceAtMonth > 0) return;
                          if (!window.confirm(`Excluir a caixinha "${reserve.name}"?`)) return;
                          await deleteReserve(reserve.id);
                          toast.success('Caixinha excluída.');
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </CardContent>
        )}
        {!listOpen && reserves.length > 0 && (
          <CardContent className="p-4 pt-0">
            <p className="text-xs text-muted-foreground text-center py-1">
              {reserves.length} caixinhas — clique em <ChevronDown className="w-3 h-3 inline-block align-text-bottom mx-1" /> para expandir
            </p>
          </CardContent>
        )}
      </Card>

      {/* Dialog: Nova Caixinha */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nova Caixinha</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="reserve-name">Nome</Label>
              <Input id="reserve-name" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ex: Reserva de Emergência" autoFocus />
            </div>
            <div>
              <Label htmlFor="reserve-desc">Descrição (Opcional)</Label>
              <Input id="reserve-desc" value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Ex: 6 meses de custeio" />
            </div>
            <div>
              <Label htmlFor="reserve-goal">Meta (Opcional)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                <Input id="reserve-goal" className="pl-9" value={newGoal} onChange={e => setNewGoal(e.target.value)} placeholder="0,00" inputMode="decimal" />
              </div>
            </div>
            <div>
              <Label>Cor</Label>
              <div className="flex gap-2 mt-1 flex-wrap">
                {RESERVE_COLORS.map(color => (
                  <button
                    key={color}
                    className={cn('w-6 h-6 rounded-full transition-all', newColor === color ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'hover:scale-105')}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewColor(color)}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving ? 'Criando...' : 'Criar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Aporte / Resgate */}
      <Dialog open={!!moveOpen} onOpenChange={open => { if (!open) setMoveOpen(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {moveOpen?.direction === 'aporte' ? '💰 Aportar em' : '🏦 Resgatar de'} {moveOpen?.reserve.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Valor</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                <Input
                  className="pl-9"
                  value={moveAmount}
                  onChange={e => setMoveAmount(e.target.value)}
                  placeholder="0,00"
                  inputMode="decimal"
                  autoFocus
                />
              </div>
              {moveOpen?.reserve && (
                <p className="text-xs text-muted-foreground mt-1">
                  {moveOpen.direction === 'resgate' 
                    ? `Disponível para resgate: ${fmt(getReserveBalanceAtMonth(moveOpen.reserve.id))}` 
                    : `Saldo da carteira: ${fmt(availableBalance)}`}
                </p>
              )}
            </div>
            <div>
              <Label>Descrição (Opcional)</Label>
              <Input value={moveDesc} onChange={e => setMoveDesc(e.target.value)} placeholder="Ex: Aporte mensal" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveOpen(null)}>Cancelar</Button>
            <Button
              onClick={handleMove}
              disabled={moveSaving}
              className={moveOpen?.direction === 'resgate' ? 'bg-amber-500 hover:bg-amber-600' : ''}
            >
              {moveSaving ? 'Processando...' : moveOpen?.direction === 'aporte' ? 'Aportar' : 'Resgatar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Transferência entre Caixinhas */}
      <Dialog open={!!transferOpen} onOpenChange={open => { if (!open) setTransferOpen(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-blue-400" />
              Transferir de "{transferOpen?.name}"
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Origem (read-only) */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
              <div className="w-7 h-7 rounded-md bg-blue-500/10 flex items-center justify-center">
                <PiggyBank className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{transferOpen?.name}</p>
                <p className="text-xs text-muted-foreground">Saldo disponível ({monthId}): {transferOpen ? fmt(getReserveBalanceAtMonth(transferOpen.id)) : '-'}</p>
              </div>
            </div>

            {/* Destino */}
            <div className="space-y-2">
              <Label>Caixinha de Destino</Label>
              <Select value={transferDestId} onValueChange={setTransferDestId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o destino..." />
                </SelectTrigger>
                <SelectContent>
                  {reserves
                    .filter(r => r.id !== transferOpen?.id)
                    .map(r => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name} — {fmt(r.currentBalance)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Valor */}
            <div className="space-y-2">
              <Label>Valor a Transferir</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                <Input
                  className="pl-9"
                  value={transferAmount}
                  onChange={e => setTransferAmount(e.target.value)}
                  placeholder="0,00"
                  inputMode="decimal"
                  autoFocus
                />
              </div>
              {transferOpen && (
                <button
                  className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
                  onClick={() => {
                    if (!transferOpen) return;
                    const bal = getReserveBalanceAtMonth(transferOpen.id);
                    setTransferAmount(bal.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
                  }}
                >
                  Transferir tudo ({fmt(transferOpen.currentBalance)})
                </button>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferOpen(null)}>Cancelar</Button>
            <Button
              onClick={handleTransfer}
              disabled={transferSaving}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              {transferSaving ? 'Transferindo...' : 'Confirmar Transferência'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Extrato e Histórico da Caixinha */}
      <Dialog open={!!historyOpen} onOpenChange={open => { if (!open) setHistoryOpen(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                Extrato: {historyOpen?.name}
              </span>
              {historyOpen && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                  {fmt(getReserveBalanceAtMonth(historyOpen.id))}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
              <span>Transações registradas</span>
              <span>Total no mês ({monthId})</span>
            </div>

            <div className="max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-blue-500/80 scrollbar-track-transparent space-y-1.5 pr-1">
              {(() => {
                const reserveTxs = transactions
                  .filter(t => t.reserveId === historyOpen?.id)
                  .sort((a, b) => b.monthId.localeCompare(a.monthId) || (b.createdAt || '').localeCompare(a.createdAt || ''));

                if (reserveTxs.length === 0) {
                  return (
                    <div className="py-8 text-center text-xs text-muted-foreground">
                      Nenhuma transação encontrada nesta caixinha.
                    </div>
                  );
                }

                return reserveTxs.map(tx => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 bg-muted/20 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className={cn(
                          'px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase',
                          tx.type === 'aporte' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                        )}>
                          {tx.type}
                        </span>
                        <span className="font-medium">{tx.description || (tx.type === 'aporte' ? 'Aporte' : 'Resgate')}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {tx.receiptDate ? `Data: ${tx.receiptDate}` : `Mês: ${tx.monthId}`}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={cn('font-semibold', tx.type === 'aporte' ? 'text-emerald-500' : 'text-amber-500')}>
                        {tx.type === 'aporte' ? '+' : '-'}{fmt(tx.amount)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title="Excluir esta transação individualmente"
                        onClick={async () => {
                          if (!window.confirm(`Excluir esta transação de ${fmt(tx.amount)}?`)) return;
                          await deleteTransaction(tx.id);
                          toast.success('Transação excluída.');
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ));
              })()}
            </div>

            {/* Ação de limpeza completa / zerar saldo */}
            {historyOpen && (
              <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  className="text-xs gap-1.5"
                  onClick={async () => {
                    if (!window.confirm(`Tem certeza de que deseja zerar o saldo da caixinha "${historyOpen.name}"?\n\nA caixinha continuará existindo normalmente, apenas suas transações serão limpas e o saldo passará para R$ 0,00.`)) return;
                    await resetReserve(historyOpen.id);
                    setHistoryOpen(null);
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" /> Zerar Saldo (Manter Caixinha)
                </Button>
                <Button variant="outline" size="sm" onClick={() => setHistoryOpen(null)}>
                  Fechar
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Ordenar Caixinhas (Mobile & Desktop) */}
      <Dialog open={reorderOpen} onOpenChange={setReorderOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-blue-400" />
              Ordenar Caixinhas
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <p className="text-xs text-muted-foreground">
              Ajuste a ordem de exibição das caixinhas usando as setas:
            </p>
            <div className="max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-blue-500/80 scrollbar-track-transparent space-y-2 pr-1">
              {reserves.map((reserve, idx) => (
                <div
                  key={reserve.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/20"
                  style={{ borderLeftColor: reserve.color, borderLeftWidth: 3 }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: reserve.color + '20' }}>
                      <PiggyBank className="w-3 h-3" style={{ color: reserve.color }} />
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-semibold truncate">{reserve.name}</p>
                      <p className="text-[10px] text-muted-foreground">{fmt(getReserveBalanceAtMonth(reserve.id))}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      disabled={idx === 0}
                      onClick={() => moveReserve(idx, 'up')}
                      title="Subir"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      disabled={idx === reserves.length - 1}
                      onClick={() => moveReserve(idx, 'down')}
                      title="Descer"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setReorderOpen(false)} className="w-full text-xs">
              Concluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
