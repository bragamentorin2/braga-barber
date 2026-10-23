import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ShieldX, ArrowLeft, LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AdminRoute() {
  const { session, isAdmin, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#04080C] text-foreground">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground font-medium">Validando credenciais administrativas...</p>
        </div>
      </div>
    );
  }

  // 1. Não autenticado -> login
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // 2. Autenticado com e-mail que NÃO é Super-Admin -> Bloqueio absoluto
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#04080C] flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-2xl border border-destructive/40 bg-card/90 backdrop-blur text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto border border-destructive/20">
            <ShieldX className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">
              Acesso Restrito ao Consultor
            </h2>
            <p className="text-sm text-muted-foreground">
              O usuário atual <span className="text-foreground font-semibold">({session.user.email})</span> não possui autoridade de Super-Admin para acessar a gestão administrativa.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-background/60 border border-border text-xs text-left text-muted-foreground space-y-1.5">
            <p className="font-semibold text-foreground">Segurança da Plataforma:</p>
            <p>
              O ambiente administrativo é de uso estrito do consultor executivo da Braga Mentoring. Tentativas de acesso não autorizado são registradas.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <a
              href="/"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-sm transition-colors shadow-lg"
            >
              <ArrowLeft className="w-4 h-4" />
              Ir para o Painel do Meu Negócio
            </a>

            <Button
              variant="outline"
              onClick={() => signOut()}
              className="w-full flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <LogOut className="w-4 h-4" />
              Sair da Conta
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Super-Admin autenticado
  return <Outlet />;
}
