import { ClickPoint, MacroAnalysis, PlaybackSettings } from '../types';

export function analyzeMacro(points: ClickPoint[], width: number, height: number): MacroAnalysis {
  if (points.length === 0) {
    return {
      totalClicks: 0,
      totalCycleTimeMs: 0,
      averageDelayMs: 0,
      minDelayMs: 0,
      maxDelayMs: 0,
      estimatedCps: 0,
      boundingBox: { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 },
      patternType: 'sequencial',
      tips: ['Nenhum clique gravado ainda. Inicie a gravação e clique nos pontos desejados.']
    };
  }

  const delays = points.map(p => p.delayMs);
  const totalCycleTimeMs = delays.reduce((acc, d) => acc + d, 0);
  const averageDelayMs = Math.round(totalCycleTimeMs / points.length);
  const minDelayMs = Math.min(...delays);
  const maxDelayMs = Math.max(...delays);

  const durationSec = Math.max(totalCycleTimeMs / 1000, 0.05);
  const estimatedCps = Number((points.length / durationSec).toFixed(2));

  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const boxWidth = maxX - minX;
  const boxHeight = maxY - minY;

  // Pattern detection
  let patternType: MacroAnalysis['patternType'] = 'sequencial';
  if (averageDelayMs < 120 && points.length > 3) {
    patternType = 'rapido';
  } else if (boxWidth < 40 && boxHeight < 40) {
    patternType = 'ritmico';
  } else if (boxWidth > width * 0.5 || boxHeight > height * 0.5) {
    patternType = 'disperso';
  }

  const tips: string[] = [];
  if (points.length === 1) {
    tips.push('Apenas 1 ponto registrado: perfeito para autoclicker contínuo no mesmo alvo.');
  } else if (averageDelayMs > 1200) {
    tips.push('Pausas longas detectadas: aumente a velocidade para 2x ou 3x na barra de execução para acelerar o ciclo.');
  }
  if (minDelayMs < 40 && points.length > 2) {
    tips.push('Cliques ultra rápidos (<40ms): alguns navegadores ou jogos podem ignorar eventos de clique tão curtos.');
  }
  if (points.length >= 3) {
    tips.push(`Área de abrangência de ${Math.round(boxWidth)}x${Math.round(boxHeight)}px com ${points.length} etapas.`);
  }

  return {
    totalClicks: points.length,
    totalCycleTimeMs,
    averageDelayMs,
    minDelayMs,
    maxDelayMs,
    estimatedCps,
    boundingBox: { minX, maxX, minY, maxY, width: boxWidth, height: boxHeight },
    patternType,
    tips
  };
}

// Generate Python PyAutoGUI code
export function generatePythonScript(points: ClickPoint[], settings: PlaybackSettings, macroName: string): string {
  const loopsComment = settings.loops === 0 ? 'Infinito (Ctrl+C para parar)' : `${settings.loops} repetições`;
  const speed = settings.speed || 1;

  const pointsCode = points.map((p, i) => {
    let delaySec = (settings.timingMode === 'fixed' ? settings.fixedDelayMs : p.delayMs) / 1000 / speed;
    delaySec = Math.max(0.01, delaySec);
    const jitter = settings.humanizeJitterPx > 0
      ? ` + random.randint(-${settings.humanizeJitterPx}, ${settings.humanizeJitterPx})`
      : '';
    const clickFn = p.clickType === 'double' ? 'pyautogui.doubleClick' : p.button === 'right' ? 'pyautogui.rightClick' : 'pyautogui.click';
    return `    # Passo ${i + 1}: ${p.label || 'Clique'} (${p.percentX.toFixed(1)}%, ${p.percentY.toFixed(1)}%)
    time.sleep(${delaySec.toFixed(3)})
    target_x = int(screen_w * (${(p.percentX / 100).toFixed(4)}))${jitter}
    target_y = int(screen_h * (${(p.percentY / 100).toFixed(4)}))${jitter}
    ${clickFn}(target_x, target_y)`;
  }).join('\n\n');

  return `"""
Macro Clicker - Script Python (PyAutoGUI)
Macro: ${macroName}
Repetições: ${loopsComment}
Velocidade: ${speed}x
Gerado automaticamente pelo Macro Clicker
"""

import time
import pyautogui
import random

# Segurança: Mover mouse para o canto superior esquerdo para abortar
pyautogui.FAILSAFE = True
pyautogui.PAUSE = 0.01

screen_w, screen_h = pyautogui.size()
print(f"[*] Resolução da tela detectada: {screen_w}x{screen_h}")
print("[*] Iniciando em 3 segundos... Prepare a janela alvo!")
time.sleep(3)

def run_cycle():
${pointsCode}

loops = ${settings.loops}
current_loop = 0

try:
    if loops == 0:
        print("[*] Executando em loop infinito. Pressione Ctrl+C para encerrar.")
        while True:
            current_loop += 1
            print(f" -> Ciclo #{current_loop}")
            run_cycle()
    else:
        print(f"[*] Executando {loops} ciclos...")
        for i in range(loops):
            print(f" -> Ciclo #{i + 1} de {loops}")
            run_cycle()
        print("[+] Macro concluída com sucesso!")
except KeyboardInterrupt:
    print("\\n[!] Macro interrompida pelo usuário.")
`;
}

