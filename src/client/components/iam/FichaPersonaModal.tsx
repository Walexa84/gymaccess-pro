import React, { useState, useEffect, useRef } from 'react';
import { 
  X, AlertCircle, ShieldCheck, RefreshCw, Cpu, Phone, Mail, CheckCircle2,
  Edit3, Save, Lock
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { FaceCropperModal } from './FaceCropperModal';
import { WebcamModal } from '../WebcamModal';
import { FichaZonasList } from './FichaZonasList';
import { FichaVigenciaCard } from './FichaVigenciaCard';
import { FichaPhotoCarnet } from './FichaPhotoCarnet';

interface FichaPersonaModalProps {
  isOpen: boolean;
  onClose: () => void;
  personaId: number | null;
  onSuccess: () => void;
}

export const FichaPersonaModal: React.FC<FichaPersonaModalProps> = ({ isOpen, onClose, personaId, onSuccess }) => {
  const { theme } = useTheme();
  const isCyber = theme === 'cyber';

  const [loading, setLoading] = useState(true);
  const [ficha, setFicha] = useState<any>(null);
  const [nuevaFecha, setNuevaFecha] = useState<string>('');
  const [nivelesSeleccionados, setNivelesSeleccionados] = useState<number[]>([]);
  const [guardandoVigencia, setGuardandoVigencia] = useState(false);
  const [sincronizandoTeams, setSincronizandoTeams] = useState(false);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [webcamOpen, setWebcamOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: 'exito' | 'error'; mensaje: string } | null>(null);

  // Edición de datos generales
  const [editandoDatos, setEditandoDatos] = useState(false);
  const [guardandoDatos, setGuardandoDatos] = useState(false);
  const [formDatos, setFormDatos] = useState({ codigo: '', nombre: '', apellidos: '', telefono: '', email: '' });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setFeedback({ tipo: 'error', mensaje: 'La imagen excede el límite de 8MB' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setRawImageSrc(reader.result as string);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleWebcamCapture = (base64Img: string) => {
    setWebcamOpen(false);
    setRawImageSrc(base64Img);
    setShowCropper(true);
  };

  const cargarFicha = async () => {
    if (!personaId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/iam/personas/${personaId}/ficha`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar expediente');
      
      setFicha(data);
      const p = data.persona;
      setFormDatos({
        codigo: p.codigo || '',
        nombre: p.nombre || '',
        apellidos: p.apellidos || '',
        telefono: p.telefono || '',
        email: p.email || '',
      });

      const fechaFin = p.vigencia_fin ? p.vigencia_fin.split('T')[0] : '';
      setNuevaFecha(fechaFin);

      const asignados = data.niveles
        .filter((n: any) => n.asignado || n.incluido_en_plan)
        .map((n: any) => n.id);
      setNivelesSeleccionados(asignados);
    } catch (err: any) {
      setFeedback({ tipo: 'error', mensaje: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && personaId) {
      setFeedback(null);
      setEditandoDatos(false);
      cargarFicha();
    }
  }, [isOpen, personaId]);

  if (!isOpen) return null;

  const toggleNivel = (id: number) => {
    setNivelesSeleccionados(prev => 
      prev.includes(id) ? prev.filter(nId => nId !== id) : [...prev, id]
    );
  };

  const handleGuardarDatos = async () => {
    if (!personaId) return;
    if (!formDatos.codigo.trim()) {
      setFeedback({ tipo: 'error', mensaje: 'El ID / Código es obligatorio' });
      return;
    }
    if (!formDatos.nombre.trim()) {
      setFeedback({ tipo: 'error', mensaje: 'El nombre es obligatorio' });
      return;
    }
    if (!formDatos.telefono.trim()) {
      setFeedback({ tipo: 'error', mensaje: 'El teléfono es obligatorio' });
      return;
    }
    try {
      setGuardandoDatos(true);
      setFeedback(null);
      const res = await fetch(`/api/iam/personas/${personaId}/datos`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formDatos),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al actualizar datos');

      const msg = data.teamsSynced 
        ? '¡Datos actualizados y sincronizados con el checador!'
        : data.teamsError 
          ? `Datos locales guardados. ${data.teamsError}` 
          : 'Datos del cliente actualizados correctamente';

      setFeedback({ tipo: data.teamsError ? 'error' : 'exito', mensaje: msg });
      setEditandoDatos(false);
      onSuccess();
      await cargarFicha();
    } catch (err: any) {
      setFeedback({ tipo: 'error', mensaje: err.message });
    } finally {
      setGuardandoDatos(false);
    }
  };

  const handleGuardarVigencia = async () => {
    if (!nuevaFecha || !personaId) return;
    try {
      setGuardandoVigencia(true);
      setFeedback(null);
      const res = await fetch(`/api/iam/personas/${personaId}/vigencia`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fecha_fin: nuevaFecha }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al actualizar vigencia');
      setFeedback({ tipo: 'exito', mensaje: 'Vigencia actualizada y sincronizada con el checador' });
      onSuccess();
      await cargarFicha();
    } catch (err: any) {
      setFeedback({ tipo: 'error', mensaje: err.message });
    } finally {
      setGuardandoVigencia(false);
    }
  };

  const handleForzarSincronizacion = async () => {
    if (!personaId) return;
    try {
      setSincronizandoTeams(true);
      setFeedback(null);
      const res = await fetch(`/api/iam/personas/${personaId}/sync-teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nivelesIds: nivelesSeleccionados }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.teamsError || data.error || 'Error de sincronización con Teams');
      }
      setFeedback({ 
        tipo: 'exito', 
        mensaje: `¡Socio sincronizado con el checador! ID Teams: ${data.hik_person_id}` 
      });
      onSuccess();
      await cargarFicha();
    } catch (err: any) {
      setFeedback({ tipo: 'error', mensaje: err.message });
    } finally {
      setSincronizandoTeams(false);
    }
  };

  const handleFotoCropped = async (base64Foto: string) => {
    setShowCropper(false);
    if (!personaId) return;
    try {
      setSubiendoFoto(true);
      setFeedback(null);
      const res = await fetch(`/api/iam/personas/${personaId}/foto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fotoBase64: base64Foto }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar foto');
      setFeedback({ 
        tipo: 'exito', 
        mensaje: data.teamsSynced 
          ? '¡Foto guardada y propagada al checador de Teams!' 
          : 'Foto guardada localmente' 
      });
      onSuccess();
      await cargarFicha();
    } catch (err: any) {
      setFeedback({ tipo: 'error', mensaje: err.message });
    } finally {
      setSubiendoFoto(false);
    }
  };

  const persona = ficha?.persona;
  const membresia = ficha?.membresia;
  const niveles = ficha?.niveles || [];
  const estaSincronizado = Boolean(persona?.hik_person_id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-card-theme border border-theme rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* Cabecera */}
        <div className="p-4 border-b border-theme flex items-center justify-between bg-theme-subtle shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${isCyber ? 'bg-volt/10 text-volt' : 'bg-sport-orange/10 text-sport-orange'}`}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-main-theme">Ficha Integral del Socio</h3>
                <span className="text-[10px] font-mono-numbers px-2 py-0.5 rounded bg-theme-subtle border border-theme text-muted-theme">
                  {persona?.codigo || 'PER-XXXX'}
                </span>
              </div>
              <p className="text-[11px] text-muted-theme">Fotografía, datos generales, vigencia y puertas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-theme hover:text-main-theme hover:bg-theme-subtle transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido con scroll */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-muted-theme">
              <RefreshCw className="w-6 h-6 animate-spin text-accent-theme" />
              <span className="text-xs">Cargando expediente del socio...</span>
            </div>
          ) : (
            <>
              {feedback && (
                <div className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs animate-fade-in ${
                  feedback.tipo === 'exito' 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                    : 'bg-red-500/10 border-red-500/30 text-red-400'
                }`}>
                  {feedback.tipo === 'exito' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span className="font-medium">{feedback.mensaje}</span>
                </div>
              )}

              {/* Carnet e Identidad */}
              <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-2xl bg-theme-subtle border border-theme">
                <FichaPhotoCarnet
                  fotoUrl={persona?.foto_url}
                  subiendoFoto={subiendoFoto}
                  fileInputRef={fileInputRef}
                  onFileSelect={handleFileSelect}
                  onOpenWebcam={() => setWebcamOpen(true)}
                />

                {/* Datos del Socio o Formulario de Edición */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-card-theme border border-theme text-muted-theme">
                      {persona?.tipo || 'SOCIO'}
                    </span>
                    <div className="flex items-center gap-2">
                      {estaSincronizado ? (
                        <span className="flex items-center gap-1 text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 text-[11px]">
                          <Cpu className="w-3 h-3" /> En Checador
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 text-[11px]">
                          <AlertCircle className="w-3 h-3" /> Pendiente Teams
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setEditandoDatos(!editandoDatos)}
                        className="px-2 py-0.5 rounded text-[11px] font-bold bg-theme-subtle hover:bg-accent-theme hover:text-black border border-theme text-muted-theme transition flex items-center gap-1"
                        title={editandoDatos ? 'Cancelar edición' : 'Modificar datos del cliente'}
                      >
                        <Edit3 className="w-3 h-3" />
                        {editandoDatos ? 'Cancelar' : 'Editar'}
                      </button>
                    </div>
                  </div>

                  {editandoDatos ? (
                    <div className="space-y-2 pt-1">
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <div className="flex items-center justify-between mb-0.5">
                            <label className="text-[10px] text-muted-theme font-bold">ID / Código *</label>
                            {estaSincronizado && (
                              <span className="text-[9px] text-emerald-400 font-bold flex items-center gap-0.5" title="Inmutable: Ya grabado en hardware">
                                <Lock className="w-2.5 h-2.5" /> Fijo
                              </span>
                            )}
                          </div>
                          <input
                            type="text"
                            value={formDatos.codigo}
                            disabled={estaSincronizado}
                            readOnly={estaSincronizado}
                            onChange={(e) => setFormDatos({ ...formDatos, codigo: e.target.value })}
                            className={`w-full px-2 py-1.5 rounded-lg border text-xs font-mono font-bold focus:outline-none transition ${
                              estaSincronizado
                                ? 'bg-theme-subtle border-theme text-muted-theme cursor-not-allowed opacity-75 select-none'
                                : 'bg-card-theme border-theme text-main-theme focus:border-accent-theme'
                            }`}
                            placeholder="Ej. 1001"
                            title={estaSincronizado ? 'Inmutable: El código no se puede modificar porque ya está grabado en el checador facial y en Hik-Connect Teams' : undefined}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-theme font-bold block mb-0.5">Nombre *</label>
                          <input
                            type="text"
                            value={formDatos.nombre}
                            onChange={(e) => setFormDatos({ ...formDatos, nombre: e.target.value })}
                            className="w-full px-2 py-1.5 rounded-lg bg-card-theme border border-theme text-xs text-main-theme focus:outline-none focus:border-accent-theme"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-theme font-bold block mb-0.5">Apellidos</label>
                          <input
                            type="text"
                            value={formDatos.apellidos}
                            onChange={(e) => setFormDatos({ ...formDatos, apellidos: e.target.value })}
                            className="w-full px-2 py-1.5 rounded-lg bg-card-theme border border-theme text-xs text-main-theme focus:outline-none focus:border-accent-theme"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-muted-theme font-bold block mb-0.5">Teléfono *</label>
                          <input
                            type="text"
                            value={formDatos.telefono}
                            onChange={(e) => setFormDatos({ ...formDatos, telefono: e.target.value })}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-card-theme border border-theme text-xs text-main-theme font-mono focus:outline-none focus:border-accent-theme"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-theme font-bold block mb-0.5">Email</label>
                          <input
                            type="email"
                            value={formDatos.email}
                            onChange={(e) => setFormDatos({ ...formDatos, email: e.target.value })}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-card-theme border border-theme text-xs text-main-theme focus:outline-none focus:border-accent-theme"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          disabled={guardandoDatos}
                          onClick={handleGuardarDatos}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                            isCyber ? 'bg-volt text-black hover:bg-volt/90' : 'bg-sport-orange text-white hover:opacity-90'
                          } disabled:opacity-50`}
                        >
                          {guardandoDatos ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                          Guardar Datos
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h4 className="font-extrabold text-base text-main-theme leading-snug">
                        {persona?.nombre} {persona?.apellidos}
                      </h4>

                      <div className="space-y-1 text-xs text-muted-theme">
                        <p className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-accent-theme shrink-0" />
                          <span>{persona?.telefono}</span>
                        </p>
                        {persona?.email && (
                          <p className="flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 text-accent-theme shrink-0" />
                            <span className="truncate">{persona.email}</span>
                          </p>
                        )}
                      </div>

                      {membresia && (
                        <div className="pt-2 border-t border-theme/60 flex items-center justify-between text-xs">
                          <span className="text-muted-theme">Plan Comercial:</span>
                          <span className="font-bold text-main-theme">{membresia.plan_nombre} (${membresia.plan_precio} MXN)</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Vigencia */}
              <FichaVigenciaCard
                nuevaFecha={nuevaFecha}
                setNuevaFecha={setNuevaFecha}
                guardandoVigencia={guardandoVigencia}
                handleGuardarVigencia={handleGuardarVigencia}
              />

              {/* Zonas & Puertas */}
              <FichaZonasList 
                niveles={niveles}
                nivelesSeleccionados={nivelesSeleccionados}
                toggleNivel={toggleNivel}
                esSocioConPlan={Boolean(persona?.tipo === 'SOCIO' && membresia?.id)}
                planNombre={membresia?.plan_nombre}
              />
            </>
          )}
        </div>

        {/* Pie de Modal */}
        <div className="p-4 border-t border-theme flex flex-col sm:flex-row items-center justify-between gap-3 bg-theme-subtle shrink-0">
          <div className="text-[11px] text-muted-theme flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-accent-theme" />
            <span>Sincronización directa vía OpenAPI V2.11</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold text-muted-theme hover:text-main-theme bg-card-theme border border-theme transition"
            >
              Cerrar
            </button>
            <button
              type="button"
              disabled={sincronizandoTeams || loading}
              onClick={handleForzarSincronizacion}
              className={`flex-1 sm:flex-none px-5 py-2 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-2 shadow-lg ${
                isCyber ? 'bg-volt text-black hover:bg-volt/90 shadow-volt/20' : 'bg-sport-orange text-white hover:opacity-90 shadow-sport-orange/20'
              } disabled:opacity-50`}
            >
              {sincronizandoTeams ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /><span>Inyectando a Hardware...</span></>
              ) : (
                <><Cpu className="w-4 h-4" /><span>🚀 Forzar Envío al Checador</span></>
              )}
            </button>
          </div>
        </div>
      </div>
      <WebcamModal isOpen={webcamOpen} onClose={() => setWebcamOpen(false)} onCapture={handleWebcamCapture} />
      {rawImageSrc && (
        <FaceCropperModal
          isOpen={showCropper}
          imageSrc={rawImageSrc}
          onClose={() => { setShowCropper(false); setRawImageSrc(null); }}
          onCropComplete={handleFotoCropped}
        />
      )}
    </div>
  );
};
