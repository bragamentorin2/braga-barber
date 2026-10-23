import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, AlertTriangle, TrendingDown } from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface AddExpenseDialogProps {
  monthId: string;
  defaultDate?: string;
  buttonVariant?: "default" | "outline" | "secondary" | "ghost";
  buttonSize?: "default" | "sm" | "lg" | "icon";
  buttonLabel?: string;
  className?: string;
}

const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export function AddExpenseDialog({
  monthId,
  defaultDate,
  buttonVariant = "outline",
  buttonSize = "sm",
  buttonLabel = "Adicionar Despesa",
  className,
}: AddExpenseDialogProps) {
  const { addExpense, getProvisionInfo, zeroProvisionForMonth, expenseCategories } = useFinance();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  // Calcula a data padrão para o lançamento
  const computeInitialDate = () => {
    if (defaultDate) return defaultDate;
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const currentMonthPrefix = `${y}-${m}`;
    return currentMonthPrefix === monthId ? `${y}-${m}-${d}` : `${monthId}-01`;
  };

  const [date, setDate] = useState<string>(computeInitialDate());

  // Lista de categorias sincronizada com o menu Definições
  const categories = useMemo(() => {
    if (expenseCategories && expenseCategories.length > 0) {
      return expenseCategories;
    }
    const storageKey = `braga_mentoring_expense_categories_${user?.id || 'demo'}`;
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return [
      { id: '1', name: 'Aluguel & Ponto Comercial', observation: '' },
      { id: '2', name: 'Energia Elétrica (Luz)', observation: '' },
      { id: '3', name: 'Água & Saneamento', observation: '' },
      { id: '4', name: 'Insumos & Descartáveis', observation: '' },
      { id: '5', name: 'Produtos & Cosméticos (Uso Interno)', observation: '' },
      { id: '6', name: 'Manutenção de Equipamentos', observation: '' },
      { id: '7', name: 'Taxas de Cartão & Maquininha', observation: '' },
      { id: '8', name: 'DAS / MEI / Impostos', observation: '' },
      { id: '9', name: 'Marketing & Divulgação', observation: '' },
      { id: '10', name: 'Pró-Labore / Retirada', observation: '' },
    ];
  }, [expenseCategories, user]);

  useEffect(() => {
    if (open) {
      setDate(computeInitialDate());
    }
  }, [open, monthId, defaultDate]);

  const handleCategoryChange = (value: string) => {
    setCategory(value);
    const cat = categories.find(c => c.name === value);
    if (cat?.observation && !description) {
      setDescription(cat.observation);
    }
  };

  const numAmount = parseFloat(amount.replace(",", ".")) || 0;
  const provInfo = category ? getProvisionInfo(category, monthId) : null;
  const afterLaunch = provInfo ? Math.max(0, provInfo.remaining - numAmount) : null;

  const handleClose = () => {
    setCategory("");
    setDescription("");
    setAmount("");
    setDate(computeInitialDate());
    setOpen(false);
  };

  const handleSubmit = async (zero: boolean) => {
    if (!category) {
      toast.error("Selecione uma categoria de despesa.");
      return;
    }
    if (numAmount <= 0) {
      toast.error("Informe um valor de despesa maior que zero.");
      return;
    }
    setSaving(true);
    await addExpense({
      monthId,
      category,
      description: description.trim() || undefined,
      amount: numAmount,
      date,
    });

    if (zero && provInfo) {
      await zeroProvisionForMonth(provInfo.provision.id, monthId);
      toast.success("Despesa lançada e provisão zerada para este mês!");
    } else {
      toast.success("Despesa registrada com sucesso!");
    }
    setSaving(false);
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); else setOpen(true); }}>
      <DialogTrigger asChild>
        <Button size={buttonSize} variant={buttonVariant} className={className}>
          <Plus className="mr-1.5 h-4 w-4" />
          {buttonLabel}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader className="pb-2 border-b border-border">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-destructive" />
            Lançar Despesa
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Categoria alimentada das Definições */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Categoria (Definições)</Label>
            <Select value={category || undefined} onValueChange={handleCategoryChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a categoria cadastrada..." />
              </SelectTrigger>
              <SelectContent className="max-h-60 scrollbar-thin scrollbar-thumb-primary/40 scrollbar-track-transparent">
                {categories.map((c) => (
                  <SelectItem key={c.id || c.name} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Descrição / Observação (Opcional)</Label>
            <Input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Ex: Conta de Luz Ref. Setembro, Lâminas Feather..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Valor</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">R$</span>
                <Input
                  className="pl-9 font-semibold text-destructive"
                  placeholder="0,00"
                  inputMode="decimal"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Data</Label>
              <Input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>
          </div>

          {/* Aviso inteligente de Provisão */}
          {provInfo && numAmount > 0 && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-amber-500 font-bold">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Provisão cadastrada para {category}</span>
              </div>
              <div className="space-y-1 text-muted-foreground">
                <div className="flex justify-between">
                  <span>Provisão mensal estimada:</span>
                  <span className="font-semibold text-foreground">{fmt(provInfo.provision.monthlyAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Já realizado este mês:</span>
                  <span className="font-semibold text-destructive">{fmt(provInfo.realTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Saldo disponível:</span>
                  <span className="font-semibold text-primary">{fmt(provInfo.remaining)}</span>
                </div>
                <div className="border-t border-border/60 pt-1 flex justify-between font-bold text-foreground">
                  <span>Saldo após este lançamento:</span>
                  <span className={afterLaunch === 0 ? "text-muted-foreground" : "text-emerald-400"}>
                    {fmt(afterLaunch ?? 0)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-2">
            {provInfo && numAmount > 0 ? (
              <>
                <Button onClick={() => handleSubmit(false)} disabled={saving} className="w-full">
                  {saving ? "Salvando..." : "Lançar e manter saldo de provisão"}
                </Button>
                <Button
                  onClick={() => handleSubmit(true)}
                  disabled={saving}
                  variant="outline"
                  className="w-full border-amber-500/50 text-amber-500 hover:bg-amber-500/10"
                >
                  {saving ? "Salvando..." : "Lançar e ZERAR provisão deste mês"}
                </Button>
              </>
            ) : (
              <Button onClick={() => handleSubmit(false)} disabled={saving} className="w-full bg-primary text-primary-foreground font-semibold">
                {saving ? "Salvando..." : "Confirmar Lançamento de Despesa"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
