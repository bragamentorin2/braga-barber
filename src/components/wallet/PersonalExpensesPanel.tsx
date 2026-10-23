// ============================================================
// Painel de Despesas Pessoais (Provisoes + Gastos Reais)
// ============================================================
import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { WalletMonthPicker } from '@/components/ui/WalletMonthPicker';
import { CategoryFormFields, ICON_NAME_MAP } from '@/components/wallet/CategoryFormFields';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingDown, Plus, Trash2, Receipt, Pencil, Settings2, CalendarClock, Tag, ChevronDown, ChevronUp, MoreVertical, CheckCircle2, Undo2, ArrowUpDown, CheckCheck } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { usePersonalWallet } from '@/hooks/usePersonalWallet';
import type { PersonalCategory, PersonalProvision } from '@/types/personalWallet';

type WalletHook = ReturnType<typeof usePersonalWallet>;

import { usePrivacyStore } from '@/store/usePrivacyStore';

function parseBRL(raw: string): number {
  return parseFloat(raw.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
}

// Dado um mes YYYY-MM e um numero de parcelas, retorna o endMonthId (inclusivo)
function addMonths(startMonthId: string, count: number): string {
  const [y, m] = startMonthId.split('-').map(Number);
  const d = new Date(y, m - 1 + count - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Dado startMonthId e endMonthId, retorna quantas parcelas (inclusivo, minimo 1)
function monthDiff(start: string, end: string): number {
  const [sy, sm] = start.split('-').map(Number);
  const [ey, em] = end.split('-').map(Number);
  return Math.max(1, (ey - sy) * 12 + (em - sm) + 1);
}

interface Props {
  wallet: WalletHook;
  monthId: string;
}

export function PersonalExpensesPanel({ wallet, monthId }: Props) {
  const {
    categories, provisions, transactions,
    addTransaction, deleteTransaction, updateTransaction, getMonthProvisions,
    addCategory, updateCategory, deleteCategory,
    addProvision, updateProvision, deleteProvision, upsertProvisionException,
    reorderProvisions, reorderExpenses, getExpensesOrder,
  } = wallet;

  const { showValues } = usePrivacyStore();
  const fmt = (v: number) => {
    if (!showValues) return 'R$ •••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  };

  const [addOpen, setAddOpen] = useState(false);
  const [reorderOpen, setReorderOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [desc, setDesc] = useState('');

  const [cfgOpen, setCfgOpen] = useState(false);
  const [cfgTab, setCfgTab] = useState<'categories' | 'provisions'>('categories');

  const [catForm, setCatForm] = useState<{ id?: string; name: string; icon: string; color: string } | null>(null);
  const [catSaving, setCatSaving] = useState(false);

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
  const [listOpen, setListOpen] = useState(() => localStorage.getItem('wallet_expenses_open') === 'true');
  const toggleListOpen = () => {
    setListOpen(prev => {
      const next = !prev;
      localStorage.setItem('wallet_expenses_open', String(next));
      return next;
    });
  };

  // Ref para rastrear se a ordem foi editada manualmente nesta sessão (evita sobrescrita pelo efeito)
  const orderEditedRef = useRef(false);

  const [customRowOrder, setCustomRowOrder] = useState<string[]>(() => {
    if (getExpensesOrder) {
      const fromCloud = getExpensesOrder(monthId);
      if (fromCloud && fromCloud.length > 0) return fromCloud;
    }
    try {
      const saved = localStorage.getItem(`personal_expenses_order_${monthId}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Carrega a ordem apenas quando monthId muda (e não quando getExpensesOrder muda de referência)
  useEffect(() => {
    orderEditedRef.current = false;
    if (getExpensesOrder) {
      const order = getExpensesOrder(monthId);
      if (order && order.length > 0) {
        setCustomRowOrder(order);
        return;
      }
    }
    try {
      const saved = localStorage.getItem(`personal_expenses_order_${monthId}`);
      setCustomRowOrder(saved ? JSON.parse(saved) : []);
    } catch {
      setCustomRowOrder([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthId]);

  // Override pontual de provisao: editar o valor de uma provisao apenas neste mes
  const [provOverride, setProvOverride] = useState<{
    provId: string;
    label: string;
    originalAmount: number;
    amount: string;
  } | null>(null);
  const [overrideSaving, setOverrideSaving] = useState(false);

  // Edição genérica de despesa (manual ou provisão)
  const [expenseToEdit, setExpenseToEdit] = useState<{
    id: string;
    provId?: string;
    txId?: string;
    label: string;
    description?: string;
    amount: number;
    categoryId?: string;
    isProvision: boolean;
    isPaid: boolean;
  } | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editAmount, setEditAmount] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [batchLoading, setBatchLoading] = useState(false);

  // Drag & drop state
  const dragIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const activeProvisions = getMonthProvisions(monthId);
  const monthExpenses = transactions.filter(t => t.monthId === monthId && t.type === 'despesa');

  const baseRows = [
    ...activeProvisions.map(prov => {
      const isPaid = monthExpenses.some(t => t.provisionId === prov.id);
      const exception = wallet.provisionExceptions?.find(e => e.provisionId === prov.id && e.monthId === monthId);
      const effectiveAmount = exception ? exception.amount : prov.monthlyAmount;
      
      return {
        id: `prov-${prov.id}`,
        provId: prov.id,
        label: prov.categoryName,
        description: prov.description,
        amount: effectiveAmount,
        isProvision: true,
        isPaid,
        originalAmount: prov.monthlyAmount,
        realTotal: isPaid ? effectiveAmount : 0,
        txId: monthExpenses.find(t => t.provisionId === prov.id)?.id,
      };
    }),
    ...monthExpenses
      .filter(tx => !tx.provisionId) // exclui as despesas que são pagamentos de provisão
      .map(tx => ({
        id: tx.id,
        provId: undefined as string | undefined,
        label: tx.categoryName || tx.description || 'Despesa',
        description: (tx.categoryName && tx.categoryName !== tx.description) ? tx.description : undefined,
        amount: tx.amount,
        isProvision: false,
        isPaid: true, // Despesa manual lançada efetivamente nasce como paga
        originalAmount: tx.amount,
        realTotal: tx.amount,
        txId: tx.id,
      })),
  ];

  const rows = [...baseRows].sort((a, b) => {
    const idxA = customRowOrder.indexOf(a.id);
    const idxB = customRowOrder.indexOf(b.id);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return 0;
  });

  // Aplica a nova ordem e persiste
  const applyNewOrder = useCallback((newOrderIds: string[]) => {
    orderEditedRef.current = true;
    setCustomRowOrder(newOrderIds);
    if (reorderExpenses) {
      reorderExpenses(monthId, newOrderIds);
    } else {
      try {
        localStorage.setItem(`personal_expenses_order_${monthId}`, JSON.stringify(newOrderIds));
      } catch (err) {
        console.warn('Erro ao salvar ordem das despesas no cache:', err);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthId, reorderExpenses]);

  const moveRow = useCallback((index: number, direction: 'up' | 'down') => {
    setCustomRowOrder(prevOrder => {
      // Reconstrói rows com a ordem atual
      const currentRows = [...baseRows].sort((a, b) => {
        const idxA = prevOrder.indexOf(a.id);
        const idxB = prevOrder.indexOf(b.id);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return 0;
      });
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= currentRows.length) return prevOrder;
      const newRows = [...currentRows];
      const [moved] = newRows.splice(index, 1);
      newRows.splice(targetIndex, 0, moved);
      const newOrderIds = newRows.map(r => r.id);
      orderEditedRef.current = true;

      if (reorderExpenses) {
        reorderExpenses(monthId, newOrderIds);
      } else {
        try {
          localStorage.setItem(`personal_expenses_order_${monthId}`, JSON.stringify(newOrderIds));
        } catch (err) {
          console.warn('Erro ao salvar ordem das despesas no cache:', err);
        }
      }

      // Sincroniza provisões
      const orderedProvIds = newRows
        .filter(r => r.isProvision && r.provId)
        .map(r => r.provId as string);
      if (orderedProvIds.length > 0 && reorderProvisions) {
        reorderProvisions(orderedProvIds);
      }
      return newOrderIds;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthId, reorderExpenses, reorderProvisions, baseRows]);

  // Drag & Drop handlers para as linhas da tabela
  const handleDragStart = useCallback((index: number) => {
    dragIndexRef.current = index;
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  }, []);

  const handleDrop = useCallback((dropIndex: number) => {
    const dragIndex = dragIndexRef.current;
    if (dragIndex === null || dragIndex === dropIndex) {
      dragIndexRef.current = null;
      setDragOverIndex(null);
      return;
    }
    const newRows = [...rows];
    const [moved] = newRows.splice(dragIndex, 1);
    newRows.splice(dropIndex, 0, moved);
    const newOrderIds = newRows.map(r => r.id);
    applyNewOrder(newOrderIds);
    // Sincroniza provisões
    const orderedProvIds = newRows
      .filter(r => r.isProvision && r.provId)
      .map(r => r.provId as string);
    if (orderedProvIds.length > 0 && reorderProvisions) {
      reorderProvisions(orderedProvIds);
    }
    dragIndexRef.current = null;
    setDragOverIndex(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, applyNewOrder, reorderProvisions]);

  const handleDragEnd = useCallback(() => {
    dragIndexRef.current = null;
    setDragOverIndex(null);
  }, []);

  const totalExpenses = rows.reduce((acc, r) => acc + r.amount, 0);
  const totalPending = rows.filter(r => !r.isPaid).reduce((acc, r) => acc + r.amount, 0);

  const handleAdd = async () => {
    const v = parseBRL(amount);
    if (!v || v <= 0) { toast.error('Informe um valor valido.'); return; }
    const cat = categories.find(c => c.id === categoryId);
    const catName = cat?.name || (desc.trim() || 'Despesa');
    setSaving(true);
    try {
      // 1. Cria como provisão pontual do mês (permitindo desfazer, pagar, editar e projetar)
      const newProv = await addProvision({
        categoryId: categoryId && categoryId !== 'none' ? categoryId : null,
        categoryName: catName,
        description: desc.trim() || undefined,
        monthlyAmount: v,
        startMonthId: monthId,
        endMonthId: monthId,
      });

      // 2. Conforme solicitado, nasce efetivamente paga
      if (newProv) {
        await addTransaction({
          monthId,
          type: 'despesa',
          categoryId: newProv.categoryId,
          categoryName: newProv.categoryName,
          description: newProv.description || 'Despesa Manual',
          provisionId: newProv.id,
          amount: v,
        });
      }
      toast.success('Despesa lançada como paga!');
      setAddOpen(false);
      setAmount(''); setCategoryId(''); setDesc('');
    } catch (e: any) {
      toast.error('Erro ao lançar despesa: ' + (e.message || ''));
    }
    setSaving(false);
  };

  const handlePayProvision = async (provId: string, label: string, amt: number, silent = false) => {
    const prov = provisions.find(p => p.id === provId);
    try {
      await addTransaction({
        monthId,
        type: 'despesa',
        categoryId: prov?.categoryId || null,
        categoryName: label,
        description: prov?.description || 'Pagamento de Provisão',
        provisionId: provId,
        amount: amt,
      });
      if (!silent) toast.success('Provisão paga!');
    } catch (e: any) {
      if (!silent) {
        if (e.message?.includes('idx_unique_provision_payment')) {
          toast.error('Esta provisão já foi paga neste mês.');
        } else {
          toast.error('Erro ao pagar provisão: ' + e.message);
        }
      }
    }
  };

  const handleUndoPayment = async (row: typeof rows[0]) => {
    try {
      if (row.isProvision && row.txId) {
        await deleteTransaction(row.txId);
        toast.success('Pagamento desfeito! A despesa agora consta a pagar.');
      } else if (!row.isProvision && row.txId) {
        // Despesa manual legada que não tinha provisão: converte em provisão pontual do mês
        const cat = categories.find(c => c.name === row.label);
        await addProvision({
          categoryId: cat?.id || null,
          categoryName: row.label,
          description: row.description,
          monthlyAmount: row.amount,
          startMonthId: monthId,
          endMonthId: monthId,
        });
        await deleteTransaction(row.txId);
        toast.success('Pagamento desfeito! A despesa agora consta a pagar.');
      }
    } catch (e: any) {
      toast.error('Erro ao desfazer pagamento: ' + (e.message || ''));
    }
  };

  const openEditExpense = (row: typeof rows[0]) => {
    const cat = categories.find(c => c.name === row.label || c.id === (row as any).categoryId);
    setExpenseToEdit({
      id: row.id,
      provId: row.provId,
      txId: row.txId,
      label: row.label,
      description: row.description,
      amount: row.amount,
      categoryId: cat?.id || '',
      isProvision: row.isProvision,
      isPaid: row.isPaid,
    });
    setEditAmount(row.amount.toFixed(2).replace('.', ','));
    setEditCategoryId(cat?.id || 'none');
    setEditDesc(row.description || '');
  };

  const handleSaveEditExpense = async () => {
    if (!expenseToEdit) return;
    const v = parseBRL(editAmount);
    if (!v || v <= 0) { toast.error('Informe um valor valido.'); return; }
    const cat = categories.find(c => c.id === editCategoryId);
    const catName = cat?.name || (editDesc.trim() || expenseToEdit.label);

    setEditSaving(true);
    try {
      if (expenseToEdit.provId) {
        const prov = provisions.find(p => p.id === expenseToEdit.provId);
        const isPontual = prov && prov.startMonthId === prov.endMonthId;

        if (isPontual) {
          await updateProvision(expenseToEdit.provId, {
            categoryId: editCategoryId && editCategoryId !== 'none' ? editCategoryId : null,
            categoryName: catName,
            description: editDesc.trim() || undefined,
            monthlyAmount: v,
          });
        } else {
          await upsertProvisionException(expenseToEdit.provId, monthId, v);
        }

        if (expenseToEdit.txId) {
          await updateTransaction(expenseToEdit.txId, {
            amount: v,
            categoryId: editCategoryId && editCategoryId !== 'none' ? editCategoryId : null,
            categoryName: catName,
            description: editDesc.trim() || undefined,
          });
        }
      } else if (expenseToEdit.txId) {
        await updateTransaction(expenseToEdit.txId, {
          amount: v,
          categoryId: editCategoryId && editCategoryId !== 'none' ? editCategoryId : null,
          categoryName: catName,
          description: editDesc.trim() || undefined,
        });
      }
      toast.success('Despesa atualizada com sucesso!');
      setExpenseToEdit(null);
    } catch (e: any) {
      toast.error('Erro ao atualizar despesa: ' + (e.message || ''));
    }
    setEditSaving(false);
  };

  const handleDeleteExpenseRow = async (row: typeof rows[0]) => {
    if (!window.confirm(`Excluir a despesa "${row.label}"?`)) return;
    try {
      if (row.txId) {
        await deleteTransaction(row.txId);
      }
      if (row.provId) {
        const prov = provisions.find(p => p.id === row.provId);
        if (prov && prov.startMonthId === prov.endMonthId) {
          await deleteProvision(row.provId);
        }
      }
      toast.success('Despesa excluída!');
    } catch (e: any) {
      toast.error('Erro ao excluir despesa: ' + (e.message || ''));
    }
  };

  // 3.1 - Pagar todos (silencioso durante o loop, exibe apenas um alerta final com o total)
  const handlePayAll = async () => {
    const unpaids = rows.filter(r => !r.isPaid);
    if (unpaids.length === 0) {
      toast.info('Todas as despesas deste mês já estão pagas.');
      return;
    }
    setBatchLoading(true);
    let successCount = 0;
    try {
      for (const row of unpaids) {
        if (row.provId) {
          await handlePayProvision(row.provId, row.label, row.amount, true);
          successCount++;
        }
      }
      toast.success(`${successCount} ${successCount === 1 ? 'despesa marcada' : 'despesas marcadas'} como paga! Todas estão pagas.`);
    } catch (e: any) {
      toast.error('Erro ao pagar despesas: ' + (e.message || ''));
    }
    setBatchLoading(false);
  };

  // 3.2 - Desfazer todos
  const handleUndoAll = async () => {
    const paids = rows.filter(r => r.isPaid);
    if (paids.length === 0) {
      toast.info('Todas as despesas deste mês já estão a pagar.');
      return;
    }
    setBatchLoading(true);
    let successCount = 0;
    try {
      for (const row of paids) {
        if (row.isProvision && row.txId) {
          await deleteTransaction(row.txId);
          successCount++;
        } else if (!row.isProvision && row.txId) {
          const cat = categories.find(c => c.name === row.label);
          await addProvision({
            categoryId: cat?.id || null,
            categoryName: row.label,
            description: row.description,
            monthlyAmount: row.amount,
            startMonthId: monthId,
            endMonthId: monthId,
          });
          await deleteTransaction(row.txId);
          successCount++;
        }
      }
      toast.success(`${successCount} ${successCount === 1 ? 'pagamento desfeito' : 'pagamentos desfeitos'}. Todas as despesas estão a pagar.`);
    } catch (e: any) {
      toast.error('Erro ao desfazer pagamentos: ' + (e.message || ''));
    }
    setBatchLoading(false);
  };

  const openNewCat = () => setCatForm({ name: '', icon: '🏷️', color: '#8b5cf6' });
  const openEditCat = (c: PersonalCategory) => setCatForm({ id: c.id, name: c.name, icon: c.icon, color: c.color });

  const handleSaveCat = async () => {
    if (!catForm?.name.trim()) { toast.error('Informe o nome da categoria.'); return; }
    setCatSaving(true);
    try {
      if (catForm.id) {
        await updateCategory(catForm.id, { name: catForm.name.trim(), icon: catForm.icon, color: catForm.color });
        toast.success('Categoria atualizada!');
      } else {
        await addCategory({ name: catForm.name.trim(), icon: catForm.icon || '🏷️', color: catForm.color || '#8b5cf6' });
        toast.success('Categoria criada!');
      }
      setCatForm(null);
    } catch (e: any) {
      toast.error('Erro: ' + e.message);
    }
    setCatSaving(false);
  };

  const handleDeleteCat = async (id: string, name: string) => {
    // Verificar se esta em uso antes de excluir
    const inUseInTx = transactions.some(t => t.categoryId === id);
    const inUseInProv = provisions.some(p => p.categoryId === id);
    if (inUseInTx || inUseInProv) {
      toast.error(`A categoria "${name}" não pode ser excluída pois está em uso.`);
      return;
    }

    if (!window.confirm(`Tem certeza que deseja excluir a categoria "${name}"?`)) return;
    try {
      await deleteCategory(id);
      toast.success('Categoria excluida.');
    } catch (e: any) {
      toast.error('Erro ao excluir categoria: ' + e.message);
    }
  };

  const openNewProv = () => setProvForm({
    categoryId: '', categoryName: '', description: '', monthlyAmount: '',
    startMonthId: monthId, installments: '', endMonthId: '',
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
      ? String(monthDiff(p.startMonthId, p.endMonthId))
      : '',
    endMonthId: p.endMonthId || '',
  });

  // Handler: salvar override pontual de provisao
  const handleSaveOverride = async () => {
    if (!provOverride) return;
    const v = parseBRL(provOverride.amount);
    if (v <= 0) { toast.error('Informe um valor maior que zero.'); return; }
    setOverrideSaving(true);
    try {
      await upsertProvisionException(provOverride.provId, monthId, v);
      toast.success('Valor da provisão atualizado para este mês!');
      setProvOverride(null);
    } catch (e: any) {
      toast.error('Erro ao atualizar: ' + e.message);
    }
    setOverrideSaving(false);
  };

  const handleInstallmentsChange = (val: string) => {
    if (!provForm) return;
    const n = parseInt(val);
    if (!isNaN(n) && n > 0 && provForm.startMonthId) {
      const endId = addMonths(provForm.startMonthId, n);
      setProvForm({ ...provForm, installments: val, endMonthId: endId });
    } else {
      setProvForm({ ...provForm, installments: val, endMonthId: '' });
    }
  };

  const handleSaveProv = async () => {
    if (!provForm) return;
    const amt = parseBRL(provForm.monthlyAmount);
    if (amt <= 0) { toast.error('Informe um valor valido.'); return; }
    let catName = provForm.categoryName.trim();
    if (provForm.categoryId) {
      const cat = categories.find(c => c.id === provForm.categoryId);
      if (cat) catName = cat.name;
    }
    if (!catName) { toast.error('Informe a categoria/nome da provisao.'); return; }
    if (!provForm.startMonthId) { toast.error('Informe o mes inicial.'); return; }
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
        await updateProvision(provForm.id, payload);
        toast.success('Provisao atualizada!');
      } else {
        await addProvision(payload);
        toast.success('Provisao criada!');
      }
      setProvForm(null);
    } catch (e: any) {
      toast.error('Erro: ' + e.message);
    }
    setProvSaving(false);
  };

  const handleDeleteProv = async (id: string, name: string) => {
    if (!window.confirm(`Excluir provisao "${name}"?`)) return;
    await deleteProvision(id);
    toast.success('Provisao excluida.');
  };

  return (
    <>
      <Card className={!listOpen ? "h-[140px]" : ""}>
        <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-4 px-2.5 sm:px-4">
          <CardTitle className="text-base flex flex-col items-start gap-0.5">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-500" /> Despesas do Mês
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-red-400">{fmt(totalExpenses)} total</span>
              {totalPending > 0 && (
                <span className="text-xs font-medium text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                  Falta pagar: {fmt(totalPending)}
                </span>
              )}
            </div>
          </CardTitle>
          {/* Botoes de acao — responsivos */}
          <div className="flex items-center gap-1.5">
            {/* Desktop: Categorias e Provisões */}
            <Button
              size="sm" variant="ghost"
              onClick={() => setCfgOpen(true)}
              className="h-8 text-xs gap-1 text-muted-foreground px-2 hidden sm:inline-flex"
              title="Categorias e Provisões"
            >
              <Settings2 className="w-3 h-3 shrink-0" />
              <span>Categorias e Provisões</span>
            </Button>

            {/* Desktop: Lançar */}
            <Button
              size="sm"
              onClick={() => setAddOpen(true)}
              className="h-8 text-xs gap-1 px-3 hidden sm:inline-flex"
              title="Lançar despesa"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>Lançar</span>
            </Button>

            {/* Menu de ações: exibido exclusivamente em Mobile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground sm:hidden"
                  title="Mais opções"
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setAddOpen(true)} className="gap-2 text-xs cursor-pointer">
                  <Plus className="w-3.5 h-3.5 text-primary" />
                  <span>+ Lançar Despesa</span>
                </DropdownMenuItem>
                {rows.length > 0 && (
                  <>
                    <DropdownMenuItem onClick={handlePayAll} className="gap-2 text-xs cursor-pointer text-emerald-400 focus:text-emerald-300">
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>Pagar todos</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleUndoAll} className="gap-2 text-xs cursor-pointer text-muted-foreground">
                      <Undo2 className="w-3.5 h-3.5" />
                      <span>Desfazer todos</span>
                    </DropdownMenuItem>
                  </>
                )}
                {rows.length > 1 && (
                  <DropdownMenuItem onClick={() => setReorderOpen(true)} className="gap-2 text-xs cursor-pointer">
                    <ArrowUpDown className="w-3.5 h-3.5 text-blue-400" />
                    <span>Ordenar Despesas</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setCfgOpen(true)} className="gap-2 text-xs cursor-pointer">
                  <Settings2 className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Categorias e Provisões</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Chevron — sempre visível */}
            <button
              onClick={toggleListOpen}
              className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors shrink-0"
              title={listOpen ? 'Ocultar lista' : 'Expandir lista'}
            >
              {listOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0 px-2 sm:px-4">
          {/* Lista colapsavel com efeito visual */}
          {listOpen && (
            <div className="space-y-2">
              {/* Barra de ações em lote rápida no mobile */}
              {rows.length > 0 && (
                <div className="flex items-center justify-between pb-1 pt-0.5 sm:hidden px-1">
                  <span className="text-[11px] font-medium text-muted-foreground">Ações em lote</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handlePayAll}
                      disabled={batchLoading}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 transition-all disabled:opacity-50 shrink-0"
                      title="Marcar todas as despesas como pagas"
                    >
                      <CheckCheck className="w-3 h-3" />
                      <span>Pagar todos</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleUndoAll}
                      disabled={batchLoading}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold text-muted-foreground bg-muted hover:bg-muted/80 hover:text-foreground border border-border transition-all disabled:opacity-50 shrink-0"
                      title="Desfazer todos os pagamentos"
                    >
                      <Undo2 className="w-3 h-3" />
                      <span>Desfazer todos</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="rounded-md border border-primary/20 overflow-hidden shadow-[0_0_12px_rgba(16,185,129,0.08)] bg-gradient-to-b from-muted/30 to-transparent">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="text-xs py-2 px-2 sm:px-4">Categoria</TableHead>
                      {/* Mobile Header: apenas label Realizado alinhado com a coluna de valor */}
                      <TableHead className="text-xs text-right py-2 pr-1.5 whitespace-nowrap sm:hidden">
                        Realizado
                      </TableHead>
                      <TableHead className="w-[32px] py-2 pr-2 sm:hidden" />

                      {/* Desktop Header: Realizado + Pagar todos + Desfazer todos */}
                      <TableHead colSpan={2} className="text-xs text-right py-2 pr-3 hidden sm:table-cell">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-muted-foreground font-medium text-xs">Realizado</span>
                          {rows.length > 0 && (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={handlePayAll}
                                disabled={batchLoading}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 transition-all disabled:opacity-50 shrink-0"
                                title="Marcar todas as despesas como pagas"
                              >
                                <CheckCheck className="w-3 h-3" />
                                <span>Pagar todos</span>
                              </button>
                              <button
                                type="button"
                                onClick={handleUndoAll}
                                disabled={batchLoading}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold text-muted-foreground bg-muted hover:bg-muted/80 hover:text-foreground border border-border transition-all disabled:opacity-50 shrink-0"
                                title="Desfazer todos os pagamentos"
                              >
                                <Undo2 className="w-3 h-3" />
                                <span>Desfazer todos</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-6 text-sm">
                          <Receipt className="w-6 h-6 mx-auto mb-1 opacity-20" />
                          Nenhuma despesa ou provisão ativa.
                        </TableCell>
                      </TableRow>
                    ) : rows.map((row, index) => {
                      // Resolve icone da categoria
                      const cat = categories.find(c => c.id === (row as any).categoryId || c.name === row.label);
                      const CatIcon = cat ? (ICON_NAME_MAP[cat.icon] || Tag) : Tag;
                      const catColor = cat?.color || '#6b7280';
                      const isDragOver = dragOverIndex === index;

                      return (
                        <TableRow
                          key={row.id}
                          draggable={rows.length > 1}
                          onDragStart={() => handleDragStart(index)}
                          onDragOver={(e) => handleDragOver(e, index)}
                          onDrop={() => handleDrop(index)}
                          onDragEnd={handleDragEnd}
                          className={cn(
                            "group transition-all",
                            row.isPaid ? 'bg-emerald-500/10 hover:bg-emerald-500/20' : 'hover:bg-muted/40',
                            isDragOver && 'border-t-2 border-primary/60 bg-primary/5',
                            rows.length > 1 && 'cursor-grab active:cursor-grabbing'
                          )}
                        >
                          {/* Celula: handle drag + setas de ordenação web + icone + nome + descricao */}
                          <TableCell className="text-sm font-medium py-2 px-2 sm:px-4 max-w-0 w-full">
                            <div className="flex items-center gap-2 min-w-0">
                              {/* Handle de drag & drop + setas (desktop) */}
                              {rows.length > 1 && (
                                <div className="hidden sm:flex flex-col items-center justify-center -ml-1 mr-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 gap-0.5">
                                  {/* Ícone de arrastar */}
                                  <span className="text-muted-foreground/60 hover:text-primary cursor-grab active:cursor-grabbing" title="Arrastar para reordenar">
                                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                                      <path d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                                    </svg>
                                  </span>
                                  <button
                                    type="button"
                                    disabled={index === 0}
                                    onClick={(e) => { e.stopPropagation(); moveRow(index, 'up'); }}
                                    className={cn(
                                      "w-3.5 h-3.5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors",
                                      index === 0 && "opacity-20 cursor-not-allowed hover:bg-transparent"
                                    )}
                                    title="Mover para cima"
                                  >
                                    <ChevronUp className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={index === rows.length - 1}
                                    onClick={(e) => { e.stopPropagation(); moveRow(index, 'down'); }}
                                    className={cn(
                                      "w-3.5 h-3.5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors",
                                      index === rows.length - 1 && "opacity-20 cursor-not-allowed hover:bg-transparent"
                                    )}
                                    title="Mover para baixo"
                                  >
                                    <ChevronDown className="w-3 h-3" />
                                  </button>
                                </div>
                              )}

                              {/* Icone da categoria */}
                              <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: `${catColor}20` }}>
                                <CatIcon className="w-3.5 h-3.5" style={{ color: catColor }} />
                              </div>
                              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  {row.isPaid && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 sm:hidden shrink-0" />}
                                  <span className="font-semibold text-foreground leading-tight text-xs sm:text-sm truncate" title={row.label}>
                                    {row.label}
                                  </span>
                                </div>
                                {/* Descrição: oculta em mobile, visível apenas no desktop */}
                                {row.description && (
                                  <span
                                    className="text-[10px] text-[#16e0c4] leading-tight truncate font-normal cursor-help hidden sm:block"
                                    title={row.description}
                                  >
                                    {row.description}
                                  </span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className={`text-right text-xs sm:text-sm font-semibold py-2 whitespace-nowrap pl-1 pr-2 sm:px-2 ${row.isPaid ? 'text-emerald-500' : (row.amount > 0 ? 'text-red-400' : 'text-emerald-500')}`}>
                            {fmt(row.amount)}
                          </TableCell>
                        <TableCell className="py-2 pl-0 pr-1.5 sm:pr-3 w-[1%] whitespace-nowrap text-right">
                          <div className="flex items-center gap-1 justify-end">
                            {/* Desktop: PAGO / Desfazer ou Pagar */}
                            {row.isPaid ? (
                              <>
                                <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/20 px-2 py-0.5 rounded-md hidden sm:inline-flex items-center gap-1 border border-emerald-500/20 shrink-0">
                                  <CheckCircle2 className="w-3 h-3" /> PAGO
                                </span>
                                <Button
                                  variant="ghost" size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive shrink-0 hidden sm:inline-flex"
                                  title="Desfazer pagamento"
                                  onClick={() => handleUndoPayment(row)}
                                >
                                  <Undo2 className="w-3.5 h-3.5" />
                                </Button>
                              </>
                            ) : (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-7 text-[10px] px-2.5 text-primary hover:bg-primary/10 shrink-0 font-medium hidden sm:inline-flex" 
                                onClick={() => row.provId && handlePayProvision(row.provId, row.label, row.amount)}
                              >
                                Pagar
                              </Button>
                            )}

                            {/* Menu de 3 pontinhos unificado com Pagar (Mobile), Editar e Excluir */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted/80 shrink-0"
                                  title="Opções da despesa"
                                >
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-38">
                                {/* No mobile: opção Pagar se não pago */}
                                {!row.isPaid && (
                                  <DropdownMenuItem
                                    onClick={() => row.provId && handlePayProvision(row.provId, row.label, row.amount)}
                                    className="text-emerald-400 focus:bg-emerald-500/10 focus:text-emerald-300 font-medium cursor-pointer sm:hidden"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5 mr-2 text-emerald-500" /> Pagar
                                  </DropdownMenuItem>
                                )}
                                {/* No mobile: opção Desfazer se pago */}
                                {row.isPaid && (
                                  <DropdownMenuItem
                                    onClick={() => handleUndoPayment(row)}
                                    className="text-muted-foreground focus:bg-muted cursor-pointer sm:hidden"
                                  >
                                    <Undo2 className="w-3.5 h-3.5 mr-2" /> Desfazer
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => openEditExpense(row)}
                                  className="text-foreground focus:bg-muted cursor-pointer"
                                >
                                  <Pencil className="w-3.5 h-3.5 mr-2 text-primary" /> Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDeleteExpenseRow(row)}
                                  className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5 mr-2" /> Excluir
                                </DropdownMenuItem>
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
          </div>
        )}
          {/* Linha de resumo quando lista esta oculta */}
          {!listOpen && rows.length > 0 && (
            <p className="text-xs text-muted-foreground text-center py-1">
              {rows.length} {rows.length === 1 ? 'item' : 'itens'} — clique em <ChevronDown className="inline w-3 h-3" /> para expandir
            </p>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Lancar Despesa */}
      <Dialog open={addOpen} onOpenChange={(open) => {
        setAddOpen(open);
        if (!open) { setAmount(''); setCategoryId(''); setDesc(''); }
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Lancar Despesa</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Categoria</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue placeholder="Selecione ou deixe livre" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem categoria</SelectItem>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="flex items-center gap-1.5">
                Descricao
                <span className="text-[10px] text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <Input
                value={desc}
                onChange={e => setDesc(e.target.value)}
                placeholder="Ex: Conta de luz, Supermercado..."
              />
              {desc.trim() && (
                <p className="text-[10px] text-[#16e0c4]/80 mt-1 leading-tight">
                  Aparecera em verde abaixo do nome da categoria
                </p>
              )}
            </div>
            <div>
              <Label>Valor</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                <Input className="pl-9" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00" inputMode="decimal" autoFocus />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
            <Button onClick={handleAdd} disabled={saving}>{saving ? 'Lancando...' : 'Lancar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Configuracoes (Categorias + Provisoes) */}
      <Dialog open={cfgOpen} onOpenChange={setCfgOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-primary" /> Categorias e Provisoes Pessoais
            </DialogTitle>
          </DialogHeader>
          <div className="flex gap-2 mb-4">
            <Button size="sm" variant={cfgTab === 'categories' ? 'default' : 'ghost'} className="gap-1.5" onClick={() => setCfgTab('categories')}>
              <Tag className="w-3 h-3" /> Categorias
            </Button>
            <Button size="sm" variant={cfgTab === 'provisions' ? 'default' : 'ghost'} className="gap-1.5" onClick={() => setCfgTab('provisions')}>
              <CalendarClock className="w-3 h-3" /> Provisoes
            </Button>
          </div>

          {cfgTab === 'categories' && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <Button size="sm" onClick={openNewCat} className="gap-1"><Plus className="w-3 h-3" /> Nova Categoria</Button>
              </div>
              <div className="rounded-md border border-border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="text-xs">Nome</TableHead>
                      <TableHead className="text-xs">Icone</TableHead>
                      <TableHead className="w-[80px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.length === 0 ? (
                      <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6 text-sm">Nenhuma categoria criada.</TableCell></TableRow>
                    ) : categories.map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium text-sm py-2">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                            {c.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm py-2">
                          {(() => {
                            const IconComp = ICON_NAME_MAP[c.icon];
                            return IconComp
                              ? <IconComp className="w-4 h-4" style={{ color: c.color }} />
                              : <span>{c.icon}</span>; // fallback para emojis legados
                          })()}
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="flex items-center gap-1 justify-end">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditCat(c)}><Pencil className="w-3 h-3" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteCat(c.id, c.name)}><Trash2 className="w-3 h-3" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {cfgTab === 'provisions' && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <Button size="sm" onClick={openNewProv} className="gap-1"><Plus className="w-3 h-3" /> Nova Provisao</Button>
              </div>
              <div className="rounded-md border border-border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="text-xs">Provisão</TableHead>
                      <TableHead className="text-xs text-right">Valor/mês</TableHead>
                      {/* Início e Fim: ocultos em mobile */}
                      <TableHead className="text-xs hidden sm:table-cell">Início</TableHead>
                      <TableHead className="text-xs hidden sm:table-cell">Fim</TableHead>
                      <TableHead className="w-[40px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {provisions.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6 text-sm">Nenhuma provisao configurada.</TableCell></TableRow>
                    ) : provisions.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium text-sm py-2">{p.categoryName}</TableCell>
                        <TableCell className="text-right text-sm text-amber-400 py-2">{fmt(p.monthlyAmount)}</TableCell>
                        {/* Início/Fim: ocultos em mobile */}
                        <TableCell className="text-xs text-muted-foreground py-2 hidden sm:table-cell">{p.startMonthId}</TableCell>
                        <TableCell className="text-xs text-muted-foreground py-2 hidden sm:table-cell">
                          {p.endMonthId ? (
                            <span className="flex items-center gap-1"><CalendarClock className="w-3 h-3 text-amber-400" />{p.endMonthId}</span>
                          ) : (
                            <span className="text-muted-foreground/40">Indefinida</span>
                          )}
                        </TableCell>
                        {/* Ações: desktop = 2 botões; mobile = 3-pontos dropdown */}
                        <TableCell className="py-2">
                          {/* Desktop */}
                          <div className="hidden sm:flex items-center gap-1 justify-end">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditProv(p)}><Pencil className="w-3 h-3" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteProv(p.id, p.categoryName)}><Trash2 className="w-3 h-3" /></Button>
                          </div>
                          {/* Mobile: dropdown 3-pontos */}
                          <div className="sm:hidden flex justify-end">
                            <details className="relative group">
                              <summary className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer list-none">
                                <MoreVertical className="w-3.5 h-3.5" />
                              </summary>
                              <div className="absolute right-0 top-7 z-50 bg-popover border border-border rounded-md shadow-lg py-1 min-w-[110px]">
                                <button
                                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted text-left"
                                  onClick={() => { openEditProv(p); }}
                                >
                                  <Pencil className="w-3 h-3" /> Editar
                                </button>
                                <button
                                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-destructive/10 text-destructive text-left"
                                  onClick={() => handleDeleteProv(p.id, p.categoryName)}
                                >
                                  <Trash2 className="w-3 h-3" /> Excluir
                                </button>
                              </div>
                            </details>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
            <div className="space-y-3 py-2">
              <div>
                <Label>Categoria</Label>
                <Select
                  value={provForm.categoryId || 'free'}
                  onValueChange={val => {
                    if (val === 'free') {
                      setProvForm({ ...provForm, categoryId: '' });
                    } else {
                      const cat = categories.find(c => c.id === val);
                      setProvForm({ ...provForm, categoryId: val, categoryName: cat?.name || '' });
                    }
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione ou use nome livre" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Nome livre (abaixo)</SelectItem>
                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {!provForm.categoryId && (
                <div>
                  <Label className="flex items-center gap-1">
                    Nome da Provisao
                    <span className="text-[10px] text-muted-foreground font-normal">(nome livre)</span>
                  </Label>
                  <Input value={provForm.categoryName} onChange={e => setProvForm({ ...provForm, categoryName: e.target.value })} placeholder="Ex: Parcela do Carro, Plano de Saude..." />
                </div>
              )}
              {/* Campo descricao opcional — aparece em verde na carteira */}
              <div>
                <Label className="flex items-center gap-1.5">
                  Descricao
                  <span className="text-[10px] text-muted-foreground font-normal">(opcional)</span>
                </Label>
                <Input
                  value={provForm.description}
                  onChange={e => setProvForm({ ...provForm, description: e.target.value })}
                  placeholder="Ex: Fatura Nubank, Boleto Renault..."
                />
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
              <div className="space-y-3">
                <div>
                  <Label>Mes Inicial</Label>
                  <div className="mt-1">
                    <WalletMonthPicker
                      value={provForm.startMonthId}
                      onChange={newStart => {
                        const n = parseInt(provForm.installments);
                        const newEnd = (!isNaN(n) && n > 0) ? addMonths(newStart, n) : provForm.endMonthId;
                        setProvForm({ ...provForm, startMonthId: newStart, endMonthId: newEnd });
                      }}
                    />
                  </div>
                </div>
                <div>
                  <Label className="flex items-center gap-1">
                    Parcelas
                    <span className="text-[10px] text-muted-foreground font-normal">(opc.)</span>
                  </Label>
                  <Input className="mt-1" type="number" min="1" value={provForm.installments} onChange={e => handleInstallmentsChange(e.target.value)} placeholder="Ex: 15" />
                </div>
              </div>
              <div>
                <Label className="flex items-center gap-1">
                  Mes Final
                  <span className="text-[10px] text-muted-foreground font-normal">(calc. pelas parcelas ou manual)</span>
                </Label>
                <div className="mt-1">
                  <WalletMonthPicker
                    value={provForm.endMonthId}
                    clearable
                    onClear={() => setProvForm({ ...provForm, endMonthId: '', installments: '' })}
                    onChange={v => {
                      const parcelas = v && provForm.startMonthId
                        ? String(monthDiff(provForm.startMonthId, v))
                        : '';
                      setProvForm({ ...provForm, endMonthId: v, installments: parcelas });
                    }}
                  />
                </div>
                {provForm.endMonthId ? (
                  <p className="text-[10px] text-[#16e0c4]/80 mt-1 leading-tight">
                    Provisao ativa de {provForm.startMonthId} ate {provForm.endMonthId} inclusive.
                    {provForm.installments && ` (${provForm.installments} parcelas)`}
                  </p>
                ) : (
                  <p className="text-[10px] text-muted-foreground mt-1 leading-tight">Sem prazo — provisao ativa indefinidamente.</p>
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

      {/* Dialog: Ajuste Pontual de Provisao neste Mes */}
      <Dialog open={!!provOverride} onOpenChange={open => { if (!open) setProvOverride(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-4 h-4 text-primary" />
              Editar Provisão em {monthId}
            </DialogTitle>
          </DialogHeader>
          {provOverride && (
            <div className="space-y-3 py-2">
              {/* Campo de valor — primeiro, sem distracoes */}
              <div>
                <Label>Valor Gasto (R$)</Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                  <Input
                    className="pl-9"
                    value={provOverride.amount}
                    onChange={e => setProvOverride({ ...provOverride, amount: e.target.value })}
                    placeholder="0,00"
                    inputMode="decimal"
                    autoFocus
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:gap-2">
            <Button variant="outline" onClick={() => setProvOverride(null)} className="w-full sm:w-auto">Cancelar</Button>
            <Button onClick={handleSaveOverride} disabled={overrideSaving} className="w-full sm:w-auto">
              {overrideSaving ? 'Salvando...' : 'Salvar Valor'}
            </Button>
          </DialogFooter>
          {/* Alerta informativo — abaixo dos botoes, menos intrusivo */}
          {provOverride && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary space-y-0.5">
              <p className="font-medium">ℹ️ Edição exclusiva para este mês</p>
              <p>O valor de <strong>{provOverride.label}</strong> será ajustado apenas em <strong>{monthId}</strong>. A configuração global ({fmt(provOverride.originalAmount)}) não será alterada.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Ordenar Despesas (Mobile & Desktop) */}
      <Dialog open={reorderOpen} onOpenChange={setReorderOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-blue-400" />
              Ordenar Despesas
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <p className="text-xs text-muted-foreground">
              Ajuste a ordem de exibição das despesas usando as setas:
            </p>
            <div className="max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-blue-500/80 scrollbar-track-transparent space-y-2 pr-1">
              {rows.map((row, idx) => {
                const cat = categories.find(c => c.id === (row as any).categoryId || c.name === row.label);
                const CatIcon = cat ? (ICON_NAME_MAP[cat.icon] || Tag) : Tag;
                const catColor = cat?.color || '#ef4444';

                return (
                  <div
                    key={row.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/20"
                    style={{ borderLeftColor: catColor, borderLeftWidth: 3 }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: catColor + '20' }}>
                        <CatIcon className="w-3 h-3" style={{ color: catColor }} />
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-semibold truncate">{row.label}</p>
                        <p className="text-[10px] text-muted-foreground">{fmt(row.amount)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        disabled={idx === 0}
                        onClick={() => moveRow(idx, 'up')}
                        title="Subir"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        disabled={idx === rows.length - 1}
                        onClick={() => moveRow(idx, 'down')}
                        title="Descer"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setReorderOpen(false)} className="w-full text-xs">
              Concluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Editar Despesa (Manual ou Provisão) */}
      <Dialog open={!!expenseToEdit} onOpenChange={(open) => { if (!open) setExpenseToEdit(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-4 h-4 text-primary" /> Editar Despesa
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Categoria</Label>
              <Select value={editCategoryId} onValueChange={setEditCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem categoria</SelectItem>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                        {c.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descrição / Nome</Label>
              <Input
                value={editDesc}
                onChange={e => setEditDesc(e.target.value)}
                placeholder="Ex: Farmácia, Luz, Compras"
              />
            </div>
            <div>
              <Label>Valor</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                <Input
                  className="pl-9"
                  value={editAmount}
                  onChange={e => setEditAmount(e.target.value)}
                  placeholder="0,00"
                  inputMode="decimal"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpenseToEdit(null)}>Cancelar</Button>
            <Button onClick={handleSaveEditExpense} disabled={editSaving}>
              {editSaving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
