import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { FinanceProvider } from '@/contexts/FinanceContext';
import { MonthProvider } from '@/contexts/MonthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AdminRoute } from '@/components/auth/AdminRoute';
import { Login } from '@/pages/Login';
import { Dashboard } from '@/pages/Dashboard';
import { Clients } from '@/pages/Clients';
import { Financial } from '@/pages/Financial';
import { History } from '@/pages/History';
import { Partners } from '@/pages/Partners';
import { Settings } from '@/pages/Settings';
import { PersonalWallet } from '@/pages/PersonalWallet';
import { Projections } from '@/pages/Projections';
import { Toaster } from 'sonner';
import { PwaPrompt } from '@/components/layout/PwaPrompt';

import { BusinessProfileProvider } from '@/contexts/BusinessProfileContext';
import { SuperAdmin } from '@/pages/SuperAdmin';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BusinessProfileProvider>
          <MonthProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />

              {/* Rota exclusiva do SuperAdmin / Consultor (sem FinanceProvider) */}
              <Route element={<AdminRoute />}>
                <Route path="/superadmin" element={<SuperAdmin />} />
                <Route path="/admin" element={<Navigate to="/superadmin" replace />} />
              </Route>

              {/* Protected routes de clientes - wrapped with FinanceProvider */}
              <Route element={<ProtectedRoute />}>
                <Route element={<FinanceProvider><Outlet /></FinanceProvider>}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/financial" element={<Financial />} />
                  <Route path="/financeiro" element={<Navigate to="/financial" replace />} />
                  <Route path="/projecoes" element={<Projections />} />
                  <Route path="/projections" element={<Navigate to="/projecoes" replace />} />
                  <Route path="/carteira" element={<PersonalWallet />} />
                  <Route path="/settings" element={<Settings />} />
                  {/* Rota de clientes preservada internamente para futura integração de agendamentos */}
                  <Route path="/clients" element={<Clients />} />
                  {/* Redirecionamento de rotas removidas */}
                  <Route path="/history" element={<Navigate to="/" replace />} />
                  <Route path="/partners" element={<Navigate to="/" replace />} />
                </Route>
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </MonthProvider>
        </BusinessProfileProvider>
      </AuthProvider>
      <Toaster richColors position="top-right" />
      <PwaPrompt />
    </BrowserRouter>
  );
}

export default App;
