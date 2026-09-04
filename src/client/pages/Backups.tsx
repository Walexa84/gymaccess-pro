import React, { useState, useEffect } from 'react';
import { Database, Plus, CheckCircle2, Shield } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const Backups: React.FC = () => {
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creando, setCreando] = useState(false);
  const [msg, setMsg] = useState('');

  const { theme } = useTheme();
  const isCyber = theme === 'cyber';

  const cargarBackups = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/backups');
      if (res.ok) {
        const data = await res.json();
        setBackups(data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarBackups();
  }, []);

  const handleCrearBackup = async () => {
    try {
      setCreando(true);
      setMsg('');
      const res = await fetch('/api/backups/create', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setMsg(`Respaldo creado: ${data.backup.filename}`);
        cargarBackups();
      }
    } finally {
      setCreando(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 transition-colors duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-main-theme tracking-tight">
            Copias de Seguridad
          </h2>
          <p className="text-sm text-muted-theme mt-1 font-medium">
            Respaldo atómico de la base de datos (socios, membresías y cobros) en caliente (WAL)
          </p>
        </div>
        <button
          onClick={handleCrearBackup}
          disabled={creando}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition shadow-md ${
            isCyber
              ? 'bg-volt hover:bg-volt-hover text-black shadow-volt-glow'
              : 'bg-sport-orange hover:bg-sport-orange-hover text-white shadow-orange-glow'
          }`}
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>{creando ? 'Generando...' : 'Crear Respaldo Ahora'}</span>
        </button>
      </div>

      {msg && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> {msg}
        </div>
      )}

      {/* Explicación de Seguridad */}
      <div
        className={`border rounded-2xl p-5 text-xs flex items-start gap-3.5 ${
          isCyber
            ? 'bg-blue-500/10 border-blue-500/20 text-blue-300'
            : 'bg-blue-50 border-blue-200 text-blue-900'
        }`}
      >
        <Shield className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          Las copias de seguridad se generan usando la API de backup en caliente de SQLite. Puedes copiar los archivos de la
          carpeta <code className="px-1.5 py-0.5 rounded font-mono font-bold bg-black/20">backups/</code> a una memoria USB o sincronizarlos
          con tu almacenamiento en la nube para recuperación ante desastres sin interrumpir el torniquete.
        </p>
      </div>

      {/* Lista de Respaldos */}
      <div className="bg-card-theme border border-theme card-shadow-theme rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-theme font-bold text-sm text-main-theme flex items-center gap-2.5">
          <Database className="w-4 h-4 text-accent-theme" /> Historial de Respaldos Disponibles
        </div>

        <div className="divide-y divide-theme text-sm">
          {backups.map((b, idx) => (
            <div
              key={idx}
              className={`p-4 flex items-center justify-between transition-colors ${
                isCyber ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'
              }`}
            >
              <div>
                <p className="font-mono-numbers text-main-theme text-xs font-bold">{b.filename}</p>
                <span className="text-xs text-muted-theme">
                  Creado el {new Date(b.creadoEn).toLocaleString()}
                </span>
              </div>
              <span
                className={`text-xs font-mono-numbers font-bold px-3 py-1 rounded-xl border ${
                  isCyber
                    ? 'bg-slate-800 text-slate-300 border-slate-700'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {(b.sizeBytes / 1024).toFixed(1)} KB
              </span>
            </div>
          ))}

          {backups.length === 0 && !loading && (
            <div className="p-12 text-center text-muted-theme text-sm">
              No hay respaldos generados aún. Pulsa el botón superior para crear el primero.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
