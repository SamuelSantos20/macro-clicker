import { Plus, Trash2, ChevronUp, ChevronDown, Crosshair, Copy } from 'lucide-react';
import type { ClickPoint, Macro } from '../types';
import { pointAt } from '../utils/model';
interface Props {
  macro: Macro;
  selected: string | null;
  locked: boolean;
  onSelect: (id: string) => void;
  onChange: (points: ClickPoint[]) => void;
  onClear: () => void;
  onTest: (point: ClickPoint) => void;
  onDuplicate: (id: string) => void;
}
export function SequenceEditor({
  macro,
  selected,
  locked,
  onSelect,
  onChange,
  onClear,
  onTest,
  onDuplicate,
}: Props) {
  const move = (i: number, d: number) => {
    const p = [...macro.points];
    [p[i], p[i + d]] = [p[i + d], p[i]];
    onChange(p);
  };
  const add = () => {
    const p: ClickPoint = {
      id: crypto.randomUUID(),
      ...pointAt(
        macro.surface.width / 2,
        macro.surface.height / 2,
        macro.surface,
      ),
      delayMs: 300,
      timestamp: Date.now(),
      button: 'left',
      clickType: 'single',
      holdMs: 500,
      label: 'Nova ação',
    };
    onChange([...macro.points, p]);
    onSelect(p.id);
  };
  return (
    <section className="sequence panel">
      <div className="panel-heading">
        <div>
          <h2>
            Sequência de ações{' '}
            <span className="count-tag">{macro.points.length}</span>
          </h2>
          <p>Selecione uma etapa para editar seus parâmetros.</p>
        </div>
        <div className="button-group">
          <button
            id="btn-toggle-add-point"
            disabled={locked || macro.points.length >= 2000}
            onClick={add}
          >
            <Plus size={14} /> Adicionar
          </button>
          <button
            className="icon-button"
            aria-label="Limpar sequência"
            disabled={!macro.points.length}
            onClick={onClear}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      {macro.points.length === 0 ? (
        <div className="empty-sequence">
          <Crosshair size={25} />
          <strong>Sua primeira ação começa aqui</strong>
          <p>Inicie uma gravação ou adicione um ponto manualmente.</p>
          <button disabled={locked} onClick={add}>
            <Plus size={14} /> Adicionar primeira ação
          </button>
        </div>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>ETAPA</th>
                <th>AÇÃO / ALVO</th>
                <th>POSIÇÃO</th>
                <th>ESPERA</th>
                <th>
                  <span className="sr-only">Operações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {macro.points.map((p, i) => (
                <tr key={p.id} className={selected === p.id ? 'selected' : ''}>
                  <td>
                    <span className="step-number">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </td>
                  <td>
                    <button
                      className="row-select"
                      onClick={() => onSelect(p.id)}
                    >
                      <strong>{p.label || 'Sem rótulo'}</strong>
                      <small>
                        {p.clickType === 'single'
                          ? 'Clique'
                          : p.clickType === 'double'
                            ? 'Clique duplo'
                            : 'Pressionar'}{' '}
                        ·{' '}
                        {p.button === 'left'
                          ? 'esquerdo'
                          : p.button === 'right'
                            ? 'direito'
                            : 'meio'}
                      </small>
                    </button>
                  </td>
                  <td className="mono">
                    {Math.round(p.x)}, {Math.round(p.y)}
                  </td>
                  <td className="mono">
                    {p.delayMs} <small>ms</small>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        aria-label={'Mover etapa ' + (i + 1) + ' para cima'}
                        disabled={locked || i === 0}
                        onClick={() => move(i, -1)}
                      >
                        <ChevronUp size={13} />
                      </button>
                      <button
                        aria-label={'Mover etapa ' + (i + 1) + ' para baixo'}
                        disabled={locked || i === macro.points.length - 1}
                        onClick={() => move(i, 1)}
                      >
                        <ChevronDown size={13} />
                      </button>
                      <button
                        aria-label={'Testar etapa ' + (i + 1)}
                        disabled={locked}
                        onClick={() => onTest(p)}
                      >
                        <Crosshair size={13} />
                      </button>
                      <button
                        aria-label={'Duplicar etapa ' + (i + 1)}
                        disabled={locked || macro.points.length >= 2000}
                        onClick={() => onDuplicate(p.id)}
                      >
                        <Copy size={13} />
                      </button>
                      <button
                        aria-label={'Excluir etapa ' + (i + 1)}
                        disabled={locked}
                        onClick={() =>
                          onChange(macro.points.filter((q) => q.id !== p.id))
                        }
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
