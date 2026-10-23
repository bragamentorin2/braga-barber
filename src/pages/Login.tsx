import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { toast } from 'sonner';
import { Loader2, Mail, Lock, Eye, EyeOff, Shield, BarChart3, Zap, ArrowRight, MessageSquare, KeyRound, CheckCircle2 } from 'lucide-react';

const formSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
  remember: z.boolean().default(false).optional(),
});

export function Login() {
  const navigate = useNavigate();
  const { signIn, session, isAdmin, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Modal de Recuperação de Senha (E-mail automático Supabase)
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false);

  const handleForgotViaEmail = async () => {
    if (!forgotEmail.trim()) {
      toast.error('Informe seu e-mail para receber o link de recuperação.');
      return;
    }
    setIsSendingResetEmail(true);
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim().toLowerCase(), {
          redirectTo: `${window.location.origin}/login`,
        });
        if (error) throw error;
      }
      toast.success('Se o e-mail estiver cadastrado, as instruções foram enviadas para sua caixa de entrada.');
      setForgotModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar link de recuperação.');
    } finally {
      setIsSendingResetEmail(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Redireciona se já estiver autenticado
  useEffect(() => {
    if (!loading && session) {
      if (isAdmin) {
        navigate('/superadmin', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [loading, session, isAdmin, navigate]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '', password: '', remember: false },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setError(null);
    const { error, isAdmin: userIsAdmin } = await signIn(values.email, values.password);
    if (error) {
      setError('E-mail ou senha incorretos. Tente novamente.');
      setIsLoading(false);
    } else {
      if (userIsAdmin) {
        navigate('/superadmin', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }

  return (
    <div 
      className="min-h-screen lg:h-screen lg:overflow-hidden w-full flex flex-col items-center justify-center relative font-sans"
      style={{ backgroundColor: '#04080C', fontFamily: "'Inter', sans-serif" }}
    >
      {/* BACKGROUND PREMIUM */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Radial Gradient Base */}
        <div 
          className="absolute inset-0" 
          style={{ 
            background: 'radial-gradient(circle at 10% 90%, rgba(6,32,40,0.4) 0%, transparent 60%), radial-gradient(circle at 90% 10%, rgba(243,154,31,0.08) 0%, transparent 50%), #04080C' 
          }} 
        />
        
        {/* Noise Texture */}
        <div 
          className="absolute inset-0 opacity-[0.02] mix-blend-overlay" 
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }} 
        />
        
        {/* Glow Breathing */}
        <div className="absolute inset-0 animate-breathe opacity-[0.85]">
           <div className="absolute top-1/4 right-[15%] w-[40vw] h-[40vw] rounded-full blur-[140px] opacity-[0.12] bg-[#16E0C4] mix-blend-screen" />
           <div className="absolute bottom-1/4 left-[15%] w-[40vw] h-[40vw] rounded-full blur-[140px] opacity-[0.08] bg-[#F39A1F] mix-blend-screen" />
        </div>

        {/* Vignette */}
        <div className="absolute inset-0 pointer-events-none opacity-30" style={{ boxShadow: 'inset 0 0 200px rgba(0,0,0,1)' }} />
        
        {/* ESCULTURA 3D DA LOGO — wrapper estático (PNG transparente) */}
        <div 
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] md:w-[460px] lg:w-[560px] xl:w-[680px] aspect-square z-0 pointer-events-none opacity-60 lg:opacity-90"
        >
          {/* div interno — só a animação */}
          <div 
            className="w-full h-full animate-float-simple"
            style={{
              backgroundImage: 'url(/logo-3d-bg-transparent.png)',
              backgroundSize: 'contain',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes breathe {
          0% { opacity: 0.8; }
          50% { opacity: 1; }
          100% { opacity: 0.8; }
        }
        @keyframes float {
          0% { transform: translateY(-50%) translateY(4px); }
          50% { transform: translateY(-50%) translateY(-4px); }
          100% { transform: translateY(-50%) translateY(4px); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes float-simple {
          0%   { transform: translateY(4px);  }
          50%  { transform: translateY(-4px); }
          100% { transform: translateY(4px);  }
        }
        .animate-float-simple {
          animation: float-simple 8s ease-in-out infinite;
        }
        .animate-slide-left { animation: slideInLeft 600ms cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-slide-right { animation: slideInRight 600ms cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        
        .glass-card {
          background: rgba(10, 20, 30, 0.28);
          backdrop-filter: blur(24px) saturate(160%);
          -webkit-backdrop-filter: blur(24px) saturate(160%);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-top: 1px solid rgba(255, 255, 255, 0.16);
          box-shadow:
            0 24px 64px rgba(0, 0, 0, 0.55),
            inset 0 1px 0 rgba(255, 255, 255, 0.10),
            inset 0 -1px 0 rgba(22, 224, 196, 0.06);
        }
        .input-glass {
          background: rgba(255,255,255,0.03);
          border: 1px solid transparent;
          transition: all 220ms ease;
        }
        .input-glass:focus-within {
          border-color: #16E0C4;
          box-shadow: 0 0 6px rgba(22,224,196,0.25);
        }
        .btn-gradient {
          background: linear-gradient(90deg, #13D8BF 0%, #22E7C8 100%);
          transition: all 180ms ease;
        }
        .btn-gradient:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(22,224,196,0.3);
          filter: brightness(1.05);
        }
        .btn-gradient:active {
          transform: translateY(0);
        }
      `}</style>

      {/* Main Content Container */}
      <div className={`w-full max-w-[1440px] px-6 py-8 xl:py-0 lg:px-[48px] min-h-screen xl:h-screen grid grid-cols-1 xl:grid-cols-[52%_48%] gap-8 xl:gap-[40px] items-center justify-items-center xl:justify-items-start relative z-10 opacity-0 ${isMounted ? 'opacity-100' : ''} transition-opacity duration-700`}>
        
        {/* Left Column - Branding — OCULTO em mobile/tablet */}
        <div className="hidden xl:flex flex-col items-start text-left animate-slide-left w-full order-1">
          <div className="mb-4 lg:mb-6 flex flex-col items-center lg:items-start">
            <img src="/logo-completo.png" alt="Braga Mentoring" className="h-14 lg:h-16 w-auto object-contain mb-2" />
            <p className="text-[#16E0C4] text-[10px] lg:text-[11px] m-0 tracking-[0.35em] uppercase font-semibold">
              Gestão Financeira & Consultoria
            </p>
          </div>

          <h2 className="text-[26px] lg:text-[36px] xl:text-[40px] leading-[1.1] text-[#F5F7FA] mb-3 lg:mb-5" style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800 }}>
            Mais que números,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFFFFF] to-[#17E5C7]">é o seu crescimento.</span>
          </h2>
          
          <p className="text-[#A7B3C2] text-[16px] lg:text-[18px] xl:text-[20px] mb-6 lg:mb-8 max-w-[480px] leading-relaxed mx-auto lg:mx-0 font-light">
            Soluções financeiras inteligentes para uma gestão mais eficiente, segura e preparada para o crescimento do seu negócio.
          </p>

          <div className="w-full h-[1px] bg-white opacity-[0.08] mb-6 hidden lg:block max-w-[480px]" />

          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 items-center lg:items-start">
            <div className="flex flex-row lg:flex-col items-center lg:items-start text-left gap-3 lg:gap-2 w-full lg:w-auto">
              <div className="w-10 h-10 lg:w-9 lg:h-9 shrink-0 rounded-xl bg-[rgba(22,224,196,0.1)] flex items-center justify-center border border-[rgba(22,224,196,0.15)]">
                <Shield className="w-4 h-4 text-[#16E0C4]" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-[#F5F7FA] text-[14px] xl:text-[16px] font-medium mb-0.5">Segurança</h3>
                <p className="text-[#A7B3C2] text-[12px] xl:text-[14px] leading-tight">Proteção dos seus dados</p>
              </div>
            </div>
            
            <div className="hidden lg:block w-[1px] h-12 bg-white opacity-10" />
            
            <div className="flex flex-row lg:flex-col items-center lg:items-start text-left gap-3 lg:gap-2 w-full lg:w-auto">
              <div className="w-10 h-10 lg:w-9 lg:h-9 shrink-0 rounded-xl bg-[rgba(22,224,196,0.1)] flex items-center justify-center border border-[rgba(22,224,196,0.15)]">
                <BarChart3 className="w-4 h-4 text-[#16E0C4]" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-[#F5F7FA] text-[14px] xl:text-[16px] font-medium mb-0.5">Controle</h3>
                <p className="text-[#A7B3C2] text-[12px] xl:text-[14px] leading-tight">Gestão inteligente</p>
              </div>
            </div>

            <div className="hidden lg:block w-[1px] h-12 bg-white opacity-10" />

            <div className="flex flex-row lg:flex-col items-center lg:items-start text-left gap-3 lg:gap-2 w-full lg:w-auto">
              <div className="w-10 h-10 lg:w-9 lg:h-9 shrink-0 rounded-xl bg-[rgba(22,224,196,0.1)] flex items-center justify-center border border-[rgba(22,224,196,0.15)]">
                <Zap className="w-4 h-4 text-[#16E0C4]" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-[#F5F7FA] text-[14px] xl:text-[16px] font-medium mb-0.5">Agilidade</h3>
                <p className="text-[#A7B3C2] text-[12px] xl:text-[14px] leading-tight">Mais produtividade</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Login Form */}
        <div className="flex justify-center w-full animate-slide-right order-2 relative z-10 xl:justify-end">
          <div 
            className="w-full max-w-[360px] md:max-w-[420px] lg:max-w-[440px] xl:max-w-[440px] rounded-[20px] xl:rounded-[24px] p-6 lg:p-8 shadow-2xl"
            style={{
              background: 'rgba(10, 20, 30, 0.25)',
              backdropFilter: 'blur(24px) saturate(160%)',
              WebkitBackdropFilter: 'blur(24px) saturate(160%)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderTop: '1px solid rgba(255,255,255,0.18)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -1px 0 rgba(22,224,196,0.06)',
            }}
          >

            {/* Logo completa no mobile/tablet */}
            <div className="flex flex-col items-center mb-6 xl:hidden">
              <img src="/logo-completo.png" alt="Braga Mentoring" className="h-10 w-auto object-contain mb-1.5" />
              <span className="text-[#16E0C4] text-[9px] tracking-[0.35em] uppercase font-semibold">Gestão Financeira</span>
            </div>
            
            <div className="flex flex-col items-center mb-5 text-center">
              <h2 className="text-[28px] lg:text-[32px] text-[#F5F7FA] mb-1.5 leading-tight" style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700 }}>
                Bem-vindo!
              </h2>
              <p className="text-[#A7B3C2] text-[13px] md:text-[14px]">
                Faça login para acessar sua conta.
              </p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative group input-glass rounded-[12px]">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <Mail className="h-4 w-4 text-[#A7B3C2] group-focus-within:text-[#16E0C4] transition-colors" strokeWidth={1.5} />
                          </div>
                          <Input
                            type="email"
                            placeholder="seu@email.com"
                            autoComplete="email"
                            className="pl-10 h-[44px] bg-transparent border-none text-[14px] text-[#F5F7FA] placeholder:text-[#A7B3C2] focus-visible:ring-0 shadow-none"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-red-400 text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative group input-glass rounded-[12px]">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <Lock className="h-4 w-4 text-[#A7B3C2] group-focus-within:text-[#16E0C4] transition-colors" strokeWidth={1.5} />
                          </div>
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            autoComplete="current-password"
                            className="pl-10 pr-10 h-[44px] bg-transparent border-none text-[14px] text-[#F5F7FA] placeholder:text-[#A7B3C2] focus-visible:ring-0 shadow-none"
                            {...field}
                          />
                          <button 
                            type="button" 
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#A7B3C2] hover:text-[#16E0C4] transition-colors"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" strokeWidth={1.5} /> : <Eye className="h-4 w-4" strokeWidth={1.5} />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage className="text-red-400 text-xs" />
                    </FormItem>
                  )}
                />

                <div className="flex items-center justify-between pt-1 pb-3 xl:pb-4">
                  <FormField
                    control={form.control}
                    name="remember"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2 xl:space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox 
                            checked={field.value} 
                            onCheckedChange={field.onChange} 
                            className="border-[rgba(255,255,255,0.2)] data-[state=checked]:bg-[#16E0C4] data-[state=checked]:border-[#16E0C4] data-[state=checked]:text-[#04080C] rounded w-4 h-4 xl:w-5 xl:h-5 transition-colors"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <label className="text-[13px] md:text-[14px] font-medium text-[#A7B3C2] cursor-pointer" htmlFor="remember">
                            Lembrar-me
                          </label>
                        </div>
                      </FormItem>
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(form.getValues('email') || '');
                      setForgotModalOpen(true);
                    }}
                    className="text-[13px] md:text-[14px] font-medium text-[#16E0C4] hover:text-[#1EF2D7] hover:underline hover:drop-shadow-[0_0_8px_rgba(22,224,196,0.5)] transition-all bg-transparent border-none p-0 cursor-pointer"
                  >
                    Esqueceu sua senha?
                  </button>
                </div>

                {error && (
                  <div className="text-[13px] md:text-[14px] text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
                    {error}
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full h-[48px] rounded-[12px] btn-gradient text-[#04080C] text-[15px] font-bold flex items-center justify-center cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      Entrar <ArrowRight className="ml-2 w-5 h-5" strokeWidth={2.5} />
                    </>
                  )}
                </button>
              </form>
            </Form>

            <div className="mt-6 xl:mt-8 pt-4 xl:pt-5 border-t border-white/[0.08] flex items-center justify-center gap-2 text-[12px] md:text-[13px] text-[#A7B3C2]">
              <Shield className="w-4 h-4 text-[#16E0C4]" strokeWidth={1.5} />
              Acesso seguro Braga Mentoring.
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DE RECUPERAÇÃO DE ACESSO */}
      <Dialog open={forgotModalOpen} onOpenChange={setForgotModalOpen}>
        <DialogContent className="sm:max-w-md bg-[#080E16]/95 border-primary/30 backdrop-blur-2xl text-[#F5F7FA] shadow-2xl shadow-black/95 p-0 overflow-hidden rounded-2xl">
          <div className="p-6 border-b border-white/10 bg-gradient-to-b from-primary/10 to-transparent">
            <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-[#16E0C4] mb-3 shadow-lg shadow-primary/20">
              <KeyRound className="w-6 h-6" />
            </div>
            <DialogTitle className="text-xl font-bold text-[#F5F7FA]">
              Recuperar Acesso à Plataforma
            </DialogTitle>
            <DialogDescription className="text-xs text-[#A7B3C2] mt-1.5 leading-relaxed">
              Digite seu e-mail cadastrado na plataforma para receber o link seguro de redefinição de senha.
            </DialogDescription>
          </div>

          <div className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="forgotEmailInput" className="text-xs font-semibold text-[#A7B3C2]">
                Seu E-mail Cadastrado na Plataforma
              </label>
              <div className="relative">
                <Input
                  id="forgotEmailInput"
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="cliente@barbearia.com.br"
                  className="bg-white/[0.04] border-white/10 text-sm text-[#F5F7FA] placeholder:text-muted-foreground focus:border-[#16E0C4]"
                />
              </div>
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={handleForgotViaEmail}
                disabled={isSendingResetEmail}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-4 rounded-xl shadow-lg shadow-primary/25 flex items-center justify-center gap-2.5 text-sm transition-all cursor-pointer disabled:opacity-50"
              >
                <Mail className="w-4 h-4" />
                {isSendingResetEmail ? 'Enviando link...' : 'Enviar Link de Recuperação'}
              </button>

              <button
                type="button"
                onClick={() => setForgotModalOpen(false)}
                className="w-full text-center text-xs text-[#A7B3C2] hover:text-[#F5F7FA] pt-2 transition-colors cursor-pointer"
              >
                Voltar para o login
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
