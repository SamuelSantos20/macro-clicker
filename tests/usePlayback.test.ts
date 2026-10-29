import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { usePlayback } from '../src/hooks/usePlayback';
import { newMacro, pointAt } from '../src/utils/model';
import type { PlaybackEvent } from '../src/utils/playback';
import { PlaybackEngine } from '../src/utils/playback';

function setup() {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' });
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  return { dom, root: createRoot(dom.window.document.getElementById('root')!) };
}

test('usePlayback initializes and plays a macro', async () => {
  const { dom, root } = setup();
  let api!: ReturnType<typeof usePlayback>;
  const events: PlaybackEvent[] = [];
  let canceled = 0;

  function Harness() {
    api = usePlayback(
      (e) => events.push(e),
      () => canceled++
    );
    return null;
  }

  await act(async () => root.render(createElement(Harness)));

  assert.equal(api.status, 'idle');
  assert.deepEqual(api.progress, { step: -1, loop: 1, clicks: 0 });

  const m = newMacro();
  m.points.push({ ...pointAt(10, 10, m.surface), id: 'p1', timestamp: 0, delayMs: 100, button: 'left', clickType: 'single', holdMs: 50, label: '' });

  // Set loops to 0 for playing infinitely for the mock, or we can just pause it.

  // We can't mock setTimeout without node mock timers, but node mock timers throws because node 22 mock timers is buggy with `clearTimeout` apparently (or we passed wrong options).
  // Let's use standard setTimeout in the test but short wait, or better: mock PlaybackEngine directly using prototypes or let it run.
  // Actually, we don't need to wait for PlaybackEngine to finish its whole cycle to test `usePlayback`. We can just test that the state changed!
  // BUT wait, `usePlayback` directly instantiates `PlaybackEngine`! If we do `api.play(m)`, it starts real `setTimeout`.
  // To avoid leaving timers dangling, we can just `api.stop()` before ending the test.

  await act(async () => api.play(m));

  assert.equal(api.status, 'playing');
  assert.deepEqual(api.progress, { step: -1, loop: 1, clicks: 0 });

  // Playback engine schedules timeouts. We can just stop it immediately so we don't have dangling timers!
  await act(async () => api.stop());

  // Stopping should trigger cancel and set to idle
  assert.equal(api.status, 'idle');
  // PlaybackEngine calls cancelRef inside stop -> cancelRef.current() is called.
  assert.equal(canceled, 1);

  await act(async () => root.unmount());
  dom.window.close();
});

test('usePlayback pauses and resumes', async () => {
  const { dom, root } = setup();
  let api!: ReturnType<typeof usePlayback>;

  function Harness() {
    api = usePlayback(() => {}, () => {});
    return null;
  }

  await act(async () => root.render(createElement(Harness)));

  const m = newMacro();
  m.points.push({ ...pointAt(10, 10, m.surface), id: 'p1', timestamp: 0, delayMs: 100, button: 'left', clickType: 'single', holdMs: 50, label: '' });

  await act(async () => api.play(m));

  assert.equal(api.status, 'playing');

  await act(async () => api.pause());

  assert.equal(api.status, 'paused');

  // Should resume
  await act(async () => api.play(m));

  assert.equal(api.status, 'playing');

  await act(async () => api.stop());
  assert.equal(api.status, 'idle');

  await act(async () => root.unmount());
  dom.window.close();
});

test('usePlayback record function stops engine and sets status to recording', async () => {
  const { dom, root } = setup();
  let api!: ReturnType<typeof usePlayback>;
  let canceled = 0;

  function Harness() {
    api = usePlayback(() => {}, () => canceled++);
    return null;
  }

  await act(async () => root.render(createElement(Harness)));

  const m = newMacro();
  m.points.push({ ...pointAt(10, 10, m.surface), id: 'p1', timestamp: 0, delayMs: 100, button: 'left', clickType: 'single', holdMs: 50, label: '' });

  await act(async () => api.play(m));

  assert.equal(api.status, 'playing');

  await act(async () => api.record());

  assert.equal(api.status, 'recording');
  assert.deepEqual(api.progress, { step: -1, loop: 1, clicks: 0 });
  assert.equal(canceled, 1);

  await act(async () => api.stop()); // Safety stop

  await act(async () => root.unmount());
  dom.window.close();
});

test('usePlayback receives events and updates progress', async (t) => {
  const { dom, root } = setup();
  let api!: ReturnType<typeof usePlayback>;
  const events: PlaybackEvent[] = [];

  function Harness() {
    api = usePlayback((e) => events.push(e), () => {});
    return null;
  }

  await act(async () => root.render(createElement(Harness)));

  // We can't mock setTimeout without node mock timers, but node mock timers throws because node 22 mock timers is buggy with `clearTimeout` apparently (or we passed wrong options).
  const originalStart = PlaybackEngine.prototype.start;
  t.after(() => { PlaybackEngine.prototype.start = originalStart; });

  let capturedEmit: (e: PlaybackEvent) => void;
  let capturedDone: () => void;

  PlaybackEngine.prototype.start = function(this: PlaybackEngine) {
    capturedEmit = (this as unknown as { emit: (e: PlaybackEvent) => void }).emit.bind(this);
    capturedDone = (this as unknown as { done: () => void }).done.bind(this);
  };

  const m = newMacro();
  await act(async () => api.play(m));

  // `play` sets status to 'playing'
  assert.equal(api.status, 'playing');

  await act(async () => {
    const dummyPoint = { id: '', x: 0, y: 0, percentX: 0, percentY: 0, timestamp: 0, delayMs: 0, button: 'left' as const, clickType: 'single' as const, holdMs: 0, label: '' };
    capturedEmit({ step: 0, loop: 1, phase: 'down', point: dummyPoint });
    capturedEmit({ step: 0, loop: 1, phase: 'up', point: dummyPoint });
    capturedEmit({ step: 1, loop: 2, phase: 'up', point: dummyPoint });
  });

  assert.equal(events.length, 3);

  // Progress is updated based on events.
  assert.equal(api.progress.step, 1);
  assert.equal(api.progress.loop, 2);
  assert.equal(api.progress.clicks, 2); // 'up' phases increment clicks

  await act(async () => {
    capturedDone();
  });

  // `done()` resets status to 'idle'
  assert.equal(api.status, 'idle');

  await act(async () => root.unmount());
  dom.window.close();
});

test('usePlayback unmounts cleanly and calls onCancel', async () => {
  const { dom, root } = setup();
  let canceled = 0;

  function Harness() {
    usePlayback(() => {}, () => canceled++);
    return null;
  }

  await act(async () => root.render(createElement(Harness)));

  assert.equal(canceled, 0);

  await act(async () => root.unmount());

  assert.equal(canceled, 1);

  dom.window.close();
});
