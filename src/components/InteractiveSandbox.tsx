import { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  Crosshair,
  Package,
  RotateCcw,
} from 'lucide-react';
export function InteractiveSandbox() {
  const [count, setCount] = useState(0);
  const [stock, setStock] = useState(120);
  const [channel, setChannel] = useState(false);
  const [validated, setValidated] = useState(0);
  const act = (fn: () => void) => {
    fn();
    setCount((n) => n + 1);
  };
  return (
    <div
      className="sandbox"
      id="interactive-sandbox"
      onContextMenu={(e) => {
        if ((e.target as Element).closest('button:not([data-ui])')) {
          e.preventDefault();
          setCount((n) => n + 1);
        }
      }}
      onAuxClick={(e) => {
        if (
          e.button === 1 &&
          (e.target as Element).closest('button:not([data-ui])')
        )
          setCount((n) => n + 1);
      }}
    >
      <div className="sandbox-top">
        <span>
          <span className="live-dot" /> AMBIENTE DE TESTE
        </span>
        <span>
          Eventos recebidos <strong data-testid="sandbox-count">{count}</strong>
        </span>
      </div>
      <div className="sandbox-heading">
        <div>
          <span className="eyebrow">OPERAÇÃO / 001</span>
          <h3>Estação de controle</h3>
          <p>Grave uma ação nos controles e reproduza para testar.</p>
        </div>
        <Crosshair size={32} />
      </div>
      <div className="sandbox-modules">
        <section className="sim-card">
          <div className="sim-label">
            <Package size={16} /> Estoque de peças
          </div>
          <strong className="sim-value" data-testid="stock">
            {stock}
            <small>unidades</small>
          </strong>
          <div className="sim-actions">
            <button
              id="sandbox-btn-minus"
              aria-label="Retirar uma peça"
              onClick={() => act(() => setStock((n) => n - 1))}
            >
              <ArrowDown size={16} />
            </button>
            <button
              id="sandbox-coin-button"
              onClick={() => act(() => setStock((n) => n + 1))}
            >
              <ArrowUp size={16} /> Adicionar peça
            </button>
          </div>
        </section>
        <section className="sim-card">
          <div className="sim-label">Canal de operação</div>
          <div className="channel-display">
            <span className={channel ? 'live-dot' : 'off-dot'} />
            <strong>{channel ? 'Ativo' : 'Em espera'}</strong>
          </div>
          <button
            id="sandbox-toggle-a"
            aria-pressed={channel}
            onClick={() => act(() => setChannel((v) => !v))}
            className="channel-button"
          >
            {channel ? 'Desativar canal' : 'Ativar canal'}
            <span className={'switch ' + (channel ? 'checked' : '')} />
          </button>
        </section>
        <section className="sim-card">
          <div className="sim-label">Validação de lote</div>
          <strong className="sim-value">
            {String(validated).padStart(2, '0')}
            <small>confirmações</small>
          </strong>
          <button
            id="sandbox-btn-confirm"
            className="sim-confirm"
            onClick={() => act(() => setValidated((n) => n + 1))}
          >
            <Check size={16} /> Confirmar lote
          </button>
        </section>
      </div>
      <div className="sandbox-bottom">
        <span>Esquerdo: aciona • direito / meio: evento registrado</span>
        <button
          data-ui="true"
          aria-label="Reiniciar laboratório"
          onClick={() => {
            setCount(0);
            setStock(120);
            setChannel(false);
            setValidated(0);
          }}
        >
          <RotateCcw size={12} /> Reiniciar
        </button>
      </div>
    </div>
  );
}
