// ============================================================
// Hook: usePersonalWallet
// Gerencia toda a lógica de dados da Carteira Pessoal.
// Separa completamente os dados da PJ (lidos via useFinance)
// dos dados da PF (tabelas personal_*).
// ============================================================
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type {
  PersonalWalletSettings,
  PersonalCategory,
  PersonalProvision,
  PersonalReserve,
  PersonalTransaction,
  PersonalAllocationRule,
  PersonalIncome,
  PersonalMonthSummary,
  PersonalProvisionException,
} from '@/types/personalWallet';

// Categorias da PJ que geram receita pessoal (por nome, blindado)
export const PJ_INCOME_CATEGORIES = ['Pró-labore', 'FP', 'Retirada PL'] as const;

export function usePersonalWallet() {
  const { user } = useAuth();

  // ---- Estado ----
  const [settings, setSettings] = useState<PersonalWalletSettings | null>(null);
  const [categories, setCategories] = useState<PersonalCategory[]>([]);
  const [provisions, setProvisions] = useState<PersonalProvision[]>([]);
  const [reserves, setReserves] = useState<PersonalReserve[]>([]);
  const [transactions, setTransactions] = useState<PersonalTransaction[]>([]);
  const [allocationRules, setAllocationRules] = useState<PersonalAllocationRule[]>([]);
  const [provisionExceptions, setProvisionExceptions] = useState<PersonalProvisionException[]>([]);
  const [loading, setLoading] = useState(true);

  // ---- Carregar dados ----
  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const fetchAllData = async () => {
      return await Promise.all([
        supabase.from('personal_wallet_settings').select('*').eq('user_id', user.id).limit(1),
        supabase.from('personal_categories').select('*').eq('user_id', user.id).order('name'),
        supabase.from('personal_provisions').select('*').eq('user_id', user.id),
        supabase.from('personal_reserves').select('*').eq('user_id', user.id).order('created_at'),
        supabase.from('personal_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('personal_provision_exceptions').select('*').eq('user_id', user.id),
        supabase.from('personal_allocation_rules').select('*').eq('user_id', user.id).order('sort_order'),
      ]);
    };

    let [settingsRes, catsRes, provsRes, reservesRes, txRes, exceptionsRes, allocRes] = await fetchAllData();

    // Se houver falha na primeira tentativa, aguarda 600ms e tenta mais uma vez antes de disparar erro
    let criticalError = settingsRes.error || catsRes.error || provsRes.error ||
      reservesRes.error || txRes.error || exceptionsRes.error;

    if (criticalError) {
      await new Promise(r => setTimeout(r, 600));
      const retryResults = await fetchAllData();
      settingsRes = retryResults[0];
      catsRes = retryResults[1];
      provsRes = retryResults[2];
      reservesRes = retryResults[3];
      txRes = retryResults[4];
      exceptionsRes = retryResults[5];
      allocRes = retryResults[6];
      criticalError = settingsRes.error || catsRes.error || provsRes.error ||
        reservesRes.error || txRes.error || exceptionsRes.error;
    }

    if (criticalError) {
      console.error('Falha ao carregar dados da carteira pessoal após retry:', {
        settings: settingsRes.error,
        cats: catsRes.error,
        provs: provsRes.error,
        reserves: reservesRes.error,
        txs: txRes.error,
        exceptions: exceptionsRes.error,
        alloc: allocRes.error,
      });
      // Só exibe toast se o usuário estiver na tela de Carteira ou Configurações
      if (typeof window !== 'undefined' && (window.location.pathname.includes('/carteira') || window.location.pathname.includes('/settings'))) {
        toast.error('Erro ao carregar dados da carteira. Inconsistências temporárias podem ocorrer. Tente recarregar a página.');
      }
      setLoading(false);
      return;
    }

    const settingsItem = Array.isArray(settingsRes.data) ? settingsRes.data[0] : settingsRes.data;
    if (settingsItem) {
      const d = settingsItem;
      setSettings({
        id: d.id,
        userId: d.user_id,
        isActive: d.is_active,
        startMonthId: d.start_month_id,
        initialBalance: d.initial_balance,
        savingsGoalPct: d.savings_goal_pct,
      });
    } else {
      setSettings(null);
    }

    setCategories((catsRes.data || []).map((c: any) => ({
      id: c.id, userId: c.user_id, name: c.name, icon: c.icon, color: c.color,
    })));

    let provList = (provsRes.data || []).map((p: any) => ({
      id: p.id, userId: p.user_id, categoryId: p.category_id,
      categoryName: p.category_name, description: p.description || undefined,
      monthlyAmount: p.monthly_amount,
      startMonthId: p.start_month_id, endMonthId: p.end_month_id,
    }));
    const cloudProvOrder = user?.user_metadata?.personal_provisions_order;
    let effectiveProvOrder: string[] | null = Array.isArray(cloudProvOrder) && cloudProvOrder.length > 0 ? cloudProvOrder : null;
    if (!effectiveProvOrder) {
      const savedProvOrderRaw = localStorage.getItem(`personal_provisions_order_${user.id}`);
      if (savedProvOrderRaw) {
        try {
          const parsed = JSON.parse(savedProvOrderRaw);
          if (Array.isArray(parsed) && parsed.length > 0) effectiveProvOrder = parsed;
        } catch (err) {
          console.warn('Erro ao restaurar ordem das provisões do cache:', err);
        }
      }
    }
    if (effectiveProvOrder && effectiveProvOrder.length > 0) {
      provList.sort((a, b) => {
        const idxA = effectiveProvOrder!.indexOf(a.id);
        const idxB = effectiveProvOrder!.indexOf(b.id);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return 0;
      });
      // Sincroniza cache local
      try {
        localStorage.setItem(`personal_provisions_order_${user.id}`, JSON.stringify(effectiveProvOrder));
      } catch {}
    }
    setProvisions(provList);

    // Carrega regras de destinação do Supabase
    setAllocationRules((allocRes.data || []).map((a: any) => ({
      id: a.id, userId: a.user_id, label: a.label, reserveId: a.reserve_id,
      allocationType: a.allocation_type, value: a.value, sortOrder: a.sort_order,
    })));

    const exceptionsData = exceptionsRes ? exceptionsRes.data : [];
    setProvisionExceptions((exceptionsData || []).map((e: any) => ({
      id: e.id, userId: e.user_id, provisionId: e.provision_id,
      monthId: e.month_id, amount: e.amount, createdAt: e.created_at,
    })));

    // ============================================================
    // VERIFICAÇÃO DE INCONSISTÊNCIAS (Apenas leitura/log, sem mutação)
    // ============================================================
    let cleanTxData: any[] = txRes.data || [];
    const reserveList = reservesRes.data || [];

    // PASSO 1 — Detectar transações órfãs
    const existingReserveIds = new Set(reserveList.map((r: any) => r.id));
    const orphanTxIds = cleanTxData
      .filter((t: any) => t.reserve_id && !existingReserveIds.has(t.reserve_id))
      .map((t: any) => t.id);

    if (orphanTxIds.length > 0) {
      console.warn(`[DATA-001] Detectadas ${orphanTxIds.length} transações órfãs (sem caixinha correspondente). Nenhuma ação destrutiva foi tomada.`);
      // Omitimos da UI temporariamente para evitar crashes, mas não deletamos do banco
      cleanTxData = cleanTxData.filter((t: any) => !orphanTxIds.includes(t.id));
    }

    // PASSO 1b — Detectar aportes/resgates com reserve_id = null
    const nullReserveAporteResgateIds = cleanTxData
      .filter((t: any) => (t.type === 'aporte' || t.type === 'resgate') && !t.reserve_id)
      .map((t: any) => t.id);

    if (nullReserveAporteResgateIds.length > 0) {
      console.warn(`[DATA-001] Detectadas ${nullReserveAporteResgateIds.length} transações de aporte/resgate com reserve_id = null. Nenhuma ação destrutiva foi tomada.`);
      // Omitimos da UI
      cleanTxData = cleanTxData.filter((t: any) => !nullReserveAporteResgateIds.includes(t.id));
    }

    // PASSO 1c — Detectar e expurgar aportes órfãos de PL (onde o pl_receipt correspondente foi desfeito)
    const activePlMonths = new Set(
      cleanTxData
        .filter((t: any) => t.type === 'pl_receipt')
        .map((t: any) => t.month_id)
    );

    const orphanPlAporteIds = cleanTxData
      .filter((t: any) => {
        if (t.type !== 'aporte') return false;
        const isPlAporte = t.pl_provision_ref || (t.description && t.description.toLowerCase().includes('pl'));
        return isPlAporte && !activePlMonths.has(t.month_id);
      })
      .map((t: any) => t.id);

    if (orphanPlAporteIds.length > 0) {
      console.warn(`[DATA-001] Detectados ${orphanPlAporteIds.length} aportes órfãos de PL desfeito. Higienizando do cálculo.`);
      cleanTxData = cleanTxData.filter((t: any) => !orphanPlAporteIds.includes(t.id));
    }

    // PASSO 2 — Recalibrar saldos das caixinhas com base na verdade das transações reais
    const computedBalancesMap = new Map<string, number>();

    for (const reserve of reserveList) {
      const reserveTxs = cleanTxData.filter(
        (t: any) => t.reserve_id === reserve.id && (t.type === 'aporte' || t.type === 'resgate')
      );
      const computedBalance = reserveTxs.reduce((acc: number, t: any) => {
        return t.type === 'aporte' ? acc + t.amount : acc - t.amount;
      }, 0);
      computedBalancesMap.set(reserve.id, Math.round(computedBalance * 100) / 100);
    }

    // setTransactions com dados já limpos e recalibrados
    setTransactions(cleanTxData.map((t: any) => ({
      id: t.id, userId: t.user_id, monthId: t.month_id, type: t.type,
      categoryId: t.category_id, categoryName: t.category_name,
      reserveId: t.reserve_id, provisionId: t.provision_id, description: t.description, amount: t.amount,
      receiptDate: t.receipt_date, plProvisionRef: t.pl_provision_ref,
      createdAt: t.created_at,
    })));

    // Atualiza reserves usando a verdade computada das transações (evita saldo fantasma de coluna estática)
    const formattedReserves = reserveList.map((r: any) => ({
      id: r.id, userId: r.user_id, name: r.name, description: r.description,
      icon: r.icon, color: r.color, goalAmount: r.goal_amount,
      currentBalance: computedBalancesMap.has(r.id) ? computedBalancesMap.get(r.id) : (r.current_balance ?? 0),
    }));

    // Aplica ordem customizada salva pelo usuário (prioriza nuvem user_metadata, fallback localStorage)
    const cloudReserveOrder = user?.user_metadata?.personal_reserves_order;
    let effectiveReserveOrder: string[] | null = Array.isArray(cloudReserveOrder) && cloudReserveOrder.length > 0 ? cloudReserveOrder : null;
    if (!effectiveReserveOrder) {
      const savedOrderRaw = localStorage.getItem(`personal_reserves_order_${user.id}`);
      if (savedOrderRaw) {
        try {
          const parsed = JSON.parse(savedOrderRaw);
          if (Array.isArray(parsed) && parsed.length > 0) effectiveReserveOrder = parsed;
        } catch {
          // ignora se json inválido
        }
      }
    }
    if (effectiveReserveOrder && effectiveReserveOrder.length > 0) {
      formattedReserves.sort((a, b) => {
        const idxA = effectiveReserveOrder!.indexOf(a.id);
        const idxB = effectiveReserveOrder!.indexOf(b.id);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return 0;
      });
      try {
        localStorage.setItem(`personal_reserves_order_${user.id}`, JSON.stringify(effectiveReserveOrder));
      } catch {}
    }

    setReserves(formattedReserves);

    setLoading(false);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  // ============================================================
  // SETTINGS
  // ============================================================
  const saveSettings = async (data: Partial<PersonalWalletSettings>) => {
    if (!user) return;
    const payload: any = {};
    if (data.isActive !== undefined) payload.is_active = data.isActive;
    if (data.startMonthId !== undefined) payload.start_month_id = data.startMonthId;
    if (data.initialBalance !== undefined) payload.initial_balance = data.initialBalance;
    if (data.savingsGoalPct !== undefined) payload.savings_goal_pct = data.savingsGoalPct;
    payload.updated_at = new Date().toISOString();

    if (settings) {
      await supabase.from('personal_wallet_settings').update(payload).eq('user_id', user.id);
    } else {
      payload.user_id = user.id;
      if (!payload.start_month_id) payload.start_month_id = new Date().toISOString().slice(0, 7);
      await supabase.from('personal_wallet_settings').insert(payload);
    }
    setSettings(prev => prev ? { ...prev, ...data } : { userId: user.id, id: '', isActive: false, startMonthId: '', initialBalance: 0, savingsGoalPct: 20, ...data } as PersonalWalletSettings);
  };

  // ============================================================
  // CATEGORIAS PESSOAIS
  // ============================================================
  const addCategory = async (data: Pick<PersonalCategory, 'name' | 'icon' | 'color'>) => {
    if (!user) return;
    const { data: d, error } = await supabase.from('personal_categories')
      .insert({ user_id: user.id, ...data }).select().single();
    if (d && !error) {
      setCategories(prev => [...prev, { id: d.id, userId: d.user_id, name: d.name, icon: d.icon, color: d.color }].sort((a, b) => a.name.localeCompare(b.name)));
    }
    if (error) throw error;
  };

  const updateCategory = async (id: string, data: Partial<PersonalCategory>) => {
    const payload: any = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.icon !== undefined) payload.icon = data.icon;
    if (data.color !== undefined) payload.color = data.color;
    const { error } = await supabase.from('personal_categories').update(payload).eq('id', id);
    if (!error) setCategories(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
    if (error) throw error;
  };

  const deleteCategory = async (id: string) => {
    await supabase.from('personal_categories').delete().eq('id', id);
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  // ============================================================
  // PROVISÕES PESSOAIS
  // ============================================================
  const addProvision = async (data: Omit<PersonalProvision, 'id' | 'userId'>) => {
    if (!user) return null;
    const { data: d, error } = await supabase.from('personal_provisions').insert({
      user_id: user.id,
      category_id: data.categoryId,
      category_name: data.categoryName,
      description: data.description || null,
      monthly_amount: data.monthlyAmount,
      start_month_id: data.startMonthId,
      end_month_id: data.endMonthId || null,
    }).select().single();
    if (d && !error) {
      const created: PersonalProvision = {
        id: d.id,
        userId: d.user_id,
        categoryId: d.category_id,
        categoryName: d.category_name,
        description: d.description || undefined,
        monthlyAmount: d.monthly_amount,
        startMonthId: d.start_month_id,
        endMonthId: d.end_month_id,
      };
      setProvisions(prev => [...prev, created]);
      return created;
    }
    if (error) throw error;
    return null;
  };

  const updateProvision = async (id: string, data: Partial<PersonalProvision>) => {
    const payload: any = {};
    if (data.categoryId !== undefined) payload.category_id = data.categoryId;
    if (data.categoryName !== undefined) payload.category_name = data.categoryName;
    if (data.description !== undefined) payload.description = data.description || null;
    if (data.monthlyAmount !== undefined) payload.monthly_amount = data.monthlyAmount;
    if (data.startMonthId !== undefined) payload.start_month_id = data.startMonthId;
    if ('endMonthId' in data) payload.end_month_id = data.endMonthId ? data.endMonthId : null;
    const { error } = await supabase.from('personal_provisions').update(payload).eq('id', id);
    if (!error) {
      setProvisions(prev => prev.map(p => {
        if (p.id !== id) return p;
        const updated = { ...p, ...data };
        if ('endMonthId' in data) {
          updated.endMonthId = data.endMonthId ? data.endMonthId : undefined;
        }
        if ('description' in data) {
          updated.description = data.description ? data.description : undefined;
        }
        return updated;
      }));
    }
    if (error) throw error;
  };

  const deleteProvision = async (id: string) => {
    await supabase.from('personal_provisions').delete().eq('id', id);
    setProvisions(prev => prev.filter(p => p.id !== id));
  };

  const upsertProvisionException = async (provisionId: string, monthId: string, amount: number) => {
    if (!user) return;
    
    // Sempre usa upsert no banco para garantir consistência
    // (evita race condition entre verificação local e estado desatualizado)
    const { data: d, error } = await supabase.from('personal_provision_exceptions')
      .upsert(
        { user_id: user.id, provision_id: provisionId, month_id: monthId, amount },
        { onConflict: 'provision_id,month_id' }
      )
      .select().single();

    if (error) throw error;

    if (d) {
      // Atualiza estado local: substitui se já existia, adiciona se era novo
      setProvisionExceptions(prev => {
        const idx = prev.findIndex(e => e.provisionId === provisionId && e.monthId === monthId);
        const updated = {
          id: d.id, userId: d.user_id, provisionId: d.provision_id,
          monthId: d.month_id, amount: d.amount, createdAt: d.created_at
        };
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = updated;
          return next;
        }
        return [...prev, updated];
      });
    }
  };

  // ============================================================
  // RESERVAS / CAIXINHAS
  // ============================================================
  const addReserve = async (data: Omit<PersonalReserve, 'id' | 'userId' | 'currentBalance'>) => {
    if (!user) return;
    const { data: d, error } = await supabase.from('personal_reserves').insert({
      user_id: user.id, name: data.name, description: data.description,
      icon: data.icon, color: data.color, goal_amount: data.goalAmount, current_balance: 0,
    }).select().single();
    if (d && !error) {
      setReserves(prev => [...prev, { id: d.id, userId: d.user_id, name: d.name, description: d.description, icon: d.icon, color: d.color, goalAmount: d.goal_amount, currentBalance: 0 }]);
    }
    if (error) throw error;
  };

  const updateReserve = async (id: string, data: Partial<PersonalReserve>) => {
    const payload: any = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.description !== undefined) payload.description = data.description;
    if (data.icon !== undefined) payload.icon = data.icon;
    if (data.color !== undefined) payload.color = data.color;
    if (data.goalAmount !== undefined) payload.goal_amount = data.goalAmount;
    if (data.currentBalance !== undefined) payload.current_balance = data.currentBalance;
    const { error } = await supabase.from('personal_reserves').update(payload).eq('id', id);
    if (!error) setReserves(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
    if (error) throw error;
  };

  const deleteReserve = async (id: string) => {
    const reserve = reserves.find(r => r.id === id);
    if (!reserve) {
      toast.error('Caixinha não encontrada.');
      return;
    }
    const balance = Number(reserve.currentBalance ?? 0);
    if (balance !== 0) {
      toast.error('Não é possível excluir esta caixinha enquanto ela possuir saldo. Use a opção de zerar caixinha ou resgate o valor.');
      return;
    }
    const hasHistory = transactions.some(t => t.reserveId === id);
    if (hasHistory) {
      toast.error('Não é possível excluir esta caixinha porque ela possui histórico. Use a opção de zerar caixinha para limpar o histórico.');
      return;
    }

    const { error } = await supabase.from('personal_reserves').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao excluir caixinha.');
      return;
    }
    setReserves(prev => prev.filter(r => r.id !== id));
  };

  const resetReserve = async (reserveId: string) => {
    if (!user) return;
    try {
      // 1. Exclui todas as transações vinculadas a esta caixinha no banco
      const { error: txError } = await supabase
        .from('personal_transactions')
        .delete()
        .eq('user_id', user.id)
        .eq('reserve_id', reserveId);

      if (txError) {
        console.warn('Erro ao deletar transações de personal_transactions:', txError);
      }

      // 2. Zera o saldo em personal_reserves no banco
      const { error: reserveError } = await supabase
        .from('personal_reserves')
        .update({ current_balance: 0 })
        .eq('id', reserveId)
        .eq('user_id', user.id);

      if (reserveError) throw reserveError;

      // 3. Atualiza estado local imediatamente
      setTransactions(prev => prev.filter(t => t.reserveId !== reserveId));
      setReserves(prev => prev.map(r => r.id === reserveId ? { ...r, currentBalance: 0 } : r));

      toast.success('Caixinha zerada e limpa com sucesso!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao zerar caixinha.');
      throw err;
    }
  };

  const deleteReserveForce = async (reserveId: string) => {
    if (!user) return;
    try {
      // 1. Exclui transações vinculadas
      await supabase
        .from('personal_transactions')
        .delete()
        .eq('user_id', user.id)
        .eq('reserve_id', reserveId);

      // 2. Deleta a reserva
      const { error } = await supabase
        .from('personal_reserves')
        .delete()
        .eq('id', reserveId)
        .eq('user_id', user.id);

      if (error) throw error;

      setTransactions(prev => prev.filter(t => t.reserveId !== reserveId));
      setReserves(prev => prev.filter(r => r.id !== reserveId));
      toast.success('Caixinha e histórico excluídos com sucesso!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir caixinha.');
      throw err;
    }
  };

  const reorderReserves = async (orderedIds: string[]) => {
    if (!user) return;
    try {
      localStorage.setItem(`personal_reserves_order_${user.id}`, JSON.stringify(orderedIds));
    } catch (err) {
      console.warn('Erro ao salvar ordem das caixinhas no cache:', err);
    }
    setReserves(prev => {
      const copy = [...prev];
      copy.sort((a, b) => {
        const idxA = orderedIds.indexOf(a.id);
        const idxB = orderedIds.indexOf(b.id);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return 0;
      });
      return copy;
    });
    try {
      await supabase.auth.updateUser({
        data: { personal_reserves_order: orderedIds }
      });
    } catch (err) {
      console.warn('Erro ao sincronizar ordem das caixinhas na nuvem:', err);
    }
  };

  const reorderProvisions = async (orderedIds: string[]) => {
    if (!user) return;
    try {
      localStorage.setItem(`personal_provisions_order_${user.id}`, JSON.stringify(orderedIds));
    } catch (err) {
      console.warn('Erro ao salvar ordem das provisões no cache:', err);
    }
    setProvisions(prev => {
      const copy = [...prev];
      copy.sort((a, b) => {
        const idxA = orderedIds.indexOf(a.id);
        const idxB = orderedIds.indexOf(b.id);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return 0;
      });
      return copy;
    });
    try {
      await supabase.auth.updateUser({
        data: { personal_provisions_order: orderedIds }
      });
    } catch (err) {
      console.warn('Erro ao sincronizar ordem das provisões na nuvem:', err);
    }
  };

  const reorderExpenses = async (monthId: string, orderedIds: string[]) => {
    if (!user) return;
    try {
      localStorage.setItem(`personal_expenses_order_${monthId}`, JSON.stringify(orderedIds));
    } catch (err) {
      console.warn('Erro ao salvar ordem das despesas no cache:', err);
    }
    try {
      const currentOrders = { ...(user.user_metadata?.personal_expenses_orders || {}) };
      currentOrders[monthId] = orderedIds;
      await supabase.auth.updateUser({
        data: { personal_expenses_orders: currentOrders }
      });
    } catch (err) {
      console.warn('Erro ao sincronizar ordem das despesas na nuvem:', err);
    }
  };

  const getExpensesOrder = useCallback((monthId: string): string[] => {
    const cloudExpensesOrders = user?.user_metadata?.personal_expenses_orders;
    if (cloudExpensesOrders && Array.isArray(cloudExpensesOrders[monthId]) && cloudExpensesOrders[monthId].length > 0) {
      return cloudExpensesOrders[monthId];
    }
    try {
      const local = localStorage.getItem(`personal_expenses_order_${monthId}`);
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  }, [user]);

  // ============================================================
  // TRANSAÇÕES PESSOAIS
  // ============================================================
  const addTransaction = async (data: Omit<PersonalTransaction, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) return null;
    
    // DATA-003 / DATA-004: Usar RPC para criar transação e atualizar saldo atomicamente
    let txRecord: any = null;
    try {
      const { data: d, error } = await supabase.rpc('create_personal_transaction', {
        p_month_id: data.monthId,
        p_type: data.type,
        p_amount: data.amount,
        p_category_id: data.categoryId || null,
        p_category_name: data.categoryName || null,
        p_reserve_id: data.reserveId || null,
        p_provision_id: data.provisionId || null,
        p_description: data.description || null,
        p_receipt_date: data.receiptDate || null,
        p_pl_provision_ref: data.plProvisionRef || null
      });

      if (!error && d) {
        txRecord = d;
      } else if (error) {
        console.warn('RPC create_personal_transaction falhou, executando fallback direto:', error.message);
      }
    } catch (e) {
      console.warn('Exceção ao chamar RPC create_personal_transaction:', e);
    }

    // Fallback direto se a RPC não respondeu
    if (!txRecord) {
      const { data: directData, error: directError } = await supabase.from('personal_transactions').insert({
        user_id: user.id,
        month_id: data.monthId,
        type: data.type,
        amount: data.amount,
        category_id: data.categoryId || null,
        category_name: data.categoryName || null,
        reserve_id: data.reserveId || null,
        provision_id: data.provisionId || null,
        description: data.description || null,
        receipt_date: data.receiptDate || null,
        pl_provision_ref: data.plProvisionRef || null,
      }).select().single();

      if (directError) {
        toast.error(directError.message || 'Erro ao adicionar transação.');
        return null;
      }
      txRecord = directData;

      // Se for aporte ou resgate, atualiza a reserva diretamente no banco
      if ((data.type === 'aporte' || data.type === 'resgate') && data.reserveId) {
        const delta = data.type === 'aporte' ? data.amount : -data.amount;
        const res = reserves.find(r => r.id === data.reserveId);
        if (res) {
          const nextBal = Math.max(0, Math.round(((res.currentBalance ?? 0) + delta) * 100) / 100);
          await supabase.from('personal_reserves').update({ current_balance: nextBal }).eq('id', data.reserveId);
        }
      }
    }

    if (txRecord) {
      const tx: PersonalTransaction = {
        id: txRecord.id, userId: txRecord.user_id, monthId: txRecord.month_id, type: txRecord.type,
        categoryId: txRecord.category_id, categoryName: txRecord.category_name,
        reserveId: txRecord.reserve_id, provisionId: txRecord.provision_id, description: txRecord.description, amount: txRecord.amount,
        receiptDate: txRecord.receipt_date, plProvisionRef: txRecord.pl_provision_ref,
        createdAt: txRecord.created_at,
      };
      setTransactions(prev => [tx, ...prev]);

      // Atualizar o saldo localmente
      if ((tx.type === 'aporte' || tx.type === 'resgate') && tx.reserveId) {
        setReserves(prev => prev.map(r => {
          if (r.id === tx.reserveId) {
            const currentBal = Number(r.currentBalance ?? 0);
            const delta = tx.type === 'aporte' ? tx.amount : -tx.amount;
            return { ...r, currentBalance: Math.round((currentBal + delta) * 100) / 100 };
          }
          return r;
        }));
      }

      return tx;
    }
    return null;
  };

  const deleteTransaction = async (id: string) => {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;

    // DATA-003: Usar RPC para exclusão atômica e estorno no BD
    let deleteOk = false;
    const { error } = await supabase.rpc('delete_personal_transaction', {
      p_transaction_id: id
    });

    if (!error) {
      deleteOk = true;
    } else {
      console.warn('RPC delete_personal_transaction falhou, tentando fallback direto:', error);
      const { error: directError } = await supabase
        .from('personal_transactions')
        .delete()
        .eq('id', id);

      if (!directError) {
        deleteOk = true;
        if ((tx.type === 'aporte' || tx.type === 'resgate') && tx.reserveId) {
          const delta = tx.type === 'aporte' ? -tx.amount : tx.amount;
          const reserve = reserves.find(r => r.id === tx.reserveId);
          if (reserve) {
            const nextBal = Math.max(0, Math.round(((reserve.currentBalance ?? 0) + delta) * 100) / 100);
            await supabase
              .from('personal_reserves')
              .update({ current_balance: nextBal })
              .eq('id', tx.reserveId);
          }
        }
      } else {
        toast.error(directError.message || error.message || 'Erro ao excluir transação.');
        return;
      }
    }

    if (deleteOk) {
      // Atualizar estado local após confirmação do BD
      setTransactions(prev => prev.filter(t => t.id !== id));

      if ((tx.type === 'aporte' || tx.type === 'resgate') && tx.reserveId) {
        setReserves(prev => prev.map(r => {
          if (r.id === tx.reserveId) {
            const currentBal = Number(r.currentBalance ?? 0);
            const delta = tx.type === 'aporte' ? -tx.amount : tx.amount;
            return { ...r, currentBalance: Math.round((currentBal + delta) * 100) / 100 };
          }
          return r;
        }));
      }
    }
  };

  const updateTransaction = async (id: string, data: Partial<PersonalTransaction>) => {
    if (!user) return;
    const payload: any = {};
    if (data.amount !== undefined) payload.amount = data.amount;
    if (data.categoryId !== undefined) payload.category_id = data.categoryId;
    if (data.categoryName !== undefined) payload.category_name = data.categoryName;
    if (data.description !== undefined) payload.description = data.description || null;
    if (data.monthId !== undefined) payload.month_id = data.monthId;
    if (data.provisionId !== undefined) payload.provision_id = data.provisionId;

    const { error } = await supabase.from('personal_transactions').update(payload).eq('id', id).eq('user_id', user.id);
    if (!error) {
      setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
    } else {
      toast.error('Erro ao atualizar transação: ' + error.message);
      throw error;
    }
  };

  // ============================================================
  // REGRAS DE DESTINAÇÃO
  // ============================================================
  const addAllocationRule = async (data: Omit<PersonalAllocationRule, 'id' | 'userId'>) => {
    if (!user) return;
    const { data: d, error } = await supabase.from('personal_allocation_rules').insert({
      user_id: user.id, label: data.label, reserve_id: data.reserveId || null,
      allocation_type: data.allocationType, value: data.value, sort_order: data.sortOrder,
    }).select().single();
    if (d && !error) {
      setAllocationRules(prev => [...prev, {
        id: d.id, userId: d.user_id, label: d.label, reserveId: d.reserve_id,
        allocationType: d.allocation_type, value: d.value, sortOrder: d.sort_order,
      }]);
    }
    if (error) {
      toast.error('Erro ao salvar regra de destinação.');
      throw error;
    }
  };

  const updateAllocationRule = async (id: string, data: Partial<PersonalAllocationRule>) => {
    if (!user) return;
    const payload: any = {};
    if (data.label !== undefined) payload.label = data.label;
    if (data.reserveId !== undefined) payload.reserve_id = data.reserveId;
    if (data.allocationType !== undefined) payload.allocation_type = data.allocationType;
    if (data.value !== undefined) payload.value = data.value;
    if (data.sortOrder !== undefined) payload.sort_order = data.sortOrder;
    const { error } = await supabase.from('personal_allocation_rules').update(payload).eq('id', id);
    if (!error) setAllocationRules(prev => prev.map(a => a.id === id ? { ...a, ...data } : a));
    if (error) {
      toast.error('Erro ao atualizar regra de destinação.');
      throw error;
    }
  };

  const deleteAllocationRule = async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from('personal_allocation_rules').delete().eq('id', id);
    if (!error) setAllocationRules(prev => prev.filter(a => a.id !== id));
    if (error) {
      toast.error('Erro ao excluir regra de destinação.');
      throw error;
    }
  };

  // ============================================================
  // LÓGICA: Receitas PF espelhadas da PJ
  // Recebe o array de despesas processadas do mês da PJ
  // e filtra apenas as categorias de receita pessoal.
  // ============================================================
  const getPersonalIncomes = (
    monthId: string,
    pjExpenses: Array<{ id: string; category: string; amount: number; description?: string }>,
    partnerName: string,
    partnerContracts?: Array<{ partnerId: string; amount: number; startMonthId: string; inssPct?: number | null; irrfPct?: number | null }>,
  ): PersonalIncome[] => {
    const incomes: PersonalIncome[] = [];

    // Encontra o contrato ativo do socio para o mes (para calcular o liquido do pro-labore)
    const activeContract = partnerContracts
      ? partnerContracts
          .filter(c => c.startMonthId <= monthId)
          .sort((a, b) => b.startMonthId.localeCompare(a.startMonthId))[0]
      : undefined;

    for (const exp of pjExpenses) {
      // Pró-labore ou Retirada (categoria FP, Pró-labore, Pró-Labore / Retirada, etc.)
      const catLower = (exp.category || '').toLowerCase();
      const isProlabore = 
        exp.category === 'FP' || 
        exp.category === 'Pró-labore' || 
        exp.category === 'Pró-Labore / Retirada' ||
        catLower.includes('pró-labore') ||
        catLower.includes('pro-labore') ||
        catLower.includes('retirada');

      if (isProlabore) {
        // Se houver nome de sócio configurado, só filtra se a descrição expressamente citar outro sócio
        if (partnerName && exp.description && !exp.description.toLowerCase().includes(partnerName.toLowerCase()) && !catLower.includes('retirada') && !catLower.includes('pró-labore')) {
          continue;
        }
        // O valor que vem da PJ e o BRUTO (saida de caixa da empresa).
        // Para a Carteira Pessoal, calcula o LIQUIDO descontando INSS e IRRF
        // conforme configurado no contrato ativo do socio (menu Socios).
        let netAmount = exp.amount;
        if (activeContract) {
          const inssDeduct = activeContract.inssPct ? (exp.amount * activeContract.inssPct / 100) : 0;
          const irrfDeduct = activeContract.irrfPct ? (exp.amount * activeContract.irrfPct / 100) : 0;
          netAmount = Math.max(0, exp.amount - inssDeduct - irrfDeduct);
        }
        incomes.push({
          id: exp.id,
          monthId,
          source: 'prolabore',
          partnerName: exp.description || partnerName || 'Retirada Pró-Labore',
          amount: netAmount,
          isVirtual: exp.id.startsWith('temp-fp-') || exp.id.startsWith('temp-prov-'),
        });
      }
      // Retirada PL
      if (exp.category === 'Retirada PL') {
        if (partnerName && exp.description && !exp.description.toLowerCase().includes(partnerName.toLowerCase())) continue;
        // Verifica se o usu\u00e1rio j\u00e1 confirmou o recebimento.
        // BUG-01 fix: crit\u00e9rio unificado com getMonthSummary (l.532) —
        // apenas monthId, sem plProvisionRef redundante.
        const receiptTx = transactions.find(
          t => t.type === 'pl_receipt' && t.monthId === monthId
        );
        incomes.push({
          id: exp.id,
          monthId,
          source: 'pl',
          partnerName: exp.description || partnerName,
          amount: exp.amount,
          isVirtual: exp.id.startsWith('temp-pl-'),
          receiptConfirmed: !!receiptTx,
        });
      }
    }
    return incomes;
  };

  // ============================================================
  // LÓGICA: Provisões ativas no mês
  // ============================================================
  const getMonthProvisions = (monthId: string) => {
    return provisions.filter(p => {
      if (p.startMonthId > monthId) return false;
      if (p.endMonthId && p.endMonthId < monthId) return false;
      return true;
    });
  };

  // ============================================================
  // LÓGICA: Sugestão de distribuição de PL
  // Dado um valor de PL recebido, aplica as regras de destinação
  // e retorna a sugestão de aporte por caixinha
  // ============================================================
  const suggestAllocation = (plAmount: number): Array<{ rule: PersonalAllocationRule; suggestedAmount: number; reserve?: PersonalReserve }> => {
    const suggestions: Array<{ rule: PersonalAllocationRule; suggestedAmount: number; reserve?: PersonalReserve }> = [];
    let remaining = plAmount;

    // Primeiro passa: valores fixos
    for (const rule of allocationRules.filter(r => r.allocationType === 'fixed')) {
      const amount = Math.min(rule.value, remaining);
      const reserve = reserves.find(r => r.id === rule.reserveId);
      suggestions.push({ rule, suggestedAmount: amount, reserve });
      remaining -= amount;
    }

    // Segunda passa: percentuais (sobre o total do PL, não o restante)
    for (const rule of allocationRules.filter(r => r.allocationType === 'percentage')) {
      const amount = Math.round((plAmount * (rule.value / 100)) * 100) / 100;
      const reserve = reserves.find(r => r.id === rule.reserveId);
      suggestions.push({ rule, suggestedAmount: amount, reserve });
    }

    return suggestions.sort((a, b) => a.rule.sortOrder - b.rule.sortOrder);
  };

  // ============================================================
  // LÓGICA: Resumo do mês (cálculo completo)
  // ============================================================
  const getMonthSummary = (
    targetMonthId: string,
    getPjExpensesForMonth: (m: string) => Array<{ id: string; category: string; amount: number; description?: string }>,
    partnerName: string,
    partnerContracts?: Array<{ partnerId: string; amount: number; startMonthId: string; inssPct?: number | null; irrfPct?: number | null }>,
  ): PersonalMonthSummary => {
    if (!settings || !settings.isActive) {
      return {
        monthId: targetMonthId, initialBalance: 0, prolaboreTotal: 0, plTotal: 0,
        projectedPlTotal: 0, totalIncome: 0,
        provisionTotal: 0, expenseTotal: 0, totalExpenses: 0, 
        realBalance: 0, projectedBalance: 0, availableBalance: 0, savingsTarget: 0,
        totalReserves: 0, netWorth: 0,
      };
    }

    const startId = settings.startMonthId;
    let currRealBalance = settings.initialBalance ?? 0;

    // Helper para gerar meses
    const months = [];
    let curr = startId;
    while (curr <= targetMonthId) {
      months.push(curr);
      const [y, m] = curr.split('-').map(Number);
      const nextD = new Date(y, m, 1);
      curr = `${nextD.getFullYear()}-${String(nextD.getMonth() + 1).padStart(2, '0')}`;
    }

    let summaryForTarget: PersonalMonthSummary | null = null;

    for (const monthId of months) {
      const pjExpenses = getPjExpensesForMonth(monthId);
      const incomes = getPersonalIncomes(monthId, pjExpenses, partnerName, partnerContracts);
      
      const prolaboreTotal = incomes.filter(i => i.source === 'prolabore').reduce((acc, i) => acc + i.amount, 0);

      // 1.1 — Princípio de competência para PL:
      // O PL só é reconhecido como receita (entra no fluxo de caixa disponível)
      // quando o usuário confirmar o recebimento (pl_receipt existente no BD).
      // Antes disso, aparece como "projeção" na UI mas NÃO afeta o saldo disponível.
      const rawPlTotal = incomes.filter(i => i.source === 'pl').reduce((acc, i) => acc + i.amount, 0);
      const plReceiptExists = transactions.some(t => t.type === 'pl_receipt' && t.monthId === monthId);
      const plTotal = plReceiptExists ? rawPlTotal : 0;
      const totalIncome = prolaboreTotal + plTotal;

      const monthExpenses = transactions.filter(t => t.monthId === monthId && t.type === 'despesa');
      const expenseTotal = monthExpenses.reduce((acc, t) => acc + t.amount, 0);

      const activeProvisions = getMonthProvisions(monthId);
      
      // Provisões pendentes = soma das provisões ativas no mês QUE NÃO possuem provisionId em monthExpenses
      const provisionTotal = activeProvisions.reduce((acc, p) => {
        // Verifica se essa provisão já foi paga neste mês
        const isPaid = monthExpenses.some(t => t.provisionId === p.id);
        if (isPaid) return acc; // Já paga, não é pendente

        // Pega valor da exceção ou da regra global
        const exception = provisionExceptions.find(e => e.provisionId === p.id && e.monthId === monthId);
        const effectiveAmount = exception ? exception.amount : p.monthlyAmount;
        
        return acc + effectiveAmount;
      }, 0);

      const totalExpenses = expenseTotal + provisionTotal;

      // Aportes e resgates (bug fix 1)
      const aporteTxs = transactions.filter(t => t.monthId === monthId && t.type === 'aporte');
      const resgateTxs = transactions.filter(t => t.monthId === monthId && t.type === 'resgate');
      const aportesTotal = aporteTxs.reduce((acc, t) => acc + t.amount, 0);
      const resgatesTotal = resgateTxs.reduce((acc, t) => acc + t.amount, 0);



      // Fluxo real (só dinheiro efetivamente recebido/gasto)
      const realNetFlow = totalIncome - expenseTotal - aportesTotal + resgatesTotal;
      const initialBalance = currRealBalance;
      
      const realBalance = initialBalance + realNetFlow;
      const projectedBalance = realBalance - provisionTotal;
      const availableBalance = realBalance; // Saldo disponível em conta corrente real (sem abater provisões não pagas)

      currRealBalance = realBalance; // Para o próximo mês

      if (monthId === targetMonthId) {
        const savingsTarget = Math.round((totalIncome * (settings.savingsGoalPct / 100)) * 100) / 100;

        // Computa saldo de cada caixinha APENAS com transações até o mês-alvo.
        // Isso evita que aportes/resgates de meses futuros inflem o patrimônio
        // quando se está consultando um mês anterior.
        const totalReservesBalance = reserves.reduce((acc, r) => {
          const reserveAportes = transactions
            .filter(t => t.reserveId === r.id && t.type === 'aporte' && t.monthId <= targetMonthId)
            .reduce((s, t) => s + t.amount, 0);
          const reserveResgates = transactions
            .filter(t => t.reserveId === r.id && t.type === 'resgate' && t.monthId <= targetMonthId)
            .reduce((s, t) => s + t.amount, 0);
          return acc + reserveAportes - reserveResgates;
        }, 0);
        const netWorth = realBalance + totalReservesBalance;

        // projectedPlTotal: PL lançado mas não confirmado — aparece na UI como projeção
        const projectedPlTotal = plReceiptExists ? 0 : rawPlTotal;

        summaryForTarget = {
          monthId, initialBalance, prolaboreTotal, plTotal, projectedPlTotal, totalIncome,
          provisionTotal, expenseTotal, totalExpenses,
          realBalance, projectedBalance, availableBalance, savingsTarget, totalReserves: totalReservesBalance, netWorth,
        };
      }
    }

    if (!summaryForTarget) {
      return {
        monthId: targetMonthId, initialBalance: 0, prolaboreTotal: 0, plTotal: 0,
        projectedPlTotal: 0, totalIncome: 0,
        provisionTotal: 0, expenseTotal: 0, totalExpenses: 0, 
        realBalance: 0, projectedBalance: 0, availableBalance: 0, savingsTarget: 0,
        totalReserves: 0, netWorth: 0,
      };
    }

    return summaryForTarget;
  };

  // ============================================================
  // AÇÃO: Confirmar recebimento de PL e distribuir
  // Cria: 1 transação pl_receipt + N transações de aporte
  // ============================================================
  const confirmPLReceipt = async (
    monthId: string,
    amount: number,
    receiptDate: string,
    distributions: Array<{ reserveId: string; amount: number; label: string }>,
  ) => {
    if (!user) return;

    // Registra o recebimento
    await addTransaction({
      monthId, type: 'pl_receipt', amount,
      description: `PL recebido — ${monthId}`,
      receiptDate, plProvisionRef: monthId,
    });

    // Cria um aporte para cada caixinha da distribuição.
    // Bug #4 fix: marca plProvisionRef nos aportes gerados pelo PL para que o
    // undo possa identificar APENAS os aportes originados deste PL, sem deletar
    // aportes manuais feitos no mesmo mês.
    for (const dist of distributions) {
      if (dist.amount <= 0) continue;
      const reserve = reserves.find(r => r.id === dist.reserveId);
      await addTransaction({
        monthId, type: 'aporte',
        reserveId: dist.reserveId,
        description: dist.label,
        amount: dist.amount,
        categoryName: reserve?.name,
        plProvisionRef: monthId, // ← âncora para identificar aportes de PL no undo
      });
    }
  };

  // ============================================================
  // AÇÃO: Desfazer recebimento de PL (Estorno)
  // Estorna a transação pl_receipt e ajusta as caixinhas correspondentes.
  // Se o usuário já houver resgatado parte ou todo o valor das caixinhas
  // para o caixa, estorna os resgates compensatórios antes de deletar os aportes,
  // garantindo que nenhuma caixinha fique negativa e o saldo seja estornado do caixa.
  // ============================================================
  const undoPLReceipt = async (monthId: string) => {
    if (!user) return;

    const plTx = transactions.find(
      t => t.type === 'pl_receipt' && t.monthId === monthId
    );
    if (!plTx) {
      throw new Error('Nenhum recebimento de PL encontrado para este mês.');
    }

    // Aportes gerados automaticamente pelo recebimento deste PL
    const plAportes = transactions.filter(t => {
      if (t.type !== 'aporte' || t.monthId !== monthId) return false;
      if (t.plProvisionRef === monthId) return true;
      if (t.description && t.description.toLowerCase().includes('pl')) return true;
      if (plTx.receiptDate && t.receiptDate === plTx.receiptDate) return true;
      return false;
    });

    const txsToDelete: string[] = [];

    // Para cada aporte vinculado ao PL:
    for (const aporte of plAportes) {
      if (!aporte.reserveId) {
        txsToDelete.push(aporte.id);
        continue;
      }

      // Calcula o saldo atual da caixinha (considerando transações até o mês selecionado)
      const currentReserveBal = transactions
        .filter(t => t.reserveId === aporte.reserveId && t.monthId <= monthId)
        .reduce((acc, t) => acc + (t.type === 'aporte' ? t.amount : t.type === 'resgate' ? -t.amount : 0), 0);

      const deficit = aporte.amount - currentReserveBal;
      if (deficit > 0) {
        // A caixinha não tem saldo suficiente para subtrair o aporte diretamente,
        // pois o usuário já resgatou o dinheiro da caixinha para o caixa da conta corrente.
        // Estornamos primeiro os resgates feitos nesta caixinha neste mês até cobrir o déficit,
        // devolvendo o saldo à caixinha para que o estorno do aporte não a negative.
        const monthResgates = transactions.filter(
          t => t.reserveId === aporte.reserveId && t.monthId === monthId && t.type === 'resgate'
        );
        let needed = deficit;
        for (const resg of monthResgates) {
          if (needed <= 0) break;
          txsToDelete.push(resg.id);
          needed -= resg.amount;
        }
      }
      txsToDelete.push(aporte.id);
    }

    // Por fim, inclui a própria transação de recebimento do PL
    txsToDelete.push(plTx.id);

    // Executa as exclusões sequencialmente (garantindo que os resgates sejam estornados antes dos aportes)
    for (const txId of txsToDelete) {
      await deleteTransaction(txId);
    }
  };

  // ============================================================
  // LÓGICA: Histórico mensal para gráfico de evolução
  // Retorna saldos acumulados mês a mês (dados reais)
  // ============================================================
  const getHistoricalBalances = (
    allMonths: string[],
    getPjExpensesForMonth: (monthId: string) => Array<{ id: string; category: string; amount: number; description?: string }>,
    partnerName: string,
  ): Array<{ monthId: string; availableBalance: number; netWorth: number }> => {
    if (!settings) return [];

    return allMonths
      .filter(m => m >= (settings.startMonthId))
      .map(monthId => {
        const summary = getMonthSummary(monthId, getPjExpensesForMonth, partnerName);
        return { monthId, availableBalance: summary.availableBalance, netWorth: summary.netWorth };
      });
  };

  return {
    // Estado
    settings, categories, provisions, provisionExceptions, reserves, transactions, allocationRules, loading,

    // Settings
    saveSettings,

    // Categorias
    addCategory, updateCategory, deleteCategory,

    // Provisões
    addProvision, updateProvision, deleteProvision, upsertProvisionException, getMonthProvisions, reorderProvisions,

    // Reservas
    addReserve, updateReserve, deleteReserve, resetReserve, deleteReserveForce, reorderReserves,

    // Transações e Despesas
    addTransaction, deleteTransaction, updateTransaction, reorderExpenses, getExpensesOrder,

    // Regras de destinação
    addAllocationRule, updateAllocationRule, deleteAllocationRule,

    // Lógica / cálculos
    getPersonalIncomes,
    getMonthSummary,
    suggestAllocation,
    confirmPLReceipt,
    undoPLReceipt,
    getHistoricalBalances,

    // Reload
    reload: loadData,
  };
}
