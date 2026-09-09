import type { ClickPoint, Surface, ClickButton } from '../types';
import { pointAt } from './model';
export class Recorder {
  private lastEnd = 0;
  private previous: ClickPoint | null = null;
  start(now: number) {
    this.lastEnd = now;
    this.previous = null;
  }
  capture(
    x: number,
    y: number,
    button: ClickButton,
    down: number,
    up: number,
    surface: Surface,
  ): { point: ClickPoint; replaceId?: string } {
    const hold = Math.max(0, up - down);
    const previous = this.previous;
    if (
      previous &&
      previous.clickType === 'single' &&
      hold < 400 &&
      down - this.lastEnd <= 300 &&
      previous.button === button &&
      Math.hypot(previous.x - x, previous.y - y) < 5
    ) {
      const point = { ...previous, clickType: 'double' as const };
      this.lastEnd = up;
      this.previous = null;
      return { point, replaceId: previous.id };
    }
    const point: ClickPoint = {
      id: crypto.randomUUID(),
      ...pointAt(x, y, surface),
      timestamp: Date.now(),
      delayMs: Math.max(0, Math.round(down - this.lastEnd)),
      button,
      clickType: hold >= 400 ? 'press' : 'single',
      holdMs: Math.max(20, Math.round(hold)),
      label: 'Clique',
    };
    this.lastEnd = up;
    this.previous = point;
    return { point };
  }
}
