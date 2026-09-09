import { Circle, Play, Pause, Square } from 'lucide-react';
import type { PlaybackStatus } from '../types';
interface Props {
  status: PlaybackStatus;
  count: number;
  onRecord: () => void;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
}
export function PlaybackControls({
  status,
  count,
  onRecord,
  onPlay,
  onPause,
  onStop,
}: Props) {
  return (
    <div className="transport">
      <div className="transport-actions">
        <button
          id="btn-start-record"
          className={status === 'recording' ? 'danger' : 'record-button'}
          disabled={status === 'playing' || status === 'paused'}
          onClick={status === 'recording' ? onStop : onRecord}
        >
          <Circle size={13} fill="currentColor" />
          {status === 'recording' ? 'Concluir gravação' : 'Gravar ações'}
          <kbd>R</kbd>
        </button>
        <button
          id="btn-play-macro"
          className="primary"
          disabled={!count || status === 'recording'}
          onClick={status === 'playing' ? onPause : onPlay}
        >
          {status === 'playing' ? <Pause size={15} /> : <Play size={15} />}{' '}
          {status === 'playing'
            ? 'Pausar'
            : status === 'paused'
              ? 'Retomar'
              : 'Executar prévia'}
        </button>
        <button
          className="icon-button"
          aria-label="Parar execução"
          disabled={status === 'idle'}
          onClick={onStop}
        >
          <Square size={15} />
        </button>
      </div>
      <span className="transport-note">
        Gravar acrescenta ações à sequência.
      </span>
    </div>
  );
}
