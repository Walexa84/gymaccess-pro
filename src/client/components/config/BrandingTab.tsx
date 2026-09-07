import React, { useState, useRef } from 'react';
import { 
  Palette, Building2, Upload, Trash2, Volume2, Receipt, 
  Sparkles, CheckCircle2, Phone, MapPin, FileText, Zap, 
  Eye, RefreshCw, VolumeX 
} from 'lucide-react';
import { useBranding, ThemePreset } from '../../context/BrandingContext';

export const BrandingTab: React.FC = () => {
  const { branding, updateBranding, uploadLogo, removeLogo, playSound } = useBranding();

  const [nombre, setNombre] = useState(branding.gym_nombre);
  const [slogan, setSlogan] = useState(branding.gym_slogan);
  const [phone, setPhone] = useState(branding.gym_phone);
  const [address, setAddress] = useState(branding.gym_address);
  const [rfc, setRfc] = useState(branding.gym_rfc);
  const [ticketFooter, setTicketFooter] = useState(branding.gym_ticket_footer);
  const [preset, setPreset] = useState<ThemePreset>(branding.gym_theme_preset);
  const [customColor, setCustomColor] = useState(branding.gym_custom_color || '#ccff00');
  const [soundEnabled, setSoundEnabled] = useState(branding.sound_enabled);
  const [cortesiaDias, setCortesiaDias] = useState(branding.cortesia_dias);

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const lightPresets: Array<{ id: ThemePreset; name: string; subtitle: string; bg: string; accent: string }> = [
    { id: 'clean', name: 'Clean Studio', subtitle: 'Blanco nieve & Azul eléctrico (Clínico / Moderno)', bg: '#f8fafc', accent: '#2563eb' },
    { id: 'wellness', name: 'Sage Wellness', subtitle: 'Menta suave & Verde esmeralda (Salud / Yoga / Pilates)', bg: '#f0fdf4', accent: '#059669' },
    { id: 'solar', name: 'Solar Amber', subtitle: 'Marfil cálido & Ámbar boutique (Cálido / Enérgico)', bg: '#fffbeb', accent: '#ea580c' },
    { id: 'nordic', name: 'Nordic Slate', subtitle: 'Gris nórdico & Púrpura índigo (Alto contraste)', bg: '#eef2f6', accent: '#6366f1' },
  ];

  const darkPresets: Array<{ id: ThemePreset; name: string; subtitle: string; bg: string; accent: string }> = [
    { id: 'cyber', name: 'Cyber Volt', subtitle: 'Negro asfalto & Neón volt (Crossfit / Urbano)', bg: '#090a0f', accent: '#ccff00' },
    { id: 'crimson', name: 'Onyx Crimson', subtitle: 'Carbón oscuro & Rojo fuego (Box / MMA / Fuerza)', bg: '#0d0a0b', accent: '#ff2244' },
    { id: 'ocean', name: 'Midnight Ocean', subtitle: 'Azul abisal & Cian glaciar (Acuático / Noche)', bg: '#060b13', accent: '#00e5ff' },
  ];

  const allPresets = [...lightPresets, ...darkPresets];

  const handleSelectPreset = (pId: ThemePreset) => {
    setPreset(pId);
    const p = allPresets.find((x) => x.id === pId);
    if (p) setCustomColor(p.accent);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setUploadingLogo(true);
        await uploadLogo(base64);
        setUploadingLogo(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const ok = await updateBranding({
      gym_nombre: nombre,
      gym_slogan: slogan,
      gym_phone: phone,
      gym_address: address,
      gym_rfc: rfc,
      gym_ticket_footer: ticketFooter,
      gym_theme_preset: preset,
      gym_custom_color: customColor,
      sound_enabled: soundEnabled,
      cortesia_dias: cortesiaDias,
    });
    setSaving(false);
    if (ok) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 1. SECCIÓN DE LOGOTIPO E IDENTIDAD DE MARCA */}
      <div className="p-6 rounded-2xl bg-card-theme border border-theme card-shadow-theme">
        <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-theme">
          <Building2 className="w-5 h-5 text-accent-theme" />
          <div>
            <h3 className="text-base font-bold text-main-theme">Identidad & Logotipo Oficial</h3>
            <p className="text-xs text-muted-theme">Nombre comercial y logotipo que aparecerán en Navbar, Ficha de Socio y Tickets</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Tarjeta del Logo */}
          <div className="md:col-span-4 flex flex-col items-center p-4 rounded-xl bg-theme-subtle border border-theme text-center">
            <div className="w-28 h-28 rounded-2xl border-2 border-dashed border-theme flex items-center justify-center p-2 mb-3 bg-theme overflow-hidden relative">
              {branding.gym_logo_url ? (
                <img src={branding.gym_logo_url} alt="Logo Gym" className="w-full h-full object-contain" />
              ) : (
                <div className="text-center p-2">
                  <Zap className="w-10 h-10 mx-auto text-accent-theme fill-current opacity-80" />
                  <span className="text-[10px] text-muted-theme mt-1 block">Logo por Defecto</span>
                </div>
              )}
              {uploadingLogo && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                  <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin" />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 w-full">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold bg-theme border border-theme text-main-theme hover:border-accent-theme transition shadow-sm"
              >
                <Upload className="w-3.5 h-3.5 text-accent-theme" />
                <span>{branding.gym_logo_url ? 'Cambiar' : 'Subir Logo'}</span>
              </button>
              {branding.gym_logo_url && (
                <button
                  type="button"
                  onClick={() => removeLogo()}
                  className="p-2 rounded-xl text-xs text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 transition"
                  title="Restaurar logo predeterminado"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" onChange={handleLogoUpload} className="hidden" />
            <span className="text-[10px] text-muted-theme mt-2">Recomendado: PNG con fondo transparente o SVG (máx 4MB)</span>
          </div>

          {/* Inputs de Nombre y Slogan */}
          <div className="md:col-span-8 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-muted-theme">Nombre del Gimnasio *</label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. PowerFit Arena"
                  className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-theme-subtle border border-theme text-sm font-bold text-main-theme focus:outline-none focus:border-accent-theme"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-theme">Eslogan / Subtítulo</label>
                <input
                  type="text"
                  value={slogan}
                  onChange={(e) => setSlogan(e.target.value)}
                  placeholder="Ej. Tu mejor versión cada día"
                  className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-theme-subtle border border-theme text-xs text-main-theme focus:outline-none focus:border-accent-theme"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <label className="text-xs font-medium text-muted-theme flex items-center gap-1">
                  <Phone className="w-3 h-3 text-cyan-400" /> Teléfono / WhatsApp
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ej. 228 123 4567"
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-theme-subtle border border-theme text-xs text-main-theme focus:outline-none focus:border-accent-theme"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-theme flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-cyan-400" /> Dirección
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ej. Av. Araucarias 102"
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-theme-subtle border border-theme text-xs text-main-theme focus:outline-none focus:border-accent-theme"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-theme flex items-center gap-1">
                  <FileText className="w-3 h-3 text-cyan-400" /> RFC / Razón Social
                </label>
                <input
                  type="text"
                  value={rfc}
                  onChange={(e) => setRfc(e.target.value)}
                  placeholder="Ej. GIM980101XYZ"
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-theme-subtle border border-theme text-xs text-main-theme focus:outline-none focus:border-accent-theme font-mono uppercase"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. SECCIÓN DE TEMAS DEPORTIVOS Y PALETA DE COLORES */}
      <div className="p-6 rounded-2xl bg-card-theme border border-theme card-shadow-theme">
        <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-theme">
          <Palette className="w-5 h-5 text-accent-theme" />
          <div>
            <h3 className="text-base font-bold text-main-theme">Estilo Visual & Paleta Deportiva</h3>
            <p className="text-xs text-muted-theme">Selecciona un tema deportivo prediseñado o ajusta el color exacto de tu marca</p>
          </div>
        </div>

        {/* Sección Modos Claros */}
        <div className="mb-4 space-y-2">
          <span className="text-xs font-bold text-main-theme flex items-center gap-1.5 uppercase tracking-wider">
            ☀️ Temas Claros (Recepción Iluminada & Ambientes Frescos)
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {lightPresets.map((p) => {
              const isSelected = preset === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectPreset(p.id)}
                  className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 relative ${
                    isSelected
                      ? 'border-accent-theme bg-card-theme shadow-md ring-2 ring-accent-theme'
                      : 'border-theme bg-theme-subtle hover:border-theme'
                  }`}
                >
                  <div
                    className="w-7 h-7 rounded-lg shrink-0 border flex items-center justify-center font-bold text-xs shadow-sm"
                    style={{ backgroundColor: p.bg, borderColor: p.accent, color: p.accent }}
                  >
                    ☀️
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-main-theme">{p.name}</span>
                      <span className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0" style={{ backgroundColor: p.accent }} />
                    </div>
                    <p className="text-[10px] text-muted-theme mt-0.5 line-clamp-1">{p.subtitle}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sección Modos Oscuros */}
        <div className="mb-5 space-y-2">
          <span className="text-xs font-bold text-main-theme flex items-center gap-1.5 uppercase tracking-wider">
            🌙 Temas Oscuros (Alto Rendimiento & Contraste Fuerte)
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {darkPresets.map((p) => {
              const isSelected = preset === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectPreset(p.id)}
                  className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 relative ${
                    isSelected
                      ? 'border-accent-theme bg-card-theme shadow-md ring-2 ring-accent-theme'
                      : 'border-theme bg-theme-subtle hover:border-theme'
                  }`}
                >
                  <div
                    className="w-7 h-7 rounded-lg shrink-0 border flex items-center justify-center font-bold text-xs shadow-sm"
                    style={{ backgroundColor: p.bg, borderColor: p.accent, color: p.accent }}
                  >
                    ⚡
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-main-theme">{p.name}</span>
                      <span className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0" style={{ backgroundColor: p.accent }} />
                    </div>
                    <p className="text-[10px] text-muted-theme mt-0.5 line-clamp-1">{p.subtitle}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selector de Color Hexadecimal Libre */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3.5 rounded-xl bg-theme-subtle border border-theme">
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={customColor}
              onChange={(e) => setCustomColor(e.target.value)}
              className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
              title="Seleccionar color personalizado"
            />
            <div>
              <span className="text-xs font-bold text-main-theme block">Color de Acento Personalizado</span>
              <span className="text-[11px] font-mono text-muted-theme uppercase">{customColor}</span>
            </div>
          </div>
          <span className="text-xs text-muted-theme">
            Se aplica a botones primarios, badges de vigencia y brillos de la interfaz.
          </span>
        </div>
      </div>

      {/* 3. MEMBRETE DE TICKETS Y CONFIGURACIÓN OPERATIVA */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Configuración de Tickets */}
        <div className="md:col-span-7 p-6 rounded-2xl bg-card-theme border border-theme card-shadow-theme space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-theme">
            <Receipt className="w-5 h-5 text-accent-theme" />
            <div>
              <h3 className="text-sm font-bold text-main-theme">Membrete de Tickets POS</h3>
              <p className="text-xs text-muted-theme">Mensaje impreso al pie de los recibos de pago</p>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-theme">Mensaje de Despedida / Políticas en Ticket</label>
            <textarea
              rows={3}
              value={ticketFooter}
              onChange={(e) => setTicketFooter(e.target.value)}
              placeholder="Ej. ¡Gracias por tu compra! No se aceptan devoluciones. Uso obligatorio de toalla."
              className="w-full mt-1.5 p-3 rounded-xl bg-theme-subtle border border-theme text-xs text-main-theme focus:outline-none focus:border-accent-theme"
            />
          </div>

          <div className="pt-2 border-t border-theme flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-main-theme block">Duración del Pase de Cortesía</span>
              <span className="text-[11px] text-muted-theme">Días de prueba asignados por defecto</span>
            </div>
            <select
              value={cortesiaDias}
              onChange={(e) => setCortesiaDias(Number(e.target.value))}
              className="px-3 py-1.5 rounded-xl bg-theme-subtle border border-theme text-xs font-bold text-main-theme focus:outline-none"
            >
              <option value={1}>1 Día (Hoy)</option>
              <option value={2}>2 Días</option>
              <option value={3}>3 Días</option>
              <option value={7}>7 Días (Semana)</option>
            </select>
          </div>
        </div>

        {/* Sonido de Validación en Torniquete */}
        <div className="md:col-span-5 p-6 rounded-2xl bg-card-theme border border-theme card-shadow-theme space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 pb-3 border-b border-theme">
              <Volume2 className="w-5 h-5 text-accent-theme" />
              <div>
                <h3 className="text-sm font-bold text-main-theme">Audio Feedback (Monitor)</h3>
                <p className="text-xs text-muted-theme">Sonidos al checar en el torniquete</p>
              </div>
            </div>

            <div className="flex items-center justify-between mt-4 p-3 rounded-xl bg-theme-subtle border border-theme">
              <span className="text-xs font-bold text-main-theme">Activar Sonidos de Validación</span>
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition ${
                  soundEnabled ? 'bg-accent-theme' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`bg-black w-4 h-4 rounded-full shadow-md transform transition ${
                    soundEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => playSound('granted')}
              className="flex-1 py-2 px-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 transition flex items-center justify-center gap-1.5"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Probar Éxito</span>
            </button>
            <button
              type="button"
              onClick={() => playSound('denied')}
              className="flex-1 py-2 px-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500/20 transition flex items-center justify-center gap-1.5"
            >
              <VolumeX className="w-3.5 h-3.5" />
              <span>Probar Alerta</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. BOTÓN DE GUARDAR CAMBIOS */}
      <div className="flex items-center justify-end gap-3 pt-2">
        {saveSuccess && (
          <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 animate-fade-in">
            <CheckCircle2 className="w-4 h-4" /> ¡Configuración de marca guardada con éxito!
          </span>
        )}
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 rounded-xl font-bold text-xs bg-accent-theme text-black shadow-md hover:opacity-90 transition disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Guardando...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Guardar Cambios de Marca</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};
