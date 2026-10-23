import { AppLayout } from '@/components/layout/AppLayout';
import { useSearchParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { ProfileTab } from '@/components/settings/ProfileTab';
import { ExpenseCategoriesTab } from '@/components/settings/ExpenseCategoriesTab';
import { CatalogTab } from '@/components/settings/CatalogTab';
import { PersonalWalletTab } from '@/components/settings/PersonalWalletTab';
import { CompanyProvisionsTab } from '@/components/settings/CompanyProvisionsTab';
import { ChevronRight } from 'lucide-react';
import { DbSyncBadge } from '@/components/layout/DbSyncBadge';
import { cn } from '@/lib/utils';

const TAB_LABELS: Record<string, string> = {
  profile: 'Perfil & Conta',
  catalog: 'Catálogo de Serviços & Produtos',
  categories: 'Categorias de Despesas',
  provisions: 'Provisões de Despesas (PJ)',
  wallet: 'Carteira Pessoal',
};

export function Settings() {
  const [searchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'profile';
  const currentLabel = TAB_LABELS[currentTab] || 'Definições';
  const isCatalog = currentTab === 'catalog';

  const renderContent = () => {
    switch (currentTab) {
      case 'profile':        return <ProfileTab />;
      case 'catalog':        return <CatalogTab />;
      case 'categories':     return <ExpenseCategoriesTab />;
      case 'provisions':     return <CompanyProvisionsTab />;
      case 'wallet':         return <PersonalWalletTab />;
      default:               return <ProfileTab />;
    }
  };

  return (
    <AppLayout actions={<DbSyncBadge />}>
      <div className={cn(
        "max-w-5xl mx-auto",
        isCatalog ? "flex flex-col h-[calc(100vh-104px)]" : "pb-8 space-y-6"
      )}>
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm shrink-0 mb-3">
          <Link
            to="/settings?tab=profile"
            className="text-muted-foreground hover:text-foreground transition-colors font-medium"
          >
            Definições
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
          <span className="text-foreground font-semibold">{currentLabel}</span>
        </nav>

        {/* Conteúdo da aba */}
        <div className={cn("w-full", isCatalog && "flex-1 min-h-0 flex flex-col")}>
          {renderContent()}
        </div>
      </div>
    </AppLayout>
  );
}
