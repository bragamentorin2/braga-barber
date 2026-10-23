import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, Plus, Trash2 } from 'lucide-react';
import { useFinance } from '@/contexts/FinanceContext';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Client } from '@/types/finance';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MonthYearPicker, monthIdToLabel } from '@/components/ui/MonthYearPicker';
import { MIN_MONTH } from '@/contexts/MonthContext';

export function ManageContractsDialog({ client }: { client: Client }) {
  const [open, setOpen] = useState(false);
  const { clientContracts, addClientContract, deleteClientContract } = useFinance();

  const now = new Date();
  const currentMonthId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [isAdding, setIsAdding] = useState(false);
  const [newAmount, setNewAmount] = useState('');
  const [newMonthId, setNewMonthId] = useState(currentMonthId >= MIN_MONTH ? currentMonthId : MIN_MONTH);
  const [isGross, setIsGross] = useState(true);
  const [taxPercentage, setTaxPercentage] = useState('8.9');

  const contracts = clientContracts
    .filter(c => c.clientId === client.id)
    .sort((a, b) => b.startMonthId.localeCompare(a.startMonthId));

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(newAmount);
    const numTax = parseFloat(taxPercentage);

    if (isNaN(amount) || amount <= 0) {
      toast.error('Informe um valor válido.');
      return;
    }

    if (isGross && (isNaN(numTax) || numTax < 0)) {
      toast.error('Informe um percentual de imposto válido.');
      return;
    }

    if (contracts.some(c => c.startMonthId === newMonthId)) {
      toast.error('Já existe um reajuste cadastrado para este mês neste cliente.');
      return;
    }

    await addClientContract({
      clientId: client.id,
      amount,
      startMonthId: newMonthId,
      isGross,
      taxPercentage: isGross ? numTax : 0,
    });

    toast.success('Atualização contratual salva com sucesso!');
    setIsAdding(false);
    setNewAmount('');
    setNewMonthId(currentMonthId >= MIN_MONTH ? currentMonthId : MIN_MONTH);
    setIsGross(true);
    setTaxPercentage('8.9');
  };

  const handleDelete = async (id: string, monthId: string) => {
    if (window.confirm(`Excluir atualização contratual de ${monthIdToLabel(monthId)}?`)) {
      await deleteClientContract(id);
      toast.success('Atualização contratual excluída com sucesso!');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-muted text-muted-foreground"
          title="Histórico de contratos e reajustes"
        >
          <FileText className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 leading-tight">
            <span>Contratos e Reajustes</span>
            <span className="text-sm sm:text-lg text-primary">— {client.name}</span>
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:-mt-2">
          Registre o valor inicial do contrato e futuras atualizações (aditivos). O sistema aplica automaticamente o valor vigente em cada mês.
        </p>

        <div className="space-y-4 pt-2">
          {!isAdding ? (
            <div className="flex justify-end">
              <Button onClick={() => setIsAdding(true)} size="sm" className="w-full sm:w-auto">
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Nova Atualização Contratual</span>
                <span className="sm:hidden ml-2">Nova Atualização</span>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleAddSubmit} className="space-y-4 border p-4 rounded-md bg-muted/20">
              <h4 className="font-medium text-sm">Adicionar Atualização / Aditivo</h4>

                <div className="space-y-2">
                  <Label>Mês de Vigência a partir de</Label>
                  <MonthYearPicker value={newMonthId} onChange={setNewMonthId} />
                </div>

              <div className="space-y-2">
                <Label htmlFor="new-amount">Novo Valor Mensal (R$)</Label>
                <Input
                  id="new-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="Ex: 4950.00"
                  value={newAmount}
                  onChange={e => setNewAmount(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label
                  className={`flex flex-col items-center justify-center p-3 rounded-md border-2 cursor-pointer transition-colors ${
                    isGross
                      ? 'border-green-500 bg-green-500/10 text-green-700 dark:text-green-400'
                      : 'border-muted bg-transparent hover:bg-muted text-muted-foreground'
                  }`}
                >
                  <input
                    type="radio"
                    name="revenueTypeManage"
                    checked={isGross}
                    onChange={() => setIsGross(true)}
                    className="sr-only"
                  />
                  <span className="font-medium text-sm text-center">Faturamento Bruto</span>
                </label>
                <label
                  className={`flex flex-col items-center justify-center p-3 rounded-md border-2 cursor-pointer transition-colors ${
                    !isGross
                      ? 'border-green-500 bg-green-500/10 text-green-700 dark:text-green-400'
                      : 'border-muted bg-transparent hover:bg-muted text-muted-foreground'
                  }`}
                >
                  <input
                    type="radio"
                    name="revenueTypeManage"
                    checked={!isGross}
                    onChange={() => setIsGross(false)}
                    className="sr-only"
                  />
                  <span className="font-medium text-sm text-center">Faturamento Líquido</span>
                </label>
              </div>

              {isGross && (
                <div className="space-y-2">
                  <Label htmlFor="tax-percentage">Alíquota de Imposto (%)</Label>
                  <Input
                    id="tax-percentage"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    placeholder="Ex: 8.9"
                    value={taxPercentage}
                    onChange={e => setTaxPercentage(e.target.value)}
                    required={isGross}
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsAdding(false)}>
                  Cancelar
                </Button>
                <Button type="submit" size="sm">Salvar</Button>
              </div>
            </form>
          )}

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs sm:text-sm">Vigência a partir de</TableHead>
                  <TableHead className="text-right text-xs sm:text-sm">Valor Mensal</TableHead>
                  <TableHead className="text-right text-xs sm:text-sm hidden sm:table-cell">Tipo / Imposto</TableHead>
                  <TableHead className="w-[40px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground h-24">
                      Nenhum contrato cadastrado para este cliente.
                    </TableCell>
                  </TableRow>
                ) : (
                  contracts.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium text-xs sm:text-sm py-2">{monthIdToLabel(c.startMonthId)}</TableCell>
                      <TableCell className="text-right text-xs sm:text-sm py-2">
                        {formatCurrency(c.amount)}
                        {/* No mobile, exibe o tipo de imposto abaixo do valor */}
                        <div className="sm:hidden text-[10px] text-muted-foreground mt-0.5">
                          {c.isGross ? `Bruto (${c.taxPercentage}%)` : 'Líquido'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm py-2 hidden sm:table-cell">
                        {c.isGross ? `Bruto (${c.taxPercentage}%)` : 'Líquido'}
                      </TableCell>
                      <TableCell className="py-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(c.id, c.startMonthId)}
                          title="Excluir esta atualização contratual"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
