import { useRef, useEffect, useState } from 'react';
import { Monitor, VideoOff, RefreshCw, AlertCircle } from 'lucide-react';

interface ScreenCaptureViewProps {
  onResolutionChange?: (width: number, height: number) => void;
}

export function ScreenCaptureView({ onResolutionChange }: ScreenCaptureViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [streamResolution, setStreamResolution] = useState<{ width: number; height: number } | null>(null);

  const startCapture = async () => {
    setErrorMsg(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        throw new Error('Seu navegador não suporta a API de captura de tela nesta visualização.');
      }
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor',
        },
        audio: false,
      });

      setStream(mediaStream);
      setIsCapturing(true);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      const track = mediaStream.getVideoTracks()[0];
      if (track) {
        const settings = track.getSettings();
        if (settings.width && settings.height) {
          setStreamResolution({ width: settings.width, height: settings.height });
          onResolutionChange?.(settings.width, settings.height);
        }

        track.onended = () => {
          stopCapture();
        };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao capturar tela.';
      setErrorMsg(msg);
      setIsCapturing(false);
    }
  };

  const stopCapture = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setStream(null);
    setIsCapturing(false);
    setStreamResolution(null);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  return (
    <div id="screen-capture-view" className="relative w-full h-full min-h-[460px] bg-slate-950 flex flex-col items-center justify-center rounded-xl overflow-hidden border border-slate-800">
      {isCapturing ? (
        <div className="relative w-full h-full flex flex-col">
          {/* Top Bar for active capture */}
          <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between px-3 py-1.5 bg-slate-900/90 backdrop-blur rounded-lg border border-slate-800 text-xs shadow-md">
            <div className="flex items-center gap-2 text-emerald-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Transmissão Ativa</span>
              {streamResolution && (
                <span className="text-slate-400 text-[11px]">
                  ({streamResolution.width}x{streamResolution.height})
                </span>
              )}
            </div>

            <button
              id="btn-stop-screen-capture"
              type="button"
              onClick={stopCapture}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-rose-950/80 hover:bg-rose-900 border border-rose-800/80 text-rose-300 text-xs font-semibold cursor-pointer transition"
            >
              <VideoOff className="w-3.5 h-3.5" />
              Parar Captura
            </button>
          </div>

          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-contain pointer-events-none"
          />
        </div>
      ) : (
        <div className="text-center p-8 max-w-md flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-950/70 border border-indigo-800/60 flex items-center justify-center text-indigo-400 mb-4 shadow-lg">
            <Monitor className="w-8 h-8" />
          </div>

          <h3 className="text-base font-bold text-slate-100 mb-1">
            Espelhamento de Tela ao Vivo
          </h3>
          <p className="text-xs text-slate-400 mb-5 leading-relaxed">
            Transmita uma janela, monitor ou aba do navegador para ver exatamente onde os cliques devem acontecer em seu aplicativo real.
          </p>

          {errorMsg && (
            <div className="w-full mb-4 p-3 rounded-lg bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-2 text-left">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            id="btn-start-screen-capture"
            type="button"
            onClick={startCapture}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Selecionar Tela ou Janela
          </button>
        </div>
      )}
    </div>
  );
}
