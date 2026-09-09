import { useState, useRef, type DragEvent } from 'react';
import { Image as ImageIcon, Upload, X } from 'lucide-react';

interface CustomImageViewProps {
  onImageLoaded?: (url: string, width: number, height: number) => void;
}

export function CustomImageView({ onImageLoaded }: CustomImageViewProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      setImageUrl(url);
      const img = new Image();
      img.onload = () => {
        onImageLoaded?.(url, img.naturalWidth, img.naturalHeight);
      };
      img.src = url;
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div id="custom-image-view" className="relative w-full h-full min-h-[460px] bg-slate-950 flex flex-col items-center justify-center rounded-xl overflow-hidden border border-slate-800">
      {imageUrl ? (
        <div className="relative w-full h-full flex items-center justify-center bg-slate-950">
          <button
            id="btn-remove-custom-image"
            type="button"
            onClick={() => setImageUrl(null)}
            className="absolute top-3 right-3 z-20 p-2 rounded-lg bg-slate-900/90 hover:bg-rose-950/80 border border-slate-700 hover:border-rose-700 text-slate-300 hover:text-rose-300 text-xs transition cursor-pointer"
            title="Remover Imagem"
          >
            <X className="w-4 h-4" />
          </button>
          <img
            src={imageUrl}
            alt="Print de referência"
            className="max-w-full max-h-full object-contain pointer-events-none select-none"
          />
        </div>
      ) : (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="w-full h-full p-8 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 hover:border-indigo-500/60 rounded-xl transition cursor-pointer text-center bg-slate-900/30"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFile(e.target.files[0]);
              }
            }}
          />
          <div className="w-16 h-16 rounded-2xl bg-indigo-950/60 border border-indigo-800/50 flex items-center justify-center text-indigo-400 mb-3 shadow-inner">
            <Upload className="w-8 h-8" />
          </div>
          <h3 className="text-sm font-bold text-slate-100 mb-1">
            Carregar Print ou Captura do Jogo/App
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mb-4">
            Arraste um screenshot ou clique para selecionar. Use a imagem como guia para posicionar os cliques exatos.
          </p>
          <span className="text-[11px] px-3 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700 font-medium flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
            Suporta PNG, JPG, WebP
          </span>
        </div>
      )}
    </div>
  );
}
