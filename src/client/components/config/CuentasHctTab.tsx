import React, { useState, useEffect } from 'react';
import { 
  Cloud, Plus, RefreshCw, Key, ShieldCheck, AlertCircle, Building2, 
  Trash2, Cpu, CheckCircle2, ChevronUp, Radio, DoorOpen, Zap, AlertTriangle,
  Activity, Edit2
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { TelemetriaDrawer } from './TelemetriaDrawer';

interface CuentasHctTabProps {
  cuentas: any[];
  setCuentas: (c: any[]) => void;
  onRefreshAll: () => void;
}

export const CuentasHctTab: React.FC<CuentasHctTabProps> = ({ cuentas, setCuentas, onRefreshAll }) => {
  const { theme } = useTheme();
  const isCyber = theme === 'cyber';

  const [mostrarTelemetria, setMostrarTelemetria] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nuevaCuenta, setNuevaCuenta] = useState({
    nombre: '',
    app_key: '',
    secret_key: '',
    region: 'https://ius.hikcentralconnect.com/api',
    custom_url: '',
    notas: '',
  });

  const [guardando, setGuardando] = useState(false);
  const [syncingId, setSyncingId] = useState<number | null>(null);
  const [syncMsg, setSyncMsg] = useState<{ id: number; ok: boolean; text: string } | null>(null);
  const [testingDeviceId, setTestingDeviceId] = useState<number | null>(null);
  const [openingDoorId, setOpeningDoorId] = useState<string | null>(null);
  const [doorActionMsg, setDoorActionMsg] = useState<{ id: string; ok: boolean; text: string } | null>(null);

  // Auto-actualizar lista de cuentas cuando el heartbeat detecte cambios de hardware
  useEffect(() => {
    const eventSource = new EventSource('/api/access/events/stream');
    eventSource.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'HARDWARE_STATUS') {
          fetch('/api/access/cuentas-hct')
            .then((r) => r.json())
            .then(setCuentas)
            .catch(() => {});
        }
      } catch {}
    };
    return () => eventSource.close();
  }, [setCuentas]);

  const formatHoraLocal = (fechaStr?: string | null) => {
    if (!fechaStr) return 'Nunca';
    try {
      let s = fechaStr.trim();
      if (!s.includes('T') && s.includes(' ')) {
        s = s.replace(' ', 'T') + 'Z';
      } else if (!s.endsWith('Z') && !s.includes('+') && !s.includes('-')) {
        s = s + 'Z';
      }
      const d = new Date(s);
      return isNaN(d.getTime()) ? fechaStr : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return fechaStr;
    }
  };

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaCuenta.nombre || !nuevaCuenta.app_key || !nuevaCuenta.secret_key) {
      alert('Por favor completa el nombre, App Key y Secret Key');
      return;
    }

    try {
      setGuardando(true);
      let baseUrl = nuevaCuenta.region === 'custom' ? nuevaCuenta.custom_url : nuevaCuenta.region;
      // Auto-corregir error tipográfico 1us por ius
      baseUrl = (baseUrl || 'https://ius.hikcentralconnect.com/api').replace(/1us\.hikcentralconnect/gi, 'ius.hikcentralconnect');

      const res = await fetch('/api/access/cuentas-hct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nuevaCuenta.nombre,
          app_key: nuevaCuenta.app_key,
          secret_key: nuevaCuenta.secret_key,
          base_url: baseUrl,
          notas: nuevaCuenta.notas,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setNuevaCuenta({
          nombre: '',
          app_key: '',
          secret_key: '',
          region: 'https://ius.hikcentralconnect.com/api',
          custom_url: '',
          notas: '',
        });
        setMostrarForm(false);
        const list = await (await fetch('/api/access/cuentas-hct')).json();
        setCuentas(list);
        onRefreshAll();
      } else {
        alert(`Error al registrar cuenta: ${data.error || 'Fallo de servidor'}`);
      }
    } catch (err: any) {
      alert(`Error de red: ${err.message}`);
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (id: number, nombre: string) => {
    if (!confirm(`¿Deseas desvincular la cuenta [${nombre}]?`)) return;
    await fetch(`/api/access/cuentas-hct/${id}`, { method: 'DELETE' });
    const list = await (await fetch('/api/access/cuentas-hct')).json();
    setCuentas(list);
    onRefreshAll();
  };

  const handleSyncCuenta = async (id: number) => {
    try {
      setSyncingId(id);
      setSyncMsg(null);
      const res = await fetch(`/api/access/cuentas-hct/${id}/sync`, { method: 'POST' });
      const data = await res.json();
      setSyncMsg({ id, ok: res.ok, text: data.message || data.error });
      const list = await (await fetch('/api/access/cuentas-hct')).json();
      setCuentas(list);
      onRefreshAll();
    } catch (err: any) {
      setSyncMsg({ id, ok: false, text: `Error de conexión: ${err.message}` });
    } finally {
      setSyncingId(null);
    }
  };

  const handleRenombrarEquipo = async (dispId: number, nombreActual: string) => {
    const nuevo = prompt('Nuevo nombre para el checador (se actualizará en Teams y en local):', nombreActual);
    if (!nuevo || !nuevo.trim() || nuevo.trim() === nombreActual) return;
    try {
      const res = await fetch(`/api/access/dispositivos/${dispId}/rename`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nuevo.trim() }),
      });
      const data = await res.json();
      alert(data.message || 'Equipo renombrado');
      onRefreshAll();
    } catch (e: any) {
      alert('Error al renombrar: ' + e.message);
    }
  };

  const handleProbarConexionDispositivo = async (dispId: number) => {
    try {
      setTestingDeviceId(dispId);
      const res = await fetch(`/api/access/dispositivos/${dispId}/test`, { method: 'POST' });
      const data = await res.json();
      alert(data.message || (data.online ? 'Equipo ONLINE en Teams' : 'Equipo OFFLINE'));
      const list = await (await fetch('/api/access/cuentas-hct')).json();
      setCuentas(list);
    } catch (err: any) {
      alert(`Error de comunicación: ${err.message}`);
    } finally {
      setTestingDeviceId(null);
    }
  };

  const handleProbarAperturaPuerta = async (cuentaId: number, resourceId: string) => {
    try {
      setOpeningDoorId(resourceId);
      setDoorActionMsg(null);
      const res = await fetch(`/api/access/cuentas-hct/${cuentaId}/doors/${resourceId}/open`, { method: 'POST' });
      const data = await res.json();
      const latencyText = data.latencyMs !== undefined ? ` (${data.latencyMs} ms)` : '';
      const errorDetail = !data.success && data.errorCode ? ` [${data.errorCode}]` : '';
      setDoorActionMsg({ 
        id: resourceId, 
        ok: data.success, 
        text: `${data.message || (data.success ? 'Apertura enviada con éxito' : 'Fallo de apertura')}${latencyText}${errorDetail}` 
      });
      setTimeout(() => setDoorActionMsg(null), 5000);
    } catch (err: any) {
      setDoorActionMsg({ id: resourceId, ok: false, text: `Error de red: ${err.message}` });
    } finally {
      setOpeningDoorId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-display font-extrabold text-xl text-main-theme flex items-center gap-2">
            <Cloud className="w-5 h-5 text-cyan-400" />
            Cuentas Hik-Connect Teams (Multi-Sucursal / Multi-Tenant)
          </h3>
          <p className="text-xs text-muted-theme mt-0.5">
            Cada cuenta gratuita de Teams incluye hasta <strong>100 usuarios y 10 puertas</strong>. Al agregar una cuenta, el sistema obtiene automáticamente sus equipos y accesos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setMostrarTelemetria(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border border-theme bg-theme-subtle hover:text-cyan-400 hover:border-cyan-500/40 transition shrink-0"
            title="Ver latencias en milisegundos, códigos HTTP y respuestas en vivo"
          >
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>Bitácora & Telemetría</span>
          </button>

          <button
            onClick={() => setMostrarForm(!mostrarForm)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shadow shrink-0 ${
              isCyber ? 'bg-cyan-500 hover:bg-cyan-400 text-black' : 'bg-cyan-600 hover:bg-cyan-500 text-white'
            }`}
          >
            {mostrarForm ? <ChevronUp className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            <span>{mostrarForm ? 'Cerrar Formulario' : 'Conectar Nueva Cuenta Teams'}</span>
          </button>
        </div>
      </div>

      {/* Formulario de Alta de Cuenta */}
      {mostrarForm && (
        <form onSubmit={handleCrear} className="p-5 rounded-2xl bg-card-theme border border-cyan-500/30 card-shadow-theme space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-main-theme flex items-center gap-2">
              <Key className="w-4 h-4 text-cyan-400" />
              Registrar Nueva Cuenta de Hik-Connect Teams
            </h4>
            <span className="text-[11px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-semibold border border-cyan-500/20">
              OpenAPI V2.11
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-muted-theme block mb-1">Nombre de la Sucursal / Cuenta *</label>
              <input type="text" required placeholder="Ej. Sucursal Araucarias" value={nuevaCuenta.nombre} onChange={(e) => setNuevaCuenta({ ...nuevaCuenta, nombre: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-theme-subtle border border-theme text-xs text-main-theme focus:outline-none focus:border-cyan-400" />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-theme block mb-1">App Key (AK) *</label>
              <input type="text" required placeholder="AK obtenida en Teams" value={nuevaCuenta.app_key} onChange={(e) => setNuevaCuenta({ ...nuevaCuenta, app_key: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-theme-subtle border border-theme text-xs text-main-theme font-mono focus:outline-none focus:border-cyan-400" />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-theme block mb-1">Secret Key (SK) *</label>
              <input type="password" required placeholder="••••••••••••••••" value={nuevaCuenta.secret_key} onChange={(e) => setNuevaCuenta({ ...nuevaCuenta, secret_key: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-theme-subtle border border-theme text-xs text-main-theme font-mono focus:outline-none focus:border-cyan-400" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-muted-theme block mb-1">Región / Servidor de Teams</label>
              <select
                value={nuevaCuenta.region}
                onChange={(e) => setNuevaCuenta({ ...nuevaCuenta, region: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-theme-subtle border border-theme text-xs text-main-theme focus:outline-none focus:border-cyan-400"
              >
                <option value="https://ius.hikcentralconnect.com/api">América / México (Syscom) — ius.hikcentralconnect.com</option>
                <option value="https://ieu.hikcentralconnect.com/api">Europa — ieu.hikcentralconnect.com</option>
                <option value="custom">URL Personalizada</option>
              </select>

              {nuevaCuenta.region === 'custom' && (
                <input
                  type="text"
                  placeholder="https://ius.hikcentralconnect.com/api"
                  value={nuevaCuenta.custom_url}
                  onChange={(e) => setNuevaCuenta({ ...nuevaCuenta, custom_url: e.target.value })}
                  className="w-full mt-2 px-3 py-2 rounded-xl bg-theme-subtle border border-theme text-xs text-main-theme font-mono focus:outline-none focus:border-cyan-400"
                />
              )}
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={guardando}
                className={`w-full py-2 px-4 rounded-xl text-xs font-bold transition shadow flex items-center justify-center gap-2 ${
                  isCyber ? 'bg-volt text-black hover:bg-volt/90' : 'bg-sport-orange text-white hover:bg-sport-orange/90'
                }`}
              >
                {guardando ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                <span>{guardando ? 'Conectando con Teams...' : 'Guardar y Obtener Equipos'}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Lista de Cuentas Teams Conectadas */}
      <div className="space-y-5">
        {cuentas.length === 0 ? (
          <div className="p-8 rounded-2xl bg-card-theme border border-theme text-center space-y-3">
            <Cloud className="w-12 h-12 mx-auto text-cyan-400/50" />
            <h4 className="font-bold text-base text-main-theme">No hay cuentas de Teams registradas</h4>
            <p className="text-xs text-muted-theme max-w-md mx-auto">
              Presiona el botón superior <strong>"Conectar Nueva Cuenta Teams"</strong> para ingresar tus credenciales OpenAPI y sincronizar tus checadores y puertas físicas.
            </p>
          </div>
        ) : (
          cuentas.map((c) => (
            <div key={c.id} className="p-5 rounded-2xl bg-card-theme border border-theme card-shadow-theme space-y-4">
              {/* Cabecera de la Cuenta */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-theme">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-main-theme flex items-center gap-2">
                      {c.nombre}
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                        🟢 Conectada
                      </span>
                    </h4>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-theme mt-0.5">
                      <span className="font-mono">AK: {c.app_key_masked || '••••••••'}</span>
                      <span>•</span>
                      <span>{c.total_dispositivos || 0} Equipos</span>
                      <span>•</span>
                      <span>{c.total_accesos || 0} Puertas / Accesos</span>
                      <span>•</span>
                      <span>100 Usuarios Gratis</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSyncCuenta(c.id)}
                    disabled={syncingId === c.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-theme bg-theme-subtle hover:text-cyan-400 transition"
                    title="Volver a consultar la nube de Teams para actualizar equipos y accesos"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncingId === c.id ? 'animate-spin' : ''}`} />
                    <span>{syncingId === c.id ? 'Sincronizando...' : 'Sincronizar Equipos'}</span>
                  </button>

                  <button
                    onClick={() => handleEliminar(c.id, c.nombre)}
                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition"
                    title="Desvincular cuenta"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Mensaje de resultado de Sincronización */}
              {syncMsg && syncMsg.id === c.id && (
                <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                  syncMsg.ok ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}>
                  {syncMsg.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{syncMsg.text}</span>
                </div>
              )}

              {/* Lista de Equipos y Accesos Detectados de esta Cuenta */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs uppercase tracking-wider font-extrabold text-muted-theme flex items-center gap-2">
                    <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                    Equipos & Accesos de esta Cuenta ({c.equipos?.length || 0})
                  </h5>
                  <span className="text-[10px] text-muted-theme">
                    Último Sync: {formatHoraLocal(c.ultimo_sync)}
                  </span>
                </div>

                {(!c.equipos || c.equipos.length === 0) ? (
                  <div className="p-4 rounded-xl bg-theme-subtle border border-theme text-center space-y-1">
                    <p className="text-xs font-semibold text-main-theme">No se encontraron equipos en esta cuenta de Teams</p>
                    <p className="text-[11px] text-muted-theme">
                      Verifica que tu terminal biométrica esté vinculada en la app o portal web de Hik-Connect Teams y presiona <strong>"Sincronizar Equipos"</strong>.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {c.equipos.map((eq: any) => (
                      <div key={eq.id} className="p-4 rounded-xl bg-theme-subtle border border-theme space-y-3">
                        {/* Cabecera del Equipo */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                              <Cpu className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <h6 className="font-bold text-xs text-main-theme">{eq.nombre}</h6>
                                <button
                                  onClick={() => handleRenombrarEquipo(eq.id, eq.nombre)}
                                  className="text-muted-theme hover:text-cyan-400 transition p-0.5"
                                  title="Renombrar en Teams y localmente"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              </div>
                              <span className="text-[10px] font-mono text-muted-theme block">
                                Serie: {eq.cloud_serial || 'S/N'} • {eq.firmware_version || 'Hikvision'}
                              </span>
                            </div>
                          </div>

                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                            eq.estado_conexion === 'ONLINE'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : eq.estado_conexion === 'ERROR'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}>
                            {eq.estado_conexion === 'ONLINE' ? '🟢 ONLINE' : eq.estado_conexion === 'ERROR' ? '⚠️ ERROR' : '🔴 OFFLINE'}
                          </span>
                        </div>

                        {/* Accesos / Puertas del equipo */}
                        <div className="p-2.5 rounded-lg bg-card-theme border border-theme space-y-2">
                          <span className="text-[10px] uppercase font-bold text-muted-theme block">
                            Puertas / Accesos Físicos ({eq.accesos?.length || 0})
                          </span>

                          {(!eq.accesos || eq.accesos.length === 0) ? (
                            <span className="text-[11px] text-muted-theme italic block">Canal de relevador 1</span>
                          ) : (
                            eq.accesos.map((acc: any) => (
                              <div key={acc.id} className="flex items-center justify-between gap-2 text-xs">
                                <div className="flex items-center gap-1.5 truncate">
                                  <DoorOpen className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                                  <span className="font-semibold text-main-theme truncate">{acc.nombre}</span>
                                </div>

                                {acc.cloud_resource_id && (
                                  <button
                                    onClick={() => handleProbarAperturaPuerta(c.id, acc.cloud_resource_id)}
                                    disabled={openingDoorId === acc.cloud_resource_id}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 shrink-0 ${
                                      isCyber ? 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30' : 'bg-cyan-600/10 text-cyan-600 hover:bg-cyan-600/20'
                                    }`}
                                    title="Manda un pulso de apertura inmediata a este relevador en Teams"
                                  >
                                    <DoorOpen className={`w-3 h-3 ${openingDoorId === acc.cloud_resource_id ? 'animate-pulse' : ''}`} />
                                    <span>{openingDoorId === acc.cloud_resource_id ? 'Abriendo...' : 'Probar Apertura'}</span>
                                  </button>
                                )}
                              </div>
                            ))
                          )}
                        </div>

                        {doorActionMsg && eq.accesos?.some((a: any) => a.cloud_resource_id === doorActionMsg.id) && (
                          <div className={`p-2 rounded-lg text-[11px] flex items-center gap-1.5 ${doorActionMsg.ok ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                            {doorActionMsg.ok ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
                            <span>{doorActionMsg.text}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-end pt-1">
                          <button
                            onClick={() => handleProbarConexionDispositivo(eq.id)}
                            disabled={testingDeviceId === eq.id}
                            className="flex items-center gap-1 text-[11px] font-bold text-muted-theme hover:text-cyan-400 transition"
                          >
                            <Zap className={`w-3 h-3 ${testingDeviceId === eq.id ? 'animate-spin' : ''}`} />
                            <span>{testingDeviceId === eq.id ? 'Verificando...' : 'Verificar Ping en Vivo'}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Drawer de Telemetría OpenAPI en Vivo */}
      <TelemetriaDrawer
        isOpen={mostrarTelemetria}
        onClose={() => setMostrarTelemetria(false)}
      />
    </div>
  );
};
