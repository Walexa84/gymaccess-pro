import React, { useState } from 'react';
import { Palette, Package, Database, Settings } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { BrandingTab } from '../components/config/BrandingTab';
import { PaquetesTab } from '../components/config/PaquetesTab';
import { RespaldosTab } from '../components/config/RespaldosTab';

export const AjustesGenerales: React.FC = () => {
  const [subTab, setSubTab] = useState<'branding' | 'paquetes' | 'respaldos'>('branding');
  const { theme } = useTheme();
  const isCyber = theme === 'cyber';

  return (
    <div className="max-w-5xl mx-auto space-y-6 transition-colors duration-300">
      {/* Encabezado del Módulo de Configuración */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-accent-badge-theme text-accent-theme border border-highlight-theme shrink-0">
            <Settings className="w-7 h-7" />
          </div>
          <div>
            <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-main-theme tracking-tight">
              Configuración del Gimnasio
            </h2>
            <p className="text-xs sm:text-sm text-muted-theme mt-0.5 font-medium">
              Identidad de marca, logotipo, temas visuales, catálogo de membresías y respaldos
            </p>
          </div>
        </div>

        {/* Selector de Subpestañas Táctil con Scroll Horizontal */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-theme-subtle border border-theme overflow-x-auto no-scrollbar shrink-0 shadow-sm">
          <button
            onClick={() => setSubTab('branding')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
              subTab === 'branding'
                ? isCyber
                  ? 'bg-accent-theme text-black shadow-volt-glow'
                  : 'bg-accent-theme text-white shadow-md'
                : 'text-muted-theme hover:text-main-theme hover:bg-theme'
            }`}
          >
            <Palette className="w-4 h-4 text-current shrink-0" />
            <span>Identidad & Marca</span>
          </button>

          <button
            onClick={() => setSubTab('paquetes')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
              subTab === 'paquetes'
                ? isCyber
                  ? 'bg-emerald-400 text-black shadow'
                  : 'bg-emerald-600 text-white shadow'
                : 'text-muted-theme hover:text-main-theme hover:bg-theme'
            }`}
          >
            <Package className="w-4 h-4 text-current shrink-0" />
            <span>Paquetes Comerciales</span>
          </button>

          <button
            onClick={() => setSubTab('respaldos')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
              subTab === 'respaldos'
                ? isCyber
                  ? 'bg-cyan-400 text-black shadow'
                  : 'bg-cyan-600 text-white shadow'
                : 'text-muted-theme hover:text-main-theme hover:bg-theme'
            }`}
          >
            <Database className="w-4 h-4 text-current shrink-0" />
            <span>Copias de Seguridad</span>
          </button>
        </div>
      </div>

      {/* Contenido Dinámico */}
      {subTab === 'branding' && <BrandingTab />}
      {subTab === 'paquetes' && <PaquetesTab />}
      {subTab === 'respaldos' && <RespaldosTab />}
    </div>
  );
};
