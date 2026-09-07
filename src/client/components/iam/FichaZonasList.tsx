import React from 'react';
import { Layers, Lock, Info, CheckCircle2 } from 'lucide-react';

interface FichaZonasListProps {
  niveles: any[];
  nivelesSeleccionados: number[];
  toggleNivel: (id: number) => void;
  esSocioConPlan?: boolean;
  planNombre?: string;
}

export const FichaZonasList: React.FC<FichaZonasListProps> = ({
  niveles,
  nivelesSeleccionados,
  toggleNivel,
  esSocioConPlan = false,
  planNombre,
}) => {
  return (
    <div className="p-4 rounded-2xl bg-card-theme border border-theme space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-accent-theme" />
          <h5 className="font-bold text-xs text-main-theme uppercase tracking-wider">
            Zonas & Puertas Autorizadas
          </h5>
        </div>
        <div className="flex items-center gap-2">
          {esSocioConPlan && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-accent-theme/10 text-accent-theme border border-accent-theme/20 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Regido por Plan
            </span>
          )}
          <span className="text-[11px] text-muted-theme">
            {nivelesSeleccionados.length} nivel(es) asignado(s)
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {niveles.map((niv: any) => {
          const isIncludedInPlan = Boolean(niv.incluido_en_plan);
          const isSelected = esSocioConPlan 
            ? isIncludedInPlan 
            : nivelesSeleccionados.includes(niv.id);
          const isLocked = esSocioConPlan;

          return (
            <label
              key={niv.id}
              className={`p-3 rounded-xl border transition flex items-center justify-between select-none ${
                isLocked
                  ? isSelected
                    ? 'bg-theme-subtle/80 border-accent-theme/30 cursor-default'
                    : 'bg-theme-subtle/20 border-theme/40 opacity-60 cursor-default'
                  : isSelected 
                    ? 'bg-theme-subtle border-accent-theme/60 cursor-pointer' 
                    : 'bg-theme-subtle/40 border-theme opacity-75 hover:opacity-100 cursor-pointer'
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={isSelected}
                  disabled={isLocked}
                  onChange={() => {
                    if (!isLocked) toggleNivel(niv.id);
                  }}
                  className="w-4 h-4 rounded text-accent-theme focus:ring-0 cursor-pointer disabled:cursor-default"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-main-theme">{niv.nombre}</span>
                    {esSocioConPlan && isIncludedInPlan && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" /> {planNombre || 'Plan Activo'}
                      </span>
                    )}
                    {esSocioConPlan && !isIncludedInPlan && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-500/10 text-muted-theme border border-theme font-medium flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> No incluido en plan
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-theme">
                    {niv.puertas && niv.puertas.length > 0 ? `Puertas: ${niv.puertas.join(', ')}` : 'Sin torniquetes asociados'}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-muted-theme">{niv.cuenta_nombre}</span>
            </label>
          );
        })}
      </div>

      {esSocioConPlan && (
        <div className="p-2.5 rounded-xl bg-theme-subtle/40 border border-theme text-[11px] text-muted-theme flex items-start gap-2">
          <Info className="w-3.5 h-3.5 text-accent-theme shrink-0 mt-0.5" />
          <span>
            Las zonas de este socio se asignan automáticamente según su <strong>{planNombre || 'membresía'}</strong>. Para cambiar sus puertas o agregar áreas VIP, actualiza su plan en el Punto de Cobro.
          </span>
        </div>
      )}
    </div>
  );
};
