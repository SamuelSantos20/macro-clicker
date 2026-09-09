import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  newMacro,
  parseMacro,
  serializeMacro,
  importMacro,
  pointAt,
} from '../src/utils/model';
import { fromClient, toTarget } from '../src/utils/coordinates';
import {
  PlaybackEngine,
  waitDuration,
  type Clock,
  type PlaybackEvent,
} from '../src/utils/playback';
import { Recorder } from '../src/utils/recording';
import {
  analyzeMacro,
  generatePythonScript,
  generateAhkScript,
  generateBashScript,
} from '../src/utils/macroEngine';
import type { Macro } from '../src/types';

export function fixture(): Macro {
  const m = newMacro();
  m.name = 'Operação São Paulo';
  m.description = 'Preservar notas';
  m.target.confirmed = true;
  m.points = [
    {
      id: 'one',
      ...pointAt(200, 260, m.surface),
      timestamp: 1,
      delayMs: 100,
      button: 'left',
      clickType: 'single',
      holdMs: 500,
      label: 'Primeiro',
    },
  ];
  return m;
}
class FakeClock implements Clock {
  current = 0;
  id = 0;
  jobs = new Map<number, { at: number; fn: () => void }>();
  now = () => this.current;
  set = (fn: () => void, ms: number) => {
    const id = ++this.id;
    this.jobs.set(id, { at: this.current + ms, fn });
    return id;
  };
  clear = (id: unknown) => {
    this.jobs.delete(id as number);
  };
  tick(ms: number) {
    const end = this.current + ms;
    for (let i = 0; i < 10000; i++) {
      const next = [...this.jobs].sort((a, b) => a[1].at - b[1].at)[0];
      if (!next || next[1].at > end) break;
      this.current = next[1].at;
      this.jobs.delete(next[0]);
      next[1].fn();
    }
    this.current = end;
  }
}
test('v2 JSON round trip preserves every setting, image, description, target and infinite loops', () => {
  const m = fixture();
  m.settings = {
    ...m.settings,
    loops: 0,
    speed: 1.5,
    timingMode: 'fixed',
    fixedDelayMs: 350,
    humanizeDelayMs: 40,
    humanizeJitterPx: 5,
    showRipples: false,
  };
  m.surface.mode = 'custom-image';
  m.surface.imageUrl = 'data:image/png;base64,AAAA';
  assert.deepEqual(importMacro(serializeMacro(m)), m);
});
test('migrates old exported JSON and saved Macro with loops zero and fractional timing', () => {
  const m = fixture();
  const p = { ...m.points[0], delayMs: 100.5 };
  const exported = parseMacro({
    macroName: m.name,
    settings: { ...m.settings, loops: 0 },
    points: [p],
    createdAt: '2026-09-09T12:00:00Z',
  });
  const saved = parseMacro({
    name: m.name,
    defaultLoops: 0,
    defaultSpeed: 0.5,
    canvasWidth: 800,
    canvasHeight: 520,
    points: [p],
  });
  assert.equal(exported.settings.loops, 0);
  assert.equal(saved.settings.loops, 0);
  assert.equal(saved.settings.speed, 0.5);
  assert.equal(exported.points[0].delayMs, 100.5);
});
test('does not export a backup too large to import again', () => {
  const m = fixture();
  m.points = Array.from({ length: 2000 }, (_, i) => ({
    ...m.points[0],
    id: String(i),
    note: 'á'.repeat(2000),
  }));
  assert.throws(() => serializeMacro(m), /backup excede 4 MB/);
});
test('validates roots, schema versions and all public generator entry points', () => {
  for (const invalid of [
    null,
    [],
    {},
    'text',
    { ...fixture(), schemaVersion: 3 },
    { ...fixture(), points: [null] },
    { ...fixture(), settings: null },
  ])
    assert.throws(() => parseMacro(invalid));
  for (const v of ['1; injected()', NaN, Infinity, -1, 1.5, {}, null]) {
    const m = fixture();
    Object.assign(m.settings, { loops: v });
    for (const generate of [
      generatePythonScript,
      generateAhkScript,
      generateBashScript,
    ])
      assert.throws(() => generate(m));
  }
  assert.throws(() => importMacro('{"points":[],"defaultLoops":1e999}'));
});
test('rejects invalid point enums, coordinates, IDs, oversized payloads and URLs', () => {
  for (const patch of [
    { button: 'unknown' },
    { clickType: 'command' },
    { x: -1 },
    { percentX: 101 },
    { percentY: '50' },
    { delayMs: Infinity },
    { holdMs: 0 },
  ]) {
    const m = fixture();
    Object.assign(m.points[0], patch);
    assert.throws(() => parseMacro(m));
  }
  const m = fixture();
  m.points.push({ ...m.points[0] });
  assert.throws(() => parseMacro(m));
  assert.throws(() =>
    parseMacro({
      ...fixture(),
      surface: {
        mode: 'custom-image',
        width: 800,
        height: 520,
        imageUrl: 'https://example.com/a.svg',
      },
    }),
  );
  assert.throws(() => importMacro(' '.repeat(4_000_001)));
});
test('untrusted text never enters executable source in any platform', () => {
  const attacks = [
    '$(printf INJECTED)',
    '"""\nprint("INJECTED")\n"""',
    'x\r\nRun "INJECTED"',
    '`nINJECTED',
    'x\u2028INJECTED',
    'x\u2029INJECTED',
    "'; INJECTED #",
  ];
  for (const attack of attacks) {
    const m = fixture();
    m.name = attack;
    m.points[0].label = attack;
    m.points[0].note = attack;
    for (const generate of [
      generatePythonScript,
      generateAhkScript,
      generateBashScript,
    ])
      assert.ok(!generate(m).includes('INJECTED'));
    assert.equal(importMacro(serializeMacro(m)).name, attack);
  }
});
test('requires explicit calibration and nonempty executable exports; empty JSON remains valid', () => {
  const m = fixture();
  m.target.confirmed = false;
  for (const generate of [
    generatePythonScript,
    generateAhkScript,
    generateBashScript,
  ])
    assert.throws(() => generate(m), /destino/);
  m.target.confirmed = true;
  m.points = [];
  for (const generate of [
    generatePythonScript,
    generateAhkScript,
    generateBashScript,
  ])
    assert.throws(() => generate(m), /ação/);
  assert.deepEqual(importMacro(serializeMacro(m)).points, []);
});
test('coordinate transforms preserve targets when resized and exclude outside reference margins', () => {
  const m = fixture();
  const a = fromClient(
    110,
    150,
    { left: 10, top: 20, width: 400, height: 260 },
    m.surface,
  )!;
  const b = fromClient(
    60,
    85,
    { left: 10, top: 20, width: 200, height: 130 },
    m.surface,
  )!;
  assert.deepEqual(a, b);
  assert.equal(a.x, 200);
  assert.equal(a.y, 260);
  assert.equal(
    fromClient(
      5,
      50,
      { left: 10, top: 20, width: 400, height: 260 },
      m.surface,
    ),
    null,
  );
  assert.deepEqual(
    toTarget(m.points[0], {
      x: -1920,
      y: 20,
      width: 1920,
      height: 1080,
      confirmed: true,
    }),
    { x: -1440, y: 560 },
  );
  assert.deepEqual(
    toTarget(
      { ...m.points[0], percentX: 100, percentY: 0 },
      m.target,
      100,
      -100,
    ),
    { x: 799, y: 0 },
  );
});
test('recording resets idle time and recognizes middle, double and long press', () => {
  const r = new Recorder(),
    surface = fixture().surface;
  r.start(10000);
  const first = r.capture(50, 50, 'middle', 10100, 10140, surface);
  assert.equal(first.point.delayMs, 100);
  assert.equal(first.point.button, 'middle');
  const double = r.capture(51, 50, 'middle', 10200, 10240, surface);
  assert.equal(double.replaceId, first.point.id);
  assert.equal(double.point.clickType, 'double');
  const hold = r.capture(200, 200, 'right', 10500, 11000, surface);
  assert.equal(hold.point.holdMs, 500);
  assert.equal(hold.point.delayMs, 260);
  r.start(90000);
  assert.equal(
    r.capture(10, 10, 'left', 90050, 90060, surface).point.delayMs,
    50,
  );
});
test('waits before first click and pause resumes remaining wait without replay', () => {
  const m = fixture();
  m.points.push({ ...m.points[0], id: 'two', delayMs: 200 });
  const time = new FakeClock(),
    events: PlaybackEvent[] = [];
  let done = 0;
  const engine = new PlaybackEngine(
    (e) => events.push(e),
    () => done++,
    time,
    () => 0.5,
  );
  engine.start(m);
  time.tick(99);
  assert.equal(events.length, 0);
  time.tick(1);
  assert.equal(events.length, 2);
  time.tick(80);
  engine.pause();
  time.tick(1000);
  assert.equal(events.length, 2);
  engine.resume();
  time.tick(119);
  assert.equal(events.length, 2);
  time.tick(1);
  assert.deepEqual(
    events.filter((e) => e.phase === 'up').map((e) => e.step),
    [0, 1],
  );
  assert.equal(done, 1);
});
test('infinite loop can be stopped and input mutations cannot change an active run', () => {
  const m = fixture();
  m.settings.loops = 0;
  const time = new FakeClock();
  let clicks = 0;
  const engine = new PlaybackEngine(
    (e) => {
      if (e.phase === 'up') clicks++;
    },
    () => {},
    time,
    () => 0.5,
  );
  engine.start(m);
  m.points = [];
  m.settings.speed = 10;
  time.tick(300);
  assert.equal(clicks, 3);
  engine.stop();
  time.tick(1000);
  assert.equal(clicks, 3);
  assert.equal(time.jobs.size, 0);
});
test('double clicks and long presses execute distinct down/up phases with their durations', () => {
  const m = fixture();
  m.points[0].clickType = 'double';
  m.points.push({
    ...m.points[0],
    id: 'hold',
    clickType: 'press',
    holdMs: 500,
  });
  const time = new FakeClock(),
    events: { at: number; e: PlaybackEvent }[] = [];
  const engine = new PlaybackEngine(
    (e) => events.push({ at: time.now(), e }),
    () => {},
    time,
    () => 0.5,
  );
  engine.start(m);
  time.tick(1000);
  assert.deepEqual(
    events.map((e) => e.at),
    [100, 100, 180, 180, 280, 780],
  );
  assert.equal(analyzeMacro(m).cycleMs, 780);
  assert.equal(analyzeMacro(m).clicks, 3);
});
test('pause during hold re-arms button without prematurely completing the action', () => {
  const m = fixture();
  m.points[0].clickType = 'press';
  const time = new FakeClock(),
    events: PlaybackEvent[] = [];
  const engine = new PlaybackEngine(
    (e) => events.push(e),
    () => {},
    time,
    () => 0.5,
  );
  engine.start(m);
  time.tick(300);
  engine.pause();
  time.tick(1000);
  assert.equal(events.filter((e) => e.phase === 'up').length, 0);
  engine.resume();
  time.tick(299);
  assert.equal(events.length, 2);
  time.tick(1);
  assert.equal(events.filter((e) => e.phase === 'up').length, 1);
});
test('fixed timing, speed, jitter and stats share a 20ms lower bound', () => {
  const m = fixture();
  m.settings = {
    ...m.settings,
    timingMode: 'fixed',
    fixedDelayMs: 200,
    speed: 2,
    humanizeDelayMs: 100,
  };
  assert.equal(
    waitDuration(m.points[0], m.settings, () => 0),
    50,
  );
  assert.equal(
    waitDuration(m.points[0], m.settings, () => 0.9999),
    150,
  );
  assert.equal(analyzeMacro(m).cycleMs, 100);
  m.settings.speed = 10;
  m.settings.fixedDelayMs = 20;
  assert.equal(
    waitDuration(m.points[0], m.settings, () => 0),
    20,
  );
});
test('exporters preserve middle and right double clicks, hold and jitter semantics', () => {
  const m = fixture();
  m.points[0].button = 'middle';
  m.points[0].clickType = 'press';
  m.settings.humanizeJitterPx = 5;
  m.settings.humanizeDelayMs = 25;
  assert.match(generatePythonScript(m), /mouseDown\(button=step\["button"\]\)/);
  assert.match(generateAhkScript(m), /Click "Middle Down"/);
  assert.match(generateBashScript(m), /held=2/);
  m.points[0].button = 'right';
  m.points[0].clickType = 'double';
  assert.match(
    generateAhkScript(m),
    /Click "Right"\n {8}Sleep 80\n {8}Click "Right"/,
  );
  assert.match(generateBashScript(m), /click --repeat 2 --delay 80 3/);
});
