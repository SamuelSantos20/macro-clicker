import type {
  Macro,
  ClickPoint,
  PlaybackSettings,
  Surface,
  TargetRegion,
} from '../types';

export const MAX_POINTS = 2000;
export const MAX_FILE_BYTES = 4_000_000;
export const DEFAULT_SETTINGS: PlaybackSettings = {
  loops: 1,
  speed: 1,
  timingMode: 'recorded',
  fixedDelayMs: 300,
  humanizeJitterPx: 0,
  humanizeDelayMs: 0,
  soundEnabled: false,
  showCursorTrail: true,
  showRipples: true,
};
export const DEFAULT_SURFACE: Surface = {
  mode: 'interactive-sandbox',
  width: 800,
  height: 520,
};
export function newMacro(): Macro {
  const now = Date.now();
  return {
    schemaVersion: 2,
    id: crypto.randomUUID(),
    name: 'Sequência sem título',
    description: '',
    createdAt: now,
    updatedAt: now,
    points: [],
    settings: { ...DEFAULT_SETTINGS },
    surface: { ...DEFAULT_SURFACE },
    target: { x: 0, y: 0, width: 800, height: 520, confirmed: false },
  };
}
function object(value: unknown, name: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(name + ': objeto inválido.');
  return value as Record<string, unknown>;
}
function number(
  value: unknown,
  name: string,
  min: number,
  max: number,
  integer = false,
): number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < min ||
    value > max ||
    (integer && !Number.isInteger(value))
  )
    throw new Error(name + ': valor inválido (' + min + ' a ' + max + ').');
  return value;
}
function string(value: unknown, name: string, max: number): string {
  if (typeof value !== 'string' || value.length > max)
    throw new Error(name + ': texto inválido.');
  return value;
}
function choice<T extends string>(
  value: unknown,
  options: readonly T[],
  name: string,
): T {
  if (typeof value !== 'string' || !options.includes(value as T))
    throw new Error(name + ': opção inválida.');
  return value as T;
}
function boolean(value: unknown, name: string): boolean {
  if (typeof value !== 'boolean')
    throw new Error(name + ': booleano inválido.');
  return value;
}
export function parseSettings(value: unknown): PlaybackSettings {
  const s = { ...DEFAULT_SETTINGS, ...object(value, 'Parâmetros') };
  return {
    loops: number(s.loops, 'Repetições', 0, 100000, true),
    speed: number(s.speed, 'Velocidade', 0.1, 10),
    timingMode: choice(s.timingMode, ['recorded', 'fixed'], 'Temporização'),
    fixedDelayMs: number(s.fixedDelayMs, 'Intervalo fixo', 20, 3600000, true),
    humanizeJitterPx: number(
      s.humanizeJitterPx,
      'Variação espacial',
      0,
      100,
      true,
    ),
    humanizeDelayMs: number(
      s.humanizeDelayMs,
      'Variação temporal',
      0,
      60000,
      true,
    ),
    soundEnabled: boolean(s.soundEnabled, 'Som'),
    showCursorTrail: boolean(s.showCursorTrail, 'Trajetória'),
    showRipples: boolean(s.showRipples, 'Indicadores'),
  };
}
export function parseSurface(value: unknown): Surface {
  const s = object(value, 'Superfície');
  const surface: Surface = {
    mode: choice(
      s.mode,
      [
        'interactive-sandbox',
        'screen-capture',
        'custom-image',
        'calibration-grid',
      ],
      'Modo',
    ),
    width: number(s.width, 'Largura', 1, 16384, true),
    height: number(s.height, 'Altura', 1, 16384, true),
  };
  if (s.imageUrl !== undefined) {
    const url = string(s.imageUrl, 'Imagem', 3_000_000);
    if (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(url))
      throw new Error('Imagem inválida. Use PNG, JPEG ou WebP.');
    surface.imageUrl = url;
  }
  if (
    surface.mode === 'interactive-sandbox' &&
    (surface.width !== 800 || surface.height !== 520)
  )
    throw new Error('O laboratório utiliza uma superfície de 800 × 520.');
  return surface;
}
export function parseTarget(value: unknown): TargetRegion {
  const t = object(value, 'Área de destino');
  return {
    x: number(t.x, 'Origem X', -32768, 32768, true),
    y: number(t.y, 'Origem Y', -32768, 32768, true),
    width: number(t.width, 'Largura de destino', 1, 16384, true),
    height: number(t.height, 'Altura de destino', 1, 16384, true),
    confirmed: boolean(t.confirmed, 'Calibração'),
  };
}
export function pointAt(
  x: number,
  y: number,
  surface: Surface,
): Pick<ClickPoint, 'x' | 'y' | 'percentX' | 'percentY'> {
  return {
    x,
    y,
    percentX: (x / surface.width) * 100,
    percentY: (y / surface.height) * 100,
  };
}
export function parseMacro(value: unknown): Macro {
  const m = object(value, 'Macro');
  if (m.schemaVersion !== undefined && m.schemaVersion !== 2)
    throw new Error('Versão de arquivo não suportada.');
  const legacy = m.schemaVersion === undefined;
  if (!legacy) {
    for (const key of [
      'id',
      'name',
      'description',
      'createdAt',
      'updatedAt',
      'settings',
      'surface',
      'target',
    ]) {
      if (m[key] === null || m[key] === undefined)
        throw new Error('Campo obrigatório ausente: ' + key);
    }
  }
  for (const key of [
    'settings',
    'surface',
    'target',
    'name',
    'macroName',
    'description',
  ]) {
    if (m[key] === null) throw new Error('Campo inválido: ' + key);
  }
  const surface = parseSurface(
    m.surface ?? {
      mode: 'calibration-grid',
      width: m.canvasWidth ?? 800,
      height: m.canvasHeight ?? 520,
    },
  );
  const settings = parseSettings(
    m.settings ?? { loops: m.defaultLoops ?? 1, speed: m.defaultSpeed ?? 1 },
  );
  if (!Array.isArray(m.points) || m.points.length > MAX_POINTS)
    throw new Error('A macro deve conter até ' + MAX_POINTS + ' pontos.');
  const ids = new Set<string>();
  const points = m.points.map((raw, index): ClickPoint => {
    const p = object(raw, 'Ponto ' + (index + 1));
    const id =
      p.id === undefined && legacy
        ? crypto.randomUUID()
        : string(p.id, 'ID do ponto', 200);
    if (!id || ids.has(id))
      throw new Error('Os pontos precisam ter IDs únicos.');
    ids.add(id);
    const px = number(p.percentX, 'Percentual X', 0, 100);
    const py = number(p.percentY, 'Percentual Y', 0, 100);
    const x = number(p.x, 'Coordenada X', 0, 16384);
    const y = number(p.y, 'Coordenada Y', 0, 16384);
    if (
      !legacy &&
      (Math.abs(x - (px * surface.width) / 100) > 0.1 ||
        Math.abs(y - (py * surface.height) / 100) > 0.1)
    )
      throw new Error('Coordenadas e percentuais do ponto são inconsistentes.');
    return {
      id,
      ...pointAt(
        (px * surface.width) / 100,
        (py * surface.height) / 100,
        surface,
      ),
      timestamp: number(
        p.timestamp ?? 0,
        'Data do ponto',
        0,
        Number.MAX_SAFE_INTEGER,
      ),
      delayMs: number(p.delayMs, 'Espera', 0, 3600000),
      button: choice(p.button, ['left', 'right', 'middle'], 'Botão'),
      clickType: choice(p.clickType, ['single', 'double', 'press'], 'Ação'),
      holdMs: number(p.holdMs ?? 500, 'Duração', 20, 60000, true),
      label: string(p.label ?? 'Ponto ' + (index + 1), 'Rótulo', 200),
      ...(p.note === undefined ? {} : { note: string(p.note, 'Nota', 2000) }),
    };
  });
  const now = Date.now();
  const date = (v: unknown) =>
    typeof v === 'string' && legacy
      ? number(Date.parse(v), 'Data', 0, Number.MAX_SAFE_INTEGER)
      : number(v ?? now, 'Data', 0, Number.MAX_SAFE_INTEGER);
  return {
    schemaVersion: 2,
    id: string(m.id ?? crypto.randomUUID(), 'ID', 200),
    name: string(m.name ?? m.macroName ?? 'Macro importada', 'Nome', 120),
    description: string(m.description ?? '', 'Descrição', 2000),
    createdAt: date(m.createdAt),
    updatedAt: date(m.updatedAt),
    points,
    settings,
    surface,
    target: parseTarget(
      m.target ?? {
        x: 0,
        y: 0,
        width: surface.width,
        height: surface.height,
        confirmed: false,
      },
    ),
  };
}
export function importMacro(text: string): Macro {
  if (new TextEncoder().encode(text).length > MAX_FILE_BYTES)
    throw new Error('O arquivo excede 4 MB.');
  return parseMacro(JSON.parse(text));
}
export function serializeMacro(macro: Macro): string {
  const text = JSON.stringify(parseMacro(macro), null, 2);
  if (new TextEncoder().encode(text).length > MAX_FILE_BYTES)
    throw new Error(
      'O backup excede 4 MB. Reduza a imagem ou as notas antes de exportar.',
    );
  return text;
}
export function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Não foi possível concluir a operação.';
}
