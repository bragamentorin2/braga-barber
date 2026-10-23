import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Client, Expense, MonthData, Revenue, ClientContract, Partner, PartnerContract, ExpenseProvision, ProvisionOverride, PLProvision, PLPeriodicity } from '@/types/finance';
import { v4 as uuidv4 } from 'uuid';
// expense_categories carregadas separadamente para vínculo
export interface ExpenseCategoryRow { id: string; name: string; observation?: string; }
import { MIN_MONTH } from '@/contexts/MonthContext';

// Helper to get the month label from id
function getMonthLabel(monthId: string): string {
  const [year, month] = monthId.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// Ensure a month record exists in the DB, creating it if not
async function ensureMonthExists(monthId: string, userId: string): Promise<MonthData> {
  const { data } = await supabase
    .from('months')
    .select('*')
    .eq('id', monthId)
    .eq('user_id', userId)
    .single();

  if (data) {
    return { id: data.id, label: data.label, initialBalance: data.initial_balance };
  }

  const newMonth = { id: monthId, label: getMonthLabel(monthId), initial_balance: 0 };
  await supabase.from('months').insert({ ...newMonth, user_id: userId });
  return { id: newMonth.id, label: newMonth.label, initialBalance: 0 };
}

export function useSupabaseFinance() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [clientContracts, setClientContracts] = useState<ClientContract[]>([]);
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [months, setMonths] = useState<MonthData[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [partnerContracts, setPartnerContracts] = useState<PartnerContract[]>([]);
  const [expenseProvisions, setExpenseProvisions] = useState<ExpenseProvision[]>([]);
  const [provisionOverrides, setProvisionOverrides] = useState<ProvisionOverride[]>([]);
  const [plProvisions, setPlProvisions] = useState<PLProvision[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Load all data from Supabase
  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    const [clientsRes, contractsRes, monthsRes, revenuesRes, expensesRes, partnersRes, pContractsRes, provisionsRes, overridesRes, plRes, categoriesRes] = await Promise.all([
      supabase.from('clients').select('*').eq('user_id', user.id).order('name'),
      supabase.from('client_contracts').select('*').eq('user_id', user.id).order('start_month_id', { ascending: false }),
      supabase.from('months').select('*').eq('user_id', user.id).order('id'),
      supabase.from('revenues').select('*').eq('user_id', user.id),
      supabase.from('expenses').select('*').eq('user_id', user.id),
      supabase.from('partners').select('*').eq('user_id', user.id).order('name'),
      supabase.from('partner_contracts').select('*').eq('user_id', user.id).order('start_month_id', { ascending: false }),
      supabase.from('expense_provisions').select('*').eq('user_id', user.id),
      supabase.from('provision_overrides').select('*').eq('user_id', user.id),
      supabase.from('pl_provisions').select('*').eq('user_id', user.id).order('start_month_id', { ascending: false }),
      supabase.from('expense_categories').select('*').eq('user_id', user.id).order('name'),
    ]);

    setClients((clientsRes.data || []).map(c => ({
      id: c.id,
      name: c.name,
      defaultBaseValue: c.default_base_value,
      phone: c.phone,
      notes: c.notes,
    })));
    setClientContracts((contractsRes.data || []).map(c => ({
      id: c.id,
      clientId: c.client_id,
      amount: c.amount,
      startMonthId: c.start_month_id,
      isGross: c.is_gross,
      taxPercentage: c.tax_percentage,
      createdAt: c.created_at,
    })));
    setMonths((monthsRes.data || []).map(m => ({
      id: m.id,
      label: m.label,
      initialBalance: m.initial_balance,
    })));
    setRevenues((revenuesRes.data || []).map(r => ({
      id: r.id,
      monthId: r.month_id,
      clientId: r.client_id,
      amount: r.amount,
      tax: r.tax,
      description: r.description || undefined,
      date: r.date || undefined,
      itemType: r.item_type || undefined,
      quantity: r.quantity ?? 1,
    })));
    setExpenses((expensesRes.data || []).map(e => ({
      id: e.id,
      monthId: e.month_id,
      category: e.category,
      description: e.description,
      amount: e.amount,
      date: e.date || undefined,
    })));
    setPartners((partnersRes.data || []).map(p => ({
      id: p.id,
      name: p.name,
    })));
    setPartnerContracts((pContractsRes.data || []).map(pc => ({
      id: pc.id,
      partnerId: pc.partner_id,
      amount: pc.amount,
      startMonthId: pc.start_month_id,
      categoryId: pc.category_id || null,
      inssPct: pc.inss_pct ?? null,
      irrfPct: pc.irrf_pct ?? null,
    })));
    // Carrega categorias de despesa (para vínculo com provisões e lançamentos)
    let cats = (categoriesRes.data || []).map((c: any) => ({ id: c.id, name: c.name, observation: c.observation }));
    if (!cats || cats.length === 0) {
      const storageKey = `braga_mentoring_expense_categories_${user?.id || 'demo'}`;
      const localRaw = localStorage.getItem(storageKey);
      if (localRaw) {
        try {
          const parsed = JSON.parse(localRaw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            cats = parsed.map((c: any) => ({ id: c.id, name: c.name, observation: c.observation || '' }));
          }
        } catch (e) {
          console.error('Erro ao ler categorias de despesa locais:', e);
        }
      }
      if (!cats || cats.length === 0) {
        const DEFAULT_CATEGORIES = [
          'Aluguel & Ponto Comercial',
          'Energia Elétrica (Luz)',
          'Água & Saneamento',
          'Insumos & Descartáveis',
          'Produtos & Cosméticos (Uso Interno)',
          'Manutenção de Equipamentos',
          'Taxas de Cartão & Maquininha',
          'DAS / MEI / Impostos',
          'Marketing & Divulgação',
          'Pró-Labore / Retirada',
        ];
        cats = DEFAULT_CATEGORIES.map((name, idx) => ({
          id: `cat-default-${idx}`,
          name,
          observation: '',
        }));
        localStorage.setItem(storageKey, JSON.stringify(cats));
      }
    }
    setExpenseCategories(cats);

    // Carrega provisões de despesas individuais (FILTRANDO o legado PLR|)
    const legacyPlProvisions: any[] = [];
    const validExpenseProvisions: any[] = [];

    (provisionsRes.data || []).forEach((p: any) => {
      if (p.category?.startsWith('PLR|')) {
        legacyPlProvisions.push(p);
      } else {
        validExpenseProvisions.push({
          id: p.id,
          categoryId: p.category_id || null,
          category: p.category_id
            ? (cats.find((c: ExpenseCategoryRow) => c.id === p.category_id)?.name ?? p.category)
            : p.category,
          monthlyAmount: p.monthly_amount,
          startMonthId: p.start_month_id,
          endMonthId: p.end_month_id || undefined,
          description: p.description || undefined,
        });
      }
    });

    // Merge resiliente com provisões salvas localmente
    const provStorageKey = `braga_mentoring_expense_provisions_${user?.id || 'demo'}`;
    const localProvsRaw = localStorage.getItem(provStorageKey);
    if (localProvsRaw) {
      try {
        const localProvs = JSON.parse(localProvsRaw);
        if (Array.isArray(localProvs)) {
          localProvs.forEach((lp: any) => {
            if (!validExpenseProvisions.some(vp => vp.id === lp.id || (vp.category === lp.category && vp.startMonthId === lp.startMonthId && vp.description === lp.description))) {
              validExpenseProvisions.push(lp);
            }
          });
        }
      } catch (e) {
        console.error('Erro ao ler provisões locais:', e);
      }
    }

    setExpenseProvisions(validExpenseProvisions);
    localStorage.setItem(provStorageKey, JSON.stringify(validExpenseProvisions));

    // Carrega provisões de PL da tabela dedicada pl_provisions E junta com o legado
    const modernPlProvisions = (plRes.data || []).map((p: any) => ({
      id: p.id,
      partnerId: p.partner_id,
      periodicity: p.periodicity as PLPeriodicity,
      amount: p.amount,
      startMonthId: p.start_month_id,
      endMonthId: p.end_month_id,
      categoryId: p.category_id || null,
      isLegacy: false,
    }));

    const legacyMappedPlProvisions = legacyPlProvisions.map(p => {
      const parts = p.category.split('|');
      return {
        id: p.id,
        partnerId: parts[1],
        periodicity: parts[2] as PLPeriodicity,
        amount: p.monthly_amount,
        startMonthId: p.start_month_id,
        endMonthId: p.end_month_id,
        categoryId: p.category_id || null,
        isLegacy: true,
      };
    });

    setPlProvisions([...modernPlProvisions, ...legacyMappedPlProvisions].sort((a: any, b: any) => b.startMonthId.localeCompare(a.startMonthId)));

    setProvisionOverrides((overridesRes.data || []).map((o: any) => ({
      id: o.id,
      provisionId: o.provision_id,
      monthId: o.month_id,
      isZeroed: o.is_zeroed,
    })));

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Client actions
  const addClient = async (client: Omit<Client, 'id'>, contractsToCreate?: Omit<ClientContract, 'id' | 'createdAt' | 'clientId'>[]) => {
    if (!user) return;
    const newClientId = uuidv4();

    if (!isSupabaseConfigured) {
      const newClientItem: Client = {
        id: newClientId,
        name: client.name,
        defaultBaseValue: client.defaultBaseValue || 0,
        phone: client.phone,
        notes: client.notes,
      };
      setClients(prev => [...prev, newClientItem].sort((a,b) => a.name.localeCompare(b.name)));

      if (contractsToCreate && contractsToCreate.length > 0) {
        for (const contract of contractsToCreate) {
          const newContractItem: ClientContract = {
            id: uuidv4(),
            clientId: newClientId,
            amount: contract.amount,
            startMonthId: contract.startMonthId,
            isGross: contract.isGross,
            taxPercentage: contract.taxPercentage,
          };
          setClientContracts(prev => [...prev, newContractItem].sort((a,b) => b.startMonthId.localeCompare(a.startMonthId)));
        }
      }
      return newClientId;
    }

    const { data, error } = await supabase
      .from('clients')
      .insert({ 
        name: client.name, 
        default_base_value: client.defaultBaseValue || 0, 
        phone: client.phone,
        notes: client.notes,
        user_id: user.id 
      })
      .select()
      .single();

    if (data && !error) {
      setClients(prev => [...prev, { 
        id: data.id, 
        name: data.name, 
        defaultBaseValue: data.default_base_value, 
        phone: data.phone,
        notes: data.notes,
      }].sort((a,b) => a.name.localeCompare(b.name)));
      
      if (contractsToCreate && contractsToCreate.length > 0) {
        for (const contract of contractsToCreate) {
          await addClientContract({
            ...contract,
            clientId: data.id
          });
        }
      }
      return data.id;
    }
    return undefined;
  };

  const deleteClient = async (id: string) => {
    if (isSupabaseConfigured) {
      await supabase.from('clients').delete().eq('id', id);
    }
    setClients(prev => prev.filter(c => c.id !== id));
    // client_contracts and revenues cascade delete
    setClientContracts(prev => prev.filter(c => c.clientId !== id));
  };

  const updateClient = async (id: string, data: Partial<Client>) => {
    if (!isSupabaseConfigured) {
      setClients(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
      return;
    }
    const payload: any = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.defaultBaseValue !== undefined) payload.default_base_value = data.defaultBaseValue;
    if (data.phone !== undefined) payload.phone = data.phone;
    if (data.notes !== undefined) payload.notes = data.notes;
    
    await supabase.from('clients').update(payload).eq('id', id);
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
  };

  // Client Contract Actions
  const addClientContract = async (contract: Omit<ClientContract, 'id' | 'createdAt'>) => {
    if (!user) return;

    if (!isSupabaseConfigured) {
      const newContractItem: ClientContract = {
        id: uuidv4(),
        clientId: contract.clientId,
        amount: contract.amount,
        startMonthId: contract.startMonthId,
        isGross: contract.isGross,
        taxPercentage: contract.taxPercentage,
      };
      setClientContracts(prev => [...prev, newContractItem].sort((a,b) => b.startMonthId.localeCompare(a.startMonthId)));
      return;
    }

    const { data, error } = await supabase
      .from('client_contracts')
      .insert({
        client_id: contract.clientId,
        amount: contract.amount,
        start_month_id: contract.startMonthId,
        is_gross: contract.isGross,
        tax_percentage: contract.taxPercentage,
        user_id: user.id
      })
      .select()
      .single();

    if (data && !error) {
      setClientContracts(prev => [...prev, {
        id: data.id,
        clientId: data.client_id,
        amount: data.amount,
        startMonthId: data.start_month_id,
        isGross: data.is_gross,
        taxPercentage: data.tax_percentage,
        createdAt: data.created_at,
      }].sort((a,b) => b.startMonthId.localeCompare(a.startMonthId)));
    }
  };


  const deleteClientContract = async (id: string) => {
    await supabase.from('client_contracts').delete().eq('id', id);
    setClientContracts(prev => prev.filter(c => c.id !== id));
  };

  const updateClientContract = async (id: string, updates: Partial<ClientContract>) => {
    const payload: any = {};
    if (updates.amount !== undefined) payload.amount = updates.amount;
    if (updates.startMonthId !== undefined) payload.start_month_id = updates.startMonthId;
    if (updates.isGross !== undefined) payload.is_gross = updates.isGross;
    if (updates.taxPercentage !== undefined) payload.tax_percentage = updates.taxPercentage;
    
    await supabase.from('client_contracts').update(payload).eq('id', id);
    
    setClientContracts(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  // Partner actions
  const addPartner = async (partner: Omit<Partner, 'id'>, initialContractAmount?: number, startMonthId?: string, initialCategoryId?: string) => {
    if (!user) return;
    const { data, error } = await supabase.from('partners').insert({ name: partner.name, user_id: user.id }).select().single();
    if (data && !error) {
      setPartners(prev => [...prev, { id: data.id, name: data.name }]);
      if (initialContractAmount !== undefined && startMonthId) {
        await addPartnerContract(data.id, initialContractAmount, startMonthId, initialCategoryId);
      }
    }
  };

  const updatePartner = async (id: string, data: Partial<Partner>) => {
    await supabase.from('partners').update(data).eq('id', id);
    setPartners(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
  };

  const deletePartner = async (id: string) => {
    await supabase.from('partners').delete().eq('id', id);
    setPartners(prev => prev.filter(p => p.id !== id));
  };

  const addPartnerContract = async (partnerId: string, amount: number, startMonthId: string, categoryId?: string, inssPct?: number | null, irrfPct?: number | null) => {
    if (!user) return;
    const { data, error } = await supabase.from('partner_contracts').insert({
      user_id: user.id,
      partner_id: partnerId,
      amount,
      start_month_id: startMonthId,
      category_id: categoryId || null,
      inss_pct: inssPct ?? null,
      irrf_pct: irrfPct ?? null,
    }).select().single();

    if (data && !error) {
      setPartnerContracts(prev => [...prev, {
        id: data.id,
        partnerId: data.partner_id,
        amount: data.amount,
        startMonthId: data.start_month_id,
        categoryId: data.category_id || null,
        inssPct: data.inss_pct ?? null,
        irrfPct: data.irrf_pct ?? null,
      }].sort((a,b) => b.startMonthId.localeCompare(a.startMonthId)));
    }
  };

  const deletePartnerContract = async (id: string) => {
    await supabase.from('partner_contracts').delete().eq('id', id);
    setPartnerContracts(prev => prev.filter(c => c.id !== id));
  };

  const updatePartnerContract = async (id: string, updates: Partial<PartnerContract>) => {
    const payload: any = {};
    if (updates.amount !== undefined) payload.amount = updates.amount;
    if (updates.startMonthId !== undefined) payload.start_month_id = updates.startMonthId;
    if (updates.categoryId !== undefined) payload.category_id = updates.categoryId || null;
    if (updates.inssPct !== undefined) payload.inss_pct = updates.inssPct ?? null;
    if (updates.irrfPct !== undefined) payload.irrf_pct = updates.irrfPct ?? null;
    
    await supabase.from('partner_contracts').update(payload).eq('id', id);
    
    setPartnerContracts(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  // Revenue actions
  const addRevenue = async (revenue: Omit<Revenue, 'id'>) => {
    if (!user) return;

    if (!isSupabaseConfigured) {
      const newRev: Revenue = {
        id: `rev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        monthId: revenue.monthId,
        clientId: revenue.clientId,
        amount: revenue.amount,
        tax: revenue.tax,
        description: revenue.description,
        date: revenue.date || `${revenue.monthId}-01`,
        itemType: revenue.itemType,
      };
      setRevenues(prev => [...prev, newRev]);
      return;
    }

    await ensureMonthExists(revenue.monthId, user.id);
    const { data, error } = await supabase
      .from('revenues')
      .insert({
        month_id: revenue.monthId,
        client_id: revenue.clientId || null,
        amount: revenue.amount,
        tax: revenue.tax,
        description: revenue.description || null,
        date: revenue.date || `${revenue.monthId}-01`,
        item_type: revenue.itemType || null,
        quantity: revenue.quantity ?? 1,
        user_id: user.id,
      })
      .select()
      .single();
    if (data && !error) {
      setRevenues(prev => [...prev, {
        id: data.id,
        monthId: data.month_id,
        clientId: data.client_id,
        amount: data.amount,
        tax: data.tax,
        description: data.description || undefined,
        date: data.date || `${revenue.monthId}-01`,
        itemType: data.item_type || undefined,
        quantity: data.quantity ?? 1,
      }]);
      loadData();
    }
  };

  const deleteRevenue = async (id: string) => {
    if (isSupabaseConfigured) {
      await supabase.from('revenues').delete().eq('id', id);
    }
    setRevenues(prev => prev.filter(r => r.id !== id));
  };

  const updateRevenue = async (id: string, data: Partial<Revenue>) => {
    if (isSupabaseConfigured) {
      const updatePayload: any = {};
      if (data.amount !== undefined) updatePayload.amount = data.amount;
      if (data.tax !== undefined) updatePayload.tax = data.tax;
      if (data.description !== undefined) updatePayload.description = data.description || null;
      if (data.date !== undefined) updatePayload.date = data.date || null;
      if (data.itemType !== undefined) updatePayload.item_type = data.itemType || null;
      if (data.itemId !== undefined) updatePayload.item_id = data.itemId || null;
      if (data.quantity !== undefined) updatePayload.quantity = data.quantity ?? 1;
      await supabase.from('revenues').update(updatePayload).eq('id', id);
    }
    setRevenues(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
  };

  // Expense actions
  const addExpense = async (expense: Omit<Expense, 'id'>) => {
    if (!user) return;

    if (!isSupabaseConfigured) {
      const newExp: Expense = {
        id: `exp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        monthId: expense.monthId,
        category: expense.category,
        description: expense.description,
        amount: expense.amount,
        date: expense.date || `${expense.monthId}-01`,
      };
      setExpenses(prev => [...prev, newExp]);
      return;
    }

    await ensureMonthExists(expense.monthId, user.id);
    const { data, error } = await supabase
      .from('expenses')
      .insert({
        month_id: expense.monthId,
        category: expense.category,
        description: expense.description,
        amount: expense.amount,
        date: expense.date || `${expense.monthId}-01`,
        user_id: user.id,
      })
      .select()
      .single();
    if (data && !error) {
      setExpenses(prev => [...prev, {
        id: data.id,
        monthId: data.month_id,
        category: data.category,
        description: data.description,
        amount: data.amount,
        date: data.date || `${expense.monthId}-01`,
      }]);
      loadData();
    } else {
      // Fallback local se erro
      const newExp: Expense = {
        id: `exp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        monthId: expense.monthId,
        category: expense.category,
        description: expense.description,
        amount: expense.amount,
        date: expense.date || `${expense.monthId}-01`,
      };
      setExpenses(prev => [...prev, newExp]);
    }
  };

  const deleteExpense = async (id: string) => {
    if (isSupabaseConfigured) {
      await supabase.from('expenses').delete().eq('id', id);
    }
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const updateExpense = async (id: string, updates: Partial<Expense>) => {
    if (id.startsWith('temp-pl-')) {
      // Se está "editando" uma provisão de PL, converte em uma despesa real para este mês.
      // O ID tem o padrão temp-pl-${prov.id}-${monthId}, onde prov.id é UUID e monthId é YYYY-MM.
      const match = id.match(/^temp-pl-(.+)-(\d{4}-\d{2})$/);
      const provId = match ? match[1] : '';
      const targetMonthId = match ? match[2] : (updates.monthId || '');
      const prov = plProvisions.find(p => p.id === provId);
      if (!prov) {
        console.warn(`[PL] Provisão com ID ${provId} não encontrada em plProvisions.`);
        return;
      }
      const partner = partners.find(p => p.id === prov.partnerId);
      
      const category = updates.category || (prov.categoryId ? (expenseCategories.find(c => c.id === prov.categoryId)?.name || 'Retirada PL') : 'Retirada PL');
      const partnerName = partner?.name || '';
      const defaultDesc = partnerName ? `PL ${partnerName}` : 'Retirada PL';
      let description = updates.description !== undefined ? updates.description : defaultDesc;
      if (partnerName && !description.includes(partnerName)) {
        description = `${description} - ${partnerName}`;
      }
      const amount = updates.amount !== undefined ? updates.amount : prov.amount;
      
      await addExpense({
        monthId: targetMonthId,
        category,
        description,
        amount,
        date: updates.date,
      });
      return;
    }

    if (isSupabaseConfigured) {
      const payload: any = {};
      if (updates.amount !== undefined) payload.amount = updates.amount;
      if (updates.category !== undefined) payload.category = updates.category;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.date !== undefined) payload.date = updates.date || null;
      await supabase.from('expenses').update(payload).eq('id', id);
    }
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  // Expense Provision actions
  // categoryId: UUID da expense_category vinculada (obrigatório para novos registros)
  const addExpenseProvision = async (
    categoryId: string, 
    categoryName: string, 
    monthlyAmount: number, 
    startMonthId: string,
    endMonthId?: string,
    description?: string
  ) => {
    if (!user) return;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(categoryId);
    const validCategoryId = isUuid ? categoryId : null;

    let newId = `prov-${Date.now()}`;
    let insertedData: any = null;

    try {
      const { data, error } = await supabase.from('expense_provisions').insert({
        user_id: user.id,
        category: categoryName,     // mantido para retrocompatibilidade
        category_id: validCategoryId, // vínculo com expense_categories (apenas se for UUID válido)
        monthly_amount: monthlyAmount,
        start_month_id: startMonthId,
        end_month_id: endMonthId || null,
        description: description?.trim() || null,
      }).select().single();

      if (error) {
        console.warn('[Finance] Erro ao inserir provisão no Supabase, salvando localmente:', error.message);
      } else if (data) {
        insertedData = data;
        newId = data.id;
      }
    } catch (e) {
      console.warn('[Finance] Exceção ao inserir provisão no Supabase:', e);
    }

    const newProv: ExpenseProvision = {
      id: newId,
      categoryId: insertedData?.category_id || categoryId,
      category: categoryName,
      monthlyAmount: insertedData?.monthly_amount ?? monthlyAmount,
      startMonthId: insertedData?.start_month_id ?? startMonthId,
      endMonthId: (insertedData?.end_month_id ?? endMonthId) || undefined,
      description: (insertedData?.description ?? description?.trim()) || undefined,
    };

    setExpenseProvisions(prev => {
      const updated = [...prev, newProv];
      const provStorageKey = `braga_mentoring_expense_provisions_${user.id}`;
      localStorage.setItem(provStorageKey, JSON.stringify(updated));
      return updated;
    });
  };

  const updateExpenseProvision = async (id: string, updates: Partial<ExpenseProvision>) => {
    const payload: any = {};
    if (updates.categoryId !== undefined) {
      const isUuid = updates.categoryId ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(updates.categoryId) : false;
      payload.category_id = isUuid ? updates.categoryId : null;
      const cat = expenseCategories.find(c => c.id === updates.categoryId);
      if (cat) payload.category = cat.name;
    }
    if (updates.monthlyAmount !== undefined) payload.monthly_amount = updates.monthlyAmount;
    if (updates.startMonthId !== undefined) payload.start_month_id = updates.startMonthId;
    if (updates.endMonthId !== undefined) payload.end_month_id = updates.endMonthId || null;
    if (updates.description !== undefined) payload.description = updates.description ? updates.description.trim() : null;

    try {
      await supabase.from('expense_provisions').update(payload).eq('id', id);
    } catch (e) {
      console.warn('[Finance] Erro ao atualizar provisão no Supabase:', e);
    }

    setExpenseProvisions(prev => {
      const updated = prev.map(p => {
        if (p.id === id) {
          return {
            ...p,
            ...updates,
            category: payload.category || p.category,
          };
        }
        return p;
      });
      if (user) {
        const provStorageKey = `braga_mentoring_expense_provisions_${user.id}`;
        localStorage.setItem(provStorageKey, JSON.stringify(updated));
      }
      return updated;
    });
  };

  const deleteExpenseProvision = async (id: string) => {
    try {
      await supabase.from('expense_provisions').delete().eq('id', id);
    } catch (e) {
      console.warn('[Finance] Erro ao excluir provisão no Supabase:', e);
    }

    setExpenseProvisions(prev => {
      const updated = prev.filter(p => p.id !== id);
      if (user) {
        const provStorageKey = `braga_mentoring_expense_provisions_${user.id}`;
        localStorage.setItem(provStorageKey, JSON.stringify(updated));
      }
      return updated;
    });
    setProvisionOverrides(prev => prev.filter(o => o.provisionId !== id));
  };

  // PL Provision actions
  const PERIODICITY_MONTHS: Record<PLPeriodicity, number> = {
    trimestral: 3,
    quadrimestral: 4,
    semestral: 6,
    anual: 12,
  };

  /**
   * Dado um mês YYYY-MM e uma provão PL, retorna true se esse mês é um mês de pagamento.
   * O primeiro pagamento ocorre exatamente no mês start_month_id, os seguintes a cada N meses.
   */
  const isPLActiveInMonth = (prov: PLProvision, monthId: string): boolean => {
    if (monthId < prov.startMonthId) return false;
    const [sy, sm] = prov.startMonthId.split('-').map(Number);
    const [ty, tm] = monthId.split('-').map(Number);
    const diffMonths = (ty - sy) * 12 + (tm - sm);
    const step = PERIODICITY_MONTHS[prov.periodicity];
    return diffMonths % step === 0;
  };

  const getMonthPLProvisions = (monthId: string): Expense[] => {
    const result: Expense[] = [];
    for (const prov of plProvisions) {
      if (!isPLActiveInMonth(prov, monthId)) continue;
      const partner = partners.find(p => p.id === prov.partnerId);
      
      const partnerName = partner?.name || '';
      
      // Checar se já existe uma despesa real de PL para este sócio neste mês
      const realExpensesForPartner = expenses.filter(
        e => e.monthId === monthId && 
             e.category === 'Retirada PL' && 
             e.description?.includes(partnerName)
      );
      
      const realAmount = realExpensesForPartner.reduce((acc, e) => acc + e.amount, 0);
      
      if (realAmount > 0) {
        // Se já lançou um valor, oculta a provisão virtual
        continue;
      }

      // Encontrar nome da categoria baseada no categoryId se houver
      const catName = prov.categoryId 
        ? expenseCategories.find(c => c.id === prov.categoryId)?.name 
        : 'Retirada PL';

      result.push({
        id: `temp-pl-${prov.id}-${monthId}`,
        monthId,
        category: catName || 'Retirada PL',
        description: partner ? `PL ${partner.name}` : 'Retirada PL',
        amount: prov.amount,
      });
    }
    return result;
  };

  const addPLProvision = async (partnerId: string, amount: number, periodicity: PLPeriodicity, startMonthId: string, endMonthId?: string, categoryId?: string) => {
    if (!user) return;
    // Usa a tabela pl_provisions dedicada (não mais expense_provisions)
    const { data, error } = await supabase.from('pl_provisions').insert({
      user_id: user.id,
      partner_id: partnerId,
      amount,
      periodicity,
      start_month_id: startMonthId,
      end_month_id: endMonthId || null,
      category_id: categoryId || null,
    }).select().single();
    if (error) {
      console.error('Erro ao adicionar PL:', error);
      throw error;
    }
    if (data) {
      setPlProvisions(prev => [...prev, {
        id: data.id,
        partnerId: data.partner_id,
        amount: data.amount,
        periodicity: data.periodicity as PLPeriodicity,
        startMonthId: data.start_month_id,
        endMonthId: data.end_month_id,
        categoryId: data.category_id,
        isLegacy: false,
      }].sort((a: any, b: any) => b.startMonthId.localeCompare(a.startMonthId)));
    }
  };

  const updatePLProvision = async (id: string, updates: Partial<PLProvision>) => {
    const prov = plProvisions.find(p => p.id === id);
    if (!prov) return;

    const payload: any = {};
    if (updates.amount !== undefined) payload.amount = updates.amount;
    if (updates.periodicity !== undefined) payload.periodicity = updates.periodicity;
    if (updates.startMonthId !== undefined) payload.start_month_id = updates.startMonthId;
    if (updates.endMonthId !== undefined) payload.end_month_id = updates.endMonthId || null;
    if (updates.categoryId !== undefined) payload.category_id = updates.categoryId || null;
    
    // Tratamento legado: se a provision for legada, atualizamos na expense_provisions e também a categoria
    if ((prov as any).isLegacy) {
      if (updates.amount !== undefined) payload.monthly_amount = updates.amount;
      // Não tentamos mudar a periodicidade na string legada pra evitar bagunça, mas atualizamos outros dados possíveis.
      if (updates.periodicity !== undefined) {
         payload.category = `PLR|${prov.partnerId}|${updates.periodicity}`;
      }
      
      const { error } = await supabase.from('expense_provisions').update(payload).eq('id', id);
      if (!error) {
        setPlProvisions(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p).sort((a: any, b: any) => b.startMonthId.localeCompare(a.startMonthId)));
      }
    } else {
      const { error } = await supabase.from('pl_provisions').update(payload).eq('id', id);
      if (!error) {
        setPlProvisions(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p).sort((a: any, b: any) => b.startMonthId.localeCompare(a.startMonthId)));
      }
    }
  };

  const deletePLProvision = async (id: string) => {
    const prov = plProvisions.find(p => p.id === id);
    if (!prov) return;
    
    // Deleta da tabela correta baseado em ser legado ou não
    if ((prov as any).isLegacy) {
      await supabase.from('expense_provisions').delete().eq('id', id);
    } else {
      await supabase.from('pl_provisions').delete().eq('id', id);
    }
    setPlProvisions(prev => prev.filter(p => p.id !== id));
  };

  const shiftPLProvision = async (id: string, originalMonthId: string, newMonthId: string, newAmount: number, newDescription: string) => {
    const prov = plProvisions.find(p => p.id === id);
    if (!prov) return;

    if (originalMonthId === prov.startMonthId) {
      await updatePLProvision(id, { startMonthId: newMonthId });
    } else {
      const [oy, om] = originalMonthId.split('-').map(Number);
      let py = oy;
      let pm = om - 1;
      if (pm === 0) { py--; pm = 12; }
      const previousMonthId = `${py}-${String(pm).padStart(2, '0')}`;
      
      await updatePLProvision(id, { endMonthId: previousMonthId });
      
      await addPLProvision(
        prov.partnerId,
        prov.amount,
        prov.periodicity,
        newMonthId,
        prov.endMonthId,
        prov.categoryId ?? undefined   // Fix TS2345: null → undefined
      );
    }
    
    const catName = prov.categoryId ? (expenseCategories.find(c => c.id === prov.categoryId)?.name || 'Retirada PL') : 'Retirada PL';
    
    await addExpense({
      monthId: newMonthId,
      category: catName,
      description: newDescription,
      amount: newAmount,
    });
  };

  const zeroProvisionForMonth = async (provisionId: string, monthId: string) => {
    if (!user) return;
    // Upsert: se já existe, atualiza; senão, cria
    const { data, error } = await supabase.from('provision_overrides').upsert({
      user_id: user.id, provision_id: provisionId, month_id: monthId, is_zeroed: true
    }, { onConflict: 'provision_id,month_id' }).select().single();
    if (data && !error) {
      setProvisionOverrides(prev => {
        const exists = prev.find(o => o.provisionId === provisionId && o.monthId === monthId);
        if (exists) return prev.map(o => o.provisionId === provisionId && o.monthId === monthId ? { ...o, isZeroed: true } : o);
        return [...prev, { id: data.id, provisionId: data.provision_id, monthId: data.month_id, isZeroed: data.is_zeroed }];
      });
    }
  };

  /**
   * Para um dado mês, retorna as despesas virtuais de provisão.
   * - Se o mês está zerado manualmente → não retorna provisão
   * - Se há despesas reais da categoria → retorna a diferença (provisão - real), se positiva
   * - Se não há despesas reais → retorna a provisão completa como virtual
   */
  const getMonthProvisions = (monthId: string): Expense[] => {
    const result: Expense[] = [];
    for (const prov of expenseProvisions) {
      // Verifica se provisão está ativa neste mês (respeitando início e fim)
      if (prov.startMonthId > monthId) continue;
      if (prov.endMonthId && monthId > prov.endMonthId) continue;

      // Verifica se foi zerado manualmente
      const isZeroed = provisionOverrides.some(o => o.provisionId === prov.id && o.monthId === monthId && o.isZeroed);
      if (isZeroed) continue;

      // Soma despesas reais desta categoria neste mês
      const realTotal = expenses
        .filter(e => e.monthId === monthId && e.category === prov.category)
        .reduce((acc, e) => acc + e.amount, 0);

      const remaining = prov.monthlyAmount - realTotal;
      if (remaining > 0) {
        const descLabel = prov.description ? `Provisão: ${prov.description}` : `Provisão (${prov.category})`;
        result.push({
          id: `temp-prov-${prov.id}-${monthId}`,
          monthId,
          category: prov.category,
          description: descLabel,
          amount: remaining,
        });
      }
    }
    return result;
  };

  /**
   * Para o AddExpenseDialog: retorna info da provisão ativa para a categoria/mês
   */
  const getProvisionInfo = (category: string, monthId: string) => {
    const prov = expenseProvisions.find(p => 
      p.category === category && 
      p.startMonthId <= monthId && 
      (!p.endMonthId || monthId <= p.endMonthId)
    );
    if (!prov) return null;
    const isZeroed = provisionOverrides.some(o => o.provisionId === prov.id && o.monthId === monthId && o.isZeroed);
    if (isZeroed) return null;
    const realTotal = expenses.filter(e => e.monthId === monthId && e.category === category).reduce((acc, e) => acc + e.amount, 0);
    return {
      provision: prov,
      realTotal,
      remaining: Math.max(0, prov.monthlyAmount - realTotal),
    };
  };

  const updateInitialBalance = async (monthId: string, balance: number) => {
    if (!user) return;
    await ensureMonthExists(monthId, user.id);
    await supabase.from('months').update({ initial_balance: balance }).eq('id', monthId).eq('user_id', user.id);
    setMonths(prev => prev.map(m => m.id === monthId ? { ...m, initialBalance: balance } : m));
  };

  // Compute initial balance dynamically (cascading months)
  const getInitialBalance = (monthId: string): number => {
    // Se o mês solicitado for anterior ou igual ao mês inicial do sistema,
    // usamos o saldo inicial definido na tabela months. Não há cálculo cascata para meses anteriores.
    if (monthId <= MIN_MONTH) {
      const month = months.find(m => m.id === monthId);
      return month ? month.initialBalance : 0;
    }
    
    // Caso contrário, pegamos o saldo do mês imediatamente anterior e somamos com suas movimentações
    const [year, month] = monthId.split('-').map(Number);
    let prevYear = year;
    let prevMonth = month - 1;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear -= 1;
    }
    const prevMonthId = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
    
    const prevInitial = getInitialBalance(prevMonthId);
    const prevExps = [
      ...expenses.filter(e => e.monthId === prevMonthId && e.category !== 'FP'),
      ...getMonthProlabores(prevMonthId),
      ...getMonthProvisions(prevMonthId),
      ...getMonthPLProvisions(prevMonthId),
    ];
    const prevMonthRevs = getMonthRevenues(prevMonthId);
    
    const prevNet = Math.round((prevMonthRevs.reduce((acc, r) => acc + (r.amount - r.tax), 0)) * 100) / 100;
    const prevExpTotal = Math.round((prevExps.reduce((acc, e) => acc + e.amount, 0)) * 100) / 100;
    
    return Math.round((prevInitial + prevNet - prevExpTotal) * 100) / 100;
  };

  const getActiveContract = (clientId: string, monthId: string): ClientContract | undefined => {
    const contracts = clientContracts.filter(c => c.clientId === clientId);
    if (contracts.length === 0) return undefined;
    const sorted = [...contracts].sort((a, b) => b.startMonthId.localeCompare(a.startMonthId));
    return sorted.find(c => c.startMonthId <= monthId) || undefined;
  };

  const getMonthRevenues = (monthId: string): Revenue[] => {
    const result: Revenue[] = [];
    const clientIdsSet = new Set(clients.map(c => c.id));

    for (const client of clients) {
      // Verifica se há override manual para este cliente neste mês
      const overrides = revenues.filter(r => r.monthId === monthId && r.clientId === client.id);
      if (overrides.length > 0) {
        result.push(...overrides);
        continue;
      }

      const activeContract = getActiveContract(client.id, monthId);

      if (activeContract) {
        const amount = activeContract.amount;
        const isGross = activeContract.isGross;
        const taxPercentage = activeContract.taxPercentage;
        const tax = isGross ? Math.round((amount * (taxPercentage / 100)) * 100) / 100 : 0;
        if (amount > 0) {
          result.push({
            id: `temp-${client.id}-${monthId}`,
            clientId: client.id,
            monthId: monthId,
            amount: amount,
            tax: tax,
          });
        }
      } else if (client.defaultBaseValue && client.defaultBaseValue > 0) {
        const amount = client.defaultBaseValue;
        const tax = Math.round((amount * 0.089) * 100) / 100;
        result.push({
          id: `temp-${client.id}-default-${monthId}`,
          clientId: client.id,
          monthId: monthId,
          amount: amount,
          tax: tax,
        });
      }
    }

    // Adiciona todas as receitas avulsas, vendas de balcão e caixas diários
    const extraRevenues = revenues.filter(
      r => r.monthId === monthId && (!r.clientId || !clientIdsSet.has(r.clientId))
    );
    result.push(...extraRevenues);

    return result;
  };

  const getActivePartnerContract = (partnerId: string, monthId: string): PartnerContract | undefined => {
    const contracts = partnerContracts.filter(c => c.partnerId === partnerId);
    if (contracts.length === 0) return undefined;
    const sorted = [...contracts].sort((a, b) => b.startMonthId.localeCompare(a.startMonthId));
    const active = sorted.find(c => c.startMonthId <= monthId);
    return active || undefined;
  };

  const getMonthProlabores = (monthId: string): Expense[] => {
    const result: Expense[] = [];

    // Total de adiantamentos lançados neste mês (a descontar do FP virtual)
    const totalAdiantamento = expenses
      .filter(e => e.monthId === monthId && e.category === 'Adiantamento')
      .reduce((acc, e) => acc + e.amount, 0);

    // Distribui o desconto sequencialmente entre os parceiros (ordem natural)
    let remainingDeduction = totalAdiantamento;

    for (const partner of partners) {
      // Verifica se há override manual (despesa FP real lançada com nome do parceiro)
      const override = expenses.find(e => e.monthId === monthId && e.category === 'FP' && e.description === partner.name);
      if (override) {
        result.push(override);
      } else {
        const contract = getActivePartnerContract(partner.id, monthId);
        if (contract && contract.amount > 0) {
          // Desconta adiantamento do FP virtual deste parceiro
          const deduction = Math.min(remainingDeduction, contract.amount);
          remainingDeduction -= deduction;
          // O valor bruto é a saída real de caixa da empresa.
          // INSS e IRRF são impostos apurados sobre o sócio, não reduzem a despesa da PJ.
          // O valor líquido só é usado na Carteira Pessoal.
          const grossAmount = contract.amount - deduction;

          if (grossAmount > 0) {
            const catName = contract.categoryId 
              ? (expenseCategories.find(c => c.id === contract.categoryId)?.name || 'FP') 
              : 'FP';
            result.push({
              id: `temp-fp-${partner.id}-${monthId}`,
              monthId: monthId,
              category: catName,
              description: partner.name,
              amount: grossAmount,
            });
          }
        }
      }
    }
    return result;
  };

  return {
    clients, clientContracts, revenues, expenses, months, partners, partnerContracts, loading,
    addClient, updateClient, deleteClient,
    addClientContract, updateClientContract, deleteClientContract,
    addPartner, updatePartner, deletePartner,
    addPartnerContract, updatePartnerContract, deletePartnerContract,
    addRevenue, updateRevenue, deleteRevenue,
    addExpense, updateExpense, deleteExpense,
    getInitialBalance, updateInitialBalance,
    getActiveContract, getMonthRevenues,
    getMonthProlabores,
    expenseProvisions, provisionOverrides,
    expenseCategories,
    addExpenseProvision, deleteExpenseProvision, updateExpenseProvision, zeroProvisionForMonth,
    getMonthProvisions, getProvisionInfo,
    plProvisions,
    addPLProvision, deletePLProvision, updatePLProvision, shiftPLProvision,
    getMonthPLProvisions,
    reload: loadData,
  };
}
