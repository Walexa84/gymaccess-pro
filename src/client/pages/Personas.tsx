import React, { useState, useEffect } from 'react';
import { 
  Search, Plus, Phone, Users, Cloud, Cpu, 
  AlertCircle, ShieldCheck, Ticket, Camera, X, RefreshCw, CheckCircle2, Clock
} from 'lucide-react';
import { TeamsSyncModal } from '../components/iam/TeamsSyncModal';
import { NuevaPersonaModal } from '../components/iam/NuevaPersonaModal';
import { FichaPersonaModal } from '../components/iam/FichaPersonaModal';
import { useTheme } from '../context/ThemeContext';

export const Personas: React.FC<{ onSelectPersonaForCobro: (persona: any) => void }> = ({ onSelectPersonaForCobro }) => {
  const [personas, setPersonas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState('TODOS');
  const [filtroEstado, setFiltroEstado] = useState<'ACTIVOS' | 'INACTIVOS'>('ACTIVOS');
  const [filtroVigencia, setFiltroVigencia] = useState('TODOS');
  const [filtroBiometria, setFiltroBiometria] = useState('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [busquedaDebounced, setBusquedaDebounced] = useState('');
  const [stats, setStats] = useState<any>({ activos: 0, inactivos: 0, socios: 0, empleados: 0, cortesias: 0, vigentes: 0, porVencer: 0, vencidos: 0, sinFoto: 0 });
  const [teamsSyncOpen, setTeamsSyncOpen] = useState(false);
  const [modalAltaOpen, setModalAltaOpen] = useState(false);
  const [personaFichaId, setPersonaFichaId] = useState<number | null>(null);

  const { theme } = useTheme();
  const isCyber = theme === 'cyber';

  useEffect(() => {
    const timer = setTimeout(() => setBusquedaDebounced(busqueda), 250);
    return () => clearTimeout(timer);
  }, [busqueda]);

  const cargarStats = async () => {
    try {
      const res = await fetch('/api/iam/personas/stats');
      if (res.ok) setStats(await res.json());
    } catch (e) {
      console.error('Error stats:', e);
    }
  };

  const cargarPersonas = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('estado', filtroEstado);
      if (filtroTipo !== 'TODOS') params.append('tipo', filtroTipo);
      if (filtroVigencia !== 'TODOS') params.append('vigencia', filtroVigencia);
      if (filtroBiometria !== 'TODOS') params.append('biometria', filtroBiometria);
      if (busquedaDebounced.trim()) params.append('q', busquedaDebounced.trim());

      const res = await fetch(`/api/iam/personas?${params.toString()}`);
      if (res.ok) setPersonas(await res.json());
    } catch (err) {
      console.error('Error cargando personas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarPersonas(); }, [filtroTipo, busquedaDebounced, filtroEstado, filtroVigencia, filtroBiometria]);
  useEffect(() => { cargarStats(); }, [modalAltaOpen, personaFichaId, teamsSyncOpen]);

  const resetearFiltros = () => {
    setBusqueda(''); setFiltroTipo('TODOS'); setFiltroEstado('ACTIVOS'); setFiltroVigencia('TODOS'); setFiltroBiometria('TODOS');
  };

  const hayFiltrosActivos = busqueda !== '' || filtroTipo !== 'TODOS' || filtroEstado !== 'ACTIVOS' || filtroVigencia !== 'TODOS' || filtroBiometria !== 'TODOS';
  const totalUniverso = filtroEstado === 'ACTIVOS' ? (stats.activos || 0) : (stats.inactivos || 0);

  const handleEliminarPersona = async (id: number) => {
    if (!confirm('¿Deseas dar de baja a esta persona? Se removerá del checador físico.')) return;
    await fetch(`/api/iam/personas/${id}`, { method: 'DELETE' });
    cargarPersonas(); cargarStats();
  };

  const handleReactivarPersona = async (id: number) => {
    if (!confirm('¿Deseas reactivar a esta persona en el directorio?')) return;
    await fetch(`/api/iam/personas/${id}/reactivar`, { method: 'POST' });
    cargarPersonas(); cargarStats();
  };

  const computeVigenciaBadge = (p: any) => {
    if (p.tipo === 'EMPLEADO') return { text: 'Staff 24/7', color: 'bg-purple-500/15 text-purple-300 border-purple-500/30' };
    if (!p.vigencia_fin) return { text: 'Sin vigencia', color: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30' };
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const fin = new Date(p.vigencia_fin.includes('T') ? p.vigencia_fin : `${p.vigencia_fin}T23:59:59`); fin.setHours(0, 0, 0, 0);
    const diffDias = Math.ceil((fin.getTime() - hoy.getTime()) / 86400000);
    const esCortesia = p.tipo === 'VISITANTE' || p.plan_nombre?.toLowerCase().includes('cortesía');
    if (diffDias > 1) return { text: `${diffDias}d restantes`, color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
    if (diffDias === 1) return { text: esCortesia ? '🎟️ Cortesía (Vence mañ)' : 'Vence mañana', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30' };
    if (diffDias === 0) return { text: esCortesia ? '🎟️ Cortesía (Vence hoy)' : 'Vence hoy (11:59 PM)', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
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
      cargarStats();
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
            title="Escanear checadores, alinear socios locales a todas las sucursales o purgar"
          >
            <Cloud className="w-4 h-4 text-cyan-400" />
            <span>🏥 Triaje & Conciliación</span>
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

      {/* Barra de Filtros Facetada (2 Niveles) */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-card-theme border border-theme card-shadow-theme space-y-3">
        {/* Nivel 1: Buscador + Activos/Bajas + Botón Limpiar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-theme" />
            <input
              type="text"
              placeholder="Buscar por nombre, teléfono o código (PER100X)..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-9 py-2 rounded-xl bg-theme-subtle border border-theme text-xs text-main-theme placeholder:text-muted-theme focus:outline-none focus:border-accent-theme transition"
            />
            {busqueda && (
              <button
                onClick={() => setBusqueda('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-theme hover:text-main-theme p-0.5 rounded-full"
                title="Limpiar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-theme-subtle border border-theme">
              <button
                onClick={() => setFiltroEstado('ACTIVOS')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  filtroEstado === 'ACTIVOS'
                    ? isCyber ? 'bg-volt text-black shadow-sm' : 'bg-sport-orange text-white shadow-sm'
                    : 'text-muted-theme hover:text-main-theme'
                }`}
              >
                <span>Activos</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${filtroEstado === 'ACTIVOS' ? 'bg-black/20 text-black' : 'bg-zinc-800 text-zinc-400'}`}>
                  {stats.activos}
                </span>
              </button>
              <button
                onClick={() => setFiltroEstado('INACTIVOS')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  filtroEstado === 'INACTIVOS'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30 font-extrabold'
                    : 'text-muted-theme hover:text-main-theme'
                }`}
              >
                <span>Dados de Baja</span>
                {stats.inactivos > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-red-500/30 text-red-300">
                    {stats.inactivos}
                  </span>
                )}
              </button>
            </div>

            {hayFiltrosActivos && (
              <button
                onClick={resetearFiltros}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-theme-subtle text-muted-theme hover:text-red-400 border border-theme transition flex items-center gap-1"
                title="Restablecer todos los filtros"
              >
                <RefreshCw className="w-3 h-3" />
                <span className="hidden sm:inline">Limpiar</span>
              </button>
            )}
          </div>
        </div>

        {/* Nivel 2: Filtros Facetados Limpios (Audiencia, Cobranza, Biometría) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs pt-1 border-t border-theme/50">
          <div className="flex items-center gap-1 shrink-0">
            {[
              { id: 'TODOS', label: 'Todos', count: stats.activos },
              { id: 'SOCIO', label: 'Socios', count: stats.socios },
              { id: 'EMPLEADO', label: 'Staff', count: stats.empleados },
              ...(stats.visitantes > 0 ? [{ id: 'VISITANTE', label: 'Visitantes', count: stats.visitantes }] : [])
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setFiltroTipo(t.id)}
                className={`px-3 py-1 rounded-xl font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                  filtroTipo === t.id
                    ? isCyber ? 'bg-volt text-black shadow-sm' : 'bg-sport-orange text-white shadow-sm'
                    : 'text-muted-theme hover:text-main-theme bg-theme-subtle border border-theme'
                }`}
              >
                <span>{t.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${filtroTipo === t.id ? 'bg-black/20 text-black' : 'text-muted-theme bg-black/20'}`}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-theme/80 shrink-0 mx-1" />

          {/* Semáforo de Cobranza (Sin números confusos adentro) */}
          <div className="flex items-center gap-1 shrink-0">
            {[
              { id: 'VIGENTE', label: 'Vigentes', icon: CheckCircle2, activeClass: 'bg-emerald-500/25 text-emerald-300 border-emerald-500/50' },
              { id: 'POR_VENCER', label: 'Por Vencer', icon: Clock, activeClass: 'bg-amber-500/25 text-amber-300 border-amber-500/50' },
              { id: 'VENCIDA', label: 'Vencidos', icon: AlertCircle, activeClass: 'bg-red-500/25 text-red-300 border-red-500/50' }
            ].map(({ id, label, icon: Icon, activeClass }) => (
              <button
                key={id}
                onClick={() => setFiltroVigencia(filtroVigencia === id ? 'TODOS' : id)}
                className={`px-2.5 py-1 rounded-xl font-bold transition flex items-center gap-1.5 border whitespace-nowrap ${
                  filtroVigencia === id ? `${activeClass} shadow-sm` : 'bg-theme-subtle text-muted-theme hover:text-main-theme border-theme'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-theme/80 shrink-0 mx-1" />

          {/* Biometría */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setFiltroBiometria(filtroBiometria === 'SIN_FOTO' ? 'TODOS' : 'SIN_FOTO')}
              className={`px-2.5 py-1 rounded-xl font-bold transition flex items-center gap-1.5 border whitespace-nowrap ${
                filtroBiometria === 'SIN_FOTO' ? 'bg-amber-500/25 text-amber-300 border-amber-500/50 shadow-sm' : 'bg-theme-subtle text-muted-theme hover:text-amber-300 border-theme'
              }`}
              title="Filtrar personas sin fotografía facial"
            >
              <Camera className="w-3 h-3 text-amber-400" />
              <span>Sin Rostro</span>
            </button>
          </div>
        </div>
      </div>

      {/* Cintillo Resumen en Lenguaje Claro */}
      <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-theme-subtle border border-theme text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-main-theme">
            {filtroEstado === 'INACTIVOS' ? `📁 Mostrando ${personas.length} persona(s) dada(s) de baja`
              : busquedaDebounced ? `🔍 Mostrando ${personas.length} resultado(s) para "${busquedaDebounced}" (de ${totalUniverso} activas)`
              : filtroVigencia === 'VENCIDA' ? `🔴 Mostrando ${personas.length} persona(s) con membresía vencida (de ${totalUniverso} activas)`
              : filtroVigencia === 'POR_VENCER' ? `🟡 Mostrando ${personas.length} persona(s) por vencer en los próximos 3 días (de ${totalUniverso} activas)`
              : filtroVigencia === 'VIGENTE' ? `🟢 Mostrando ${personas.length} persona(s) con membresía al día (de ${totalUniverso} activas)`
              : filtroBiometria === 'SIN_FOTO' ? `📷 Mostrando ${personas.length} persona(s) sin foto facial (de ${totalUniverso} activas)`
              : filtroTipo === 'SOCIO' ? `👤 Mostrando ${personas.length} socio(s) (de ${totalUniverso} personas activas)`
              : filtroTipo === 'EMPLEADO' ? `🛡️ Mostrando ${personas.length} colaborador(es) del staff (de ${totalUniverso} activos)`
              : filtroTipo === 'VISITANTE' ? `🎟️ Mostrando ${personas.length} visitante(s) (de ${totalUniverso} activos)`
              : `📋 Mostrando las ${personas.length} personas activas en la sucursal`}
          </span>
        </div>
        {hayFiltrosActivos && (
          <button onClick={resetearFiltros} className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
            ✕ Ver todos ({totalUniverso})
          </button>
        )}
      </div>

      {/* Grid de Personas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {personas.map((p) => {
          const esSocio = p.tipo === 'SOCIO';
          const vigBadge = computeVigenciaBadge(p);
          const estaVigente = p.membresia_estatus === 'VIGENTE' && !vigBadge.color.includes('red');

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
                        p.foto_url ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20" title={`ID Teams: ${p.hik_person_id}`}>
                            <Cpu className="w-2.5 h-2.5" /> Checador
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20" title="Enrolado en checador pero falta foto para reconocimiento facial">
                            <Camera className="w-2.5 h-2.5" /> Sin Rostro
                          </span>
                        )
                      ) : esSocio && estaVigente ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20" title="Requiere sincronizar con Teams">
                          <AlertCircle className="w-2.5 h-2.5" /> Pendiente
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Estatus si es Socio */}
                {esSocio && (
                  <div className="p-2.5 rounded-xl bg-theme-subtle border border-theme text-xs space-y-1 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-theme font-medium">Membresía:</span>
                      <span className={`font-bold flex items-center gap-1 ${estaVigente ? 'text-emerald-400' : 'text-red-400'}`}>
                        {estaVigente ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                        {estaVigente ? 'Vigente' : 'Vencida'}
                      </span>
                    </div>
                    {p.vigencia_fin && (
                      <div className="flex items-center justify-between text-[11px] text-muted-theme">
                        <span>Vigencia:</span>
                        <span className={`font-mono font-bold ${vigBadge.color.includes('emerald') ? 'text-emerald-400' : vigBadge.color.includes('amber') ? 'text-amber-400' : 'text-red-400'}`}>
                          {vigBadge.text}
                        </span>
                      </div>
                    )}
                    {p.plan_nombre && (
                      <div className="text-[11px] text-muted-theme truncate">
                        Plan: <span className="font-semibold text-main-theme">{p.plan_nombre}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Botones de Acción */}
              <div className="flex items-center justify-between pt-2 border-t border-theme gap-2">
                {p.activo === 0 ? (
                  <>
                    <button onClick={() => setPersonaFichaId(p.id)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-bold bg-theme-subtle hover:text-cyan-400 border border-theme transition" title="Ver expediente">
                      <ShieldCheck className="w-3.5 h-3.5" /> Ver Ficha
                    </button>
                    <button onClick={() => handleReactivarPersona(p.id)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition shadow-sm" title="Reactivar">
                      Reactivar
                    </button>
                  </>
                ) : (
                  <>
                    {esSocio && (
                      <button onClick={() => onSelectPersonaForCobro(p)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-bold bg-theme-subtle hover:text-accent-theme border border-theme transition" title="Cobrar membresía">
                        Cobrar
                      </button>
                    )}
                    {p.tipo !== 'EMPLEADO' && (
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
                        title={`Pase de cortesía 1 día (${p.cortesias_usadas || 0}/3 usadas)`}
                      >
                        <Ticket className="w-3.5 h-3.5" />
                        <span>{(p.cortesias_usadas || 0) >= 3 ? '3/3' : `${p.cortesias_usadas || 0}/3`}</span>
                      </button>
                    )}
                    <button onClick={() => setPersonaFichaId(p.id)} className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-theme-subtle hover:text-cyan-400 border border-theme transition flex items-center gap-1" title="Ver expediente">
                      <ShieldCheck className="w-3.5 h-3.5" /> Ficha
                    </button>
                    <button onClick={() => handleEliminarPersona(p.id)} className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/10 transition" title="Dar de baja">
                      Baja
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {personas.length === 0 && !loading && (
          <div className="col-span-full py-12 text-center text-muted-theme bg-card-theme border border-theme rounded-2xl p-6 space-y-2">
            <Users className="w-8 h-8 mx-auto text-muted-theme/40" />
            <p className="font-bold text-sm text-main-theme">No se encontraron personas</p>
            <p className="text-xs text-muted-theme">
              No hay registros que coincidan con los filtros seleccionados.
            </p>
            {hayFiltrosActivos && (
              <button
                onClick={resetearFiltros}
                className="mt-2 px-3 py-1.5 rounded-xl text-xs font-bold bg-theme-subtle text-cyan-400 border border-theme hover:bg-theme-subtle/80 transition"
              >
                Restablecer todos los filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modales */}
      <NuevaPersonaModal
        isOpen={modalAltaOpen}
        onClose={() => setModalAltaOpen(false)}
        onSuccess={(p) => { cargarPersonas(); cargarStats(); if (p?.tipo === 'SOCIO') onSelectPersonaForCobro(p); }}
      />
      <TeamsSyncModal isOpen={teamsSyncOpen} onClose={() => setTeamsSyncOpen(false)} onPersonImported={cargarPersonas} />
      <FichaPersonaModal isOpen={!!personaFichaId} onClose={() => setPersonaFichaId(null)} personaId={personaFichaId} onSuccess={cargarPersonas} />
    </div>
  );
};
