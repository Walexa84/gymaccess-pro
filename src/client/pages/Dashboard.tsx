import React, { useState, useEffect } from 'react';
import { Users, UserCheck, UserX, DollarSign, Clock, AlertTriangle, RefreshCw, ArrowUpRight, ShieldCheck, ChevronRight } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface Stats {
  totalSocios: number;
  sociosVigentes: number;
  sociosVencidos: number;
  ingresosHoy: number;
  ultimosAccesos: any[];
  vencenPronto: any[];
}

export const Dashboard: React.FC<{ onNavigateCobro: () => void }> = ({ onNavigateCobro }) => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();
  const isCyber = theme === 'cyber';

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dashboard/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error cargando estadísticas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8 transition-colors duration-300">
      {/* Encabezado Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isCyber ? 'bg-volt animate-ping' : 'bg-sport-orange animate-ping'
              }`}
            />
            <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-main-theme tracking-tight">
              Monitor de Recepción en Vivo
            </h2>
          </div>
          <p className="text-sm text-muted-theme mt-1 font-medium">
            Control biométrico facial en torniquetes, estados de vigencia y balance de caja
          </p>
        </div>

        <button
          onClick={fetchStats}
          disabled={loading}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 border ${
            isCyber
              ? 'bg-[#151922] border-slate-700/80 text-slate-200 hover:text-volt hover:border-volt/50'
              : 'bg-white border-slate-200 text-slate-700 hover:text-sport-orange hover:border-sport-orange/50 shadow-sm'
          }`}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Actualizando...' : 'Refrescar Datos'}</span>
        </button>
      </div>

      {/* Grid de KPIs de Alto Impacto */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI: Total Clientes */}
        <div className="bg-card-theme border border-theme card-shadow-theme rounded-2xl p-6 relative overflow-hidden transition-all duration-300 hover:translate-y-[-2px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-theme uppercase tracking-wider">
              Total Clientes
            </span>
            <div
              className={`p-2.5 rounded-xl ${
                isCyber ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
              }`}
            >
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="font-display font-black text-4xl text-main-theme tracking-tight">
              {stats?.totalSocios ?? 0}
            </span>
            <span className="text-xs font-semibold text-muted-theme flex items-center">
              Padrón General
            </span>
          </div>
          <div
            className={`absolute bottom-0 left-0 right-0 h-1 ${
              isCyber ? 'bg-slate-700' : 'bg-slate-200'
            }`}
          />
        </div>

        {/* KPI: Acceso Vigente */}
        <div className="bg-card-theme border border-theme card-shadow-theme rounded-2xl p-6 relative overflow-hidden transition-all duration-300 hover:translate-y-[-2px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">
              Acceso Vigente
            </span>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="font-display font-black text-4xl text-emerald-400 tracking-tight">
              {stats?.sociosVigentes ?? 0}
            </span>
            <span className="text-xs font-bold text-emerald-500/90 flex items-center gap-0.5">
              Habilitados <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500" />
        </div>

        {/* KPI: Acceso Vencido */}
        <div className="bg-card-theme border border-theme card-shadow-theme rounded-2xl p-6 relative overflow-hidden transition-all duration-300 hover:translate-y-[-2px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-500 uppercase tracking-wider">
              Acceso Vencido
            </span>
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400">
              <UserX className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="font-display font-black text-4xl text-rose-400 tracking-tight">
              {stats?.sociosVencidos ?? 0}
            </span>
            <span className="text-xs font-bold text-rose-500/90">
              Bloqueo Facial
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-rose-500" />
        </div>

        {/* KPI: Caja Hoy */}
        <div className="bg-card-theme border border-theme card-shadow-theme rounded-2xl p-6 relative overflow-hidden transition-all duration-300 hover:translate-y-[-2px]">
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-bold uppercase tracking-wider ${
                isCyber ? 'text-volt' : 'text-sport-orange'
              }`}
            >
              Caja del Día
            </span>
            <div
              className={`p-2.5 rounded-xl ${
                isCyber
                  ? 'bg-volt/10 text-volt'
                  : 'bg-sport-orange/10 text-sport-orange'
              }`}
            >
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="font-display font-black text-4xl text-main-theme tracking-tight">
              ${(stats?.ingresosHoy ?? 0).toFixed(2)}
            </span>
            <span
              className={`text-xs font-bold ${
                isCyber ? 'text-volt' : 'text-sport-orange'
              }`}
            >
              Ingreso Real
            </span>
          </div>
          <div
            className={`absolute bottom-0 left-0 right-0 h-1 ${
              isCyber ? 'bg-volt' : 'bg-sport-orange'
            }`}
          />
        </div>
      </div>

      {/* Grid Principal: Monitor Facial en Vivo & Alertas de Vencimiento */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monitor en Vivo de Accesos */}
        <div className="lg:col-span-2 bg-card-theme border border-theme card-shadow-theme rounded-2xl p-6 transition-all duration-300">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-theme">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-xl ${
                  isCyber ? 'bg-volt/10 text-volt' : 'bg-sport-orange/10 text-sport-orange'
                }`}
              >
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-main-theme">
                  Últimos Accesos en Terminal Facial
                </h3>
                <p className="text-xs text-muted-theme">
                  Detección en tiempo real sincronizada con HikCentral
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Conectado</span>
            </div>
          </div>

          {stats?.ultimosAccesos && stats.ultimosAccesos.length > 0 ? (
            <div className="divide-y divide-theme">
              {stats.ultimosAccesos.map((acc, idx) => {
                const isConcedido = acc.tipo_evento === 'CONCEDIDO';
                return (
                  <div key={idx} className="py-3.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      {acc.foto_path ? (
                        <img
                          src={acc.foto_path}
                          alt="Foto Socio"
                          className="w-11 h-11 rounded-xl object-cover border-2 border-theme shrink-0"
                        />
                      ) : (
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                            isCyber
                              ? 'bg-slate-800 text-slate-300 border border-slate-700'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {acc.socio_nombre?.slice(0, 2).toUpperCase() || 'SN'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-main-theme truncate">
                          {acc.socio_nombre || 'Socio Desconocido'}
                        </p>
                        <span className="text-xs font-mono-numbers text-muted-theme">
                          {new Date(acc.fecha_hora).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 border ${
                        isConcedido
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/25'
                      }`}
                    >
                      {isConcedido ? '✓ Paso Concedido' : '✕ Acceso Denegado'}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-14 text-center text-muted-theme text-sm flex flex-col items-center justify-center gap-2">
              <ShieldCheck className="w-8 h-8 opacity-40" />
              <span>Esperando eventos de paso desde el lector Hikvision...</span>
            </div>
          )}
        </div>

        {/* Vencimientos Inmediatos */}
        <div className="bg-card-theme border border-theme card-shadow-theme rounded-2xl p-6 flex flex-col justify-between transition-all duration-300">
          <div>
            <div className="flex items-center gap-3 pb-4 mb-4 border-b border-theme">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-main-theme">
                  Vencen en &lt; 3 Días
                </h3>
                <p className="text-xs text-muted-theme">Cobro prioritario en recepción</p>
              </div>
            </div>

            {stats?.vencenPronto && stats.vencenPronto.length > 0 ? (
              <div className="space-y-3">
                {stats.vencenPronto.map((socio) => (
                  <div
                    key={socio.id}
                    className="p-3.5 rounded-xl bg-card-alt-theme border border-theme transition-all hover:border-amber-500/40"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-main-theme">{socio.nombre}</span>
                      <span className="text-xs font-bold text-amber-400 font-mono-numbers">
                        {socio.fecha_fin}
                      </span>
                    </div>
                    <p className="text-xs text-muted-theme mt-1">
                      Tel: <span className="font-mono-numbers">{socio.telefono || 'Sin teléfono'}</span>
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-muted-theme">
                No hay membresías por vencer próximamente.
              </div>
            )}
          </div>

          <button
            onClick={onNavigateCobro}
            className={`w-full mt-6 py-3 px-4 rounded-xl text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 ${
              isCyber
                ? 'bg-volt hover:bg-volt-hover text-black shadow-volt-glow'
                : 'bg-sport-orange hover:bg-sport-orange-hover text-white shadow-orange-glow'
            }`}
          >
            <span>Cobrar y Renovar Membresía</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
