import { useState, useEffect, useRef, useCallback } from 'react';
import { ClickPoint, Macro, CanvasMode, PlaybackStatus, PlaybackSettings } from './types';
import { ClickCanvas } from './components/ClickCanvas';
import { PlaybackControls } from './components/PlaybackControls';
import { SequenceEditor } from './components/SequenceEditor';
import { AnalysisPanel } from './components/AnalysisPanel';
import { SavedMacrosManager } from './components/SavedMacrosManager';
import { ScriptExporter } from './components/ScriptExporter';
import { soundManager } from './utils/audio';
import {
  MousePointerClick,
  Sparkles,
  Gamepad2,
  Monitor,
  Image as ImageIcon,
  Grid,
  ListOrdered,
  BarChart3,
  Bookmark,
  Code2,
  HelpCircle,
  X,
  Keyboard,
} from 'lucide-react';

const STORAGE_KEY = 'macro_clicker_saved_macros_v1';

const SAMPLE_MACROS: Macro[] = [
  {
    id: 'sample_sandbox_miner',
    name: 'Coleta Sandbox & Validação',
    description: 'Clica no gerador de recursos 4 vezes e aciona a validação',
    createdAt: Date.now() - 3600000,
    updatedAt: Date.now() - 3600000,
    defaultLoops: 3,
    defaultSpeed: 1,
    canvasWidth: 800,
    canvasHeight: 520,
    tags: ['predefinida', 'sandbox'],
    points: [
      { id: 'p1', x: 135, y: 265, percentX: 16.9, percentY: 51.0, timestamp: 1, delayMs: 400, button: 'left', clickType: 'single', label: 'Coleta #1' },
      { id: 'p2', x: 135, y: 265, percentX: 16.9, percentY: 51.0, timestamp: 2, delayMs: 250, button: 'left', clickType: 'single', label: 'Coleta #2' },
      { id: 'p3', x: 135, y: 265, percentX: 16.9, percentY: 51.0, timestamp: 3, delayMs: 250, button: 'left', clickType: 'single', label: 'Coleta #3' },
      { id: 'p4', x: 440, y: 265, percentX: 55.0, percentY: 51.0, timestamp: 4, delayMs: 500, button: 'left', clickType: 'single', label: 'Incrementar (+)' },
      { id: 'p5', x: 670, y: 345, percentX: 83.7, percentY: 66.3, timestamp: 5, delayMs: 600, button: 'left', clickType: 'single', label: 'Confirmar' },
    ],
  },
  {
    id: 'sample_triangle',
    name: 'Triângulo de Precisão',
    description: 'Percorre três vértices em cadência rítmica contínua',
    createdAt: Date.now() - 7200000,
    updatedAt: Date.now() - 7200000,
    defaultLoops: 5,
    defaultSpeed: 1.5,
    canvasWidth: 800,
    canvasHeight: 520,
    tags: ['predefinida'],
    points: [
      { id: 'pt1', x: 400, y: 120, percentX: 50.0, percentY: 23.0, timestamp: 1, delayMs: 350, button: 'left', clickType: 'single', label: 'Vértice Topo' },
      { id: 'pt2', x: 620, y: 380, percentX: 77.5, percentY: 73.0, timestamp: 2, delayMs: 350, button: 'left', clickType: 'single', label: 'Vértice Direito' },
      { id: 'pt3', x: 180, y: 380, percentX: 22.5, percentY: 73.0, timestamp: 3, delayMs: 350, button: 'left', clickType: 'single', label: 'Vértice Esquerdo' },
    ],
  },
];

