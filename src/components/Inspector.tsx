import type { Macro, ClickPoint, PlaybackSettings } from '../types';
import { SlidersHorizontal, MousePointer2 } from 'lucide-react';
import { pointAt } from '../utils/model';
interface Props {
  macro: Macro;
  point?: ClickPoint;
  locked: boolean;
  onPoint: (point: ClickPoint) => void;
  onSettings: (settings: PlaybackSettings) => void;
}
export function Inspector({
  macro,
  point,
  locked,
  onPoint,
  onSettings,
}: Props) {
  const s = macro.settings;
  const settings = (patch: Partial<PlaybackSettings>) =>
    onSettings({ ...s, ...patch });
  return (
    <aside className="inspector panel">
      <div className="inspector-heading">
        <SlidersHorizontal size={17} />
        <h2>Parâmetros</h2>
        <span>INSPECTOR</span>
      </div>
      <fieldset disabled={locked}>
        <legend>
          <span className="section-index">01</span> Execução
        </legend>
        <div className="fields">
          <label>
            Repetições
            <input
              aria-label="Repetições"
              type="number"
              min="0"
              max="100000"
              value={s.loops}
              onChange={(e) => settings({ loops: Number(e.target.value) })}
            />
            <small>0 = repetir continuamente</small>
          </label>
          <label>
            Velocidade
            <select
              value={s.speed}
              onChange={(e) => settings({ speed: Number(e.target.value) })}
            >
              {[0.25, 0.5, 1, 1.5, 2, 5, 10].map((v) => (
                <option key={v} value={v}>
                  {v}×
                </option>
              ))}
              {![0.25, 0.5, 1, 1.5, 2, 5, 10].includes(s.speed) && (
                <option value={s.speed}>{s.speed}×</option>
              )}
            </select>
          </label>
        </div>
        <label>
          Temporização
          <select
            value={s.timingMode}
            onChange={(e) =>
              settings({
                timingMode: e.target.value as PlaybackSettings['timingMode'],
              })
            }
          >
            <option value="recorded">Intervalos gravados</option>
            <option value="fixed">Intervalo fixo</option>
          </select>
        </label>
        {s.timingMode === 'fixed' && (
          <label>
            Intervalo fixo (ms)
            <input
              type="number"
              min="20"
              max="3600000"
              value={s.fixedDelayMs}
              onChange={(e) =>
                settings({ fixedDelayMs: Number(e.target.value) })
              }
            />
          </label>
        )}
      </fieldset>
      <fieldset disabled={locked}>
        <legend>
          <span className="section-index">02</span> Variação e feedback
        </legend>
        <div className="fields">
          <label>
            Posição ± px
            <input
              type="number"
              min="0"
              max="100"
              value={s.humanizeJitterPx}
              onChange={(e) =>
                settings({ humanizeJitterPx: Number(e.target.value) })
              }
            />
          </label>
          <label>
            Espera ± ms
            <input
              type="number"
              min="0"
              max="60000"
              value={s.humanizeDelayMs}
              onChange={(e) =>
                settings({ humanizeDelayMs: Number(e.target.value) })
              }
            />
          </label>
        </div>
        <label className="check-label">
          <input
            type="checkbox"
            checked={s.showCursorTrail}
            onChange={(e) => settings({ showCursorTrail: e.target.checked })}
          />{' '}
          Mostrar trajetória
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            checked={s.showRipples}
            onChange={(e) => settings({ showRipples: e.target.checked })}
          />{' '}
          Indicador de clique
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            checked={s.soundEnabled}
            onChange={(e) => settings({ soundEnabled: e.target.checked })}
          />{' '}
          Feedback sonoro
        </label>
      </fieldset>
      <fieldset disabled={locked}>
        <legend>
          <span className="section-index">03</span> Ação selecionada
        </legend>
        {point ? (
          <div className="point-fields">
            <label>
              Rótulo
              <input
                maxLength={200}
                value={point.label}
                onChange={(e) => onPoint({ ...point, label: e.target.value })}
              />
            </label>
            <div className="fields">
              <label>
                X (px)
                <input
                  type="number"
                  min="0"
                  max={macro.surface.width}
                  step="any"
                  value={Number(point.x.toFixed(2))}
                  onChange={(e) =>
                    onPoint({
                      ...point,
                      ...pointAt(
                        Number(e.target.value),
                        point.y,
                        macro.surface,
                      ),
                    })
                  }
                />
              </label>
              <label>
                Y (px)
                <input
                  type="number"
                  min="0"
                  max={macro.surface.height}
                  step="any"
                  value={Number(point.y.toFixed(2))}
                  onChange={(e) =>
                    onPoint({
                      ...point,
                      ...pointAt(
                        point.x,
                        Number(e.target.value),
                        macro.surface,
                      ),
                    })
                  }
                />
              </label>
            </div>
            <label>
              Espera antes da ação (ms)
              <input
                type="number"
                min="0"
                max="3600000"
                value={point.delayMs}
                onChange={(e) =>
                  onPoint({ ...point, delayMs: Number(e.target.value) })
                }
              />
            </label>
            <div className="fields">
              <label>
                Botão
                <select
                  value={point.button}
                  onChange={(e) =>
                    onPoint({
                      ...point,
                      button: e.target.value as ClickPoint['button'],
                    })
                  }
                >
                  <option value="left">Esquerdo</option>
                  <option value="right">Direito</option>
                  <option value="middle">Meio</option>
                </select>
              </label>
              <label>
                Ação
                <select
                  value={point.clickType}
                  onChange={(e) =>
                    onPoint({
                      ...point,
                      clickType: e.target.value as ClickPoint['clickType'],
                    })
                  }
                >
                  <option value="single">Clique</option>
                  <option value="double">Duplo</option>
                  <option value="press">Pressionar</option>
                </select>
              </label>
            </div>
            {point.clickType === 'press' && (
              <label>
                Duração pressionado (ms)
                <input
                  type="number"
                  min="20"
                  max="60000"
                  value={point.holdMs}
                  onChange={(e) =>
                    onPoint({ ...point, holdMs: Number(e.target.value) })
                  }
                />
              </label>
            )}
            <label>
              Nota
              <textarea
                rows={2}
                maxLength={2000}
                value={point.note ?? ''}
                onChange={(e) => onPoint({ ...point, note: e.target.value })}
              />
            </label>
          </div>
        ) : (
          <div className="inspector-empty">
            <MousePointer2 size={20} />
            <p>
              Selecione uma ação na sequência para ajustar seu alvo e
              comportamento.
            </p>
          </div>
        )}
      </fieldset>
      {locked && (
        <p className="locked-note">
          Interrompa a execução para editar os parâmetros.
        </p>
      )}
    </aside>
  );
}
