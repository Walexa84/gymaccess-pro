import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/Navbar';
import { Monitor } from './pages/Monitor';
import { Personas } from './pages/Personas';
import { Cobro } from './pages/Cobro';
import { Configuracion } from './pages/Configuracion';

function AppContent() {
  const [activeTab, setActiveTab] = useState('monitor');
  const [selectedPersonaForCobro, setSelectedPersonaForCobro] = useState<any | null>(null);
  const [hardwareOnline, setHardwareOnline] = useState<boolean>(false);

  // Consultar estado inicial y suscribirse a SSE para actualizaciones de salud en vivo
  useEffect(() => {
    const fetchStatus = () => {
      fetch('/api/access/status')
        .then((res) => res.json())
        .then((data) => {
          if (typeof data.online === 'boolean') {
            setHardwareOnline(data.online);
          }
        })
        .catch(() => setHardwareOnline(false));
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);

    // Escuchar eventos de estado en tiempo real vía SSE
    const eventSource = new EventSource('/api/access/events/stream');
    eventSource.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'HARDWARE_STATUS' && typeof msg.online === 'boolean') {
          setHardwareOnline(msg.online);
        }
      } catch {
        // Ignorar heartbeats de texto plano
      }
    };

    return () => {
      clearInterval(interval);
      eventSource.close();
    };
  }, []);

  const handleCobroPersona = (persona: any) => {
    setSelectedPersonaForCobro(persona);
    setActiveTab('cobro');
  };

  return (
    <div className="min-h-screen bg-app-theme text-main-theme flex flex-col transition-colors duration-300">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} hardwareOnline={hardwareOnline} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'monitor' && <Monitor onNavigateCobro={handleCobroPersona} />}
        {activeTab === 'personas' && <Personas onSelectPersonaForCobro={handleCobroPersona} />}
        {activeTab === 'cobro' && <Cobro selectedSocioPreload={selectedPersonaForCobro} />}
        {activeTab === 'acceso' && <Configuracion />}
      </main>

      <footer className="border-t border-theme py-5 text-center text-xs text-muted-theme transition-colors">
        <div className="flex items-center justify-center gap-2">
          <span className="font-semibold text-main-theme">AccessCore & Gym POS V2.0</span>
          <span>•</span>
          <span>Control Biométrico Autónomo Hikvision</span>
          <span>•</span>
          <span>Monolito Modular Local</span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
