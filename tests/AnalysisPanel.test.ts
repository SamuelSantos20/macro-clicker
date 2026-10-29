import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { AnalysisPanel } from '../src/components/AnalysisPanel';
import { newMacro, pointAt } from '../src/utils/model';

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

test('renders actions count and total execution time for loops=0', async () => {
  const { dom, root } = setup();
  const macro = newMacro();
  macro.points.push(
    {
      id: '1',
      ...pointAt(10, 10, macro.surface),
      button: 'left',
      clickType: 'single',
      delayMs: 100,
      holdMs: 500,
      label: '1',
      timestamp: 0,
    },
    {
      id: '2',
      ...pointAt(20, 20, macro.surface),
      button: 'left',
      clickType: 'double',
      delayMs: 100,
      holdMs: 500,
      label: '2',
      timestamp: 0,
    }
  );
  macro.settings.loops = 0; // Infinite
  macro.settings.humanizeDelayMs = 0;

  await act(async () => root.render(createElement(AnalysisPanel, { macro })));

  const textContent = dom.window.document.body.textContent || '';
  assert.match(textContent, /AÇÕES023 cliques por ciclo/);
  assert.match(textContent, /EXECUÇÃO TOTAL∞/);
  assert.match(textContent, /Espera mínima de 20 ms por ação/);

  await act(async () => root.unmount());
  dom.window.close();
});

test('renders correct values when humanizeDelayMs > 0 and loops > 0', async () => {
  const { dom, root } = setup();
  const macro = newMacro();
  macro.points.push(
    {
      id: '1',
      ...pointAt(10, 10, macro.surface),
      button: 'left',
      clickType: 'single',
      delayMs: 100,
      holdMs: 500,
      label: '1',
      timestamp: 0
    }
  );
  macro.settings.loops = 5;
  macro.settings.humanizeDelayMs = 10;

  await act(async () => root.render(createElement(AnalysisPanel, { macro })));

  const textContent = dom.window.document.body.textContent || '';
  // Check the text nodes for accurate finite rendering
  assert.match(textContent, /EXECUÇÃO TOTAL/);
  assert.match(textContent, /Estimativa; inclui variação temporal/);

  const divElements = dom.window.document.querySelectorAll('.metrics > div');
  const totalExecDiv = Array.from(divElements).find(div => div.textContent?.includes('EXECUÇÃO TOTAL'));
  assert.ok(totalExecDiv, 'Execution total block should exist');
  assert.ok(!totalExecDiv.textContent?.includes('∞'), 'Should not display infinity for loops > 0');

  await act(async () => root.unmount());
  dom.window.close();
});
