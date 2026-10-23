import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ProjectionsSettings {
  servicePrice: number;
  clientsPerDay: number;
  workDays: number;
  fixedExpenses: number;
  enableProducts: boolean;
  productConversionPercent: number;
  productSalePrice: number;
  productCostPrice: number;
  targetProfit: number;
  activeTab: 'current' | 'goals';
}

const DEFAULTS: ProjectionsSettings = {
  servicePrice: 50,
  clientsPerDay: 8,
  workDays: 20,
  fixedExpenses: 4000,
  enableProducts: false,
  productConversionPercent: 20,
  productSalePrice: 45,
  productCostPrice: 20,
  targetProfit: 6000,
  activeTab: 'current',
};

function storageKey(userId: string) {
  return `braga_mentoring_projections_v3_${userId}`;
}

function fromLocalStorage(userId: string): Partial<ProjectionsSettings> {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function toLocalStorage(userId: string, settings: ProjectionsSettings) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify({ ...settings, updatedAt: new Date().toISOString() }));
  } catch {}
}

/** Maps DB row → ProjectionsSettings */
function fromRow(row: any): ProjectionsSettings {
  return {
    servicePrice: Number(row.service_price ?? DEFAULTS.servicePrice),
    clientsPerDay: Number(row.clients_per_day ?? DEFAULTS.clientsPerDay),
    workDays: Number(row.work_days ?? DEFAULTS.workDays),
    fixedExpenses: Number(row.fixed_expenses ?? DEFAULTS.fixedExpenses),
    enableProducts: Boolean(row.enable_products ?? DEFAULTS.enableProducts),
    productConversionPercent: Number(row.product_conversion_percent ?? DEFAULTS.productConversionPercent),
    productSalePrice: Number(row.product_sale_price ?? DEFAULTS.productSalePrice),
    productCostPrice: Number(row.product_cost_price ?? DEFAULTS.productCostPrice),
    targetProfit: Number(row.target_profit ?? DEFAULTS.targetProfit),
    activeTab: (row.active_tab as ProjectionsSettings['activeTab']) ?? DEFAULTS.activeTab,
  };
}

/** Maps ProjectionsSettings → DB payload */
function toPayload(s: ProjectionsSettings) {
  return {
    service_price: s.servicePrice,
    clients_per_day: s.clientsPerDay,
    work_days: s.workDays,
    fixed_expenses: s.fixedExpenses,
    enable_products: s.enableProducts,
    product_conversion_percent: s.productConversionPercent,
    product_sale_price: s.productSalePrice,
    product_cost_price: s.productCostPrice,
    target_profit: s.targetProfit,
    active_tab: s.activeTab,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Hook de Projeções & Metas:
 * - Carrega os dados persistidos no banco de dados Supabase e no cache local.
 * - Modo Simulação: o usuário pode alterar valores e ver recálculos em tempo real.
 * - Não grava a cada tecla/slider no banco, evitando poluição e escritas desnecessárias.
 * - Fornece `saveSettings` para salvar no banco quando o usuário decidir salvar.
 */
export function useProjectionsSettings() {
  const { user } = useAuth();
  const userId = user?.id || 'demo';
  const hasRealUser = !!user?.id && user.id !== 'demo' && user.id !== 'braga-dev-admin-id';

  // Inicializa imediatamente do localStorage se existir para evitar qualquer flash de 11k
  const [settings, setSettingsState] = useState<ProjectionsSettings>(() => {
    if (typeof window !== 'undefined') {
      const cached = fromLocalStorage(userId);
      if (Object.keys(cached).length > 0) {
        return { ...DEFAULTS, ...cached };
      }
    }
    return DEFAULTS;
  });

  const [savedSettings, setSavedSettings] = useState<ProjectionsSettings>(() => {
    if (typeof window !== 'undefined') {
      const cached = fromLocalStorage(userId);
      if (Object.keys(cached).length > 0) {
        return { ...DEFAULTS, ...cached };
      }
    }
    return DEFAULTS;
  });

  const [loaded, setLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // ---- Carregar do Supabase ao montar ou ao alterar usuário ----
  useEffect(() => {
    let isMounted = true;

    const loadSettings = async () => {
      // 1. Aplica o cache local do usuário atual imediatamente
      const local = fromLocalStorage(userId);
      if (Object.keys(local).length > 0 && isMounted) {
        const mergedLocal = { ...DEFAULTS, ...local };
        setSettingsState(mergedLocal);
        setSavedSettings(mergedLocal);
      }

      // 2. Busca do Supabase para garantir a versão oficial do banco de dados
      if (isSupabaseConfigured && hasRealUser) {
        try {
          const { data, error } = await supabase
            .from('user_projections_settings')
            .select('*')
            .eq('user_id', user!.id)
            .maybeSingle();

          if (data && !error && isMounted) {
            const fromDb = fromRow(data);
            setSettingsState(fromDb);
            setSavedSettings(fromDb);
            toLocalStorage(userId, fromDb);
            setLastSavedAt(new Date(data.updated_at || Date.now()));
            setLoaded(true);
            return;
          }
        } catch (e) {
          console.warn('Erro ao carregar projeções do Supabase, usando local:', e);
        }
      }

      if (isMounted) {
        setLoaded(true);
      }
    };

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, [userId, hasRealUser]);

  // Atualizador do rascunho de simulação
  const setSettings = useCallback((updater: Partial<ProjectionsSettings> | ((prev: ProjectionsSettings) => ProjectionsSettings)) => {
    if (typeof updater === 'function') {
      setSettingsState(updater);
    } else {
      setSettingsState(prev => ({ ...prev, ...updater }));
    }
  }, []);

  // Compara se o rascunho atual difere da versão salva (apenas variáveis financeiras/metas, ignorando aba de navegação)
  const isDirty = useMemo(() => {
    const { activeTab: _t1, ...s1 } = settings;
    const { activeTab: _t2, ...s2 } = savedSettings;
    return JSON.stringify(s1) !== JSON.stringify(s2);
  }, [settings, savedSettings]);

  // Salvar no Banco de Dados Supabase + LocalStorage
  const saveSettings = useCallback(async () => {
    setIsSaving(true);
    try {
      // Salva no cache local imediatamente
      toLocalStorage(userId, settings);

      if (isSupabaseConfigured && hasRealUser && user) {
        const payload = toPayload(settings);

        const { data: existing } = await supabase
          .from('user_projections_settings')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (existing) {
          const { error } = await supabase
            .from('user_projections_settings')
            .update(payload)
            .eq('user_id', user.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('user_projections_settings')
            .insert({ ...payload, user_id: user.id });
          if (error) throw error;
        }
      }

      setSavedSettings(settings);
      setLastSavedAt(new Date());
      toast.success('Projeções e metas salvas no banco de dados com sucesso!');
      return true;
    } catch (err: any) {
      console.error('Erro ao salvar no banco:', err);
      toast.error('Erro ao salvar preferências no banco de dados: ' + (err.message || 'Tente novamente.'));
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [settings, userId, hasRealUser, user]);

  // Descartar alterações de simulação e restaurar última versão salva
  const discardChanges = useCallback(() => {
    setSettingsState(savedSettings);
    toast.info('Simulação descartada. Valores restaurados do banco de dados.');
  }, [savedSettings]);

  return {
    settings,
    setSettings,
    savedSettings,
    isDirty,
    isSaving,
    lastSavedAt,
    saveSettings,
    discardChanges,
    loaded,
  };
}
