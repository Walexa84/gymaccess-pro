import React, { useState, useEffect } from 'react';
import { 
  Package, Plus, Edit2, Trash2, ShieldCheck, Check, X, 
  DoorOpen, Clock, DollarSign, Calendar, AlertCircle
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface NivelAcceso {
  id: number;
  nombre: string;
  cloud_level_id: string;
  cuenta_hct_id: number;
  cuenta_nombre: string;
}

interface PlanGym {
  id: number;
  nombre: string;
  duracion_dias: number;
  precio: number;
  activo: number;
  niveles?: NivelAcceso[];
  nivel_ids?: number[];
}

export const PaquetesTab: React.FC = () => {
  const { theme } = useTheme();
  const isCyber = theme === 'cyber';

  const [planes, setPlanes] = useState<PlanGym[]>([]);
  const [nivelesDisponibles, setNivelesDisponibles] = useState<NivelAcceso[]>([]);
  const [loading, setLoading] = useState(false);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [editandoPlanId, setEditandoPlanId] = useState<number | null>(null);

  // Formulario
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [duracionDias, setDuracionDias] = useState('30');
  const [selectedNivelIds, setSelectedNivelIds] = useState<number[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [resPlanes, resNiveles] = await Promise.all([
        fetch('/api/gym/planes'),
        fetch('/api/iam/niveles-acceso'),
      ]);

      if (resPlanes.ok) {
        const dataP = await resPlanes.json();
        if (Array.isArray(dataP)) setPlanes(dataP);
      }

      if (resNiveles.ok) {
        const dataN = await resNiveles.json();
        if (Array.isArray(dataN)) setNivelesDisponibles(dataN);
      }
    } catch (err) {
      console.error('Error cargando planes y niveles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const handleOpenCrear = () => {
    setEditandoPlanId(null);
    setNombre('');
    setPrecio('500');
    setDuracionDias('30');
    // Preseleccionar todos los niveles disponibles si hay alguno
    setSelectedNivelIds(nivelesDisponibles.map((n) => n.id));
    setErrorMsg('');
    setMostrarModal(true);
  };

  const handleOpenEditar = (plan: PlanGym) => {
    setEditandoPlanId(plan.id);
    setNombre(plan.nombre);
    setPrecio(plan.precio.toString());
    setDuracionDias(plan.duracion_dias.toString());
    setSelectedNivelIds(plan.nivel_ids || []);
    setErrorMsg('');
    setMostrarModal(true);
  };

  const toggleNivel = (id: number) => {
    setSelectedNivelIds((prev) =>
      prev.includes(id) ? prev.filter((nid) => nid !== id) : [...prev, id]
    );
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setErrorMsg('El nombre del paquete es obligatorio.');
      return;
    }
    const numPrecio = parseFloat(precio);
    const numDias = parseInt(duracionDias, 10);
    if (isNaN(numPrecio) || numPrecio < 0) {
      setErrorMsg('Ingresa un precio válido.');
      return;
    }
    if (isNaN(numDias) || numDias <= 0) {
      setErrorMsg('La duración en días debe ser mayor a 0.');
      return;
    }
    if (selectedNivelIds.length === 0) {
      setErrorMsg('Debes seleccionar al menos una puerta o nivel de acceso que abra este paquete.');
      return;
    }

    try {
      setGuardando(true);
      setErrorMsg('');

      const url = editandoPlanId ? `/api/gym/planes/${editandoPlanId}` : '/api/gym/planes';
      const method = editandoPlanId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombre.trim(),
          precio: numPrecio,
          duracion_dias: numDias,
          nivelIds: selectedNivelIds,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al guardar el paquete');
      }

      setMostrarModal(false);
      await cargarDatos();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error de conexión');
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (id: number, nombrePlan: string) => {
    if (!window.confirm(`¿Estás seguro de eliminar el paquete "${nombrePlan}"?`)) return;
    try {
      const res = await fetch(`/api/gym/planes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await cargarDatos();
      } else {
        const data = await res.json();
        alert(data.error || 'No se pudo eliminar el paquete');
      }
    } catch {
      alert('Error de conexión al eliminar');
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado con Botón de Creación */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-display font-bold text-lg text-main-theme flex items-center gap-2">
            <Package className="w-5 h-5 text-volt" />
            Paquetes Comerciales & Membresías ({planes.length})
          </h3>
          <p className="text-xs text-muted-theme mt-0.5">
            Configura los precios, vigencias y las puertas/torniquetes que cada membresía abre en el checador
          </p>
        </div>

        <button
          onClick={handleOpenCrear}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-md ${
            isCyber
              ? 'bg-volt text-black shadow-volt-glow hover:opacity-90'
              : 'bg-sport-orange text-white shadow-orange-glow hover:opacity-90'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Paquete</span>
        </button>
      </div>

      {/* Grid de Tarjetas de Planes */}
      {loading ? (
        <div className="text-center py-12 text-muted-theme text-sm">Cargando paquetes...</div>
      ) : planes.length === 0 ? (
        <div className="p-8 text-center rounded-2xl border border-theme bg-theme-subtle">
          <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
          <p className="text-sm font-bold text-main-theme">No tienes paquetes registrados</p>
          <p className="text-xs text-muted-theme mt-1">
            Haz clic en "Nuevo Paquete" para crear tu primer plan de membresía.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {planes.map((plan) => (
            <div
              key={plan.id}
              className={`p-5 rounded-2xl border flex flex-col justify-between transition-all ${
                isCyber
                  ? 'bg-theme-subtle border-theme hover:border-volt/50'
                  : 'bg-white border-slate-200 hover:border-sport-orange shadow-sm'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    isCyber ? 'bg-volt/10 text-volt border border-volt/20' : 'bg-orange-50 text-sport-orange'
                  }`}>
                    {plan.duracion_dias === 1
                      ? '1 Día'
                      : plan.duracion_dias === 7
                      ? '1 Semana'
                      : plan.duracion_dias === 30
                      ? '1 Mes'
                      : `${plan.duracion_dias} Días`}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditar(plan)}
                      className="p-1.5 rounded-lg text-muted-theme hover:text-main-theme hover:bg-theme transition"
                      title="Editar paquete"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleEliminar(plan.id, plan.nombre)}
                      className="p-1.5 rounded-lg text-muted-theme hover:text-red-400 hover:bg-red-500/10 transition"
                      title="Eliminar paquete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h4 className="font-display font-bold text-base text-main-theme">{plan.nombre}</h4>
                <div className="mt-2 text-2xl font-extrabold text-main-theme font-mono">
                  ${plan.precio} <span className="text-xs font-medium text-muted-theme">MXN</span>
                </div>

                {/* Puertas y Niveles Vinculados */}
                <div className="mt-4 pt-3 border-t border-theme/60 space-y-1.5">
                  <span className="text-[11px] font-bold text-muted-theme uppercase tracking-wider block">
                    Puertas & Zonas Autorizadas:
                  </span>
                  {plan.niveles && plan.niveles.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {plan.niveles.map((niv) => (
                        <span
                          key={niv.id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 border border-cyan-500/30 text-cyan-400"
                        >
                          <DoorOpen className="w-3 h-3" />
                          <span>{niv.nombre}</span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-amber-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>Sin puertas asignadas</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-theme/60 flex items-center justify-between text-xs text-muted-theme">
                <span>Vigencia: {plan.duracion_dias} días</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  Activo
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Creación / Edición de Paquete */}
      {mostrarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-card-theme border border-theme rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-theme flex items-center justify-between bg-theme-subtle">
              <h3 className="font-bold text-base text-main-theme flex items-center gap-2">
                <Package className="w-5 h-5 text-volt" />
                {editandoPlanId ? 'Editar Paquete Comercial' : 'Nuevo Paquete de Membresía'}
              </h3>
              <button
                onClick={() => setMostrarModal(false)}
                className="p-1 rounded-lg text-muted-theme hover:text-main-theme"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGuardar} className="p-5 space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Nombre del Plan */}
              <div>
                <label className="text-xs font-bold text-muted-theme block mb-1">
                  Nombre del Paquete *
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Mensualidad Regular, Pase VIP Alberca"
                  className="w-full px-3 py-2 rounded-xl text-xs bg-theme border border-theme text-main-theme focus:border-volt outline-none"
                  required
                />
              </div>

              {/* Precio y Duración en 2 Columnas */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-muted-theme block mb-1">
                    Precio (MXN) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-muted-theme font-bold">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={precio}
                      onChange={(e) => setPrecio(e.target.value)}
                      placeholder="500.00"
                      className="w-full pl-7 pr-3 py-2 rounded-xl text-xs bg-theme border border-theme text-main-theme focus:border-volt outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-muted-theme block mb-1">
                    Duración (Días) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={duracionDias}
                      onChange={(e) => setDuracionDias(e.target.value)}
                      placeholder="30"
                      className="w-full px-3 py-2 rounded-xl text-xs bg-theme border border-theme text-main-theme focus:border-volt outline-none"
                      required
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-muted-theme">días</span>
                  </div>
                </div>
              </div>

              {/* Selección de Puertas y Niveles de Acceso */}
              <div>
                <label className="text-xs font-bold text-muted-theme block mb-1.5">
                  Puertas / Torniquetes Autorizados *
                </label>
                <p className="text-[11px] text-muted-theme mb-2">
                  Marca qué accesos abrirá el checador para los socios que compren este paquete:
                </p>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {nivelesDisponibles.map((niv) => {
                    const isSelected = selectedNivelIds.includes(niv.id);
                    return (
                      <label
                        key={niv.id}
                        onClick={() => toggleNivel(niv.id)}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                          isSelected
                            ? isCyber
                              ? 'bg-volt/10 border-volt/50 text-main-theme'
                              : 'bg-orange-50 border-sport-orange text-main-theme'
                            : 'bg-theme border-theme text-muted-theme hover:text-main-theme'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded text-volt focus:ring-0 cursor-pointer"
                          />
                          <div>
                            <span className="font-bold text-xs block">{niv.nombre}</span>
                            <span className="text-[10px] text-muted-theme font-mono">
                              {niv.cuenta_nombre} • ID: {niv.cloud_level_id}
                            </span>
                          </div>
                        </div>

                        {isSelected && <ShieldCheck className="w-4 h-4 text-emerald-400" />}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Botones */}
              <div className="pt-3 border-t border-theme flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setMostrarModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-muted-theme hover:bg-theme"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className={`px-5 py-2 rounded-xl text-xs font-bold transition shadow-md ${
                    isCyber
                      ? 'bg-volt text-black shadow-volt-glow'
                      : 'bg-sport-orange text-white shadow-orange-glow'
                  } ${guardando ? 'opacity-50' : ''}`}
                >
                  {guardando ? 'Guardando...' : editandoPlanId ? 'Guardar Cambios' : 'Crear Paquete'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
