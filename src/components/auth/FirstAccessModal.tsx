import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { toast } from 'sonner';
import { KeyRound, ShieldCheck, Eye, EyeOff, Lock, CheckCircle2 } from 'lucide-react';

interface FirstAccessModalProps {
  open: boolean;
  onSuccess: () => void;
  userEmail?: string;
  userName?: string;
}

export function FirstAccessModal({ open, onSuccess, userEmail, userName }: FirstAccessModalProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error('A senha definitiva deve conter pelo menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('A confirmação da senha não coincide com a nova senha.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.auth.updateUser({
          password: newPassword,
          data: {
            must_change_password: false,
            password_changed_at: new Date().toISOString(),
          },
        });

        if (error) {
          throw error;
        }

        // Atualiza status no banco para 'changed' e limpa temporary_password
        try {
          await supabase.rpc('rpc_client_confirm_first_access_password', {
            p_new_password: newPassword,
          });
        } catch {
          // Silencioso se RPC não estiver disponível
        }
      }

      toast.success('Senha definitiva cadastrada com sucesso! Bem-vindo(a) à plataforma.');
      onSuccess();
    } catch (err: any) {
      console.error('Erro ao redefinir senha no primeiro acesso:', err);
      toast.error(err.message || 'Não foi possível cadastrar a senha. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-md bg-[#080E16]/95 border-primary/30 backdrop-blur-2xl text-foreground shadow-2xl shadow-black/90 p-0 overflow-hidden rounded-2xl"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="p-6 border-b border-white/10 bg-gradient-to-b from-primary/10 to-transparent">
          <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary mb-3 shadow-lg shadow-primary/20">
            <KeyRound className="w-6 h-6" />
          </div>
          <DialogTitle className="text-xl font-bold text-foreground">
            Primeiro Acesso — Senha Definitiva
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
            Olá{userName ? `, ${userName}` : ''}! Você fez login com uma senha provisória da consultoria. Por segurança, cadastre sua senha pessoal definitiva para continuar.
          </DialogDescription>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 rounded-xl bg-background/50 border border-white/5 flex items-center gap-3 text-xs text-muted-foreground">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="font-semibold text-foreground">Acesso Pessoal & Seguro</p>
              <p>Esta senha substituirá a provisória e só você terá acesso.</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="firstAccessPassword" className="text-xs font-semibold text-muted-foreground">
              Nova Senha Definitiva *
            </Label>
            <div className="relative">
              <Input
                id="firstAccessPassword"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
                className="bg-background/80 border-white/10 pr-10 focus:border-primary"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="firstAccessConfirmPassword" className="text-xs font-semibold text-muted-foreground">
              Confirmar Nova Senha *
            </Label>
            <Input
              id="firstAccessConfirmPassword"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Digite novamente a mesma senha"
              required
              className="bg-background/80 border-white/10 focus:border-primary"
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={isSubmitting || !newPassword || !confirmPassword}
              className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-semibold py-2.5 rounded-xl shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                'Salvando senha...'
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Salvar Senha e Acessar Plataforma
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
