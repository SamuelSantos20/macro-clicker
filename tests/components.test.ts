import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { ScreenCaptureView } from '../src/components/ScreenCaptureView';
import { ScriptExporter } from '../src/components/ScriptExporter';
import { useLibrary } from '../src/hooks/useLibrary';
import { newMacro } from '../src/utils/model';

function setup() {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' });
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  Object.defineProperty(globalThis, 'navigator', {
    value: dom.window.navigator,
    configurable: true,
  });
  Object.defineProperty(globalThis, 'localStorage', {
    value: dom.window.localStorage,
    configurable: true,
  });
  Object.defineProperty(dom.window.HTMLMediaElement.prototype, 'play', {
    value: () => Promise.resolve(),
    configurable: true,
  });
  return { dom, root: createRoot(dom.window.document.getElementById('root')!) };
}
function media() {
  let stopped = 0;
  const track = new EventTarget() as EventTarget & { stop: () => void };
  track.stop = () => stopped++;
  const stream = {
    getTracks: () => [track],
    getVideoTracks: () => [track],
  } as unknown as MediaStream;
  return { stream, track, stopped: () => stopped };
}

test('clipboard unavailable or denied reports an error without false success', async () => {
  const { dom, root } = setup();
  const notices: { message: string; error?: boolean }[] = [];
  await act(async () =>
    root.render(
      createElement(ScriptExporter, {
        macro: newMacro(),
        locked: false,
        onTarget: () => {},
        onNotice: (message, error) => notices.push({ message, error }),
      }),
    ),
  );
  const select = dom.window.document.querySelector('select')!;
  await act(async () => {
    select.value = 'json';
    select.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  });
  const button = () =>
    [...dom.window.document.querySelectorAll('button')].find(
      (b) => b.textContent === ' Copiar' || b.textContent?.trim() === 'Copiar',
    )!;
  await act(async () => button().click());
  assert.equal(notices.at(-1)?.error, true);
  assert.match(notices.at(-1)!.message, /indisponível/);
  Object.defineProperty(navigator, 'clipboard', {
    value: {
      writeText: async () => {
        throw new Error('Permissão negada');
      },
    },
    configurable: true,
  });
  await act(async () => button().click());
  assert.equal(notices.at(-1)?.error, true);
  assert.match(notices.at(-1)!.message, /negada/);
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: async () => {} },
    configurable: true,
  });
  await act(async () => button().click());
  assert.equal(notices.at(-1)?.message, 'Conteúdo copiado.');
  assert.ok(
    [...dom.window.document.querySelectorAll('button')].some((b) =>
      b.textContent?.includes('Copiado'),
    ),
  );
  await act(async () => root.unmount());
  dom.window.close();
});
test('capture connects stream to mounted video and releases it on stop/unmount', async () => {
  const { dom, root } = setup();
  const fake = media();
  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getDisplayMedia: async () => fake.stream },
    configurable: true,
  });
  let resolution: number[] = [];
  await act(async () =>
    root.render(
      createElement(ScreenCaptureView, {
        disabled: false,
        onResolutionChange: (w, h) => {
          resolution = [w, h];
        },
      }),
    ),
  );
  await act(async () => {
    dom.window.document.querySelector<HTMLButtonElement>('button')!.click();
  });
  const video = dom.window.document.querySelector('video')!;
  assert.equal(video.srcObject, fake.stream);
  assert.equal(video.classList.contains('hidden'), false);
  Object.defineProperty(video, 'videoWidth', { value: 1920 });
  Object.defineProperty(video, 'videoHeight', { value: 1080 });
  await act(async () => {
    video.dispatchEvent(new dom.window.Event('loadedmetadata'));
  });
  assert.deepEqual(resolution, [1920, 1080]);
  await act(async () => root.unmount());
  assert.equal(fake.stopped(), 1);
  assert.equal(video.srcObject, null);
  dom.window.close();
});
test('capture permission result arriving after unmount releases tracks instead of leaking', async () => {
  const { dom, root } = setup();
  const fake = media();
  let resolve!: (stream: MediaStream) => void;
  Object.defineProperty(navigator, 'mediaDevices', {
    value: {
      getDisplayMedia: () => new Promise<MediaStream>((r) => (resolve = r)),
    },
    configurable: true,
  });
  await act(async () =>
    root.render(
      createElement(ScreenCaptureView, {
        disabled: false,
        onResolutionChange: () => {},
      }),
    ),
  );
  await act(async () => {
    dom.window.document.querySelector<HTMLButtonElement>('button')!.click();
  });
  await act(async () => root.unmount());
  await act(async () => resolve(fake.stream));
  assert.equal(fake.stopped(), 1);
  dom.window.close();
});
test('capture failures are visible and retry remains available', async () => {
  const { dom, root } = setup();
  Object.defineProperty(navigator, 'mediaDevices', {
    value: {
      getDisplayMedia: async () => {
        throw new Error('Captura recusada');
      },
    },
    configurable: true,
  });
  await act(async () =>
    root.render(
      createElement(ScreenCaptureView, {
        disabled: false,
        onResolutionChange: () => {},
      }),
    ),
  );
  await act(async () => {
    dom.window.document.querySelector<HTMLButtonElement>('button')!.click();
  });
  assert.match(
    dom.window.document.querySelector('[role="alert"]')!.textContent!,
    /recusada/,
  );
  assert.equal(
    dom.window.document.querySelector<HTMLButtonElement>('button')!.disabled,
    false,
  );
  await act(async () => root.unmount());
  dom.window.close();
});
test('storage failure reports failure without pretending the macro was saved', async () => {
  const { dom, root } = setup();
  let api!: ReturnType<typeof useLibrary>;
  function Harness() {
    api = useLibrary();
    return null;
  }
  await act(async () => root.render(createElement(Harness)));
  Object.defineProperty(dom.window.Storage.prototype, 'setItem', {
    value: () => {
      throw new Error('Quota exceeded');
    },
    configurable: true,
  });
  assert.throws(() => api.save(newMacro()), /Quota/);
  assert.equal(api.macros.length, 0);
  await act(async () => root.unmount());
  dom.window.close();
});
test('partial corrupt library preserves raw recovery data before a subsequent save', async () => {
  const { dom, root } = setup();
  const m = newMacro();
  const raw = JSON.stringify([m, null]);
  localStorage.setItem('macro_clicker_library_v2', raw);
  let api!: ReturnType<typeof useLibrary>;
  function Harness() {
    api = useLibrary();
    return null;
  }
  await act(async () => root.render(createElement(Harness)));
  assert.equal(api.macros.length, 1);
  assert.match(api.initialError, /inválido/);
  await act(async () => api.save({ ...m, description: 'Atualizada' }));
  const backup = Object.keys(localStorage).find((k) =>
    k.includes('_recovery_'),
  )!;
  assert.ok(backup);
  assert.equal(localStorage.getItem(backup), raw);
  assert.equal(api.macros[0].description, 'Atualizada');
  await act(async () => root.unmount());
  dom.window.close();
});
