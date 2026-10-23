import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Expense } from '@/types/finance';

interface HistoryMonthExpensesDialogProps {
  monthLabel: string;
  expenses: Expense[];
  totalValue: number;
}

export function HistoryMonthExpensesDialog({ monthLabel, expenses, totalValue }: HistoryMonthExpensesDialogProps) {
  const [open, setOpen] = useState(false);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="text-red-500 font-medium hover:underline underline-offset-2 transition-all">
          {formatCurrency(totalValue)}
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Despesas e Deduções - {monthLabel}</DialogTitle>
        </DialogHeader>

        <div className="rounded-md border border-border mt-4">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Categoria</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                    Nenhuma despesa registrada neste mês.
                  </TableCell>
                </TableRow>
              ) : (
                expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="font-medium">{expense.category}</TableCell>
                    <TableCell className="text-muted-foreground">{expense.description}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {expense.category === 'FP' || expense.id.startsWith('prov-') || expense.id.startsWith('temp-')
                        ? <span className="text-xs uppercase bg-muted px-2 py-0.5 rounded text-muted-foreground">Auto</span>
                        : <span className="text-xs uppercase px-2 py-0.5 rounded text-muted-foreground">Manual</span>}
                    </TableCell>
                    <TableCell className="text-right text-red-500 font-medium">
                      {formatCurrency(expense.amount)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
