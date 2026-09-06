import React, { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Check, AlertCircle } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface FaceCropperModalProps {
  isOpen: boolean;
  imageSrc: string; // URL o base64
  onClose: () => void;
  onCropComplete: (croppedBase64: string) => void;
}

export const FaceCropperModal: React.FC<FaceCropperModalProps> = ({
  isOpen,
  imageSrc,
  onClose,
  onCropComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState<number>(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [rotation, setRotation] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const { theme } = useTheme();
  const isCyber = theme === 'cyber';

  // Dimensiones óptimas para carnet biométrico 3:4 de Hikvision
  const CANVAS_W = 360;
  const CANVAS_H = 480;
  const CROP_W = 300;
  const CROP_H = 400;
  const CROP_X = 30;
  const CROP_Y = 40;
  const CROP_R = 20;

  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;
    img.onload = () => {
      setImageObj(img);
      // Centrar y escalar automáticamente
      const initialScale = Math.max(CROP_W / img.width, CROP_H / img.height);
      setScale(initialScale * 1.15);
      setOffset({ x: CANVAS_W / 2, y: CANVAS_H / 2 });
      setRotation(0);
    };
  }, [imageSrc]);

  // Dibujar en canvas con máscara de silueta tipo carnet rectangular
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageObj) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // 1. Dibujar la imagen transformada
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale, scale);
    ctx.drawImage(imageObj, -imageObj.width / 2, -imageObj.height / 2);
    ctx.restore();

    // 2. Dibujar overlay oscuro semi-transparente
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // 3. Recortar la ventana rectangular tipo carnet con esquinas redondeadas
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(CROP_X, CROP_Y, CROP_W, CROP_H, CROP_R);
    } else {
      ctx.rect(CROP_X, CROP_Y, CROP_W, CROP_H);
    }
    ctx.fill();
    ctx.restore();

    // 4. Dibujar borde del carnet
    ctx.save();
    ctx.strokeStyle = isCyber ? 'rgba(0, 243, 255, 0.9)' : 'rgba(255, 107, 0, 0.9)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(CROP_X, CROP_Y, CROP_W, CROP_H, CROP_R);
    } else {
      ctx.rect(CROP_X, CROP_Y, CROP_W, CROP_H);
    }
    ctx.stroke();

    // 5. Dibujar silueta antropométrica guía dentro del carnet
    const centerX = CROP_X + CROP_W / 2;
    const headCenterY = CROP_Y + CROP_H * 0.42;
    const headRadiusX = CROP_W * 0.28;
    const headRadiusY = CROP_H * 0.28;

    ctx.strokeStyle = isCyber ? 'rgba(204, 255, 0, 0.6)' : 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);

    // Cabeza (óvalo)
    ctx.beginPath();
    ctx.ellipse(centerX, headCenterY, headRadiusX, headRadiusY, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Busto / Hombros (curva inferior)
    ctx.beginPath();
    ctx.ellipse(centerX, CROP_Y + CROP_H * 0.95, CROP_W * 0.48, CROP_H * 0.25, 0, Math.PI, 0);
    ctx.stroke();

    ctx.restore();
  }, [imageObj, scale, offset, rotation, isCyber]);

  // Arrastre con ratón o touch
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleZoom = (delta: number) => {
    setScale((prev) => Math.min(Math.max(prev + delta, 0.3), 4.0));
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleSaveCrop = () => {
    if (!imageObj) return;

    // Exportar exactamente el área de la credencial en 480x640 (aspect ratio 3:4)
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = 480;
    exportCanvas.height = 640;
    const expCtx = exportCanvas.getContext('2d');
    if (!expCtx) return;

    const ratio = 480 / CROP_W;
    expCtx.fillStyle = '#FFFFFF';
    expCtx.fillRect(0, 0, 480, 640);

    expCtx.save();
    expCtx.translate((offset.x - CROP_X) * ratio, (offset.y - CROP_Y) * ratio);
    expCtx.rotate((rotation * Math.PI) / 180);
    expCtx.scale(scale * ratio, scale * ratio);
    expCtx.drawImage(imageObj, -imageObj.width / 2, -imageObj.height / 2);
    expCtx.restore();

    // Exportar como JPEG base64 (calidad 0.92, estándar biométrico Hikvision)
    const base64 = exportCanvas.toDataURL('image/jpeg', 0.92);
    onCropComplete(base64);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-card-theme border border-theme rounded-2xl max-w-lg w-full flex flex-col overflow-hidden shadow-2xl">
        
        {/* Cabecera */}
        <div className="p-4 border-b border-theme flex items-center justify-between bg-theme-subtle">
          <div>
            <h3 className="font-bold text-sm text-main-theme flex items-center gap-2">
              Ajustar Fotografía Facial
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-theme border border-theme text-muted-theme font-mono">
                IA Biometría
              </span>
            </h3>
            <p className="text-[11px] text-muted-theme">
              Centra el rostro en la silueta para que el checador lo reconozca al instante.
            </p>
          </div>
          <button onClick={onClose} className="text-muted-theme hover:text-main-theme p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Área del Canvas con Silueta */}
        <div className="p-4 flex flex-col items-center bg-black/40 select-none">
          <div className="relative rounded-2xl overflow-hidden border-2 border-theme shadow-inner cursor-grab active:cursor-grabbing">
            <canvas
              ref={canvasRef}
              width={CANVAS_W}
              height={CANVAS_H}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="w-[300px] h-[400px] sm:w-[330px] sm:h-[440px] block"
            />
          </div>

          <p className="text-[10px] text-muted-theme mt-2 flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-cyan-400 shrink-0" />
            Arrastra la imagen con el ratón para encuadrar la cabeza en la guía.
          </p>
        </div>

        {/* Barra de Controles: Zoom y Rotación */}
        <div className="px-6 py-3 border-t border-theme bg-theme-subtle flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1 max-w-[240px]">
            <button
              onClick={() => handleZoom(-0.1)}
              className="p-1.5 rounded-lg text-muted-theme hover:text-main-theme hover:bg-theme transition"
              title="Reducir"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <input
              type="range"
              min="0.3"
              max="3.0"
              step="0.05"
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-theme rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />

            <button
              onClick={() => handleZoom(0.1)}
              className="p-1.5 rounded-lg text-muted-theme hover:text-main-theme hover:bg-theme transition"
              title="Aumentar"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleRotate}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-theme border border-theme text-muted-theme hover:text-main-theme transition"
            title="Rotar 90 grados"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Rotar</span>
          </button>
        </div>

        {/* Pie con Botones de Confirmación */}
        <div className="p-4 border-t border-theme flex items-center justify-end gap-2 bg-theme-subtle">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-muted-theme hover:bg-theme transition"
          >
            Cancelar
          </button>

          <button
            onClick={handleSaveCrop}
            className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold transition shadow-md ${
              isCyber
                ? 'bg-volt text-black shadow-volt-glow hover:opacity-90'
                : 'bg-sport-orange text-white shadow-orange-glow hover:opacity-90'
            }`}
          >
            <Check className="w-4 h-4" />
            <span>Guardar Recorte</span>
          </button>
        </div>

      </div>
    </div>
  );
};
