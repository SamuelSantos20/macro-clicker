export type ClickButton = 'left' | 'right' | 'middle';
export type ClickType = 'single' | 'double' | 'press';

export interface ClickPoint {
  id: string;
  x: number; // pixel X relative to canvas
  y: number; // pixel Y relative to canvas
  percentX: number; // 0 to 100%
  percentY: number; // 0 to 100%
  timestamp: number; // record timestamp
  delayMs: number; // delay from prior click in ms
  button: ClickButton;
  clickType: ClickType;
  label?: string;
  note?: string;
}

export interface Macro {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  points: ClickPoint[];
  defaultLoops: number;
  defaultSpeed: number;
  canvasWidth: number;
  canvasHeight: number;
  tags: string[];
}

export type PlaybackStatus = 'idle' | 'recording' | 'playing' | 'paused';

export interface PlaybackState {
  status: PlaybackStatus;
  currentLoop: number;
  totalLoops: number; // 0 means infinite
  currentStepIndex: number;
  speed: number;
  totalClicksDone: number;
  currentCursorPos: { x: number; y: number } | null;
  elapsedMs: number;
}

export type CanvasMode = 'interactive-sandbox' | 'screen-capture' | 'custom-image' | 'calibration-grid';

export interface MacroAnalysis {
  totalClicks: number;
  totalCycleTimeMs: number;
  averageDelayMs: number;
  minDelayMs: number;
  maxDelayMs: number;
  estimatedCps: number;
  boundingBox: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    width: number;
    height: number;
  };
  patternType: 'sequencial' | 'ritmico' | 'rapido' | 'disperso';
  tips: string[];
}

export interface PlaybackSettings {
  loops: number; // 0 = infinite, or 1, 5, 10, etc.
  speed: number; // 0.5, 1, 2, 5, etc.
  timingMode: 'recorded' | 'fixed';
  fixedDelayMs: number;
  humanizeJitterPx: number; // random pixel offset (+/- px)
  humanizeDelayMs: number; // random delay variance (+/- ms)
  soundEnabled: boolean;
  showCursorTrail: boolean;
  showRipples: boolean;
}
