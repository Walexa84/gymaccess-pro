import React from 'react';
import { Calendar, Check, RefreshCw } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface FichaVigenciaCardProps {
  nuevaFecha: string;
  setNuevaFecha: (f: string) => void;
  guardandoVigencia: boolean;
  handleGuardarVigencia: () => void;
}

export const FichaVigenciaCard: React.FC<FichaVigenciaCardProps> = ({
  nuevaFecha,
  setNuevaFecha,
  guardandoVigencia,
  handleGuardarVigencia,
}) => {
  const { theme } = useTheme();
  const isCyber = theme === 'cyber';

  const calcularDias = (targetDateStr: string) => {
    if (!targetDateStr) return null;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const target = new Date(`${targetDateStr}T23:59:59`);
    target.setHours(0, 0, 0, 0);
    return Math.ceil((target.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  };

  const diasRestantes = calcularDias(nuevaFecha);

  const agregarDias = (dias: number) => {
    const base = nuevaFecha ? new Date(`${nuevaFecha}T12:00:00`) : new Date();
    base.setDate(base.getDate() + dias);
    setNuevaFecha(base.toISOString().split('T')[0]);
  };

  return (
    <div className="p-4 rounded-2xl bg-card-theme border border-theme space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-accent-theme" />
          <h5 className="font-bold text-xs text-main-theme uppercase tracking-wider">
            Vigencia & Hardware Autónomo
          </h5>
        </div>
        {diasRestantes !== null && (
          <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
            diasRestantes > 3 
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
              : diasRestantes >= 0 
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}>
            {diasRestantes > 0 
              ? `${diasRestantes} días restantes` 
              : diasRestantes === 0 
                ? 'Vence hoy (11:59 PM)' 
                : `Vencido hace ${Math.abs(diasRestantes)} días`}
          </span>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <input
          type="date"
          value={nuevaFecha}
          onChange={(e) => setNuevaFecha(e.target.value)}
          className="w-full sm:w-auto flex-1 px-3 py-2 rounded-xl bg-theme-subtle border border-theme text-xs text-main-theme font-mono focus:outline-none focus:border-accent-theme"
        />
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {[{ l: '+7d', d: 7 }, { l: '+15d', d: 15 }, { l: '+30d', d: 30 }, { l: '+1a', d: 365 }].map((b) => (
            <button
              key={b.l}
              type="button"
              onClick={() => agregarDias(b.d)}
              className="flex-1 sm:flex-none px-2.5 py-2 rounded-xl text-[11px] font-bold bg-theme-subtle hover:bg-card-theme border border-theme text-muted-theme hover:text-main-theme transition"
            >
              {b.l}
            </button>
          ))}
          <button
            type="button"
            disabled={guardandoVigencia || !nuevaFecha}
            onClick={handleGuardarVigencia}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
              isCyber ? 'bg-volt text-black hover:bg-volt/90' : 'bg-sport-orange text-white hover:opacity-90'
            } disabled:opacity-50`}
          >
            {guardandoVigencia ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
};
