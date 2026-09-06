import React from 'react';
import { Layers } from 'lucide-react';

interface FichaZonasListProps {
  niveles: any[];
  nivelesSeleccionados: number[];
  toggleNivel: (id: number) => void;
}

export const FichaZonasList: React.FC<FichaZonasListProps> = ({
  niveles,
  nivelesSeleccionados,
  toggleNivel,
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
        <span className="text-[11px] text-muted-theme">
          {nivelesSeleccionados.length} nivel(es) asignado(s)
        </span>
      </div>

      <div className="space-y-2">
        {niveles.map((niv: any) => {
          const isSelected = nivelesSeleccionados.includes(niv.id);
          return (
            <div
              key={niv.id}
              onClick={() => toggleNivel(niv.id)}
              className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                isSelected 
                  ? 'bg-theme-subtle border-accent-theme/60' 
                  : 'bg-theme-subtle/40 border-theme opacity-70 hover:opacity-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleNivel(niv.id)}
                  className="w-4 h-4 rounded text-accent-theme focus:ring-0 cursor-pointer"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-main-theme">{niv.nombre}</span>
                    {niv.incluido_en_plan && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-theme/10 text-accent-theme border border-accent-theme/20 font-medium">
                        🏷️ Plan Activo
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-theme">
                    {niv.puertas.length > 0 ? `Puertas: ${niv.puertas.join(', ')}` : 'Sin torniquetes asociados'}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-muted-theme">{niv.cuenta_nombre}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
