import React, { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/Navbar';
import { Dashboard } from './pages/Dashboard';
import { Socios } from './pages/Socios';
import { Cobro } from './pages/Cobro';
import { Hardware } from './pages/Hardware';
import { Backups } from './pages/Backups';

function AppContent() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedSocioForCobro, setSelectedSocioForCobro] = useState<any | null>(null);

  const handleCobroSocio = (socio: any) => {
    setSelectedSocioForCobro(socio);
    setActiveTab('cobro');
  };

  return (
    <div className="min-h-screen bg-app-theme text-main-theme flex flex-col transition-colors duration-300">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} hardwareOnline={true} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && <Dashboard onNavigateCobro={() => setActiveTab('cobro')} />}
        {activeTab === 'socios' && <Socios onSelectSocioForCobro={handleCobroSocio} />}
        {activeTab === 'cobro' && <Cobro selectedSocioPreload={selectedSocioForCobro} />}
        {activeTab === 'hardware' && <Hardware />}
        {activeTab === 'backups' && <Backups />}
      </main>

      <footer className="border-t border-theme py-5 text-center text-xs text-muted-theme transition-colors">
        <div className="flex items-center justify-center gap-2">
          <span className="font-semibold text-main-theme">GymAccess Pro V1.0</span>
          <span>•</span>
          <span>Control Biométrico HikCentral Connect</span>
          <span>•</span>
          <span>Gestión Local Segura</span>
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
