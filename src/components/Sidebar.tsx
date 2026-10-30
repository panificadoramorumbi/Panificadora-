import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  ShieldAlert,
  Wallet,
  Bell,
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
  UserCheck,
  UserX,
  PlusCircle,
  Croissant,
  ClipboardList,
  Sparkles,
  Tag,
  DollarSign,
  TrendingUp,
  UserCog,
  Archive,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserProfile } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

export type AdminView =
  | 'dashboard'
  | 'clients'
  | 'orders'
  | 'retail'
  | 'audit'
  | 'settlement'
  | 'notifications'
  | 'profile'
  | 'settings';

export type ResellerView = 'orders' | 'leftovers' | 'financial' | 'profit' | 'notifications' | 'profile';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  activeView: string;
  setActiveView: (view: string) => void;
  clients: UserProfile[];
  selectedClientId: string | null;
  onSelectClient: (clientId: string) => void;
  onOpenNewClientModal?: () => void;
  onOpenTrash?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  setIsOpen,
  activeView,
  setActiveView,
  clients,
  selectedClientId,
  onSelectClient,
  onOpenNewClientModal,
  onOpenTrash,
}) => {
  const { userProfile, isAdmin, logout } = useAuth();
  const [clientsMenuExpanded, setClientsMenuExpanded] = useState<boolean>(true);

  // Filter only reseller accounts for "Meus Clientes" submenu
  const resellers = clients.filter((c) => c.role === 'revendedor');

  const handleNavClick = (view: string) => {
    setActiveView(view);
    // On small screens, close sidebar when clicking a top nav item
    if (window.innerWidth < 1024 && view !== 'clients') {
      setIsOpen(false);
    }
  };

  const handleClientItemClick = (client: UserProfile) => {
    onSelectClient(client.uid);
    setActiveView('clients');
    if (window.innerWidth < 1024) {
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-stone-950/70 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-red-950 text-stone-100 flex flex-col border-r border-red-900 shadow-2xl transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="p-5 border-b border-red-900/80 bg-red-950 flex items-center justify-between">
          <button
            type="button"
            onClick={() => handleNavClick(isAdmin ? 'dashboard' : 'orders')}
            className="flex items-center gap-3 text-left group cursor-pointer focus:outline-hidden"
            title="Voltar ao início"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-black shadow-lg group-hover:scale-105 transition">
              <Croissant className="w-6 h-6" />
            </div>
            <div>
              <p className="font-black text-sm tracking-wide text-white group-hover:text-amber-200 transition">PANIFICADORA</p>
              <p className="font-extrabold text-base tracking-widest text-amber-400">MORUMBI</p>
            </div>
          </button>
        </div>

        {/* User Card */}
        <div className="px-5 py-4 bg-red-900/40 border-b border-red-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-400 text-stone-950 flex items-center justify-center font-bold text-sm shadow">
              {userProfile?.displayName?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-white truncate">
                {userProfile?.displayName || 'Usuário'}
              </p>
              <p className="text-xs text-amber-300 truncate">{userProfile?.email}</p>
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1 text-sm select-none">
          {isAdmin ? (
            /* ADMIN MENU (8 Itens Conforme Requisito) */
            <>
              {/* 1. Painel Geral */}
              <button
                onClick={() => handleNavClick('dashboard')}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl font-bold transition text-left ${
                  activeView === 'dashboard'
                    ? 'bg-amber-500 text-stone-950 shadow-md'
                    : 'text-stone-200 hover:bg-red-900 hover:text-white'
                }`}
              >
                <LayoutDashboard className="w-5 h-5 shrink-0" />
                <span>1. Painel Geral</span>
              </button>

              {/* 2. Meus Clientes (SUBMENU EXPANSÍVEL OBRIGATÓRIO) */}
              <div>
                <div
                  className={`w-full flex items-center justify-between px-3 py-3 rounded-xl font-bold transition cursor-pointer ${
                    activeView === 'clients' && !selectedClientId
                      ? 'bg-red-800 text-white'
                      : 'text-stone-200 hover:bg-red-900 hover:text-white'
                  }`}
                  onClick={() => {
                    setActiveView('clients');
                    setClientsMenuExpanded(!clientsMenuExpanded);
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 shrink-0 text-amber-400" />
                    <span>2. Meus Clientes</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-900 text-amber-300 font-bold">
                      {resellers.length}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setClientsMenuExpanded(!clientsMenuExpanded);
                    }}
                    className="p-1 hover:text-amber-300"
                  >
                    {clientsMenuExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Submenu com lista de clientes reais */}
                {clientsMenuExpanded && (
                  <div className="mt-1 ml-4 pl-3 border-l-2 border-amber-500/40 space-y-1">
                    {resellers.length === 0 ? (
                      <div className="py-2 px-2 text-xs text-stone-400 italic">
                        Nenhum revendedor cadastrado.
                      </div>
                    ) : (
                      resellers.map((c) => {
                        const isSelected = selectedClientId === c.uid && activeView === 'clients';
                        return (
                          <button
                            key={c.uid}
                            onClick={() => handleClientItemClick(c)}
                            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold transition text-left ${
                              isSelected
                                ? 'bg-amber-400 text-stone-950 font-bold shadow'
                                : 'text-stone-300 hover:bg-red-900/80 hover:text-white'
                            }`}
                          >
                            <span className="truncate pr-1">{c.displayName}</span>
                            {c.active ? (
                              <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            ) : (
                              <UserX className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            )}
                          </button>
                        );
                      })
                    )}

                    {onOpenNewClientModal && (
                      <button
                        onClick={() => {
                          onOpenNewClientModal();
                          if (window.innerWidth < 1024) {
                            setIsOpen(false);
                          }
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-bold text-amber-300 hover:bg-red-900/60 transition mt-1"
                      >
                        <PlusCircle className="w-4 h-4 text-amber-400" />
                        <span>+ Novo Revendedor</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* 3. Pedidos */}
              <button
                onClick={() => handleNavClick('orders')}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl font-bold transition text-left ${
                  activeView === 'orders'
                    ? 'bg-amber-500 text-stone-950 shadow-md'
                    : 'text-stone-200 hover:bg-red-900 hover:text-white'
                }`}
              >
                <ShoppingBag className="w-5 h-5 shrink-0" />
                <span>3. Pedidos (Revenda)</span>
              </button>

              {/* Encomendas Varejo (Consumidor Final R$ 1,00) */}
              <button
                onClick={() => handleNavClick('retail')}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl font-bold transition text-left ${
                  activeView === 'retail'
                    ? 'bg-amber-500 text-stone-950 shadow-md'
                    : 'text-stone-200 hover:bg-red-900 hover:text-white'
                }`}
              >
                <Tag className="w-5 h-5 shrink-0 text-amber-300" />
                <span>Encomendas Varejo (R$ 1)</span>
              </button>

              {/* 4. Auditoria de Pedidos */}
              <button
                onClick={() => handleNavClick('audit')}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl font-bold transition text-left ${
                  activeView === 'audit'
                    ? 'bg-amber-500 text-stone-950 shadow-md'
                    : 'text-stone-200 hover:bg-red-900 hover:text-white'
                }`}
              >
                <ShieldAlert className="w-5 h-5 shrink-0 text-amber-300" />
                <span>4. Auditoria de Pedidos</span>
              </button>

              {/* 5. Acertos e Pagamentos */}
              <button
                onClick={() => handleNavClick('settlement')}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl font-bold transition text-left ${
                  activeView === 'settlement'
                    ? 'bg-amber-500 text-stone-950 shadow-md'
                    : 'text-stone-200 hover:bg-red-900 hover:text-white'
                }`}
              >
                <Wallet className="w-5 h-5 shrink-0" />
                <span>5. Acertos e Pagamentos</span>
              </button>

              {/* 6. Notificações */}
              <button
                onClick={() => handleNavClick('notifications')}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl font-bold transition text-left ${
                  activeView === 'notifications'
                    ? 'bg-amber-500 text-stone-950 shadow-md'
                    : 'text-stone-200 hover:bg-red-900 hover:text-white'
                }`}
              >
                <Bell className="w-5 h-5 shrink-0" />
                <span>6. Notificações</span>
              </button>

              {/* 7. Meus Dados & Senha */}
              <button
                onClick={() => handleNavClick('profile')}
                className={`w-full flex items-center justify-between px-3 py-3 rounded-xl font-bold transition text-left ${
                  activeView === 'profile'
                    ? 'bg-amber-500 text-stone-950 shadow-md'
                    : 'text-stone-200 hover:bg-red-900 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <UserCog className="w-5 h-5 shrink-0 text-amber-300" />
                  <span>7. Meus Dados & Senha</span>
                </div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-400 text-stone-950">
                  Perfil
                </span>
              </button>

              {/* 8. Configurações & Preços */}
              <button
                onClick={() => handleNavClick('settings')}
                className={`w-full flex items-center justify-between px-3 py-3 rounded-xl font-bold transition text-left ${
                  activeView === 'settings'
                    ? 'bg-amber-500 text-stone-950 shadow-md'
                    : 'text-stone-200 hover:bg-red-900 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <DollarSign className="w-5 h-5 shrink-0 text-amber-400" />
                  <span>8. Preços & APK</span>
                </div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-stone-800 text-amber-400 border border-amber-400/40">
                  R$
                </span>
              </button>

              {/* Lixeira de Vendas (Acesso Rápido) */}
              {onOpenTrash && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenTrash();
                    if (window.innerWidth < 1024) {
                      setIsOpen(false);
                    }
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold transition text-left text-amber-200 hover:bg-red-900 hover:text-white mt-1 border border-amber-500/30 cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <Archive className="w-5 h-5 shrink-0 text-amber-400 group-hover:scale-110 transition" />
                    <span>Lixeira de Vendas</span>
                  </div>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-400 text-stone-950 shadow-xs">
                    Histórico
                  </span>
                </button>
              )}
            </>
          ) : (
            /* RESELLER MENU */
            <>
              <button
                onClick={() => handleNavClick('orders')}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl font-bold transition text-left ${
                  activeView === 'orders'
                    ? 'bg-amber-500 text-stone-950 shadow-md'
                    : 'text-stone-200 hover:bg-red-900 hover:text-white'
                }`}
              >
                <ClipboardList className="w-5 h-5 shrink-0" />
                <span>Meus Pedidos & Novo</span>
              </button>

              <button
                onClick={() => handleNavClick('leftovers')}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl font-bold transition text-left ${
                  activeView === 'leftovers'
                    ? 'bg-amber-500 text-stone-950 shadow-md'
                    : 'text-stone-200 hover:bg-red-900 hover:text-white'
                }`}
              >
                <Sparkles className="w-5 h-5 shrink-0 text-amber-300" />
                <span>Registrar Sobras</span>
              </button>

              <button
                onClick={() => handleNavClick('financial')}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl font-bold transition text-left ${
                  activeView === 'financial'
                    ? 'bg-amber-500 text-stone-950 shadow-md'
                    : 'text-stone-200 hover:bg-red-900 hover:text-white'
                }`}
              >
                <Wallet className="w-5 h-5 shrink-0" />
                <span>Meu Financeiro & Acertos</span>
              </button>

              <button
                onClick={() => handleNavClick('profit')}
                className={`w-full flex items-center justify-between px-3 py-3 rounded-xl font-bold transition text-left ${
                  activeView === 'profit'
                    ? 'bg-amber-500 text-stone-950 shadow-md'
                    : 'text-stone-200 hover:bg-red-900 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 shrink-0 text-emerald-400" />
                  <span>Meu Lucro de Revenda</span>
                </div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-400 text-emerald-950">
                  Lucro
                </span>
              </button>

              <button
                onClick={() => handleNavClick('notifications')}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl font-bold transition text-left ${
                  activeView === 'notifications'
                    ? 'bg-amber-500 text-stone-950 shadow-md'
                    : 'text-stone-200 hover:bg-red-900 hover:text-white'
                }`}
              >
                <Bell className="w-5 h-5 shrink-0" />
                <span>Notificações</span>
              </button>

              {/* Meus Dados & Senha (Revendedor) */}
              <button
                onClick={() => handleNavClick('profile')}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl font-bold transition text-left ${
                  activeView === 'profile'
                    ? 'bg-amber-500 text-stone-950 shadow-md'
                    : 'text-stone-200 hover:bg-red-900 hover:text-white'
                }`}
              >
                <UserCog className="w-5 h-5 shrink-0 text-amber-300" />
                <span>Meus Dados & Senha</span>
              </button>
            </>
          )}
        </nav>

        {/* Footer actions */}
        <div className="p-4 border-t border-red-900/80 bg-red-950 space-y-3">
          <PWAInstallButton className="w-full" />

          {/* 8. Sair */}
          <button
            onClick={() => logout()}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-red-200 hover:bg-red-900 hover:text-white border border-red-800 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>8. Sair do Sistema</span>
          </button>
        </div>
      </aside>
    </>
  );
};
