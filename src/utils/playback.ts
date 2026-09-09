import type { ClickPoint, Macro, PlaybackSettings } from '../types';
import { parseMacro } from './model';
export interface Clock {
  now(): number;
  set(callback: () => void, delay: number): unknown;
  clear(timer: unknown): void;
}
const clock: Clock = {
  now: () => performance.now(),
  set: (fn, ms) => setTimeout(fn, ms),
  clear: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
};
export const DOUBLE_INTERVAL = 80;
export function actionDuration(point: ClickPoint) {
  return point.clickType === 'press'
    ? point.holdMs
    : point.clickType === 'double'
      ? DOUBLE_INTERVAL
      : 0;
}
export function waitDuration(
  point: ClickPoint,
  settings: PlaybackSettings,
  random = Math.random,
) {
  const base =
    settings.timingMode === 'fixed' ? settings.fixedDelayMs : point.delayMs;
  const variance =
    Math.floor(random() * (settings.humanizeDelayMs * 2 + 1)) -
    settings.humanizeDelayMs;
  return Math.max(20, Math.round((base + variance) / settings.speed));
}
export interface PlaybackEvent {
  point: ClickPoint;
  phase: 'down' | 'up';
  step: number;
  loop: number;
}
interface Action {
  after: number;
  event: PlaybackEvent;
}
export class PlaybackEngine {
  private timer: unknown = null;
  private due = 0;
  private remaining = 0;
  private actions: Action[] = [];
  private cursor = 0;
  private loop = 1;
  private running = false;
  private snapshot: Macro | null = null;
  private held: PlaybackEvent | null = null;
  private rehold: PlaybackEvent | null = null;
  constructor(
    private emit: (event: PlaybackEvent) => void,
    private done: () => void,
    private time: Clock = clock,
    private random = Math.random,
  ) {}
  start(input: Macro) {
    this.stop();
    this.snapshot = parseMacro(input);
    if (!this.snapshot.points.length) {
      this.done();
      return;
    }
    this.loop = 1;
    this.running = true;
    this.planCycle();
    this.schedule(this.actions[0].after);
  }
  private planCycle() {
    const macro = this.snapshot!;
    this.actions = macro.points.flatMap((original, step): Action[] => {
      const jitter = () =>
        Math.floor(this.random() * (macro.settings.humanizeJitterPx * 2 + 1)) -
        macro.settings.humanizeJitterPx;
      const x = Math.max(
        0,
        Math.min(macro.surface.width - 1, original.x + jitter()),
      );
      const y = Math.max(
        0,
        Math.min(macro.surface.height - 1, original.y + jitter()),
      );
      const point = {
        ...original,
        x,
        y,
        percentX: (x / macro.surface.width) * 100,
        percentY: (y / macro.surface.height) * 100,
      };
      const event = { point, step, loop: this.loop };
      const result: Action[] = [
        {
          after: waitDuration(original, macro.settings, this.random),
          event: { ...event, phase: 'down' },
        },
        {
          after: original.clickType === 'press' ? original.holdMs : 0,
          event: { ...event, phase: 'up' },
        },
      ];
      if (original.clickType === 'double')
        result.push(
          { after: DOUBLE_INTERVAL, event: { ...event, phase: 'down' } },
          { after: 0, event: { ...event, phase: 'up' } },
        );
      return result;
    });
    this.cursor = 0;
  }
  private schedule(delay: number) {
    this.remaining = delay;
    this.due = this.time.now() + delay;
    this.timer = this.time.set(() => this.advance(), delay);
  }
  private advance() {
    if (!this.running) return;
    const action = this.actions[this.cursor];
    this.held = action.event.phase === 'down' ? action.event : null;
    this.emit(action.event);
    this.cursor += 1;
    if (this.cursor >= this.actions.length) {
      if (
        this.snapshot!.settings.loops > 0 &&
        this.loop >= this.snapshot!.settings.loops
      ) {
        this.running = false;
        this.timer = null;
        this.done();
        return;
      }
      this.loop += 1;
      this.planCycle();
    }
    this.schedule(this.actions[this.cursor].after);
  }
  pause() {
    if (!this.running) return;
    this.running = false;
    this.time.clear(this.timer);
    this.timer = null;
    this.remaining = Math.max(0, this.due - this.time.now());
    // Release pressed buttons without completing the click. Resume the remaining hold.
    this.rehold = this.held;
  }
  resume() {
    if (this.running || !this.snapshot || this.cursor >= this.actions.length)
      return;
    this.running = true;
    if (this.rehold) {
      this.emit(this.rehold);
      this.rehold = null;
    }
    this.schedule(this.remaining);
  }
  stop() {
    if (this.timer !== null) this.time.clear(this.timer);
    this.timer = null;
    this.running = false;
    this.snapshot = null;
    this.held = null;
    this.rehold = null;
    this.actions = [];
    this.cursor = 0;
  }
}
