import { useEffect, useRef, useState, useCallback } from 'react';
import type { Macro, PlaybackStatus } from '../types';
import { PlaybackEngine, type PlaybackEvent } from '../utils/playback';
export function usePlayback(
  onEvent: (event: PlaybackEvent) => void,
  onCancel: () => void,
) {
  const eventRef = useRef(onEvent);
  eventRef.current = onEvent;
  const cancelRef = useRef(onCancel);
  cancelRef.current = onCancel;
  const [status, setStatus] = useState<PlaybackStatus>('idle');
  const [progress, setProgress] = useState({ step: -1, loop: 1, clicks: 0 });
  const engine = useRef<PlaybackEngine | null>(null);
  if (!engine.current)
    engine.current = new PlaybackEngine(
      (event) => {
        setProgress((p) => ({
          step: event.step,
          loop: event.loop,
          clicks: p.clicks + (event.phase === 'up' ? 1 : 0),
        }));
        eventRef.current(event);
      },
      () => {
        setStatus('idle');
        cancelRef.current();
      },
    );
  const stop = useCallback(() => {
    engine.current!.stop();
    cancelRef.current();
    setStatus('idle');
  }, []);
  useEffect(
    () => () => {
      engine.current?.stop();
      cancelRef.current();
    },
    [],
  );
  return {
    status,
    progress,
    stop,
    play: (macro: Macro) => {
      if (status === 'paused') engine.current!.resume();
      else {
        setProgress({ step: -1, loop: 1, clicks: 0 });
        engine.current!.start(macro);
      }
      setStatus('playing');
    },
    pause: () => {
      engine.current!.pause();
      cancelRef.current();
      setStatus('paused');
    },
    record: () => {
      stop();
      setProgress({ step: -1, loop: 1, clicks: 0 });
      setStatus('recording');
    },
  };
}
