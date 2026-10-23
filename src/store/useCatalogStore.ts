import { useState, useEffect } from 'react';
import type { ServiceItem, ProductItem } from '@/types/catalog';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessProfile } from '@/contexts/BusinessProfileContext';

// Padrões para Barbearia
const DEFAULT_BARBERSHOP_SERVICES: ServiceItem[] = [
  { id: 'srv-bb-1', name: 'Corte Masculino Degradê', price: 45.0, durationMinutes: 45, category: 'Cabelo', description: 'Corte na máquina e tesoura com acabamento na navalha' },
  { id: 'srv-bb-2', name: 'Barboterapia & Toalha Quente', price: 40.0, durationMinutes: 35, category: 'Barba', description: 'Alinhamento completo da barba com massagem e toalha quente' },
  { id: 'srv-bb-3', name: 'Combo Cabelo + Barba', price: 75.0, durationMinutes: 60, category: 'Combos', description: 'Corte degradê completo e barba alinhada' },
  { id: 'srv-bb-4', name: 'Sobrancelha na Navalha', price: 15.0, durationMinutes: 15, category: 'Acabamento', description: 'Design e alinhamento de sobrancelha' },
  { id: 'srv-bb-5', name: 'Pigmentação de Barba', price: 35.0, durationMinutes: 30, category: 'Química', description: 'Camuflagem de fios brancos e preenchimento de falhas' },
];

const DEFAULT_BARBERSHOP_PRODUCTS: ProductItem[] = [
  { id: 'prd-bb-1', name: 'Pomada Modeladora Efeito Matte', salePrice: 38.0, costPrice: 16.0, stockQuantity: 15, category: 'Finalizadores', description: 'Fixação forte e acabamento sem brilho' },
  { id: 'prd-bb-2', name: 'Óleo Hidratante para Barba', salePrice: 42.0, costPrice: 18.0, stockQuantity: 12, category: 'Barba', description: 'Hidratação profunda com aroma amadeirado' },
  { id: 'prd-bb-3', name: 'Shampoo Antiqueda & Fortalecedor', salePrice: 49.0, costPrice: 22.0, stockQuantity: 8, category: 'Cabelo', description: 'Com biotina e extratos botânicos' },
  { id: 'prd-bb-4', name: 'Balm Pós-Barba Refrescante', salePrice: 35.0, costPrice: 14.0, stockQuantity: 10, category: 'Barba', description: 'Alívio imediato contra irritação' },
  { id: 'prd-bb-5', name: 'Cerveja Long Neck / Energético (Lounge)', salePrice: 14.0, costPrice: 6.0, stockQuantity: 24, category: 'Conveniência', description: 'Consumo no espaço' },
];

// Padrões para Salão de Beleza & Studio Hair
const DEFAULT_BEAUTY_SALON_SERVICES: ServiceItem[] = [
  { id: 'srv-bs-1', name: 'Mechas Criativas / Morena Iluminada', price: 380.0, durationMinutes: 180, category: 'Mechas & Loiros', description: 'Técnica personalizada com plex protetor e matização' },
  { id: 'srv-bs-2', name: 'Escova Modelada & Nutrição Capilar', price: 95.0, durationMinutes: 50, category: 'Tratamentos', description: 'Higienização profunda, máscara de nutrição e escovação' },
  { id: 'srv-bs-3', name: 'Manicure & Pedicure Completa', price: 75.0, durationMinutes: 60, category: 'Unhas', description: 'Cutilagem russa, esmaltação e hidratação das mãos e pés' },
  { id: 'srv-bs-4', name: 'Alinhamento Térmico / Botox Capilar', price: 220.0, durationMinutes: 120, category: 'Química & Liso', description: 'Redução de frizz com reposição de massa proteica' },
  { id: 'srv-bs-5', name: 'Design de Sobrancelhas & Lash Lifting', price: 110.0, durationMinutes: 60, category: 'Olhar & Estética', description: 'Realinhamento e curvatura dos cílios com design de sobrancelha' },
];

