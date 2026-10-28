import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, ChevronLeft, ChevronRight } from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { toast } from "sonner";
import type { Expense } from "@/types/finance";

export function EditExpenseDialog({ expense }: { expense: Expense }) {
  const { updateExpense, shiftPLProvision, expenseCategories } = useFinance();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(expense.category);
  const [description, setDescription] = useState(expense.description || "");
  const [amount, setAmount] = useState(expense.amount ? expense.amount.toFixed(2).replace('.', ',') : "");
  const [date, setDate] = useState(expense.date || "");
  const [monthId, setMonthId] = useState(expense.monthId);
  const [saving, setSaving] = useState(false);

  const categories = useMemo(() => {
    if (expenseCategories && expenseCategories.length > 0) {
      return expenseCategories.map(c => c.name);
    }
    return [
      'Aluguel & Ponto Comercial',
      'Energia Elétrica (Luz)',
      'Água & Saneamento',
      'Insumos & Descartáveis',
      'Produtos & Cosméticos (Uso Interno)',
      'Manutenção de Equipamentos',
      'Taxas de Cartão & Maquininha',
      'DAS / MEI / Impostos',
      'Marketing & Divulgação',
      'Pró-Labore / Retirada',
    ];
  }, [expenseCategories]);

  const isPL = expense.id.startsWith("temp-pl-");
  const isProv = expense.id.startsWith("temp-prov-");

  const canGoPrev = () => {
    const [y, m] = monthId.split('-').map(Number);
    const now = new Date();
    const currentY = now.getFullYear();
    const currentM = now.getMonth() + 1;
    if (y > currentY) return true;
    if (y === currentY && m > currentM) return true;
    return false;
  };

  const handlePrevMonth = () => {
    if (!canGoPrev()) return;
    const [y, m] = monthId.split('-').map(Number);
    let ny = y, nm = m - 1;
    if (nm === 0) { ny--; nm = 12; }
    setMonthId(`${ny}-${String(nm).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [y, m] = monthId.split('-').map(Number);
    let ny = y, nm = m + 1;
    if (nm > 12) { ny++; nm = 1; }
    setMonthId(`${ny}-${String(nm).padStart(2, '0')}`);
  };

  const formatMonthDisplay = (mId: string) => {
    const [y, m] = mId.split('-');
    const dateObj = new Date(parseInt(y), parseInt(m) - 1, 1);
    const str = dateObj.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount.replace(",", "."));
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }
    setSaving(true);
    
    if (isPL && monthId !== expense.monthId) {
      // Usuário mudou o mês da provisão de PL
      const match = expense.id.match(/^temp-pl-(.+)-(\d{4}-\d{2})$/);
      const provId = match ? match[1] : expense.id;
      await shiftPLProvision(provId, expense.monthId, monthId, numAmount, description);
    } else {
      await updateExpense(expense.id, {
        category,
        description: description || undefined,
        amount: numAmount,
        date: date || undefined,
      });
    }
    
    setSaving(false);
    setOpen(false);
    toast.success(isProv ? "Provisão deste mês atualizada com sucesso!" : "Despesa atualizada com sucesso!");
  };

  const handleOpen = (v: boolean) => {
    if (v) {
      setCategory(expense.category);
      setDescription(expense.description || "");
      setAmount(expense.amount ? expense.amount.toFixed(2).replace('.', ',') : "");
      setDate(expense.date || "");
      setMonthId(expense.monthId);
    }
    setOpen(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted" title={isProv ? "Editar provisão neste mês" : "Editar"}>
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[420px] max-w-[95vw]">
        <DialogHeader>
          <DialogTitle>
            {isPL ? "Editar Provisão PL" : isProv ? `Editar Provisão (${formatMonthDisplay(expense.monthId)})` : "Editar Despesa"}
          </DialogTitle>
        </DialogHeader>

        {isProv && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 space-y-1">
            <p className="font-semibold text-amber-300">ℹ️ Efeito exclusivo para este mês</p>
            <p>
              Esta alteração será aplicada <strong>apenas em {formatMonthDisplay(expense.monthId)}</strong>. A configuração padrão da provisão continuará vigente nos demais meses.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {!isPL && (
            <div className="space-y-1">
              <Label>Categoria (Definições)</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60 scrollbar-thin scrollbar-thumb-primary/40 scrollbar-track-transparent">
                  {!categories.includes(category) && (
                    <SelectItem value={category}>{category}</SelectItem>
                  )}
                  {categories.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {isPL && (
            <div className="space-y-1">
              <Label>Mês de Retirada</Label>
              <div className="flex items-center justify-between border border-border/50 rounded-md p-1 bg-background/50">
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={handlePrevMonth} 
                  disabled={!canGoPrev()}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-medium text-sm">{formatMonthDisplay(monthId)}</span>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={handleNextMonth}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground pt-1">
                Alterar o mês deslocará todas as provisões futuras, mantendo as passadas intactas.
              </p>
            </div>
          )}
          <div className="space-y-1">
            <Label>Descricao (Opcional)</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Gasolina 10/09" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Valor</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">R$</span>
                <Input className="pl-9" placeholder="0,00" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Data</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
