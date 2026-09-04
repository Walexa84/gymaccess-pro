import React, { useState, useEffect } from 'react';
import { CreditCard, CheckCircle2, ShieldCheck, Printer, ArrowRight, Sparkles } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const Cobro: React.FC<{ selectedSocioPreload?: any }> = ({ selectedSocioPreload }) => {
  const [planes, setPlanes] = useState<any[]>([]);
  const [socios, setSocios] = useState<any[]>([]);
  const [selectedSocioId, setSelectedSocioId] = useState<string>('');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [metodoPago, setMetodoPago] = useState<'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA'>('EFECTIVO');
  const [procesando, setProcesando] = useState(false);
  const [resultado, setResultado] = useState<any | null>(null);
  const [error, setError] = useState('');

  const { theme } = useTheme();
  const isCyber = theme === 'cyber';

  useEffect(() => {
    fetch('/api/planes')
      .then((res) => res.json())
      .then((data) => {
        setPlanes(data);
        if (data.length > 0) setSelectedPlanId(data[0].id.toString());
      });

    fetch('/api/socios')
      .then((res) => res.json())
      .then((data) => setSocios(data));
  }, []);

  useEffect(() => {
    if (selectedSocioPreload) {
      setSelectedSocioId(selectedSocioPreload.id.toString());
    }
  }, [selectedSocioPreload]);

  const handleCobro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSocioId || !selectedPlanId) {
      setError('Seleccione un socio y un plan');
      return;
    }

    try {
      setProcesando(true);
      setError('');
      setResultado(null);

      const res = await fetch('/api/pagos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          socioId: parseInt(selectedSocioId),
          planId: parseInt(selectedPlanId),
          metodoPago,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al procesar el pago');
      }

      setResultado(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcesando(false);
    }
  };

  const planSeleccionado = planes.find((p) => p.id.toString() === selectedPlanId);

  return (
    <div className="max-w-2xl mx-auto space-y-6 transition-colors duration-300">
      <div>
        <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-main-theme tracking-tight">
          Punto de Cobro & Activación
        </h2>
        <p className="text-sm text-muted-theme mt-1 font-medium">
          Renovación de membresías y habilitación física inmediata en torniquetes faciales
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
                ¡Cobro Registrado con Éxito!
              </h3>
              <p className="text-xs font-mono-numbers text-emerald-400 font-semibold">
                Ticket Folio #{resultado.folio}
              </p>
            </div>
          </div>

          <div className="bg-card-alt-theme p-4 rounded-xl border border-theme space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-theme">Socio:</span>
              <span className="font-bold text-main-theme">{resultado.socio}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-theme">Plan Contratado:</span>
              <span className="font-semibold text-main-theme">{resultado.plan}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-theme">Monto Cobrado:</span>
              <span className="font-black font-display text-lg text-emerald-400 font-mono-numbers">
                ${resultado.monto.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-theme">Vigencia Hasta:</span>
              <span className="font-bold text-main-theme font-mono-numbers">{resultado.vigenciaHasta}</span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-theme">
              <span className="text-muted-theme">Terminal Facial Hikvision:</span>
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                <ShieldCheck className="w-4 h-4" /> Acceso Físico Habilitado
              </span>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => window.print()}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold border transition ${
                isCyber
                  ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Printer className="w-4 h-4" /> Imprimir Ticket
            </button>
            <button
              onClick={() => {
                setResultado(null);
                setSelectedSocioId('');
              }}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 ${
                isCyber
                  ? 'bg-volt hover:bg-volt-hover text-black shadow-volt-glow'
                  : 'bg-sport-orange hover:bg-sport-orange-hover text-white shadow-orange-glow'
              }`}
            >
              <span>Nuevo Cobro</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={handleCobro}
          className="bg-card-theme border border-theme card-shadow-theme rounded-2xl p-6 sm:p-7 space-y-6"
        >
          {error && (
            <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Seleccionar Socio */}
          <div>
            <label className="block text-xs font-bold text-muted-theme uppercase tracking-wider mb-2">
              1. Seleccionar Socio *
            </label>
            <select
              value={selectedSocioId}
              onChange={(e) => setSelectedSocioId(e.target.value)}
              required
              className={`w-full px-4 py-3 rounded-xl text-sm font-medium border transition focus:outline-none ${
                isCyber
                  ? 'bg-[#151922] border-slate-700/80 text-white focus:border-volt'
                  : 'bg-white border-slate-200 text-slate-900 focus:border-sport-orange'
              }`}
            >
              <option value="">-- Buscar socio en padrón --</option>
              {socios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre} — Tel: {s.telefono} ({s.estatus})
                </option>
              ))}
            </select>
          </div>

          {/* Seleccionar Plan */}
          <div>
            <label className="block text-xs font-bold text-muted-theme uppercase tracking-wider mb-2">
              2. Plan o Membresía *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {planes.map((p) => {
                const isSelected = selectedPlanId === p.id.toString();
                return (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => setSelectedPlanId(p.id.toString())}
                    className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? isCyber
                          ? 'border-volt bg-volt/10 text-white shadow-volt-glow'
                          : 'border-sport-orange bg-sport-orange/10 text-slate-900 shadow-orange-glow'
                        : 'border-theme bg-card-alt-theme text-main-theme hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-main-theme">{p.nombre}</span>
                      {isSelected && <Sparkles className="w-3.5 h-3.5 text-accent-theme" />}
                    </div>
                    <div className="flex justify-between items-baseline mt-3">
                      <span className="text-xs text-muted-theme font-medium">{p.duracion_dias} días</span>
                      <span className="text-lg font-display font-black text-emerald-400 font-mono-numbers">
                        ${p.precio.toFixed(2)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Método de Pago */}
          <div>
            <label className="block text-xs font-bold text-muted-theme uppercase tracking-wider mb-2">
              3. Forma de Pago *
            </label>
            <div className="grid grid-cols-3 gap-3">
              {['EFECTIVO', 'TARJETA', 'TRANSFERENCIA'].map((met) => {
                const isSelected = metodoPago === met;
                return (
                  <button
                    type="button"
                    key={met}
                    onClick={() => setMetodoPago(met as any)}
                    className={`py-3 rounded-xl border text-xs font-bold transition-all ${
                      isSelected
                        ? isCyber
                          ? 'border-volt bg-volt text-black shadow-volt-glow font-extrabold'
                          : 'border-sport-orange bg-sport-orange text-white shadow-orange-glow font-extrabold'
                        : 'border-theme bg-card-alt-theme text-muted-theme hover:text-main-theme'
                    }`}
                  >
                    {met}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Resumen Total */}
          <div className="p-5 bg-card-alt-theme rounded-xl border border-theme flex justify-between items-center">
            <div>
              <span className="text-xs font-bold text-muted-theme uppercase tracking-wider block">
                Total a Cobrar
              </span>
              <span className="text-xs text-muted-theme">
                {planSeleccionado ? `${planSeleccionado.duracion_dias} días de acceso` : 'Sin plan seleccionado'}
              </span>
            </div>
            <span className="text-3xl font-display font-black text-emerald-400 font-mono-numbers">
              ${planSeleccionado ? planSeleccionado.precio.toFixed(2) : '0.00'}
            </span>
          </div>

          <button
            type="submit"
            disabled={procesando || !selectedSocioId || !selectedPlanId}
            className={`w-full py-4 rounded-xl text-base font-bold transition-all duration-200 flex items-center justify-center gap-2 shadow-lg disabled:opacity-40 ${
              isCyber
                ? 'bg-volt hover:bg-volt-hover text-black shadow-volt-glow'
                : 'bg-sport-orange hover:bg-sport-orange-hover text-white shadow-orange-glow'
            }`}
          >
            <CreditCard className="w-5 h-5" />
            <span>
              {procesando ? 'Activando Acceso Facial en Hikvision...' : 'Cobrar & Habilitar Torniquete'}
            </span>
          </button>
        </form>
      )}
    </div>
  );
};
