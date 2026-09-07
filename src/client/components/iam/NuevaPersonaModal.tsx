import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Camera, Upload, Check, AlertCircle, Sparkles, Building2, 
  CreditCard, ShieldCheck, UserCheck, RefreshCw, Layers, Edit3, Trash2, Ticket
} from 'lucide-react';
import { WebcamModal } from '../WebcamModal';
import { FaceCropperModal } from './FaceCropperModal';
import { useTheme } from '../../context/ThemeContext';
import { useBranding } from '../../context/BrandingContext';

interface NuevaPersonaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (persona: any) => void;
}

export const NuevaPersonaModal: React.FC<NuevaPersonaModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { branding } = useBranding();
  const [tipo, setTipo] = useState<'SOCIO' | 'EMPLEADO' | 'VISITANTE'>('SOCIO');
  const [diasCortesia, setDiasCortesia] = useState<number>(branding.cortesia_dias || 1);
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');

  // Sucursales, Planes y Niveles de acceso
  const [sucursales, setSucursales] = useState<any[]>([]);
  const [selectedSucursalId, setSelectedSucursalId] = useState<number | ''>('');
  const [planes, setPlanes] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | ''>('');
  const [nivelesDisponibles, setNivelesDisponibles] = useState<any[]>([]);
  const [selectedNivelIds, setSelectedNivelIds] = useState<number[]>([]);

  // Foto y recortador
  const [fotoFinalBase64, setFotoFinalBase64] = useState<string>('');
  const [rawImageToCrop, setRawImageToCrop] = useState<string>('');
  const [webcamOpen, setWebcamOpen] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Estados de carga y error
  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [duplicados, setDuplicados] = useState<any[]>([]);

  const { theme } = useTheme();
  const isCyber = theme === 'cyber';

  useEffect(() => {
    if (isOpen) {
      cargarCatalogos();
      resetForm();
    }
  }, [isOpen]);

  useEffect(() => {
    if (nombre.trim().length >= 3) {
      const timer = setTimeout(() => {
        fetch(`/api/iam/personas/buscar-duplicados?nombre=${encodeURIComponent(nombre.trim())}&apellidos=${encodeURIComponent(apellidos.trim())}`)
          .then((r) => r.json())
          .then((d) => setDuplicados(d.duplicados || []))
          .catch(() => {});
      }, 350);
      return () => clearTimeout(timer);
    } else {
      setDuplicados([]);
    }
  }, [nombre, apellidos]);

  const resetForm = () => {
    setCodigo(''); setNombre(''); setApellidos(''); setTelefono(''); setEmail('');
    setTipo('SOCIO'); setDiasCortesia(1); setFotoFinalBase64(''); setRawImageToCrop('');
    setErrorMsg(''); setDuplicados([]);
  };

  const cargarCatalogos = async () => {
    try {
      const [rCod, rSuc, rPlanes, rNiv] = await Promise.all([
        fetch('/api/iam/personas/siguiente-codigo').then(r => r.ok ? r.json() : null),
        fetch('/api/access/sucursales').then(r => r.ok ? r.json() : []),
        fetch('/api/gym/planes').then(r => r.ok ? r.json() : []),
        fetch('/api/iam/niveles-acceso').then(r => r.ok ? r.json() : []),
      ]);
      if (rCod?.siguienteCodigo) setCodigo(rCod.siguienteCodigo);
      if (rSuc?.length > 0) { setSucursales(rSuc); setSelectedSucursalId(rSuc[0].id); }
      if (rPlanes?.length > 0) {
        setPlanes(rPlanes);
        setSelectedPlanId(rPlanes[0].id);
        if (rPlanes[0].nivel_ids?.length > 0) setSelectedNivelIds(rPlanes[0].nivel_ids);
      }
      if (rNiv?.length > 0) {
        setNivelesDisponibles(rNiv);
        if (selectedNivelIds.length === 0) setSelectedNivelIds([rNiv[0].id]);
      }
    } catch (err) {
      console.error('Error cargando catálogos:', err);
    }
  };

  // Al cambiar de plan, preseleccionar los niveles de acceso de ese plan
  const handlePlanChange = (planId: number) => {
    setSelectedPlanId(planId);
    const plan = planes.find((p) => p.id === planId);
    if (plan && Array.isArray(plan.nivel_ids) && plan.nivel_ids.length > 0) {
      setSelectedNivelIds(plan.nivel_ids);
    }
  };

  // Conmutar checkbox de un nivel de acceso
  const toggleNivel = (nivelId: number) => {
    setSelectedNivelIds((prev) =>
      prev.includes(nivelId) ? prev.filter((id) => id !== nivelId) : [...prev, nivelId]
    );
  };

  // Subir archivo desde PC / Móvil
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setRawImageToCrop(result);
        setCropperOpen(true);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Foto tomada con Webcam
  const handleWebcamCapture = (base64: string) => {
    setWebcamOpen(false);
    setRawImageToCrop(base64);
    setCropperOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setErrorMsg('El nombre de la persona es obligatorio');
      return;
    }

    if (selectedNivelIds.length === 0) {
      setErrorMsg('Debes seleccionar al menos una puerta o nivel de acceso');
      return;
    }

    setGuardando(true);
    setErrorMsg('');

    try {
      const payload = {
        codigo: codigo.trim() || undefined,
        nombre: nombre.trim(),
        apellidos: apellidos.trim(),
        telefono: telefono.trim() || undefined,
        email: email.trim(),
        tipo,
        sucursalId: selectedSucursalId ? Number(selectedSucursalId) : undefined,
        planId: tipo === 'SOCIO' && selectedPlanId ? Number(selectedPlanId) : undefined,
        vigenciaDias: tipo === 'VISITANTE' ? diasCortesia : undefined,
        nivelIds: selectedNivelIds,
        fotoBase64: fotoFinalBase64 || undefined,
      };

      const res = await fetch('/api/iam/personas/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al enrolar persona');

      onSuccess(data.persona || data);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setGuardando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-card-theme border border-theme rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        
        {/* Cabecera */}
        <div className="p-5 border-b border-theme flex items-center justify-between bg-theme-subtle">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-main-theme flex items-center gap-2">
                Enrolamiento & Alta de Persona
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-theme border border-theme text-muted-theme font-mono">
                  AccessCore
                </span>
              </h3>
              <p className="text-xs text-muted-theme">
                Registra al cliente o empleado, calibra su biometría facial y actívalo en los checadores al instante.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-muted-theme hover:text-main-theme rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario de Dos Columnas */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Columna Izquierda: Fotografía Facial y Recorte (5 columnas) */}
          <div className="md:col-span-5 flex flex-col items-center p-5 rounded-2xl bg-theme-subtle border border-theme space-y-4">
            <h4 className="text-xs font-bold text-muted-theme uppercase tracking-wider self-start flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-cyan-400" />
              Credencial Facial Biométrica
            </h4>

            {/* Marco de Previsualización Rectangular Tipo Carnet */}
            <div className="relative w-40 h-52 rounded-2xl overflow-hidden border-2 border-theme shadow-xl bg-black/40 flex items-center justify-center group">
              {fotoFinalBase64 ? (
                <img src={fotoFinalBase64} alt="Rostro" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center p-4">
                  <Camera className="w-8 h-8 mx-auto text-muted-theme mb-1 opacity-50" />
                  <span className="text-[11px] text-muted-theme block">Sin fotografía facial</span>
                </div>
              )}
            </div>

            {/* Botones de Captura / Carga */}
            <div className="w-full space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setWebcamOpen(true)} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-theme border border-theme hover:text-cyan-400 transition">
                  <Camera className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Webcam</span>
                </button>
                <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-theme border border-theme hover:text-cyan-400 transition">
                  <Upload className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Subir Foto</span>
                </button>
              </div>

              {fotoFinalBase64 && (
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setRawImageToCrop(fotoFinalBase64); setCropperOpen(true); }} className="flex-1 flex items-center justify-center gap-1 text-[11px] py-1 text-muted-theme hover:text-main-theme font-semibold">
                    <Edit3 className="w-3 h-3" /> Reajustar Recorte
                  </button>
                  <button type="button" onClick={() => setFotoFinalBase64('')} className="text-[11px] py-1 text-red-400 hover:underline">
                    Quitar
                  </button>
                </div>
              )}
            </div>

            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} className="hidden" />

            <p className="text-[10px] text-muted-theme text-center leading-relaxed">
              El algoritmo de Hikvision requiere un rostro centrado, de frente y sin sombras pesadas.
            </p>
          </div>

          {/* Columna Derecha: Datos, Categoría y Puertas (7 columnas) */}
          <div className="md:col-span-7 space-y-4">
            {/* Conmutador Socio vs Staff vs Cortesía */}
            <div className="flex p-1 bg-theme-subtle rounded-xl border border-theme gap-1">
              <button
                type="button"
                onClick={() => setTipo('SOCIO')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  tipo === 'SOCIO'
                    ? isCyber ? 'bg-volt text-black shadow' : 'bg-sport-orange text-white shadow'
                    : 'text-muted-theme hover:text-main-theme'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Socio</span>
              </button>
              <button
                type="button"
                onClick={() => setTipo('EMPLEADO')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  tipo === 'EMPLEADO'
                    ? isCyber ? 'bg-volt text-black shadow' : 'bg-sport-orange text-white shadow'
                    : 'text-muted-theme hover:text-main-theme'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Personal</span>
              </button>
              <button
                type="button"
                onClick={() => setTipo('VISITANTE')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  tipo === 'VISITANTE'
                    ? isCyber ? 'bg-volt text-black shadow' : 'bg-sport-orange text-white shadow'
                    : 'text-muted-theme hover:text-main-theme'
                }`}
              >
                <Ticket className="w-3.5 h-3.5" />
                <span>Cortesía</span>
              </button>
            </div>

            {/* Datos Personales con ID / Código */}
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-4">
                <label className="text-xs font-semibold text-muted-theme">ID / Código *</label>
                <input type="text" required placeholder="Ej. 1002" value={codigo} onChange={(e) => setCodigo(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-xl bg-theme-subtle border border-theme text-xs text-main-theme focus:outline-none focus:border-cyan-400 font-mono font-bold" />
              </div>
              <div className="col-span-4">
                <label className="text-xs font-semibold text-muted-theme">Nombre *</label>
                <input type="text" required placeholder="Ej. Juan" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-xl bg-theme-subtle border border-theme text-xs text-main-theme focus:outline-none focus:border-cyan-400 font-bold" />
              </div>
              <div className="col-span-4">
                <label className="text-xs font-semibold text-muted-theme">Apellidos</label>
                <input type="text" placeholder="Ej. Pérez López" value={apellidos} onChange={(e) => setApellidos(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-xl bg-theme-subtle border border-theme text-xs text-main-theme focus:outline-none focus:border-cyan-400 font-bold" />
              </div>
            </div>

            {duplicados.length > 0 && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-start gap-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <div className="min-w-0 flex-1">
                  <p className="font-bold">Posible cliente ya registrado:</p>
                  <p className="text-[11px] text-muted-theme">
                    {duplicados[0].nombre} {duplicados[0].apellidos || ''} (ID #{duplicados[0].id} - {duplicados[0].cortesiasUsadas}/3 cortesías usadas).
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-theme">Teléfono Celular (Opcional)</label>
                <input type="text" placeholder="Ej. 2281234567" value={telefono} onChange={(e) => setTelefono(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-xl bg-theme-subtle border border-theme text-xs text-main-theme focus:outline-none focus:border-cyan-400 font-mono" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-theme">Email (Opcional)</label>
                <input type="email" placeholder="juan@correo.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-xl bg-theme-subtle border border-theme text-xs text-main-theme focus:outline-none focus:border-cyan-400" />
              </div>
            </div>

            {/* Sucursal Principal */}
            <div>
              <label className="text-xs font-semibold text-muted-theme flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                Sucursal Base
              </label>
              <select
                value={selectedSucursalId}
                onChange={(e) => setSelectedSucursalId(Number(e.target.value))}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-theme-subtle border border-theme text-xs text-main-theme font-bold focus:outline-none focus:border-cyan-400"
              >
                {sucursales.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre} ({s.total_dispositivos || 0} Checadores)
                  </option>
                ))}
              </select>
            </div>

            {/* Sección de Socio: Paquete Comercial */}
            {tipo === 'SOCIO' && (
              <div>
                <label className="text-xs font-semibold text-muted-theme flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-cyan-400" />
                  Paquete de Membresía
                </label>
                <select
                  value={selectedPlanId}
                  onChange={(e) => handlePlanChange(Number(e.target.value))}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-theme-subtle border border-theme text-xs text-main-theme font-bold focus:outline-none focus:border-cyan-400"
                >
                  {planes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} — ${p.precio} ({p.duracion_dias} días)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Sección de Visitante: Pase de Cortesía */}
            {tipo === 'VISITANTE' && (
              <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                    <Ticket className="w-3.5 h-3.5" />
                    Pase de Cortesía (Prueba Gratuita)
                  </label>
                  <span className="text-[10px] text-cyan-300 font-mono font-bold">Vence hoy 23:59:59</span>
                </div>
                <div className="p-2.5 rounded-lg bg-black/20 border border-cyan-500/20 flex items-center justify-between text-xs">
                  <span className="text-main-theme font-medium flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                    1 Día de Acceso Total
                  </span>
                  <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/20 px-2 py-0.5 rounded">
                    Máx. 3 vitalicias por persona
                  </span>
                </div>
              </div>
            )}

            {/* Puertas / Niveles de Acceso Configurables */}
            <div className="space-y-2 pt-1 border-t border-theme">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-main-theme flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  Puertas y Niveles Autorizados ({selectedNivelIds.length})
                </label>
                <span className="text-[10px] text-muted-theme">
                  {tipo === 'SOCIO' ? 'Preseleccionados por el plan' : tipo === 'VISITANTE' ? `Pase temporal (${diasCortesia} d)` : 'Acceso de Staff (1 año)'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto p-1">
                {nivelesDisponibles.map((niv) => {
                  const isChecked = selectedNivelIds.includes(niv.id);
                  return (
                    <label key={niv.id} onClick={() => toggleNivel(niv.id)} className={`p-2.5 rounded-xl border flex items-center gap-2.5 cursor-pointer select-none transition ${isChecked ? 'bg-cyan-500/10 border-cyan-500/30 text-main-theme' : 'bg-theme-subtle border-theme text-muted-theme hover:text-main-theme'}`}>
                      <input type="checkbox" checked={isChecked} onChange={() => {}} className="rounded border-theme text-cyan-400 focus:ring-0 cursor-pointer" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold truncate">{niv.nombre}</div>
                        <div className="text-[10px] text-muted-theme truncate">{niv.cuenta_nombre || 'Teams'}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-bold text-muted-theme hover:bg-theme-subtle">
                Cancelar
              </button>
              <button type="submit" disabled={guardando} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition shadow-lg ${isCyber ? 'bg-volt text-black shadow-volt-glow hover:opacity-90' : 'bg-sport-orange text-white shadow-orange-glow hover:opacity-90'}`}>
                {guardando ? <><RefreshCw className="w-4 h-4 animate-spin" /><span>Inyectando en Checadores...</span></> : <><Sparkles className="w-4 h-4" /><span>Guardar y Enrolar en Checador</span></>}
              </button>
            </div>

          </div>
        </form>

      </div>

      {/* Modal de Cámara Web */}
      {webcamOpen && (
        <WebcamModal
          isOpen={webcamOpen}
          onClose={() => setWebcamOpen(false)}
          onCapture={handleWebcamCapture}
        />
      )}

      {/* Recortador Biométrico con Silueta Facial */}
      {cropperOpen && (
        <FaceCropperModal
          isOpen={cropperOpen}
          imageSrc={rawImageToCrop}
          onClose={() => setCropperOpen(false)}
          onCropComplete={(cropped) => setFotoFinalBase64(cropped)}
        />
      )}
    </div>
  );
};
