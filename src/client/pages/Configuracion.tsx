import React, { useState, useEffect } from 'react';
import { Building2, Cloud, Sliders, ShieldCheck, Package } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { CuentasHctTab } from '../components/config/CuentasHctTab';
import { SucursalesTab } from '../components/config/SucursalesTab';
import { NivelesAccesoTab } from '../components/config/NivelesAccesoTab';
import { PaquetesTab } from '../components/config/PaquetesTab';

export const Configuracion: React.FC = () => {
  const [subTab, setSubTab] = useState<'sucursales' | 'cuentas' | 'niveles' | 'paquetes'>('sucursales');
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
      {/* Encabezado del Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${isCyber ? 'bg-volt/10 text-volt' : 'bg-sport-orange/10 text-sport-orange'}`}>
            <Sliders className="w-7 h-7" />
          </div>
          <div>
            <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-main-theme tracking-tight">
              Control de Acceso & Sucursales
            </h2>
            <p className="text-sm text-muted-theme mt-0.5 font-medium">
              Agrupación física de gimnasios y vinculación técnica de cuentas Hik-Connect Teams
            </p>
          </div>
        </div>

        {/* Selector de Subpestañas */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-theme-subtle border border-theme self-start sm:self-auto">
          <button
            onClick={() => setSubTab('sucursales')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              subTab === 'sucursales'
                ? isCyber
                  ? 'bg-volt text-black shadow-volt-glow'
                  : 'bg-sport-orange text-white shadow-orange-glow'
                : 'text-muted-theme hover:text-main-theme hover:bg-theme'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Sucursales & Gimnasios</span>
          </button>

          <button
            onClick={() => setSubTab('cuentas')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              subTab === 'cuentas'
                ? isCyber
                  ? 'bg-cyan-500 text-black shadow'
                  : 'bg-cyan-600 text-white shadow'
                : 'text-muted-theme hover:text-main-theme hover:bg-theme'
            }`}
          >
            <Cloud className="w-4 h-4" />
            <span>Cuentas Teams ({cuentasHct.length})</span>
          </button>

          <button
            onClick={() => setSubTab('niveles')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              subTab === 'niveles'
                ? isCyber
                  ? 'bg-purple-500 text-white shadow'
                  : 'bg-purple-600 text-white shadow'
                : 'text-muted-theme hover:text-main-theme hover:bg-theme'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Niveles & Zonas</span>
          </button>

          <button
            onClick={() => setSubTab('paquetes')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              subTab === 'paquetes'
                ? isCyber
                  ? 'bg-emerald-500 text-black shadow'
                  : 'bg-emerald-600 text-white shadow'
                : 'text-muted-theme hover:text-main-theme hover:bg-theme'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Paquetes & Membresías</span>
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
      {subTab === 'paquetes' && <PaquetesTab />}
    </div>
  );
};
