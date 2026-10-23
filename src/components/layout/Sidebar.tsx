import { LayoutDashboard, Users, CircleDollarSign, History, Settings, LogOut, ChevronRight, ChevronDown, Building2, UserCircle, Tag, Handshake, Wallet, Scissors, Target, ShieldCheck, Sparkles, CalendarClock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessProfile } from '@/contexts/BusinessProfileContext';
import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';

function useWalletActiveStatus(userId?: string) {
  const [isActive, setIsActive] = useState<boolean>(() => {
    if (!userId) return false;
    return localStorage.getItem(`wallet_active_${userId}`) === 'true';
  });

  useEffect(() => {
    if (!userId) return;
    let isMounted = true;

    async function checkStatus() {
      try {
        const { data } = await supabase
          .from('personal_wallet_settings')
          .select('is_active')
          .eq('user_id', userId)
          .limit(1);

        if (!isMounted) return;
        const item = Array.isArray(data) ? data[0] : data;
        if (item && typeof item.is_active === 'boolean') {
          setIsActive(item.is_active);
          localStorage.setItem(`wallet_active_${userId}`, String(item.is_active));
        }
      } catch {
        // Silencioso no Sidebar
      }
    }

    checkStatus();

    return () => { isMounted = false; };
  }, [userId]);

  return isActive;
}

const navItems = [
  { icon: LayoutDashboard, label: 'Painel Geral', path: '/' },
  { icon: CircleDollarSign, label: 'Financeiro', path: '/financial' },
  { icon: Target, label: 'Projeções & Metas', path: '/projecoes' },
];

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { segment, isSuperAdmin } = useBusinessProfile();
  const isWalletActive = useWalletActiveStatus(user?.id);
  const showWalletBadge = !isWalletActive;

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const userInitials = user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : 'US';

  const [isSettingsOpen, setIsSettingsOpen] = useState(location.pathname === '/settings');
  const [searchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'profile';
  const adminTab = searchParams.get('tab') || 'dashboard';

  useEffect(() => {
    if (location.pathname !== '/settings') {
      setIsSettingsOpen(false);
    }
  }, [location.pathname]);

  const settingsSubItems = [
    { id: 'profile', label: 'Perfil & Conta', icon: UserCircle },
    {
      id: 'catalog',
      label: segment === 'barbershop' ? 'Catálogo (Cortes e Produtos)' : 'Catálogo (Procedimentos e Cosméticos)',
      icon: segment === 'barbershop' ? Scissors : Sparkles,
    },
    { id: 'categories', label: 'Categorias de Despesas', icon: Tag },
    { id: 'provisions', label: 'Provisões de Despesas (PJ)', icon: CalendarClock },
    { id: 'wallet', label: 'Carteira Pessoal', icon: Wallet },
  ];

  const adminNavItems = [
    { id: 'dashboard', label: 'Dashboard', path: '/superadmin?tab=dashboard', icon: LayoutDashboard },
    { id: 'clients', label: 'Clientes', path: '/superadmin?tab=clients', icon: Building2 },
    { id: 'audit', label: 'Histórico', path: '/superadmin?tab=audit', icon: History },
  ];

  return (
    <>
      <div className="h-16 flex items-center px-6 border-b border-border shrink-0 gap-3">
        <img src="/logo.png" alt="Braga Mentoring Logo" className="w-8 h-8 rounded-md object-contain" />
        <div className="flex flex-col">
          <span className="text-lg font-semibold tracking-tight leading-none text-white">Braga Mentoring</span>
          <span className="text-[11px] text-primary font-bold mt-1 leading-none">
            {isSuperAdmin
              ? 'Administração & Consultoria'
              : segment === 'barbershop'
              ? 'Gestão • Barbearias'
              : 'Gestão • Salões & Studios'}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-1 px-3">
        {isSuperAdmin ? (
          // Menu Exclusivo do SuperAdmin (sem módulos financeiros de cliente)
          <div className="space-y-1">
            <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
              Painel Administrativo
            </div>
            {adminNavItems.map((item) => {
              const isActive = location.pathname === '/superadmin' && adminTab === item.id;
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/20 text-primary font-semibold border border-primary/30"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ) : (
          // Menu do Cliente (Financeiro, Projeções, Carteira e Definições)
          <>
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.label}
                  to={item.path}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}

            {/* Carteira Pessoal — item destacado */}
            <Link
              to="/carteira"
              onClick={onNavigate}
              className={cn(
                "flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                location.pathname === '/carteira'
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <div className="flex items-center gap-3">
                <Wallet className="w-4 h-4" />
                Carteira Pessoal
              </div>
              {showWalletBadge && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                  Novo
                </span>
              )}
            </Link>

            <button
              onClick={() => {
                setIsSettingsOpen(!isSettingsOpen);
                if (location.pathname !== '/settings') {
                  navigate('/settings?tab=profile');
                  onNavigate?.();
                }
              }}
              className={cn(
                "flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                location.pathname === '/settings' || isSettingsOpen
                  ? "bg-primary/5 text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <div className="flex items-center gap-3">
                <Settings className="w-4 h-4" />
                Definições
              </div>
              {isSettingsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            
            {isSettingsOpen && (
              <div className="flex flex-col gap-1 pl-9 pr-3 py-1">
                {settingsSubItems.map((sub) => {
                  const isSubActive = location.pathname === '/settings' && currentTab === sub.id;
                  return (
                    <Link
                      key={sub.id}
                      to={`/settings?tab=${sub.id}`}
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center gap-2 px-2 py-2 rounded-md text-sm font-medium transition-colors",
                        isSubActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <sub.icon className="w-3.5 h-3.5" />
                      {sub.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      <div className="shrink-0 border-t border-border">
        {/* Badge do Perfil Ativo */}
        <div className="px-4 pt-3 pb-1">
          {isSuperAdmin ? (
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                <span className="font-medium text-foreground">SuperAdmin</span>
              </div>
              <span className="text-[10px] text-primary uppercase font-bold">
                Consultor
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-muted/40 border border-border text-xs">
              <div className="flex items-center gap-2">
                {segment === 'barbershop' ? (
                  <Scissors className="w-3.5 h-3.5 text-blue-400" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                )}
                <span className="font-medium text-foreground">
                  {segment === 'barbershop' ? 'Barbearia' : 'Salão de Beleza'}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                Perfil Ativo
              </span>
            </div>
          )}
        </div>

        <div className="p-4 pt-1">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <span className="text-xs font-semibold text-primary">{userInitials}</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">{user?.email || 'Utilizador'}</p>
              {isSuperAdmin && (
                <p className="text-[11px] text-primary truncate font-medium">
                  Braga Mentoring
                </p>
              )}
            </div>
            <button
              onClick={handleSignOut}
              className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export function Sidebar() {
  return (
    <>
      <div className="hidden md:block w-64 shrink-0" />
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 border-r border-border bg-card flex-col z-30">
        <SidebarContent />
      </aside>
    </>
  );
}
