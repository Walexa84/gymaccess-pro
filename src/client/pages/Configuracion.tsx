import React, { useState, useEffect } from 'react';
import { Building2, Cloud, Sliders, ShieldCheck } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { CuentasHctTab } from '../components/config/CuentasHctTab';
import { SucursalesTab } from '../components/config/SucursalesTab';
import { NivelesAccesoTab } from '../components/config/NivelesAccesoTab';

export const Configuracion: React.FC = () => {
  const [subTab, setSubTab] = useState<'sucursales' | 'cuentas' | 'niveles'>('sucursales');
  const [cuentasHct, setCuentasHct] = useState<any[]>([]);
  const { theme } = useTheme();
  const isCyber = theme === 'cyber';

  const cargarCuentas = () => {
    fetch('/api/access/cuentas-hct')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCuentasHct(data);
        }
      })
      .catch((err) => {
        console.error('Error al cargar cuentas HCT:', err);
      });
  };

  useEffect(() => {
    cargarCuentas();
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-6 transition-colors duration-300">
      {/* Encabezado del Módulo de Control de Acceso */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-accent-badge-theme text-accent-theme border border-highlight-theme">
            <Sliders className="w-7 h-7" />
          </div>
          <div>
            <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-main-theme tracking-tight">
              Control de Acceso Físico & Hardware
            </h2>
            <p className="text-sm text-muted-theme mt-0.5 font-medium">
              Sedes físicas, torniquetes, cuentas Hik-Connect Teams y niveles de acceso
            </p>
          </div>
        </div>

        {/* Selector de Subpestañas Táctil con Scroll Horizontal */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-theme-subtle border border-theme overflow-x-auto no-scrollbar max-w-full">
          <button
            onClick={() => setSubTab('sucursales')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
              subTab === 'sucursales'
                ? isCyber
                  ? 'bg-accent-theme text-black shadow-volt-glow'
                  : 'bg-accent-theme text-white shadow-md'
                : 'text-muted-theme hover:text-main-theme hover:bg-theme'
            }`}
          >
            <Building2 className="w-4 h-4 text-current" />
            <span>Sucursales & Gimnasios</span>
          </button>

          <button
            onClick={() => setSubTab('cuentas')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
              subTab === 'cuentas'
                ? isCyber
                  ? 'bg-cyan-400 text-black shadow'
                  : 'bg-cyan-600 text-white shadow'
                : 'text-muted-theme hover:text-main-theme hover:bg-theme'
            }`}
          >
            <Cloud className="w-4 h-4 text-current" />
            <span>Cuentas Teams ({cuentasHct.length})</span>
          </button>

          <button
            onClick={() => setSubTab('niveles')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
              subTab === 'niveles'
                ? isCyber
                  ? 'bg-purple-400 text-black shadow'
                  : 'bg-purple-600 text-white shadow'
                : 'text-muted-theme hover:text-main-theme hover:bg-theme'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-current" />
            <span>Niveles & Zonas</span>
          </button>
        </div>
      </div>

      {/* Contenido de la Subpestaña Activa */}
      {subTab === 'sucursales' && <SucursalesTab />}
      {subTab === 'cuentas' && (
        <CuentasHctTab
          cuentas={cuentasHct}
          setCuentas={setCuentasHct}
          onRefreshAll={cargarCuentas}
        />
      )}
      {subTab === 'niveles' && <NivelesAccesoTab />}
    </div>
  );
};
