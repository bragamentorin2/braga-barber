import { useState } from 'react';
import { ChevronLeft, ChevronRight, Menu } from 'lucide-react';
import { useMonth } from '@/contexts/MonthContext';
import { useLocation } from 'react-router-dom';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { SidebarContent } from './Sidebar';
import { ReleaseNotesDropdown } from './ReleaseNotesDropdown';
import { Eye, EyeOff } from 'lucide-react';
import { usePrivacyStore } from '@/store/usePrivacyStore';

import { useBusinessProfile } from '@/contexts/BusinessProfileContext';
import { ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Header({ title, actions }: { title?: string, actions?: React.ReactNode }) {
  const { monthLabel, goToPrevMonth, goToNextMonth, isAtMinMonth } = useMonth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const { showValues, toggleValues } = usePrivacyStore();
  const { isSuperAdmin } = useBusinessProfile();

  const showMonthSelector = ['/', '/financial', '/carteira'].includes(location.pathname);
  const showPrivacyToggle = ['/', '/financial', '/carteira'].includes(location.pathname);

  const routeTitles: Record<string, string> = {
    '/': 'Visão geral',
    '/financial': 'Financeiro',
    '/settings': 'Definições',
    '/carteira': 'Carteira Pessoal',
    '/superadmin': 'Painel SuperAdmin',
  };

  const displayTitle = title || routeTitles[location.pathname] || 'Visão geral';

  const shortMonthLabel = (() => {
    const parts = monthLabel.split(' de ');
    if (parts.length === 2) {
      const monthMap: Record<string, string> = {
        janeiro: 'Jan', fevereiro: 'Fev', marco: 'Mar', março: 'Mar',
        abril: 'Abr', maio: 'Mai', junho: 'Jun', julho: 'Jul',
        agosto: 'Ago', setembro: 'Set', outubro: 'Out', novembro: 'Nov', dezembro: 'Dez'
      };
      const key = parts[0].toLowerCase();
      const shortM = monthMap[key] || parts[0].slice(0, 3);
      return `${shortM}/${parts[1].slice(2)}`;
    }
    return monthLabel.replace(' de ', '/');
  })();

  const renderTitle = (titleText: string) => {
    const parts = titleText.split(' ');
    if (parts.length > 1) {
      const first = parts[0];
      const rest = parts.slice(1).join(' ');
      return (
        <div className="flex flex-col md:flex-row md:items-baseline md:gap-1.5 leading-tight md:leading-normal truncate min-w-0 max-w-[130px] sm:max-w-none">
          <span className="text-sm sm:text-[15px] md:text-xl font-semibold text-foreground truncate">{first}</span>
          <span className="text-[10px] sm:text-[12px] md:text-xl md:font-semibold text-primary md:text-foreground truncate">{rest}</span>
        </div>
      );
    }
    return <h1 className="text-sm sm:text-[15px] md:text-xl font-semibold truncate leading-tight min-w-0 max-w-[130px] sm:max-w-none">{titleText}</h1>;
  };

  return (
    <header className="h-16 border-b border-border bg-background flex items-center justify-between px-2.5 sm:px-4 md:px-6 sticky top-0 z-10 gap-1.5 sm:gap-2 relative overflow-hidden">
      <div className="relative z-10 flex items-center gap-1.5 sm:gap-2 md:gap-4 min-w-0">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <button className="md:hidden p-1 text-muted-foreground hover:text-foreground shrink-0" aria-label="Abrir Menu">
              <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 flex flex-col w-64 bg-card border-r-0">
            <SidebarContent onNavigate={() => setIsOpen(false)} />
          </SheetContent>
        </Sheet>
        {renderTitle(displayTitle)}
      </div>
      <div className="relative z-10 flex items-center gap-1 sm:gap-2 md:gap-4 shrink-0">
        {isSuperAdmin && location.pathname !== '/superadmin' && (
          <Link
            to="/superadmin"
            className="p-1 md:p-2 rounded transition-colors flex items-center gap-1.5 text-xs font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20"
            title="Acessar Gestão de Clientes (SuperAdmin)"
          >
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span className="hidden sm:inline text-xs">Painel SuperAdmin</span>
          </Link>
        )}

        {showPrivacyToggle && (
          <button
            onClick={toggleValues}
            className="p-1 sm:p-1.5 md:p-2 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
            title={showValues ? 'Ocultar valores' : 'Mostrar valores'}
          >
            {showValues ? <Eye className="w-4 h-4 sm:w-5 sm:h-5" /> : <EyeOff className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground/60" />}
          </button>
        )}
        <ReleaseNotesDropdown />
        {actions}
        {showMonthSelector && (
          <div className="flex items-center gap-0.5 sm:gap-1 md:gap-2 bg-card rounded-md border border-border p-0.5 sm:p-1">
            <button
              onClick={goToPrevMonth}
              disabled={isAtMinMonth}
              className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title={isAtMinMonth ? 'Setembro 2026 é o início do sistema' : 'Mês anterior'}
            >
              <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <span className="text-[11px] sm:text-xs md:text-sm font-medium px-1 sm:px-2 text-center whitespace-nowrap select-none">
              <span className="sm:hidden">{shortMonthLabel}</span>
              <span className="hidden sm:inline">{monthLabel.replace(' de ', '/')}</span>
            </span>
            <button
              onClick={goToNextMonth}
              className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
              title="Próximo mês"
            >
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
