import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { newMacro, pointAt } from '../src/utils/model';
import {
  generatePythonScript,
  generateBashScript,
} from '../src/utils/macroEngine';

function sample() {
  const m = newMacro();
  m.target.confirmed = true;
  m.name = '$(printf INJECTED)';
  m.settings.loops = 2;
  m.points = [
    {
      id: 'p1',
      ...pointAt(400, 260, m.surface),
      timestamp: 1,
      delayMs: 100,
      holdMs: 500,
      button: 'middle' as const,
      clickType: 'press' as const,
      label: 'x\nINJECTED',
    },
    {
      id: 'p2',
      ...pointAt(200, 130, m.surface),
      timestamp: 1,
      delayMs: 200,
      holdMs: 500,
      button: 'right' as const,
      clickType: 'double' as const,
      label: 'x\rINJECTED',
    },
  ];
  return m;
}
const python =
  process.env.PYTHON_BINARY ||
  (process.platform === 'win32' ? 'python' : 'python3');
const bash =
  process.env.BASH_BINARY ||
  (process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : 'bash');
test('Python generated source parses and runs with mocked automation, preserving buttons and loops', (t) => {
  const available = spawnSync(python, ['--version'], {
    encoding: 'utf8',
    timeout: 10000,
  });
  if (available.status !== 0) {
    t.skip(
      'Python unavailable; set PYTHON_BINARY to enable runtime verification.',
    );
    return;
  }
  const source = generatePythonScript(sample());
  const runner = `import sys, json, types, time, ast
source=sys.stdin.read()
ast.parse(source)
events=[]
fake=types.ModuleType('pyautogui')
fake.failSafeCheck=lambda:None
fake.FailSafeException=type('FailSafeException',(Exception,),{})
for name in ['moveTo','mouseDown','mouseUp','click']:
    setattr(fake,name,lambda *args,_name=name,**kwargs:events.append([_name,list(args),kwargs]))
sys.modules['pyautogui']=fake
time.sleep=lambda value:None
exec(compile(source,'generated.py','exec'))
print(json.dumps(events))`;
  const result = spawnSync(python, ['-c', runner], {
    input: source,
    encoding: 'utf8',
    timeout: 10000,
  });
  assert.equal(result.status, 0, result.stderr);
  const events = JSON.parse(result.stdout.trim().split('\n').at(-1)!) as [
    string,
    unknown[],
    Record<string, unknown>,
  ][];
  assert.equal(
    events.filter((e) => e[0] === 'mouseDown' && e[2].button === 'middle')
      .length,
    2,
  );
  assert.equal(events.filter((e) => e[0] === 'mouseUp').length, 2);
  assert.equal(
    events.filter((e) => e[0] === 'click' && e[2].button === 'right').length,
    4,
  );
  assert.ok(!result.stdout.includes('INJECTED'));
});
test('Bash generated source parses and runs against shell stubs, never invoking OS input', (t) => {
  const available = spawnSync(bash, ['--version'], {
    encoding: 'utf8',
    timeout: 10000,
  });
  if (available.status !== 0) {
    t.skip('Bash unavailable; set BASH_BINARY to enable runtime verification.');
    return;
  }
  const source = generateBashScript(sample());
  const syntax = spawnSync(bash, ['-n'], {
    input: source,
    encoding: 'utf8',
    timeout: 10000,
  });
  assert.equal(syntax.status, 0, syntax.stderr);
  const stubs = 'xdotool() { printf "EVENT %s\\n" "$*"; }\nsleep() { :; }\n';
  const result = spawnSync(bash, [], {
    input: stubs + source,
    encoding: 'utf8',
    timeout: 10000,
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal((result.stdout.match(/EVENT mousedown 2/g) || []).length, 2);
  assert.equal((result.stdout.match(/EVENT mouseup 2/g) || []).length, 2);
  assert.equal(
    (result.stdout.match(/EVENT click --repeat 2 --delay 80 3/g) || []).length,
    2,
  );
  assert.ok(!result.stdout.includes('INJECTED'));
});
test('Python emergency stop releases a held button and restores the failsafe', (t) => {
  const available = spawnSync(python, ['--version'], {
    encoding: 'utf8',
    timeout: 10000,
  });
  if (available.status !== 0) {
    t.skip('Python unavailable.');
    return;
  }
  const runner = `import sys, types, time, json
events=[]
fake=types.ModuleType('pyautogui')
fake.FailSafeException=type('FailSafeException',(Exception,),{})
fake.held=False
fake.corner=False
def check():
    if fake.FAILSAFE and fake.corner: raise fake.FailSafeException()
def down(**kwargs):
    check()
    fake.held=True
    fake.corner=True
def up(**kwargs):
    check()
    fake.held=False
    events.append('released')
fake.failSafeCheck=check
fake.mouseDown=down
fake.mouseUp=up
fake.moveTo=lambda *args:check()
fake.click=lambda **kwargs:check()
sys.modules['pyautogui']=fake
time.sleep=lambda seconds:None
exec(compile(sys.stdin.read(),'generated.py','exec'))
print(json.dumps([fake.held,fake.FAILSAFE,events]))`;
  const result = spawnSync(python, ['-c', runner], {
    input: generatePythonScript(sample()),
    encoding: 'utf8',
    timeout: 10000,
  });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout.trim().split('\n').at(-1)!), [
    false,
    true,
    ['released'],
  ]);
});
test('Python double click adds exactly one 80ms interval', (t) => {
  const available = spawnSync(python, ['--version'], {
    encoding: 'utf8',
    timeout: 10000,
  });
  if (available.status !== 0) {
    t.skip('Python unavailable.');
    return;
  }
  const m = sample();
  m.settings.loops = 1;
  m.points = [m.points[1]];
  const runner = `import sys,types,time,json
fake=types.ModuleType('pyautogui')
fake.FailSafeException=type('FailSafeException',(Exception,),{})
fake.failSafeCheck=lambda:None
fake.moveTo=lambda *args:None
elapsed=[0]
clicks=[]
def sleep(seconds): elapsed[0]+=seconds
def click(**kwargs):
    clicks.append(elapsed[0])
    sleep(kwargs.get('interval',0))
fake.click=click
sys.modules['pyautogui']=fake
time.sleep=sleep
exec(compile(sys.stdin.read(),'generated.py','exec'))
print(json.dumps([clicks,elapsed[0]]))`;
  const result = spawnSync(python, ['-c', runner], {
    input: generatePythonScript(m),
    encoding: 'utf8',
    timeout: 10000,
  });
  assert.equal(result.status, 0, result.stderr);
  const [clicks, elapsed] = JSON.parse(
    result.stdout.trim().split('\n').at(-1)!,
  );
  assert.equal(clicks.length, 2);
  assert.ok(Math.abs(clicks[1] - clicks[0] - 0.08) < 0.000001);
  assert.ok(Math.abs(elapsed - 3.28) < 0.000001);
});
test('Bash temporal jitter can reach positive and negative values at the maximum range', (t) => {
  const available = spawnSync(bash, ['--version'], {
    encoding: 'utf8',
    timeout: 10000,
  });
  if (available.status !== 0) {
    t.skip('Bash unavailable.');
    return;
  }
  const source = generateBashScript(sample());
  const functions = source.slice(0, source.indexOf("printf '%s\\n' 'Starting"));
  const result = spawnSync(bash, [], {
    input:
      functions +
      '\nfor ((i=0;i<1000;i++)); do random_offset 60000; printf "\\n"; done\n',
    encoding: 'utf8',
    timeout: 10000,
  });
  assert.equal(result.status, 0, result.stderr);
  const values = result.stdout.trim().split('\n').map(Number);
  assert.ok(values.some((v) => v > 0));
  assert.ok(values.some((v) => v < 0));
  assert.ok(values.every((v) => Math.abs(v) <= 60000));
});
