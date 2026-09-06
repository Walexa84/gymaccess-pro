import React, { useState, useEffect } from 'react';
import { Zap, Users, CreditCard, Activity, Sliders, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  hardwareOnline: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, hardwareOnline }) => {
  const { theme } = useTheme();
  const isCyber = theme === 'cyber';

  const [currentTime, setCurrentTime] = useState<string>('');
  const [timeZone, setTimeZone] = useState<string>('America/Mexico_City');
  const [timeSynced, setTimeSynced] = useState<boolean>(true);
  const [driftSeconds, setDriftSeconds] = useState<number>(0);

  const tabs = [
    { id: 'monitor', label: 'Monitor en Vivo', icon: Activity },
    { id: 'personas', label: 'Personas (IAM)', icon: Users },
    { id: 'cobro', label: 'Punto de Venta', icon: CreditCard },
    { id: 'acceso', label: 'Control de Acceso', icon: Sliders },
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
                  ACCESS<span className={isCyber ? 'text-volt' : 'text-sport-orange'}>CORE</span>
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-accent-badge-theme text-accent-theme border border-highlight-theme">
                  GYM POS
                </span>
              </div>
              <p className="text-[11px] text-muted-theme font-medium leading-none mt-0.5">
                Control de Acceso Físico & Punto de Venta
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
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                    isActive
                      ? isCyber
                        ? 'bg-volt text-black shadow-volt-glow'
                        : 'bg-sport-orange text-white shadow-orange-glow'
                      : 'text-muted-theme hover:text-main-theme hover:bg-theme-subtle'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Reloj y Telemetría */}
          <div className="flex items-center gap-2.5">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-theme bg-theme-subtle">
              <Clock className={`w-3.5 h-3.5 ${isCyber ? 'text-volt' : 'text-sport-orange'}`} />
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                hardwareOnline
                  ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                  : 'border-red-500/30 text-red-400 bg-red-500/10'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${hardwareOnline ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
              <span className="hidden md:inline">{hardwareOnline ? 'Online' : 'Offline'}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
