import type { Macro } from '../types';
import { analyzeMacro } from '../utils/macroEngine';
export function AnalysisPanel({ macro }: { macro: Macro }) {
  const a = analyzeMacro(macro);
  return (
    <div className="metrics">
      <div>
        <span>AÇÕES</span>
        <strong>{String(macro.points.length).padStart(2, '0')}</strong>
        <small>{a.clicks} cliques por ciclo</small>
      </div>
      <div>
        <span>DURAÇÃO DO CICLO</span>
        <strong>
          {(a.cycleMs / 1000).toFixed(2)}
          <em>s</em>
        </strong>
        <small>Com velocidade e duração aplicadas</small>
      </div>
      <div>
        <span>EXECUÇÃO TOTAL</span>
        <strong>
          {a.totalMs === null ? '∞' : (a.totalMs / 1000).toFixed(2)}
          {a.totalMs !== null && <em>s</em>}
        </strong>
        <small>
          {macro.settings.humanizeDelayMs
            ? 'Estimativa; inclui variação temporal'
            : 'Espera mínima de 20 ms por ação'}
        </small>
      </div>
    </div>
  );
}
