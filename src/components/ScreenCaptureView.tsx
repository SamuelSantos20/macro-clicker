import { useEffect, useRef, useState } from 'react';
import { Monitor, Square } from 'lucide-react';
import { errorMessage } from '../utils/model';
interface Props {
  disabled: boolean;
  onResolutionChange: (width: number, height: number) => void;
}
export function ScreenCaptureView({ disabled, onResolutionChange }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const active = useRef<MediaStream | null>(null);
  const generation = useRef(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const stop = () => {
    generation.current++;
    active.current?.getTracks().forEach((t) => t.stop());
    active.current = null;
    setStream(null);
    setPending(false);
  };
  useEffect(
    () => () => {
      generation.current++;
      active.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );
  useEffect(() => {
    const element = video.current;
    if (element) {
      element.srcObject = stream;
      if (stream)
        void element
          .play()
          .catch(() =>
            setError(
              'Não foi possível iniciar o vídeo. Selecione a tela novamente.',
            ),
          );
    }
    return () => {
      if (element) element.srcObject = null;
    };
  }, [stream]);
  const start = async () => {
    const request = ++generation.current;
    setPending(true);
    setError('');
    try {
      if (!navigator.mediaDevices?.getDisplayMedia)
        throw new Error(
          'Captura indisponível neste navegador. Use uma imagem de referência.',
        );
      const next = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      if (request !== generation.current) {
        next.getTracks().forEach((t) => t.stop());
        return;
      }
      active.current?.getTracks().forEach((t) => t.stop());
      active.current = next;
      next.getVideoTracks()[0].addEventListener('ended', () => {
        if (active.current === next) stop();
      });
      setStream(next);
    } catch (error) {
      if (request === generation.current) setError(errorMessage(error));
    } finally {
      if (request === generation.current) setPending(false);
    }
  };
  return (
    <div className="reference-view">
      <video
        ref={video}
        autoPlay
        muted
        playsInline
        className={stream ? 'reference-video' : 'reference-video hidden'}
        onLoadedMetadata={() => {
          if (video.current?.videoWidth)
            onResolutionChange(
              video.current.videoWidth,
              video.current.videoHeight,
            );
        }}
      />
      {!stream && (
        <div className="reference-empty" data-ui="true">
          <Monitor size={36} />
          <h3>Uma referência ao vivo</h3>
          <p>
            Selecione um monitor ou uma janela para mapear as ações.
            <br />A reprodução aqui é uma prévia; use Exportar para executar no
            computador.
          </p>
          <button
            className="primary"
            disabled={disabled || pending}
            onClick={() => void start()}
          >
            {pending ? 'Aguardando seleção…' : 'Selecionar tela ou janela'}
          </button>
          {error && (
            <p role="alert" className="error-text">
              {error}
            </p>
          )}
        </div>
      )}
      {stream && (
        <button
          data-ui="true"
          className="capture-stop"
          disabled={disabled}
          onClick={stop}
        >
          <Square size={12} /> Encerrar transmissão
        </button>
      )}
    </div>
  );
}
