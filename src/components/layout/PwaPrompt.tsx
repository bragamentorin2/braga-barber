import React, { useEffect, useState } from 'react';
import { X, Download, Share, PlusSquare, Smartphone, Zap, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Detecta se o dispositivo é exclusivamente um smartphone mobile
 * Computadores, notebooks e tablets retornam FALSE para que o navegador exiba
 * apenas o ícone nativo na barra de endereço (omnibox).
 */
function isMobileSmartphone(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;

  const ua = navigator.userAgent || '';
  
  // Detecção explícita de tablets (iPad, Android tablets sem 'Mobile', etc.)
  const isTabletUA = /iPad|Tablet|PlayBook|Silk/i.test(ua) || (ua.includes('Android') && !ua.includes('Mobile'));
  const isIPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  const isTabletScreen = (window.innerWidth >= 768 && window.innerHeight >= 600) || 
                         (window.innerHeight >= 768 && window.innerWidth >= 600);

  if (isTabletUA || isIPadOS || (isTabletScreen && navigator.maxTouchPoints > 0)) {
    return false; // É tablet, não exibe popup customizado
  }

  // Verifica se é um smartphone (iPhone, Android phone com tela menor que 768px)
  const isMobileUA = /Android.*Mobile|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isSmallScreen = window.innerWidth < 768;

  return isMobileUA || (isSmallScreen && navigator.maxTouchPoints > 0);
}

function isIOS(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return /iPhone|iPod/i.test(navigator.userAgent || '');
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;
}

const STORAGE_KEY = 'braga_pwa_prompt_dismissed_until';

export function PwaPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIPhone, setIsIPhone] = useState(false);

  useEffect(() => {
    // Se já estiver instalado em tela cheia/standalone, não exibe
    if (isStandalone()) return;

    // Se NÃO for smartphone mobile (computador, notebook, tablet), não abre popup!
    if (!isMobileSmartphone()) return;

    // Verifica se usuário dispensou nas últimas 24h
    const dismissedUntil = localStorage.getItem(STORAGE_KEY);
    if (dismissedUntil && Date.now() < Number(dismissedUntil)) {
      return;
    }

    const isIosPhone = isIOS();
    setIsIPhone(isIosPhone);

    // Se for iOS Safari (não emite beforeinstallprompt), exibe o popup com as orientações do iOS
    if (isIosPhone) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 2500);
      return () => clearTimeout(timer);
    }

    // Para navegadores baseados em Chromium no mobile (Android)
    const handler = (e: any) => {
      // Impede a barra padrão inferior do Chrome para exibir o popup customizado
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleDismiss = () => {
    // Cooldown de 24 horas para não incomodar o usuário repetidamente
    const tomorrow = Date.now() + 24 * 60 * 60 * 1000;
    localStorage.setItem(STORAGE_KEY, String(tomorrow));
    setShowPrompt(false);
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('[PWA] Usuário aceitou a instalação.');
    }
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4 flex justify-center pointer-events-none animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="w-full max-w-md bg-[#0a1628]/95 backdrop-blur-md border border-primary/30 rounded-2xl p-4 shadow-2xl pointer-events-auto text-foreground space-y-3">
        {/* Cabeçalho do Card */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-card border border-primary/30 p-1 flex items-center justify-center shrink-0 shadow-md">
              <img src="/pwa-icon-192.png" alt="Braga Mentoring" className="w-full h-full object-contain rounded-lg" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-sm text-foreground truncate">Instalar Braga Mentoring</h3>
                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/30 shrink-0">
                  App Mobile
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                Adicione à sua tela de início para acesso rápido e direto
              </p>
            </div>
          </div>
          <button 
            onClick={handleDismiss}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Benefícios rápidos */}
        <div className="grid grid-cols-3 gap-1.5 py-1 text-center">
          <div className="p-2 rounded-xl bg-muted/30 border border-border/50 flex flex-col items-center gap-1">
            <Zap className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] font-semibold text-foreground leading-tight">1 Toque</span>
            <span className="text-[9px] text-muted-foreground leading-none">Acesso direto</span>
          </div>
          <div className="p-2 rounded-xl bg-muted/30 border border-border/50 flex flex-col items-center gap-1">
            <Smartphone className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-semibold text-foreground leading-tight">Tela Cheia</span>
            <span className="text-[9px] text-muted-foreground leading-none">App nativo</span>
          </div>
          <div className="p-2 rounded-xl bg-muted/30 border border-border/50 flex flex-col items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-sky-400" />
            <span className="text-[10px] font-semibold text-foreground leading-tight">Seguro</span>
            <span className="text-[9px] text-muted-foreground leading-none">Dados protegidos</span>
          </div>
        </div>

        {/* Instruções para iPhone (Safari) ou Botão de Ação Direta para Android */}
        {isIPhone ? (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs space-y-2 text-foreground">
            <p className="font-semibold text-primary flex items-center gap-1.5">
              <Share className="w-3.5 h-3.5" /> Como instalar no iPhone (Safari):
            </p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-[11px] leading-relaxed">
              <li>Toque no ícone de <strong className="text-foreground">Compartilhar</strong> (quadrado com seta ⎋) na barra do Safari.</li>
              <li>Role para baixo e selecione <strong className="text-foreground flex-inline items-center gap-1"><PlusSquare className="inline w-3 h-3 text-primary" /> "Adicionar à Tela de Início"</strong>.</li>
              <li>Toque em <strong className="text-foreground">Adicionar</strong> no canto superior direito.</li>
            </ol>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDismiss}
              className="w-full mt-2 text-xs font-semibold"
            >
              Entendido
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 pt-1">
            <Button 
              variant="outline"
              size="sm"
              onClick={handleDismiss}
              className="w-1/3 text-xs"
            >
              Agora não
            </Button>
            <Button 
              size="sm"
              onClick={handleInstallClick}
              disabled={!deferredPrompt}
              className="w-2/3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md text-xs gap-1.5"
            >
              <Download className="w-4 h-4" />
              Instalar Agora
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
