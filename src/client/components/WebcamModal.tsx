import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, Check, X } from 'lucide-react';

interface WebcamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (base64Image: string) => void;
}

export const WebcamModal: React.FC<WebcamModalProps> = ({ isOpen, onClose, onCapture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCapturedImage(null);
      setError(null);
      navigator.mediaDevices
        .getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } })
        .then((s) => {
          setStream(s);
          if (videoRef.current) {
            videoRef.current.srcObject = s;
          }
        })
        .catch((err) => {
          console.error('Error accediendo a la webcam:', err);
          setError('No se pudo acceder a la cámara web. Conéctela y otorgue permisos.');
        });
    } else {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
    }
  }, [isOpen]);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedImage(dataUrl);
    }
  };

  const handleConfirm = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Camera className="w-5 h-5 text-blue-400" />
            Captura Facial para Reconocimiento Biométrico
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 flex flex-col items-center">
          {error ? (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm text-center">
              {error}
            </div>
          ) : capturedImage ? (
            <div className="relative rounded-xl overflow-hidden border-2 border-emerald-500 shadow-md">
              <img src={capturedImage} alt="Foto capturada" className="w-full max-h-72 object-cover" />
            </div>
          ) : (
            <div className="relative rounded-xl overflow-hidden bg-black border border-slate-700 w-full aspect-video flex items-center justify-center">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <div className="absolute inset-0 border-2 border-dashed border-blue-400/40 pointer-events-none rounded-xl m-8 flex items-center justify-center">
                <span className="text-xs bg-slate-900/80 px-2 py-1 rounded text-slate-300">Centre el rostro aquí</span>
              </div>
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />

          <div className="flex items-center gap-3 mt-4 w-full justify-end">
            {capturedImage ? (
              <>
                <button
                  type="button"
                  onClick={() => setCapturedImage(null)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm"
                >
                  <RefreshCw className="w-4 h-4" /> Tomar otra
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg text-sm shadow-md"
                >
                  <Check className="w-4 h-4" /> Usar esta foto
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleCapture}
                disabled={!!error}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium rounded-lg text-sm shadow-lg shadow-blue-500/20 w-full justify-center"
              >
                <Camera className="w-4 h-4" /> Capturar Foto
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
