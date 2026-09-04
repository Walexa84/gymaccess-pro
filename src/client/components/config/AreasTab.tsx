import React, { useState } from 'react';
import { MapPin, Cpu, Trash2, RefreshCw, DoorOpen, Clock, AlertCircle } from 'lucide-react';
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
    await fetch('/api/topology/terminales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nuevaTerminal)
    });
    setNuevaTerminal({
      area_id: '',
      nombre: '',
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
      {/* Banner Informativo Multi-Terminal */}
      <div className="p-4 rounded-2xl bg-theme-subtle border border-theme flex items-start gap-3">
        <AlertCircle className={`w-5 h-5 shrink-0 mt-0.5 ${isCyber ? 'text-volt' : 'text-sport-orange'}`} />
        <div className="text-xs text-muted-theme space-y-1">
          <p className="font-bold text-main-theme">Gestión Multi-Terminal (Entradas y Salidas Independientes)</p>
          <p>
            Puedes registrar 2, 4 o más checadores faciales y torniquetes por sucursal. Asigna a cada uno su IP física y dirección (Entrada o Salida). Al registrar fotos o cobrar membresías, el sistema sincroniza automáticamente el acceso a todas las terminales autorizadas.
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

        {/* Alta de Terminal */}
        <form onSubmit={crearTerminal} className="bg-card-theme border border-theme card-shadow-theme rounded-2xl p-5 space-y-3">
          <h3 className="font-bold text-sm text-main-theme flex items-center gap-2">
            <Cpu className="w-4 h-4 text-accent-theme" /> 2. Vincular Terminal / Checador
          </h3>
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
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-bold text-muted-theme">Área Asignada</label>
              <select
                value={nuevaTerminal.area_id}
                onChange={e => setNuevaTerminal({ ...nuevaTerminal, area_id: e.target.value })}
                className="w-full px-3 py-2 rounded-xl text-sm border border-theme bg-theme-subtle text-main-theme mt-1"
              >
                <option value="">-- Sin Área --</option>
                {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-muted-theme">Contraseña Admin SADP</label>
              <input
                type="password"
                placeholder="Opcional"
                value={nuevaTerminal.password}
                onChange={e => setNuevaTerminal({ ...nuevaTerminal, password: e.target.value })}
                className="w-full px-3 py-2 rounded-xl text-sm border border-theme bg-theme-subtle text-main-theme mt-1"
              />
            </div>
          </div>
          <button
            type="submit"
            className={`w-full py-2 rounded-xl text-xs font-bold shadow-md ${isCyber ? 'bg-volt text-black' : 'bg-sport-orange text-white'}`}
          >
            + Vincular Checador
          </button>
        </form>
      </div>

      {/* Catálogo de Terminales y Torniquetes Físicos */}
      <div className="bg-card-theme border border-theme card-shadow-theme rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-theme font-bold text-sm text-main-theme flex items-center justify-between">
          <span>Catálogo de Terminales y Torniquetes Físicos</span>
          <span className="text-xs font-normal text-muted-theme">
            {terminales.length} terminal{terminales.length === 1 ? '' : 'es'} registrada{terminales.length === 1 ? '' : 's'}
          </span>
        </div>
        <div className="divide-y divide-theme">
          {terminales.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-theme">
              No hay terminales registradas aún. Agrega una terminal arriba para comenzar.
            </div>
          ) : (
            terminales.map(t => (
              <div key={t.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-700/10 transition">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-main-theme">{t.nombre}</span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${t.direccion === 'ENTRADA' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : t.direccion === 'SALIDA' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'}`}>
                      {t.direccion}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-theme-subtle border border-theme text-muted-theme">
                      Área: {t.area_nombre || 'Sin asignar'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-theme mt-1">
                    IP: <strong className="font-mono text-main-theme">{t.ip}:{t.puerto || '80'}</strong> • Usuario: <span className="font-mono">{t.usuario || 'admin'}</span>
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

                  <button
                    onClick={() => sincronizarReloj(t)}
                    disabled={loadingAction[t.id] === 'reloj'}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-theme text-xs font-semibold text-main-theme hover:bg-theme-subtle transition"
                    title="Ajustar hora de este checador"
                  >
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Hora</span>
                  </button>

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
