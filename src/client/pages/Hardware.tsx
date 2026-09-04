import React, { useState, useEffect } from 'react';
import { Cpu, CheckCircle2, XCircle, RefreshCw, Save, ShieldCheck } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const Hardware: React.FC = () => {
  const [config, setConfig] = useState({
    baseUrl: 'https://ius.hikcentralconnect.com/api',
    appKey: '',
    secretKey: '',
    accessLevelId: '',
  });

  const [testResult, setTestResult] = useState<any | null>(null);
  const [testing, setTesting] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  const { theme } = useTheme();
  const isCyber = theme === 'cyber';

  useEffect(() => {
    fetch('/api/hardware/config')
      .then((res) => res.json())
      .then((data) => {
        setConfig({
          baseUrl: data.hik_base_url || 'https://ius.hikcentralconnect.com/api',
          appKey: data.hik_app_key || '',
          secretKey: data.hik_secret_key || '',
          accessLevelId: data.hik_access_level_id || '',
        });
      });
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setGuardando(true);
      await fetch('/api/hardware/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      alert('Configuración guardada exitosamente');
    } finally {
      setGuardando(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      setTestResult(null);
      const res = await fetch('/api/hardware/test', { method: 'POST' });
      const data = await res.json();
      setTestResult(data);

      if (data.success && data.nivelesAcceso?.length > 0 && !config.accessLevelId) {
        const primerNivel = data.nivelesAcceso[0];
        const idNivel = primerNivel.id || primerNivel.accessLevelId || primerNivel.levelId;
        if (idNivel) {
          setConfig((prev) => ({ ...prev, accessLevelId: idNivel }));
        }
      }
    } finally {
      setTesting(false);
    }
  };

  const handleForceSync = async () => {
    try {
      setSyncing(true);
      setSyncMsg('');
      const res = await fetch('/api/hardware/sync', { method: 'POST' });
      const data = await res.json();
      setSyncMsg(`Sincronización finalizada: ${data.revocados} accesos revocados.`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 transition-colors duration-300">
      <div>
        <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-main-theme tracking-tight">
          Terminales Hikvision & Torniquetes
        </h2>
        <p className="text-sm text-muted-theme mt-1 font-medium">
          Configuración del Cloud Gateway HikCentral Connect para control de acceso físico
        </p>
      </div>

      <form
        onSubmit={handleSaveConfig}
        className="bg-card-theme border border-theme card-shadow-theme rounded-2xl p-6 sm:p-7 space-y-5"
      >
        <div className="flex items-center gap-2.5 pb-4 border-b border-theme">
          <div
            className={`p-2 rounded-xl ${
              isCyber ? 'bg-volt/10 text-volt' : 'bg-sport-orange/10 text-sport-orange'
            }`}
          >
            <Cpu className="w-5 h-5" />
          </div>
          <h3 className="font-display font-bold text-lg text-main-theme">
            Credenciales de Plataforma Cloud
          </h3>
        </div>

        <div>
          <label className="block text-xs font-bold text-muted-theme uppercase tracking-wider mb-1.5">
            Base URL de la API
          </label>
          <input
            type="text"
            value={config.baseUrl}
            onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
            className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-mono-numbers border transition focus:outline-none ${
              isCyber
                ? 'bg-[#151922] border-slate-700/80 text-white focus:border-volt'
                : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-sport-orange'
            }`}
          />
          <span className="text-xs text-muted-theme mt-1 block">
            Norteamérica / México: https://ius.hikcentralconnect.com/api
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-muted-theme uppercase tracking-wider mb-1.5">
              App Key *
            </label>
            <input
              type="text"
              required
              placeholder="Ej. 28394819"
              value={config.appKey}
              onChange={(e) => setConfig({ ...config, appKey: e.target.value })}
              className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-mono-numbers border transition focus:outline-none ${
                isCyber
                  ? 'bg-[#151922] border-slate-700/80 text-white focus:border-volt'
                  : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-sport-orange'
              }`}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-theme uppercase tracking-wider mb-1.5">
              Secret Key *
            </label>
            <input
              type="password"
              required
              placeholder="••••••••••••••••"
              value={config.secretKey}
              onChange={(e) => setConfig({ ...config, secretKey: e.target.value })}
              className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-mono-numbers border transition focus:outline-none ${
                isCyber
                  ? 'bg-[#151922] border-slate-700/80 text-white focus:border-volt'
                  : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-sport-orange'
              }`}
            />
          </div>
        </div>

        {/* Nivel de Acceso por Defecto */}
        <div>
          <label className="block text-xs font-bold text-muted-theme uppercase tracking-wider mb-1.5">
            Nivel de Acceso por Defecto (Regla de Torniquete) *
          </label>

          {testResult?.nivelesAcceso && testResult.nivelesAcceso.length > 0 ? (
            <div className="space-y-1.5">
              <select
                value={config.accessLevelId}
                onChange={(e) => setConfig({ ...config, accessLevelId: e.target.value })}
                className={`w-full px-3.5 py-2.5 rounded-xl text-sm border transition focus:outline-none ${
                  isCyber
                    ? 'bg-[#151922] border-emerald-500/50 text-white'
                    : 'bg-white border-emerald-500 text-slate-900'
                }`}
              >
                <option value="">-- Seleccione el nivel detectado automáticamente --</option>
                {testResult.nivelesAcceso.map((lvl: any, idx: number) => {
                  const id = lvl.id || lvl.accessLevelId || lvl.levelId || `level_${idx}`;
                  const nombre = lvl.name || lvl.levelName || id;
                  return (
                    <option key={id} value={id}>
                      {nombre} (ID: {id})
                    </option>
                  );
                })}
              </select>
              <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" /> Niveles detectados en vivo desde tu cuenta de HikCentral
              </span>
            </div>
          ) : (
            <div className="space-y-1.5">
              <input
                type="text"
                placeholder="Pulsa 'Probar Conexión' para cargar la lista o escribe el ID manualmente"
                value={config.accessLevelId}
                onChange={(e) => setConfig({ ...config, accessLevelId: e.target.value })}
                className={`w-full px-3.5 py-2.5 rounded-xl text-sm border transition focus:outline-none ${
                  isCyber
                    ? 'bg-[#151922] border-slate-700/80 text-white focus:border-volt'
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-sport-orange'
                }`}
              />
              <span className="text-xs text-muted-theme block">
                Pulsa <strong>'Probar Conexión'</strong> para consultar los niveles configurados en el portal.
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="submit"
            disabled={guardando}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition shadow-md ${
              isCyber
                ? 'bg-volt hover:bg-volt-hover text-black shadow-volt-glow'
                : 'bg-sport-orange hover:bg-sport-orange-hover text-white shadow-orange-glow'
            }`}
          >
            <Save className="w-4 h-4" /> Guardar Credenciales
          </button>

          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing || !config.appKey || !config.secretKey}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border transition ${
              isCyber
                ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${testing ? 'animate-spin' : ''}`} />
            {testing ? 'Verificando con HikCentral...' : 'Probar Conexión y Detectar'}
          </button>
        </div>

        {testResult && (
          <div
            className={`p-4 rounded-xl border mt-4 text-sm ${
              testResult.success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}
          >
            <div className="flex items-center gap-2 font-bold mb-2">
              {testResult.success ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              {testResult.message || testResult.error}
            </div>
            {testResult.success && (
              <div className="text-xs space-y-1">
                <p>• Dispositivos / Torniquetes en línea: <strong>{testResult.dispositivosEncontrados}</strong></p>
                <p>• Niveles de Acceso encontrados: <strong>{testResult.nivelesAcceso?.length || 0}</strong></p>
              </div>
            )}
          </div>
        )}
      </form>

      {/* Sincronización Forzada */}
      <div className="bg-card-theme border border-theme card-shadow-theme rounded-2xl p-6 sm:p-7">
        <h3 className="font-display font-bold text-base text-main-theme mb-1.5">
          Sincronización Forzada de Permisos
        </h3>
        <p className="text-xs text-muted-theme mb-4">
          Audita a todos los socios en la base de datos local y asegura que la terminal facial tenga activos a los vigentes y
          bloqueados a los vencidos.
        </p>

        <button
          onClick={handleForceSync}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-sm shadow-md transition"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Auditando torniquete...' : 'Sincronizar Todos los Socios Ahora'}
        </button>

        {syncMsg && <p className="text-xs text-emerald-400 mt-3 font-bold">{syncMsg}</p>}
      </div>
    </div>
  );
};
