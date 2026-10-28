import { useState, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessProfile } from '@/contexts/BusinessProfileContext';
import { Lock, ShieldAlert, LogOut, MessageSquare, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FirstAccessModal } from '@/components/auth/FirstAccessModal';

export function ProtectedRoute() {
  const { session, loading, isAdmin, signOut } = useAuth();
  const { 
    loadingEstablishments, 
    isClientRegistered, 
    isAccountSuspended, 
    currentClientEstablishment 
  } = useBusinessProfile();

  const [requireFirstAccessChange, setRequireFirstAccessChange] = useState(false);

  useEffect(() => {
    if (session?.user?.user_metadata?.must_change_password) {
      setRequireFirstAccessChange(true);
    }
  }, [session]);

  if (loading || loadingEstablishments) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#04080C] text-foreground">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground font-medium">Carregando ambiente Braga Mentoring...</p>
        </div>
      </div>
    );
  }

  // 1. Não autenticado -> login
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // 2. Se for Super-Admin acessando rota de cliente -> redireciona para seu painel exclusivo
  if (isAdmin) {
    return <Navigate to="/superadmin" replace />;
  }

  // 3. Usuário autenticado, mas NÃO cadastrado no painel admin pelo consultor
  if (!isClientRegistered) {
    return (
      <div className="min-h-screen bg-[#04080C] flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-2xl border border-border bg-card/80 backdrop-blur text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">
              Cadastro Pendente de Liberação
            </h2>
            <p className="text-sm text-muted-foreground">
              Seu usuário <span className="text-foreground font-semibold">({session.user.email})</span> foi autenticado com sucesso, porém o seu estabelecimento ainda não foi cadastrado pelo consultor no painel da mentoria.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-background/60 border border-border text-xs text-left text-muted-foreground space-y-2">
            <p className="font-medium text-foreground">O que fazer agora?</p>
            <p>
              Entre em contato direto com o consultor <strong>Jefferson Braga</strong> para cadastrar sua barbearia ou salão e ativar seu acesso à plataforma financeira.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <a
              href={`https://wa.me/5511999999999?text=${encodeURIComponent(
                `Olá Jefferson! Fiz login na plataforma com o e-mail ${session.user.email}, você pode liberar o cadastro do meu estabelecimento?`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-colors shadow-lg shadow-emerald-950/40"
            >
              <MessageSquare className="w-4 h-4" />
              Solicitar Liberação no WhatsApp
            </a>

            <Button
              variant="outline"
              onClick={() => signOut()}
              className="w-full flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <LogOut className="w-4 h-4" />
              Sair / Trocar de Conta
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 4. Usuário cadastrado, porém com licença suspensa / inativa
  if (isAccountSuspended) {
    return (
      <div className="min-h-screen bg-[#04080C] flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-2xl border border-destructive/30 bg-card/80 backdrop-blur text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto border border-destructive/20">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">
              Acesso Temporariamente Suspenso
            </h2>
            <p className="text-sm text-muted-foreground">
              A licença do estabelecimento <strong>{currentClientEstablishment?.name}</strong> está pausada ou aguardando renovação com a consultoria Braga Mentoring.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-background/60 border border-border text-xs text-left text-muted-foreground space-y-2">
            <p className="font-medium text-foreground">Como regularizar seu acesso:</p>
            <p>
              Entre em contato com <strong>Jefferson Braga</strong> para desbloqueio imediato do seu painel e continuidade da gestão financeira.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <a
              href={`https://wa.me/5511999999999?text=${encodeURIComponent(
                `Olá Jefferson! O acesso da minha empresa (${currentClientEstablishment?.name}) está pausado na plataforma. Gostaria de regularizar.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-sm transition-colors shadow-lg"
            >
              <MessageSquare className="w-4 h-4" />
              Falar com o Consultor
            </a>

            <Button
              variant="outline"
              onClick={() => signOut()}
              className="w-full flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <LogOut className="w-4 h-4" />
              Sair / Trocar de Conta
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 5. Cliente com acesso liberado e ativo
  return (
    <>
      <FirstAccessModal
        open={requireFirstAccessChange}
        onSuccess={() => setRequireFirstAccessChange(false)}
        userEmail={session?.user?.email}
        userName={session?.user?.user_metadata?.name || currentClientEstablishment?.ownerName}
      />
      <Outlet />
    </>
  );
}
