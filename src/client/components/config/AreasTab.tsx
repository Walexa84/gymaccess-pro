import React, { useState } from 'react';
import { MapPin, Cpu, Trash2, RefreshCw, DoorOpen, Clock, AlertCircle, Globe, Network } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface AreasTabProps {
  areas: any[];
  terminales: any[];
  setAreas: (a: any[]) => void;
  setTerminales: (t: any[]) => void;
}

export const AreasTab: React.FC<AreasTabProps> = ({
  areas,
  terminales,
  setAreas,
  setTerminales
}) => {
  const { theme } = useTheme();
  const isCyber = theme === 'cyber';

  const [nuevaArea, setNuevaArea] = useState({ nombre: '', descripcion: '' });
  const [nuevaTerminal, setNuevaTerminal] = useState({
    area_id: '',
    nombre: '',
    origen: 'LOCAL',
    cloud_device_serial: '',
    ip: '',
    puerto: '80',
    usuario: 'admin',
    password: '',
    direccion: 'ENTRADA',
    tipo_driver: 'HIKVISION_LOCAL_ISAPI'
  });

  const [actionStatus, setActionStatus] = useState<Record<number, string>>({});
  const [loadingAction, setLoadingAction] = useState<Record<number, string>>({});

  const crearArea = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/topology/areas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nuevaArea)
    });
    setNuevaArea({ nombre: '', descripcion: '' });
    fetch('/api/topology/areas').then(r => r.json()).then(setAreas);
  };

  const crearTerminal = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...nuevaTerminal,
      tipo_driver: nuevaTerminal.origen === 'TEAMS' ? 'HIKCONNECT_TEAMS' : 'HIKVISION_LOCAL_ISAPI',
    };
    await fetch('/api/topology/terminales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    setNuevaTerminal({
      area_id: '',
      nombre: '',
      origen: 'LOCAL',
      cloud_device_serial: '',
      ip: '',
      puerto: '80',
      usuario: 'admin',
      password: '',
      direccion: 'ENTRADA',
      tipo_driver: 'HIKVISION_LOCAL_ISAPI'
    });
    fetch('/api/topology/terminales').then(r => r.json()).then(setTerminales);
  };

  const eliminarTerminal = async (id: number) => {
    if (!confirm('¿Deseas dar de baja este checador?')) return;
    await fetch(`/api/topology/terminales/${id}`, { method: 'DELETE' });
    fetch('/api/topology/terminales').then(r => r.json()).then(setTerminales);
  };

  const probarTerminal = async (t: any) => {
    setLoadingAction(prev => ({ ...prev, [t.id]: 'probando' }));
    setActionStatus(prev => ({ ...prev, [t.id]: 'Conectando...' }));
    try {
      const res = await fetch(`/api/topology/terminales/${t.id}/test`, { method: 'POST' });
      const data = await res.json();
      setActionStatus(prev => ({ ...prev, [t.id]: data.message }));
    } catch (err: any) {
      setActionStatus(prev => ({ ...prev, [t.id]: `Error: ${err.message}` }));
    } finally {
      setLoadingAction(prev => ({ ...prev, [t.id]: '' }));
    }
  };

  const abrirPuerta = async (t: any) => {
    setLoadingAction(prev => ({ ...prev, [t.id]: 'abriendo' }));
    try {
      const res = await fetch(`/api/topology/terminales/${t.id}/open`, { method: 'POST' });
      const data = await res.json();
      setActionStatus(prev => ({ ...prev, [t.id]: data.message }));
    } finally {
      setLoadingAction(prev => ({ ...prev, [t.id]: '' }));
    }
  };

  const sincronizarReloj = async (t: any) => {
    setLoadingAction(prev => ({ ...prev, [t.id]: 'reloj' }));
    try {
      const res = await fetch(`/api/topology/terminales/${t.id}/sync-time`, { method: 'POST' });
      const data = await res.json();
      setActionStatus(prev => ({ ...prev, [t.id]: data.message }));
    } finally {
      setLoadingAction(prev => ({ ...prev, [t.id]: '' }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner Informativo Emulación Teams */}
      <div className="p-4 rounded-2xl bg-theme-subtle border border-theme flex items-start gap-3">
        <AlertCircle className={`w-5 h-5 shrink-0 mt-0.5 ${isCyber ? 'text-volt' : 'text-sport-orange'}`} />
        <div className="text-xs text-muted-theme space-y-1">
          <p className="font-bold text-main-theme">Gestión de Equipos y Áreas (Modelo Teams + Vigencias de Gimnasio)</p>
          <p>
            Emula la consola de Hik-Connect Teams: puedes asociar checadores tanto de la nube (Teams OpenAPI) como locales (ISAPI LAN). Al cobrar una membresía en recepción, el sistema despacha las vigencias exactas a todas las terminales autorizadas.
          </p>
        </div>
      </div>

      {/* Formularios de Alta */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alta de Área */}
        <form onSubmit={crearArea} className="bg-card-theme border border-theme card-shadow-theme rounded-2xl p-5 space-y-3">
          <h3 className="font-bold text-sm text-main-theme flex items-center gap-2">
            <MapPin className="w-4 h-4 text-accent-theme" /> 1. Nueva Área / Zona Física
          </h3>
          <div>
            <label className="text-xs font-bold text-muted-theme">Nombre del Área *</label>
            <input
              required
              placeholder="Ej. Batería Entradas, Salidas, VIP, Pesas"
              value={nuevaArea.nombre}
              onChange={e => setNuevaArea({ ...nuevaArea, nombre: e.target.value })}
              className="w-full px-3 py-2 rounded-xl text-sm border border-theme bg-theme-subtle text-main-theme mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-theme">Descripción</label>
            <input
              placeholder="Ej. Torniquetes de acceso principal"
              value={nuevaArea.descripcion}
              onChange={e => setNuevaArea({ ...nuevaArea, descripcion: e.target.value })}
              className="w-full px-3 py-2 rounded-xl text-sm border border-theme bg-theme-subtle text-main-theme mt-1"
            />
          </div>
          <button
            type="submit"
            className={`w-full py-2 rounded-xl text-xs font-bold shadow-md ${isCyber ? 'bg-volt text-black' : 'bg-sport-orange text-white'}`}
          >
            + Registrar Área
          </button>
        </form>

        {/* Alta de Terminal con Selector de Origen (Teams vs Local) */}
        <form onSubmit={crearTerminal} className="bg-card-theme border border-theme card-shadow-theme rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-main-theme flex items-center gap-2">
              <Cpu className="w-4 h-4 text-accent-theme" /> 2. Vincular Terminal / Checador
            </h3>
            {/* Selector de Origen */}
            <div className="flex rounded-lg border border-theme p-0.5 bg-theme-subtle text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setNuevaTerminal({ ...nuevaTerminal, origen: 'LOCAL' })}
                className={`px-2 py-0.5 rounded transition ${nuevaTerminal.origen === 'LOCAL' ? (isCyber ? 'bg-volt text-black' : 'bg-sport-orange text-white') : 'text-muted-theme'}`}
              >
                🔌 Local LAN
              </button>
              <button
                type="button"
                onClick={() => setNuevaTerminal({ ...nuevaTerminal, origen: 'TEAMS' })}
                className={`px-2 py-0.5 rounded transition ${nuevaTerminal.origen === 'TEAMS' ? 'bg-cyan-500 text-black' : 'text-muted-theme'}`}
              >
                ☁️ Teams Cloud
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-bold text-muted-theme">Nombre del Equipo *</label>
              <input
                required
                placeholder="Ej. Torniquete Entrada 1"
                value={nuevaTerminal.nombre}
                onChange={e => setNuevaTerminal({ ...nuevaTerminal, nombre: e.target.value })}
                className="w-full px-3 py-2 rounded-xl text-sm border border-theme bg-theme-subtle text-main-theme mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-theme">Dirección de Paso</label>
              <select
                value={nuevaTerminal.direccion}
                onChange={e => setNuevaTerminal({ ...nuevaTerminal, direccion: e.target.value })}
                className="w-full px-3 py-2 rounded-xl text-sm border border-theme bg-theme-subtle text-main-theme mt-1"
              >
                <option value="ENTRADA">🟢 ENTRADA</option>
                <option value="SALIDA">🔵 SALIDA</option>
                <option value="BIDIRECCIONAL">🔄 BIDIRECCIONAL</option>
              </select>
            </div>
          </div>

          {/* Campos según Origen */}
          {nuevaTerminal.origen === 'TEAMS' ? (
            <div>
              <label className="text-xs font-bold text-muted-theme">Serial del Dispositivo Teams *</label>
              <input
                required
                placeholder="Ej. DS-K1T343MWX-ABC12345"
                value={nuevaTerminal.cloud_device_serial}
                onChange={e => setNuevaTerminal({ ...nuevaTerminal, cloud_device_serial: e.target.value })}
                className="w-full px-3 py-2 rounded-xl text-sm border border-theme bg-theme-subtle text-main-theme font-mono mt-1"
              />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-muted-theme">IP del Checador *</label>
                  <input
                    required
                    placeholder="192.168.1.100"
                    value={nuevaTerminal.ip}
                    onChange={e => setNuevaTerminal({ ...nuevaTerminal, ip: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-sm border border-theme bg-theme-subtle text-main-theme mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-theme">Puerto</label>
                  <input
                    placeholder="80"
                    value={nuevaTerminal.puerto}
                    onChange={e => setNuevaTerminal({ ...nuevaTerminal, puerto: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-sm border border-theme bg-theme-subtle text-main-theme mt-1"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-theme">Contraseña Admin SADP</label>
                <input
                  type="password"
                  placeholder="Opcional (Usa la general si se deja vacía)"
                  value={nuevaTerminal.password}
                  onChange={e => setNuevaTerminal({ ...nuevaTerminal, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-sm border border-theme bg-theme-subtle text-main-theme mt-1"
                />
              </div>
            </>
          )}

          <div>
            <label className="text-xs font-bold text-muted-theme">Área Asignada</label>
            <select
              value={nuevaTerminal.area_id}
              onChange={e => setNuevaTerminal({ ...nuevaTerminal, area_id: e.target.value })}
              className="w-full px-3 py-2 rounded-xl text-sm border border-theme bg-theme-subtle text-main-theme mt-1"
            >
              <option value="">-- Sin Área --</option>
              {areas.map(a => <option key={a.id} value={a.id}>{a.nombre} {a.cloud_area_id ? '(Teams)' : ''}</option>)}
            </select>
          </div>

          <button
            type="submit"
            className={`w-full py-2 rounded-xl text-xs font-bold shadow-md ${isCyber ? 'bg-volt text-black' : 'bg-sport-orange text-white'}`}
          >
            + Vincular Checador ({nuevaTerminal.origen === 'TEAMS' ? 'Nube Teams' : 'Local'})
          </button>
        </form>
      </div>

      {/* Catálogo de Terminales / Equipos */}
      <div className="bg-card-theme border border-theme card-shadow-theme rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-theme font-bold text-sm text-main-theme flex items-center justify-between">
          <span>Consola de Equipos y Puntos de Acceso</span>
          <span className="text-xs font-normal text-muted-theme">
            {terminales.length} equipo{terminales.length === 1 ? '' : 's'} registrado{terminales.length === 1 ? '' : 's'}
          </span>
        </div>
        <div className="divide-y divide-theme">
          {terminales.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-theme">
              No hay equipos registrados aún. Puedes agregarlos arriba o sincronizarlos desde Teams en la pestaña Hardware.
            </div>
          ) : (
            terminales.map(t => (
              <div key={t.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-700/10 transition">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-main-theme">{t.nombre}</span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${t.origen === 'TEAMS' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                      {t.origen === 'TEAMS' ? '☁️ Teams Cloud' : '🔌 Local LAN'}
                    </span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${t.direccion === 'ENTRADA' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : t.direccion === 'SALIDA' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'}`}>
                      {t.direccion}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-theme-subtle border border-theme text-muted-theme">
                      Área: {t.area_nombre || 'Sin asignar'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-theme mt-1">
                    {t.origen === 'TEAMS' ? (
                      <>Serial Nube: <strong className="font-mono text-cyan-400">{t.cloud_device_serial || 'Sin serial'}</strong></>
                    ) : (
                      <>IP: <strong className="font-mono text-main-theme">{t.ip}:{t.puerto || '80'}</strong> • Usuario: <span className="font-mono">{t.usuario || 'admin'}</span></>
                    )}
                  </p>
                  {actionStatus[t.id] && (
                    <div className="mt-1.5 text-xs font-semibold text-accent-theme">
                      {actionStatus[t.id]}
                    </div>
                  )}
                </div>

                {/* Botones de acción por terminal */}
                <div className="flex items-center gap-2 self-end md:self-auto">
                  <button
                    onClick={() => probarTerminal(t)}
                    disabled={loadingAction[t.id] === 'probando'}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-theme text-xs font-semibold text-main-theme hover:bg-theme-subtle transition"
                    title="Probar conexión con esta terminal"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingAction[t.id] === 'probando' ? 'animate-spin' : ''}`} />
                    <span>Probar</span>
                  </button>

                  <button
                    onClick={() => abrirPuerta(t)}
                    disabled={loadingAction[t.id] === 'abriendo'}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-theme text-xs font-semibold text-main-theme hover:bg-theme-subtle transition"
                    title="Abrir relevador de este torniquete"
                  >
                    <DoorOpen className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Abrir</span>
                  </button>

                  {t.origen !== 'TEAMS' && (
                    <button
                      onClick={() => sincronizarReloj(t)}
                      disabled={loadingAction[t.id] === 'reloj'}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-theme text-xs font-semibold text-main-theme hover:bg-theme-subtle transition"
                      title="Ajustar hora de este checador"
                    >
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Hora</span>
                    </button>
                  )}

                  <button
                    onClick={() => eliminarTerminal(t.id)}
                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition"
                    title="Eliminar terminal"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
