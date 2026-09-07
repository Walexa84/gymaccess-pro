import React, { useState, useEffect } from 'react';
import { Database, Download, RefreshCw, CheckCircle2, ShieldAlert, Sparkles, HardDrive, RotateCcw, AlertTriangle, HelpCircle, Usb } from 'lucide-react';

interface BackupItem {
  filename: string;
  fullPath: string;
  sizeBytes: number;
  creadoEn: string;
}

export const RespaldosTab: React.FC = () => {
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creando, setCreando] = useState(false);
  const [restaurando, setRestaurando] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState<BackupItem | null>(null);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const cargarRespaldos = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/backups');
      if (res.ok) {
        const data = await res.json();
        setBackups(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error cargando respaldos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarRespaldos();
  }, []);

  const handleCrearRespaldo = async () => {
    setCreando(true);
    setMensaje(null);
    try {
      const res = await fetch('/api/backups/create', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Error creando respaldo');
      setMensaje({ tipo: 'ok', texto: '¡Copia atómica generada exitosamente vía VACUUM INTO!' });
      cargarRespaldos();
      setTimeout(() => setMensaje(null), 5000);
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: err.message });
    } finally {
      setCreando(false);
    }
  };

  const handleEjecutarRestauracion = async () => {
    if (!confirmRestore) return;
    setRestaurando(true);
    setMensaje(null);
    try {
      const res = await fetch(`/api/backups/restore/${encodeURIComponent(confirmRestore.filename)}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Error al restaurar respaldo');
      setMensaje({
        tipo: 'ok',
        texto: `¡Base de datos restaurada con éxito desde ${confirmRestore.filename}! Los datos han vuelto al punto de esa copia.`,
      });
      setConfirmRestore(null);
      cargarRespaldos();
      setTimeout(() => setMensaje(null), 7000);
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: err.message });
      setConfirmRestore(null);
    } finally {
      setRestaurando(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '0 KB';
    const kb = bytes / 1024;
    return kb > 1024 ? `${(kb / 1024).toFixed(2)} MB` : `${kb.toFixed(1)} KB`;
  };

  return (
    <div className="space-y-6">
      {/* Banner Superior */}
      <div className="p-6 rounded-2xl bg-card-theme border border-theme card-shadow-theme flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-accent-theme/10 text-accent-theme border border-highlight-theme shrink-0">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-main-theme">Copias de Seguridad Atómicas (SQLite WAL)</h3>
            <p className="text-xs text-muted-theme mt-0.5">
              Genera instantáneas en caliente de toda la base de datos sin interrumpir el cobro ni el acceso en torniquetes.
            </p>
          </div>
        </div>

        <button
          onClick={handleCrearRespaldo}
          disabled={creando}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-accent-theme text-black shadow-md hover:opacity-90 transition disabled:opacity-50 shrink-0"
        >
          {creando ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Generando Copia...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Crear Respaldo Ahora</span>
            </>
          )}
        </button>
      </div>

      {mensaje && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-3 border animate-fade-in ${
            mensaje.tipo === 'ok'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}
        >
          {mensaje.tipo === 'ok' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <ShieldAlert className="w-5 h-5 shrink-0" />}
          <span className="font-medium">{mensaje.texto}</span>
        </div>
      )}

      {/* Historial de Respaldos */}
      <div className="p-6 rounded-2xl bg-card-theme border border-theme card-shadow-theme space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-theme">
          <span className="text-xs font-bold text-main-theme uppercase tracking-wider flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-accent-theme" />
            Historial de Respaldos Locales ({backups.length})
          </span>
          <button
            onClick={cargarRespaldos}
            disabled={loading}
            className="text-xs font-bold text-muted-theme hover:text-main-theme transition flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refrescar</span>
          </button>
        </div>

        {backups.length === 0 ? (
          <div className="text-center py-10 text-muted-theme text-xs">
            No hay copias de seguridad generadas aún. Presiona "Crear Respaldo Ahora" para generar la primera.
          </div>
        ) : (
          <div className="space-y-3">
            {backups.map((b, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-theme-subtle border border-theme flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-highlight-theme transition"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold font-mono text-main-theme truncate">{b.filename}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 shrink-0">
                      Íntegro
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-theme mt-1">
                    {new Date(b.creadoEn).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })} • {formatSize(b.sizeBytes)}
                  </div>
                </div>

                {/* Botones de Acción: Descargar a USB y Restaurar */}
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={`/api/backups/download/${encodeURIComponent(b.filename)}`}
                    download={b.filename}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-theme border border-theme text-main-theme hover:bg-theme-hover hover:border-highlight-theme transition shadow-sm"
                    title="Descargar este archivo .db para guardarlo en USB o en la nube"
                  >
                    <Download className="w-3.5 h-3.5 text-accent-theme" />
                    <span>Descargar</span>
                  </a>

                  <button
                    onClick={() => setConfirmRestore(b)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition shadow-sm"
                    title="Restaurar toda la base de datos con esta copia"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restaurar</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tarjetas Didácticas de Ayuda Operativa */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-card-theme border border-theme card-shadow-theme space-y-2">
          <div className="flex items-center gap-2 text-main-theme font-bold text-xs uppercase tracking-wider">
            <Usb className="w-4 h-4 text-accent-theme" />
            <span>¿Cómo guardar tus copias en una USB?</span>
          </div>
          <p className="text-xs text-muted-theme leading-relaxed">
            Presiona el botón <strong className="text-main-theme">"Descargar"</strong> en cualquier respaldo. Tu navegador descargará el archivo <code className="text-accent-theme font-mono">.db</code> a tu carpeta de descargas. Simplemente cópialo a tu memoria USB o disco externo.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-card-theme border border-theme card-shadow-theme space-y-2">
          <div className="flex items-center gap-2 text-main-theme font-bold text-xs uppercase tracking-wider">
            <HelpCircle className="w-4 h-4 text-accent-theme" />
            <span>¿Qué pasa con los checadores al restaurar?</span>
          </div>
          <p className="text-xs text-muted-theme leading-relaxed">
            La base de datos local volverá con exactitud al día del respaldo. Para que los checadores físicos queden idénticos, ve a la pestaña de <strong className="text-main-theme">Personas</strong> y pulsa <strong className="text-accent-theme">"Triaje Checador"</strong> para sincronizarlos en 1 clic.
          </p>
        </div>
      </div>

      {/* Modal de Confirmación de Restauración Segura */}
      {confirmRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg p-6 rounded-3xl bg-card-theme border border-red-500/40 shadow-2xl space-y-5">
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-extrabold text-base text-main-theme">
                  ¿Restaurar copia de seguridad?
                </h4>
                <p className="text-xs text-muted-theme">
                  Estás a punto de reemplazar los datos actuales con una copia anterior.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-theme-subtle border border-theme text-xs space-y-2">
              <div className="font-mono text-accent-theme font-bold break-all">
                {confirmRestore.filename}
              </div>
              <div className="text-muted-theme text-[11px]">
                Fecha de la copia: <strong className="text-main-theme">{new Date(confirmRestore.creadoEn).toLocaleString('es-MX')}</strong> ({formatSize(confirmRestore.sizeBytes)})
              </div>
            </div>

            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs leading-relaxed space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Advertencia de Sobreescritura</span>
              </div>
              <p>
                Todos los socios dados de alta, pagos y cobros registrados con fecha posterior a esta copia serán reemplazados por el estado guardado en este archivo.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmRestore(null)}
                disabled={restaurando}
                className="px-4 py-2 rounded-xl text-xs font-bold text-muted-theme hover:text-main-theme hover:bg-theme transition"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleEjecutarRestauracion}
                disabled={restaurando}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-red-600 text-white hover:bg-red-700 transition shadow-lg shadow-red-600/30 disabled:opacity-50"
              >
                {restaurando ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Restaurando Base de Datos...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>Sí, Restaurar Copia Ahora</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
