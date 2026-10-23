import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useBusinessProfile } from '@/contexts/BusinessProfileContext';
import { Lock, Mail, Phone, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AppLayout({ 
  children, 
  title, 
  actions 
}: { 
  children: React.ReactNode;
  title?: string;
  actions?: React.ReactNode;
}) {
  const { isAccountSuspended, currentClientEstablishment } = useBusinessProfile();

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header title={title} actions={actions} />
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          {isAccountSuspended ? (
            <div className="max-w-2xl mx-auto my-12 p-8 rounded-2xl border border-destructive/30 bg-destructive/5 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
                <Lock className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-xl font-bold text-foreground">
                  Acesso Temporariamente Suspenso
                </h3>
                <p className="text-sm text-muted-foreground">
                  A licença do estabelecimento <strong>{currentClientEstablishment?.name}</strong> está pausada ou aguardando renovação com a consultoria.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-card border border-border text-xs text-left space-y-2 max-w-md mx-auto">
                <p className="font-semibold text-foreground flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-destructive" />
                  Como regularizar o seu acesso:
                </p>
                <p className="text-muted-foreground">
                  Entre em contato com o consultor <strong>Jefferson Braga</strong> para desbloqueio imediato do seu painel e suporte à gestão financeira.
                </p>
                <div className="pt-2 border-t border-border flex flex-col gap-1.5 text-foreground font-mono">
                  <span className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-primary" /> braga.mentoring@gmail.com
                  </span>
                  <span className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" /> WhatsApp da Consultoria
                  </span>
                </div>
              </div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
