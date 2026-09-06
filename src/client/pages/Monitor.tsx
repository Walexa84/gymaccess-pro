import React, { useState, useEffect } from 'react';
import {
  Activity, ArrowUpRight, ArrowDownLeft, ShieldCheck, AlertTriangle, XCircle,
  Users, DoorOpen, Clock, RefreshCw, UserCheck, CheckCircle2
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface LiveEvent {
  id?: number;
  personaId?: number;
  personaNombre: string;
  personaFoto?: string | null;
  tipoEvento: 'CONCEDIDO' | 'DENEGADO_VENCIDO' | 'DENEGADO_HORARIO' | 'DENEGADO_DESCONOCIDO' | 'APERTURA_MANUAL' | 'ERROR';
  torniqueteId?: number;
  torniqueteNombre: string;
  direccion: 'ENTRADA' | 'SALIDA' | 'DESCONOCIDA';
  fechaHora: string;
  vigenciaFin?: string | null;
  diasRestantes?: number | null;
}

export const Monitor: React.FC<{ onNavigateCobro?: (socio: any) => void }> = ({ onNavigateCobro }) => {
  const { theme } = useTheme();
  const isCyber = theme === 'cyber';

  const [eventos, setEventos] = useState<LiveEvent[]>([]);
  const [ultimoEvento, setUltimoEvento] = useState<LiveEvent | null>(null);
  const [torniquetes, setTorniquetes] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({
    totalPersonas: 0,
    sociosVigentes: 0,
    sociosVencidos: 0,
    ingresosHoy: 0,
    entradasHoy: 0,
    salidasHoy: 0,
    aforoActual: 0,
  });
  const [abriendoId, setAbriendoId] = useState<number | null>(null);

  const cargarDatosIniciales = () => {
    fetch('/api/gym/stats').then(r => r.json()).then(setStats).catch(() => {});
    fetch('/api/access/torniquetes').then(r => r.json()).then(setTorniquetes).catch(() => {});
    fetch('/api/access/eventos?limit=15')
      .then(r => r.json())
      .then(data => {
        const mapped = data.map((e: any) => ({
          id: e.id,
          personaId: e.persona_id,
          personaNombre: e.persona_nombre,
          personaFoto: e.persona_foto,
          tipoEvento: e.tipo_evento,
          torniqueteId: e.torniquete_id,
          torniqueteNombre: e.torniquete_nombre || 'Torniquete Principal',
          direccion: e.direccion || 'ENTRADA',
          fechaHora: e.fecha_hora,
        }));
        setEventos(mapped);
        if (mapped.length > 0) setUltimoEvento(mapped[0]);
      })
      .catch(() => {});
  };

  // Conexión Server-Sent Events (SSE) para recepción de eventos en tiempo real (<100ms)
  useEffect(() => {
    cargarDatosIniciales();

    const eventSource = new EventSource('/api/access/events/stream');

    eventSource.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'ACCESS_EVENT') {
          const nuevo: LiveEvent = {
            id: msg.id,
            personaId: msg.personaId,
            personaNombre: msg.personaNombre,
            personaFoto: msg.personaFoto,
            tipoEvento: msg.tipoEvento,
            torniqueteId: msg.torniqueteId,
            torniqueteNombre: msg.torniqueteNombre,
            direccion: msg.direccion,
            fechaHora: msg.fechaHora,
            vigenciaFin: msg.vigenciaFin,
            diasRestantes: msg.diasRestantes,
          };

          setUltimoEvento(nuevo);
          setEventos(prev => [nuevo, ...prev.slice(0, 14)]);

          // Actualizar métricas
          fetch('/api/gym/stats').then(r => r.json()).then(setStats).catch(() => {});
        }
      } catch (err) {
        console.error('Error procesando evento SSE:', err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const handleAbrirTorniquete = async (id: number) => {
    try {
      setAbriendoId(id);
      await fetch(`/api/access/torniquetes/${id}/open`, { method: 'POST' });
    } finally {
      setAbriendoId(null);
    }
  };

  return (
    <div className="space-y-6 transition-colors duration-300">
      {/* Encabezado y Aforo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className={`w-3 h-3 rounded-full ${isCyber ? 'bg-volt animate-ping' : 'bg-sport-orange animate-ping'}`} />
            <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-main-theme tracking-tight">
              Monitor de Recepción en Vivo
            </h2>
          </div>
          <p className="text-sm text-muted-theme mt-1 font-medium">
            Telemetría de torniquetes, control biométrico facial y flujo de acceso
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Tarjeta de Aforo Actual */}
          <div className="px-4 py-2 rounded-2xl bg-theme-subtle border border-theme flex items-center gap-3">
            <Users className="w-5 h-5 text-accent-theme" />
            <div>
              <div className="text-[10px] uppercase font-bold text-muted-theme">Aforo en Sala</div>
              <div className="text-lg font-black font-mono-numbers text-main-theme leading-none">
                {stats.aforoActual} <span className="text-xs font-normal text-muted-theme">personas</span>
              </div>
            </div>
          </div>

          <button
            onClick={cargarDatosIniciales}
            className="p-2.5 rounded-xl border border-theme bg-theme-subtle hover:text-accent-theme transition"
            title="Refrescar datos"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid Superior: Tarjeta Hero del Último Acceso & Apertura Rápida */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* HERO CARD: Último Pase (Ocupa 2 columnas) */}
        <div className="lg:col-span-2 bg-card-theme border border-theme card-shadow-theme rounded-2xl p-6 relative overflow-hidden transition-all duration-300">
          <div className="flex items-center justify-between border-b border-theme pb-3 mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-theme flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-accent-theme" /> Última Detección en Hardware
            </span>
            {ultimoEvento?.fechaHora && (
              <span className="text-xs font-mono-numbers text-muted-theme">
                {new Date(ultimoEvento.fechaHora).toLocaleTimeString()}
              </span>
            )}
          </div>

          {ultimoEvento ? (
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Fotografía Oficial */}
              <div className="relative">
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden bg-theme-subtle border-2 border-theme flex items-center justify-center">
                  {ultimoEvento.personaFoto ? (
                    <img src={ultimoEvento.personaFoto} alt={ultimoEvento.personaNombre} className="w-full h-full object-cover" />
                  ) : (
                    <Users className="w-12 h-12 text-muted-theme" />
                  )}
                </div>
                <div className={`absolute -bottom-2 -right-2 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border shadow-md ${
                  ultimoEvento.direccion === 'SALIDA'
                    ? 'bg-blue-500 text-white border-blue-400'
                    : 'bg-emerald-500 text-white border-emerald-400'
                }`}>
                  {ultimoEvento.direccion}
                </div>
              </div>

              {/* Datos de la Persona y Estado del Paso */}
              <div className="flex-1 text-center sm:text-left space-y-2">
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-main-theme tracking-tight">
                    {ultimoEvento.personaNombre}
                  </h3>
                  <p className="text-xs font-semibold text-muted-theme flex items-center justify-center sm:justify-start gap-1 mt-0.5">
                    <DoorOpen className="w-3.5 h-3.5" />
                    Punto de paso: <span className="text-main-theme font-bold">{ultimoEvento.torniqueteNombre}</span>
                  </p>
                </div>

                {/* Badge de Resultado */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                  {ultimoEvento.tipoEvento === 'CONCEDIDO' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      <CheckCircle2 className="w-4 h-4" /> Acceso Concedido
                    </span>
                  )}
                  {ultimoEvento.tipoEvento === 'DENEGADO_VENCIDO' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/30 animate-pulse">
                      <XCircle className="w-4 h-4" /> Denegado: Membresía Vencida
                    </span>
                  )}
                  {ultimoEvento.tipoEvento === 'DENEGADO_HORARIO' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                      <Clock className="w-4 h-4" /> Fuera de Horario Asignado
                    </span>
                  )}
                  {ultimoEvento.tipoEvento === 'APERTURA_MANUAL' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30">
                      <ShieldCheck className="w-4 h-4" /> Apertura Manual de Operador
                    </span>
                  )}

                  {ultimoEvento.diasRestantes !== null && ultimoEvento.diasRestantes !== undefined && (
                    <span className={`px-2.5 py-1 rounded-xl text-xs font-bold border ${
                      ultimoEvento.diasRestantes <= 2
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : 'bg-theme-subtle text-muted-theme border-theme'
                    }`}>
                      {ultimoEvento.diasRestantes <= 0 ? 'Vence hoy' : `${ultimoEvento.diasRestantes} días restantes`}
                    </span>
                  )}
                </div>

                {ultimoEvento.tipoEvento === 'DENEGADO_VENCIDO' && onNavigateCobro && ultimoEvento.personaId && (
                  <div className="pt-2">
                    <button
                      onClick={() => onNavigateCobro({ id: ultimoEvento.personaId, nombre: ultimoEvento.personaNombre })}
                      className="px-4 py-1.5 rounded-xl text-xs font-bold bg-sport-orange text-white hover:opacity-90 transition shadow-sm"
                    >
                      Cobrar y Renovar Membresía Ahora
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="py-10 text-center text-muted-theme text-sm font-medium">
              Esperando el primer pase de rostro por los torniquetes...
            </div>
          )}
        </div>

        {/* APERTURA MANUAL DE TORNIQUETES */}
        <div className="bg-card-theme border border-theme card-shadow-theme rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-theme flex items-center gap-1.5 border-b border-theme pb-3 mb-4">
              <DoorOpen className="w-3.5 h-3.5 text-accent-theme" /> Apertura Remota de Paso
            </span>
            <p className="text-xs text-muted-theme mb-4">
              Activa los relevadores físicos de los torniquetes para visitas o emergencias:
            </p>

            <div className="space-y-2.5">
              {torniquetes.map((t) => (
                <button
                  key={t.id}
                  disabled={abriendoId === t.id}
                  onClick={() => handleAbrirTorniquete(t.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-bold transition ${
                    t.direccion === 'SALIDA'
                      ? 'border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/15 text-blue-400'
                      : 'border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/15 text-emerald-400'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {t.direccion === 'SALIDA' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    <span>{t.nombre}</span>
                  </div>
                  <span>{abriendoId === t.id ? 'Abriendo...' : 'Abrir'}</span>
                </button>
              ))}

              {torniquetes.length === 0 && (
                <div className="text-xs text-muted-theme text-center py-4">
                  No hay torniquetes registrados aún.
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-theme text-[11px] text-muted-theme font-medium">
            Latencia SSE: &lt; 50ms • Registro de auditoría activo
          </div>
        </div>
      </div>

      {/* Grid Inferior: Registro en Vivo de Checadas */}
      <div className="bg-card-theme border border-theme card-shadow-theme rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-lg text-main-theme">
            Feed Histórico de Checadas
          </h3>
          <span className="text-xs font-mono-numbers text-muted-theme">
            {eventos.length} eventos en memoria
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-theme text-muted-theme font-bold">
                <th className="pb-3 px-2">Hora</th>
                <th className="pb-3 px-2">Persona</th>
                <th className="pb-3 px-2">Punto de Paso</th>
                <th className="pb-3 px-2">Sentido</th>
                <th className="pb-3 px-2">Resultado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme">
              {eventos.map((ev, idx) => (
                <tr key={ev.id || idx} className="hover:bg-theme-subtle transition">
                  <td className="py-3 px-2 font-mono-numbers font-semibold text-muted-theme">
                    {new Date(ev.fechaHora).toLocaleTimeString()}
                  </td>
                  <td className="py-3 px-2 font-bold text-main-theme flex items-center gap-2">
                    {ev.personaFoto ? (
                      <img src={ev.personaFoto} alt="" className="w-6 h-6 rounded-full object-cover border border-theme" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-theme-subtle flex items-center justify-center text-[10px] font-bold text-muted-theme">
                        {ev.personaNombre.slice(0, 1)}
                      </div>
                    )}
                    <span>{ev.personaNombre}</span>
                  </td>
                  <td className="py-3 px-2 text-muted-theme font-medium">
                    {ev.torniqueteNombre}
                  </td>
                  <td className="py-3 px-2">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                      ev.direccion === 'SALIDA' ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'
                    }`}>
                      {ev.direccion}
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    {ev.tipoEvento === 'CONCEDIDO' && (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Concedido
                      </span>
                    )}
                    {ev.tipoEvento === 'DENEGADO_VENCIDO' && (
                      <span className="text-red-400 font-bold flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> Vencido
                      </span>
                    )}
                    {ev.tipoEvento === 'DENEGADO_HORARIO' && (
                      <span className="text-amber-400 font-bold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Fuera Horario
                      </span>
                    )}
                    {ev.tipoEvento === 'APERTURA_MANUAL' && (
                      <span className="text-purple-400 font-bold flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> Manual
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {eventos.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-theme">
                    No se han registrado eventos el día de hoy.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
