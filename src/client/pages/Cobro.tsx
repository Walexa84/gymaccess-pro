import React, { useState, useEffect } from 'react';
import { CreditCard, CheckCircle2, ShieldCheck, Printer, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const Cobro: React.FC<{ selectedSocioPreload?: any }> = ({ selectedSocioPreload }) => {
  const [planes, setPlanes] = useState<any[]>([]);
  const [personas, setPersonas] = useState<any[]>([]);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>('');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [metodoPago, setMetodoPago] = useState<'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA'>('EFECTIVO');
  const [procesando, setProcesando] = useState(false);
  const [resultado, setResultado] = useState<any | null>(null);
  const [error, setError] = useState('');

  const { theme } = useTheme();
  const isCyber = theme === 'cyber';

  useEffect(() => {
    fetch('/api/gym/planes')
      .then((res) => res.json())
      .then((data) => {
        setPlanes(data);
        if (data.length > 0) setSelectedPlanId(data[0].id.toString());
      })
      .catch(() => {});

    fetch('/api/iam/personas?tipo=SOCIO')
      .then((res) => res.json())
      .then((data) => setPersonas(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedSocioPreload) {
      setSelectedPersonaId(selectedSocioPreload.id.toString());
    }
  }, [selectedSocioPreload]);

  const handleCobro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPersonaId || !selectedPlanId) {
      setError('Seleccione una persona y un plan');
      return;
    }

    try {
      setProcesando(true);
      setError('');
      setResultado(null);

      const res = await fetch('/api/gym/cobro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personaId: parseInt(selectedPersonaId),
          planId: parseInt(selectedPlanId),
          metodoPago,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al procesar el cobro');
      }

      setResultado(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcesando(false);
    }
  };

  const planSeleccionado = planes.find((p) => p.id.toString() === selectedPlanId);
  const personaSeleccionada = personas.find((p) => p.id.toString() === selectedPersonaId);

  return (
    <div className="max-w-2xl mx-auto space-y-6 transition-colors duration-300">
      <div>
        <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-main-theme tracking-tight">
          Punto de Venta GYM & Cobro
        </h2>
        <p className="text-sm text-muted-theme mt-1 font-medium">
          Cobro de planes y programación de vigencia autónoma en hardware facial
        </p>
      </div>

      {resultado ? (
        <div className="bg-card-theme border border-emerald-500/40 rounded-2xl p-6 card-shadow-theme space-y-5">
          <div className="flex items-center gap-3 text-emerald-400">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-display font-bold text-xl text-main-theme">
                ¡Cobro Registrado y Acceso Activado!
              </h3>
              <p className="text-xs font-mono-numbers text-emerald-400 font-semibold">
                Folio Ticket #{resultado.folio}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-theme-subtle border border-theme text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-theme">Socio / Cliente:</span>
              <span className="font-bold text-main-theme">{resultado.persona}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-theme">Plan Contratado:</span>
              <span className="font-bold text-main-theme">{resultado.plan}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-theme">Monto Cobrado:</span>
              <span className="font-black text-accent-theme">${resultado.monto} MXN</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-theme">Método de Pago:</span>
              <span className="font-semibold text-main-theme">{resultado.metodoPago}</span>
            </div>
            <div className="flex justify-between border-t border-theme pt-2 font-mono-numbers">
              <span className="text-muted-theme">Vigencia en Hardware:</span>
              <span className="font-bold text-emerald-400">
                {resultado.vigenciaDesde} al {resultado.vigenciaHasta} (23:59:59)
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>
              {resultado.hardwareSincronizado
                ? 'Vigencia inyectada con éxito en la memoria flash de la terminal. El torniquete bloqueará automáticamente al expirar la fecha sin requerir conexión al servidor.'
                : `Nota de sincronización: ${resultado.hardwareError || 'Verifique conexión con el checador'}`}
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 rounded-xl border border-theme bg-theme-subtle hover:bg-theme text-xs font-bold flex items-center gap-2 transition"
            >
              <Printer className="w-4 h-4" /> Imprimir Ticket
            </button>
            <button
              onClick={() => {
                setResultado(null);
                setSelectedPersonaId('');
              }}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition shadow ${
                isCyber ? 'bg-volt text-black' : 'bg-sport-orange text-white'
              }`}
            >
              Nuevo Cobro
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleCobro} className="bg-card-theme border border-theme card-shadow-theme rounded-2xl p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Selección de Persona */}
          <div>
            <label className="text-xs font-bold text-muted-theme block mb-1.5">
              1. Seleccionar Socio / Cliente *
            </label>
            <select
              value={selectedPersonaId}
              onChange={(e) => setSelectedPersonaId(e.target.value)}
              required
              className="w-full px-3 py-2.5 rounded-xl bg-theme-subtle border border-theme text-xs text-main-theme focus:outline-none focus:border-accent-theme"
            >
              <option value="">-- Seleccionar socio --</option>
              {personas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.codigo} - {p.nombre} {p.apellidos} ({p.telefono})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Selección de Plan */}
          <div>
            <label className="text-xs font-bold text-muted-theme block mb-1.5">
              2. Plan o Paquete a Renovar *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {planes.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setSelectedPlanId(p.id.toString())}
                  className={`p-3.5 rounded-xl border cursor-pointer transition ${
                    selectedPlanId === p.id.toString()
                      ? isCyber
                        ? 'border-volt bg-volt/10 text-volt'
                        : 'border-sport-orange bg-sport-orange/10 text-sport-orange'
                      : 'border-theme bg-theme-subtle hover:border-accent-theme'
                  }`}
                >
                  <div className="font-bold text-xs text-main-theme">{p.nombre}</div>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-lg font-black font-mono-numbers text-main-theme">
                      ${p.precio} MXN
                    </span>
                    <span className="text-[10px] text-muted-theme font-semibold">
                      {p.duracion_dias} días
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Método de Pago */}
          <div>
            <label className="text-xs font-bold text-muted-theme block mb-1.5">
              3. Forma de Pago
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'EFECTIVO', label: 'Efectivo' },
                { id: 'TARJETA', label: 'Tarjeta' },
                { id: 'TRANSFERENCIA', label: 'Transferencia' },
              ].map((m) => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => setMetodoPago(m.id as any)}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                    metodoPago === m.id
                      ? isCyber ? 'bg-volt text-black border-volt' : 'bg-sport-orange text-white border-sport-orange'
                      : 'border-theme bg-theme-subtle text-muted-theme hover:text-main-theme'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Resumen Final y Botón */}
          {planSeleccionado && (
            <div className="pt-2 border-t border-theme">
              <div className="flex items-center justify-between text-xs mb-4">
                <span className="text-muted-theme">Total a cobrar:</span>
                <span className="font-display font-black text-2xl text-accent-theme font-mono-numbers">
                  ${planSeleccionado.precio} MXN
                </span>
              </div>

              <button
                type="submit"
                disabled={procesando}
                className={`w-full py-3 rounded-xl font-bold text-sm transition shadow flex items-center justify-center gap-2 ${
                  isCyber
                    ? 'bg-volt text-black shadow-volt-glow hover:opacity-90'
                    : 'bg-sport-orange text-white shadow-orange-glow hover:opacity-90'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>{procesando ? 'Programando en Terminal...' : 'Cobrar y Activar Torniquete Inmediato'}</span>
              </button>
            </div>
          )}
        </form>
      )}
    </div>
  );
};
