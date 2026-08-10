import React, { useState } from 'react';
import { Shield, ArrowRight, UserCheck, AlertCircle, Sparkles, TreePine } from 'lucide-react';
import type { User } from '../types';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
  apiBase: string;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess, apiBase }) => {
  const [dni, setDni] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, ''); // numbers only
    if (val.length <= 8) {
      setDni(val);
      if (error) setError(null);
    }
  };

  const handleLogin = async (e?: React.FormEvent, customDni?: string) => {
    if (e) e.preventDefault();
    const targetDni = customDni || dni;

    if (targetDni.length !== 8) {
      setError('El número de DNI debe contener exactamente 8 dígitos numéricos.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiBase}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dni: targetDni }),
      });

      const res = await response.json();

      if (res.success && res.data) {
        onLoginSuccess(res.data);
      } else {
        setError(res.error || 'DNI no registrado en el sistema.');
      }
    } catch {
      setError('Error al conectar con el servidor backend. Verifica que el backend esté iniciado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-[#f8faf7] via-[#f0f5f1] to-[#e8f0e9] text-[#122014] relative overflow-hidden">
      {/* Ambient background glow in rainforest green */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#2d5a27]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-[#4e8752]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md bg-white border border-[#e2ebe3] rounded-3xl p-8 shadow-xl shadow-[#2d5a27]/10 animate-fade-in">
        {/* Header Icon & Brand */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[#2d5a27] p-0.5 shadow-lg shadow-[#2d5a27]/25 mb-4 flex items-center justify-center">
            <div className="w-full h-full bg-[#2d5a27] rounded-[14px] flex items-center justify-center">
              <TreePine className="w-8 h-8 text-white animate-pulse" />
            </div>
          </div>

          <div className="text-xs uppercase tracking-widest font-bold text-[#2d5a27] mb-1">
            Rainforest Expeditions
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#122014]">
            Sistema Logístico
          </h1>
          <p className="text-[#5a725e] text-xs mt-1.5">
            Ingreso al panel interno mediante documento de identidad
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={(e) => handleLogin(e)} className="space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#4a5e4d] mb-2">
              Número de DNI (8 Dígitos)
            </label>
            <div className="relative">
              <input
                type="text"
                value={dni}
                onChange={handleInputChange}
                placeholder="Ej. 72453560"
                maxLength={8}
                autoFocus
                className="w-full px-4 py-3.5 bg-[#f8faf7] border border-[#c8decb] rounded-xl text-lg font-mono tracking-widest text-[#122014] placeholder:text-[#88a58c] focus:outline-none focus:ring-2 focus:ring-[#2d5a27]/30 focus:border-[#2d5a27] transition-all text-center"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono text-[#5a725e]">
                {dni.length}/8
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || dni.length !== 8}
            className="w-full py-3.5 px-6 rounded-xl font-semibold text-white bg-[#2d5a27] hover:bg-[#366839] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 shadow-lg shadow-[#2d5a27]/25 transition-all flex items-center justify-center gap-2 group cursor-pointer"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Ingresar al Sistema</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        {/* Quick Admin DNI shortcut */}
        <div className="mt-8 pt-6 border-t border-[#e2ebe3]">
          <div className="flex items-center justify-between mb-3 text-xs text-[#5a725e] font-semibold">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#2d5a27]" />
              Acceso Rápido Administrador:
            </span>
          </div>

          <button
            type="button"
            onClick={() => { setDni('72453560'); handleLogin(undefined, '72453560'); }}
            className="w-full p-2.5 rounded-xl bg-[#f8faf7] hover:bg-[#f0f5f1] border border-[#c8decb] hover:border-[#2d5a27] text-left transition-all flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#2d5a27] text-white flex items-center justify-center font-bold text-xs">
                ADM
              </div>
              <div>
                <div className="text-xs font-semibold text-[#122014]">LUIS ANGEL PFUNO CANALES</div>
                <div className="text-[11px] font-mono text-[#5a725e]">DNI: 72453560</div>
              </div>
            </div>
            <UserCheck className="w-4 h-4 text-[#5a725e] group-hover:text-[#2d5a27] transition-colors" />
          </button>
        </div>

        {/* Footer info */}
        <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-[#5a725e]">
          <Shield className="w-3.5 h-3.5 text-[#2d5a27]" />
          <span>Acceso corporativo protegido • Rainforest Expeditions</span>
        </div>
      </div>
    </div>
  );
};
