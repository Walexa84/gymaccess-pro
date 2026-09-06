import React, { useState, useEffect } from 'react';
import { Building2, Plus, Edit2, Trash2, Cpu, Check, X, ShieldCheck, ChevronUp, AlertCircle } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface DispositivoRel {
  dispositivo_id: number;
  dispositivo_nombre: string;
  driver: string;
  cloud_serial?: string;
  estado_conexion: string;
  cuenta_nombre?: string;
}

interface Sucursal {
  id: number;
  nombre: string;
  direccion?: string;
  telefono?: string;
  activa: number;
  total_dispositivos: number;
  dispositivos: DispositivoRel[];
}

export const SucursalesTab: React.FC = () => {
  const { theme } = useTheme();
  const isCyber = theme === 'cyber';

  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [todosDispositivos, setTodosDispositivos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    direccion: '',
    telefono: '',
    dispositivoIds: [] as number[],
  });

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [resSuc, resDisp] = await Promise.all([
        fetch('/api/access/sucursales'),
        fetch('/api/access/dispositivos'),
      ]);
      const dataSuc = await resSuc.json();
      const dataDisp = await resDisp.json();
      if (Array.isArray(dataSuc)) setSucursales(dataSuc);
      if (Array.isArray(dataDisp)) setTodosDispositivos(dataDisp);
    } catch (err) {
      console.error('Error cargando sucursales:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const handleOpenCrear = () => {
    setEditandoId(null);
    setFormData({ nombre: '', direccion: '', telefono: '', dispositivoIds: [] });
    setMostrarForm(true);
  };

  const handleOpenEditar = (suc: Sucursal) => {
    setEditandoId(suc.id);
    setFormData({
      nombre: suc.nombre,
      direccion: suc.direccion || '',
      telefono: suc.telefono || '',
      dispositivoIds: suc.dispositivos.map((d) => d.dispositivo_id),
    });
    setMostrarForm(true);
  };

  const toggleDispositivo = (id: number) => {
    setFormData((prev) => {
      const exists = prev.dispositivoIds.includes(id);
      return {
        ...prev,
        dispositivoIds: exists ? prev.dispositivoIds.filter((d) => d !== id) : [...prev.dispositivoIds, id],
      };
    });
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      alert('El nombre de la sucursal es obligatorio');
      return;
    }

    try {
      const url = editandoId ? `/api/access/sucursales/${editandoId}` : '/api/access/sucursales';
      const method = editandoId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al guardar sucursal');
      }

      setMostrarForm(false);
      setEditandoId(null);
      cargarDatos();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleEliminar = async (id: number, nombre: string) => {
    if (!confirm(`¿Deseas dar de baja la sucursal [${nombre}]?`)) return;
    try {
      await fetch(`/api/access/sucursales/${id}`, { method: 'DELETE' });
      cargarDatos();
    } catch (err: any) {
      alert('Error eliminando sucursal: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-display font-extrabold text-xl text-main-theme flex items-center gap-2">
            <Building2 className="w-5 h-5 text-volt" />
            Sucursales & Gimnasios (Agrupación de Negocio)
          </h3>
          <p className="text-xs text-muted-theme mt-0.5">
            Agrupa controles de acceso de distintas cuentas de Teams bajo una misma sucursal física para emisión unificada de accesos.
          </p>
        </div>

        <button
          onClick={mostrarForm ? () => setMostrarForm(false) : handleOpenCrear}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shadow shrink-0 ${
            isCyber ? 'bg-volt hover:bg-volt/90 text-black' : 'bg-sport-orange hover:bg-sport-orange/90 text-white'
          }`}
        >
          {mostrarForm ? <ChevronUp className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{mostrarForm ? 'Cerrar Formulario' : 'Crear Nueva Sucursal'}</span>
        </button>
      </div>

      {/* Formulario de Alta / Edición */}
      {mostrarForm && (
        <form onSubmit={handleGuardar} className="p-5 rounded-2xl bg-card-theme border border-theme card-shadow-theme space-y-4">
          <h4 className="font-bold text-sm text-main-theme flex items-center gap-2">
            {editandoId ? <Edit2 className="w-4 h-4 text-cyan-400" /> : <Plus className="w-4 h-4 text-cyan-400" />}
            <span>{editandoId ? 'Editar Sucursal' : 'Nueva Sucursal del Gimnasio'}</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-muted-theme block mb-1">Nombre de la Sucursal *</label>
              <input
                type="text"
                required
                placeholder="Ej. Sucursal Araucarias"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-theme-subtle border border-theme text-xs text-main-theme focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-theme block mb-1">Dirección / Ubicación</label>
              <input
                type="text"
                placeholder="Ej. Av. Araucarias #123"
                value={formData.direccion}
                onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-theme-subtle border border-theme text-xs text-main-theme focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-theme block mb-1">Teléfono de Contacto</label>
              <input
                type="text"
                placeholder="Ej. 2281234567"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-theme-subtle border border-theme text-xs text-main-theme focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          {/* Selector de Dispositivos / Checadores */}
          <div className="space-y-2 pt-2 border-t border-theme">
            <label className="text-xs font-bold text-main-theme block">
              Controles de Acceso Asignados a esta Sucursal ({formData.dispositivoIds.length} seleccionados)
            </label>
            <p className="text-[11px] text-muted-theme">
              Marca los checadores que controlan las puertas o torniquetes de este gimnasio (pueden ser de cuentas Teams distintas):
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {todosDispositivos.map((d) => {
                const checked = formData.dispositivoIds.includes(d.id);
                return (
                  <div
                    key={d.id}
                    onClick={() => toggleDispositivo(d.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                      checked
                        ? 'border-cyan-500/50 bg-cyan-500/10 text-main-theme'
                        : 'border-theme bg-theme-subtle text-muted-theme hover:text-main-theme'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-lg ${checked ? 'bg-cyan-500 text-black' : 'bg-theme text-muted-theme'}`}>
                        <Cpu className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-xs text-main-theme">{d.nombre}</div>
                        <div className="text-[10px] text-muted-theme">
                          Cuenta: <span className="text-cyan-400 font-semibold">{d.cuenta_hct_nombre || 'Local / LAN'}</span>
                          {d.cloud_serial && ` • S/N: ${d.cloud_serial}`}
                        </div>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                      checked ? 'bg-cyan-500 border-cyan-400 text-black' : 'border-theme bg-theme-subtle'
                    }`}>
                      {checked && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Botones Guardar / Cancelar */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-theme">
            <button
              type="button"
              onClick={() => setMostrarForm(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-theme bg-theme-subtle hover:bg-theme transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`px-5 py-2 rounded-xl text-xs font-bold transition shadow flex items-center gap-2 ${
                isCyber ? 'bg-volt hover:bg-volt/90 text-black' : 'bg-sport-orange hover:bg-sport-orange/90 text-white'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{editandoId ? 'Guardar Cambios' : 'Crear Sucursal'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Lista de Sucursales Registradas */}
      <div className="space-y-4">
        {sucursales.length === 0 && !loading && (
          <div className="p-8 rounded-2xl bg-card-theme border border-theme text-center space-y-3">
            <Building2 className="w-12 h-12 mx-auto text-volt/50" />
            <h4 className="font-bold text-base text-main-theme">No hay sucursales registradas</h4>
            <p className="text-xs text-muted-theme max-w-md mx-auto">
              Presiona <strong>"Crear Nueva Sucursal"</strong> para agrupar tus checadores bajo una entidad operativa para cobros y recepción.
            </p>
          </div>
        )}

        {sucursales.map((s) => (
          <div key={s.id} className="p-5 rounded-2xl bg-card-theme border border-theme card-shadow-theme space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-theme">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${isCyber ? 'bg-volt/10 text-volt border border-volt/20' : 'bg-sport-orange/10 text-sport-orange border border-sport-orange/20'}`}>
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-main-theme flex items-center gap-2">
                    {s.nombre}
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                      🟢 Activa
                    </span>
                  </h4>
                  <p className="text-xs text-muted-theme mt-0.5">
                    {s.direccion || 'Sin dirección registrada'} {s.telefono && `• Tel: ${s.telefono}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenEditar(s)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-theme bg-theme-subtle hover:text-cyan-400 transition"
                  title="Editar sucursal y checadores asignados"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </button>
                <button
                  onClick={() => handleEliminar(s.id, s.nombre)}
                  className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition"
                  title="Dar de baja sucursal"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Dispositivos asignados a esta Sucursal */}
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-theme flex items-center justify-between">
                <span>Controles de Acceso Asignados ({s.dispositivos.length})</span>
                <span className="text-[11px] font-normal normal-case text-muted-theme">
                  Los socios de esta sucursal tendrán pase en todos estos accesos
                </span>
              </div>

              {s.dispositivos.length === 0 ? (
                <div className="p-3 rounded-xl bg-theme-subtle border border-theme text-xs text-amber-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Esta sucursal no tiene checadores asignados. Haz clic en "Editar" para vincular terminales.</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {s.dispositivos.map((d) => (
                    <div key={d.dispositivo_id} className="p-3 rounded-xl bg-theme-subtle border border-theme flex items-center justify-between">
                      <div className="flex items-center gap-2.5 truncate">
                        <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 shrink-0">
                          <Cpu className="w-4 h-4" />
                        </div>
                        <div className="truncate">
                          <div className="text-xs font-bold text-main-theme truncate">{d.dispositivo_nombre}</div>
                          <div className="text-[10px] text-muted-theme truncate">
                            Cuenta: <span className="text-cyan-400 font-semibold">{d.cuenta_nombre || 'LAN'}</span>
                          </div>
                        </div>
                      </div>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border shrink-0 ${
                        d.estado_conexion === 'ONLINE'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        {d.estado_conexion === 'ONLINE' ? '🟢 ONLINE' : '🔴 OFFLINE'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
