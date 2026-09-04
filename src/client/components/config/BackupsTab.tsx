import React, { useState } from 'react';
import { Plus, Download } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface BackupsTabProps {
  backups: any[];
  setBackups: (b: any[]) => void;
}

export const BackupsTab: React.FC<BackupsTabProps> = ({
  backups,
  setBackups
}) => {
  const { theme } = useTheme();
  const isCyber = theme === 'cyber';

  const [creandoBackup, setCreandoBackup] = useState(false);
  const [backupMsg, setBackupMsg] = useState('');

  const handleCreateBackup = async () => {
    try {
      setCreandoBackup(true);
      const res = await fetch('/api/backups/create', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setBackupMsg(`Respaldo creado: ${data.backup.filename}`);
        fetch('/api/backups').then(r => r.json()).then(setBackups);
      }
    } finally {
      setCreandoBackup(false);
    }
  };

  return (
    <div className="bg-card-theme border border-theme card-shadow-theme rounded-2xl p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-theme">
        <div>
          <h3 className="font-bold text-base text-main-theme">Copias de Seguridad Atómicas SQLite</h3>
          <p className="text-xs text-muted-theme">Respaldos en caliente en modo WAL sin detener checadores ni bloquear cobros.</p>
        </div>
        <button
          onClick={handleCreateBackup}
          disabled={creandoBackup}
          className={`px-4 py-2 rounded-xl text-xs font-bold shadow-md transition ${isCyber ? 'bg-volt text-black' : 'bg-sport-orange text-white'}`}
        >
          <Plus className="w-3.5 h-3.5 inline mr-1" /> {creandoBackup ? 'Generando...' : 'Crear Respaldo Ahora'}
        </button>
      </div>

      {backupMsg && (
        <div className="p-3 bg-emerald-500/10 text-emerald-400 text-xs font-semibold rounded-xl">
          {backupMsg}
        </div>
      )}

      <div className="divide-y divide-theme">
        {backups.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-theme">No hay respaldos registrados.</div>
        ) : (
          backups.map((b, idx) => (
            <div key={idx} className="py-3 flex items-center justify-between text-xs hover:bg-slate-700/10 transition px-2 rounded-lg">
              <div>
                <span className="font-mono font-bold text-main-theme">{b.filename}</span>
                <p className="text-[10px] text-muted-theme">{new Date(b.created).toLocaleString()} • {Math.round(b.size / 1024)} KB</p>
              </div>
              <a
                href={`/api/backups/download/${b.filename}`}
                download
                className="p-1.5 rounded-lg border border-theme text-muted-theme hover:text-main-theme transition"
                title="Descargar respaldo"
              >
                <Download className="w-4 h-4" />
              </a>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
