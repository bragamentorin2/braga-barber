import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import type { BusinessSegment, BusinessProfileTerms, Establishment, LicenseStatus, PlanType } from '@/types/businessProfile';
import { SEGMENT_TERMS } from '@/types/businessProfile';
import { useAuth } from './AuthContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

interface BusinessProfileContextType {
  segment: BusinessSegment;
  terms: BusinessProfileTerms;
  setSegment: (segment: BusinessSegment) => void;
  establishments: Establishment[];
  currentClientEstablishment: Establishment | null;
  loadingEstablishments: boolean;
  isClientRegistered: boolean;
  isAccountSuspended: boolean;
  addEstablishment: (data: Omit<Establishment, 'id' | 'createdAt'>) => Promise<Establishment>;
  updateEstablishment: (id: string, data: Partial<Establishment>) => Promise<void>;
  toggleLicenseStatus: (id: string, newStatus: LicenseStatus) => Promise<void>;
  deleteEstablishment: (id: string) => Promise<void>;
  isSuperAdmin: boolean;
}

const DEFAULT_ESTABLISHMENTS: Establishment[] = [
  {
    id: 'est-braga-vintage',
    name: 'Braga Vintage Barbershop',
    segment: 'barbershop',
    ownerName: 'Jefferson Braga',
    email: 'barbeiro@exemplo.com.br',
    phone: '(11) 98765-4321',
    cnpjOrCpf: '12.345.678/0001-90',
    city: 'São Paulo',
    state: 'SP',
    status: 'active',
    plan: 'mentorship_vip',
    monthlyFee: 497.0,
    dueDay: 10,
    professionalsCount: 5,
    licenseExpiresAt: '2027-10-30',
    monthlyRevenueEstimate: 45000,
    createdAt: '2026-09-01T10:00:00Z',
    notes: 'Unidade conceito de barbearia da mentoria executiva.',
  },
  {
    id: 'est-studio-elegance',
    name: 'Studio Elegance Hair & Estética',
    segment: 'beauty_salon',
    ownerName: 'Mariana Duarte',
    email: 'mariana.salao@exemplo.com.br',
    phone: '(11) 97654-3210',
    cnpjOrCpf: '98.765.432/0001-10',
    city: 'Campinas',
    state: 'SP',
    status: 'active',
    plan: 'pro',
    monthlyFee: 349.0,
    dueDay: 15,
    professionalsCount: 8,
    licenseExpiresAt: '2027-11-15',
    monthlyRevenueEstimate: 62000,
    createdAt: '2026-09-15T14:30:00Z',
    notes: 'Especialista em mechas, loiros e recuperação capilar com equipe de 8 profissionais.',
  },
  {
    id: 'est-alfa-barber',
    name: 'Alfa Club Barbershop',
    segment: 'barbershop',
    ownerName: 'Rodrigo Medeiros',
    email: 'rodrigo.alfa@exemplo.com.br',
    phone: '(21) 99876-1234',
    city: 'Rio de Janeiro',
    state: 'RJ',
    status: 'trial',
    plan: 'starter',
    monthlyFee: 199.0,
    dueDay: 5,
    professionalsCount: 3,
    licenseExpiresAt: '2026-11-05',
    monthlyRevenueEstimate: 28000,
    createdAt: '2026-10-05T09:00:00Z',
    notes: 'Período de avaliação de 15 dias. Alinhando precificação e plano de pró-labore.',
  },
];

function mapDbEstablishment(row: any): Establishment {
  return {
    id: row.id,
    name: row.name || 'Sem nome',
    segment: (row.segment === 'beauty_salon' ? 'beauty_salon' : 'barbershop') as BusinessSegment,
    ownerName: row.owner_name || '',
    email: row.email || '',
    phone: row.phone || '',
    cnpjOrCpf: row.cnpj_or_cpf || '',
    city: row.city || '',
    state: row.state || '',
    status: (row.status || 'active') as LicenseStatus,
    plan: (row.plan || 'starter') as PlanType,
    monthlyFee: Number(row.monthly_fee || 0),
    dueDay: Number(row.due_day || 10),
    professionalsCount: Number(row.professionals_count || 1),
    monthlyRevenueEstimate: Number(row.monthly_revenue_estimate || 0),
    licenseExpiresAt: row.license_expires_at || undefined,
    createdAt: row.created_at || new Date().toISOString(),
    notes: row.notes || '',
    temporaryPassword: row.temporary_password || undefined,
    mustChangePassword: row.must_change_password !== false,
    passwordStatus: (row.password_status || 'temporary') as 'temporary' | 'changed',
  };
}

const BusinessProfileContext = createContext<BusinessProfileContextType | null>(null);

