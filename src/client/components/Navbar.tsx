import React, { useState, useEffect } from 'react';
import { Zap, Users, CreditCard, Activity, Sliders, Clock, CheckCircle2, AlertTriangle, Settings, ClipboardList } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useBranding } from '../context/BrandingContext';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  hardwareOnline: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, hardwareOnline }) => {
  const { theme } = useTheme();
  const { branding } = useBranding();
  const isCyber = theme === 'cyber';

  const [currentTime, setCurrentTime] = useState<string>('');
  const [timeZone, setTimeZone] = useState<string>('America/Mexico_City');
  const [timeSynced, setTimeSynced] = useState<boolean>(true);
  const [driftSeconds, setDriftSeconds] = useState<number>(0);

  const tabs = [
    { id: 'monitor', label: 'Monitor en Vivo', shortLabel: 'Monitor', icon: Activity },
    { id: 'personas', label: 'Personas (IAM)', shortLabel: 'Socios', icon: Users },
    { id: 'cobro', label: 'Punto de Venta', shortLabel: 'Cobro', icon: CreditCard },
    { id: 'acceso', label: 'Control de Acceso', shortLabel: 'Acceso', icon: Sliders },
    { id: 'bitacora', label: 'Bitácora & Auditoría', shortLabel: 'Bitácora', icon: ClipboardList },
    { id: 'ajustes', label: 'Configuración', shortLabel: 'Ajustes', icon: Settings },
  ];

  // Consultar telemetría de hora y sincronía cada 30 segundos
  const fetchTimeTelemetry = () => {
    fetch('/api/hardware/time')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setTimeZone(data.timeZone || 'America/Mexico_City');
          setTimeSynced(data.isSynced);
          setDriftSeconds(data.driftSeconds || 0);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchTimeTelemetry();
    const telemetryInterval = setInterval(fetchTimeTelemetry, 30000);
    return () => clearInterval(telemetryInterval);
  }, []);

  // Segundero en vivo según la zona horaria del gimnasio
  useEffect(() => {
    const tick = () => {
      try {
        const formatted = new Intl.DateTimeFormat('es-MX', {
          timeZone,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }).format(new Date());
        setCurrentTime(formatted);
      } catch {
        setCurrentTime(new Date().toLocaleTimeString());
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [timeZone]);

  return (
    <>
      {/* 🖥️ Barra Superior de Navegación */}
      <header className="sticky top-0 z-40 transition-colors duration-300 border-b border-theme bg-[var(--nav-bg)] backdrop-blur-md">
        <div className="w-full max-w-[1600px] 2xl:max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Marca Dinámica */}
            <div className="flex items-center gap-3">
              {branding.gym_logo_url ? (
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-theme-subtle border border-theme flex items-center justify-center p-1 shadow-sm shrink-0">
                  <img src={branding.gym_logo_url} alt="Logo" className="w-full h-full object-contain" />
                </div>
              ) : (
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg transition-all duration-300 bg-accent-theme text-black shadow-sm shrink-0"
                >
                  <Zap className="w-5 h-5 fill-current" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-display font-extrabold text-base sm:text-lg leading-tight tracking-tight text-main-theme truncate max-w-[140px] sm:max-w-xs">
                    {branding.gym_nombre || 'AccessCore Gym'}
                  </h1>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-accent-badge-theme text-accent-theme border border-highlight-theme shrink-0">
                    POS
                  </span>
                </div>
                <p className="text-[11px] text-muted-theme font-medium leading-none mt-0.5 truncate max-w-[140px] sm:max-w-xs hidden sm:block">
                  {branding.gym_slogan || 'Control de Acceso Físico & Punto de Venta'}
                </p>
              </div>
            </div>

            {/* Menú de Navegación Desktop (Oculto en móviles <768px para dar paso al bottom nav) */}
            <nav className="hidden md:flex items-center gap-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                      isActive
                        ? isCyber
                          ? 'bg-volt text-black shadow-volt-glow'
                          : 'bg-accent-theme text-white shadow-md'
                        : 'text-muted-theme hover:text-main-theme hover:bg-theme-subtle'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-current" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Reloj y Telemetría */}
            <div className="flex items-center gap-2">
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-theme bg-theme-subtle">
                <Clock className={`w-3.5 h-3.5 ${isCyber ? 'text-volt' : 'text-accent-theme'}`} />
                <div className="text-right">
                  <div className="font-mono-numbers text-xs font-black tracking-tight text-main-theme leading-none">
                    {currentTime || '--:--:--'}
                  </div>
                  <div className="text-[9px] text-muted-theme font-bold flex items-center gap-1 justify-end mt-0.5">
                    {timeSynced ? (
                      <>
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                        <span className="text-emerald-400 font-semibold">HW Sync</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />
                        <span className="text-amber-400 font-semibold">{driftSeconds}s desfase</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Estatus Hardware General */}
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                  hardwareOnline
                    ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                    : 'border-red-500/30 text-red-400 bg-red-500/10'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${hardwareOnline ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                <span className="hidden sm:inline">{hardwareOnline ? 'Online' : 'Offline'}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 📱 Barra de Navegación Táctil Inferior (Solo en Móviles y Tablets <768px) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[var(--nav-bg)] backdrop-blur-lg border-t border-theme flex justify-around items-center py-2 px-1 shadow-2xl">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-xl transition-all ${
                isActive
                  ? isCyber
                    ? 'text-volt font-black'
                    : 'text-accent-theme font-black'
                  : 'text-muted-theme hover:text-main-theme'
              }`}
            >
              <div
                className={`p-1.5 rounded-xl transition-transform ${
                  isActive
                    ? isCyber
                      ? 'bg-volt/10 scale-110'
                      : 'bg-accent-badge-theme scale-110'
                    : ''
                }`}
              >
                <Icon className="w-5 h-5 text-current" />
              </div>
              <span className="text-[10px] tracking-tight">{tab.shortLabel}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