// Generate AutoHotkey (AHK v2 / v1 compatible) script
export function generateAhkScript(points: ClickPoint[], settings: PlaybackSettings, macroName: string): string {
  const speed = settings.speed || 1;
  const loopCount = settings.loops === 0 ? '0' : String(settings.loops);

  const steps = points.map((p, i) => {
    let delayMs = Math.round((settings.timingMode === 'fixed' ? settings.fixedDelayMs : p.delayMs) / speed);
    delayMs = Math.max(10, delayMs);
    const clickCmd = p.clickType === 'double' ? 'Click, 2' : p.button === 'right' ? 'Click, Right' : 'Click';
    return `    ; Passo ${i + 1}: ${p.label || 'Clique'}
    Sleep, ${delayMs}
    targetX := Round(A_ScreenWidth * ${(p.percentX / 100).toFixed(4)})
    targetY := Round(A_ScreenHeight * ${(p.percentY / 100).toFixed(4)})
    MouseMove, %targetX%, %targetY%, 0
    ${clickCmd}`;
  }).join('\n');

  return `; ============================================
; Macro Clicker - AutoHotkey (AHK Script)
; Macro: ${macroName}
; Pressione F8 para Iniciar
; Pressione F9 para Pausar / Retomar
; Pressione ESC para Finalizar
; ============================================

#NoEnv
#SingleInstance Force
SetBatchLines, -1
CoordMode, Mouse, Screen

MsgBox, 64, Macro Clicker, Pressione F8 para INICIAR a macro "${macroName}".\`nPressione ESC a qualquer momento para PARAR.

F8::
    TotalLoops := ${loopCount}
    LoopCount := 0
    
    If (TotalLoops = 0) {
        Loop {
            ${steps}
        }
    } Else {
        Loop, %TotalLoops% {
            ${steps}
        }
        TrayTip, Macro Clicker, Macro finalizada com sucesso!, 3
    }
return

F9::Pause
Esc::ExitApp
`;
}

// Generate Linux xdotool bash script
export function generateBashScript(points: ClickPoint[], settings: PlaybackSettings, macroName: string): string {
  const speed = settings.speed || 1;
  const steps = points.map((p, i) => {
    let delaySec = ((settings.timingMode === 'fixed' ? settings.fixedDelayMs : p.delayMs) / 1000 / speed).toFixed(3);
    const btn = p.button === 'right' ? '3' : '1';
    const clickCmd = p.clickType === 'double' ? `xdotool click --repeat 2 ${btn}` : `xdotool click ${btn}`;
    return `    # Passo ${i + 1}
    sleep ${delaySec}
    xdotool mousemove ${Math.round(p.x)} ${Math.round(p.y)}
    ${clickCmd}`;
  }).join('\n');

  return `#!/bin/bash
# Macro Clicker - Script Bash (xdotool)
# Macro: ${macroName}
# Requer: sudo apt-get install xdotool

echo "[*] Iniciando macro '${macroName}' em 3 segundos..."
sleep 3

run_macro() {
${steps}
}

${settings.loops === 0 ? 'while true; do run_macro; done' : `for i in $(seq 1 ${settings.loops}); do
    echo "Ciclo $i de ${settings.loops}..."
    run_macro
done`}
echo "[+] Concluído!"
`;
}
