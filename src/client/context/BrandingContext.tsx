import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemePreset = 'cyber' | 'sport' | 'ocean' | 'crimson' | 'clean' | 'wellness' | 'solar' | 'nordic';

export interface BrandingData {
  gym_nombre: string;
  gym_slogan: string;
  gym_logo_url: string;
  gym_theme_preset: ThemePreset;
  gym_custom_color: string;
  gym_phone: string;
  gym_address: string;
  gym_rfc: string;
  gym_ticket_footer: string;
  sound_enabled: boolean;
  cortesia_dias: number;
}

interface BrandingContextType {
  branding: BrandingData;
  loading: boolean;
  updateBranding: (data: Partial<BrandingData>) => Promise<boolean>;
  uploadLogo: (base64: string) => Promise<boolean>;
  removeLogo: () => Promise<boolean>;
  playSound: (type: 'granted' | 'denied') => void;
}

const DEFAULT_BRANDING: BrandingData = {
  gym_nombre: 'AccessCore Gym',
  gym_slogan: 'Control de Acceso Físico & Punto de Venta',
  gym_logo_url: '',
  gym_theme_preset: 'cyber',
  gym_custom_color: '#ccff00',
  gym_phone: '',
  gym_address: '',
  gym_rfc: '',
  gym_ticket_footer: '¡Gracias por entrenar con nosotros! El uso de toalla es obligatorio.',
  sound_enabled: true,
  cortesia_dias: 1,
};

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [branding, setBranding] = useState<BrandingData>(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(true);

  // Cargar configuración de marca desde la base de datos central
  const loadBranding = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/config/branding');
      if (res.ok) {
        const data = await res.json();
        setBranding(data);
      }
    } catch (err) {
      console.warn('⚠️ No se pudo cargar branding desde backend, usando valores por defecto:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranding();
  }, []);

  // Aplicar temas y variables CSS dinámicas al elemento <html>
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove(
      'theme-cyber', 'theme-clean', 'theme-sport', 'theme-ocean',
      'theme-crimson', 'theme-wellness', 'theme-solar', 'theme-nordic', 'dark'
    );

    const preset = branding.gym_theme_preset || 'cyber';
    root.classList.add(`theme-${preset}`);

    const isDark = ['cyber', 'crimson', 'ocean'].includes(preset);
    if (isDark) {
      root.classList.add('dark');
    }

    // Si hay un color personalizado que no sea el preset base, inyectar variable CSS
    if (branding.gym_custom_color && /^#[0-9A-Fa-f]{6}$/.test(branding.gym_custom_color)) {
      root.style.setProperty('--accent-color', branding.gym_custom_color);
      root.style.setProperty('--border-highlight', `${branding.gym_custom_color}59`);
      root.style.setProperty('--accent-glow', `0 0 25px -4px ${branding.gym_custom_color}4d`);
      root.style.setProperty('--accent-badge', `${branding.gym_custom_color}1f`);
    } else {
      root.style.removeProperty('--accent-color');
      root.style.removeProperty('--border-highlight');
      root.style.removeProperty('--accent-glow');
      root.style.removeProperty('--accent-badge');
    }
  }, [branding.gym_theme_preset, branding.gym_custom_color]);

  const updateBranding = async (data: Partial<BrandingData>): Promise<boolean> => {
    try {
      const res = await fetch('/api/config/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated = await res.json();
        setBranding(updated);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error actualizando branding:', err);
      return false;
    }
  };

  const uploadLogo = async (base64: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/config/branding/logo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logoBase64: base64 }),
      });
      if (res.ok) {
        await loadBranding();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error subiendo logo:', err);
      return false;
    }
  };

  const removeLogo = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/config/branding/logo', { method: 'DELETE' });
      if (res.ok) {
        setBranding((prev) => ({ ...prev, gym_logo_url: '' }));
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error eliminando logo:', err);
      return false;
    }
  };

  // Sintetizador de audio nativo Web Audio API (cero dependencias de archivos externos)
  const playSound = (type: 'granted' | 'denied') => {
    if (!branding.sound_enabled) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();

      if (type === 'granted') {
        // Tono ascendente agradable: 523Hz (C5) -> 659Hz (E5) -> 784Hz (G5)
        const notes = [523.25, 659.25, 783.99];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
          gain.gain.setValueAtTime(0.12, ctx.currentTime + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.25);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.08);
          osc.stop(ctx.currentTime + idx * 0.08 + 0.25);
        });
      } else {
        // Doble bip grave de advertencia: 220Hz -> 180Hz
        [0, 0.18].forEach((startTime) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(200, ctx.currentTime + startTime);
          gain.gain.setValueAtTime(0.15, ctx.currentTime + startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + 0.14);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + startTime);
          osc.stop(ctx.currentTime + startTime + 0.14);
        });
      }
    } catch (e) {
      console.warn('No se pudo reproducir audio feedback:', e);
    }
  };

  return (
    <BrandingContext.Provider value={{ branding, loading, updateBranding, uploadLogo, removeLogo, playSound }}>
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = () => {
  const ctx = useContext(BrandingContext);
  if (!ctx) {
    throw new Error('useBranding debe usarse dentro de un BrandingProvider');
  }
  return ctx;
};