const DEFAULT_BEAUTY_SALON_PRODUCTS: ProductItem[] = [
  { id: 'prd-bs-1', name: 'Máscara de Nutrição Profissional Home Care', salePrice: 120.0, costPrice: 55.0, stockQuantity: 10, category: 'Home Care', description: 'Tratamento intensivo para manutenção em casa' },
  { id: 'prd-bs-2', name: 'Óleo Reparador de Pontas Nutritivo', salePrice: 85.0, costPrice: 38.0, stockQuantity: 14, category: 'Finalizadores', description: 'Brilho espelhado e selagem de pontas duplas' },
  { id: 'prd-bs-3', name: 'Leave-in com Proteção Térmica & UV', salePrice: 78.0, costPrice: 34.0, stockQuantity: 12, category: 'Proteção', description: 'Anti-frizz e proteção contra secador e chapinha' },
  { id: 'prd-bs-4', name: 'Kit Shampoo & Condicionador Pós-Química', salePrice: 160.0, costPrice: 75.0, stockQuantity: 8, category: 'Kits', description: 'Limpeza suave sem sulfatos agressivos' },
  { id: 'prd-bs-5', name: 'Sérum Fortalecedor de Unhas & Cutículas', salePrice: 45.0, costPrice: 18.0, stockQuantity: 16, category: 'Unhas', description: 'Complexo de vitaminas para crescimento e resistência' },
];

export function useCatalogStore() {
  const { user } = useAuth();
  const { segment } = useBusinessProfile();
  const tenantKey = user?.id || 'default_tenant';
  const storageSuffix = `${tenantKey}_${segment}`;

  const defaultServices = segment === 'barbershop' ? DEFAULT_BARBERSHOP_SERVICES : DEFAULT_BEAUTY_SALON_SERVICES;
  const defaultProducts = segment === 'barbershop' ? DEFAULT_BARBERSHOP_PRODUCTS : DEFAULT_BEAUTY_SALON_PRODUCTS;

  const [services, setServices] = useState<ServiceItem[]>(() => {
    try {
      // Tenta buscar o catálogo específico do segmento
      const savedSegment = localStorage.getItem(`braga_services_${storageSuffix}`);
      if (savedSegment) return JSON.parse(savedSegment);

      // Fallback para chave antiga se for barbearia
      const savedGeneric = localStorage.getItem(`braga_services_${tenantKey}`);
      if (savedGeneric && segment === 'barbershop') return JSON.parse(savedGeneric);
    } catch {}
    return defaultServices;
  });

  const [products, setProducts] = useState<ProductItem[]>(() => {
    try {
      const savedSegment = localStorage.getItem(`braga_products_${storageSuffix}`);
      if (savedSegment) return JSON.parse(savedSegment);

      const savedGeneric = localStorage.getItem(`braga_products_${tenantKey}`);
      if (savedGeneric && segment === 'barbershop') return JSON.parse(savedGeneric);
    } catch {}
    return defaultProducts;
  });

  // Atualiza catálogo ao alternar de segmento
  useEffect(() => {
    try {
      const savedServices = localStorage.getItem(`braga_services_${storageSuffix}`);
      if (savedServices) {
        setServices(JSON.parse(savedServices));
      } else {
        setServices(defaultServices);
      }

      const savedProducts = localStorage.getItem(`braga_products_${storageSuffix}`);
      if (savedProducts) {
        setProducts(JSON.parse(savedProducts));
      } else {
        setProducts(defaultProducts);
      }
    } catch {}
  }, [segment, storageSuffix]);

  // Sincroniza com localStorage sempre que houver alteração
  useEffect(() => {
    try {
      localStorage.setItem(`braga_services_${storageSuffix}`, JSON.stringify(services));
    } catch {}
  }, [services, storageSuffix]);

  useEffect(() => {
    try {
      localStorage.setItem(`braga_products_${storageSuffix}`, JSON.stringify(products));
    } catch {}
  }, [products, storageSuffix]);

  // Ações de Serviços
  const addService = (data: Omit<ServiceItem, 'id'>) => {
    const newItem: ServiceItem = {
      id: `srv-${uuidv4().substring(0, 8)}`,
      ...data,
    };
    setServices(prev => [newItem, ...prev]);
    return newItem;
  };

  const updateService = (id: string, data: Partial<ServiceItem>) => {
    setServices(prev => prev.map(s => (s.id === id ? { ...s, ...data } : s)));
  };

  const deleteService = (id: string) => {
    setServices(prev => prev.filter(s => s.id !== id));
  };

  // Ações de Produtos
  const addProduct = (data: Omit<ProductItem, 'id'>) => {
    const newItem: ProductItem = {
      id: `prd-${uuidv4().substring(0, 8)}`,
      ...data,
    };
    setProducts(prev => [newItem, ...prev]);
    return newItem;
  };

  const updateProduct = (id: string, data: Partial<ProductItem>) => {
    setProducts(prev => prev.map(p => (p.id === id ? { ...p, ...data } : p)));
  };

  const deleteProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  return {
    services,
    products,
    addService,
    updateService,
    deleteService,
    addProduct,
    updateProduct,
    deleteProduct,
  };
}
