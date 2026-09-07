import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, CheckCircle2, XCircle, AlertTriangle, RefreshCw, 
  Search, Sliders, Ticket, Lock, ArrowUpRight, ArrowDownLeft, Clock,
  Calendar, Layers, UserCheck, ShieldCheck, Filter, FileSpreadsheet, Printer
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useBranding } from '../context/BrandingContext';

export const Bitacora: React.FC = () => {
  const { theme } = useTheme();
  const { branding } = useBranding();
  const isCyber = theme === 'cyber';

  const [activeTab, setActiveTab] = useState<'accesos' | 'operaciones'>('accesos');
  const [metricas, setMetricas] = useState<any>({
    accesosConcedidos: 0,
    accesosDenegados: 0,
    aperturasManuales: 0,
    cortesiasHoy: 0,
  });

  // Estados de eventos de acceso
  const [eventosAcceso, setEventosAcceso] = useState<any[]>([]);
  const [totalAccesos, setTotalAccesos] = useState(0);
  const [filtroTipoAcceso, setFiltroTipoAcceso] = useState('TODOS');
  const [busquedaAcceso, setBusquedaAcceso] = useState('');

  // Estados de auditoría del sistema
  const [eventosAuditoria, setEventosAuditoria] = useState<any[]>([]);
  const [totalAuditoria, setTotalAuditoria] = useState(0);
  const [filtroModulo, setFiltroModulo] = useState('TODOS');
  const [busquedaAuditoria, setBusquedaAuditoria] = useState('');

  const [loading, setLoading] = useState(false);

  // Cargar métricas
  const cargarMetricas = async () => {
    try {
      const res = await fetch('/api/audit/metricas');
      const data = await res.json();
      if (data.success && data.data) {
        setMetricas(data.data);
      }
    } catch (err) {
      console.error('Error al cargar métricas de auditoría:', err);
    }
  };

  // Cargar accesos físicos
  const cargarAccesos = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filtroTipoAcceso !== 'TODOS') params.append('tipoEvento', filtroTipoAcceso);
      if (busquedaAcceso.trim()) params.append('busqueda', busquedaAcceso.trim());
      params.append('limit', '100');

      const res = await fetch(`/api/audit/accesos?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setEventosAcceso(data.eventos || []);
        setTotalAccesos(data.total || 0);
      }
    } catch (err) {
      console.error('Error al cargar eventos de acceso:', err);
    } finally {
      setLoading(false);
    }
  };

  // Cargar operaciones de auditoría
  const cargarAuditoria = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filtroModulo !== 'TODOS') params.append('modulo', filtroModulo);
      if (busquedaAuditoria.trim()) params.append('busqueda', busquedaAuditoria.trim());
      params.append('limit', '100');

      const res = await fetch(`/api/audit/eventos?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setEventosAuditoria(data.eventos || []);
        setTotalAuditoria(data.total || 0);
      }
    } catch (err) {
      console.error('Error al cargar auditoría:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarMetricas();
  }, []);

  useEffect(() => {
    if (activeTab === 'accesos') cargarAccesos();
    else cargarAuditoria();
  }, [activeTab, filtroTipoAcceso, busquedaAcceso, filtroModulo, busquedaAuditoria]);

  // Formato unificado de fecha y hora en huso horario local de México (GMT-6)
  const formatFechaHora = (dateStr?: string) => {
    if (!dateStr) return { fecha: '-', hora: '-' };
    try {
      const normalized = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + 'Z';
      const d = new Date(normalized);
      if (isNaN(d.getTime())) {
        const parts = dateStr.split(' ');
        return { fecha: parts[0] || '', hora: parts[1] || '' };
      }
      const fecha = d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
      const hora = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
      return { fecha, hora };
    } catch {
      const parts = (dateStr || '').split(' ');
      return { fecha: parts[0] || '', hora: parts[1] || '' };
    }
  };

  // Exportar a Excel (formato CSV con UTF-8 BOM para compatibilidad directa con MS Excel)
  const exportarExcel = () => {
    const hoyStr = new Date().toISOString().split('T')[0];
    let csv = '';
    let filename = '';

    if (activeTab === 'accesos') {
      filename = `bitacora_accesos_${hoyStr}.csv`;
      const headers = ['ID', 'Fecha', 'Hora', 'Persona / Socio', 'Torniquete', 'Sentido', 'Tipo de Evento', 'Método Autenticación', 'Dispositivo'];
      const rows = eventosAcceso.map(ev => {
        const fh = formatFechaHora(ev.fecha_hora);
        return [
          ev.id,
          `"${fh.fecha}"`,
          `"${fh.hora}"`,
          `"${(ev.persona_nombre || 'Desconocido').replace(/"/g, '""')}"`,
          `"${(ev.torniquete_nombre || 'Torniquete').replace(/"/g, '""')}"`,
          `"${ev.direccion || 'ENTRADA'}"`,
          `"${ev.tipo_evento}"`,
          `"${ev.metodo_autenticacion || 'FACIAL'}"`,
          `"${(ev.dispositivo_nombre || '').replace(/"/g, '""')}"`,
        ].join(';');
      });
      csv = [headers.join(';'), ...rows].join('\r\n');
    } else {
      filename = `bitacora_operaciones_${hoyStr}.csv`;
      const headers = ['ID', 'Fecha', 'Hora', 'Módulo', 'Acción', 'Operador', 'Cliente / Persona', 'Resultado', 'Detalles'];
      const rows = eventosAuditoria.map(ev => {
        const fh = formatFechaHora(ev.fecha_hora);
        return [
          ev.id,
          `"${fh.fecha}"`,
          `"${fh.hora}"`,
          `"${ev.modulo}"`,
          `"${ev.accion}"`,
          `"${(ev.usuario_nombre || 'Sistema').replace(/"/g, '""')}"`,
          `"${(ev.persona_nombre || '').replace(/"/g, '""')}"`,
          `"${ev.resultado}"`,
          `"${(ev.detalles || '').replace(/"/g, '""')}"`,
        ].join(';');
      });
      csv = [headers.join(';'), ...rows].join('\r\n');
    }

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Disparar reporte imprimible / PDF
  const imprimirReporte = () => {
    window.print();
  };

  const BADGES_MAP: Record<string, { text: string; color: string; icon: any }> = {
    CONCEDIDO: { text: 'Acceso Concedido', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: CheckCircle2 },
    DENEGADO_VENCIDO: { text: 'Denegado: Vencido', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30', icon: AlertTriangle },
    DENEGADO_DESCONOCIDO: { text: 'No Reconocido', color: 'bg-red-500/15 text-red-400 border-red-500/30', icon: XCircle },
    DENEGADO_HORARIO: { text: 'Fuera de Horario', color: 'bg-orange-500/15 text-orange-400 border-orange-500/30', icon: Clock },
    APERTURA_MANUAL: { text: 'Apertura Manual', color: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30', icon: ShieldCheck },
  };

  const getTipoEventoBadge = (tipo: string) =>
    BADGES_MAP[tipo] || { text: tipo, color: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30', icon: AlertTriangle };

  return (
    <div className="space-y-6 transition-colors duration-300">
      {/* Encabezado visible exclusivamente al imprimir o guardar en PDF */}
      <div className="hidden print:block border-b border-gray-300 pb-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-black">{branding.gym_nombre || 'AccessCore Gym'}</h1>
            <p className="text-sm text-gray-600 font-medium">Reporte Oficial de Bitácora & Auditoría</p>
            <p className="text-xs text-gray-500 mt-1">
              Generado el: {new Date().toLocaleString('es-MX')} • Vista: {activeTab === 'accesos' ? 'Control de Acceso Físico' : 'Operaciones del Sistema'}
            </p>
          </div>
          {branding.gym_logo_url && (
            <img src={branding.gym_logo_url} alt="Logo" className="w-14 h-14 object-contain" />
          )}
        </div>
      </div>

      {/* Encabezado en Pantalla */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-main-theme tracking-tight flex items-center gap-3">
            Bitácora & Auditoría del Sistema
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-theme-subtle border border-theme text-muted-theme font-mono font-medium">
              V2.5
            </span>
          </h2>
          <p className="text-sm text-muted-theme mt-1 font-medium">
            Registro cronológico unificado de accesos a torniquetes y operaciones del sistema
          </p>
        </div>

        {/* Barra de Acciones: Excel, Imprimir/PDF y Actualizar */}
        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <button
            onClick={exportarExcel}
            title="Exportar a Microsoft Excel (.csv)"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs bg-theme-subtle border border-theme text-main-theme hover:text-emerald-400 hover:border-emerald-500/40 transition-all shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Exportar Excel</span>
            <span className="sm:hidden">Excel</span>
          </button>

          <button
            onClick={imprimirReporte}
            title="Imprimir o Guardar en PDF"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs bg-theme-subtle border border-theme text-main-theme hover:text-cyan-400 hover:border-cyan-500/40 transition-all shadow-sm"
          >
            <Printer className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Imprimir / PDF</span>
            <span className="sm:hidden">PDF</span>
          </button>

          <button
            onClick={() => { cargarMetricas(); if (activeTab === 'accesos') cargarAccesos(); else cargarAuditoria(); }}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs bg-theme-subtle border border-theme text-main-theme hover:text-accent-theme transition-all shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        </div>
      </div>

      {/* Tarjetas de Métricas de Hoy */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-card-theme border border-theme card-shadow-theme flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-muted-theme uppercase tracking-wider block">Accesos Concedidos</span>
            <span className="text-2xl font-display font-extrabold text-emerald-400 mt-1 block">
              {metricas.accesosConcedidos}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card-theme border border-theme card-shadow-theme flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-muted-theme uppercase tracking-wider block">Accesos Denegados</span>
            <span className="text-2xl font-display font-extrabold text-red-400 mt-1 block">
              {metricas.accesosDenegados}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
            <XCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card-theme border border-theme card-shadow-theme flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-muted-theme uppercase tracking-wider block">Aperturas Manuales</span>
            <span className="text-2xl font-display font-extrabold text-cyan-400 mt-1 block">
              {metricas.aperturasManuales}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card-theme border border-theme card-shadow-theme flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-muted-theme uppercase tracking-wider block">Cortesías Hoy</span>
            <span className="text-2xl font-display font-extrabold text-amber-400 mt-1 block">
              {metricas.cortesiasHoy}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Ticket className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Pestañas Principales */}
      <div className="flex items-center gap-2 border-b border-theme pb-2">
        <button
          onClick={() => setActiveTab('accesos')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'accesos'
              ? isCyber ? 'bg-volt text-black shadow-sm' : 'bg-sport-orange text-white shadow-sm'
              : 'text-muted-theme hover:text-main-theme'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Control de Acceso Físico ({totalAccesos})</span>
        </button>
        <button
          onClick={() => setActiveTab('operaciones')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'operaciones'
              ? isCyber ? 'bg-volt text-black shadow-sm' : 'bg-sport-orange text-white shadow-sm'
              : 'text-muted-theme hover:text-main-theme'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Operaciones del Sistema ({totalAuditoria})</span>
        </button>
      </div>

      {/* VISTA 1: ACCESOS FÍSICOS (TORNIQUETES) */}
      {activeTab === 'accesos' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-2xl bg-card-theme border border-theme">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-theme" />
              <input
                type="text"
                placeholder="Buscar por persona, torniquete..."
                value={busquedaAcceso}
                onChange={(e) => setBusquedaAcceso(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-theme-subtle border border-theme text-xs text-main-theme focus:outline-none focus:border-accent-theme"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto">
              {['TODOS', 'CONCEDIDO', 'DENEGADO_VENCIDO', 'DENEGADO_DESCONOCIDO', 'APERTURA_MANUAL'].map((t) => (
                <button
                  key={t}
                  onClick={() => setFiltroTipoAcceso(t)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    filtroTipoAcceso === t
                      ? isCyber ? 'bg-volt text-black' : 'bg-sport-orange text-white'
                      : 'text-muted-theme hover:text-main-theme bg-theme-subtle border border-theme'
                  }`}
                >
                  {t === 'TODOS' ? 'Todos' : t.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Lista de Eventos de Acceso */}
          <div className="bg-card-theme border border-theme card-shadow-theme rounded-2xl overflow-hidden divide-y divide-theme">
            {eventosAcceso.map((ev) => {
              const badge = getTipoEventoBadge(ev.tipo_evento);
              const BadgeIcon = badge.icon;
              const fh = formatFechaHora(ev.fecha_hora);

              return (
                <div key={ev.id} className="p-4 flex items-center justify-between gap-4 hover:bg-theme-subtle/50 transition">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-theme-subtle border border-theme shrink-0 flex items-center justify-center">
                      {ev.persona_foto ? (
                        <img src={ev.persona_foto} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <BadgeIcon className="w-5 h-5 text-muted-theme" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-main-theme truncate">{ev.persona_nombre || 'Desconocido'}</h4>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border flex items-center gap-1 ${badge.color}`}>
                          <BadgeIcon className="w-3 h-3" />
                          {badge.text}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-theme flex items-center gap-2 mt-0.5">
                        <span>{ev.torniquete_nombre || 'Torniquete Principal'}</span>
                        <span>•</span>
                        <span className="font-mono">{ev.metodo_autenticacion || 'FACIAL'}</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-mono font-bold text-main-theme block">{fh.hora}</span>
                    <span className="text-[11px] text-muted-theme font-medium block">{fh.fecha}</span>
                    <span className="text-[10px] text-muted-theme font-semibold uppercase">{ev.direccion || 'ENTRADA'}</span>
                  </div>
                </div>
              );
            })}

            {eventosAcceso.length === 0 && !loading && (
              <div className="py-12 text-center text-muted-theme text-xs">
                No se encontraron eventos de acceso con los filtros seleccionados.
              </div>
            )}
          </div>
        </div>
      )}

      {/* VISTA 2: OPERACIONES DEL SISTEMA (AUDITORÍA) */}
      {activeTab === 'operaciones' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-2xl bg-card-theme border border-theme">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-theme" />
              <input
                type="text"
                placeholder="Buscar por usuario, socio o detalle..."
                value={busquedaAuditoria}
                onChange={(e) => setBusquedaAuditoria(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-theme-subtle border border-theme text-xs text-main-theme focus:outline-none focus:border-accent-theme"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto">
              {['TODOS', 'MEMBRESIA', 'POS', 'ACCESO', 'IAM', 'SISTEMA'].map((m) => (
                <button
                  key={m}
                  onClick={() => setFiltroModulo(m)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    filtroModulo === m
                      ? isCyber ? 'bg-volt text-black' : 'bg-sport-orange text-white'
                      : 'text-muted-theme hover:text-main-theme bg-theme-subtle border border-theme'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-card-theme border border-theme card-shadow-theme rounded-2xl overflow-hidden divide-y divide-theme">
            {eventosAuditoria.map((ev) => {
              const fh = formatFechaHora(ev.fecha_hora);
              return (
                <div key={ev.id} className="p-4 flex items-center justify-between gap-4 hover:bg-theme-subtle/50 transition">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-theme-subtle border border-theme text-cyan-400 font-mono">
                        {ev.modulo}
                      </span>
                      <span className="text-xs font-bold text-main-theme">{ev.accion}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                        ev.resultado === 'EXITO' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {ev.resultado}
                      </span>
                    </div>
                    <p className="text-xs text-muted-theme mt-1 truncate">{ev.detalles}</p>
                    <p className="text-[10px] text-muted-theme mt-0.5 flex items-center gap-2">
                      <span>Operador: <strong className="text-main-theme font-semibold">{ev.usuario_nombre || 'Sistema'}</strong></span>
                      {ev.persona_nombre && <span>• Cliente: <strong className="text-main-theme font-semibold">{ev.persona_nombre}</strong></span>}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-mono font-bold text-main-theme block">{fh.hora}</span>
                    <span className="text-[11px] text-muted-theme font-medium block">{fh.fecha}</span>
                  </div>
                </div>
              );
            })}

            {eventosAuditoria.length === 0 && !loading && (
              <div className="py-12 text-center text-muted-theme text-xs">
                No se registraron operaciones de auditoría con los criterios seleccionados.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
