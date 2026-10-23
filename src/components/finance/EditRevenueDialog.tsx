import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Pencil, Plus, Minus, DollarSign, Scissors, Package, Store, Sparkles } from 'lucide-react';
import { useFinance } from '@/contexts/FinanceContext';
import { useCatalogStore } from '@/store/useCatalogStore';
import { useBusinessProfile } from '@/contexts/BusinessProfileContext';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Revenue } from '@/types/finance';

export function EditRevenueDialog({ revenue }: { revenue: Revenue }) {
  const [open, setOpen] = useState(false);
  const { updateRevenue } = useFinance();
  const { services, products } = useCatalogStore();
  const { segment, terms } = useBusinessProfile();

  // Determina o tipo com base no itemType salvo
  const resolveMode = () => {
    if (revenue.itemType === 'product') return 'product';
    if (revenue.itemType === 'daily_batch') return 'daily';
    return 'service';
  };

  const [mode, setMode] = useState<'service' | 'product' | 'daily'>(resolveMode);
  const [selectedServiceId, setSelectedServiceId] = useState<string>(revenue.itemId || '');
  const [selectedProductId, setSelectedProductId] = useState<string>(revenue.itemId || '');
  const [quantity, setQuantity] = useState<number>(revenue.quantity ?? 1);
  const [date, setDate] = useState<string>(revenue.date || '');
  const [amountStr, setAmountStr] = useState<string>(
    revenue.amount ? revenue.amount.toFixed(2).replace('.', ',') : ''
  );
  const [clientCustomName, setClientCustomName] = useState<string>('');
  const [description, setDescription] = useState<string>(revenue.description || '');

  // Ao abrir o modal, reinicia os estados com os dados atuais da receita
  useEffect(() => {
    if (open) {
      const m = resolveMode();
      setMode(m);
      setSelectedServiceId(revenue.itemId || '');
      setSelectedProductId(revenue.itemId || '');
      setQuantity(revenue.quantity ?? 1);
      setDate(revenue.date || '');
      setAmountStr(revenue.amount ? revenue.amount.toFixed(2).replace('.', ',') : '');
      setDescription(revenue.description || '');
      setClientCustomName('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSelectService = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    const srv = services.find(s => s.id === serviceId);
    if (srv) {
      setAmountStr(String(srv.price * quantity));
      setDescription(srv.name);
    }
  };

  const handleSelectProduct = (productId: string) => {
    setSelectedProductId(productId);
    const prod = products.find(p => p.id === productId);
    if (prod) {
      setAmountStr(String(prod.salePrice * quantity));
      setDescription(prod.name);
    }
  };

  const handleQuantityChange = (newQty: number) => {
    const qty = Math.max(1, newQty);
    setQuantity(qty);
    if (mode === 'service' && selectedServiceId) {
      const srv = services.find(s => s.id === selectedServiceId);
      if (srv) setAmountStr(String(srv.price * qty));
    } else if (mode === 'product' && selectedProductId) {
      const prod = products.find(p => p.id === selectedProductId);
      if (prod) setAmountStr(String(prod.salePrice * qty));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amountStr.replace(',', '.')) || 0;

    if (numAmount <= 0) {
      toast.error('Informe um valor de faturamento maior que zero.');
      return;
    }

    let finalDesc = description.trim();
    let finalItemId: string | undefined;
    let finalItemType: Revenue['itemType'];

    if (mode === 'service') {
      if (!selectedServiceId) {
        toast.error('Selecione o serviço no catálogo.');
        return;
      }
      const srv = services.find(s => s.id === selectedServiceId);
      finalDesc = srv ? `${srv.name}${quantity > 1 ? ` (${quantity}x)` : ''}` : description;
      finalItemId = selectedServiceId;
      finalItemType = 'service';
    } else if (mode === 'product') {
      if (!selectedProductId) {
        toast.error('Selecione o produto no catálogo.');
        return;
      }
      const prod = products.find(p => p.id === selectedProductId);
      finalDesc = prod ? `${prod.name}${quantity > 1 ? ` (${quantity}x)` : ''}` : description;
      finalItemId = selectedProductId;
      finalItemType = 'product';
    } else {
      // daily_batch
      finalDesc = description.trim() || `Caixa do Dia (${date.split('-').reverse().slice(0, 2).join('/')})`;
      finalDesc = `${finalDesc} • ${quantity} atendimento${quantity > 1 ? 's' : ''}`;
      finalItemType = 'daily_batch';
    }

    // Acrescenta nome do cliente avulso na descrição se informado
    if (mode !== 'daily' && clientCustomName.trim()) {
      finalDesc = `${finalDesc} - ${clientCustomName.trim()}`;
    }

    await updateRevenue(revenue.id, {
      amount: numAmount,
      description: finalDesc,
      date: date || undefined,
      itemId: finalItemId,
      itemType: finalItemType,
      quantity,
    });

    toast.success('Receita atualizada com sucesso!');
    setOpen(false);
  };


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted text-muted-foreground">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[480px] p-6">
        <DialogHeader className="pb-3 border-b border-border">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            Editar Lançamento de Receita
          </DialogTitle>
        </DialogHeader>

        {/* Alternador de Tipo */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-muted/40 rounded-xl border border-border text-xs font-semibold my-2">
          <button
            type="button"
            onClick={() => setMode('daily')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${
              mode === 'daily'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            Caixa Diário
          </button>

          <button
            type="button"
            onClick={() => setMode('product')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${
              mode === 'product'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            {segment === 'barbershop' ? 'Pomada / Produto' : 'Cosmético'}
          </button>

          <button
            type="button"
            onClick={() => setMode('service')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${
              mode === 'service'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {segment === 'barbershop' ? <Scissors className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
            {segment === 'barbershop' ? 'Corte / Barba' : 'Procedimento'}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* MODO SERVIÇO */}
          {mode === 'service' && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  {terms?.serviceSingle ?? 'Serviço'} *
                </Label>
                <Select value={selectedServiceId} onValueChange={handleSelectService}>
                  <SelectTrigger className="bg-muted/20 border-border">
                    <SelectValue placeholder="Selecione no catálogo" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[220px] overflow-y-auto scrollbar-thin scrollbar-thumb-primary/40 scrollbar-track-transparent">
                    {services.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex items-center justify-between gap-4 w-full">
                          <span>{s.name}</span>
                          <strong className="text-emerald-400">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(s.price)}
                          </strong>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Quantidade</Label>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0"
                      onClick={() => handleQuantityChange(quantity - 1)}>
                      <Minus className="w-3.5 h-3.5" />
                    </Button>
                    <Input
                      type="number" min="1"
                      className="text-center font-bold h-9"
                      value={quantity}
                      onChange={e => handleQuantityChange(parseInt(e.target.value, 10) || 1)}
                    />
                    <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0"
                      onClick={() => handleQuantityChange(quantity + 1)}>
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Data do Atendimento</Label>
                  <Input type="date" value={date} onChange={e => setDate(e.target.value)}
                    className="h-9 bg-muted/20 border-border" />
                </div>
              </div>
            </div>
          )}

          {/* MODO PRODUTO */}
          {mode === 'product' && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  {terms?.productSingle ?? 'Produto'} *
                </Label>
                <Select value={selectedProductId} onValueChange={handleSelectProduct}>
                  <SelectTrigger className="bg-muted/20 border-border">
                    <SelectValue placeholder="Selecione no catálogo" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[220px] overflow-y-auto scrollbar-thin scrollbar-thumb-primary/40 scrollbar-track-transparent">
                    {products.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        <div className="flex items-center justify-between gap-4 w-full">
                          <span>{p.name}</span>
                          <strong className="text-emerald-400">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.salePrice)}
                          </strong>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Quantidade</Label>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0"
                      onClick={() => handleQuantityChange(quantity - 1)}>
                      <Minus className="w-3.5 h-3.5" />
                    </Button>
                    <Input
                      type="number" min="1"
                      className="text-center font-bold h-9"
                      value={quantity}
                      onChange={e => handleQuantityChange(parseInt(e.target.value, 10) || 1)}
                    />
                    <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0"
                      onClick={() => handleQuantityChange(quantity + 1)}>
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Data da Venda</Label>
                  <Input type="date" value={date} onChange={e => setDate(e.target.value)}
                    className="h-9 bg-muted/20 border-border" />
                </div>
              </div>
            </div>
          )}

          {/* MODO CAIXA DIÁRIO */}
          {mode === 'daily' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Data do Caixa *</Label>
                  <Input type="date" value={date} onChange={e => setDate(e.target.value)}
                    className="h-9 bg-muted/20 border-border" required />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Identificação</Label>
                  <Input
                    placeholder="Ex: Caixa de Sexta..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="h-9 bg-muted/20 border-border"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-foreground">Nº de Atendimentos / Cortes *</Label>
                  <span className="text-[10px] text-muted-foreground">Alimenta metas e ticket médio</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0"
                    onClick={() => handleQuantityChange(quantity - 1)}>
                    <Minus className="w-3.5 h-3.5" />
                  </Button>
                  <Input
                    type="number" min="1"
                    className="text-center font-bold h-9 bg-muted/20 border-border"
                    value={quantity}
                    onChange={e => handleQuantityChange(parseInt(e.target.value, 10) || 1)}
                  />
                  <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0"
                    onClick={() => handleQuantityChange(quantity + 1)}>
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* VALOR */}
          <div className="space-y-1.5 pt-1">
            <Label className="text-xs font-semibold text-foreground">Valor Total do Faturamento (R$) *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-semibold">R$</span>
              <Input
                placeholder="0,00"
                inputMode="decimal"
                value={amountStr}
                onChange={e => setAmountStr(e.target.value)}
                className="pl-9 text-base font-bold text-emerald-400 bg-muted/20 border-border"
                required
              />
            </div>
          </div>

          {/* NOME DO CLIENTE (opcional, apenas para serviço/produto) */}
          {mode !== 'daily' && (
            <div className="space-y-1.5 pt-1 border-t border-border/40">
              <div className="flex justify-between items-center text-xs">
                <Label className="text-muted-foreground">Nome do Cliente (Opcional)</Label>
                <span className="text-[10px] text-muted-foreground">Pode deixar em branco</span>
              </div>
              <Input
                placeholder="Ex: Carlos, João ou Cliente Avulso..."
                value={clientCustomName}
                onChange={e => setClientCustomName(e.target.value)}
                className="h-9 text-xs bg-muted/10 border-border"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-primary text-primary-foreground font-semibold">
              Salvar Alterações
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
