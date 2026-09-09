import type { ClickPoint, Surface, TargetRegion } from '../types';
export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));
export function fromClient(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
  surface: Surface,
) {
  if (!rect.width || !rect.height) return null;
  const x = ((clientX - rect.left) / rect.width) * surface.width;
  const y = ((clientY - rect.top) / rect.height) * surface.height;
  if (x < 0 || y < 0 || x >= surface.width || y >= surface.height) return null;
  return {
    x,
    y,
    percentX: (x / surface.width) * 100,
    percentY: (y / surface.height) * 100,
  };
}
export function toTarget(
  point: ClickPoint,
  target: TargetRegion,
  dx = 0,
  dy = 0,
) {
  return {
    x:
      target.x +
      clamp(
        Math.round((point.percentX / 100) * target.width) + dx,
        0,
        target.width - 1,
      ),
    y:
      target.y +
      clamp(
        Math.round((point.percentY / 100) * target.height) + dy,
        0,
        target.height - 1,
      ),
  };
}
