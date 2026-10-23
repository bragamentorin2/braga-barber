import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { WalletMonthPicker } from "@/components/ui/WalletMonthPicker";
import { toast } from "sonner";

function formatMonthId(monthId: string) {
  const [year, month] = monthId.split("-");
  const d = new Date(parseInt(year), parseInt(month) - 1, 1);
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

const formatCurrency = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export function ExpenseProvisionsList() {
  const { expenseProvisions, expenseCategories, addExpenseProvision, deleteExpenseProvision } = useFinance();
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [startMonth, setStartMonth] = useState("");

  const handleAdd = async () => {
    if (!categoryId || !startMonth) {
      toast.error("Preencha categoria e mês inicial.");
      return;
    }
    const numAmount = parseFloat(amount.replace(",", "."));
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }
    
    const selectedCat = expenseCategories.find(c => c.id === categoryId);
    if (!selectedCat) return;

    await addExpenseProvision(categoryId, selectedCat.name, numAmount, startMonth);
    toast.success("Provisão adicionada com sucesso!");
    setCategoryId("");
    setAmount("");
    setStartMonth("");
  };

  return (
    <Card className="mt-8 border-none bg-black/40 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="text-xl">Provisões de Despesas</CardTitle>
        <CardDescription>
          Configure despesas previstas (ex: Gasolina). O sistema reservará este valor todo mês.
          Ao lançar uma despesa real desta categoria, o valor real será descontado da provisão.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-4 items-end rounded-lg border border-white/10 p-4 bg-white/5">
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium">Categoria</label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {expenseCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="w-[200px] space-y-2">
            <label className="text-sm font-medium">Valor Mensal</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">R$</span>
              <Input className="pl-9" placeholder="0,00" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
          </div>
          <div className="w-[220px] space-y-2">
            <label className="text-sm font-medium">Mês Inicial</label>
            <WalletMonthPicker value={startMonth} onChange={setStartMonth} />
          </div>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" /> Adicionar Provisão
          </Button>
        </div>

        <div className="rounded-md border border-white/10 bg-black/50 overflow-hidden">
          <Table>
            <TableHeader className="bg-white/5">
              <TableRow>
                <TableHead>Categoria</TableHead>
                <TableHead>Valor Mensal</TableHead>
                <TableHead>Início</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenseProvisions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Nenhuma provisão configurada.
                  </TableCell>
                </TableRow>
              ) : (
                expenseProvisions.map(prov => (
                  <TableRow key={prov.id}>
                    <TableCell className="font-medium">{prov.category}</TableCell>
                    <TableCell className="text-amber-500">{formatCurrency(prov.monthlyAmount)}</TableCell>
                    <TableCell className="capitalize">{formatMonthId(prov.startMonthId)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => deleteExpenseProvision(prov.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
