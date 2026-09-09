import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, RefreshCw, ExternalLink, HelpCircle, 
  DoorOpen, CheckCircle2, BookOpen, AlertCircle, Package
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface NivelAcceso {
  id: number;
  nombre: string;
  cloud_level_id: string;
  cuenta_hct_id: number;
  cuenta_nombre: string;
  es_staff?: number;
}

export const NivelesAccesoTab: React.FC = () => {
  const { theme } = useTheme();
  const isCyber = theme === 'cyber';

  const [niveles, setNiveles] = useState<NivelAcceso[]>([]);
  const [planes, setPlanes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [mostrarGuia, setMostrarGuia] = useState(false);

  const handleToggleStaff = async (nivelId: number) => {
    try {
      const res = await fetch(`/api/iam/niveles-acceso/${nivelId}/toggle-staff`, { method: 'PATCH' });
      if (res.ok) {
        const data = await res.json();
        setNiveles(prev => prev.map(n => n.id === nivelId ? { ...n, es_staff: data.es_staff } : n));
      }
    } catch (err) {
      console.error('Error conmutando nivel de staff:', err);
    }
  };

  const cargarNiveles = async () => {
    try {
      setLoading(true);
      const [resNiveles, resPlanes] = await Promise.all([
        fetch('/api/iam/niveles-acceso'),
        fetch('/api/gym/planes'),
      ]);

      if (resNiveles.ok) {
        const data = await resNiveles.json();
        if (Array.isArray(data)) setNiveles(data);
      }

      if (resPlanes.ok) {
        const dataP = await resPlanes.json();
        if (Array.isArray(dataP)) setPlanes(dataP);
      }
    } catch (err) {
      console.error('Error cargando niveles de acceso y planes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarNiveles();
  }, []);

  const handleSyncAll = async () => {
    try {
      setSyncing(true);
      setSyncStatus('Sincronizando con Hik-Connect Teams...');
      const resCuentas = await fetch('/api/access/cuentas-hct');
      const cuentas = await resCuentas.json();
      
      if (Array.isArray(cuentas) && cuentas.length > 0) {
        for (const c of cuentas) {
          await fetch(`/api/access/cuentas-hct/${c.id}/sync`, { method: 'POST' });
        }
        await cargarNiveles();
        setSyncStatus('¡Sincronización completada con éxito!');
      } else {
        setSyncStatus('No se encontraron cuentas HCT configuradas.');
      }
    } catch (err: any) {
      setSyncStatus(`Error al sincronizar: ${err.message || 'Fallo de red'}`);
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncStatus(null), 4000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tarjeta de Guía Paso a Paso para el Administrador / Dueño */}
      <div className={`p-6 rounded-2xl border ${
        isCyber ? 'bg-[#0f172a]/80 border-cyan-500/30' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2.5 rounded-xl ${isCyber ? 'bg-cyan-500/10 text-cyan-400' : 'bg-cyan-50 text-cyan-600'}`}>
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-main-theme">
              📘 ¿Cómo configurar Zonas y Niveles de Acceso (Torniquetes, Albercas, VIP)?
            </h3>
            <p className="text-xs text-muted-theme mt-0.5">
              Por especificación de Hikvision Teams OpenAPI, los niveles de acceso y horarios se crean en el portal de Teams una sola vez y se sincronizan aquí con 1 clic.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {/* Paso 1 */}
          <div className={`p-4 rounded-xl border flex flex-col justify-between ${
            isCyber ? 'bg-[#1e293b]/50 border-slate-700/60' : 'bg-slate-50 border-slate-200'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  isCyber ? 'bg-cyan-500/20 text-cyan-300' : 'bg-cyan-100 text-cyan-700'
                }`}>
                  Paso 1: En Teams
                </span>
                <ExternalLink className="w-4 h-4 text-muted-theme" />
              </div>
              <h4 className="text-sm font-bold text-main-theme">Crear el Nivel en la Nube</h4>
              <p className="text-xs text-muted-theme mt-2 leading-relaxed">
                Entra a tu cuenta en <strong className="text-main-theme">Hik-Connect Teams</strong> ➔ <em>Control de Acceso</em> ➔ <em>Nivel de Acceso</em> ➔ <em>+ Añadir Nivel</em>.
              </p>
              <p className="text-xs text-muted-theme mt-1 leading-relaxed">
                Asigna un nombre descriptivo (ej: <span className="text-cyan-400 font-mono">Entrada General</span> o <span className="text-cyan-400 font-mono">Zona Alberca / Spa</span>), selecciona los torniquetes permitidos y su horario (ej. 24/7).
              </p>
            </div>
          </div>

          {/* Paso 2 */}
          <div className={`p-4 rounded-xl border flex flex-col justify-between ${
            isCyber ? 'bg-[#1e293b]/50 border-slate-700/60' : 'bg-slate-50 border-slate-200'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  isCyber ? 'bg-volt/20 text-volt' : 'bg-amber-100 text-amber-800'
                }`}>
                  Paso 2: En GymAccess
                </span>
                <RefreshCw className="w-4 h-4 text-muted-theme" />
              </div>
              <h4 className="text-sm font-bold text-main-theme">Sincronizar Niveles</h4>
              <p className="text-xs text-muted-theme mt-2 leading-relaxed">
                Presiona el botón <strong className="text-main-theme">Actualizar Zonas / Puertas</strong> aquí abajo.
              </p>
              <p className="text-xs text-muted-theme mt-1 leading-relaxed">
                El sistema descargará automáticamente los identificadores de nube y vinculará las puertas correspondientes en la base de datos local (no transfiere personas; para socios/staff usa Triaje).
              </p>
            </div>
          </div>

          {/* Paso 3 */}
          <div className={`p-4 rounded-xl border flex flex-col justify-between ${
            isCyber ? 'bg-[#1e293b]/50 border-slate-700/60' : 'bg-slate-50 border-slate-200'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  isCyber ? 'bg-green-500/20 text-green-300' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  Paso 3: En Operación
                </span>
                <CheckCircle2 className="w-4 h-4 text-muted-theme" />
              </div>
              <h4 className="text-sm font-bold text-main-theme">Vincular a Planes y Staff</h4>
              <p className="text-xs text-muted-theme mt-2 leading-relaxed">
                - <strong>Socios:</strong> En Punto de Venta ➔ Planes, enlazas qué niveles incluye cada paquete comercial.
              </p>
              <p className="text-xs text-muted-theme mt-1 leading-relaxed">
                - <strong>Staff:</strong> Al registrar empleados en Personas, marcas directamente las áreas autorizadas sin necesidad de cobrar un plan.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Acciones y Listado de Niveles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-display font-bold text-base text-main-theme flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            Niveles de Acceso Sincronizados ({niveles.length})
          </h3>
          <p className="text-xs text-muted-theme">
            Zonas y permisos disponibles para vincular a paquetes comerciales y empleados
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMostrarGuia(prev => !prev)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition ${
              mostrarGuia
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                : 'bg-theme-subtle text-muted-theme hover:text-main-theme border-theme'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>{mostrarGuia ? 'Cerrar Guía' : '❓ Guía de Horarios Staff'}</span>
          </button>

          <button
            onClick={handleSyncAll}
            disabled={syncing}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              isCyber
                ? 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-lg shadow-cyan-500/20'
                : 'bg-cyan-600 hover:bg-cyan-700 text-white shadow'
            } ${syncing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Actualizando...' : '🔄 Actualizar Zonas / Puertas'}</span>
          </button>
        </div>
      </div>

      {/* Guía Rápida Desplegable de Configuración en Teams */}
      {mostrarGuia && (
        <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-amber-300 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-400" />
              Guía Paso a Paso: ¿Cómo crear un Nivel y Horario para Empleados en Hik-Connect Teams?
            </h4>
            <button
              onClick={() => setMostrarGuia(false)}
              className="text-amber-400/80 hover:text-amber-200 text-xs font-bold px-2 py-0.5 rounded-lg hover:bg-amber-500/20"
            >
              Entendido / Cerrar
            </button>
          </div>
          <p className="text-xs text-muted-theme leading-relaxed">
            Hik-Connect Teams gobierna las puertas físicas y los horarios desde su plataforma oficial en la nube. Sigue estos 3 sencillos pasos:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            <div className="p-3.5 rounded-xl bg-black/40 border border-amber-500/20 space-y-1.5">
              <span className="text-[10px] font-bold text-amber-400 font-mono uppercase">Paso 1: Entrar al Portal</span>
              <p className="text-xs text-main-theme">
                Ingresa con tu cuenta en <a href="https://ius.hikcentralconnect.com" target="_blank" rel="noreferrer" className="text-cyan-400 underline font-semibold">ius.hikcentralconnect.com</a> o desde la app oficial Hik-Partner Pro.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-black/40 border border-amber-500/20 space-y-1.5">
              <span className="text-[10px] font-bold text-amber-400 font-mono uppercase">Paso 2: Crear el Nivel y Horario</span>
              <p className="text-xs text-main-theme">
                Ve a <strong>Control de Acceso ➔ Niveles de Acceso</strong>. Pulsa <em>Agregar</em>, dale un nombre (ej. <em>"Personal 24/7"</em> o <em>"Staff Limpieza"</em>), marca las puertas autorizadas y selecciona su plantilla horaria.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-black/40 border border-amber-500/20 space-y-1.5">
              <span className="text-[10px] font-bold text-amber-400 font-mono uppercase">Paso 3: Sincronizar y Marcar</span>
              <p className="text-xs text-main-theme">
                Regresa aquí y haz clic en <strong>🔄 Actualizar Zonas / Puertas</strong>. En su tarjeta, pulsa <strong>[⭐ Marcar como Nivel de Staff]</strong> para que se preseleccione solo al dar de alta empleados.
              </p>
            </div>
          </div>
        </div>
      )}

      {syncStatus && (
        <div className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 border ${
          syncStatus.includes('éxito')
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
        }`}>
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{syncStatus}</span>
        </div>
      )}

      {/* Grid de Tarjetas de Niveles */}
      {loading ? (
        <div className="text-center py-10 text-muted-theme text-sm">Cargando niveles...</div>
      ) : niveles.length === 0 ? (
        <div className={`p-8 text-center rounded-2xl border ${
          isCyber ? 'bg-theme-subtle border-theme' : 'bg-slate-50 border-slate-200'
        }`}>
          <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
          <p className="text-sm font-bold text-main-theme">No hay niveles de acceso sincronizados</p>
          <p className="text-xs text-muted-theme mt-1 max-w-md mx-auto">
            Crea tu primer nivel de acceso en el portal de Hik-Connect Teams y luego presiona el botón "Sincronizar con Teams".
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {niveles.map((n) => {
            const planesQueAbren = planes.filter(p => 
              p.nivel_ids?.includes(n.id) || 
              p.niveles?.some((x: any) => x.id === n.id) ||
              p.nivel_acceso_id === n.id
            );

            return (
              <div
                key={n.id}
                className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                  n.es_staff === 1
                    ? 'bg-purple-500/5 border-purple-500/30 shadow-sm'
                    : isCyber 
                    ? 'bg-theme-subtle border-theme hover:border-cyan-500/50' 
                    : 'bg-white border-slate-200 hover:border-cyan-400 shadow-sm'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isCyber ? 'bg-cyan-500/20 text-cyan-300' : 'bg-cyan-100 text-cyan-800'
                    }`}>
                      {n.cuenta_nombre}
                    </span>
                    {n.es_staff === 1 ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-purple-400" />
                        Staff / Personal
                      </span>
                    ) : (
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    )}
                  </div>
                  <h4 className="font-bold text-sm text-main-theme">{n.nombre}</h4>
                  <div className="mt-2 space-y-1 text-[11px] text-muted-theme font-mono">
                    <div>Cloud ID: <span className="text-main-theme">{n.cloud_level_id}</span></div>
                    <div>ID Interno: <span className="text-main-theme">{n.id}</span></div>
                  </div>

                  {/* Paquetes Comerciales que otorgan este nivel */}
                  <div className="mt-3 pt-3 border-t border-theme/50">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-theme uppercase tracking-wider mb-2">
                      <Package className="w-3.5 h-3.5 text-accent-theme" />
                      <span>Paquetes que lo incluyen ({planesQueAbren.length})</span>
                    </div>

                    {planesQueAbren.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {planesQueAbren.map(p => (
                          <span
                            key={p.id}
                            className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-theme border border-theme text-main-theme flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                            {p.nombre}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-theme italic block">
                        No asignado a ningún paquete comercial (Exclusivo o para personal).
                      </span>
                    )}
                  </div>

                  {/* Conmutador de Asignación a Staff */}
                  <div className="mt-3 pt-3 border-t border-theme/50">
                    <button
                      type="button"
                      onClick={() => handleToggleStaff(n.id)}
                      className={`w-full py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
                        n.es_staff === 1
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 hover:bg-purple-500/30'
                          : 'bg-theme text-muted-theme border-theme hover:text-main-theme'
                      }`}
                      title="Al marcarlo como Staff, se seleccionará automáticamente al dar de alta a empleados"
                    >
                      <ShieldCheck className={`w-3.5 h-3.5 ${n.es_staff === 1 ? 'text-purple-400' : 'text-muted-theme'}`} />
                      <span>{n.es_staff === 1 ? '⭐ Nivel de Staff (Auto-seleccionar)' : '+ Marcar como Nivel de Staff'}</span>
                    </button>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-theme/60 flex items-center justify-between text-xs text-muted-theme">
                  <span className="flex items-center gap-1">
                    <DoorOpen className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{n.es_staff === 1 ? 'Puerta para Empleados' : 'Disponible para socios y staff'}</span>
                  </span>
                  <span className="text-emerald-400 text-[10px] font-bold uppercase tracking-wider">Activo</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