export default function App() {
  const [points, setPoints] = useState<ClickPoint[]>(SAMPLE_MACROS[0].points);
  const [currentMacroName, setCurrentMacroName] = useState<string>('Minha Macro de Cliques');
  const [currentMacroId, setCurrentMacroId] = useState<string | null>(null);
  const [canvasMode, setCanvasMode] = useState<CanvasMode>('interactive-sandbox');
  const [activeTab, setActiveTab] = useState<'sequence' | 'analysis' | 'saved' | 'export'>('sequence');
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus>('idle');
  const [showTrajectory, setShowTrajectory] = useState<boolean>(true);
  const [showShortcutsModal, setShowShortcutsModal] = useState<boolean>(false);

  // Playback progress state
  const [currentLoop, setCurrentLoop] = useState<number>(1);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [virtualCursorPos, setVirtualCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [virtualCursorClicking, setVirtualCursorClicking] = useState<boolean>(false);

  // Settings
  const [settings, setSettings] = useState<PlaybackSettings>({
    loops: 5,
    speed: 1.0,
    timingMode: 'recorded',
    fixedDelayMs: 250,
    humanizeJitterPx: 0,
    humanizeDelayMs: 0,
    soundEnabled: true,
    showCursorTrail: true,
    showRipples: true,
  });

  // Saved macros list
  const [savedMacros, setSavedMacros] = useState<Macro[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // fallback
    }
    return SAMPLE_MACROS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedMacros));
    } catch {
      // ignore
    }
  }, [savedMacros]);

  // Sync sound setting with manager
  useEffect(() => {
    soundManager.setEnabled(settings.soundEnabled);
  }, [settings.soundEnabled]);

  // Playback execution ref to handle timer cancellation
  const playbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playbackActiveRef = useRef<boolean>(false);

  const stopPlayback = useCallback(() => {
    playbackActiveRef.current = false;
    if (playbackTimeoutRef.current) {
      clearTimeout(playbackTimeoutRef.current);
      playbackTimeoutRef.current = null;
    }
    setPlaybackStatus('idle');
    setCurrentStepIndex(0);
    setVirtualCursorPos(null);
    setVirtualCursorClicking(false);
  }, []);

  const pausePlayback = useCallback(() => {
    playbackActiveRef.current = false;
    if (playbackTimeoutRef.current) {
      clearTimeout(playbackTimeoutRef.current);
      playbackTimeoutRef.current = null;
    }
    setPlaybackStatus('paused');
  }, []);

  // Execution Step Runner
  const executeStep = useCallback((loop: number, stepIdx: number) => {
    if (!playbackActiveRef.current) return;
    if (points.length === 0 || !points[stepIdx]) {
      stopPlayback();
      return;
    }

    const currentPt = points[stepIdx];
    setCurrentLoop(loop);
    setCurrentStepIndex(stepIdx);

    // Calculate jitter if enabled
    let posX = currentPt.x;
    let posY = currentPt.y;
    if (settings.humanizeJitterPx > 0) {
      const jitterRange = settings.humanizeJitterPx;
      posX += Math.floor(Math.random() * (jitterRange * 2 + 1)) - jitterRange;
      posY += Math.floor(Math.random() * (jitterRange * 2 + 1)) - jitterRange;
    }

    setVirtualCursorPos({ x: posX, y: posY });

    // Trigger visual and auditory click
    setVirtualCursorClicking(true);
    setTimeout(() => {
      setVirtualCursorClicking(false);
    }, 120);

    // Determine next step
    const isLastStep = stepIdx >= points.length - 1;
    let nextLoop = loop;
    let nextStepIdx = stepIdx + 1;

    if (isLastStep) {
      nextLoop = loop + 1;
      nextStepIdx = 0;

      // Check if reached max loops (0 means infinite)
      if (settings.loops > 0 && loop >= settings.loops) {
        // Complete execution!
        playbackTimeoutRef.current = setTimeout(() => {
          stopPlayback();
          soundManager.playBeep(523, 200); // pleasant finish chime
        }, 300);
        return;
      }
    }

    // Delay calculation
    const nextPt = points[nextStepIdx];
    const baseDelay = settings.timingMode === 'fixed' ? settings.fixedDelayMs : (nextPt ? nextPt.delayMs : 300);
    const speed = Math.max(0.1, settings.speed);
    const actualDelay = Math.max(20, Math.round(baseDelay / speed));

    playbackTimeoutRef.current = setTimeout(() => {
      executeStep(nextLoop, nextStepIdx);
    }, actualDelay);
  }, [points, settings, stopPlayback]);

  const startPlayback = useCallback(() => {
    if (points.length === 0) return;
    playbackActiveRef.current = true;
    setPlaybackStatus('playing');

    const startLoop = playbackStatus === 'paused' ? currentLoop : 1;
    const startStep = playbackStatus === 'paused' ? currentStepIndex : 0;

    executeStep(startLoop, startStep);
  }, [points, playbackStatus, currentLoop, currentStepIndex, executeStep]);

  const startRecording = useCallback(() => {
    stopPlayback();
    setPlaybackStatus('recording');
    soundManager.playBeep(440, 100);
  }, [stopPlayback]);

  const stopRecording = useCallback(() => {
    setPlaybackStatus('idle');
    soundManager.playBeep(880, 100);
  }, []);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If user is typing in an input, don't trigger global shortcuts
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        if (playbackStatus === 'recording') {
          stopRecording();
        } else if (playbackStatus === 'idle') {
          startRecording();
        }
      } else if (e.key === ' ') {
        e.preventDefault();
        if (playbackStatus === 'playing') {
          pausePlayback();
        } else if (playbackStatus === 'paused' || playbackStatus === 'idle') {
          startPlayback();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (playbackStatus === 'recording') {
          stopRecording();
        } else {
          stopPlayback();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playbackStatus, startPlayback, pausePlayback, stopPlayback, startRecording, stopRecording]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (playbackTimeoutRef.current) {
        clearTimeout(playbackTimeoutRef.current);
      }
    };
  }, []);

  const handlePointAdd = (point: ClickPoint) => {
    setPoints(prev => [...prev, point]);
  };

  const handlePointDelete = (id: string) => {
    setPoints(prev => prev.filter(p => p.id !== id));
  };

  const handleSaveCurrent = (name: string, description: string, asNew: boolean = false) => {
    if (currentMacroId && !asNew) {
      setSavedMacros(prev => prev.map(m => {
        if (m.id === currentMacroId) {
          return {
            ...m,
            name,
            description,
            updatedAt: Date.now(),
            points: [...points],
            defaultLoops: settings.loops,
            defaultSpeed: settings.speed,
          };
        }
        return m;
      }));
      setCurrentMacroName(name);
    } else {
      const newId = `macro_${Date.now()}`;
      const newMacro: Macro = {
        id: newId,
        name,
        description,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        points: [...points],
        defaultLoops: settings.loops,
        defaultSpeed: settings.speed,
        canvasWidth: 800,
        canvasHeight: 520,
        tags: ['usuario'],
      };
      setSavedMacros(prev => [newMacro, ...prev]);
      setCurrentMacroName(name);
      setCurrentMacroId(newId);
    }
  };

  const handleLoadMacro = (macro: Macro) => {
    stopPlayback();
    setPoints([...macro.points]);
    setCurrentMacroName(macro.name);
    setCurrentMacroId(macro.id);
    if (macro.defaultLoops !== undefined) {
      setSettings(s => ({ ...s, loops: macro.defaultLoops, speed: macro.defaultSpeed || 1 }));
    }
    setActiveTab('sequence');
  };

  const handleDeleteMacro = (id: string) => {
    setSavedMacros(prev => prev.filter(m => m.id !== id));
    if (currentMacroId === id) {
      setCurrentMacroId(null);
    }
  };

  const handleImportJson = (imported: Macro) => {
    setSavedMacros(prev => [imported, ...prev]);
    handleLoadMacro(imported);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo & Macro Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-sky-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-400/30">
              <MousePointerClick className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black tracking-tight text-white flex items-center gap-1.5">
                  Macro Clicker
                </h1>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/50">
                  Automação de Cliques
                </span>
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <span className="font-medium text-slate-200">{currentMacroName}</span>
                <span className="text-slate-600">•</span>
                <span className="font-mono text-emerald-400">{points.length} passos mapeados</span>
              </div>
            </div>
          </div>

          {/* Quick status badge & Help shortcuts */}
          <div className="flex items-center gap-2.5">
            {playbackStatus === 'recording' && (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-950/80 border border-rose-600/70 text-rose-300 text-xs font-bold animate-pulse">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                GRAVANDO
              </span>
            )}
            {playbackStatus === 'playing' && (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-950/80 border border-sky-500/70 text-sky-300 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                EXECUTANDO ({currentLoop}/{settings.loops === 0 ? '∞' : settings.loops})
              </span>
            )}
            {playbackStatus === 'paused' && (
              <span className="px-3 py-1 rounded-full bg-amber-950/80 border border-amber-500/70 text-amber-300 text-xs font-bold">
                PAUSADO
              </span>
            )}

            <button
              id="btn-open-shortcuts"
              type="button"
              onClick={() => setShowShortcutsModal(true)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
              title="Ver atalhos de teclado"
            >
              <Keyboard className="w-4 h-4 text-indigo-400" />
              <span className="hidden sm:inline">Atalhos</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 space-y-6">
        {/* Stage View & Mode Selector */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Canvas Stage & Controls (8 cols on lg) */}
          <div className="lg:col-span-8 space-y-4">
            {/* Canvas Mode Selection Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 text-xs">
              <div className="flex items-center gap-1">
                <button
                  id="tab-mode-sandbox"
                  type="button"
                  onClick={() => setCanvasMode('interactive-sandbox')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer ${
                    canvasMode === 'interactive-sandbox'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Gamepad2 className="w-4 h-4" />
                  <span>Sandbox Interativo</span>
                </button>

                <button
                  id="tab-mode-screen"
                  type="button"
                  onClick={() => setCanvasMode('screen-capture')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer ${
                    canvasMode === 'screen-capture'
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Monitor className="w-4 h-4" />
                  <span>Espelhar Tela Real</span>
                </button>

                <button
                  id="tab-mode-image"
                  type="button"
                  onClick={() => setCanvasMode('custom-image')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer ${
                    canvasMode === 'custom-image'
                      ? 'bg-sky-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>Carregar Print</span>
                </button>

                <button
                  id="tab-mode-grid"
                  type="button"
                  onClick={() => setCanvasMode('calibration-grid')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer ${
                    canvasMode === 'calibration-grid'
                      ? 'bg-slate-700 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Grid className="w-4 h-4" />
                  <span>Grade</span>
                </button>
              </div>

              <div className="text-[11px] text-slate-400 hidden sm:flex items-center gap-2 pr-2">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Clique em <strong>Gravar</strong> para capturar pontos</span>
              </div>
            </div>

            {/* Click Stage / Canvas */}
            <ClickCanvas
              mode={canvasMode}
              points={points}
              playbackStatus={playbackStatus}
              currentStepIndex={currentStepIndex}
              onPointAdd={handlePointAdd}
              onPointDelete={handlePointDelete}
              showTrajectory={showTrajectory}
              virtualCursorPos={virtualCursorPos}
              virtualCursorClicking={virtualCursorClicking}
            />

            {/* Playback Controls & Settings Bar */}
            <PlaybackControls
              status={playbackStatus}
              pointsCount={points.length}
              settings={settings}
              onSettingsChange={setSettings}
              onStartRecord={startRecording}
              onStopRecord={stopRecording}
              onStartPlay={startPlayback}
              onPausePlay={pausePlayback}
              onStopPlay={stopPlayback}
              showTrajectory={showTrajectory}
              onToggleTrajectory={setShowTrajectory}
              currentLoop={currentLoop}
              totalLoops={settings.loops}
              stepIndex={currentStepIndex}
            />
          </div>

          {/* Right Column: Inspector Tabs (4 cols on lg) */}
          <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col min-h-[580px]">
            {/* Tab navigation */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800/80 mb-4 text-xs font-semibold">
              <button
                id="sidebar-tab-sequence"
                type="button"
                onClick={() => setActiveTab('sequence')}
                className={`py-2 rounded-lg flex flex-col items-center gap-1 transition cursor-pointer ${
                  activeTab === 'sequence'
                    ? 'bg-slate-800 text-emerald-400 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ListOrdered className="w-4 h-4" />
                <span className="text-[10px]">Sequência</span>
              </button>

              <button
                id="sidebar-tab-analysis"
                type="button"
                onClick={() => setActiveTab('analysis')}
                className={`py-2 rounded-lg flex flex-col items-center gap-1 transition cursor-pointer ${
                  activeTab === 'analysis'
                    ? 'bg-slate-800 text-sky-400 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span className="text-[10px]">Análise</span>
              </button>

              <button
                id="sidebar-tab-saved"
                type="button"
                onClick={() => setActiveTab('saved')}
                className={`py-2 rounded-lg flex flex-col items-center gap-1 transition cursor-pointer ${
                  activeTab === 'saved'
                    ? 'bg-slate-800 text-amber-400 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Bookmark className="w-4 h-4" />
                <span className="text-[10px]">Guardadas</span>
              </button>

              <button
                id="sidebar-tab-export"
                type="button"
                onClick={() => setActiveTab('export')}
                className={`py-2 rounded-lg flex flex-col items-center gap-1 transition cursor-pointer ${
                  activeTab === 'export'
                    ? 'bg-slate-800 text-indigo-400 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Code2 className="w-4 h-4" />
                <span className="text-[10px]">Exportar</span>
              </button>
            </div>

            {/* Tab content area */}
            <div className="flex-1 overflow-hidden">
              {activeTab === 'sequence' && (
                <SequenceEditor
                  points={points}
                  onPointsChange={setPoints}
                  onPointSelect={(pt) => {
                    setVirtualCursorPos({ x: pt.x, y: pt.y });
                    setVirtualCursorClicking(true);
                    setTimeout(() => setVirtualCursorClicking(false), 120);
                  }}
                  canvasWidth={800}
                  canvasHeight={520}
                />
              )}

              {activeTab === 'analysis' && (
                <AnalysisPanel points={points} canvasWidth={800} canvasHeight={520} />
              )}

              {activeTab === 'saved' && (
                <SavedMacrosManager
                  currentPoints={points}
                  currentMacroName={currentMacroName}
                  currentMacroId={currentMacroId}
                  onMacroNameChange={setCurrentMacroName}
                  savedMacros={savedMacros}
                  onSaveCurrent={handleSaveCurrent}
                  onLoadMacro={handleLoadMacro}
                  onDeleteMacro={handleDeleteMacro}
                  onImportJson={handleImportJson}
                />
              )}

              {activeTab === 'export' && (
                <ScriptExporter points={points} settings={settings} macroName={currentMacroName} />
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Keyboard Shortcuts Modal */}
      {showShortcutsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-100">Atalhos de Teclado</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowShortcutsModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-300">Iniciar / Parar Gravação</span>
                <kbd className="px-2 py-1 bg-slate-800 border border-slate-700 rounded font-mono font-bold text-emerald-400">R</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-300">Replicar / Pausar Execução</span>
                <kbd className="px-2 py-1 bg-slate-800 border border-slate-700 rounded font-mono font-bold text-sky-400">Barra de Espaço</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-300">Interromper / Cancelar</span>
                <kbd className="px-2 py-1 bg-slate-800 border border-slate-700 rounded font-mono font-bold text-rose-400">ESC</kbd>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-800/40 text-[11px] text-indigo-300 flex items-start gap-2">
              <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Quando a reprodução estiver ativa, você verá o cursor virtual percorrendo os pontos com simulação de toque e feedback sonoro.
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowShortcutsModal(false)}
              className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold cursor-pointer transition"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
