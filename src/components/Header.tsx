import React from 'react';
import { Menu, X, Bell, User, LogOut, Croissant, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  unreadCount?: number;
  onOpenNotifications?: () => void;
  onGoHome?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  sidebarOpen,
  setSidebarOpen,
  unreadCount = 0,
  onOpenNotifications,
  onGoHome,
}) => {
  const { userProfile, isAdmin, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-red-900 border-b border-red-950 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Mobile Toggle & Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-xl bg-red-950/60 hover:bg-red-800 text-amber-300 focus:outline-hidden transition"
              aria-label="Abrir menu"
            >
              {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            <button
              type="button"
              onClick={onGoHome}
              className="flex items-center gap-2.5 text-left rounded-2xl p-1 -m-1 hover:bg-red-950/40 active:scale-98 transition cursor-pointer group focus:outline-hidden"
              title="Voltar ao início"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-inner group-hover:scale-105 group-hover:bg-amber-500/30 transition">
                <Croissant className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-black tracking-tight leading-none text-white flex items-center gap-2 group-hover:text-amber-300 transition">
                  PANIFICADORA MORUMBI
                  {isAdmin && (
                    <span className="hidden sm:inline-flex items-center gap-1 bg-amber-400 text-stone-950 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                      <ShieldCheck className="w-3 h-3" /> Admin
                    </span>
                  )}
                </h1>
                <p className="text-[11px] sm:text-xs text-amber-200 font-medium group-hover:text-amber-100 transition">
                  Sistema de Revenda de Pães
                </p>
              </div>
            </button>
          </div>

          {/* Right: Actions, PWA Button, User Info */}
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden md:block">
              <PWAInstallButton />
            </div>

            {/* Notification Bell */}
            {onOpenNotifications && (
              <button
                onClick={onOpenNotifications}
                className="relative p-2 rounded-xl bg-red-950/50 hover:bg-red-800 text-amber-200 transition"
                title="Notificações"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-amber-400 text-stone-950 font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-red-900 shadow">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            )}

            {/* User Chip */}
            <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-red-800">
              <div className="text-right">
                <p className="text-xs font-bold text-white truncate max-w-[140px]">
                  {userProfile?.displayName || 'Usuário'}
                </p>
                <p className="text-[10px] text-amber-300 capitalize">
                  {isAdmin ? 'Administrador' : 'Revendedor'}
                </p>
              </div>
              <div className="w-8 h-8 rounded-full bg-amber-400 text-stone-950 font-black text-xs flex items-center justify-center shadow">
                {userProfile?.displayName?.charAt(0).toUpperCase() || 'U'}
              </div>
            </div>

            {/* Logout icon */}
            <button
              onClick={() => logout()}
              className="p-2 rounded-xl bg-red-950/40 hover:bg-red-800 text-red-200 hover:text-white transition"
              title="Sair do sistema"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
