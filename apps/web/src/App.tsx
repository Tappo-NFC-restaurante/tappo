import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import CustomerMenu from './components/customer/CustomerMenu';
import ChefDashboard from './components/chef/ChefDashboard';
import AdminDashboard from './components/admin/AdminDashboard';
import Login from './components/common/Login';
import TappoLogo from './components/common/TappoLogo';
import { Smartphone, LayoutDashboard, Shield } from 'lucide-react';

const ProtectedChefRoute: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#141212] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-tappo-red border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Login defaultRole="RESTAURANT_OWNER" />;
  }

  return <ChefDashboard />;
};

const ProtectedAdminRoute: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#141212] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-tappo-red border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== 'SUPER_ADMIN') {
    return <Login defaultRole="SUPER_ADMIN" />;
  }

  return <AdminDashboard />;
};

// Hub de Acesso Rápido
const HubLanding: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#141212] text-white flex flex-col items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-[#1C1818] border border-zinc-800 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col gap-6 text-center">
        <div className="flex flex-col items-center">
          <TappoLogo size="xl" variant="red" />
          <h1 className="text-xl font-black text-white mt-3 font-display">
            Cardápio Digital & Autoatendimento NFC
          </h1>
          <p className="text-xs text-zinc-400 mt-1 max-w-xs">
            Selecione uma das experiências abaixo para navegar:
          </p>
        </div>

        <div className="flex flex-col gap-3 text-left">
          {/* Cardápio do Cliente */}
          <Link
            to="/trattoria-ribeiro/cardapio"
            className="group p-4 rounded-2xl bg-[#141212] border border-zinc-800 hover:border-tappo-red transition flex items-center gap-3.5 active:scale-[0.98]"
          >
            <div className="p-3 rounded-xl bg-tappo-red/10 text-tappo-red">
              <Smartphone size={22} />
            </div>
            <div className="flex flex-col flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-white">1. App do Cliente (Mesa 12)</span>
                <span className="text-[10px] font-bold text-tappo-red bg-rose-500/10 px-2 py-0.5 rounded-full">
                  NFC
                </span>
              </div>
              <span className="text-xs text-zinc-400 mt-0.5">
                Header Vermelho, Destaques Stories, Cardápio e Pedir Conta
              </span>
            </div>
          </Link>

          {/* Painel do Chefe */}
          <Link
            to="/painel"
            className="group p-4 rounded-2xl bg-[#141212] border border-zinc-800 hover:border-tappo-red transition flex items-center gap-3.5 active:scale-[0.98]"
          >
            <div className="p-3 rounded-xl bg-tappo-red text-white">
              <LayoutDashboard size={22} />
            </div>
            <div className="flex flex-col flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-white">2. Salão Agora (Chefe)</span>
                <span className="text-[10px] font-bold text-white bg-tappo-red px-2 py-0.5 rounded-full">
                  Ao Vivo
                </span>
              </div>
              <span className="text-xs text-zinc-400 mt-0.5">
                Mesas livres/ocupadas, pedidos da cozinha e chamados
              </span>
            </div>
          </Link>

          {/* Backoffice Coordenação */}
          <Link
            to="/admin"
            className="group p-4 rounded-2xl bg-[#141212] border border-zinc-800 hover:border-zinc-600 transition flex items-center gap-3.5 active:scale-[0.98]"
          >
            <div className="p-3 rounded-xl bg-white text-zinc-900">
              <Shield size={22} />
            </div>
            <div className="flex flex-col flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-white">3. Restaurantes (Admin)</span>
                <span className="text-[10px] font-bold text-zinc-900 bg-white px-2 py-0.5 rounded-full">
                  Coordenação
                </span>
              </div>
              <span className="text-xs text-zinc-400 mt-0.5">
                Tabela de restaurantes e painel de gravação de tags NFC
              </span>
            </div>
          </Link>
        </div>

        <div className="pt-2 border-t border-zinc-800 text-[11px] text-zinc-500">
          Design System Padronizado · Padrão iFood / Trattoria Ribeiro
        </div>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/:tenantSlug/cardapio" element={<CustomerMenu />} />
            <Route path="/painel" element={<ProtectedChefRoute />} />
            <Route path="/admin" element={<ProtectedAdminRoute />} />
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<HubLanding />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
};

export default App;
