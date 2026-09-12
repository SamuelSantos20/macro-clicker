import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import type {
  Macro,
  ClickPoint,
  ClickButton,
  PlaybackStatus,
  Surface,
} from '../types';
import type { PlaybackEvent } from '../utils/playback';
import { fromClient } from '../utils/coordinates';
import { Recorder } from '../utils/recording';
import { soundManager } from '../utils/audio';
import { InteractiveSandbox } from './InteractiveSandbox';
import { ScreenCaptureView } from './ScreenCaptureView';
import { CustomImageView } from './CustomImageView';
import { MousePointer2, Crosshair } from 'lucide-react';
export interface CanvasHandle {
  fire: (event: PlaybackEvent) => void;
  cancel: () => void;
}
interface Props {
  macro: Macro;
  status: PlaybackStatus;
  step: number;
  onRecord: (point: ClickPoint, replaceId?: string) => void;
  onSurface: (surface: Surface) => void;
}
export const ClickCanvas = forwardRef<CanvasHandle, Props>(function ClickCanvas(
  { macro, status, step, onRecord, onSurface },
  ref,
) {
  const viewport = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  const [cursor, setCursor] = useState<{
    x: number;
    y: number;
    down: boolean;
  } | null>(null);
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);
  const held = useRef<{ element: HTMLElement; event: MouseEventInit } | null>(
    null,
  );
  const record = useRef(new Recorder());
  const pointer = useRef<{
    x: number;
    y: number;
    button: ClickButton;
    time: number;
  } | null>(null);
  const releases = useRef({ step: -1, loop: -1, count: 0 });
  useEffect(() => {
    const node = viewport.current!;
    const observer = new ResizeObserver((entries) =>
      setWidth(entries[0].contentRect.width),
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    pointer.current = null;
    if (status === 'recording') record.current.start(performance.now());
  }, [status]);
  const cancel = () => {
    if (held.current) {
      held.current.element.dispatchEvent(
        new MouseEvent('mouseup', { ...held.current.event, buttons: 0 }),
      );
      held.current = null;
    }
    setCursor(null);
  };
  useImperativeHandle(ref, () => ({
    cancel,
    fire(event) {
      const p = event.point;
      setCursor({ x: p.x, y: p.y, down: event.phase === 'down' });
      if (event.phase === 'up') soundManager.playClick();
      if (macro.surface.mode !== 'interactive-sandbox' || !stage.current)
        return;
      if (event.phase === 'down') {
        const rect = stage.current.getBoundingClientRect();
        const clientX = rect.left + (p.percentX / 100) * rect.width,
          clientY = rect.top + (p.percentY / 100) * rect.height;
        // Resolve inside the laboratory, even if the user scrolled the stage out of view.
        const target = Array.from(
          stage.current.querySelectorAll<HTMLElement>('button,[role="button"]'),
        ).find((element) => {
          const box = element.getBoundingClientRect();
          return (
            clientX >= box.left &&
            clientX <= box.right &&
            clientY >= box.top &&
            clientY <= box.bottom
          );
        });
        if (
          !target ||
          !stage.current.contains(target) ||
          target.closest('[data-ui]') ||
          target.hasAttribute('disabled')
        )
          return;
        const button = p.button === 'left' ? 0 : p.button === 'middle' ? 1 : 2;
        const init: MouseEventInit = {
          bubbles: true,
          cancelable: true,
          clientX,
          clientY,
          button,
          buttons: button === 0 ? 1 : button === 1 ? 4 : 2,
        };
        held.current = { element: target, event: init };
        target.dispatchEvent(new MouseEvent('mousedown', init));
      } else if (held.current) {
        const { element, event: init } = held.current;
        held.current = null;
        element.dispatchEvent(
          new MouseEvent('mouseup', { ...init, buttons: 0 }),
        );
        element.dispatchEvent(
          new MouseEvent(
            p.button === 'left'
              ? 'click'
              : p.button === 'right'
                ? 'contextmenu'
                : 'auxclick',
            { ...init, buttons: 0 },
          ),
        );
        if (p.clickType === 'double') {
          const previous = releases.current;
          const count =
            previous.step === event.step && previous.loop === event.loop
              ? previous.count + 1
              : 1;
          releases.current = { step: event.step, loop: event.loop, count };
          if (count % 2 === 0)
            element.dispatchEvent(
              new MouseEvent('dblclick', { ...init, buttons: 0, detail: 2 }),
            );
        }
      }
    },
  }));
  const scale = width / macro.surface.width;
  const locked = status !== 'idle';
  return (
    <div className="canvas-wrap">
      <div className="canvas-meta">
        <span>
          <span
            className={status === 'recording' ? 'record-dot' : 'live-dot'}
          />
          {status === 'recording'
            ? 'GRAVANDO AÇÕES'
            : macro.surface.mode === 'interactive-sandbox'
              ? 'LABORATÓRIO INTERATIVO'
              : 'SUPERFÍCIE DE REFERÊNCIA'}
        </span>
        <span>
          {macro.surface.width} × {macro.surface.height} px
        </span>
      </div>
      <div
        ref={viewport}
        className="stage-viewport"
        style={{ height: macro.surface.height * scale }}
      >
        <div
          ref={stage}
          id="click-recording-canvas-container"
          className={'stage ' + (status === 'recording' ? 'recording' : '')}
          style={{
            width: macro.surface.width,
            height: macro.surface.height,
            transform: 'scale(' + scale + ')',
          }}
          onContextMenu={(e) => {
            if (status === 'recording') e.preventDefault();
          }}
          onPointerMove={(e) => {
            const r = stage.current?.getBoundingClientRect();
            if (r)
              setCoords(fromClient(e.clientX, e.clientY, r, macro.surface));
          }}
          onPointerLeave={() => {
            setCoords(null);
            pointer.current = null;
          }}
          onPointerCancel={() => {
            pointer.current = null;
          }}
          onPointerDown={(e) => {
            if (
              status !== 'recording' ||
              !e.isPrimary ||
              (e.target as Element).closest('[data-ui]')
            )
              return;
            const r = stage.current!.getBoundingClientRect(),
              pos = fromClient(e.clientX, e.clientY, r, macro.surface);
            if (pos) {
              e.currentTarget.setPointerCapture(e.pointerId);
              pointer.current = {
                ...pos,
                button:
                  e.button === 2 ? 'right' : e.button === 1 ? 'middle' : 'left',
                time: performance.now(),
              };
            }
          }}
          onPointerUp={(e) => {
            if (e.currentTarget.hasPointerCapture(e.pointerId)) {
              e.currentTarget.releasePointerCapture(e.pointerId);
            }
            if (
              status !== 'recording' ||
              !pointer.current ||
              (e.target as Element).closest('[data-ui]')
            )
              return;
            const down = pointer.current;
            pointer.current = null;
            const captured = record.current.capture(
              down.x,
              down.y,
              down.button,
              down.time,
              performance.now(),
              macro.surface,
            );
            onRecord(captured.point, captured.replaceId);
          }}
        >
          {macro.surface.mode === 'interactive-sandbox' && (
            <InteractiveSandbox />
          )}
          {macro.surface.mode === 'screen-capture' && (
            <ScreenCaptureView
              disabled={locked}
              onResolutionChange={(w, h) =>
                onSurface({ ...macro.surface, width: w, height: h })
              }
            />
          )}
          {macro.surface.mode === 'custom-image' && (
            <CustomImageView
              disabled={locked}
              surface={macro.surface}
              onImageLoaded={(url, w, h) =>
                onSurface({
                  ...macro.surface,
                  imageUrl: url,
                  width: w,
                  height: h,
                })
              }
            />
          )}
          {macro.surface.mode === 'calibration-grid' && (
            <div className="calibration">
              <Crosshair size={32} />
              <strong>Plano de coordenadas</strong>
              <span>Grave os pontos ou adicione ações pela sequência.</span>
            </div>
          )}
          <svg
            className="trajectory"
            width={macro.surface.width}
            height={macro.surface.height}
            aria-hidden="true"
          >
            {macro.settings.showCursorTrail && (
              <polyline
                points={macro.points.map((p) => p.x + ',' + p.y).join(' ')}
                fill="none"
                stroke="#e88954"
                strokeWidth={1.5 / scale}
                strokeDasharray="5 5"
              />
            )}
          </svg>
          <div className="markers" aria-hidden="true">
            {macro.points.map((p, i) => (
              <span
                key={p.id}
                className={
                  'point-marker ' +
                  (step === i && status !== 'idle' ? 'active' : '')
                }
                style={{
                  left: p.x,
                  top: p.y,
                  transform:
                    'translate(-50%,-50%) scale(' +
                    1 / Math.max(scale, 0.65) +
                    ')',
                }}
              >
                {i + 1}
              </span>
            ))}
          </div>
          {cursor && (
            <div
              className="virtual-cursor"
              style={{ left: cursor.x, top: cursor.y }}
            >
              {macro.settings.showRipples && cursor.down && (
                <span className="click-ring" />
              )}
              <MousePointer2 size={24} />
            </div>
          )}
        </div>
      </div>
      <div className="coordinate-bar">
        <span>COORDENADAS DA REFERÊNCIA</span>
        <span>
          X <b>{coords ? Math.round(coords.x) : '—'}</b>
          <span className="divider" />Y{' '}
          <b>{coords ? Math.round(coords.y) : '—'}</b>
        </span>
        <span>{macro.points.length} ações mapeadas</span>
      </div>
    </div>
  );
});
