import React from 'react';
import { Zap, Sun, Users, CreditCard, Cpu, Database, Activity, ShieldCheck } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  hardwareOnline: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, hardwareOnline }) => {
  const { theme, toggleTheme } = useTheme();

  const tabs = [
    { id: 'dashboard', label: 'Monitor Recepción', icon: Activity },
    { id: 'socios', label: 'Socios', icon: Users },
    { id: 'cobro', label: 'Punto de Cobro', icon: CreditCard },
    { id: 'hardware', label: 'Terminales Hikvision', icon: Cpu },
    { id: 'backups', label: 'Respaldos', icon: Database },
  ];

  const isCyber = theme === 'cyber';

  return (
    <header className="sticky top-0 z-40 transition-colors duration-300 border-b border-theme bg-[var(--nav-bg)] backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Marca */}
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg transition-all duration-300 ${
                isCyber
                  ? 'bg-volt text-black shadow-volt-glow'
                  : 'bg-sport-orange text-white shadow-orange-glow'
              }`}
            >
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display font-extrabold text-lg leading-tight tracking-tight text-main-theme">
                  GYM<span className={isCyber ? 'text-volt' : 'text-sport-orange'}>ACCESS</span>
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-accent-badge-theme text-accent-theme border border-highlight-theme">
                  PRO
                </span>
              </div>
              <p className="text-[11px] text-muted-theme font-medium leading-none mt-0.5">
                Biometría Facial & Acceso HikCentral
              </p>
            </div>
          </div>

          {/* Menú de Navegación */}
          <nav className="flex items-center gap-1.5">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? isCyber
                        ? 'bg-volt text-black shadow-volt-glow font-bold'
                        : 'bg-sport-orange text-white shadow-orange-glow font-bold'
                      : isCyber
                      ? 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Controles y Estados a la derecha */}
          <div className="flex items-center gap-3">
            {/* Selector de Tema en Vivo */}
            <button
              onClick={toggleTheme}
              title={isCyber ? 'Cambiar a estilo Clean Sport (Claro)' : 'Cambiar a estilo Cyber-Gym (Oscuro)'}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-300 border ${
                isCyber
                  ? 'bg-[#151922] border-slate-700/80 text-volt hover:border-volt/60'
                  : 'bg-slate-100 border-slate-200 text-sport-orange hover:border-sport-orange/60 shadow-sm'
              }`}
            >
              {isCyber ? (
                <>
                  <Zap className="w-3.5 h-3.5 fill-volt text-volt" />
                  <span>Cyber Volt</span>
                </>
              ) : (
                <>
                  <Sun className="w-3.5 h-3.5 text-sport-orange" />
                  <span>Clean Sport</span>
                </>
              )}
            </button>

            {/* Estado de Hardware Hikvision */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                hardwareOnline
                  ? isCyber
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : isCyber
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  hardwareOnline
                    ? 'bg-emerald-500 animate-pulse'
                    : 'bg-amber-500'
                }`}
              />
              <span className="hidden sm:inline">
                {hardwareOnline ? 'Hikvision Online' : 'Terminal Offline'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
