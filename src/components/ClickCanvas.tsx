import { useRef, useState, useEffect, useCallback, type MouseEvent } from 'react';
import { ClickPoint, CanvasMode, PlaybackStatus } from '../types';
import { InteractiveSandbox } from './InteractiveSandbox';
import { ScreenCaptureView } from './ScreenCaptureView';
import { CustomImageView } from './CustomImageView';
import { soundManager } from '../utils/audio';
import { MousePointer2, Move, Trash2 } from 'lucide-react';

interface ClickCanvasProps {
  mode: CanvasMode;
  points: ClickPoint[];
  playbackStatus: PlaybackStatus;
  currentStepIndex: number;
  onPointAdd: (point: ClickPoint) => void;
  onPointDelete: (id: string) => void;
  showTrajectory: boolean;
  virtualCursorPos: { x: number; y: number } | null;
  virtualCursorClicking: boolean;
}

interface Ripple {
  id: number;
  x: number;
  y: number;
  color?: string;
}

export function ClickCanvas({
  mode,
  points,
  playbackStatus,
  currentStepIndex,
  onPointAdd,
  onPointDelete,
  showTrajectory,
  virtualCursorPos,
  virtualCursorClicking,
}: ClickCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverCoords, setHoverCoords] = useState<{ x: number; y: number; pctX: number; pctY: number } | null>(null);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const lastClickTimeRef = useRef<number>(Date.now());

  const addRipple = useCallback((x: number, y: number, color?: string) => {
    const id = Date.now() + Math.random();
    setRipples(prev => [...prev.slice(-12), { id, x, y, color }]);
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== id));
    }, 600);
  }, []);

  // When virtual cursor clicks during playback
  useEffect(() => {
    if (virtualCursorClicking && virtualCursorPos) {
      addRipple(virtualCursorPos.x, virtualCursorPos.y, '#38bdf8');
      soundManager.playClick('down');

      // Dispatch physical click to sandbox element if inside container
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const clientX = rect.left + virtualCursorPos.x;
        const clientY = rect.top + virtualCursorPos.y;
        const elem = document.elementFromPoint(clientX, clientY) as HTMLElement;
        if (elem && (elem.tagName === 'BUTTON' || elem.onclick || elem.getAttribute('role') === 'button')) {
          elem.click();
        }
      }
    }
  }, [virtualCursorClicking, virtualCursorPos, addRipple]);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);
    const pctX = Number(((x / rect.width) * 100).toFixed(1));
    const pctY = Number(((y / rect.height) * 100).toFixed(1));
    setHoverCoords({ x, y, pctX, pctY });
  };

  const handleMouseLeave = () => {
    setHoverCoords(null);
  };

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    if (playbackStatus !== 'recording' || !containerRef.current) return;

    // Avoid recording clicks on the delete buttons inside marker badges
    const target = e.target as HTMLElement;
    if (target.closest('.point-badge-action')) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);
    const pctX = Number(((x / rect.width) * 100).toFixed(2));
    const pctY = Number(((y / rect.height) * 100).toFixed(2));

    const now = Date.now();
    const delayMs = points.length === 0 ? 500 : Math.max(20, now - lastClickTimeRef.current);
    lastClickTimeRef.current = now;

    soundManager.playClick('subtle');
    addRipple(x, y, '#10b981');

    const buttonType = e.button === 2 ? 'right' : e.button === 1 ? 'middle' : 'left';

    const newPoint: ClickPoint = {
      id: `pt_${now}_${Math.random().toString(36).slice(2, 6)}`,
      x,
      y,
      percentX: pctX,
      percentY: pctY,
      timestamp: now,
      delayMs,
      button: buttonType,
      clickType: 'single',
      label: `Ponto #${points.length + 1}`
    };

    onPointAdd(newPoint);
  };

  return (
    <div
      id="click-recording-canvas-container"
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      onContextMenu={(e) => {
        if (playbackStatus === 'recording') {
          e.preventDefault();
          handleClick(e);
        }
      }}
      className={`relative w-full h-[520px] rounded-2xl overflow-hidden select-none border transition-all ${
        playbackStatus === 'recording'
          ? 'ring-2 ring-emerald-500 border-emerald-500/80 cursor-crosshair'
          : playbackStatus === 'playing'
          ? 'ring-2 ring-sky-500 border-sky-500/80 cursor-default'
          : 'border-slate-800 bg-slate-950'
      }`}
    >
      {/* Background Stage Component */}
      <div className="absolute inset-0 w-full h-full pointer-events-auto">
        {mode === 'interactive-sandbox' && <InteractiveSandbox />}
        {mode === 'screen-capture' && <ScreenCaptureView />}
        {mode === 'custom-image' && <CustomImageView />}
        {mode === 'calibration-grid' && (
          <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center relative">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:40px_40px] opacity-70" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#334155_1px,transparent_1px),linear-gradient(to_bottom,#334155_1px,transparent_1px)] bg-[size:200px_200px] opacity-80" />
            <div className="relative z-10 text-center pointer-events-none">
              <span className="text-xs font-mono uppercase tracking-widest text-slate-500 bg-slate-900/90 px-3 py-1 rounded border border-slate-800">
                Grade de Calibração Absoluta
              </span>
              <p className="text-xs text-slate-400 mt-2 font-mono">
                {hoverCoords ? `X: ${hoverCoords.x}px | Y: ${hoverCoords.y}px (${hoverCoords.pctX}%, ${hoverCoords.pctY}%)` : 'Mova o cursor para calibrar'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* SVG Connecting Trajectory lines */}
      {showTrajectory && points.length > 0 && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
          <defs>
            <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.8" />
            </linearGradient>
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 8 5 L 0 9 z" fill="#38bdf8" />
            </marker>
          </defs>

          {points.length > 1 && (
            <path
              d={points.reduce((acc, curr, idx) => {
                return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
              }, '')}
              fill="none"
              stroke="url(#lineGrad)"
              strokeWidth="2.5"
              strokeDasharray="5 4"
              markerEnd="url(#arrow)"
              className="opacity-80"
            />
          )}
        </svg>
      )}

      {/* Point Badges / Markers */}
      <div className="absolute inset-0 pointer-events-none z-25">
        {points.map((point, index) => {
          const isCurrentStep = playbackStatus === 'playing' && currentStepIndex === index;
          return (
            <div
              key={point.id}
              style={{ left: `${point.x}px`, top: `${point.y}px` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 group pointer-events-auto"
            >
              {/* Outer pulsing ring if current playback step */}
              {isCurrentStep && (
                <span className="absolute -inset-2 rounded-full bg-sky-400/40 animate-ping pointer-events-none" />
              )}

              {/* Point Circle Badge */}
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs font-black shadow-lg transition-transform ${
                  isCurrentStep
                    ? 'bg-sky-400 text-slate-950 scale-125 ring-4 ring-sky-300/40'
                    : 'bg-slate-900 border-2 border-emerald-400 text-emerald-300 hover:scale-110'
                }`}
              >
                {index + 1}
              </div>

              {/* Tooltip on hover */}
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:flex flex-col items-center bg-slate-900/95 text-slate-100 border border-slate-700 px-2.5 py-1.5 rounded-lg shadow-2xl text-[11px] whitespace-nowrap z-50 pointer-events-auto">
                <span className="font-bold text-emerald-400">{point.label || `Ponto #${index + 1}`}</span>
                <span className="text-slate-300 font-mono">
                  ({point.x}px, {point.y}px) • {point.delayMs}ms
                </span>
                <div className="flex items-center gap-1.5 mt-1 pt-1 border-t border-slate-800 w-full justify-between">
                  <span className="text-[10px] uppercase text-slate-400 font-semibold">{point.button} click</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPointDelete(point.id);
                    }}
                    className="point-badge-action text-rose-400 hover:text-rose-200 text-[10px] flex items-center gap-0.5 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" /> Excluir
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Click Ripples */}
      {ripples.map(r => (
        <span
          key={r.id}
          style={{
            left: `${r.x}px`,
            top: `${r.y}px`,
            borderColor: r.color || '#10b981',
          }}
          className="absolute -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full border-2 animate-ping pointer-events-none z-30"
        />
      ))}

      {/* Virtual Mouse Cursor during playback */}
      {playbackStatus === 'playing' && virtualCursorPos && (
        <div
          style={{
            left: `${virtualCursorPos.x}px`,
            top: `${virtualCursorPos.y}px`,
            transition: 'left 0.12s ease-out, top 0.12s ease-out',
          }}
          className="absolute -translate-x-1 -translate-y-1 pointer-events-none z-40 drop-shadow-xl"
        >
          <MousePointer2 className="w-6 h-6 text-sky-400 fill-sky-400" />
          <span className="absolute left-5 top-2 bg-slate-900/90 text-sky-300 text-[10px] font-mono px-1.5 py-0.5 rounded border border-sky-600/50 shadow">
            Passo #{currentStepIndex + 1}
          </span>
        </div>
      )}

      {/* Recording Overlay Indicator */}
      {playbackStatus === 'recording' && (
        <div className="absolute top-4 left-4 z-30 flex items-center gap-2 bg-rose-950/80 backdrop-blur border border-rose-600/60 px-3 py-1.5 rounded-full shadow-lg">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
          <span className="text-xs font-bold text-rose-200 uppercase tracking-wider">
            Gravando Cliques ({points.length} capturados)
          </span>
        </div>
      )}

      {/* Hover Live Crosshair Info Bar */}
      <div className="absolute bottom-3 right-3 z-30 flex items-center gap-3 bg-slate-900/85 backdrop-blur px-3 py-1 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-300 shadow">
        <div className="flex items-center gap-1.5">
          <Move className="w-3.5 h-3.5 text-slate-500" />
          <span>X: <strong className="text-slate-100">{hoverCoords ? hoverCoords.x : 0}</strong>px</span>
          <span className="text-slate-600">|</span>
          <span>Y: <strong className="text-slate-100">{hoverCoords ? hoverCoords.y : 0}</strong>px</span>
        </div>
        {hoverCoords && (
          <span className="text-slate-400">
            ({hoverCoords.pctX}%, {hoverCoords.pctY}%)
          </span>
        )}
      </div>
    </div>
  );
}
