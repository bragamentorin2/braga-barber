import React, { useEffect, useState } from 'react';
import { X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Retorna true somente em celular/tablet (touch + tela estreita)
function isMobileOrTablet(): boolean {
  const hasTouchScreen = navigator.maxTouchPoints > 0;
  const isNarrowScreen = window.matchMedia('(max-width: 1024px)').matches;
  return hasTouchScreen && isNarrowScreen;
}

export function PwaPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      // Só exibe o popup personalizado em celular/tablet
      // No desktop o botão nativo do navegador já cuida da instalação
      if (!isMobileOrTablet()) return;
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    }
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-[#0a1628] border border-[#16e0c4]/20 rounded-xl p-4 shadow-2xl z-50 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-[#04080C] flex items-center justify-center p-1 border border-white/5">
            <img src="/logo.png" alt="Braga Mentoring" className="w-full h-full object-contain" />
          </div>
          <div>
            <h3 className="text-white font-medium text-sm">Instalar Aplicativo</h3>
            <p className="text-slate-400 text-xs mt-0.5">Acesso rápido e offline na tela inicial</p>
          </div>
        </div>
        <button 
          onClick={() => setShowPrompt(false)}
          className="text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <Button 
        onClick={handleInstallClick}
        className="w-full bg-[#16e0c4] hover:bg-[#16e0c4]/90 text-[#0a1628] font-medium"
      >
        <Download className="w-4 h-4 mr-2" />
        Instalar Braga Mentoring
      </Button>
    </div>
  );
}
