import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Minus, DollarSign, Scissors, Package, Calendar, User, Sparkles, Store } from 'lucide-react';
import { useFinance } from '@/contexts/FinanceContext';
import { useCatalogStore } from '@/store/useCatalogStore';
import { useBusinessProfile } from '@/contexts/BusinessProfileContext';
import { toast } from 'sonner';

interface AddRevenueDialogProps {
  monthId: string;
  defaultDate?: string;
  buttonVariant?: "default" | "outline" | "secondary" | "ghost";
  buttonSize?: "default" | "sm" | "lg" | "icon";
  buttonLabel?: string;
  className?: string;
}

export function AddRevenueDialog({
  monthId,
  defaultDate,
  buttonVariant = "default",
  buttonSize = "sm",
  buttonLabel = "Lançar Receita",
  className,
}: AddRevenueDialogProps) {
  const [open, setOpen] = useState(false);
  const { clients, addRevenue } = useFinance();
  const { services, products } = useCatalogStore();
  const { segment, terms } = useBusinessProfile();

  const [mode, setMode] = useState<'service' | 'product' | 'daily' | 'custom'>('daily');

  // Campos do formulário
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
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [clientId, setClientId] = useState<string>('');
  const [clientCustomName, setClientCustomName] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [amountStr, setAmountStr] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [taxStr, setTaxStr] = useState<string>('0,00');

  // Ao selecionar um serviço
  const handleSelectService = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    const srv = services.find(s => s.id === serviceId);
    if (srv) {
      setAmountStr(String(srv.price * quantity));
      setDescription(srv.name);
    }
  };

  // Ao selecionar um produto
  const handleSelectProduct = (productId: string) => {
    setSelectedProductId(productId);
    const prod = products.find(p => p.id === productId);
    if (prod) {
      setAmountStr(String(prod.salePrice * quantity));
      setDescription(prod.name);
    }
  };

  // Ajuste de quantidade
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

  const resetForm = () => {
    setSelectedServiceId('');
    setSelectedProductId('');
    setClientId('');
    setClientCustomName('');
    setQuantity(1);
    setAmountStr('');
    setDescription('');
    setTaxStr('0,00');
    setDate(computeInitialDate());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amountStr.replace(',', '.')) || 0;
    const numTax = parseFloat(taxStr.replace(',', '.')) || 0;

    if (numAmount <= 0) {
      toast.error('Informe um valor de faturamento maior que zero.');
      return;
    }

    if (mode === 'service' && !selectedServiceId) {
      toast.error('Selecione o serviço no catálogo para garantir a consistência das metas.');
      return;
    }

    if (mode === 'product' && !selectedProductId) {
      toast.error('Selecione o produto no catálogo para controle de revenda.');
      return;
    }

    if (quantity < 1) {
      toast.error('A quantidade deve ser de no mínimo 1 atendimento ou produto.');
      return;
    }

    let finalDesc = description.trim();
    if (mode === 'service') {
      const srv = services.find(s => s.id === selectedServiceId);
      finalDesc = srv ? `${srv.name}${quantity > 1 ? ` (${quantity}x)` : ''}` : 'Serviço';
    } else if (mode === 'product') {
      const prod = products.find(p => p.id === selectedProductId);
      finalDesc = prod ? `${prod.name}${quantity > 1 ? ` (${quantity}x)` : ''}` : 'Produto';
    } else if (mode === 'daily') {
      finalDesc = finalDesc || `Fechamento do Dia (${date.split('-').reverse().slice(0, 2).join('/')})`;
      finalDesc = `${finalDesc} • ${quantity} atendimento${quantity > 1 ? 's' : ''}`;
    } else {
      finalDesc = finalDesc || 'Faturamento';
    }

    // Identificação do cliente
    let finalClientId = clientId || undefined;
    if (!finalClientId && clientCustomName.trim()) {
      finalDesc = `${finalDesc} - ${clientCustomName.trim()}`;
    }

    addRevenue({
      monthId,
      clientId: finalClientId,
      amount: numAmount,
      tax: numTax,
      description: finalDesc,
      date,
      itemType: mode === 'daily' ? 'daily_batch' : mode === 'product' ? 'product' : 'service',
      quantity,
    });

    toast.success('Receita lançada com sucesso!');
    resetForm();
    setOpen(false);
  };

  const sortedClients = [...(clients || [])].sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  return (
    <Dialog open={open} onOpenChange={(val) => {
      setOpen(val);
      if (!val) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button size={buttonSize} variant={buttonVariant} className={className || "gap-1.5 bg-primary text-primary-foreground font-semibold shadow-sm"}>
          <Plus className="h-4 w-4" /> {buttonLabel}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[480px] p-6">
        <DialogHeader className="pb-3 border-b border-border">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            Lançar Receita / Entrada de Caixa
          </DialogTitle>
        </DialogHeader>

        {/* Alternador de Tipo de Lançamento */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-muted/40 rounded-xl border border-border text-xs font-semibold my-2">
          <button
            type="button"
            onClick={() => { setMode('daily'); resetForm(); setDescription(`Caixa do Dia`); }}
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
            onClick={() => { setMode('product'); resetForm(); }}
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
            onClick={() => { setMode('service'); resetForm(); }}
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
          {/* MODO 1: SERVIÇO DO CATÁLOGO */}
          {mode === 'service' && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  {terms.serviceSingle} *
                </Label>
                <Select value={selectedServiceId} onValueChange={handleSelectService}>
                  <SelectTrigger className="bg-muted/20 border-border">
                    <SelectValue placeholder={`Selecione no catálogo (${terms.sampleItems.slice(0, 3).join(', ')})`} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[220px] overflow-y-auto scrollbar-thin scrollbar-thumb-primary/40 scrollbar-track-transparent">
                    {services.map((s) => (
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
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={() => handleQuantityChange(quantity - 1)}
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </Button>
                    <Input
                      type="number"
                      min="1"
                      className="text-center font-bold h-9"
                      value={quantity}
                      onChange={(e) => handleQuantityChange(parseInt(e.target.value, 10) || 1)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={() => handleQuantityChange(quantity + 1)}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Data do Atendimento</Label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="h-9 bg-muted/20 border-border"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* MODO 2: PRODUTO DO CATÁLOGO */}
          {mode === 'product' && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">{terms.productSingle} *</Label>
                <Select value={selectedProductId} onValueChange={handleSelectProduct}>
                  <SelectTrigger className="bg-muted/20 border-border">
                    <SelectValue placeholder={`Selecione (${segment === 'barbershop' ? 'pomadas, óleos...' : 'cosméticos, home care...'})`} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[220px] overflow-y-auto scrollbar-thin scrollbar-thumb-primary/40 scrollbar-track-transparent">
                    {products.map((p) => (
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
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={() => handleQuantityChange(quantity - 1)}
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </Button>
                    <Input
                      type="number"
                      min="1"
                      className="text-center font-bold h-9"
                      value={quantity}
                      onChange={(e) => handleQuantityChange(parseInt(e.target.value, 10) || 1)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={() => handleQuantityChange(quantity + 1)}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Data da Venda</Label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="h-9 bg-muted/20 border-border"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* MODO 3: FECHAMENTO DE CAIXA DIÁRIO */}
          {mode === 'daily' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Data do Caixa *</Label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="h-9 bg-muted/20 border-border"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Identificação</Label>
                  <Input
                    placeholder="Ex: Caixa de Sexta, Movimento..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="h-9 bg-muted/20 border-border"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-foreground">Nº de Atendimentos / Cortes do Dia *</Label>
                  <span className="text-[10px] text-muted-foreground">Alimenta suas metas e ticket médio</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={() => handleQuantityChange(quantity - 1)}
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </Button>
                  <Input
                    type="number"
                    min="1"
                    className="text-center font-bold h-9 bg-muted/20 border-border"
                    value={quantity}
                    onChange={(e) => handleQuantityChange(parseInt(e.target.value, 10) || 1)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={() => handleQuantityChange(quantity + 1)}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* VALOR DO FATURAMENTO (BRUTO) */}
          <div className="space-y-1.5 pt-1">
            <Label className="text-xs font-semibold text-foreground">Valor Total do Faturamento (R$) *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-semibold">R$</span>
              <Input
                placeholder="0,00"
                inputMode="decimal"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="pl-9 text-base font-bold text-emerald-400 bg-muted/20 border-border"
                required
              />
            </div>
          </div>

          {/* CLIENTE OPCIONAL (APENAS SE QUISER REGISTRAR NOME) */}
          {mode !== 'daily' && (
            <div className="space-y-1.5 pt-1 border-t border-border/40">
              <div className="flex justify-between items-center text-xs">
                <Label className="text-muted-foreground">Nome do Cliente (Opcional)</Label>
                <span className="text-[10px] text-muted-foreground">Pode deixar em branco</span>
              </div>
              <Input
                placeholder="Ex: Carlos, João ou Cliente Avulso..."
                value={clientCustomName}
                onChange={(e) => setClientCustomName(e.target.value)}
                className="h-9 text-xs bg-muted/10 border-border"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-primary text-primary-foreground font-semibold">
              Salvar Entrada
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
