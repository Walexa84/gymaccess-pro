import React, { useState, useEffect } from 'react';
import { Search, Plus, UserCheck, UserX, Phone, Calendar, CreditCard, Users, Cloud, Cpu, AlertCircle, ShieldCheck, Ticket } from 'lucide-react';
import { TeamsSyncModal } from '../components/iam/TeamsSyncModal';
import { NuevaPersonaModal } from '../components/iam/NuevaPersonaModal';
import { FichaPersonaModal } from '../components/iam/FichaPersonaModal';
import { useTheme } from '../context/ThemeContext';

export const Personas: React.FC<{ onSelectPersonaForCobro: (persona: any) => void }> = ({ onSelectPersonaForCobro }) => {
  const [personas, setPersonas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState('TODOS');
  const [filtroEstado, setFiltroEstado] = useState<'ACTIVOS' | 'INACTIVOS'>('ACTIVOS');
  const [busqueda, setBusqueda] = useState('');
  const [teamsSyncOpen, setTeamsSyncOpen] = useState(false);
  const [modalAltaOpen, setModalAltaOpen] = useState(false);
  const [personaFichaId, setPersonaFichaId] = useState<number | null>(null);

  const { theme } = useTheme();
  const isCyber = theme === 'cyber';

  const cargarPersonas = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('estado', filtroEstado);
      if (filtroTipo !== 'TODOS') params.append('tipo', filtroTipo);
      if (busqueda) params.append('q', busqueda);

      const res = await fetch(`/api/iam/personas?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPersonas(data);
      }
    } catch (err) {
      console.error('Error cargando personas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarPersonas();
  }, [filtroTipo, busqueda, filtroEstado]);

  const handleEliminarPersona = async (id: number) => {
    if (!confirm('¿Deseas dar de baja a esta persona? Se removerá del checador físico.')) return;
    await fetch(`/api/iam/personas/${id}`, { method: 'DELETE' });
    cargarPersonas();
  };

  const handleReactivarPersona = async (id: number) => {
    if (!confirm('¿Deseas reactivar a esta persona en el directorio?')) return;
    await fetch(`/api/iam/personas/${id}/reactivar`, { method: 'POST' });
    cargarPersonas();
  };

  const computeVigenciaBadge = (p: any) => {
    if (p.tipo === 'EMPLEADO') {
      return { text: 'Staff 24/7', color: 'bg-purple-500/15 text-purple-300 border-purple-500/30' };
    }
    if (!p.vigencia_fin) {
      return { text: 'Sin vigencia', color: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30' };
    }
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const fin = new Date(p.vigencia_fin.includes('T') ? p.vigencia_fin : `${p.vigencia_fin}T23:59:59`);
    fin.setHours(0, 0, 0, 0);
    const diffDias = Math.ceil((fin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    const esCortesia = p.tipo === 'VISITANTE' || p.plan_nombre?.toLowerCase().includes('cortesía');

    if (diffDias > 1) {
      return { text: `${diffDias}d restantes`, color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
    }
    if (diffDias === 1) {
      return { text: esCortesia ? '🎟️ Cortesía (Vence mañ)' : 'Vence mañana', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30' };
    }
    if (diffDias === 0) {
      return { text: esCortesia ? '🎟️ Cortesía (Vence hoy)' : 'Vence hoy (11:59 PM)', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
    }
    return { text: `Vencido hace ${Math.abs(diffDias)}d`, color: 'bg-red-500/15 text-red-400 border-red-500/30' };
  };

  const handleOtorgarCortesia = async (p: any) => {
    const usadas = p.cortesias_usadas || 0;
    if (usadas >= 3) {
      alert(`Esta persona (ID #${p.id} - ${p.nombre}) ya utilizó sus 3 pases de cortesía permitidos.`);
      return;
    }
    if (!confirm(`¿Activar pase de cortesía de 1 día (Vence hoy 23:59:59) para ${p.nombre}?\n(Lleva ${usadas} de 3 cortesías usadas)`)) return;
    try {
      const res = await fetch(`/api/iam/personas/${p.id}/cortesia`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al otorgar cortesía');
      alert(`✅ Cortesía activada para ${p.nombre}. Cortesías usadas: ${data.cortesiasUsadas}/3`);
      cargarPersonas();
    } catch (err: any) {
      alert(`⚠️ ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 transition-colors duration-300">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-main-theme tracking-tight">
            Directorio Central de Personas
          </h2>
          <p className="text-sm text-muted-theme mt-1 font-medium">
            Núcleo de identidad (IAM): Socios, personal del gimnasio y visitantes con biometría
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setTeamsSyncOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-theme-subtle border border-theme text-main-theme hover:text-cyan-400 transition-all shadow-sm"
            title="Escanear checador físico, importar usuarios o purgar no registrados"
          >
            <Cloud className="w-4 h-4 text-cyan-400" />
            <span>Triaje Checador (Teams)</span>
          </button>

          <button
            onClick={() => setModalAltaOpen(true)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md ${
              isCyber
                ? 'bg-volt text-black shadow-volt-glow hover:opacity-90'
                : 'bg-sport-orange text-white shadow-orange-glow hover:opacity-90'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Persona</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-2xl bg-card-theme border border-theme card-shadow-theme">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-theme" />
          <input
            type="text"
            placeholder="Buscar por nombre, teléfono o código (PER-XXXX)..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-theme-subtle border border-theme text-xs text-main-theme placeholder:text-muted-theme focus:outline-none focus:border-accent-theme transition"
          />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Selector de Estado: Activos vs Dados de Baja */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-theme-subtle border border-theme shrink-0">
            <button
              onClick={() => setFiltroEstado('ACTIVOS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                filtroEstado === 'ACTIVOS'
                  ? isCyber ? 'bg-volt text-black shadow-sm' : 'bg-sport-orange text-white shadow-sm'
                  : 'text-muted-theme hover:text-main-theme'
              }`}
            >
              Activos
            </button>
            <button
              onClick={() => setFiltroEstado('INACTIVOS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                filtroEstado === 'INACTIVOS'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30 font-extrabold'
                  : 'text-muted-theme hover:text-main-theme'
              }`}
            >
              Dados de Baja
            </button>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            {['TODOS', 'SOCIO', 'EMPLEADO', 'VISITANTE'].map((t) => (
              <button
                key={t}
                onClick={() => setFiltroTipo(t)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  filtroTipo === t
                    ? isCyber ? 'bg-volt text-black' : 'bg-sport-orange text-white'
                    : 'text-muted-theme hover:text-main-theme bg-theme-subtle border border-theme'
                }`}
              >
                {t === 'VISITANTE' ? '🎟️ CORTESÍAS' : t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid de Personas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {personas.map((p) => {
          const esSocio = p.tipo === 'SOCIO';
          const estaVigente = p.membresia_estatus === 'VIGENTE';
          const vigBadge = computeVigenciaBadge(p);

          return (
            <div
              key={p.id}
              className="bg-card-theme border border-theme card-shadow-theme rounded-2xl p-5 relative flex flex-col justify-between transition hover:translate-y-[-2px]"
            >
              <div>
                <div className="flex items-start gap-3.5 mb-4">
                  {/* Foto de la Persona */}
                  <div className="w-16 h-16 rounded-2xl overflow-hidden bg-theme-subtle border border-theme shrink-0 flex items-center justify-center">
                    {p.foto_url ? (
                      <img src={p.foto_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Users className="w-7 h-7 text-muted-theme" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-mono-numbers font-bold text-muted-theme uppercase">
                        {p.codigo}
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        {p.activo === 0 ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-red-500/15 text-red-400 border border-red-500/30">
                            INACTIVO
                          </span>
                        ) : (
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold border ${vigBadge.color}`}>
                            {vigBadge.text}
                          </span>
                        )}
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                          p.tipo === 'EMPLEADO'
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                            : p.tipo === 'VISITANTE'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                            : 'bg-theme-subtle text-muted-theme border border-theme'
                        }`}>
                          {p.tipo === 'VISITANTE' ? 'CORTESÍA' : p.tipo}
                        </span>
                      </div>
                    </div>

                    <h4 className="font-bold text-sm text-main-theme truncate mt-0.5">
                      {p.nombre} {p.apellidos}
                    </h4>

                    <div className="flex items-center justify-between gap-1 mt-1">
                      <p className="text-xs text-muted-theme flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {p.telefono}
                      </p>
                      {p.hik_person_id ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20" title={`ID Teams: ${p.hik_person_id}`}>
                          <Cpu className="w-2.5 h-2.5" /> Checador
                        </span>
                      ) : esSocio && estaVigente ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20" title="Requiere sincronizar con Teams">
                          <AlertCircle className="w-2.5 h-2.5" /> Pendiente
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Estatus si es Socio */}
                {esSocio && (() => {
                  let badge = null;
                  if (p.vigencia_fin) {
                    const hoy = new Date();
                    hoy.setHours(0, 0, 0, 0);
                    const fin = new Date(p.vigencia_fin.includes('T') ? p.vigencia_fin : `${p.vigencia_fin}T23:59:59`);
                    fin.setHours(0, 0, 0, 0);
                    const diffMs = fin.getTime() - hoy.getTime();
                    const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                    badge = diffDias > 0 
                      ? { text: `${diffDias} días restantes`, color: 'text-emerald-400' }
                      : diffDias === 0 
                      ? { text: 'Vence hoy (11:59 PM)', color: 'text-amber-400' }
                      : { text: `Vencido hace ${Math.abs(diffDias)} días`, color: 'text-red-400' };
                  }

                  return (
                    <div className="p-2.5 rounded-xl bg-theme-subtle border border-theme text-xs space-y-1 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-theme font-medium">Membresía:</span>
                        <span className={`font-bold flex items-center gap-1 ${estaVigente ? 'text-emerald-400' : 'text-red-400'}`}>
                          {estaVigente ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                          {estaVigente ? 'Vigente' : 'Vencida'}
                        </span>
                      </div>
                      {p.vigencia_fin && (
                        <div className="flex items-center justify-between text-[11px] text-muted-theme">
                          <span>Vigencia:</span>
                          <span className={`font-mono font-bold ${badge?.color || 'text-main-theme'}`}>
                            {badge?.text || p.vigencia_fin}
                          </span>
                        </div>
                      )}
                      {p.plan_nombre && (
                        <div className="text-[11px] text-muted-theme truncate">
                          Plan: <span className="font-semibold text-main-theme">{p.plan_nombre}</span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Botones de Acción */}
              <div className="flex items-center justify-between pt-2 border-t border-theme gap-2">
                {p.activo === 0 ? (
                  <>
                    <button
                      onClick={() => setPersonaFichaId(p.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-bold bg-theme-subtle hover:text-cyan-400 border border-theme transition"
                      title="Ver expediente e historial"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" /> Ver Ficha
                    </button>
                    <button
                      onClick={() => handleReactivarPersona(p.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition shadow-sm"
                      title="Reactivar en el directorio"
                    >
                      <UserCheck className="w-3.5 h-3.5" /> Reactivar
                    </button>
                  </>
                ) : esSocio ? (
                  <>
                    <button
                      onClick={() => onSelectPersonaForCobro(p)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-bold bg-theme-subtle hover:text-accent-theme border border-theme transition"
                    >
                      <CreditCard className="w-3.5 h-3.5" /> Cobrar
                    </button>
                    <button
                      onClick={() => handleOtorgarCortesia(p)}
                      disabled={(p.cortesias_usadas || 0) >= 3}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 border ${
                        (p.cortesias_usadas || 0) >= 3
                          ? 'bg-zinc-800/40 text-zinc-500 border-zinc-700/30 cursor-not-allowed opacity-60'
                          : (p.cortesias_usadas || 0) === 2
                          ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25'
                          : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/25'
                      }`}
                      title={(p.cortesias_usadas || 0) >= 3 ? 'Límite de 3 cortesías alcanzado' : `Activar cortesía 1 día (${p.cortesias_usadas || 0}/3 usadas)`}
                    >
                      <Ticket className="w-3.5 h-3.5" />
                      <span>{(p.cortesias_usadas || 0) >= 3 ? '3/3' : `${p.cortesias_usadas || 0}/3`}</span>
                    </button>
                    <button
                      onClick={() => setPersonaFichaId(p.id)}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-theme-subtle hover:text-cyan-400 border border-theme transition flex items-center gap-1"
                      title="Ver expediente, foto y control de puertas"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" /> Ficha
                    </button>
                    <button
                      onClick={() => handleEliminarPersona(p.id)}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/10 transition"
                      title="Dar de baja y retirar del checador"
                    >
                      Baja
                    </button>
                  </>
                ) : (
                  <>
                    {p.tipo !== 'EMPLEADO' && (
                      <button
                        onClick={() => handleOtorgarCortesia(p)}
                        disabled={(p.cortesias_usadas || 0) >= 3}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-bold transition border ${
                          (p.cortesias_usadas || 0) >= 3
                            ? 'bg-zinc-800/40 text-zinc-500 border-zinc-700/30 cursor-not-allowed opacity-60'
                            : (p.cortesias_usadas || 0) === 2
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25'
                            : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/25'
                        }`}
                        title={(p.cortesias_usadas || 0) >= 3 ? 'Límite alcanzado' : `Otorgar cortesía 1 día (${p.cortesias_usadas || 0}/3 usadas)`}
                      >
                        <Ticket className="w-3.5 h-3.5" />
                        <span>{(p.cortesias_usadas || 0) >= 3 ? '3/3 usadas' : `Cortesía (${p.cortesias_usadas || 0}/3)`}</span>
                      </button>
                    )}
                    <button
                      onClick={() => setPersonaFichaId(p.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-bold bg-theme-subtle hover:text-cyan-400 border border-theme transition"
                      title="Ver expediente, foto y control de puertas"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" /> Ver Ficha
                    </button>
                    <button
                      onClick={() => handleEliminarPersona(p.id)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/10 transition"
                      title="Dar de baja y retirar del checador"
                    >
                      Baja
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {personas.length === 0 && !loading && (
          <div className="col-span-full py-16 text-center text-muted-theme">
            No se encontraron personas registradas con los criterios seleccionados.
          </div>
        )}
      </div>

      {/* Modal Unificado de Alta y Enrolamiento en Checador */}
      <NuevaPersonaModal
        isOpen={modalAltaOpen}
        onClose={() => setModalAltaOpen(false)}
        onSuccess={(persona) => {
          cargarPersonas();
          if (persona.tipo === 'SOCIO') {
            onSelectPersonaForCobro(persona);
          }
        }}
      />

      {/* Teams Sync & Triaje Modal */}
      <TeamsSyncModal
        isOpen={teamsSyncOpen}
        onClose={() => setTeamsSyncOpen(false)}
        onPersonImported={cargarPersonas}
      />

      {/* Modal de Ficha Integral del Socio con Foto 3:4, Puertas y Vigencia */}
      <FichaPersonaModal
        isOpen={!!personaFichaId}
        onClose={() => setPersonaFichaId(null)}
        personaId={personaFichaId}
        onSuccess={cargarPersonas}
      />
    </div>
  );
};
