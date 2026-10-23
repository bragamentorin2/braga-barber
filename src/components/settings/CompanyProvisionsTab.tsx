import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { WalletMonthPicker } from '@/components/ui/WalletMonthPicker';
import { useFinance } from '@/contexts/FinanceContext';
import { useMonth } from '@/contexts/MonthContext';
import { toast } from 'sonner';
import {
  CalendarClock,
  Plus,
  Trash2,
  Pencil,
  Sparkles,
  Layers,
  DollarSign,
  Tag,
  Info,
  CalendarCheck
} from 'lucide-react';
import type { ExpenseProvision } from '@/types/finance';

// Auxiliares de meses
function addMonths(startMonthId: string, count: number): string {
  const [y, m] = startMonthId.split('-').map(Number);
  const d = new Date(y, m - 1 + count - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthDiff(start: string, end: string): number {
  const [sy, sm] = start.split('-').map(Number);
  const [ey, em] = end.split('-').map(Number);
  return Math.max(1, (ey - sy) * 12 + (em - sm) + 1);
}

function formatMonthLabel(monthId: string) {
  if (!monthId) return '';
  const [year, month] = monthId.split('-');
  const d = new Date(parseInt(year), parseInt(month) - 1, 1);
  const label = d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function CompanyProvisionsTab() {
  const {
    expenseProvisions,
    expenseCategories,
    addExpenseProvision,
    updateExpenseProvision,
    deleteExpenseProvision
  } = useFinance();
  const { selectedMonthId } = useMonth();

  // Estados do Modal de Criação / Edição
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [startMonth, setStartMonth] = useState(selectedMonthId || '');
  const [hasTerm, setHasTerm] = useState(false);
  const [installments, setInstallments] = useState('');
  const [endMonth, setEndMonth] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Totais para KPI cards
  const totalMonthlyProvisions = useMemo(() => {
    return expenseProvisions.reduce((acc, p) => acc + (p.monthlyAmount || 0), 0);
  }, [expenseProvisions]);

  const continuousCount = useMemo(() => {
    return expenseProvisions.filter(p => !p.endMonthId).length;
  }, [expenseProvisions]);

  const termCount = useMemo(() => {
    return expenseProvisions.filter(p => !!p.endMonthId).length;
  }, [expenseProvisions]);

  const handleStartMonthChange = (val: string) => {
    setStartMonth(val);
    if (hasTerm && installments) {
      const count = parseInt(installments, 10);
      if (!isNaN(count) && count > 0) {
        setEndMonth(addMonths(val, count));
      }
    }
  };

  const handleInstallmentsChange = (val: string) => {
    setInstallments(val);
    const count = parseInt(val, 10);
    if (!isNaN(count) && count > 0 && startMonth) {
      setEndMonth(addMonths(startMonth, count));
    } else {
      setEndMonth('');
    }
  };

  const handleEndMonthChange = (val: string) => {
    setEndMonth(val);
    if (startMonth && val) {
      if (val < startMonth) {
        toast.error('O mês final não pode ser anterior ao mês inicial.');
        return;
      }
      const count = monthDiff(startMonth, val);
      setInstallments(String(count));
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setCategoryId('');
    setDescription('');
    setAmount('');
    setStartMonth(selectedMonthId || '');
    setHasTerm(false);
    setInstallments('');
    setEndMonth('');
  };

  const openNewProvision = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditProvision = (prov: ExpenseProvision) => {
    setEditingId(prov.id);
    setCategoryId(prov.categoryId || '');
    setDescription(prov.description || '');
    setAmount(prov.monthlyAmount ? prov.monthlyAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '');
    setStartMonth(prov.startMonthId);

    if (prov.endMonthId) {
      setHasTerm(true);
      setEndMonth(prov.endMonthId);
      const count = monthDiff(prov.startMonthId, prov.endMonthId);
      setInstallments(String(count));
    } else {
      setHasTerm(false);
      setEndMonth('');
      setInstallments('');
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!categoryId) {
      toast.error('Selecione uma categoria de despesa.');
      return;
    }

    const cleanAmount = parseFloat(amount.replace(/[R$\s.]/g, '').replace(',', '.'));
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      toast.error('Informe um valor mensal válido.');
      return;
    }

    if (!startMonth) {
      toast.error('Selecione o mês inicial.');
      return;
    }

    const selectedCat = expenseCategories.find(c => c.id === categoryId);
    const categoryName = selectedCat?.name || 'Despesa';
    const finalEndMonth = hasTerm ? endMonth : undefined;

    setIsSubmitting(true);
    try {
      if (editingId) {
        await updateExpenseProvision(editingId, {
          categoryId,
          category: categoryName,
          monthlyAmount: cleanAmount,
          startMonthId: startMonth,
          endMonthId: finalEndMonth,
          description: description.trim() || undefined,
        });
        toast.success('Provisão atualizada com sucesso!');
      } else {
        await addExpenseProvision(
          categoryId,
          categoryName,
          cleanAmount,
          startMonth,
          finalEndMonth,
          description.trim() || undefined
        );
        toast.success('Provisão cadastrada com sucesso!');
      }
      setDialogOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar provisão.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (prov: ExpenseProvision) => {
    const label = prov.description ? `"${prov.description}"` : `da categoria "${prov.category}"`;
    if (confirm(`Tem certeza que deseja remover a provisão ${label}?`)) {
      await deleteExpenseProvision(prov.id);
      toast.success('Provisão removida.');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Banner Explicativo de UX */}
      <div className="rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
            <CalendarClock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm sm:text-base text-foreground flex items-center gap-2">
              Provisões Recorrentes da Empresa (PJ)
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed max-w-2xl">
              As provisões são projeções de despesas recorrentes que servem para preencher de forma automática e planejada o fluxo financeiro da sua empresa todo mês, auxiliando o acompanhamento financeiro sem retrabalho manual.
            </p>
          </div>
        </div>

        <Button
          onClick={openNewProvision}
          className="gap-1.5 shrink-0 bg-primary text-primary-foreground font-semibold shadow-sm text-xs h-9 w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          Nova Provisão
        </Button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-border bg-card">
          <CardHeader className="pb-1 p-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
              <span>Total Provisionado / Mês</span>
              <DollarSign className="w-4 h-4 text-amber-400" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-bold text-foreground">
              {formatCurrency(totalMonthlyProvisions)}
            </div>
            <span className="text-[10px] text-muted-foreground">Compromissos fixos mensais</span>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-1 p-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
              <span>Provisões Ativas</span>
              <Layers className="w-4 h-4 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-bold text-foreground">
              {expenseProvisions.length}
            </div>
            <span className="text-[10px] text-muted-foreground">Despesas automáticas cadastradas</span>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-1 p-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
              <span>Tipo de Vigência</span>
              <CalendarCheck className="w-4 h-4 text-emerald-400" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-sm font-semibold text-foreground flex items-center gap-3">
              <span className="text-emerald-400">{continuousCount} contínuas</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-amber-400">{termCount} parceladas</span>
            </div>
            <span className="text-[10px] text-muted-foreground">Distribuição de prazos</span>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Provisões */}
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-3 p-4 sm:p-5 border-b border-border">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Lista de Provisões Cadastradas
            </CardTitle>
            <CardDescription className="text-xs">
              Gerencie valores, vigência e categorias das suas despesas fixas planejadas.
            </CardDescription>
          </div>
          <span className="text-xs text-muted-foreground font-medium hidden sm:inline-block">
            {expenseProvisions.length} cadastrada{expenseProvisions.length !== 1 ? 's' : ''}
          </span>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto min-h-[220px] scrollbar-thin scrollbar-thumb-primary/40 scrollbar-track-transparent">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="text-xs font-semibold">Categoria / Finalidade</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Valor Mensal</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Vigência</TableHead>
                  <TableHead className="w-[80px] text-right pr-4">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenseProvisions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-12">
                      <CalendarClock className="w-8 h-8 opacity-30 mx-auto mb-2 text-amber-400" />
                      <p className="text-sm font-medium">Nenhuma provisão de despesa cadastrada.</p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                        Clique em "Nova Provisão" para registrar contas fixas (aluguel, internet, sistemas) que serão projetadas automaticamente nos meses.
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  expenseProvisions.map((prov) => (
                    <TableRow key={prov.id} className="hover:bg-muted/20">
                      <TableCell className="py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-xs sm:text-sm text-foreground">
                            {prov.category}
                          </span>
                          {prov.description ? (
                            <span className="text-xs text-muted-foreground">
                              {prov.description}
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground/60 italic">
                              Sem descrição
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-right text-xs sm:text-sm font-bold text-amber-400">
                        {formatCurrency(prov.monthlyAmount)}
                      </TableCell>

                      <TableCell className="text-center text-xs">
                        {prov.endMonthId ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-medium">
                            {formatMonthLabel(prov.startMonthId)} até {formatMonthLabel(prov.endMonthId)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-medium">
                            A partir de {formatMonthLabel(prov.startMonthId)} (Contínua)
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="text-right pr-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                            onClick={() => openEditProvision(prov)}
                            title="Editar Provisão"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(prov)}
                            title="Remover Provisão"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal / Dialog de Cadastro e Edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-card border-border shadow-2xl p-5 sm:p-6">
          <DialogHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <CalendarClock className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  {editingId ? 'Editar Provisão de Despesa' : 'Nova Provisão de Despesa (PJ)'}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Configure despesas fixas recorrentes para serem provisionadas automaticamente todo mês.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {/* Categoria */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Categoria de Despesa *</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Selecione a categoria..." />
                </SelectTrigger>
                <SelectContent className="max-h-56 scrollbar-thin scrollbar-thumb-primary/40 scrollbar-track-transparent">
                  {expenseCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id} className="text-xs">
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Descrição / Finalidade */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Descrição ou Finalidade <span className="text-muted-foreground font-normal">(Opcional)</span>
              </Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Aluguel Loja 1, Internet Fibra, Sistema de Gestão..."
                className="h-9 text-xs"
              />
            </div>

            {/* Valor Mensal */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Valor Mensal (R$) *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-bold">
                  R$
                </span>
                <Input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0,00"
                  className="h-9 text-xs pl-9 font-semibold"
                />
              </div>
            </div>

            {/* Mês Inicial */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Mês de Início *</Label>
              <WalletMonthPicker value={startMonth} onChange={handleStartMonthChange} />
            </div>

            {/* Vigência: Contínua vs Prazo Definido */}
            <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-semibold block cursor-pointer">
                    Possui Prazo ou Parcelas?
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Desative para despesas contínuas (aluguel, energia) ou ative para financiamentos/parcelamentos.
                  </p>
                </div>
                <input
                  type="checkbox"
                  id="hasTerm"
                  checked={hasTerm}
                  onChange={(e) => {
                    setHasTerm(e.target.checked);
                    if (!e.target.checked) {
                      setEndMonth('');
                      setInstallments('');
                    } else if (startMonth && !endMonth) {
                      setInstallments('12');
                      setEndMonth(addMonths(startMonth, 12));
                    }
                  }}
                  className="rounded border-border w-4 h-4 text-primary focus:ring-primary cursor-pointer"
                />
              </div>

              {hasTerm && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/60">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-medium text-muted-foreground">Nº de Parcelas / Meses</Label>
                    <Input
                      type="number"
                      min="1"
                      value={installments}
                      onChange={(e) => handleInstallmentsChange(e.target.value)}
                      placeholder="Ex: 12"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-medium text-muted-foreground">Mês Final</Label>
                    <WalletMonthPicker value={endMonth} onChange={handleEndMonthChange} />
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDialogOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="text-xs font-semibold bg-primary text-primary-foreground"
              >
                {isSubmitting ? 'Salvando...' : editingId ? 'Atualizar Provisão' : 'Salvar Provisão'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
