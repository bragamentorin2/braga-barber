import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import { useFinance } from '@/contexts/FinanceContext';
import { toast } from 'sonner';

const formSchema = z.object({
  balance: z.string().min(1, 'Informe o valor do saldo'),
});

type FormValues = z.infer<typeof formSchema>;

export function SetInitialBalanceDialog({ monthId, currentBalance }: { monthId: string, currentBalance: number }) {
  const [open, setOpen] = useState(false);
  const { updateInitialBalance } = useFinance();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      balance: currentBalance ? currentBalance.toFixed(2).replace('.', ',') : '0,00',
    },
  });

  useEffect(() => {
    form.reset({ balance: currentBalance ? currentBalance.toFixed(2).replace('.', ',') : '0,00' });
  }, [currentBalance, form]);

  async function onSubmit(values: FormValues) {
    const numBalance = parseFloat(values.balance.replace(',', '.')) || 0;
    await updateInitialBalance(monthId, numBalance);
    setOpen(false);
    toast.success('Saldo inicial atualizado!');
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6 ml-2 text-muted-foreground hover:text-foreground">
          <Pencil className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Definir Saldo Inicial</DialogTitle>
        </DialogHeader>
        <div className="text-sm text-muted-foreground mb-4">
          O saldo inicial só deve ser editado manualmente para o primeiro mês de uso do sistema. 
          Os meses seguintes irão herdar o saldo final do mês anterior automaticamente.
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="balance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor do Saldo</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">R$</span>
                      <Input className="pl-9" placeholder="0,00" inputMode="decimal" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end pt-4">
              <Button type="submit">Guardar</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
