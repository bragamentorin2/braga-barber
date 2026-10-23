import { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export const SUPERADMIN_EMAIL = 'braga.mentoring@gmail.com';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; isAdmin: boolean }>;
  signOut: () => Promise<void>;
  isDevMode: boolean;
}

const LOCAL_DEV_USER: User = {
  id: 'braga-dev-admin-id',
  app_metadata: {},
  user_metadata: { name: 'Administrador Braga Mentoring' },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  email: 'braga.mentoring@gmail.com',
  role: 'authenticated',
};

const LOCAL_DEV_SESSION: Session = {
  access_token: 'local-dev-token-braga',
  refresh_token: 'local-dev-refresh-token',
  expires_in: 86400,
  token_type: 'bearer',
  user: LOCAL_DEV_USER,
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  isAdmin: false,
  signIn: async () => ({ error: null, isAdmin: false }),
  signOut: async () => {},
  isDevMode: !isSupabaseConfigured,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkAdminStatus = async (userSession: Session | null): Promise<boolean> => {
    if (!userSession) {
      return false;
    }
    const userEmail = (userSession.user.email || '').toLowerCase().trim();
    const isElected = userEmail === SUPERADMIN_EMAIL || userEmail === 'admin@bragamentoring.com.br';

    if (!isSupabaseConfigured) {
      return isElected;
    }

    try {
      const { data, error } = await supabase.rpc('rpc_check_is_admin');
      if (!error && typeof data === 'boolean') {
        return data || isElected;
      }
      return isElected;
    } catch {
      return isElected;
    }
  };

  useEffect(() => {
    // Se não estiver conectado a um Supabase oficial, opera em modo local/desenvolvimento seguro
    if (!isSupabaseConfigured) {
      if (import.meta.env.PROD) {
        setSession(null);
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      const savedDevAuth = localStorage.getItem('braga_dev_authenticated');
      if (savedDevAuth !== 'false') {
        setSession(LOCAL_DEV_SESSION);
        setIsAdmin(true);
      } else {
        setSession(null);
        setIsAdmin(false);
      }
      setLoading(false);
      return;
    }

    // Modo conectado ao Supabase
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      const adminVerified = await checkAdminStatus(session);
      setIsAdmin(adminVerified);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session) {
        const adminVerified = await checkAdminStatus(session);
        setIsAdmin(adminVerified);
      } else {
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error: Error | null; isAdmin: boolean }> => {
    const cleanEmail = email.trim().toLowerCase();

    if (!isSupabaseConfigured) {
      if (import.meta.env.PROD) {
        return {
          error: new Error('As variáveis de ambiente do Supabase (VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY) não estão configuradas na Vercel.'),
          isAdmin: false,
        };
      }
      localStorage.setItem('braga_dev_authenticated', 'true');
      const isEleitoAdmin = cleanEmail === SUPERADMIN_EMAIL || cleanEmail === 'admin@bragamentoring.com.br';
      const devSession: Session = {
        ...LOCAL_DEV_SESSION,
        user: { ...LOCAL_DEV_USER, email: cleanEmail || LOCAL_DEV_USER.email },
      };
      setSession(devSession);
      setIsAdmin(isEleitoAdmin);
      return { error: null, isAdmin: isEleitoAdmin };
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
    if (error || !data.session) {
      return { error: error || new Error('Sessão inválida'), isAdmin: false };
    }

    setSession(data.session);
    const adminVerified = await checkAdminStatus(data.session);
    setIsAdmin(adminVerified);
    return { error: null, isAdmin: adminVerified };
  };

  const signOut = async () => {
    if (!isSupabaseConfigured) {
      localStorage.setItem('braga_dev_authenticated', 'false');
      setSession(null);
      setIsAdmin(false);
      return;
    }
    await supabase.auth.signOut();
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        isAdmin,
        signIn,
        signOut,
        isDevMode: !isSupabaseConfigured,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
