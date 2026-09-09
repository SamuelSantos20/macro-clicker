import { PlaybackStatus, PlaybackSettings } from '../types';
import { Play, Pause, Square, Circle, Volume2, VolumeX, Sparkles, Sliders } from 'lucide-react';

interface PlaybackControlsProps {
  status: PlaybackStatus;
  pointsCount: number;
  settings: PlaybackSettings;
  onSettingsChange: (settings: PlaybackSettings) => void;
  onStartRecord: () => void;
  onStopRecord: () => void;
  onStartPlay: () => void;
  onPausePlay: () => void;
  onStopPlay: () => void;
  showTrajectory: boolean;
  onToggleTrajectory: (val: boolean) => void;
  currentLoop: number;
  totalLoops: number;
  stepIndex: number;
}

export function PlaybackControls({
  status,
  pointsCount,
  settings,
  onSettingsChange,
  onStartRecord,
  onStopRecord,
  onStartPlay,
  onPausePlay,
  onStopPlay,
  showTrajectory,
  onToggleTrajectory,
  currentLoop,
  totalLoops,
  stepIndex,
}: PlaybackControlsProps) {
  const isPlaying = status === 'playing';
  const isRecording = status === 'recording';

  return (
    <div id="playback-controls-bar" className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
      {/* Primary Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Record & Play controls */}
        <div className="flex items-center gap-2">
          {isRecording ? (
            <button
              id="btn-stop-record"
              type="button"
              onClick={onStopRecord}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-bold text-xs shadow-lg shadow-rose-950 transition cursor-pointer"
            >
              <Square className="w-4 h-4 fill-white" />
              Concluir Gravação ({pointsCount})
            </button>
          ) : (
            <button
              id="btn-start-record"
              type="button"
              onClick={onStartRecord}
              disabled={isPlaying}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg transition cursor-pointer ${
                isPlaying
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 active:scale-95 text-white shadow-rose-950'
              }`}
            >
              <Circle className="w-3.5 h-3.5 fill-current animate-pulse" />
              Gravar Cliques (R)
            </button>
          )}

          {isPlaying ? (
            <button
              id="btn-pause-macro"
              type="button"
              onClick={onPausePlay}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-95 text-white font-bold text-xs shadow-lg shadow-amber-950 transition cursor-pointer"
            >
              <Pause className="w-4 h-4" />
              Pausar
            </button>
          ) : (
            <button
              id="btn-play-macro"
              type="button"
              onClick={onStartPlay}
              disabled={pointsCount === 0 || isRecording}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg transition cursor-pointer ${
                pointsCount === 0 || isRecording
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white shadow-emerald-950'
              }`}
            >
              <Play className="w-4 h-4 fill-white" />
              Replicar / Executar
            </button>
          )}

          {(isPlaying || status === 'paused') && (
            <button
              id="btn-stop-macro"
              type="button"
              onClick={onStopPlay}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
              title="Interromper Execução"
            >
              <Square className="w-3.5 h-3.5" />
              Parar
            </button>
          )}
        </div>

        {/* Live Status indicator when playing */}
        {isPlaying && (
          <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-sky-950/70 border border-sky-800/60 font-mono text-xs text-sky-300">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
              Ciclo: <strong className="text-white">{currentLoop}</strong> / {totalLoops === 0 ? '∞' : totalLoops}
            </span>
            <span className="text-slate-600">|</span>
            <span>
              Passo: <strong className="text-white">{stepIndex + 1}</strong>/{pointsCount}
            </span>
          </div>
        )}

        {/* Audio and trajectory toggles */}
        <div className="flex items-center gap-2">
          <button
            id="btn-toggle-sound"
            type="button"
            onClick={() => onSettingsChange({ ...settings, soundEnabled: !settings.soundEnabled })}
            className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              settings.soundEnabled
                ? 'bg-slate-800 border-slate-700 text-slate-200'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
            title="Efeito Sonoro de Clique"
          >
            {settings.soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">Som</span>
          </button>

          <button
            id="btn-toggle-trajectory"
            type="button"
            onClick={() => onToggleTrajectory(!showTrajectory)}
            className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              showTrajectory
                ? 'bg-indigo-950/70 border-indigo-700/60 text-indigo-300'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
            title="Exibir Trajetória das Coordenadas"
          >
            <Sliders className="w-4 h-4" />
            <span className="hidden sm:inline">Linhas</span>
          </button>
        </div>
      </div>

      {/* Execution Settings: Loops & Speed */}
      <div className="pt-2 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        {/* Loops Selector */}
        <div className="space-y-1">
          <label className="text-[11px] text-slate-400 font-semibold flex items-center justify-between">
            <span>Repetições do Ciclo:</span>
            <span className="text-emerald-400 font-mono font-bold">
              {settings.loops === 0 ? 'Infinito (∞)' : `${settings.loops}x vezes`}
            </span>
          </label>
          <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800">
            {[1, 5, 10, 50, 0].map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => onSettingsChange({ ...settings, loops: l })}
                className={`flex-1 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                  settings.loops === l
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {l === 0 ? '∞' : `${l}x`}
              </button>
            ))}
          </div>
        </div>

        {/* Speed Multiplier */}
        <div className="space-y-1">
          <label className="text-[11px] text-slate-400 font-semibold flex items-center justify-between">
            <span>Velocidade de Execução:</span>
            <span className="text-sky-400 font-mono font-bold">{settings.speed}x</span>
          </label>
          <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800">
            {[0.5, 1.0, 1.5, 2.0, 5.0].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onSettingsChange({ ...settings, speed: s })}
                className={`flex-1 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                  settings.speed === s
                    ? 'bg-sky-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* Humanization Jitter */}
        <div className="space-y-1">
          <label className="text-[11px] text-slate-400 font-semibold flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              Humanização (Jitter):
            </span>
            <span className="text-amber-400 font-mono font-bold">
              {settings.humanizeJitterPx === 0 ? 'Desativado' : `±${settings.humanizeJitterPx}px`}
            </span>
          </label>
          <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800">
            {[0, 2, 5, 10].map((px) => (
              <button
                key={px}
                type="button"
                onClick={() => onSettingsChange({ ...settings, humanizeJitterPx: px })}
                className={`flex-1 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                  settings.humanizeJitterPx === px
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {px === 0 ? 'Off' : `±${px}px`}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
