import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  CheckCircle2, 
  X, 
  Tag, 
  FileText,
  Settings as SettingsIcon,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ExpenseProvision } from '@/types/finance';

interface CompanyProvisionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Dado um mês YYYY-MM e um número de parcelas, retorna o endMonthId (inclusivo)
function addMonths(startMonthId: string, count: number): string {
  const [y, m] = startMonthId.split('-').map(Number);
  const d = new Date(y, m - 1 + count - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Dado startMonthId e endMonthId, retorna quantas parcelas (inclusivo, mínimo 1)
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

export function CompanyProvisionsDialog({ open, onOpenChange }: CompanyProvisionsDialogProps) {
  const { 
    expenseProvisions, 
    expenseCategories, 
    addExpenseProvision, 
    updateExpenseProvision, 
    deleteExpenseProvision 
  } = useFinance();
  const { selectedMonthId } = useMonth();
  const navigate = useNavigate();

  // Estados do formulário
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

  const handleEditClick = (prov: ExpenseProvision) => {
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
        toast.success('Provisão da empresa atualizada com sucesso!');
      } else {
        await addExpenseProvision(
          categoryId,
          categoryName,
          cleanAmount,
          startMonth,
          finalEndMonth,
          description.trim() || undefined
        );
        toast.success('Provisão da empresa cadastrada com sucesso!');
      }
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
      if (editingId === prov.id) {
        resetForm();
      }
    }
  };

  // Ordena provisões: ativas primeiro
  const sortedProvisions = useMemo(() => {
    return [...expenseProvisions].sort((a, b) => b.startMonthId.localeCompare(a.startMonthId));
  }, [expenseProvisions]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-3xl max-h-[90vh] bg-[#080E16]/95 border-primary/30 backdrop-blur-2xl text-foreground shadow-2xl shadow-black/90 p-0 overflow-hidden rounded-2xl flex flex-col"
      >
        {/* CABEÇALHO */}
        <div className="p-4 sm:p-6 border-b border-white/10 bg-gradient-to-b from-primary/10 to-transparent shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shadow-lg shadow-primary/20 shrink-0">
                <CalendarClock className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                  Provisões de Despesas da Empresa (PJ)
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Planeje custos fixos e previsões mensais com inteligência. O valor é reservado no orçamento e abatido conforme lançamentos reais.
                </DialogDescription>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                navigate('/settings?tab=provisions');
              }}
              className="h-8 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10 self-start sm:self-auto shrink-0"
              title="Abrir gerenciador completo em Definições"
            >
              <SettingsIcon className="w-3.5 h-3.5" />
              <span>Gerenciar em Definições</span>
              <ExternalLink className="w-3 h-3 ml-0.5" />
            </Button>
          </div>
        </div>

        {/* CORPO COM SCROLLBAR AZUL FINA ELEGANTE */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 scrollbar-thin scrollbar-thumb-primary/40 scrollbar-track-transparent">
          
          {/* FORMULÁRIO DE CADASTRO / EDIÇÃO */}
          <form onSubmit={handleSubmit} className="p-4 rounded-xl border border-white/10 bg-background/50 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                {editingId ? <Pencil className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                {editingId ? 'Editar Provisão Existente' : 'Cadastrar Nova Provisão da Empresa'}
              </span>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-muted-foreground hover:text-foreground underline flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancelar Edição
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Categoria */}
              <div className="space-y-1.5">
                <Label htmlFor="provisionCategory" className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <Tag className="w-3 h-3 text-primary" />
                  Categoria de Despesa *
                </Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger id="provisionCategory" className="bg-background/80 border-white/10 text-sm">
                    <SelectValue placeholder="Selecione a categoria..." />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-white/10 scrollbar-thin scrollbar-thumb-primary/40 scrollbar-track-transparent">
                    {expenseCategories.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Descrição / Finalidade */}
              <div className="space-y-1.5">
                <Label htmlFor="provisionDescription" className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <FileText className="w-3 h-3 text-primary" />
                  Identificação / Finalidade (Opcional)
                </Label>
                <Input
                  id="provisionDescription"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Seguro Predial, Troca de Cadeiras, Reforma..."
                  className="bg-background/80 border-white/10 text-sm focus:border-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Valor Mensal */}
              <div className="space-y-1.5">
                <Label htmlFor="provisionAmount" className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <DollarSign className="w-3 h-3 text-emerald-400" />
                  Valor Mensal Previsto *
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold">R$</span>
                  <Input
                    id="provisionAmount"
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0,00"
                    required
                    className="bg-background/80 border-white/10 text-sm pl-9 font-semibold text-foreground focus:border-primary"
                  />
                </div>
              </div>

              {/* Mês Inicial */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">
                  Mês Inicial *
                </Label>
                <WalletMonthPicker value={startMonth} onChange={handleStartMonthChange} />
              </div>

              {/* Tipo de Duração */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">
                  Tipo de Duração
                </Label>
                <div className="flex rounded-lg border border-white/10 bg-background/60 p-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setHasTerm(false);
                      setInstallments('');
                      setEndMonth('');
                    }}
                    className={cn(
                      "flex-1 text-xs py-1.5 rounded-md font-medium transition-all",
                      !hasTerm ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Contínua
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setHasTerm(true);
                      if (!installments) {
                        setInstallments('6');
                        if (startMonth) setEndMonth(addMonths(startMonth, 6));
                      }
                    }}
                    className={cn(
                      "flex-1 text-xs py-1.5 rounded-md font-medium transition-all",
                      hasTerm ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Com Prazo
                  </button>
                </div>
              </div>
            </div>

            {/* SEÇÃO BIDIRECIONAL DE PRAZO DETERMINADO */}
            {hasTerm && (
              <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in duration-200">
                <div className="space-y-1.5">
                  <Label htmlFor="provisionInstallments" className="text-xs font-semibold text-primary">
                    Quantidade de Parcelas (Meses)
                  </Label>
                  <Input
                    id="provisionInstallments"
                    type="number"
                    min="1"
                    max="120"
                    value={installments}
                    onChange={(e) => handleInstallmentsChange(e.target.value)}
                    placeholder="Ex: 6, 12, 24..."
                    className="bg-background/80 border-white/10 text-sm font-semibold focus:border-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-primary">
                    Mês Final (Término)
                  </Label>
                  <WalletMonthPicker value={endMonth} onChange={handleEndMonthChange} />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs px-5 shadow-lg shadow-primary/20"
              >
                {editingId ? 'Salvar Alterações' : 'Adicionar Provisão'}
              </Button>
            </div>
          </form>

          {/* TABELA DE PROVISÕES CADASTRADAS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">
                  Provisões Cadastradas da Empresa ({expenseProvisions.length})
                </h3>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-background/40 overflow-hidden">
              <Table>
                <TableHeader className="bg-white/[0.02]">
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="font-semibold text-foreground text-xs">Finalidade / Categoria</TableHead>
                    <TableHead className="font-semibold text-foreground text-xs text-right">Valor Mensal</TableHead>
                    <TableHead className="font-semibold text-foreground text-xs text-center">Período de Validade</TableHead>
                    <TableHead className="font-semibold text-foreground text-xs text-right pr-4">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedProvisions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-10 text-muted-foreground text-xs">
                        Nenhuma provisão de despesa cadastrada para a empresa até o momento.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedProvisions.map((prov) => {
                      const isCurrentActive = 
                        selectedMonthId >= prov.startMonthId && 
                        (!prov.endMonthId || selectedMonthId <= prov.endMonthId);

                      return (
                        <TableRow 
                          key={prov.id}
                          className={cn(
                            "border-border hover:bg-muted/30 transition-colors",
                            editingId === prov.id && "bg-primary/10 border-primary/30"
                          )}
                        >
                          <TableCell className="py-3">
                            <div className="space-y-0.5">
                              <div className="text-sm font-bold text-foreground flex items-center gap-2">
                                {prov.description || prov.category}
                                {isCurrentActive && (
                                  <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded-full">
                                    Ativa no Mês
                                  </span>
                                )}
                              </div>
                              {prov.description && (
                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Tag className="w-3 h-3 text-muted-foreground/60" />
                                  Categoria: {prov.category}
                                </div>
                              )}
                            </div>
                          </TableCell>

                          <TableCell className="text-right font-mono font-bold text-sm text-foreground">
                            {formatCurrency(prov.monthlyAmount)}
                          </TableCell>

                          <TableCell className="text-center">
                            <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-white/[0.03] px-2.5 py-1 rounded-lg border border-white/5">
                              <span>{formatMonthLabel(prov.startMonthId)}</span>
                              <span>→</span>
                              <span>
                                {prov.endMonthId ? formatMonthLabel(prov.endMonthId) : 'Contínua'}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell className="text-right pr-4">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditClick(prov)}
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                title="Editar provisão"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(prov)}
                                className="h-8 w-8 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                                title="Excluir provisão"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        {/* RODAPÉ */}
        <div className="px-6 py-4 border-t border-white/10 bg-[#060B11] flex items-center justify-between shrink-0">
          <p className="text-xs text-muted-foreground">
            Dica do Consultor: Provisões bem calibradas protegem o fluxo de caixa contra oscilações de faturamento.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-white/10 text-xs text-muted-foreground hover:text-foreground"
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
