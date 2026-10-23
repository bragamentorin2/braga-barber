import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExpenseItem } from "@/mocks/dashboardData";

interface ExpenseSummaryProps {
  expenses: ExpenseItem[];
}

export function ExpenseSummary({ expenses }: ExpenseSummaryProps) {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg">Despesas do Mês</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {expenses.map((expense) => (
            <div key={expense.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
              <span className="text-sm font-medium text-muted-foreground">{expense.category}</span>
              <span className="text-sm font-semibold">{formatCurrency(expense.amount)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
