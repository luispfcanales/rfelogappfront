import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Compass, 
  PlusCircle, 
  LayoutDashboard, 
  SlidersHorizontal, 
  LogOut, 
  ShieldCheck, 
  User as UserIcon,
  TreePine
} from 'lucide-react';
import type { User } from '../types';

interface LayoutProps {
  currentUser: User;
  onLogout: () => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({
  currentUser,
  onLogout,
  children,
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  const isDashboard = location.pathname === '/dashboard' || location.pathname.startsWith('/solicitudes/');
  const isNueva = location.pathname === '/solicitudes/nueva';
  const isAdmin = location.pathname === '/admin';

  return (
    <div className="min-h-screen flex flex-col bg-[#f8faf7] text-[#122014]">
      {/* Top Navigation Bar with Rainforest Expeditions identity */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/95 border-b border-[#e2ebe3] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo and Brand */}
            <div 
              className="flex items-center gap-3.5 cursor-pointer group" 
              onClick={() => navigate('/dashboard')}
            >
              <div className="w-10 h-10 rounded-xl bg-[#2d5a27] flex items-center justify-center shadow-md shadow-[#2d5a27]/25 text-white transition-transform group-hover:scale-105">
                <TreePine className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base tracking-tight text-[#2d5a27]">
                    Rainforest Expeditions
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-md bg-[#eaf2eb] text-[#2d5a27]">
                    Logística
                  </span>
                </div>
                <div className="text-[11px] text-[#5a725e] -mt-0.5">
                  Sistema de Seguimiento de Envíos
                </div>
              </div>
            </div>

            {/* Navigation Tabs (Desktop) */}
            <nav className="hidden md:flex items-center gap-1.5">
              <button
                onClick={() => navigate('/dashboard')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                  isDashboard && !isNueva
                    ? 'bg-[#2d5a27] text-white shadow-sm shadow-[#2d5a27]/20'
                    : 'text-[#4a5e4d] hover:bg-[#eaf2eb] hover:text-[#2d5a27]'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Tablero de Envíos</span>
              </button>

              <button
                onClick={() => navigate('/solicitudes/nueva')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                  isNueva
                    ? 'bg-[#2d5a27] text-white shadow-sm shadow-[#2d5a27]/20'
                    : 'text-[#4a5e4d] hover:bg-[#eaf2eb] hover:text-[#2d5a27]'
                }`}
              >
                <PlusCircle className="w-4 h-4" />
                <span>Nueva Solicitud</span>
              </button>

              {/* Admin Panel Link (Only visible to Admin role) */}
              {currentUser.rol === 'Administrador' && (
                <button
                  onClick={() => navigate('/admin')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                    isAdmin
                      ? 'bg-[#2d5a27] text-white shadow-sm shadow-[#2d5a27]/20'
                      : 'text-[#4a5e4d] hover:bg-[#eaf2eb] hover:text-[#2d5a27]'
                  }`}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span>Catálogos & Roles</span>
                </button>
              )}
            </nav>

            {/* Right Actions: User Info */}
            <div className="flex items-center gap-3">
              {/* User Profile Capsule */}
              <div className="flex items-center gap-3 pl-3 border-l border-[#e2ebe3]">
                <div className="hidden sm:flex flex-col items-end text-right">
                  <div className="text-xs font-bold text-[#122014]">
                    {currentUser.nombre}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                      currentUser.rol === 'Administrador'
                        ? 'bg-[#eaf2eb] text-[#2d5a27] border border-[#c8decb]'
                        : currentUser.rol === 'Gestor'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {currentUser.rol}
                    </span>
                    {currentUser.rol === 'Gestor' && currentUser.es_gestor_activado && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-semibold">
                        Activo
                      </span>
                    )}
                    <span className="text-[11px] font-mono text-[#5a725e]">
                      DNI: {currentUser.dni}
                    </span>
                  </div>
                </div>

                {/* Avatar Icon */}
                <div className="w-9 h-9 rounded-xl bg-[#eaf2eb] text-[#2d5a27] flex items-center justify-center font-bold text-xs border border-[#c8decb]">
                  {currentUser.rol === 'Administrador' ? (
                    <ShieldCheck className="w-5 h-5" />
                  ) : (
                    <UserIcon className="w-5 h-5" />
                  )}
                </div>

                {/* Logout Button */}
                <button
                  onClick={onLogout}
                  title="Cerrar Sesión"
                  className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="md:hidden flex items-center justify-around border-t border-[#e2ebe3] px-2 py-1.5 bg-[#f8faf7]/95">
          <button
            onClick={() => navigate('/dashboard')}
            className={`flex-1 py-1.5 text-xs font-semibold flex flex-col items-center gap-1 ${
              isDashboard && !isNueva
                ? 'text-[#2d5a27]'
                : 'text-[#5a725e]'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Tablero</span>
          </button>

          <button
            onClick={() => navigate('/solicitudes/nueva')}
            className={`flex-1 py-1.5 text-xs font-semibold flex flex-col items-center gap-1 ${
              isNueva
                ? 'text-[#2d5a27]'
                : 'text-[#5a725e]'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Nueva Solicitud</span>
          </button>

          {currentUser.rol === 'Administrador' && (
            <button
              onClick={() => navigate('/admin')}
              className={`flex-1 py-1.5 text-xs font-semibold flex flex-col items-center gap-1 ${
                isAdmin
                  ? 'text-[#2d5a27]'
                  : 'text-[#5a725e]'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Admin</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>

      {/* Rainforest Expeditions Brand Footer */}
      <footer className="mt-auto border-t border-[#e2ebe3] py-4 px-4 sm:px-6 text-center text-xs text-[#5a725e] flex items-center justify-center gap-2">
        <Compass className="w-3.5 h-3.5 text-[#2d5a27]" />
        <span>Rainforest Expeditions • Sistema Logístico Interno © {new Date().getFullYear()}</span>
      </footer>
    </div>
  );
};
