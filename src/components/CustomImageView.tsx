import { useEffect, useRef, useState } from 'react';
import { Upload, Image as ImageIcon } from 'lucide-react';
import type { Surface } from '../types';
import { errorMessage } from '../utils/model';
interface Props {
  surface: Surface;
  disabled: boolean;
  onImageLoaded: (url: string, width: number, height: number) => void;
}
export function CustomImageView({ surface, disabled, onImageLoaded }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const generation = useRef(0);
  const locked = useRef(disabled);
  locked.current = disabled;
  useEffect(
    () => () => {
      generation.current++;
    },
    [],
  );
  const [error, setError] = useState('');
  const load = async (file: File) => {
    if (disabled) return;
    const request = ++generation.current;
    setError('');
    try {
      if (
        !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
        file.size > 2_000_000
      )
        throw new Error('Use PNG, JPEG ou WebP de até 2 MB.');
      const url = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(new Error('Falha na leitura da imagem.'));
        r.readAsDataURL(file);
      });
      const img = new Image();
      img.src = url;
      await img.decode();
      if (request !== generation.current || locked.current) return;
      if (img.naturalWidth > 16384 || img.naturalHeight > 16384)
        throw new Error('A imagem excede 16384 pixels.');
      onImageLoaded(url, img.naturalWidth, img.naturalHeight);
    } catch (error) {
      setError(errorMessage(error));
    }
  };
  return (
    <div
      className="reference-view"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const f = e.dataTransfer.files[0];
        if (f) void load(f);
      }}
    >
      {surface.imageUrl ? (
        <>
          <img
            className="reference-image"
            src={surface.imageUrl}
            alt="Referência da sequência"
          />
          <button
            className="capture-stop"
            data-ui="true"
            disabled={disabled}
            onClick={() => input.current?.click()}
          >
            Substituir imagem
          </button>
        </>
      ) : (
        <div className="reference-empty" data-ui="true">
          <ImageIcon size={36} />
          <h3>Mapeie sobre uma imagem</h3>
          <p>
            Arraste uma captura ou selecione um arquivo.
            <br />A proporção original será preservada.
          </p>
          <button
            className="primary"
            disabled={disabled}
            onClick={() => input.current?.click()}
          >
            <Upload size={15} /> Escolher imagem
          </button>
        </div>
      )}
      <input
        ref={input}
        type="file"
        aria-label="Imagem de referência"
        accept="image/png,image/jpeg,image/webp"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void load(f);
          e.target.value = '';
        }}
      />
      {error && (
        <p className="reference-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
