import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pencil, User, Phone, DollarSign, Calendar, FileText } from 'lucide-react';
import { useFinance } from '@/contexts/FinanceContext';
import type { Client } from '@/types/finance';
import { toast } from 'sonner';
import { MIN_MONTH } from '@/contexts/MonthContext';
import { MonthYearPicker } from '@/components/ui/MonthYearPicker';

function parseBRL(raw: string): number {
  const cleaned = raw.replace(/[R$\s.]/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

function CurrencyInput({
  id,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [display, setDisplay] = useState(() => {
    const n = parseFloat(value);
    return isNaN(n) || n === 0 ? '' : n.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  });

  useEffect(() => {
    const n = parseFloat(value);
    setDisplay(isNaN(n) || n === 0 ? '' : n.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
  }, [value]);

  const handleBlur = () => {
    const n = parseBRL(display);
    if (!isNaN(n) && n > 0) {
      setDisplay(n.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
      onChange(String(n));
    } else {
      setDisplay('');
      onChange('');
    }
  };

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">R$</span>
      <Input
        id={id}
        type="text"
        inputMode="decimal"
        className="pl-9"
        placeholder={placeholder || '0,00'}
        value={display}
        onChange={(e) => setDisplay(e.target.value)}
        onBlur={handleBlur}
      />
    </div>
  );
}

export function EditClientDialog({ client }: { client: Client }) {
  const [open, setOpen] = useState(false);
  const { updateClient, clientContracts, updateClientContract, addClientContract } = useFinance();

  const now = new Date();
  const currentMonthId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const defaultStart = currentMonthId >= MIN_MONTH ? currentMonthId : MIN_MONTH;

  // Busca o contrato mais recente do cliente, se houver
  const latestContract = clientContracts
    .filter((c) => c.clientId === client.id)
    .sort((a, b) => b.startMonthId.localeCompare(a.startMonthId))[0];

  const [name, setName] = useState(client.name);
  const [phone, setPhone] = useState(client.phone || '');
  const [amount, setAmount] = useState(latestContract ? String(latestContract.amount) : client.defaultBaseValue ? String(client.defaultBaseValue) : '');
  const [startMonth, setStartMonth] = useState(latestContract?.startMonthId || defaultStart);
  const [isGross, setIsGross] = useState(latestContract?.isGross ?? true);
  const [taxPercentage, setTaxPercentage] = useState(latestContract ? String(latestContract.taxPercentage) : '8.9');
  const [notes, setNotes] = useState(client.notes || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setName(client.name);
      setPhone(client.phone || '');
      setAmount(latestContract ? String(latestContract.amount) : client.defaultBaseValue ? String(client.defaultBaseValue) : '');
      setStartMonth(latestContract?.startMonthId || defaultStart);
      setIsGross(latestContract?.isGross ?? true);
      setTaxPercentage(latestContract ? String(latestContract.taxPercentage) : '8.9');
      setNotes(client.notes || '');
    }
  }, [open, client, latestContract]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Informe o nome do cliente.');
      return;
    }

    setLoading(true);

    try {
      const numAmount = parseFloat(amount) || 0;
      const numTax = parseFloat(taxPercentage) || 0;

      await updateClient(client.id, {
        name: name.trim(),
        defaultBaseValue: numAmount,
        phone: phone.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      if (numAmount > 0) {
        if (latestContract) {
          await updateClientContract(latestContract.id, {
            amount: numAmount,
            startMonthId: startMonth,
            isGross,
            taxPercentage: isGross ? numTax : 0,
          });
        } else {
          await addClientContract({
            clientId: client.id,
            amount: numAmount,
            startMonthId: startMonth,
            isGross,
            taxPercentage: isGross ? numTax : 0,
          });
        }
      }

      toast.success('Cliente atualizado com sucesso!');
      setOpen(false);
    } catch {
      toast.error('Erro ao atualizar cliente.');
    } finally {
      setLoading(false);
    }
  };

  const numAmount = parseFloat(amount) || 0;
  const numTax = parseFloat(taxPercentage) || 0;
  const taxValue = isGross && numTax > 0 ? Math.round(numAmount * (numTax / 100) * 100) / 100 : 0;
  const netValue = numAmount - taxValue;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted text-muted-foreground">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px] p-6 max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-primary/40 scrollbar-track-transparent">
        <DialogHeader className="pb-2 border-b border-border">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Editar Cliente
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-3">
          <div className="space-y-1.5">
            <Label htmlFor="edit-client-name" className="text-sm font-medium">Nome do Cliente / Empresa *</Label>
            <Input
              id="edit-client-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-client-phone" className="text-sm font-medium flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-muted-foreground" />
              Telefone / WhatsApp (Opcional)
            </Label>
            <Input
              id="edit-client-phone"
              placeholder="(00) 00000-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-4">
            <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              Faturamento / Mensalidade
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-client-amount" className="text-xs text-muted-foreground">
                Valor Base / Recorrente
              </Label>
              <CurrencyInput
                id="edit-client-amount"
                value={amount}
                onChange={setAmount}
                placeholder="0,00"
              />
            </div>

            {numAmount > 0 && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <label
                    className={`flex items-center justify-center py-2 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                      isGross
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="edit-client-gross-toggle"
                      checked={isGross}
                      onChange={() => setIsGross(true)}
                      className="sr-only"
                    />
                    Faturamento Bruto
                  </label>
                  <label
                    className={`flex items-center justify-center py-2 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                      !isGross
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="edit-client-gross-toggle"
                      checked={!isGross}
                      onChange={() => setIsGross(false)}
                      className="sr-only"
                    />
                    Faturamento Líquido
                  </label>
                </div>

                {isGross && (
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-client-tax" className="text-xs text-muted-foreground">
                      % Imposto Estimado (ex: Simples Nacional)
                    </Label>
                    <div className="relative">
                      <Input
                        id="edit-client-tax"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={taxPercentage}
                        onChange={(e) => setTaxPercentage(e.target.value)}
                        className="pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">%</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs px-2 py-1.5 rounded-lg bg-background/60 border border-border">
                  <span className="text-muted-foreground">
                    Imposto: <strong className="text-destructive/80">{taxValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
                  </span>
                  <span className="text-muted-foreground">
                    Líquido: <strong className="text-emerald-400">{netValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
                  </span>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Mês de Início da Cobrança
                  </Label>
                  <MonthYearPicker
                    value={startMonth}
                    onChange={setStartMonth}
                    minMonth={MIN_MONTH}
                  />
                </div>
              </>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-client-notes" className="text-sm font-medium flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-muted-foreground" />
              Observações (Opcional)
            </Label>
            <Input
              id="edit-client-notes"
              placeholder="Ex: Pagamento todo dia 10 / Contrato trimestral"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="bg-primary text-primary-foreground">
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
