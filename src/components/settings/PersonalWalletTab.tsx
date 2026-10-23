import { useState, useEffect } from 'react';
import { usePersonalWallet } from '@/hooks/usePersonalWallet';
import { useMonth } from '@/contexts/MonthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Tag, Plus, Trash2, CalendarDays, Wallet, PiggyBank, Pencil, CalendarClock, MoreVertical, ChevronDown, ChevronUp } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { WalletMonthPicker } from '@/components/ui/WalletMonthPicker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CategoryFormFields, ICON_NAME_MAP } from '@/components/wallet/CategoryFormFields';
import type { PersonalCategory, PersonalProvision } from '@/types/personalWallet';

function parseBRL(raw: string): number {
  return parseFloat(raw.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
}

function addMonthsCalc(startMonthId: string, count: number): string {
  const [y, m] = startMonthId.split('-').map(Number);
  const d = new Date(y, m - 1 + count - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthDiffCalc(start: string, end: string): number {
  const [sy, sm] = start.split('-').map(Number);
  const [ey, em] = end.split('-').map(Number);
  return Math.max(1, (ey - sy) * 12 + (em - sm) + 1);
}

export function PersonalWalletTab() {
  const wallet = usePersonalWallet();
  const { selectedMonthId } = useMonth();
  
  const [showRules, setShowRules] = useState(() => localStorage.getItem('wallet_settings_rules') !== 'false');
  const [showCategories, setShowCategories] = useState(() => localStorage.getItem('wallet_settings_categories') !== 'false');
  const [showProvisions, setShowProvisions] = useState(() => localStorage.getItem('wallet_settings_provisions') !== 'false');
  
  // ── Settings ──────────────────────────────────────────────────
  const [walletStartMonth, setWalletStartMonth] = useState('');
  const [walletInitialBalance, setWalletInitialBalance] = useState('');
  const [walletSavingsPct, setWalletSavingsPct] = useState('20');
  const [savingWallet, setSavingWallet] = useState(false);

  useEffect(() => {
    if (wallet.settings) {
      setWalletStartMonth(wallet.settings.startMonthId || '');
      setWalletInitialBalance(wallet.settings.initialBalance.toString());
      setWalletSavingsPct(wallet.settings.savingsGoalPct.toString());
    }
  }, [wallet.settings]);

  // ── Categorias ────────────────────────────────────────────────
  const [catForm, setCatForm] = useState<{ id?: string; name: string; icon: string; color: string } | null>(null);
  const [catSaving, setCatSaving] = useState(false);

  const openNewCat = () => setCatForm({ name: '', icon: '🏷️', color: '#10b981' });
  const openEditCat = (c: PersonalCategory) => setCatForm({ id: c.id, name: c.name, icon: c.icon, color: c.color });

  const handleSaveCat = async () => {
    if (!catForm?.name.trim()) return toast.error('Nome obrigatorio');
    setCatSaving(true);
    try {
      if (catForm.id) {
        await wallet.updateCategory(catForm.id, { name: catForm.name.trim(), icon: catForm.icon, color: catForm.color });
        toast.success('Categoria atualizada!');
      } else {
        await wallet.addCategory({ name: catForm.name.trim(), icon: catForm.icon || '🏷️', color: catForm.color || '#10b981' });
        toast.success('Categoria adicionada!');
      }
      setCatForm(null);
    } catch (e: any) {
      toast.error(e.message);
    }
    setCatSaving(false);
  };

  // ── Provisoes ─────────────────────────────────────────────────
  const [provForm, setProvForm] = useState<{
    id?: string;
    categoryId: string;
    categoryName: string;
    description: string;
    monthlyAmount: string;
    startMonthId: string;
    installments: string;
    endMonthId: string;
  } | null>(null);
  const [provSaving, setProvSaving] = useState(false);

  const openNewProv = () => setProvForm({
    categoryId: '', categoryName: '', description: '',
    monthlyAmount: '', startMonthId: selectedMonthId,
    installments: '', endMonthId: '',
  });

  const openEditProv = (p: PersonalProvision) => setProvForm({
    id: p.id,
    categoryId: p.categoryId || '',
    categoryName: p.categoryName,
    description: p.description || '',
    monthlyAmount: p.monthlyAmount.toFixed(2).replace('.', ','),
    startMonthId: p.startMonthId,
    // BUG-04 fix: recalcula parcelas a partir do endMonthId existente
    installments: (p.endMonthId && p.startMonthId)
      ? String(monthDiffCalc(p.startMonthId, p.endMonthId))
      : '',
    endMonthId: p.endMonthId || '',
  });

  const handleInstallmentsChange = (val: string) => {
    if (!provForm) return;
    const n = parseInt(val);
    if (!isNaN(n) && n > 0 && provForm.startMonthId) {
      setProvForm({ ...provForm, installments: val, endMonthId: addMonthsCalc(provForm.startMonthId, n) });
    } else {
      // BUG-05 fix: limpar installments também limpa endMonthId
      setProvForm({ ...provForm, installments: val, endMonthId: '' });
    }
  };

  const handleSaveProv = async () => {
    if (!provForm) return;
    const amt = parseBRL(provForm.monthlyAmount);
    if (amt <= 0) return toast.error('Informe um valor valido');
    let catName = provForm.categoryName.trim();
    if (provForm.categoryId) {
      const cat = wallet.categories.find(c => c.id === provForm.categoryId);
      if (cat) catName = cat.name;
    }
    if (!catName) return toast.error('Informe a categoria ou nome');
    setProvSaving(true);
    try {
      const payload = {
        categoryId: provForm.categoryId || null,
        categoryName: catName,
        description: provForm.description.trim() || undefined,
        monthlyAmount: amt,
        startMonthId: provForm.startMonthId,
        endMonthId: provForm.endMonthId ? provForm.endMonthId : null,
      };
      if (provForm.id) {
        await wallet.updateProvision(provForm.id, payload);
        toast.success('Provisao atualizada!');
      } else {
        await wallet.addProvision(payload);
        toast.success('Provisao adicionada!');
      }
      setProvForm(null);
    } catch (e: any) {
      toast.error(e.message);
    }
    setProvSaving(false);
  };

  // ── Regras de Destinacao ─────────────────────────────────────
  const [ruleOpen, setRuleOpen] = useState(false);
  const [ruleId, setRuleId] = useState('');
  const [ruleLabel, setRuleLabel] = useState('');
  const [ruleType, setRuleType] = useState<'percentage' | 'fixed'>('percentage');
  const [ruleValue, setRuleValue] = useState('');
  const [ruleReserveId, setRuleReserveId] = useState('');

  const openNewRule = () => {
    setRuleId('');
    setRuleLabel('');
    setRuleType('percentage');
    setRuleValue('');
    setRuleReserveId('');
    setRuleOpen(true);
  };

  const openEditRule = (r: any) => {
    setRuleId(r.id);
    setRuleLabel(r.label);
    setRuleType(r.allocationType);
    setRuleValue(r.allocationType === 'percentage' ? r.value.toString().replace('.', ',') : r.value.toLocaleString('pt-BR', {minimumFractionDigits:2}));
    setRuleReserveId(r.reserveId);
    setRuleOpen(true);
  };

  const handleSaveRule = async () => {
    const val = ruleType === 'percentage'
      ? parseFloat(ruleValue.replace(',', '.'))
      : parseFloat(ruleValue.replace(/[R$\s.]/g, '').replace(',', '.'));
    
    if (!ruleLabel.trim() || isNaN(val) || val <= 0 || !ruleReserveId) return toast.error('Preencha os campos obrigatorios');
    
    try {
      if (ruleId) {
        await wallet.updateAllocationRule(ruleId, {
          label: ruleLabel,
          allocationType: ruleType,
          value: val,
          reserveId: ruleReserveId,
        });
        toast.success('Regra atualizada!');
      } else {
        await wallet.addAllocationRule({
          label: ruleLabel,
          allocationType: ruleType,
          value: val,
          reserveId: ruleReserveId,
          sortOrder: wallet.allocationRules.length,
        });
        toast.success('Regra adicionada!');
      }
      setRuleOpen(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl">

      {/* ── Settings ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-8 border-b border-border">
        <div className="md:col-span-1">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Wallet className="w-4 h-4 text-emerald-500" />
            Ativacao do Modulo
          </h4>
          <p className="text-sm text-muted-foreground mt-1">
            Ative a gestao financeira pessoal. Espelha automaticamente retiradas da empresa como receitas pessoais.
          </p>
        </div>
        <div className="md:col-span-2 max-w-md space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/30">
            <div>
              <p className="text-sm font-medium">Ativar Carteira Pessoal</p>
              <p className="text-xs text-muted-foreground">
                {wallet.settings?.isActive ? 'Modulo ativo e funcionando' : 'Modulo desativado'}
              </p>
            </div>
            <button
              className={`relative w-11 h-6 rounded-full transition-colors ${wallet.settings?.isActive ? 'bg-primary' : 'bg-muted'}`}
              onClick={async () => {
                const newVal = !wallet.settings?.isActive;
                await wallet.saveSettings({
                  isActive: newVal,
                  startMonthId: walletStartMonth || new Date().toISOString().slice(0, 7),
                  initialBalance: parseFloat(walletInitialBalance) || 0,
                  savingsGoalPct: parseFloat(walletSavingsPct) || 20,
                });
                toast.success(newVal ? 'Carteira pessoal ativada!' : 'Carteira pessoal desativada.');
              }}
            >
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${wallet.settings?.isActive ? 'left-5' : 'left-0.5'}`} />
            </button>
          </div>

          <div className={`space-y-4 transition-all duration-300 ${wallet.settings?.isActive ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mes de Inicio</Label>
                <WalletMonthPicker value={walletStartMonth} onChange={setWalletStartMonth} />
              </div>
              <div className="space-y-2">
                <Label>Saldo Inicial</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                  <Input id="wallet-balance" className="pl-9" value={walletInitialBalance} onChange={e => setWalletInitialBalance(e.target.value)} placeholder="0,00" inputMode="decimal" />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Meta de Poupanca (%)</Label>
              <div className="flex gap-3 items-center">
                <Input type="number" min="0" max="100" step="1" value={walletSavingsPct} onChange={e => setWalletSavingsPct(e.target.value)} className="max-w-[100px]" />
                <span className="text-sm text-muted-foreground">% das receitas mensais</span>
              </div>
            </div>
            <Button
              onClick={async () => {
                setSavingWallet(true);
                try {
                  await wallet.saveSettings({
                    startMonthId: walletStartMonth,
                    initialBalance: parseFloat(walletInitialBalance) || 0,
                    savingsGoalPct: parseFloat(walletSavingsPct) || 20,
                  });
                  toast.success('Configuracoes salvas!');
                } catch (e: any) {
                  toast.error('Erro: ' + e.message);
                }
                setSavingWallet(false);
              }}
              disabled={savingWallet || !wallet.settings?.isActive}
            >
              {savingWallet ? 'Salvando...' : 'Atualizar Configuracoes'}
            </Button>
          </div>
        </div>
      </div>

      {wallet.settings?.isActive && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

          {/* ── Regras de Destinacao ── */}
          <Card className="h-fit md:col-span-2">
            <CardHeader 
              className="flex flex-row items-center justify-between pb-3 cursor-pointer select-none group"
              onClick={() => { const n = !showRules; setShowRules(n); localStorage.setItem('wallet_settings_rules', String(n)); }}
            >
              <div className="flex items-center min-w-0 pr-2 gap-2">
                <div className="text-muted-foreground group-hover:text-foreground transition-colors">
                  {showRules ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
                <div>
                  <CardTitle className="text-sm sm:text-base flex items-center gap-2 truncate">
                    <PiggyBank className="w-4 h-4 text-emerald-500 shrink-0" /> Regras de Destinação
                    <span className="hidden sm:inline text-muted-foreground font-normal text-sm">(PL e Entradas Extras)</span>
                  </CardTitle>
                  <CardDescription className="hidden sm:block mt-1">Automatize a distribuição de entradas na carteira para suas Caixinhas/Reservas.</CardDescription>
                </div>
              </div>
              <Button size="sm" onClick={(e) => { e.stopPropagation(); openNewRule(); }} className="h-8 shrink-0"><Plus className="w-4 h-4 sm:mr-1" /><span className="hidden sm:inline">Nova</span></Button>
            </CardHeader>
            {showRules && (
            <CardContent>
              {wallet.allocationRules.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhuma regra configurada.</p>
              ) : (
                <div className="divide-y divide-border border rounded-md">
                  {wallet.allocationRules.map(r => {
                    const reserve = wallet.reserves.find(res => res.id === r.reserveId);
                    return (
                      <div key={r.id} className="flex items-center justify-between py-2.5 px-3 hover:bg-muted/30 transition-colors group">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-md bg-emerald-500/10 flex items-center justify-center">
                            <PiggyBank className="w-3.5 h-3.5 text-emerald-500" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{r.label}</span>
                            <span className="text-[10px] text-muted-foreground">Destino: {reserve?.name || 'Caixinha Excluida'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                          <span className="text-sm font-semibold text-emerald-500">
                            {r.allocationType === 'percentage' ? `${r.value}%` : `R$ ${r.value.toLocaleString('pt-BR', {minimumFractionDigits:2})}`}
                          </span>
                          
                          {/* Desktop Ações */}
                          <div className="hidden sm:flex opacity-0 group-hover:opacity-100 transition-opacity items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                              onClick={() => openEditRule(r)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={async () => { if (window.confirm('Excluir regra?')) await wallet.deleteAllocationRule(r.id); }}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                          
                          {/* Mobile Ações (Dropdown) */}
                          <div className="sm:hidden flex">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="w-4 h-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEditRule(r)}><Pencil className="w-4 h-4 mr-2" /> Editar</DropdownMenuItem>
                                <DropdownMenuItem onClick={async () => { if (window.confirm('Excluir regra?')) await wallet.deleteAllocationRule(r.id); }} className="text-destructive">
                                  <Trash2 className="w-4 h-4 mr-2" /> Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
            )}
          </Card>

          {/* ── Categorias ── */}
          <Card className="h-fit">
            <CardHeader 
              className="flex flex-row items-center justify-between pb-3 cursor-pointer select-none group"
              onClick={() => { const n = !showCategories; setShowCategories(n); localStorage.setItem('wallet_settings_categories', String(n)); }}
            >
              <div className="flex items-center gap-2">
                <div className="text-muted-foreground group-hover:text-foreground transition-colors">
                  {showCategories ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Tag className="w-4 h-4 text-emerald-500" /> Categorias
                  </CardTitle>
                  <CardDescription>Para despesas pessoais</CardDescription>
                </div>
              </div>
              <Button size="sm" onClick={(e) => { e.stopPropagation(); openNewCat(); }} className="h-8"><Plus className="w-4 h-4 mr-1" /> Nova</Button>
            </CardHeader>
            {showCategories && (
            <CardContent>
              {wallet.categories.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhuma categoria cadastrada.</p>
              ) : (
                <div className="divide-y divide-border border rounded-md">
                  {wallet.categories.map(c => (
                    <div key={c.id} className="flex items-center justify-between py-2.5 px-3 hover:bg-muted/30 transition-colors group">
                      <div className="flex items-center gap-3">
                        {(() => {
                          const IconComp = ICON_NAME_MAP[c.icon];
                          return IconComp
                            ? <IconComp className="w-4 h-4 shrink-0" style={{ color: c.color }} />
                            : <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />;
                        })()}
                        <span className="font-medium text-sm">{c.name}</span>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                          onClick={() => openEditCat(c)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={async () => { if (window.confirm('Excluir categoria?')) await wallet.deleteCategory(c.id); }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            )}
          </Card>

          {/* ── Provisoes ── */}
          <Card className="h-fit">
            <CardHeader 
              className="flex flex-row items-center justify-between pb-3 cursor-pointer select-none group"
              onClick={() => { const n = !showProvisions; setShowProvisions(n); localStorage.setItem('wallet_settings_provisions', String(n)); }}
            >
              <div className="flex items-center gap-2">
                <div className="text-muted-foreground group-hover:text-foreground transition-colors">
                  {showProvisions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
                <div>
                  <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-emerald-500" /> Provisões
                  </CardTitle>
                  <CardDescription className="hidden sm:block mt-1">Despesas recorrentes, fixas e manuais</CardDescription>
                </div>
              </div>
              <Button size="sm" onClick={(e) => { e.stopPropagation(); openNewProv(); }} className="h-8"><Plus className="w-4 h-4 sm:mr-1" /><span className="hidden sm:inline">Nova</span></Button>
            </CardHeader>
            {showProvisions && (
            <CardContent>
              {wallet.provisions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhuma provisao cadastrada.</p>
              ) : (() => {
                const recorrentes = wallet.provisions.filter(p => !p.endMonthId || p.startMonthId !== p.endMonthId);
                const manuais = wallet.provisions.filter(p => p.endMonthId && p.startMonthId === p.endMonthId);

                const renderProvItem = (p: any) => (
                  <div key={p.id} className="flex items-center justify-between py-2.5 px-3 hover:bg-muted/30 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-md bg-emerald-500/10 flex items-center justify-center">
                        <CalendarDays className="w-3.5 h-3.5 text-emerald-500" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm truncate max-w-[120px] sm:max-w-[200px]">{p.categoryName}</span>
                        {p.description && (
                          <span className="hidden sm:block text-[10px] text-[#16e0c4]/80 leading-tight">{p.description}</span>
                        )}
                        <div className="hidden sm:flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground">Início: {p.startMonthId}</span>
                          {p.endMonthId && p.startMonthId !== p.endMonthId && (
                            <span className="text-[10px] text-amber-400 flex items-center gap-0.5">
                              <CalendarClock className="w-2.5 h-2.5" /> até {p.endMonthId}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <span className="text-sm font-semibold text-red-400">
                        R$ {p.monthlyAmount.toLocaleString('pt-BR', {minimumFractionDigits:2})}
                      </span>
                      
                      {/* Desktop Ações */}
                      <div className="hidden sm:flex opacity-0 group-hover:opacity-100 transition-opacity items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                          onClick={() => openEditProv(p)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={async () => { if (window.confirm('Excluir provisão?')) await wallet.deleteProvision(p.id); }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      
                      {/* Mobile Ações (Dropdown) */}
                      <div className="sm:hidden flex">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditProv(p)}><Pencil className="w-4 h-4 mr-2" /> Editar</DropdownMenuItem>
                            <DropdownMenuItem onClick={async () => { if (window.confirm('Excluir provisão?')) await wallet.deleteProvision(p.id); }} className="text-destructive">
                              <Trash2 className="w-4 h-4 mr-2" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                );

                return (
                  <div className="space-y-4">
                    {/* Seção: Recorrentes e Fixas */}
                    {recorrentes.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-500/80">
                            Recorrentes e Fixas
                          </span>
                          <span className="text-[10px] text-muted-foreground">({recorrentes.length})</span>
                          <div className="flex-1 h-px bg-emerald-500/15" />
                        </div>
                        <div className="divide-y divide-border border rounded-md">
                          {recorrentes.map(renderProvItem)}
                        </div>
                      </div>
                    )}

                    {/* Seção: Manuais */}
                    {manuais.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400/80">
                            Manuais
                          </span>
                          <span className="text-[10px] text-muted-foreground">({manuais.length})</span>
                          <div className="flex-1 h-px bg-amber-400/15" />
                        </div>
                        <div className="divide-y divide-border border rounded-md">
                          {manuais.map(renderProvItem)}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </CardContent>
            )}
          </Card>
        </div>
      )}

      {/* Dialog: Nova / Editar Categoria */}
      <Dialog open={!!catForm} onOpenChange={open => { if (!open) setCatForm(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{catForm?.id ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle></DialogHeader>
          {catForm && (
            <CategoryFormFields
              name={catForm.name}
              icon={catForm.icon}
              color={catForm.color}
              onName={v  => setCatForm({ ...catForm, name: v })}
              onIcon={v  => setCatForm({ ...catForm, icon: v })}
              onColor={v => setCatForm({ ...catForm, color: v })}
              autoFocus
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatForm(null)}>Cancelar</Button>
            <Button onClick={handleSaveCat} disabled={catSaving}>{catSaving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Nova / Editar Provisao */}
      <Dialog open={!!provForm} onOpenChange={open => { if (!open) setProvForm(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-amber-400" />
              {provForm?.id ? 'Editar Provisao' : 'Nova Provisao'}
            </DialogTitle>
          </DialogHeader>
          {provForm && (
            <div className="py-2 space-y-3">
              <div>
                <Label>Categoria</Label>
                <Select value={provForm.categoryId || 'free'} onValueChange={val => {
                  if (val === 'free') {
                    setProvForm({ ...provForm, categoryId: '' });
                  } else {
                    const cat = wallet.categories.find(c => c.id === val);
                    setProvForm({ ...provForm, categoryId: val, categoryName: cat?.name || '' });
                  }
                }}>
                  <SelectTrigger><SelectValue placeholder="Selecione ou use nome livre" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Nome livre (abaixo)</SelectItem>
                    {wallet.categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {!provForm.categoryId && (
                <div>
                  <Label>Nome da Provisao <span className="text-[10px] text-muted-foreground font-normal">(nome livre)</span></Label>
                  <Input value={provForm.categoryName} onChange={e => setProvForm({ ...provForm, categoryName: e.target.value })} placeholder="Ex: Parcela do Carro, Plano de Saude..." />
                </div>
              )}

              {/* Descricao opcional — aparece em verde abaixo do nome */}
              <div>
                <Label className="flex items-center gap-1.5">
                  Descricao
                  <span className="text-[10px] text-muted-foreground font-normal">(opcional)</span>
                </Label>
                <Input value={provForm.description} onChange={e => setProvForm({ ...provForm, description: e.target.value })} placeholder="Ex: Fatura Nubank, Boleto Renault..." />
                {provForm.description.trim() && (
                  <p className="text-[10px] text-[#16e0c4]/80 mt-1 leading-tight">Aparecera em verde abaixo do nome na carteira</p>
                )}
              </div>

              <div>
                <Label>Valor Mensal</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                  <Input className="pl-9" value={provForm.monthlyAmount} onChange={e => setProvForm({ ...provForm, monthlyAmount: e.target.value })} placeholder="0,00" inputMode="decimal" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Mes Inicial</Label>
                  <WalletMonthPicker
                    value={provForm.startMonthId}
                    onChange={newStart => {
                      const n = parseInt(provForm.installments);
                      const newEnd = (!isNaN(n) && n > 0) ? addMonthsCalc(newStart, n) : provForm.endMonthId;
                      setProvForm({ ...provForm, startMonthId: newStart, endMonthId: newEnd });
                    }}
                  />
                </div>
                <div>
                  <Label>Parcelas <span className="text-[10px] text-muted-foreground font-normal">(opc.)</span></Label>
                  <Input type="number" min="1" value={provForm.installments} onChange={e => handleInstallmentsChange(e.target.value)} placeholder="Ex: 15" />
                </div>
              </div>

              <div>
                <Label>Mes Final <span className="text-[10px] text-muted-foreground font-normal">(calc. pelas parcelas ou manual)</span></Label>
                <WalletMonthPicker
                  value={provForm.endMonthId}
                  clearable
                  onClear={() => setProvForm({ ...provForm, endMonthId: '', installments: '' })}
                  onChange={v => {
                    const parcelas = v && provForm.startMonthId
                      ? String(monthDiffCalc(provForm.startMonthId, v))
                      : '';
                    setProvForm({ ...provForm, endMonthId: v, installments: parcelas });
                  }}
                />
                {provForm.endMonthId ? (
                  <p className="text-[10px] text-[#16e0c4]/80 mt-1 leading-tight">
                    Ativa de {provForm.startMonthId} ate {provForm.endMonthId}
                    {provForm.installments && ` (${provForm.installments} parcelas)`}
                  </p>
                ) : (
                  <p className="text-[10px] text-muted-foreground mt-1 leading-tight">Sem prazo — ativa indefinidamente.</p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setProvForm(null)}>Cancelar</Button>
            <Button onClick={handleSaveProv} disabled={provSaving}>{provSaving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Nova Regra de Destinacao */}
      <Dialog open={ruleOpen} onOpenChange={setRuleOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{ruleId ? 'Editar Regra de Destinacao' : 'Nova Regra de Destinacao'}</DialogTitle></DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Nome da Regra</Label>
              <Input value={ruleLabel} onChange={e => setRuleLabel(e.target.value)} placeholder="Ex: Caixinha Ferias (20%)" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={ruleType} onValueChange={(v: any) => setRuleType(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentual (%)</SelectItem>
                    <SelectItem value="fixed">Fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valor</Label>
                <Input value={ruleValue} onChange={e => setRuleValue(e.target.value)} placeholder="0" inputMode="decimal" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Caixinha / Reserva de Destino</Label>
              <Select value={ruleReserveId} onValueChange={setRuleReserveId}>
                <SelectTrigger><SelectValue placeholder="Selecione a Caixinha/Reserva..." /></SelectTrigger>
                <SelectContent>
                  {wallet.reserves.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {wallet.reserves.length === 0 && (
                <p className="text-xs text-muted-foreground">Primeiro voce precisa criar uma Caixinha/Reserva na tela da sua Carteira.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRuleOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveRule}>Salvar Regra</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
