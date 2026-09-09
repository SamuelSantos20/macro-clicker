export type ClickButton = 'left' | 'right' | 'middle';
export type ClickType = 'single' | 'double' | 'press';
export type CanvasMode =
  | 'interactive-sandbox'
  | 'screen-capture'
  | 'custom-image'
  | 'calibration-grid';
export type PlaybackStatus = 'idle' | 'recording' | 'playing' | 'paused';
export interface ClickPoint {
  id: string;
  x: number;
  y: number;
  percentX: number;
  percentY: number;
  timestamp: number;
  delayMs: number;
  button: ClickButton;
  clickType: ClickType;
  holdMs: number;
  label: string;
  note?: string;
}
export interface PlaybackSettings {
  loops: number;
  speed: number;
  timingMode: 'recorded' | 'fixed';
  fixedDelayMs: number;
  humanizeJitterPx: number;
  humanizeDelayMs: number;
  soundEnabled: boolean;
  showCursorTrail: boolean;
  showRipples: boolean;
}
export interface Surface {
  mode: CanvasMode;
  width: number;
  height: number;
  imageUrl?: string;
}
export interface TargetRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  confirmed: boolean;
}
export interface Macro {
  schemaVersion: 2;
  id: string;
  name: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  points: ClickPoint[];
  settings: PlaybackSettings;
  surface: Surface;
  target: TargetRegion;
}
