import React, { useState } from 'react';
import { 
  Clock, RefreshCw, Globe, Network, Building2, TestTube2, Save
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface HardwareTabProps {
  config: any;
  setConfig: (c: any) => void;
  liveServerTime: string;
  deviceTimeInfo: any;
  handleSyncTime: () => Promise<void>;
  syncingTime: boolean;
  timeMessage: string;
  handleSaveConfig: (e: React.FormEvent) => Promise<void>;
  guardando: boolean;
}

export const HardwareTab: React.FC<HardwareTabProps> = ({
  config,
  setConfig,
  liveServerTime,
  deviceTimeInfo,
  handleSyncTime,
  syncingTime,
  timeMessage,
  handleSaveConfig,
  guardando
}) => {
  const { theme } = useTheme();
  const isCyber = theme === 'cyber';

  const [testResult, setTestResult] = useState<any | null>(null);
  const [testing, setTesting] = useState(false);

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      setTestResult(null);
      const res = await fetch('/api/hardware/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: config.hardware_mode }),
      });
      const data = await res.json();
      setTestResult(data);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tarjeta de Reloj en Tiempo Real y Zona Horaria */}
      <div className="bg-card-theme border border-theme card-shadow-theme rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-theme">
          <h3 className="text-sm font-bold text-main-theme flex items-center gap-2">
            <Clock className="w-4 h-4 text-accent-theme" /> Sincronización de Hora & Zona Horaria
          </h3>
          <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-theme-subtle border border-theme text-muted-theme">
            NTP / ISAPI System Time
          </span>
        </div>

        <div>
          <label className="block text-xs font-bold text-muted-theme uppercase tracking-wider mb-1.5">
            Zona Horaria del Gimnasio
          </label>
          <select
            value={config.gym_timezone}
            onChange={(e) => setConfig({ ...config, gym_timezone: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-theme bg-theme-subtle text-main-theme font-medium focus:outline-none"
          >
            <option value="America/Mexico_City">🇲🇽 Centro de México / CDMX / Guadalajara / Mty (GMT-6)</option>
            <option value="America/Cancun">🌴 Quintana Roo / Cancún / Playa del Carmen (GMT-5)</option>
            <option value="America/Tijuana">🌵 Baja California / Tijuana / Mexicali (GMT-8)</option>
            <option value="America/Hermosillo">🏜️ Sonora / Hermosillo (GMT-7)</option>
            <option value="America/Bogota">🇨🇴 Colombia / Bogotá (GMT-5)</option>
            <option value="America/Argentina/Buenos_Aires">🇦🇷 Argentina / Buenos Aires (GMT-3)</option>
          </select>
        </div>

        {/* Comparativa Lado a Lado: Hora Servidor vs Hora Checador */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-xl border border-theme bg-theme-subtle">
            <span className="text-[11px] uppercase font-bold text-muted-theme">🖥️ Hora Local de la Computadora</span>
            <div className="text-2xl font-mono font-black text-main-theme mt-1">{liveServerTime || '00:00:00'}</div>
            <span className="text-xs text-muted-theme block mt-0.5">Segundero activo para {config.gym_timezone}</span>
          </div>

          <div className="p-4 rounded-xl border border-theme bg-theme-subtle">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase font-bold text-muted-theme">📷 Hora en Terminal Hikvision</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${deviceTimeInfo?.isSynced ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                {deviceTimeInfo?.isSynced ? '🟢 Sincronizado' : `🟡 Desfase: ${deviceTimeInfo?.driftSeconds || 0}s`}
              </span>
            </div>
            <div className="text-2xl font-mono font-black text-main-theme mt-1">
              {deviceTimeInfo?.deviceTime ? new Date(deviceTimeInfo.deviceTime).toLocaleTimeString('es-MX', { hour12: true }) : 'En línea'}
            </div>
            <span className="text-xs text-muted-theme block mt-0.5">
              Zona Checador: {deviceTimeInfo?.deviceTimeZone || 'CST+6:00:00'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleSyncTime}
            disabled={syncingTime}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm ${isCyber ? 'bg-volt hover:bg-volt-hover text-black' : 'bg-sport-orange hover:bg-sport-orange-hover text-white'}`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncingTime ? 'animate-spin' : ''}`} />
            <span>{syncingTime ? 'Sincronizando reloj...' : 'Sincronizar Checador con esta Hora'}</span>
          </button>
          {timeMessage && <span className="text-xs text-emerald-400 font-semibold">{timeMessage}</span>}
        </div>
      </div>

      {/* Selector de Modo de Integración */}
      <div className="bg-card-theme border border-theme card-shadow-theme rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-muted-theme uppercase tracking-wider">Modo de Operación</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div onClick={() => setConfig({ ...config, hardware_mode: 'HIKCONNECT_TEAMS' })} className={`cursor-pointer p-4 rounded-xl border transition ${config.hardware_mode === 'HIKCONNECT_TEAMS' ? (isCyber ? 'border-volt bg-volt/5' : 'border-sport-orange bg-sport-orange/5') : 'border-theme bg-theme-subtle'}`}>
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-cyan-400" />
              <div>
                <span className="font-bold text-sm text-main-theme">Hik-Connect Teams</span>
                <p className="text-xs text-muted-theme mt-0.5">API Cloud Syscom/Hikvision. Hasta 100 personas gratis.</p>
              </div>
            </div>
          </div>

          <div onClick={() => setConfig({ ...config, hardware_mode: 'HIKVISION_LOCAL_ISAPI' })} className={`cursor-pointer p-4 rounded-xl border transition ${config.hardware_mode === 'HIKVISION_LOCAL_ISAPI' ? (isCyber ? 'border-volt bg-volt/5' : 'border-sport-orange bg-sport-orange/5') : 'border-theme bg-theme-subtle'}`}>
            <div className="flex items-center gap-3">
              <Network className="w-5 h-5 text-emerald-400" />
              <div>
                <span className="font-bold text-sm text-main-theme">Hikvision Local Directo</span>
                <p className="text-xs text-muted-theme mt-0.5">ISAPI LAN directo a checador. Sin internet y sin cuotas.</p>
              </div>
            </div>
          </div>

          <div onClick={() => setConfig({ ...config, hardware_mode: 'HIKCENTRAL_PRO' })} className={`cursor-pointer p-4 rounded-xl border transition ${config.hardware_mode === 'HIKCENTRAL_PRO' ? (isCyber ? 'border-volt bg-volt/5' : 'border-sport-orange bg-sport-orange/5') : 'border-theme bg-theme-subtle'}`}>
            <div className="flex items-center gap-3">
              <Building2 className="w-5 h-5 text-purple-400" />
              <div>
                <span className="font-bold text-sm text-main-theme">HikCentral Professional</span>
                <p className="text-xs text-muted-theme mt-0.5">Servidor local On-Premise (Artemis OpenAPI).</p>
              </div>
            </div>
          </div>

          <div onClick={() => setConfig({ ...config, hardware_mode: 'SIMULADO' })} className={`cursor-pointer p-4 rounded-xl border transition ${config.hardware_mode === 'SIMULADO' ? (isCyber ? 'border-volt bg-volt/5' : 'border-sport-orange bg-sport-orange/5') : 'border-theme bg-theme-subtle'}`}>
            <div className="flex items-center gap-3">
              <TestTube2 className="w-5 h-5 text-amber-400" />
              <div>
                <span className="font-bold text-sm text-main-theme">Modo Virtual / Simulado</span>
                <p className="text-xs text-muted-theme mt-0.5">Pruebas en memoria sin hardware físico.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Formulario de Guardado y Test */}
      <form onSubmit={handleSaveConfig} className="bg-card-theme border border-theme card-shadow-theme rounded-2xl p-6 space-y-4">
        {config.hardware_mode === 'HIKVISION_LOCAL_ISAPI' && (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-theme-subtle border border-theme text-xs text-muted-theme">
              ℹ️ Esta es la conexión del <strong>Checador Principal por Defecto</strong>. Si tu sucursal cuenta con múltiples torniquetes (ej. 2 Entradas y 2 Salidas), regístralos y pruébalos individualmente en la pestaña superior <strong>Áreas & Terminales</strong>.
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-muted-theme uppercase mb-1">IP Local Checador Principal</label>
                <input type="text" value={config.hik_local_ip} onChange={e => setConfig({ ...config, hik_local_ip: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-theme bg-theme-subtle text-main-theme" />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-theme uppercase mb-1">Puerto</label>
                <input type="text" value={config.hik_local_port} onChange={e => setConfig({ ...config, hik_local_port: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-theme bg-theme-subtle text-main-theme" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-muted-theme uppercase mb-1">Contraseña Admin SADP</label>
                <input type="password" value={config.hik_local_pass} onChange={e => setConfig({ ...config, hik_local_pass: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-theme bg-theme-subtle text-main-theme" />
              </div>
            </div>
          </div>
        )}

        {config.hardware_mode === 'HIKCONNECT_TEAMS' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-muted-theme uppercase mb-1">App Key (AK)</label>
              <input type="text" value={config.appKey} onChange={e => setConfig({ ...config, appKey: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-theme bg-theme-subtle text-main-theme" />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-theme uppercase mb-1">Secret Key (SK)</label>
              <input type="password" value={config.secretKey} onChange={e => setConfig({ ...config, secretKey: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-theme bg-theme-subtle text-main-theme" />
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-theme">
          <button type="submit" disabled={guardando} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold shadow-md ${isCyber ? 'bg-volt text-black' : 'bg-sport-orange text-white'}`}>
            <Save className="w-4 h-4" /> Guardar Parámetros
          </button>
          <button type="button" onClick={handleTestConnection} disabled={testing} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border border-theme bg-theme-subtle text-main-theme">
            <RefreshCw className={`w-4 h-4 ${testing ? 'animate-spin' : ''}`} /> Probar Conexión
          </button>
        </div>

        {testResult && (
          <div className={`p-3.5 rounded-xl border text-xs font-semibold ${testResult.success ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
            {testResult.message}
          </div>
        )}
      </form>
    </div>
  );
};
