import React, { useState, useEffect } from 'react';
import { Settings, Clock, MapPin, Calendar, Database } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { HardwareTab } from '../components/config/HardwareTab';
import { AreasTab } from '../components/config/AreasTab';
import { HorariosTab } from '../components/config/HorariosTab';
import { BackupsTab } from '../components/config/BackupsTab';

export const Configuracion: React.FC = () => {
  const [subTab, setSubTab] = useState<'hardware' | 'areas' | 'horarios' | 'backups'>('hardware');
  
  // Hardware & Conexión
  const [config, setConfig] = useState({
    hardware_mode: 'HIKCONNECT_TEAMS',
    gym_timezone: 'America/Mexico_City',
    baseUrl: 'https://ius.hikcentralconnect.com/api',
    appKey: '',
    secretKey: '',
    accessLevelId: '',
    hik_local_ip: '192.168.1.100',
    hik_local_port: '80',
    hik_local_protocol: 'http',
    hik_local_user: 'admin',
    hik_local_pass: '',
    hik_pro_base_url: 'https://192.168.1.200:443',
    hik_pro_app_key: '',
    hik_pro_secret_key: '',
  });

  // Telemetría de Reloj
  const [liveServerTime, setLiveServerTime] = useState<string>('');
  const [deviceTimeInfo, setDeviceTimeInfo] = useState<{ deviceTime: string; driftSeconds: number; isSynced: boolean } | null>(null);
  const [syncingTime, setSyncingTime] = useState(false);
  const [timeMessage, setTimeMessage] = useState('');

  // Topología: Áreas, Terminales, Horarios, Niveles
  const [areas, setAreas] = useState<any[]>([]);
  const [terminales, setTerminales] = useState<any[]>([]);
  const [horarios, setHorarios] = useState<any[]>([]);
  const [niveles, setNiveles] = useState<any[]>([]);

  // Respaldos
  const [backups, setBackups] = useState<any[]>([]);
  const [guardando, setGuardando] = useState(false);

  const { theme } = useTheme();
  const isCyber = theme === 'cyber';

  const cargarDatos = () => {
    fetch('/api/hardware/config').then(r => r.json()).then(setConfig).catch(() => {});
    fetch('/api/hardware/time').then(r => r.json()).then(d => d.success && setDeviceTimeInfo(d)).catch(() => {});
    fetch('/api/topology/areas').then(r => r.json()).then(setAreas).catch(() => {});
    fetch('/api/topology/terminales').then(r => r.json()).then(setTerminales).catch(() => {});
    fetch('/api/topology/horarios').then(r => r.json()).then(setHorarios).catch(() => {});
    fetch('/api/topology/niveles').then(r => r.json()).then(setNiveles).catch(() => {});
    fetch('/api/backups').then(r => r.json()).then(setBackups).catch(() => {});
  };

  useEffect(() => { cargarDatos(); }, []);

  // Segundero en vivo para la zona horaria seleccionada
  useEffect(() => {
    const tick = () => {
      try {
        const formatted = new Intl.DateTimeFormat('es-MX', {
          timeZone: config.gym_timezone || 'America/Mexico_City',
          hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
        }).format(new Date());
        setLiveServerTime(formatted);
      } catch {
        setLiveServerTime(new Date().toLocaleTimeString());
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [config.gym_timezone]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setGuardando(true);
      const res = await fetch('/api/hardware/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) alert('Configuración guardada exitosamente');
    } finally { setGuardando(false); }
  };

  const handleSyncTime = async () => {
    try {
      setSyncingTime(true);
      setTimeMessage('');
      const res = await fetch('/api/hardware/sync-time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeZone: config.gym_timezone }),
      });
      const data = await res.json();
      setTimeMessage(data.message);
      fetch('/api/hardware/time').then(r => r.json()).then(d => d.success && setDeviceTimeInfo(d));
    } finally { setSyncingTime(false); }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 transition-colors duration-300">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${isCyber ? 'bg-volt/10 text-volt' : 'bg-sport-orange/10 text-sport-orange'}`}>
              <Settings className="w-6 h-6" />
            </div>
            <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-main-theme tracking-tight">
              Configuración & Topología
            </h2>
          </div>
          <p className="text-sm text-muted-theme mt-1 font-medium">
            Control de terminales, zonas horarias, áreas físicas, horarios y respaldos
          </p>
        </div>

        {/* Subpestañas */}
        <div className="flex flex-wrap items-center p-1 rounded-xl bg-theme-subtle border border-theme text-xs font-bold">
          <button
            onClick={() => setSubTab('hardware')}
            className={`px-3 py-1.5 rounded-lg transition ${subTab === 'hardware' ? (isCyber ? 'bg-volt text-black shadow-volt-glow' : 'bg-sport-orange text-white shadow-orange-glow') : 'text-muted-theme'}`}
          >
            <Clock className="w-3.5 h-3.5 inline mr-1" /> Hardware & Reloj
          </button>
          <button
            onClick={() => setSubTab('areas')}
            className={`px-3 py-1.5 rounded-lg transition ${subTab === 'areas' ? (isCyber ? 'bg-volt text-black shadow-volt-glow' : 'bg-sport-orange text-white shadow-orange-glow') : 'text-muted-theme'}`}
          >
            <MapPin className="w-3.5 h-3.5 inline mr-1" /> Áreas & Terminales
          </button>
          <button
            onClick={() => setSubTab('horarios')}
            className={`px-3 py-1.5 rounded-lg transition ${subTab === 'horarios' ? (isCyber ? 'bg-volt text-black shadow-volt-glow' : 'bg-sport-orange text-white shadow-orange-glow') : 'text-muted-theme'}`}
          >
            <Calendar className="w-3.5 h-3.5 inline mr-1" /> Horarios & Niveles
          </button>
          <button
            onClick={() => setSubTab('backups')}
            className={`px-3 py-1.5 rounded-lg transition ${subTab === 'backups' ? (isCyber ? 'bg-volt text-black shadow-volt-glow' : 'bg-sport-orange text-white shadow-orange-glow') : 'text-muted-theme'}`}
          >
            <Database className="w-3.5 h-3.5 inline mr-1" /> Respaldos
          </button>
        </div>
      </div>

      {/* 1. Hardware & Reloj */}
      {subTab === 'hardware' && (
        <HardwareTab
          config={config}
          setConfig={setConfig}
          liveServerTime={liveServerTime}
          deviceTimeInfo={deviceTimeInfo}
          handleSyncTime={handleSyncTime}
          syncingTime={syncingTime}
          timeMessage={timeMessage}
          handleSaveConfig={handleSaveConfig}
          guardando={guardando}
        />
      )}

      {/* 2. Áreas & Terminales */}
      {subTab === 'areas' && (
        <AreasTab
          areas={areas}
          terminales={terminales}
          setAreas={setAreas}
          setTerminales={setTerminales}
        />
      )}

      {/* 3. Horarios & Niveles */}
      {subTab === 'horarios' && (
        <HorariosTab
          areas={areas}
          horarios={horarios}
          niveles={niveles}
          setHorarios={setHorarios}
          setNiveles={setNiveles}
        />
      )}

      {/* 4. Respaldos */}
      {subTab === 'backups' && (
        <BackupsTab
          backups={backups}
          setBackups={setBackups}
        />
      )}
    </div>
  );
};
