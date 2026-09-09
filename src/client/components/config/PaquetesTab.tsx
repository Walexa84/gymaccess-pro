import React, { useState, useEffect } from 'react';
import { 
  Package, Plus, Edit2, Trash2, ShieldCheck, Check, X, 
  DoorOpen, Clock, DollarSign, Calendar, AlertCircle, Cpu, Layers
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { BaseModal } from '../common/BaseModal';

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

      {/* Modal de Creación / Edición de Paquete con BaseModal */}
      <BaseModal
        isOpen={mostrarModal}
        onClose={() => setMostrarModal(false)}
        title={editandoPlanId ? 'Editar Paquete Comercial' : 'Nuevo Paquete de Membresía'}
        subtitle="Configura precios, vigencias y puertas autorizadas en los checadores biométricos"
        icon={<Package className="w-5 h-5 text-current" />}
        size="2xl"
        badgeText={editandoPlanId ? 'Plan Existente' : 'Nuevo'}
        footer={
          <>
            <button
              type="button"
              onClick={() => setMostrarModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-muted-theme hover:bg-theme-subtle transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleGuardar}
              disabled={guardando}
              className={`px-5 py-2.5 rounded-xl text-xs font-extrabold transition shadow-md flex items-center gap-2 ${
                isCyber
                  ? 'bg-volt text-black shadow-volt-glow hover:bg-volt/90'
                  : 'bg-sport-orange text-white shadow-orange-glow hover:opacity-90'
              } ${guardando ? 'opacity-50' : ''}`}
            >
              {guardando ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Guardando y Propagando...</span>
                </>
              ) : (
                <span>{editandoPlanId ? 'Guardar Cambios' : 'Crear Paquete'}</span>
              )}
            </button>
          </>
        }
      >
        <form onSubmit={handleGuardar} className="space-y-4">
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
              className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-theme-subtle border border-theme text-main-theme focus:border-accent-theme outline-none transition"
              required
            />
          </div>

          {/* Precio y Duración en 2 Columnas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-muted-theme block mb-1">
                Precio (MXN) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-xs text-muted-theme font-bold">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={precio}
                  onChange={(e) => setPrecio(e.target.value)}
                  placeholder="500.00"
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-xl text-xs bg-theme-subtle border border-theme text-main-theme focus:border-accent-theme outline-none transition"
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
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-theme-subtle border border-theme text-main-theme focus:border-accent-theme outline-none transition"
                  required
                />
                <span className="absolute right-3.5 top-2.5 text-xs text-muted-theme font-medium">días</span>
              </div>
            </div>
          </div>

          {/* Selección de Puertas y Niveles de Acceso - Grid de 2 columnas */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-main-theme flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-accent-theme" />
                <span>Puertas / Torniquetes Autorizados *</span>
              </label>
              <span className="text-[11px] text-muted-theme font-mono">
                {selectedNivelIds.length} de {nivelesDisponibles.length} seleccionados
              </span>
            </div>
            <p className="text-[11px] text-muted-theme mb-2.5">
              Marca qué accesos abrirá el checador para los socios que compren este paquete:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1 no-scrollbar">
              {nivelesDisponibles.map((niv) => {
                const isSelected = selectedNivelIds.includes(niv.id);
                return (
                  <div
                    key={niv.id}
                    onClick={() => toggleNivel(niv.id)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer select-none flex items-center justify-between gap-2.5 ${
                      isSelected
                        ? isCyber
                          ? 'bg-volt/10 border-volt/60 shadow-sm shadow-volt/10'
                          : 'bg-sport-orange/10 border-sport-orange/60 shadow-sm shadow-sport-orange/10'
                        : 'bg-theme-subtle/50 border-theme/60 hover:border-theme hover:bg-theme-subtle opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition ${
                          isSelected
                            ? isCyber
                              ? 'bg-volt border-volt text-black'
                              : 'bg-sport-orange border-sport-orange text-white'
                            : 'border-theme bg-card-theme'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <div className="truncate">
                        <span className="font-bold text-xs block text-main-theme truncate">
                          {niv.nombre}
                        </span>
                        <span className="text-[10px] text-muted-theme block truncate font-mono">
                          {niv.cuenta_nombre}
                        </span>
                      </div>
                    </div>

                    {isSelected && (
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Banner de protección Anti-Rate-Limit */}
          {editandoPlanId && (
            <div className="p-3 rounded-2xl bg-theme-subtle/60 border border-theme text-[11px] text-muted-theme flex items-start gap-2">
              <Cpu className="w-4 h-4 text-accent-theme shrink-0 mt-0.5" />
              <span>
                Al guardar, los socios activos con este paquete se actualizarán automáticamente en segundo plano mediante la <strong>cola protegida anti-saturación</strong> de Hik-Connect Teams.
              </span>
            </div>
          )}
        </form>
      </BaseModal>
    </div>
  );
};