export function BusinessProfileProvider({ children }: { children: React.ReactNode }) {
  const { user, isDevMode, isAdmin } = useAuth();
  const userId = user?.id || 'default_tenant';
  const userEmail = (user?.email || '').toLowerCase().trim();

  // O SuperAdmin é confirmado via RPC segura no banco de dados (AuthContext.isAdmin)
  const isSuperAdmin = isAdmin;

  // Controle de carregamento dos estabelecimentos
  const [loadingEstablishments, setLoadingEstablishments] = useState<boolean>(() => {
    return isSupabaseConfigured && !isDevMode && !!user;
  });

  // Lista de estabelecimentos
  const [establishments, setEstablishments] = useState<Establishment[]>(() => {
    if (isSupabaseConfigured && !isDevMode) {
      return [];
    }
    try {
      const saved = localStorage.getItem('braga_establishments_list');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_ESTABLISHMENTS;
  });

  // Carrega estabelecimentos do Supabase quando online
  useEffect(() => {
    if (!isSupabaseConfigured || isDevMode) {
      setLoadingEstablishments(false);
      return;
    }

    if (!user) {
      setEstablishments([]);
      setLoadingEstablishments(false);
      return;
    }

    let isMounted = true;
    setLoadingEstablishments(true);

    async function loadEstablishments() {
      try {
        if (isSuperAdmin) {
          const { data, error } = await supabase.rpc('rpc_admin_list_establishments');
          if (!error && Array.isArray(data) && isMounted) {
            setEstablishments(data.map(mapDbEstablishment));
            return;
          }
          const { data: tableData } = await supabase
            .from('establishments')
            .select('*')
            .order('created_at', { ascending: false });
          if (tableData && Array.isArray(tableData) && isMounted) {
            setEstablishments(tableData.map(mapDbEstablishment));
          }
        } else if (user) {
          const { data, error } = await supabase.rpc('rpc_get_my_establishment');
          if (!error && Array.isArray(data) && isMounted && data.length > 0) {
            setEstablishments(data.map(mapDbEstablishment));
            return;
          }
          // Busca estrita pelo user_id do usuário ou seu e-mail de acesso
          const { data: clientData } = await supabase
            .from('establishments')
            .select('*')
            .or(`user_id.eq.${user.id},email.eq.${userEmail}`)
            .limit(1);
          if (clientData && Array.isArray(clientData) && isMounted) {
            setEstablishments(clientData.map(mapDbEstablishment));
          } else if (isMounted) {
            setEstablishments([]);
          }
        }
      } catch (err) {
        console.error('Erro ao carregar estabelecimentos:', err);
      } finally {
        if (isMounted) {
          setLoadingEstablishments(false);
        }
      }
    }

    loadEstablishments();

    return () => {
      isMounted = false;
    };
  }, [isSuperAdmin, user?.id, userEmail, isDevMode]);

  // Identifica estritamente se o usuário logado é o responsável de um estabelecimento cadastrado
  const currentClientEstablishment = useMemo(() => {
    if (isSuperAdmin || !user) return null;
    return establishments.find((e) =>
      e.email && e.email.toLowerCase().trim() === userEmail
    ) || null;
  }, [establishments, userEmail, user, isSuperAdmin]);

  // Cliente está devidamente cadastrado se encontrou seu estabelecimento
  const isClientRegistered = isSuperAdmin || !isSupabaseConfigured || isDevMode ? true : !!currentClientEstablishment;

  // Bloqueio de acesso se a licença estiver suspensa ou inativa
  const isAccountSuspended = !isSuperAdmin && !!currentClientEstablishment && (
    currentClientEstablishment.status === 'suspended' ||
    (currentClientEstablishment.status as any) === 'inactive'
  );

  // Segmento ativo do cliente logado
  const [segment, setSegmentState] = useState<BusinessSegment>(() => {
    if (currentClientEstablishment) return currentClientEstablishment.segment;
    const saved = localStorage.getItem(`braga_segment_${userId}`);
    if (saved === 'barbershop' || saved === 'beauty_salon') return saved;
    return 'barbershop';
  });

  // Atualiza o segmento automaticamente quando o estabelecimento do cliente mudar
  useEffect(() => {
    if (currentClientEstablishment) {
      setSegmentState(currentClientEstablishment.segment);
    }
  }, [currentClientEstablishment]);

  // Persiste estabelecimentos localmente como fallback resiliente
  useEffect(() => {
    try {
      localStorage.setItem('braga_establishments_list', JSON.stringify(establishments));
    } catch {}
  }, [establishments]);

  // Permite alterar segmento do cliente (restrito ao SuperAdmin)
  const setSegment = async (newSegment: BusinessSegment) => {
    if (!isSuperAdmin) {
      return;
    }

    setSegmentState(newSegment);
    localStorage.setItem(`braga_segment_${userId}`, newSegment);

    if (user && isSupabaseConfigured) {
      try {
        await supabase
          .from('company_settings')
          .upsert({
            user_id: user.id,
            company_name: 'Braga Estabelecimento',
            business_segment: newSegment,
          }, { onConflict: 'user_id' });
      } catch {
        // Silencioso se a tabela ou coluna não existir
      }
    }
  };

  // Ações de Estabelecimentos (CRUD do SuperAdmin)
  const addEstablishment = async (data: Omit<Establishment, 'id' | 'createdAt'>): Promise<Establishment> => {
    const tempId = `est-${uuidv4().substring(0, 8)}`;

    if (isSupabaseConfigured && !isDevMode) {
      try {
        const { data: inserted, error } = await supabase
          .from('establishments')
          .insert({
            name: data.name,
            segment: data.segment,
            owner_name: data.ownerName,
            email: data.email,
            phone: data.phone,
            city: data.city,
            state: data.state,
            status: data.status,
            plan: data.plan,
            monthly_fee: data.monthlyFee,
            due_day: data.dueDay,
            monthly_revenue_estimate: data.monthlyRevenueEstimate,
            professionals_count: data.professionalsCount,
            license_expires_at: data.licenseExpiresAt || null,
            notes: data.notes,
            cnpj_or_cpf: data.cnpjOrCpf,
            temporary_password: data.temporaryPassword || null,
            password_status: data.passwordStatus || 'temporary',
            must_change_password: data.mustChangePassword !== false,
          })
          .select()
          .single();

        if (!error && inserted) {
          const newEst = mapDbEstablishment(inserted);
          setEstablishments(prev => [newEst, ...prev]);
          return newEst;
        } else if (error) {
          console.warn('Erro ao inserir estabelecimento no Supabase:', error);
        }
      } catch (err) {
        console.warn('Exceção ao inserir estabelecimento no Supabase:', err);
      }
    }

    const fallbackEst: Establishment = {
      id: tempId,
      createdAt: new Date().toISOString(),
      ...data,
    };

    setEstablishments(prev => [fallbackEst, ...prev]);
    return fallbackEst;
  };

  const updateEstablishment = async (id: string, data: Partial<Establishment>) => {
    setEstablishments(prev => prev.map(e => (e.id === id ? { ...e, ...data } : e)));

    if (currentClientEstablishment?.id === id && data.segment) {
      setSegmentState(data.segment);
    }

    if (isSupabaseConfigured && !isDevMode) {
      try {
        await supabase
          .from('establishments')
          .update({
            ...(data.name && { name: data.name }),
            ...(data.segment && { segment: data.segment }),
            ...(data.ownerName && { owner_name: data.ownerName }),
            ...(data.email && { email: data.email }),
            ...(data.phone && { phone: data.phone }),
            ...(data.city && { city: data.city }),
            ...(data.state && { state: data.state }),
            ...(data.status && { status: data.status }),
            ...(data.plan && { plan: data.plan }),
            ...(data.cnpjOrCpf && { cnpj_or_cpf: data.cnpjOrCpf }),
            ...(data.monthlyFee !== undefined && { monthly_fee: data.monthlyFee }),
            ...(data.dueDay !== undefined && { due_day: data.dueDay }),
            ...(data.monthlyRevenueEstimate !== undefined && { monthly_revenue_estimate: data.monthlyRevenueEstimate }),
            ...(data.professionalsCount !== undefined && { professionals_count: data.professionalsCount }),
            ...(data.licenseExpiresAt !== undefined && { license_expires_at: data.licenseExpiresAt || null }),
            ...(data.notes !== undefined && { notes: data.notes }),
            ...(data.temporaryPassword !== undefined && { temporary_password: data.temporaryPassword }),
            ...(data.passwordStatus !== undefined && { password_status: data.passwordStatus }),
            ...(data.mustChangePassword !== undefined && { must_change_password: data.mustChangePassword }),
          })
          .eq('id', id);
      } catch (err) {
        console.warn('Erro ao atualizar estabelecimento no Supabase:', err);
      }
    }
  };

  const toggleLicenseStatus = async (id: string, newStatus: LicenseStatus) => {
    await updateEstablishment(id, { status: newStatus });
  };

  const deleteEstablishment = async (id: string) => {
    setEstablishments(prev => prev.filter(e => e.id !== id));

    if (isSupabaseConfigured && !isDevMode) {
      try {
        await supabase.from('establishments').delete().eq('id', id);
      } catch {
        // Resiliente
      }
    }
  };

  const terms = SEGMENT_TERMS[segment] || SEGMENT_TERMS.barbershop;

  return (
    <BusinessProfileContext.Provider
      value={{
        segment,
        terms,
        setSegment,
        establishments,
        currentClientEstablishment,
        loadingEstablishments,
        isClientRegistered,
        isAccountSuspended,
        addEstablishment,
        updateEstablishment,
        toggleLicenseStatus,
        deleteEstablishment,
        isSuperAdmin,
      }}
    >
      {children}
    </BusinessProfileContext.Provider>
  );
}

export function useBusinessProfile() {
  const context = useContext(BusinessProfileContext);
  if (!context) {
    throw new Error('useBusinessProfile deve ser utilizado dentro de um BusinessProfileProvider');
  }
  return context;
}
