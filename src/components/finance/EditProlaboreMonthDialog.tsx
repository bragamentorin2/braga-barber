// ============================================================
// Dialog: Editar Prolabore de um unico mes
// Cria/atualiza uma despesa real categoria FP com o nome do
// parceiro, substituindo a projecao virtual deste mes.
// Reflete automaticamente na Carteira Pessoal via espelho existente.
// ============================================================
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Pencil } from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { toast } from "sonner";

interface Props {
  monthId: string;
  partnerName: string;
  currentAmount: number;
  existingExpenseId?: string; // preenchido se ja existe override real
}

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export function EditProlaboreMonthDialog({ monthId, partnerName, currentAmount, existingExpenseId }: Props) {
  const { addExpense, updateExpense } = useFinance();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(currentAmount.toFixed(2).replace(".", ","));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const val = parseFloat(amount.replace(/[R$\s.]/g, "").replace(",", "."));
    if (isNaN(val) || val < 0) { toast.error("Informe um valor valido."); return; }
    setSaving(true);
    try {
      if (existingExpenseId) {
        // Atualiza o lancamento real existente
        await updateExpense(existingExpenseId, { amount: val });
        toast.success("Pro-labore do mes atualizado!");
      } else {
        // Cria lancamento real que substitui a projecao virtual
        await addExpense({
          monthId,
          category: "FP",
          description: partnerName,
          amount: val,
        });
        toast.success("Override de pro-labore criado para este mes!");
      }
      setOpen(false);
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    }
    setSaving(false);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
        title="Editar pro-labore deste mes"
        onClick={() => { setAmount(currentAmount.toFixed(2).replace(".", ",")); setOpen(true); }}
      >
        <Pencil className="w-3 h-3" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-4 h-4 text-primary" />
              Editar Pro-labore: {monthId}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-300/90 space-y-1">
                <p className="font-medium">Ajuste pontual deste mes</p>
                <p>Este valor substitui a projecao automatica <strong>somente para {monthId}</strong>. A provisao base nao sera alterada. A alteracao reflete automaticamente na Carteira Pessoal.</p>
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              Parceiro: <span className="font-medium text-foreground">{partnerName}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Valor atual: <span className="font-medium text-foreground">{fmt(currentAmount)}</span>
            </div>

            <div>
              <Label>Novo Valor do Pro-labore (R$)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                <Input
                  className="pl-9"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0,00"
                  inputMode="decimal"
                  autoFocus
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Salvar Ajuste"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
