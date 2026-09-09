import type { Macro } from '../types';
import { parseMacro } from './model';
import { actionDuration, waitDuration } from './playback';
import { toTarget } from './coordinates';

export function analyzeMacro(input: Macro) {
  const macro = parseMacro(input);
  const waits = macro.points.map((p) =>
    waitDuration(p, macro.settings, () => 0.5),
  );
  const cycleMs =
    waits.reduce((a, b) => a + b, 0) +
    macro.points.reduce((a, p) => a + actionDuration(p), 0);
  const clicks = macro.points.reduce(
    (a, p) => a + (p.clickType === 'double' ? 2 : 1),
    0,
  );
  return {
    cycleMs,
    clicks,
    cps: cycleMs ? clicks / (cycleMs / 1000) : 0,
    totalMs: macro.settings.loops === 0 ? null : cycleMs * macro.settings.loops,
  };
}
function prepare(input: Macro) {
  const macro = parseMacro(input);
  if (!macro.points.length)
    throw new Error(
      'Adicione pelo menos uma ação antes de exportar um script.',
    );
  if (!macro.target.confirmed)
    throw new Error('Confirme a área de destino antes de exportar.');
  // Only validated numeric values and fixed enums enter executable output.
  // Names, notes and labels remain in the JSON backup, never in executable source.
  return {
    macro,
    steps: macro.points.map((p) => ({
      ...toTarget(p, macro.target),
      button: p.button,
      clicks: p.clickType === 'double' ? 2 : 1,
      hold: p.clickType === 'press' ? p.holdMs : 0,
      delay:
        macro.settings.timingMode === 'fixed'
          ? macro.settings.fixedDelayMs
          : p.delayMs,
    })),
  };
}
export function generatePythonScript(input: Macro): string {
  const { macro: m, steps } = prepare(input);
  const payload = JSON.stringify(
    JSON.stringify({ steps, settings: m.settings, target: m.target }),
  );
  return `# Macro Clicker | Python 3 + PyAutoGUI
# Keep the target window in its calibrated position.
import json
import random
import time
import pyautogui

data = json.loads(${payload})
settings = data["settings"]
region = data["target"]
pyautogui.FAILSAFE = True
pyautogui.PAUSE = 0
print("Starting in 3 seconds. Ctrl+C or move pointer to a screen corner to stop.")

def safe_sleep(seconds):
    remaining = seconds
    while remaining > 0:
        pyautogui.failSafeCheck()
        interval = min(0.05, remaining)
        time.sleep(interval)
        remaining -= interval

def release_button(button):
    # Emergency cleanup must release the held button even at a failsafe corner.
    previous = pyautogui.FAILSAFE
    try:
        pyautogui.FAILSAFE = False
        pyautogui.mouseUp(button=button)
    finally:
        pyautogui.FAILSAFE = previous

def run_cycle():
    for step in data["steps"]:
        variance = random.randint(-settings["humanizeDelayMs"], settings["humanizeDelayMs"])
        delay = max(20, int((step["delay"] + variance) / settings["speed"] + 0.5))
        safe_sleep(delay / 1000)
        jitter = settings["humanizeJitterPx"]
        x = max(region["x"], min(region["x"] + region["width"] - 1, step["x"] + random.randint(-jitter, jitter)))
        y = max(region["y"], min(region["y"] + region["height"] - 1, step["y"] + random.randint(-jitter, jitter)))
        pyautogui.moveTo(x, y)
        if step["hold"]:
            pyautogui.mouseDown(button=step["button"])
            try:
                safe_sleep(step["hold"] / 1000)
            finally:
                release_button(step["button"])
        else:
            pyautogui.click(button=step["button"])
            if step["clicks"] == 2:
                safe_sleep(0.08)
                pyautogui.click(button=step["button"])

try:
    safe_sleep(3)
    cycle = 0
    while settings["loops"] == 0 or cycle < settings["loops"]:
        run_cycle()
        cycle += 1
except (KeyboardInterrupt, pyautogui.FailSafeException):
    print("Stopped.")
`;
}
export function generateAhkScript(input: Macro): string {
  const { macro: m, steps } = prepare(input);
  const t = m.target,
    s = m.settings;
  const actions = steps
    .map((p) => {
      const button =
        p.button === 'left'
          ? 'Left'
          : p.button === 'right'
            ? 'Right'
            : 'Middle';
      return `        Sleep Max(20, Round((${p.delay} + Random(-${s.humanizeDelayMs}, ${s.humanizeDelayMs})) / ${s.speed}))
        x := Max(${t.x}, Min(${t.x + t.width - 1}, ${p.x} + Random(-${s.humanizeJitterPx}, ${s.humanizeJitterPx})))
        y := Max(${t.y}, Min(${t.y + t.height - 1}, ${p.y} + Random(-${s.humanizeJitterPx}, ${s.humanizeJitterPx})))
        MouseMove x, y, 0
${
  p.hold
    ? `        Click "${button} Down"
        try {
            Sleep ${p.hold}
        } finally {
            Click "${button} Up"
        }`
    : p.clicks === 2
      ? `        Click "${button}"
        Sleep 80
        Click "${button}"`
      : `        Click "${button}"`
}`;
    })
    .join('\n');
  return `; Macro Clicker | AutoHotkey v2
#Requires AutoHotkey v2.0
#SingleInstance Force
CoordMode "Mouse", "Screen"
SetMouseDelay -1
SetDefaultMouseSpeed 0
OnExit ReleaseButtons

ReleaseButtons(*) {
    Click "Left Up"
    Click "Right Up"
    Click "Middle Up"
}

; F8 starts, Escape exits and releases held buttons.
F8:: {
    Loop ${s.loops || ''} {
${actions}
    }
}
Esc::ExitApp
`;
}
export function generateBashScript(input: Macro): string {
  const { macro: m, steps } = prepare(input);
  const t = m.target,
    s = m.settings;
  const actions = steps
    .map(
      (p) => `    wait_ms ${p.delay} ${s.humanizeDelayMs} ${s.speed}
    x=$(bounded ${p.x} ${s.humanizeJitterPx} ${t.x} ${t.x + t.width - 1})
    y=$(bounded ${p.y} ${s.humanizeJitterPx} ${t.y} ${t.y + t.height - 1})
    xdotool mousemove -- "$x" "$y"
${
  p.hold
    ? `    held=${p.button === 'left' ? 1 : p.button === 'middle' ? 2 : 3}
    xdotool mousedown "$held"
    sleep ${(p.hold / 1000).toFixed(3)}
    xdotool mouseup "$held"
    held=""`
    : `    xdotool click --repeat ${p.clicks} --delay 80 ${p.button === 'left' ? 1 : p.button === 'middle' ? 2 : 3}`
}`,
    )
    .join('\n');
  return `#!/usr/bin/env bash
# Macro Clicker | Bash + xdotool (X11)
set -euo pipefail
held=""
cleanup() { if [[ -n "$held" ]]; then xdotool mouseup "$held" || true; fi; }
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
bounded() {
    local value=$1 jitter=$2 lower=$3 upper=$4 offset=0
    if (( jitter > 0 )); then offset=$(random_offset "$jitter"); fi
    value=$((value + offset))
    (( value < lower )) && value=$lower
    (( value > upper )) && value=$upper
    printf '%s' "$value"
}
random_offset() {
    local draw=$(((RANDOM << 15) | RANDOM))
    printf '%s' "$((draw % ($1 * 2 + 1) - $1))"
}
wait_ms() {
    local variance
    variance=$(random_offset "$2")
    sleep "$(awk -v base="$1" -v variance="$variance" -v speed="$3" 'BEGIN { ms=int((base+variance)/speed+0.5); if(ms<20)ms=20; printf "%.3f",ms/1000 }')"
}
printf '%s\\n' 'Starting in 3 seconds. Ctrl+C to stop.'
sleep 3
run_cycle() {
${actions}
}
cycle=0
while (( ${s.loops} == 0 || cycle < ${s.loops} )); do
    run_cycle
    cycle=$((cycle + 1))
done
`;
}
