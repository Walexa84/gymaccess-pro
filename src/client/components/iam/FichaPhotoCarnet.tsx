import React from 'react';
import { Camera, RefreshCw, Upload } from 'lucide-react';

interface FichaPhotoCarnetProps {
  fotoUrl?: string | null;
  subiendoFoto: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenWebcam: () => void;
}

export const FichaPhotoCarnet: React.FC<FichaPhotoCarnetProps> = ({
  fotoUrl,
  subiendoFoto,
  fileInputRef,
  onFileSelect,
  onOpenWebcam,
}) => {
  return (
    <div className="relative group shrink-0 self-center sm:self-start">
      <div className="w-28 h-36 rounded-xl overflow-hidden bg-black/40 border-2 border-theme relative flex items-center justify-center shadow-md">
        {fotoUrl ? (
          <img src={fotoUrl} alt="Carnet" className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-muted-theme p-2 text-center">
            <Camera className="w-8 h-8 opacity-40" />
            <span className="text-[10px]">Sin fotografía</span>
          </div>
        )}
        {subiendoFoto && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
            <RefreshCw className="w-5 h-5 text-accent-theme animate-spin" />
          </div>
        )}
      </div>
      <input
        type="file"
        ref={fileInputRef as any}
        accept="image/*"
        className="hidden"
        onChange={onFileSelect}
      />
      <div className="flex items-center gap-1.5 mt-2 w-full">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 py-1 px-1.5 rounded-lg text-[11px] font-bold bg-theme-subtle hover:bg-accent-theme hover:text-black border border-theme transition flex items-center justify-center gap-1 text-main-theme shadow-sm"
          title="Cargar fotografía desde la PC (JPG/PNG)"
        >
          <Upload className="w-3 h-3" /> Subir PC
        </button>
        <button
          type="button"
          onClick={onOpenWebcam}
          className="py-1 px-1.5 rounded-lg text-[11px] font-bold bg-theme-subtle hover:bg-accent-theme hover:text-black border border-theme transition flex items-center justify-center gap-1 text-main-theme shadow-sm"
          title="Tomar fotografía con cámara web"
        >
          <Camera className="w-3 h-3" /> Webcam
        </button>
      </div>
    </div>
  );
};
