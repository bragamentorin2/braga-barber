export type BusinessSegment = 'barbershop' | 'beauty_salon';

/**
 * @deprecated Mantido apenas por compatibilidade retroativa.
 * A verificação de SuperAdmin oficial é realizada no Supabase via RPC rpc_check_is_admin e tabela admin_users.
 */
export const SUPER_ADMIN_EMAILS = [
  'braga.mentoring@gmail.com',
  'admin@bragamentoring.com.br',
];

export type LicenseStatus = 'active' | 'trial' | 'onboarding' | 'suspended';
export type PlanType = 'starter' | 'pro' | 'mentorship_vip';

export interface BusinessProfileTerms {
  segment: BusinessSegment;
  segmentName: string;
  segmentBadge: string;
  serviceSingle: string;
  servicesTitle: string;
  productSingle: string;
  productsTitle: string;
  professionalSingle: string;
  professionalsTitle: string;
  serviceCatalogName: string;
  productCatalogName: string;
  newServiceButton: string;
  newProductButton: string;
  clientLabel: string;
  summaryPlaceholder: string;
  sampleItems: string[];
  bannerHighlight: string;
}

export interface Establishment {
  id: string;
  name: string;
  segment: BusinessSegment;
  ownerName: string;
  email: string;
  phone?: string;
  cnpjOrCpf?: string;
  city?: string;
  state?: string;
  status: LicenseStatus;
  plan: PlanType;
  monthlyFee?: number; // Valor mensal cobrado pela licença/mentoria
  dueDay?: number; // Dia de vencimento da mensalidade (ex: dia 10)
  monthlyRevenueEstimate?: number; // Faturamento médio do estabelecimento
  professionalsCount?: number; // Quantidade de barbeiros ou cabeleireiras
  licenseExpiresAt?: string; // Data de validade/renovação do acesso
  createdAt: string;
  notes?: string;
  temporaryPassword?: string; // Senha provisória ativa atribuída pelo consultor
  mustChangePassword?: boolean; // Se o cliente ainda precisa alterar a senha no 1º acesso
  passwordStatus?: 'temporary' | 'changed'; // 'temporary' = senha provisória ativa | 'changed' = senha definitiva já criada
}

export const SEGMENT_TERMS: Record<BusinessSegment, BusinessProfileTerms> = {
  barbershop: {
    segment: 'barbershop',
    segmentName: 'Barbearia Clássica & Moderna',
    segmentBadge: 'Barbearia',
    serviceSingle: 'Corte / Barba',
    servicesTitle: 'Cortes & Serviços de Barba',
    productSingle: 'Pomada / Finalizador',
    productsTitle: 'Pomadas, Óleos & Produtos',
    professionalSingle: 'Barbeiro',
    professionalsTitle: 'Barbeiros & Especialistas',
    serviceCatalogName: 'Catálogo de Cortes e Procedimentos',
    productCatalogName: 'Catálogo de Pomadas e Linha Masculina',
    newServiceButton: '+ Novo Corte / Barba',
    newProductButton: '+ Nova Pomada / Produto',
    clientLabel: 'Cliente',
    summaryPlaceholder: 'Ex: Corte Degradê, Barboterapia, Pomada Efeito Matte, Óleo Hidratante',
    sampleItems: ['Cortes', 'Barba', 'Pomadas', 'Acabamento', 'Barboterapia'],
    bannerHighlight: 'Ambiente com vocabulário focado em cortes, barba, toalha quente e pomadas masculinas.',
  },
  beauty_salon: {
    segment: 'beauty_salon',
    segmentName: 'Salão de Beleza & Studio Hair',
    segmentBadge: 'Salão de Beleza',
    serviceSingle: 'Procedimento / Tratamento',
    servicesTitle: 'Procedimentos, Mechas & Escovas',
    productSingle: 'Cosmético / Home Care',
    productsTitle: 'Cosméticos, Kits & Tratamentos',
    professionalSingle: 'Profissional / Especialista',
    professionalsTitle: 'Cabeleireiras, Manicures & Especialistas',
    serviceCatalogName: 'Catálogo de Procedimentos e Mechas',
    productCatalogName: 'Catálogo de Cosméticos e Home Care',
    newServiceButton: '+ Novo Procedimento / Serviço',
    newProductButton: '+ Novo Cosmético / Produto',
    clientLabel: 'Cliente',
    summaryPlaceholder: 'Ex: Mechas Blond, Escova Modelada, Manicure Completa, Cronograma Capilar',
    sampleItems: ['Procedimentos', 'Mechas', 'Escova', 'Manicure', 'Cosméticos'],
    bannerHighlight: 'Ambiente com vocabulário focado em procedimentos capilares, mechas, manicure e cosméticos.',
  },
};
