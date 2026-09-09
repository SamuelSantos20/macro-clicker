import { useMemo } from 'react';
import { ClickPoint } from '../types';
import { analyzeMacro } from '../utils/macroEngine';
import { BarChart3, Zap, Clock, Maximize2, Lightbulb, Activity, CheckCircle2 } from 'lucide-react';

interface AnalysisPanelProps {
  points: ClickPoint[];
  canvasWidth?: number;
  canvasHeight?: number;
}

export function AnalysisPanel({ points, canvasWidth = 800, canvasHeight = 520 }: AnalysisPanelProps) {
  const analysis = useMemo(() => {
    return analyzeMacro(points, canvasWidth, canvasHeight);
  }, [points, canvasWidth, canvasHeight]);

  if (points.length === 0) {
    return (
      <div id="analysis-panel-empty" className="p-8 text-center flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-xl h-full">
        <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-3">
          <BarChart3 className="w-6 h-6" />
        </div>
        <p className="text-xs font-semibold text-slate-300 mb-1">Aguardando Gravação</p>
        <p className="text-[11px] text-slate-500 max-w-xs leading-relaxed">
          Grave uma sequência de cliques para visualizar o diagnóstico de tempo, velocidade de repetição e mapa espacial.
        </p>
      </div>
    );
  }

  const patternLabels: Record<string, { label: string; color: string; desc: string }> = {
    rapido: {
      label: 'Autoclicker / Spam Rápido',
      color: 'text-amber-400 bg-amber-950/60 border-amber-800/60',
      desc: 'Alta cadência de cliques com intervalos curtos (<120ms).'
    },
    ritmico: {
      label: 'Alvo Concentrado / Focado',
      color: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60',
      desc: 'Cliques concentrados em uma região delimitada.'
    },
    disperso: {
      label: 'Navegação Multilateral',
      color: 'text-sky-400 bg-sky-950/60 border-sky-800/60',
      desc: 'Cobre múltiplos cantos e elementos distintos na tela.'
    },
    sequencial: {
      label: 'Sequencial Linear Padrão',
      color: 'text-indigo-400 bg-indigo-950/60 border-indigo-800/60',
      desc: 'Fluxo ordenado com cadência humana equilibrada.'
    }
  };

  const patternInfo = patternLabels[analysis.patternType] || patternLabels.sequencial;

  return (
    <div id="analysis-panel" className="space-y-4 text-slate-200">
      {/* Pattern Banner */}
      <div className={`p-3 rounded-xl border flex items-start gap-3 ${patternInfo.color}`}>
        <Activity className="w-5 h-5 shrink-0 mt-0.5" />
        <div>
          <div className="text-xs font-bold uppercase tracking-wider">
            Padrão Identificado: {patternInfo.label}
          </div>
          <p className="text-[11px] opacity-90 mt-0.5">{patternInfo.desc}</p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {/* Metric 1: CPS */}
        <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-semibold mb-1">
            <span>Velocidade Estimada</span>
            <Zap className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-lg font-mono font-bold text-amber-300">
            {analysis.estimatedCps} <span className="text-xs text-slate-400 font-sans">CPS</span>
          </div>
          <span className="text-[10px] text-slate-400">Cliques por segundo</span>
        </div>

        {/* Metric 2: Duração do Ciclo */}
        <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-semibold mb-1">
            <span>Tempo de 1 Ciclo</span>
            <Clock className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="text-lg font-mono font-bold text-sky-300">
            {(analysis.totalCycleTimeMs / 1000).toFixed(2)} <span className="text-xs text-slate-400 font-sans">s</span>
          </div>
          <span className="text-[10px] text-slate-400">{analysis.totalCycleTimeMs}ms total</span>
        </div>

        {/* Metric 3: Intervalo Médio */}
        <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-semibold mb-1">
            <span>Intervalo Médio</span>
            <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-lg font-mono font-bold text-emerald-300">
            {analysis.averageDelayMs} <span className="text-xs text-slate-400 font-sans">ms</span>
          </div>
          <span className="text-[10px] text-slate-400">
            Min: {analysis.minDelayMs}ms / Max: {analysis.maxDelayMs}ms
          </span>
        </div>
      </div>

      {/* Spatial Bounding Box */}
      <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-300">
          <span className="flex items-center gap-1.5">
            <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
            Abrangência Espacial na Tela
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            {Math.round(analysis.boundingBox.width)} x {Math.round(analysis.boundingBox.height)} px
          </span>
        </div>

        {/* Mini Spatial Map representation */}
        <div className="relative w-full h-24 bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:12px_12px] opacity-40" />
          
          {/* Render relative point markers in miniature */}
          {points.map((p, idx) => (
            <div
              key={p.id}
              style={{ left: `${p.percentX}%`, top: `${p.percentY}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]"
              title={`#${idx + 1} (${p.x}px, ${p.y}px)`}
            />
          ))}

          {/* Bounding box outline */}
          {points.length > 1 && (
            <div
              style={{
                left: `${(analysis.boundingBox.minX / canvasWidth) * 100}%`,
                top: `${(analysis.boundingBox.minY / canvasHeight) * 100}%`,
                width: `${(analysis.boundingBox.width / canvasWidth) * 100}%`,
                height: `${(analysis.boundingBox.height / canvasHeight) * 100}%`,
              }}
              className="absolute border border-dashed border-sky-400/60 bg-sky-500/10 pointer-events-none rounded"
            />
          )}
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
          <span>Min: ({analysis.boundingBox.minX}px, {analysis.boundingBox.minY}px)</span>
          <span>Max: ({analysis.boundingBox.maxX}px, {analysis.boundingBox.maxY}px)</span>
        </div>
      </div>

      {/* Diagnostics & Smart Recommendations */}
      <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl space-y-2">
        <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
          <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
          Observações e Recomendações
        </div>
        <ul className="space-y-1.5">
          {analysis.tips.map((tip, i) => (
            <li key={i} className="text-xs text-slate-300 flex items-start gap-2 leading-relaxed">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
