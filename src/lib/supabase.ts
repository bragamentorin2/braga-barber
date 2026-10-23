import { createClient } from '@supabase/supabase-js';

const rawUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

// Verifica se o Supabase está de fato configurado com credenciais válidas do projeto Braga Mentoring
export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== '' &&
  supabaseAnonKey !== '' &&
  !supabaseUrl.includes('placeholder')
);

// Se não houver credenciais definidas no .env.local, usamos valores neutros/locais
// para garantir que NENHUMA requisição chegue a locais indevidos
export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://dummy-braga-mentoring.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey : 'dummy-key'
);

// Cria um cliente isolado sem persistência de sessão no localStorage
// Essencial para o SuperAdmin cadastrar ou provisionar novos clientes sem deslogar sua própria conta
export const createIsolatedClient = () => {
  return createClient(
    isSupabaseConfigured ? supabaseUrl : 'https://dummy-braga-mentoring.supabase.co',
    isSupabaseConfigured ? supabaseAnonKey : 'dummy-key',
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );
};
