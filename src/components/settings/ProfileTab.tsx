import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { KeyRound, Mail, Scissors, Sparkles, Store, ShieldCheck, UserCheck } from 'lucide-react';
import { useBusinessProfile } from '@/contexts/BusinessProfileContext';

export function ProfileTab() {
  const { user } = useAuth();
  const { segment, setSegment, isSuperAdmin } = useBusinessProfile();
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const handleChangeEmail = async () => {
    if (!newEmail.trim()) { toast.error('Informe o novo email.'); return; }
    setSavingEmail(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    if (error) {
      toast.error('Erro ao alterar email: ' + error.message);
    } else {
      toast.success('Email de confirmação enviado para ' + newEmail + '. Verifique sua caixa de entrada.');
      setNewEmail('');
    }
    setSavingEmail(false);
  };

  const handleChangePassword = async () => {
    if (!newPassword) { toast.error('Informe a nova senha.'); return; }
    if (newPassword.length < 6) { toast.error('A senha deve ter pelo menos 6 caracteres.'); return; }
    if (newPassword !== confirmPassword) { toast.error('As senhas não coincidem.'); return; }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast.error('Erro ao alterar senha: ' + error.message);
    } else {
      toast.success('Senha alterada com sucesso!');
      setNewPassword('');
      setConfirmPassword('');
    }
    setSavingPassword(false);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Banner de Identificação do Perfil */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          <div className="md:col-span-1">
            <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Store className="w-4 h-4 text-primary" />
              Perfil do Estabelecimento
            </h4>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Modalidade operacional e vocabulário contratado para a gestão financeira do seu negócio.
            </p>
          </div>

          <div className="md:col-span-2">
            {isSuperAdmin ? (
              // Visão do SuperAdmin (permite alternar para testes)
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSegment('barbershop');
                      toast.success('Perfil alterado para Barbearia!');
                    }}
                    className={`p-4 rounded-xl border text-left transition-all relative ${
                      segment === 'barbershop'
                        ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500 shadow-sm'
                        : 'border-border bg-muted/20 hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                        <Scissors className="w-5 h-5" />
                      </div>
                      <div>
                        <h5 className="font-semibold text-sm text-foreground">Barbearia</h5>
                        <p className="text-xs text-muted-foreground mt-0.5">Cortes, barba, pomadas, acabamento</p>
                      </div>
                    </div>
                    {segment === 'barbershop' && (
                      <span className="absolute top-3 right-3 text-[10px] bg-blue-500/20 text-blue-400 font-bold px-2 py-0.5 rounded-full border border-blue-500/30">
                        Ativo
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSegment('beauty_salon');
                      toast.success('Perfil alterado para Salão de Beleza!');
                    }}
                    className={`p-4 rounded-xl border text-left transition-all relative ${
                      segment === 'beauty_salon'
                        ? 'border-purple-500 bg-purple-500/10 ring-1 ring-purple-500 shadow-sm'
                        : 'border-border bg-muted/20 hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <h5 className="font-semibold text-sm text-foreground">Salão de Beleza / Studio</h5>
                        <p className="text-xs text-muted-foreground mt-0.5">Procedimentos, mechas, manicure, cosméticos</p>
                      </div>
                    </div>
                    {segment === 'beauty_salon' && (
                      <span className="absolute top-3 right-3 text-[10px] bg-purple-500/20 text-purple-400 font-bold px-2 py-0.5 rounded-full border border-purple-500/30">
                        Ativo
                      </span>
                    )}
                  </button>
                </div>
                <span className="text-[11px] text-primary flex items-center gap-1 font-medium">
                  ⚙️ Modo SuperAdmin: você tem permissão para alternar a modalidade de visualização.
                </span>
              </div>
            ) : (
              // Visão do Cliente Comum (perfil fixo da conta)
              <div className="p-4 rounded-xl border border-border bg-muted/20 flex items-start gap-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                  segment === 'barbershop' ? 'bg-blue-500/15 text-blue-400' : 'bg-purple-500/15 text-purple-400'
                }`}>
                  {segment === 'barbershop' ? <Scissors className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h5 className="font-semibold text-sm text-foreground">
                      {segment === 'barbershop' ? 'Barbearia Clássica & Moderna' : 'Salão de Beleza & Studio Hair'}
                    </h5>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      segment === 'barbershop'
                        ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                        : 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                    }`}>
                      Licença Ativa
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Vocabulário, catálogo e relatórios configurados sob medida para o segmento {segment === 'barbershop' ? 'de barbearia' : 'de salão de beleza e estética'}.
                  </p>
                  <p className="text-[11px] text-muted-foreground/80 pt-1">
                    Para contratação de nova unidade ou alteração de licença, contate a <strong>Braga Mentoring</strong>.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sessão: Endereço de Email */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          <div className="md:col-span-1">
            <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Mail className="w-4 h-4 text-primary" />
              Credenciais da Conta
            </h4>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Email cadastrado atualmente para acesso à plataforma:
            </p>
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/40 border border-border text-xs font-semibold text-foreground">
              <UserCheck className="w-3.5 h-3.5 text-primary" />
              {user?.email || '-'}
            </div>
          </div>

          <div className="md:col-span-2 max-w-md space-y-3">
            <Label htmlFor="new-email" className="text-xs font-semibold">Novo Endereço de Email</Label>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <Input
                id="new-email"
                type="email"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                placeholder="novo@email.com"
                className="flex-1 h-9 text-xs"
              />
              <Button onClick={handleChangeEmail} disabled={savingEmail} variant="secondary" className="h-9 text-xs font-medium">
                {savingEmail ? 'Enviando...' : 'Atualizar Email'}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Um link de confirmação será enviado para o novo endereço para validação de segurança.
            </p>
          </div>
        </div>
      </div>

      {/* Sessão: Segurança e Senha */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          <div className="md:col-span-1">
            <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Segurança & Acesso
            </h4>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Atualize sua senha de acesso periodicamente para manter suas informações e faturamento protegidos.
            </p>
          </div>

          <div className="md:col-span-2 max-w-md space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="new-password" className="text-xs font-semibold">Nova Senha</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Mínimo de 6 caracteres"
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password" className="text-xs font-semibold">Confirmar Nova Senha</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                className="h-9 text-xs"
              />
            </div>
            <div className="pt-1">
              <Button onClick={handleChangePassword} disabled={savingPassword} className="h-9 text-xs font-semibold bg-primary text-primary-foreground">
                {savingPassword ? 'Salvando...' : 'Alterar Senha'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
