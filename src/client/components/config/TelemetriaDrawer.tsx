import React, { useEffect, useState } from 'react';
import { 
  Activity, CheckCircle2, XCircle, Trash2, 
  RefreshCw, X
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface TelemetriaItem {
  id: number;
  fecha_hora: string;
  cuenta_id: number | null;
  cuenta_nombre: string | null;
  tipo_accion: string;
  recurso_id: string | null;
  recurso_nombre: string | null;
  latencia_ms: number;
  http_status: number | null;
  hct_error_code: string | null;
  hct_message: string | null;
  exito: number | boolean;
}

interface TelemetriaDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TelemetriaDrawer: React.FC<TelemetriaDrawerProps> = ({ isOpen, onClose }) => {
  const { theme } = useTheme();
  const isCyber = theme === 'cyber';

  const [logs, setLogs] = useState<TelemetriaItem[]>([]);
  const [cargando, setCargando] = useState(false);
  const [limpiando, setLimpiando] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const cargarTelemetria = async () => {
    try {
      setCargando(true);
      const res = await fetch('/api/access/telemetria?limit=60');
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err: any) {
      console.error('Error cargando telemetria:', err);
    } finally {
      setCargando(false);
    }
  };

  const handleLimpiar = async () => {
    if (!confirm('¿Deseas vaciar la bitácora de telemetría de hardware?')) return;
    try {
      setLimpiando(true);
      await fetch('/api/access/telemetria', { method: 'DELETE' });
      setLogs([]);
    } catch (err: any) {
      alert(`Error al limpiar: ${err.message}`);
    } finally {
      setLimpiando(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    cargarTelemetria();

    if (autoRefresh) {
      const interval = setInterval(cargarTelemetria, 3500);
      return () => clearInterval(interval);
    }
  }, [isOpen, autoRefresh]);

  if (!isOpen) return null;

  const formatearFechaHora = (isoStr: string) => {
    try {
      let s = isoStr.trim();
      if (!s.includes('T') && s.includes(' ')) {
        s = s.replace(' ', 'T') + 'Z';
      } else if (!s.endsWith('Z') && !s.includes('+') && !s.includes('-')) {
        s = s + 'Z';
      }
      const d = new Date(s);
      if (isNaN(d.getTime())) return isoStr;
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-2xl h-full bg-card-theme border-l border-theme shadow-2xl flex flex-col transition-all overflow-hidden"
      >
        <div className="p-4 sm:p-5 border-b border-theme flex items-center justify-between gap-3 bg-theme-subtle">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm sm:text-base text-main-theme flex items-center gap-2">
                Bitácora de Telemetría OpenAPI
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 font-mono border border-cyan-500/20">
                  En Vivo
                </span>
              </h3>
              <p className="text-[11px] text-muted-theme">
                Auditoría en tiempo real de latencias, códigos HTTP y estados de Hikvision Teams
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              title={autoRefresh ? 'Pausar auto-actualización' : 'Activar auto-actualización'}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition ${
                autoRefresh 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                  : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
              }`}
            >
              {autoRefresh ? '● Auto (3s)' : '○ Pausado'}
            </button>

            <button
              onClick={cargarTelemetria}
              disabled={cargando}
              className="p-1.5 rounded-lg border border-theme bg-card-theme text-muted-theme hover:text-cyan-400 transition"
              title="Actualizar ahora"
            >
              <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin text-cyan-400' : ''}`} />
            </button>

            <button
              onClick={handleLimpiar}
              disabled={limpiando || logs.length === 0}
              className="p-1.5 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition disabled:opacity-30"
              title="Vaciar bitácora"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg border border-theme bg-card-theme text-muted-theme hover:text-main-theme transition"
              title="Cerrar panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-5 py-2.5 bg-theme-subtle/50 border-b border-theme flex flex-wrap items-center justify-between gap-3 text-[11px]">
          <span className="text-muted-theme">
            Registros: <strong className="text-main-theme">{logs.length}</strong> eventos recientes
          </span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span> &lt;1.0s (Excelente)
            </span>
            <span className="flex items-center gap-1 text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span> 1-3s (Normal Nube)
            </span>
            <span className="flex items-center gap-1 text-red-400">
              <span className="w-2 h-2 rounded-full bg-red-400"></span> &gt;3s / Timeout
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {logs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted-theme space-y-2">
              <Activity className="w-10 h-10 opacity-30 text-cyan-400" />
              <p className="text-xs font-semibold text-main-theme">No hay registros de telemetría aún</p>
              <p className="text-[11px] max-w-sm">
                Realiza una prueba de apertura de torniquete o sincronización de equipos para registrar latencias y respuestas en vivo.
              </p>
            </div>
          ) : (
            logs.map((item) => {
              const isOk = item.exito === 1 || item.exito === true;
              const isLatencyFast = item.latencia_ms < 1000;
              const isLatencyMedium = item.latencia_ms >= 1000 && item.latencia_ms < 3000;

              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isOk
                      ? 'bg-card-theme border-theme hover:border-cyan-500/30'
                      : 'bg-red-500/5 border-red-500/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      {isOk ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                      )}
                      <div>
                        <span className="font-bold text-xs text-main-theme">
                          {item.tipo_accion === 'APERTURA_PUERTA' ? '🚪 Apertura de Torniquete' : item.tipo_accion}
                        </span>
                        <span className="text-[10px] text-muted-theme block">
                          {item.cuenta_nombre || 'Cuenta Teams'} • {formatearFechaHora(item.fecha_hora)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${
                        isLatencyFast 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : isLatencyMedium
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        ⚡ {item.latencia_ms} ms
                      </span>

                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                        item.http_status === 200
                          ? 'bg-zinc-500/10 text-zinc-300 border-zinc-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        HTTP {item.http_status || '0'}
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] space-y-1 bg-theme-subtle/60 p-2.5 rounded-lg font-mono">
                    <div className="flex items-center justify-between text-muted-theme">
                      <span>Recurso:</span>
                      <span className="text-main-theme font-semibold truncate max-w-[280px]">
                        {item.recurso_nombre || item.recurso_id || 'N/A'}
                      </span>
                    </div>

                    <div className="flex items-start justify-between gap-2">
                      <span className="text-muted-theme shrink-0">Código Teams:</span>
                      <span className={`font-bold ${isOk ? 'text-emerald-400' : 'text-red-400'}`}>
                        {item.hct_error_code || (isOk ? '0 (SUCCESS)' : 'ERROR')}
                      </span>
                    </div>

                    {item.hct_message && (
                      <div className="flex items-start justify-between gap-2 pt-1 border-t border-theme/40">
                        <span className="text-muted-theme shrink-0">Mensaje:</span>
                        <span className={`text-right ${isOk ? 'text-zinc-300' : 'text-red-300 font-semibold'}`}>
                          {item.hct_message}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
