// PartnersTab — Sócios com pró-labore e provisões individuais
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFinance } from "@/contexts/FinanceContext";
import { Trash2, Plus, History, Handshake, ChevronDown, ChevronRight, CalendarRange, Pencil, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import type { Partner, PartnerContract, PLPeriodicity, PLProvision } from "@/types/finance";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ExpenseCategoryRow } from "@/hooks/useSupabaseFinance";

const MONTHS_PT = [
  { value: '01', label: 'Janeiro' },
  { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Março' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' },
  { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
];

const now0 = new Date();
const YEARS_PROV = Array.from({ length: 2050 - 2024 + 1 }, (_, i) => String(2024 + i));

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

function formatMonthId(monthId: string) {
  const [year, month] = monthId.split("-");
  const d = new Date(parseInt(year), parseInt(month) - 1, 1);
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function parseBRL(raw: string): number {
  const cleaned = raw.replace(/[R$\s.]/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

function CurrencyInput({ id, value, onChange, required, placeholder, className }: { id?: string; value: string; onChange: (v: string) => void; required?: boolean; placeholder?: string; className?: string }) {
  const [display, setDisplay] = useState(() => {
    const n = parseFloat(value);
    return isNaN(n) ? '' : n.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  });

  useEffect(() => {
    const n = parseFloat(value);
    if (!isNaN(n)) {
      setDisplay(n.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
    } else {
      setDisplay('');
    }
  }, [value]);

  const handleBlur = () => {
    const n = parseBRL(display);
    if (!isNaN(n) && n > 0) {
      const formatted = n.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
      setDisplay(formatted);
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
        className={`pl-9 ${className || ""}`}
        placeholder={placeholder || '0,00'}
        value={display}
        onChange={e => setDisplay(e.target.value)}
        onBlur={handleBlur}
        required={required}
      />
    </div>
  );
}

// ---------- Sub-componente: Provisões de um sócio ----------
interface PartnerProvision {
  id: string;
  category: string;
  monthlyAmount: number;
  startMonthId: string;
  endMonthId?: string;
  categoryId?: string | null;
  partnerId: string;
}

function PartnerProvisions({ partner }: { partner: Partner }) {
  const { user } = useAuth();
  const { expenseCategories, expenseProvisions, reload } = useFinance();
  const [expanded, setExpanded] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [startMonthNum, setStartMonthNum] = useState(String(now0.getMonth() + 1).padStart(2, '0'));
  const [startYearNum, setStartYearNum] = useState(String(now0.getFullYear()));
  const [endMonthNum, setEndMonthNum] = useState("");
  const [endYearNum, setEndYearNum] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const provisions = expenseProvisions.filter(p => (p as any).partnerId === partner.id); // Ajuste temporário se partnerId não estiver no tipo
  // Como as provisões antigas podem não ter partnerId mapeado perfeitamente no novo tipo se não foi adicionado ao ExpenseProvision,
  // vamos usar o estado local como antes, mas alimentando com addExpenseProvision que agora tem categoryId.
  // Na verdade, no useSupabaseFinance.ts (linha 118) a gente não colocou partnerId na interface.
  // Como estamos refatorando de forma focada, vamos restaurar o estado local para este componente, 
  // mas usando o supabase diretamente para a lista específica deste sócio, ou usar o expenseCategories.

  const [localProvisions, setLocalProvisions] = useState<PartnerProvision[]>([]);
  const [loaded, setLoaded] = useState(false);

  const loadProvisions = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("expense_provisions")
      .select("*")
      .eq("user_id", user.id)
      .or(`partner_id.eq.${partner.id},partner_id.is.null`)
      .order("start_month_id");
    setLocalProvisions(
      (data || []).filter((p:any) => !p.category?.startsWith('PLR|')).map((p: any) => ({
        id: p.id,
        category: p.category_id ? (expenseCategories.find(c => c.id === p.category_id)?.name ?? p.category) : p.category,
        categoryId: p.category_id,
        monthlyAmount: p.monthly_amount,
        startMonthId: p.start_month_id,
        endMonthId: p.end_month_id,
        partnerId: p.partner_id,
      }))
    );
    setLoaded(true);
  };

  const toggle = () => {
    if (!loaded) loadProvisions();
    setExpanded(!expanded);
  };

  const handleAdd = async () => {
    if (!categoryId) { toast.error("Selecione uma categoria."); return; }
    const num = parseFloat(amount.replace(",", "."));
    if (isNaN(num) || num <= 0) { toast.error("Informe um valor válido."); return; }
    const startMonthId = `${startYearNum}-${startMonthNum}`;
    const endMonthId = endMonthNum && endYearNum ? `${endYearNum}-${endMonthNum}` : undefined;
    const selectedCat = expenseCategories.find(c => c.id === categoryId);
    if (!selectedCat) return;

    setSaving(true);
    
    if (editingId) {
      const payload: any = { category_id: categoryId, category: selectedCat.name, monthly_amount: num, start_month_id: startMonthId, end_month_id: endMonthId || null };
      const { error } = await supabase.from("expense_provisions").update(payload).eq("id", editingId);
      if (!error) {
        setLocalProvisions(prev => prev.map(p => p.id === editingId ? { ...p, categoryId, category: selectedCat.name, monthlyAmount: num, startMonthId, endMonthId } : p));
        reload(); // Sincroniza expenseProvisions no FinanceContext
        toast.success("Provisão atualizada!");
        setEditingId(null);
      } else {
        toast.error("Erro ao atualizar: " + error.message);
      }
    } else {
      const { data, error } = await supabase
        .from("expense_provisions")
        .insert({ user_id: user!.id, category: selectedCat.name, category_id: categoryId, monthly_amount: num, start_month_id: startMonthId, end_month_id: endMonthId || null, partner_id: partner.id })
        .select()
        .single();
      if (error) {
        toast.error("Erro ao adicionar provisão: " + error.message);
      } else {
        setLocalProvisions(prev => [...prev, {
          id: data.id, category: selectedCat.name, categoryId: data.category_id, monthlyAmount: data.monthly_amount,
          startMonthId: data.start_month_id, endMonthId: data.end_month_id, partnerId: data.partner_id,
        }]);
        reload(); // sincroniza expenseProvisions no FinanceContext sem duplicar o INSERT
        toast.success("Provisão adicionada!");
      }
    }
    
    setCategoryId(""); setAmount(""); setEndMonthNum(""); setEndYearNum("");
    setSaving(false);
    setDialogOpen(false);
  };

  const handleOpenAdd = () => {
    cancelEdit();
    setDialogOpen(true);
  };

  const handleEdit = (prov: any) => {
    setEditingId(prov.id);
    setCategoryId(prov.categoryId || "");
    setAmount(prov.monthlyAmount.toString());
    const [sy, sm] = prov.startMonthId.split('-');
    setStartYearNum(sy);
    setStartMonthNum(sm);
    if (prov.endMonthId) {
      const [ey, em] = prov.endMonthId.split('-');
      setEndYearNum(ey);
      setEndMonthNum(em);
    } else {
      setEndYearNum("");
      setEndMonthNum("");
    }
    setExpanded(true);
    setDialogOpen(true);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setCategoryId(""); setAmount(""); setEndMonthNum(""); setEndYearNum("");
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Excluir esta provisão?")) return;
    await supabase.from("expense_provisions").delete().eq("id", id);
    setLocalProvisions(prev => prev.filter(p => p.id !== id));
    reload(); // Sincroniza expenseProvisions no FinanceContext
    toast.success("Provisão excluída.");
  };

  return (
    <div className="mt-3 border-t border-border/50 pt-3">
      <button
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        onClick={toggle}
      >
        {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        Despesas - Provisões
        {localProvisions.length > 0 && (
          <span className="ml-1 text-xs font-medium text-primary bg-primary/10 rounded-full px-2 py-0.5">
            {localProvisions.length}
          </span>
        )}
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={handleOpenAdd} className="h-8 text-xs">
              <Plus className="h-3 w-3 mr-1" /> Nova Provisão
            </Button>
          </div>

          {/* Form de adição (Dialog) */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="sm:max-w-[450px]">
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar Provisão" : "Nova Provisão"}</DialogTitle>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Categoria</Label>
                    <Select value={categoryId} onValueChange={setCategoryId}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {expenseCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Valor/mês (R$)</Label>
                    <CurrencyInput className="h-8 text-xs" value={amount} onChange={setAmount} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Mês Início</Label>
                    <select
                      className="h-8 text-xs rounded-md border border-input bg-background px-2 w-full"
                      value={startMonthNum}
                      onChange={e => setStartMonthNum(e.target.value)}
                    >
                      {MONTHS_PT.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Ano Início</Label>
                    <select
                      className="h-8 text-xs rounded-md border border-input bg-background px-2 w-full"
                      value={startYearNum}
                      onChange={e => setStartYearNum(e.target.value)}
                    >
                      {YEARS_PROV.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Mês Fim (Opcional)</Label>
                    <select
                      className="h-8 text-xs rounded-md border border-input bg-background px-2 w-full"
                      value={endMonthNum}
                      onChange={e => setEndMonthNum(e.target.value)}
                    >
                      <option value="">Sem fim</option>
                      {MONTHS_PT.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Ano Fim (Opcional)</Label>
                    <select
                      className="h-8 text-xs rounded-md border border-input bg-background px-2 w-full"
                      value={endYearNum}
                      onChange={e => setEndYearNum(e.target.value)}
                    >
                      <option value="">--</option>
                      {YEARS_PROV.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button size="sm" variant="outline" onClick={cancelEdit} className="h-8 text-xs">
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleAdd} disabled={saving} className="h-8 text-xs">
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Lista */}
          {!loaded ? (
            <p className="text-xs text-muted-foreground">Carregando...</p>
          ) : localProvisions.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">Nenhuma provisão configurada para {partner.name}.</p>
          ) : (
            <div className="rounded-md border border-border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="text-xs">Categoria</TableHead>
                    <TableHead className="text-xs">Valor<span className="hidden sm:inline"> Mensal</span></TableHead>
                    <TableHead className="text-xs hidden sm:table-cell">Início</TableHead>
                    <TableHead className="text-xs hidden sm:table-cell">Fim</TableHead>
                    <TableHead className="w-[40px] sm:w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {localProvisions.map(prov => (
                    <TableRow key={prov.id}>
                      <TableCell className="text-sm font-medium">{prov.category}</TableCell>
                      <TableCell className="text-sm text-amber-500">{formatCurrency(prov.monthlyAmount)}</TableCell>
                      <TableCell className="text-sm capitalize whitespace-nowrap hidden sm:table-cell">{formatMonthId(prov.startMonthId)}</TableCell>
                      <TableCell className="text-sm capitalize whitespace-nowrap text-muted-foreground hidden sm:table-cell">{prov.endMonthId ? formatMonthId(prov.endMonthId) : '-'}</TableCell>
                      <TableCell>
                        {/* Ações no Desktop */}
                        <div className="hidden sm:flex justify-end gap-1">
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => handleEdit(prov)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(prov.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        {/* Ações no Mobile (3 pontinhos) */}
                        <div className="sm:hidden flex justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(prov)}><Pencil className="h-4 w-4 mr-2" /> Editar</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDelete(prov.id)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" /> Excluir</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- Sub-componente: Provisoes de PL de um socio ----------

const PERIODICITY_LABELS: Record<PLPeriodicity, string> = {
  trimestral: 'Trimestral',
  quadrimestral: 'Quadrimestral',
  semestral: 'Semestral',
  anual: 'Anual',
};

const PERIODICITY_MONTHS: Record<PLPeriodicity, number> = {
  trimestral: 3,
  quadrimestral: 4,
  semestral: 6,
  anual: 12,
};

function getNextOccurrences(startMonthId: string, periodicity: PLPeriodicity, count = 3): string[] {
  const step = PERIODICITY_MONTHS[periodicity];
  const [sy, sm] = startMonthId.split('-').map(Number);
  const results: string[] = [];
  for (let i = 0; i < count; i++) {
    const totalMonths = sm - 1 + i * step;
    const year = sy + Math.floor(totalMonths / 12);
    const month = (totalMonths % 12) + 1;
    results.push(`${year}-${String(month).padStart(2, '0')}`);
  }
  return results;
}

function PartnerPLProvisions({ partner }: { partner: Partner }) {
  const { plProvisions, addPLProvision, deletePLProvision, updatePLProvision, expenseCategories } = useFinance();
  const [expanded, setExpanded] = useState(false);
  const [periodicity, setPeriodicity] = useState<PLPeriodicity | ''>('');
  const [amount, setAmount] = useState("");
  const [startMonthNum, setStartMonthNum] = useState(String(now0.getMonth() + 1).padStart(2, '0'));
  const [startYearNum, setStartYearNum] = useState(String(now0.getFullYear()));
  const [endMonthNum, setEndMonthNum] = useState("");
  const [endYearNum, setEndYearNum] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const provisions = plProvisions.filter(p => p.partnerId === partner.id);

  const toggle = () => setExpanded(!expanded);

  const handleAdd = async () => {
    if (!periodicity) { toast.error("Selecione a periodicidade."); return; }
    const num = parseFloat(amount.replace(",", "."));
    if (isNaN(num) || num <= 0) { toast.error("Informe um valor válido."); return; }
    const startMonthId = `${startYearNum}-${startMonthNum}`;
    const endMonthId = endMonthNum && endYearNum ? `${endYearNum}-${endMonthNum}` : undefined;
    
    setSaving(true);
    try {
      if (editingId) {
        await updatePLProvision(editingId, { 
          amount: num, 
          periodicity: periodicity as PLPeriodicity, 
          startMonthId, 
          endMonthId, 
          categoryId: categoryId || undefined 
        });
        toast.success("Provisão PL atualizada!");
        setEditingId(null);
      } else {
        await addPLProvision(partner.id, num, periodicity as PLPeriodicity, startMonthId, endMonthId, categoryId || undefined);
        toast.success("Provisão PL adicionada!");
      }
      setPeriodicity('');
      setAmount("");
      setCategoryId("");
      setEndMonthNum("");
      setEndYearNum("");
      setDialogOpen(false);
    } catch (e: any) {
      toast.error("Erro ao salvar provisão: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenAdd = () => {
    cancelEdit();
    setDialogOpen(true);
  };

  const handleEdit = (prov: PLProvision) => {
    setEditingId(prov.id);
    setPeriodicity(prov.periodicity);
    setAmount(prov.amount.toString());
    const [sy, sm] = prov.startMonthId.split('-');
    setStartYearNum(sy);
    setStartMonthNum(sm);
    if (prov.endMonthId) {
      const [ey, em] = prov.endMonthId.split('-');
      setEndYearNum(ey);
      setEndMonthNum(em);
    } else {
      setEndYearNum("");
      setEndMonthNum("");
    }
    setCategoryId(prov.categoryId || "");
    setExpanded(true);
    setDialogOpen(true);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setPeriodicity('');
    setAmount("");
    setCategoryId("");
    setEndMonthNum("");
    setEndYearNum("");
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Excluir esta provisão de PL?")) return;
    await deletePLProvision(id);
    toast.success("Provisão PL excluída.");
  };

  const nowId = `${now0.getFullYear()}-${String(now0.getMonth() + 1).padStart(2, '0')}`;

  return (
    <div className="mt-3 border-t border-border/50 pt-3">
      <button
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        onClick={toggle}
      >
        {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        Distribuição de Lucros - Provisão
        {provisions.length > 0 && (
          <span className="ml-1 text-xs font-medium text-violet-400 bg-violet-500/10 rounded-full px-2 py-0.5">
            {provisions.length}
          </span>
        )}
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={handleOpenAdd} className="h-8 text-xs">
              <Plus className="h-3 w-3 mr-1" /> Nova Provisão de Lucros
            </Button>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="sm:max-w-[450px]">
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar Provisão PL" : "Nova Provisão PL"}</DialogTitle>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Periodicidade</Label>
                    <Select value={periodicity} onValueChange={v => setPeriodicity(v as PLPeriodicity)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(PERIODICITY_LABELS) as PLPeriodicity[]).map(k => (
                          <SelectItem key={k} value={k}>{PERIODICITY_LABELS[k]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Valor/evento (R$)</Label>
                    <CurrencyInput className="h-8 text-xs" value={amount} onChange={setAmount} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Mês Inicial</Label>
                    <select
                      className="h-8 text-xs rounded-md border border-input bg-background px-2 w-full"
                      value={startMonthNum}
                      onChange={e => setStartMonthNum(e.target.value)}
                    >
                      {MONTHS_PT.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Ano</Label>
                    <select
                      className="h-8 text-xs rounded-md border border-input bg-background px-2 w-full"
                      value={startYearNum}
                      onChange={e => setStartYearNum(e.target.value)}
                    >
                      {YEARS_PROV.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Mês Fim (Opcional)</Label>
                    <select
                      className="h-8 text-xs rounded-md border border-input bg-background px-2 w-full"
                      value={endMonthNum}
                      onChange={e => setEndMonthNum(e.target.value)}
                    >
                      <option value="">Sem fim</option>
                      {MONTHS_PT.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Ano Fim (Opcional)</Label>
                    <select
                      className="h-8 text-xs rounded-md border border-input bg-background px-2 w-full"
                      value={endYearNum}
                      onChange={e => setEndYearNum(e.target.value)}
                    >
                      <option value="">--</option>
                      {YEARS_PROV.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Categoria (Opcional)</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Automática" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Automática</SelectItem>
                      {expenseCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button size="sm" variant="outline" onClick={cancelEdit} className="h-8 text-xs">
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleAdd} disabled={saving} className="h-8 text-xs">
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {provisions.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">Nenhuma provisão de PL configurada para {partner.name}.</p>
          ) : (
            <div className="rounded-md border border-border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="text-xs">Periodicidade</TableHead>
                    <TableHead className="text-xs">Início</TableHead>
                    <TableHead className="text-xs hidden sm:table-cell">Fim</TableHead>
                    <TableHead className="text-xs hidden sm:table-cell">Próx. ocorrências</TableHead>
                    <TableHead className="text-xs hidden sm:table-cell">Valor</TableHead>
                    <TableHead className="w-[40px] sm:w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {provisions.map(prov => {
                    const futureNexts = getNextOccurrences(prov.startMonthId, prov.periodicity, 6)
                      .filter(m => m >= nowId)
                      .slice(0, 3);
                    return (
                      <TableRow key={prov.id}>
                        <TableCell className="text-sm font-medium">{PERIODICITY_LABELS[prov.periodicity]}</TableCell>
                        <TableCell className="text-sm capitalize whitespace-nowrap">{formatMonthId(prov.startMonthId)}</TableCell>
                        <TableCell className="text-sm capitalize whitespace-nowrap text-muted-foreground hidden sm:table-cell">{prov.endMonthId ? formatMonthId(prov.endMonthId) : '-'}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {futureNexts.map(m => (
                              <span key={m} className="text-xs bg-violet-500/10 text-violet-400 px-1.5 py-0.5 rounded">
                                {formatMonthId(m)}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-violet-400 font-semibold hidden sm:table-cell">{formatCurrency(prov.amount)}</TableCell>
                        <TableCell>
                          {/* Desktop */}
                          <div className="hidden sm:flex justify-end gap-1">
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => handleEdit(prov)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10"
                              onClick={() => handleDelete(prov.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          {/* Mobile */}
                          <div className="sm:hidden flex justify-end">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-4 w-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(prov)}><Pencil className="h-4 w-4 mr-2" /> Editar</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDelete(prov.id)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" /> Excluir</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- Dialog: histórico de contratos ----------
interface ContractHistoryDialogProps {
  partner: Partner;
  contracts: PartnerContract[];
  expenseCategories: ExpenseCategoryRow[];
  onAdd: (partnerId: string, amount: number, startMonthId: string, categoryId?: string, inssPct?: number | null, irrfPct?: number | null) => Promise<void>;
  onUpdate: (id: string, updates: Partial<PartnerContract>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ContractHistoryDialog({ partner, contracts, expenseCategories, onAdd, onUpdate, onDelete, open, onOpenChange }: ContractHistoryDialogProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<PartnerContract | null>(null);
  const [amount, setAmount] = useState("");
  const [startMonthNum, setStartMonthNum] = useState(String(now0.getMonth() + 1).padStart(2, '0'));
  const [startYearNum, setStartYearNum] = useState(String(now0.getFullYear()));
  const [categoryId, setCategoryId] = useState("");
  const [inssPct, setInssPct] = useState("");
  const [irrfPct, setIrrfPct] = useState("");
  const [saving, setSaving] = useState(false);

  const partnerContracts = contracts
    .filter(c => c.partnerId === partner.id)
    .sort((a, b) => b.startMonthId.localeCompare(a.startMonthId));

  const nowId = `${now0.getFullYear()}-${String(now0.getMonth() + 1).padStart(2, '0')}`;
  const currentActiveContract = partnerContracts.find(c => c.startMonthId <= nowId);

  const openNew = () => {
    setEditingContract(null);
    setAmount("");
    setStartMonthNum(String(now0.getMonth() + 1).padStart(2, '0'));
    setStartYearNum(String(now0.getFullYear()));
    setCategoryId("");
    setInssPct("");
    setIrrfPct("");
    setFormOpen(true);
  };

  const openEdit = (c: PartnerContract) => {
    setEditingContract(c);
    setAmount(c.amount.toString());
    const [y, m] = c.startMonthId.split('-');
    setStartYearNum(y);
    setStartMonthNum(m);
    setCategoryId(c.categoryId || "");
    setInssPct(c.inssPct != null ? String(c.inssPct) : "");
    setIrrfPct(c.irrfPct != null ? String(c.irrfPct) : "");
    setFormOpen(true);
  };

  const handleSave = async () => {
    const num = parseBRL(amount);
    if (!num || num <= 0) { toast.error("Informe um valor válido."); return; }
    const startMonthId = `${startYearNum}-${startMonthNum}`;
    const inssNum = inssPct ? parseFloat(inssPct.replace(',', '.')) : null;
    const irrfNum = irrfPct ? parseFloat(irrfPct.replace(',', '.')) : null;
    setSaving(true);
    if (editingContract) {
      await onUpdate(editingContract.id, { amount: num, startMonthId, categoryId: categoryId || null, inssPct: inssNum, irrfPct: irrfNum });
      toast.success("Contrato atualizado!");
    } else {
      await onAdd(partner.id, num, startMonthId, categoryId || undefined, inssNum ?? undefined, irrfNum ?? undefined);
      toast.success("Contrato adicionado!");
    }
    setSaving(false);
    setFormOpen(false);
  };

  const catLabel = (id: string | null | undefined) => {
    if (!id) return null;
    return (expenseCategories || []).find(c => c.id === id)?.name || null;
  };

  return (
    <>
      {/* Dialog principal — lista limpa */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="border-b border-border pb-4 shrink-0">
            <div className="flex items-center justify-between pr-6">
              <div>
                <DialogTitle className="text-base font-semibold">Histórico de Pró-labore</DialogTitle>
                <p className="text-sm text-muted-foreground mt-0.5">{partner.name}</p>
              </div>
              <Button size="sm" onClick={openNew} className="gap-1.5">
                <Plus className="h-4 w-4" /> Novo Contrato
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            {partnerContracts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
                <History className="h-10 w-10 opacity-20" />
                <p className="font-medium">Nenhum contrato cadastrado</p>
                <p className="text-sm opacity-70">Clique em "Novo Contrato" para começar.</p>
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden mt-4">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="text-xs uppercase tracking-wide font-semibold">Vigência</TableHead>
                      <TableHead className="text-xs uppercase tracking-wide font-semibold">Categoria</TableHead>
                      <TableHead className="text-xs uppercase tracking-wide font-semibold text-right">Valor</TableHead>
                      <TableHead className="w-[80px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {partnerContracts.map((c) => (
                      <TableRow key={c.id} className="group">
                        <TableCell>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="capitalize text-sm">{formatMonthId(c.startMonthId)}</span>
                            {c === currentActiveContract && (
                              <span className="hidden sm:inline-flex text-xs font-medium text-emerald-500 border border-emerald-500/50 bg-emerald-500/10 rounded-full px-2 py-0.5">Atual</span>
                            )}
                            {c.startMonthId > nowId && (
                              <span className="hidden sm:inline-flex text-xs font-medium text-amber-500 border border-amber-500/50 bg-amber-500/10 rounded-full px-2 py-0.5">Futuro</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {catLabel(c.categoryId) ?? <span className="opacity-40">—</span>}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-semibold text-sm tabular-nums">{formatCurrency(c.amount)}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => openEdit(c)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                              onClick={async () => { if (window.confirm("Excluir este contrato?")) { await onDelete(c.id); toast.success("Contrato excluído."); } }}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog secundário — formulário add/edit */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingContract ? "Editar Contrato" : "Novo Contrato / Reajuste"}</DialogTitle>
            <p className="text-sm text-muted-foreground">
              {editingContract ? "Ajuste os dados do contrato existente." : `Novo pró-labore para ${partner.name}.`}
            </p>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label>Valor Mensal Bruto (R$)</Label>
              <CurrencyInput value={amount} onChange={setAmount} placeholder="0,00" />
            </div>

            {/* INSS + IRRF lado a lado */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1">
                  INSS <span className="text-muted-foreground text-xs font-normal">(%)</span>
                </Label>
                <input
                  type="number" min="0" max="100" step="0.01"
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  placeholder="ex: 7.5"
                  value={inssPct}
                  onChange={e => setInssPct(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1">
                  IRRF <span className="text-muted-foreground text-xs font-normal">(%)</span>
                </Label>
                <input
                  type="number" min="0" max="100" step="0.01"
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  placeholder="ex: 15"
                  value={irrfPct}
                  onChange={e => setIrrfPct(e.target.value)}
                />
              </div>
            </div>

            {/* Preview do valor líquido */}
            {(() => {
              const bruto = parseBRL(amount);
              if (!bruto) return null;
              const inssVal = inssPct ? (bruto * parseFloat(inssPct.replace(',', '.') || '0') / 100) : 0;
              const irrfVal = irrfPct ? (bruto * parseFloat(irrfPct.replace(',', '.') || '0') / 100) : 0;
              const liquido = bruto - inssVal - irrfVal;
              if (inssVal === 0 && irrfVal === 0) return null;
              return (
                <div className="rounded-md bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-sm">
                  <div className="flex justify-between text-muted-foreground text-xs mb-1">
                    <span>Bruto</span><span>{formatCurrency(bruto)}</span>
                  </div>
                  {inssVal > 0 && <div className="flex justify-between text-xs text-red-400"><span>INSS ({inssPct}%)</span><span>- {formatCurrency(inssVal)}</span></div>}
                  {irrfVal > 0 && <div className="flex justify-between text-xs text-red-400"><span>IRRF ({irrfPct}%)</span><span>- {formatCurrency(irrfVal)}</span></div>}
                  <div className="flex justify-between font-semibold text-emerald-400 border-t border-emerald-500/20 mt-1 pt-1">
                    <span>Líquido Carteira</span><span>{formatCurrency(liquido)}</span>
                  </div>
                </div>
              );
            })()}

            <div className="space-y-1.5">
              <Label>Mês de início</Label>
              <div className="flex gap-2">
                <select className="flex-1 h-10 rounded-md border border-input bg-background px-3 text-sm" value={startMonthNum} onChange={e => setStartMonthNum(e.target.value)}>
                  {MONTHS_PT.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <select className="w-[90px] h-10 rounded-md border border-input bg-background px-3 text-sm" value={startYearNum} onChange={e => setStartYearNum(e.target.value)}>
                  {YEARS_PROV.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Categoria <span className="text-muted-foreground text-xs">(opcional)</span></Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue placeholder="Selecionar categoria..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem categoria</SelectItem>
                  {(expenseCategories || []).map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : editingContract ? "Salvar Alterações" : "Adicionar Contrato"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AddPartnerDialog({ onAdd, expenseCategories }: { onAdd: (name: string, amount: number, startMonthId: string, initialCategoryId?: string) => Promise<void>, expenseCategories: ExpenseCategoryRow[] }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [startMonthNum, setStartMonthNum] = useState(String(now0.getMonth() + 1).padStart(2, '0'));
  const [startYearNum, setStartYearNum] = useState(String(now0.getFullYear()));
  const [categoryId, setCategoryId] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error("Informe o nome do sócio."); return; }
    const num = parseFloat(amount.replace(",", "."));
    if (!num || num <= 0) { toast.error("Informe um valor válido."); return; }
    const startMonthId = `${startYearNum}-${startMonthNum}`;
    setSaving(true);
    await onAdd(name.trim(), num, startMonthId, categoryId || undefined);
    setName(""); setAmount(""); setCategoryId(""); setSaving(false); setOpen(false);
    toast.success("Sócio cadastrado!");
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />Novo Sócio
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Cadastrar Sócio</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Nome do Sócio</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: João Silva" />
            </div>
            <div className="space-y-1">
              <Label>Pró-labore Mensal (R$)</Label>
              <CurrencyInput value={amount} onChange={setAmount} placeholder="Ex: 5000" />
            </div>
            <div className="space-y-1">
              <Label>Início</Label>
              <div className="flex gap-2">
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={startMonthNum} onChange={e => setStartMonthNum(e.target.value)}
                >
                  {MONTHS_PT.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={startYearNum} onChange={e => setStartYearNum(e.target.value)}
                >
                  {YEARS_PROV.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Categoria (Opcional)</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Folha de Pagamento (Padrão)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Folha de Pagamento (Padrão)</SelectItem>
                  {expenseCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={saving}>{saving ? "Salvando..." : "Cadastrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ---------- Tab principal ----------
export function PartnersTab() {
  const { partners, partnerContracts, addPartner, deletePartner, addPartnerContract, updatePartnerContract, deletePartnerContract, expenseCategories } = useFinance();
  const [historyPartner, setHistoryPartner] = useState<Partner | null>(null);

  const handleAddPartner = async (name: string, amount: number, startMonthId: string, initialCategoryId?: string) => {
    await addPartner({ name }, amount, startMonthId, initialCategoryId);
  };

  const handleDeletePartner = async (id: string) => {
    if (window.confirm("Excluir este sócio e todos os seus dados?")) {
      await deletePartner(id);
      toast.success("Sócio excluído.");
    }
  };

  const getActiveContract = (partnerId: string): PartnerContract | undefined => {
    const now = new Date();
    const currentMonthId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return partnerContracts
      .filter(c => c.partnerId === partnerId && c.startMonthId <= currentMonthId)
      .sort((a, b) => b.startMonthId.localeCompare(a.startMonthId))[0];
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex justify-end">
        <AddPartnerDialog onAdd={handleAddPartner} expenseCategories={expenseCategories} />
      </div>

      <div className="space-y-4">
        {partners.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Handshake className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-lg font-medium">Nenhum sócio cadastrado</p>
              <p className="text-sm mt-1">Clique em "Novo Sócio" para começar.</p>
            </CardContent>
          </Card>
        ) : (
          partners.map(partner => {
            const active = getActiveContract(partner.id);
            const contractCount = partnerContracts.filter(c => c.partnerId === partner.id).length;
            return (
              <Card key={partner.id} className="overflow-hidden">
                <CardHeader className="flex flex-row items-start sm:items-center justify-between pb-3 gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-base shrink-0">
                      {partner.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate pr-2">{partner.name}</CardTitle>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 mt-1">
                        <p className="text-sm text-muted-foreground whitespace-nowrap">
                          Pró-labore: <span className="font-semibold text-foreground">{active ? formatCurrency(active.amount) : "—"}</span>
                        </p>
                        <div className="hidden sm:flex items-center text-xs text-muted-foreground">
                          {active && <span>(desde {formatMonthId(active.startMonthId)})</span>}
                          <span className="mx-1.5">•</span>
                          <span>{contractCount} contrato{contractCount !== 1 ? "s" : ""}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                    <Button variant="outline" size="sm" className="h-9 px-2 sm:px-3 gap-1.5" onClick={() => setHistoryPartner(partner)}>
                      <History className="h-4 w-4" /> <span className="hidden sm:inline">Contratos</span>
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:bg-destructive/10 shrink-0"
                      onClick={() => handleDeletePartner(partner.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {/* Provisões individuais deste sócio */}
                  <PartnerProvisions partner={partner} />
                  {/* Provisões de PL deste sócio */}
                  <PartnerPLProvisions partner={partner} />
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {historyPartner && (
        <ContractHistoryDialog
          partner={historyPartner}
          contracts={partnerContracts}
          expenseCategories={expenseCategories || []}
          onAdd={addPartnerContract}
          onUpdate={updatePartnerContract}
          onDelete={deletePartnerContract}
          open={!!historyPartner}
          onOpenChange={open => { if (!open) setHistoryPartner(null); }}
        />
      )}
    </div>
  );
}
