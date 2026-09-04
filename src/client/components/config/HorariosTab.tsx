import React, { useState } from 'react';
import { Calendar, ShieldCheck, Trash2, Clock, AlertCircle } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface HorariosTabProps {
  areas: any[];
  horarios: any[];
  niveles: any[];
  setHorarios: (h: any[]) => void;
  setNiveles: (n: any[]) => void;
}

const DIAS_DISPONIBLES = [
  { id: 'L', label: 'Lun' },
  { id: 'M', label: 'Mar' },
  { id: 'X', label: 'Mié' },
  { id: 'J', label: 'Jue' },
  { id: 'V', label: 'Vie' },
  { id: 'S', label: 'Sáb' },
  { id: 'D', label: 'Dom' },
];

export const HorariosTab: React.FC<HorariosTabProps> = ({
  areas,
  horarios,
  niveles,
  setHorarios,
  setNiveles
}) => {
  const { theme } = useTheme();
  const isCyber = theme === 'cyber';

  const [diasSeleccionados, setDiasSeleccionados] = useState<string[]>(['L', 'M', 'X', 'J', 'V', 'S', 'D']);
  const [nuevoHorario, setNuevoHorario] = useState({
    nombre: '',
    hora_inicio: '06:00',
    hora_fin: '22:00',
  });

  const [nuevoNivel, setNuevoNivel] = useState({
    nombre: '',
    descripcion: '',
    area_id: '',
    horario_id: ''
  });

  const toggleDia = (dia: string) => {
    if (diasSeleccionados.includes(dia)) {
      if (diasSeleccionados.length === 1) return; // Mínimo 1 día
      setDiasSeleccionados(diasSeleccionados.filter(d => d !== dia));
    } else {
      setDiasSeleccionados([...diasSeleccionados, dia]);
    }
  };

  const crearHorario = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/topology/horarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...nuevoHorario,
        dias_semana: diasSeleccionados.join(',')
      })
    });
    setNuevoHorario({
      nombre: '',
      hora_inicio: '06:00',
      hora_fin: '22:00',
    });
    fetch('/api/topology/horarios').then(r => r.json()).then(setHorarios);
  };

  const eliminarHorario = async (id: number) => {
    if (!confirm('¿Deseas eliminar este horario?')) return;
    await fetch(`/api/topology/horarios/${id}`, { method: 'DELETE' });
    fetch('/api/topology/horarios').then(r => r.json()).then(setHorarios);
  };

  const crearNivel = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      nombre: nuevoNivel.nombre,
      descripcion: nuevoNivel.descripcion,
      areas: nuevoNivel.area_id
        ? [{ area_id: Number(nuevoNivel.area_id), horario_id: nuevoNivel.horario_id ? Number(nuevoNivel.horario_id) : null }]
        : []
    };
    await fetch('/api/topology/niveles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    setNuevoNivel({ nombre: '', descripcion: '', area_id: '', horario_id: '' });
    fetch('/api/topology/niveles').then(r => r.json()).then(setNiveles);
  };

  const eliminarNivel = async (id: number) => {
    if (!confirm('¿Deseas eliminar este nivel de acceso?')) return;
    await fetch(`/api/topology/niveles/${id}`, { method: 'DELETE' });
    fetch('/api/topology/niveles').then(r => r.json()).then(setNiveles);
  };

  return (
    <div className="space-y-6">
      {/* Banner Informativo */}
      <div className="p-4 rounded-2xl bg-theme-subtle border border-theme flex items-start gap-3">
        <AlertCircle className={`w-5 h-5 shrink-0 mt-0.5 ${isCyber ? 'text-volt' : 'text-sport-orange'}`} />
        <div className="text-xs text-muted-theme space-y-1">
          <p className="font-bold text-main-theme">Gestión de Turnos y Niveles de Acceso</p>
          <p>
            Define los horarios permitidos (ej. Turno Matutino de 06:00 a 14:00) y asócialos a un Nivel de Acceso junto a las Áreas autorizadas. Luego, en la pestaña de Cobro, vincula cada Plan de Membresía a su Nivel correspondiente.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Crear Horario */}
        <form onSubmit={crearHorario} className="bg-card-theme border border-theme card-shadow-theme rounded-2xl p-5 space-y-3">
          <h3 className="font-bold text-sm text-main-theme flex items-center gap-2">
            <Calendar className="w-4 h-4 text-accent-theme" /> 1. Nuevo Horario / Turno
          </h3>
          <div>
            <label className="text-xs font-bold text-muted-theme">Nombre del Horario *</label>
            <input
              required
              placeholder="Ej. Turno Matutino, Estudiante, Total 24/7"
              value={nuevoHorario.nombre}
              onChange={e => setNuevoHorario({ ...nuevoHorario, nombre: e.target.value })}
              className="w-full px-3 py-2 rounded-xl text-sm border border-theme bg-theme-subtle text-main-theme mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-muted-theme">Hora Inicio</label>
              <input
                type="time"
                value={nuevoHorario.hora_inicio}
                onChange={e => setNuevoHorario({ ...nuevoHorario, hora_inicio: e.target.value })}
                className="w-full px-3 py-2 rounded-xl text-sm border border-theme bg-theme-subtle text-main-theme font-mono font-bold mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-theme">Hora Fin</label>
              <input
                type="time"
                value={nuevoHorario.hora_fin}
                onChange={e => setNuevoHorario({ ...nuevoHorario, hora_fin: e.target.value })}
                className="w-full px-3 py-2 rounded-xl text-sm border border-theme bg-theme-subtle text-main-theme font-mono font-bold mt-1"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-muted-theme block mb-1.5">Días de la Semana Válidos</label>
            <div className="flex flex-wrap gap-1.5">
              {DIAS_DISPONIBLES.map(d => {
                const activo = diasSeleccionados.includes(d.id);
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => toggleDia(d.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition border ${
                      activo
                        ? (isCyber ? 'bg-volt text-black border-volt' : 'bg-sport-orange text-white border-sport-orange')
                        : 'bg-theme-subtle text-muted-theme border-theme hover:text-main-theme'
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            className={`w-full py-2 rounded-xl text-xs font-bold shadow-md ${isCyber ? 'bg-volt text-black' : 'bg-sport-orange text-white'}`}
          >
            + Registrar Horario
          </button>
        </form>

        {/* Crear Nivel de Acceso */}
        <form onSubmit={crearNivel} className="bg-card-theme border border-theme card-shadow-theme rounded-2xl p-5 space-y-3">
          <h3 className="font-bold text-sm text-main-theme flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-accent-theme" /> 2. Nuevo Nivel de Acceso (Regla)
          </h3>
          <div>
            <label className="text-xs font-bold text-muted-theme">Nombre del Nivel *</label>
            <input
              required
              placeholder="Ej. Membresía Matutina, Pase VIP Total"
              value={nuevoNivel.nombre}
              onChange={e => setNuevoNivel({ ...nuevoNivel, nombre: e.target.value })}
              className="w-full px-3 py-2 rounded-xl text-sm border border-theme bg-theme-subtle text-main-theme mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-bold text-muted-theme">Área Permitida</label>
              <select
                value={nuevoNivel.area_id}
                onChange={e => setNuevoNivel({ ...nuevoNivel, area_id: e.target.value })}
                className="w-full px-3 py-2 rounded-xl text-sm border border-theme bg-theme-subtle text-main-theme mt-1"
              >
                <option value="">-- Seleccionar Área --</option>
                {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-muted-theme">Horario Aplicado</label>
              <select
                value={nuevoNivel.horario_id}
                onChange={e => setNuevoNivel({ ...nuevoNivel, horario_id: e.target.value })}
                className="w-full px-3 py-2 rounded-xl text-sm border border-theme bg-theme-subtle text-main-theme mt-1"
              >
                <option value="">-- Seleccionar Horario --</option>
                {horarios.map(h => (
                  <option key={h.id} value={h.id}>
                    {h.nombre} ({h.hora_inicio} - {h.hora_fin})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="submit"
            className={`w-full py-2 rounded-xl text-xs font-bold shadow-md ${isCyber ? 'bg-volt text-black' : 'bg-sport-orange text-white'}`}
          >
            + Guardar Nivel de Acceso
          </button>
        </form>
      </div>

      {/* Catálogo de Horarios / Turnos */}
      <div className="bg-card-theme border border-theme card-shadow-theme rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-theme font-bold text-sm text-main-theme flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-accent-theme" /> Catálogo de Horarios / Turnos
          </span>
          <span className="text-xs font-normal text-muted-theme">
            {horarios.length} horario{horarios.length === 1 ? '' : 's'} configurado{horarios.length === 1 ? '' : 's'}
          </span>
        </div>
        <div className="divide-y divide-theme">
          {horarios.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-theme">No hay horarios registrados aún.</div>
          ) : (
            horarios.map(h => (
              <div key={h.id} className="p-4 flex items-center justify-between hover:bg-slate-700/10 transition">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-main-theme">{h.nombre}</span>
                    <span className="text-xs font-mono font-extrabold px-2.5 py-0.5 rounded bg-theme-subtle border border-theme text-accent-theme">
                      {h.hora_inicio} - {h.hora_fin}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {(h.dias_semana || 'L,M,X,J,V,S,D').split(',').map((dia: string, idx: number) => (
                      <span key={idx} className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-theme-subtle border border-theme text-muted-theme">
                        {dia === 'L' ? 'Lun' : dia === 'M' ? 'Mar' : dia === 'X' ? 'Mié' : dia === 'J' ? 'Jue' : dia === 'V' ? 'Vie' : dia === 'S' ? 'Sáb' : 'Dom'}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => eliminarHorario(h.id)}
                  className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition"
                  title="Eliminar horario"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Lista de Niveles de Acceso */}
      <div className="bg-card-theme border border-theme card-shadow-theme rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-theme font-bold text-sm text-main-theme flex items-center justify-between">
          <span className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-accent-theme" /> Niveles de Acceso Activos (Asignables a Planes de Cobro)
          </span>
          <span className="text-xs font-normal text-muted-theme">
            {niveles.length} nivel{niveles.length === 1 ? '' : 'es'}
          </span>
        </div>
        <div className="divide-y divide-theme">
          {niveles.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-theme">No hay niveles de acceso registrados aún.</div>
          ) : (
            niveles.map(n => (
              <div key={n.id} className="p-4 flex items-center justify-between hover:bg-slate-700/10 transition">
                <div>
                  <span className="font-bold text-sm text-main-theme">{n.nombre}</span>
                  <p className="text-xs text-muted-theme mt-0.5">{n.descripcion || 'Regla de acceso combinada'}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {n.areas?.map((a: any, i: number) => (
                      <span key={i} className="text-[10px] font-bold px-2 py-0.5 rounded bg-theme-subtle border border-theme text-main-theme">
                        📍 {a.area_nombre} ({a.horario_nombre || 'Sin restricción'})
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => eliminarNivel(n.id)}
                  className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition"
                  title="Eliminar nivel"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
