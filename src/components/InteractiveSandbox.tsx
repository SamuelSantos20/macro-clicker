import { useState, type MouseEvent } from 'react';
import { Sparkles, Trophy, CheckCircle, RotateCcw, Power, Crosshair } from 'lucide-react';

interface InteractiveSandboxProps {
  onSandboxClick?: (elementName: string) => void;
}

interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
}

export function InteractiveSandbox({ onSandboxClick }: InteractiveSandboxProps) {
  const [coins, setCoins] = useState(0);
  const [clickCount, setClickCount] = useState(0);
  const [switchA, setSwitchA] = useState(false);
  const [switchB, setSwitchB] = useState(true);
  const [counter, setCounter] = useState(10);
  const [lastClickedElement, setLastClickedElement] = useState<string>('Nenhum');
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [combo, setCombo] = useState(0);

  const spawnFloating = (e: MouseEvent, text: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left + (Math.random() * 20 - 10);
    const y = e.clientY - rect.top - 10;
    const newId = Date.now() + Math.random();
    setFloatingTexts(prev => [...prev.slice(-8), { id: newId, x, y, text }]);
    setTimeout(() => {
      setFloatingTexts(prev => prev.filter(f => f.id !== newId));
    }, 900);
  };

  const handleCoinClick = (e: MouseEvent) => {
    const gain = 10 + combo * 2;
    setCoins(prev => prev + gain);
    setClickCount(prev => prev + 1);
    setCombo(prev => Math.min(prev + 1, 20));
    setLastClickedElement('Gerador de Recursos');
    onSandboxClick?.('Gerador de Recursos');
    spawnFloating(e, `+${gain} Moedas!`);
  };

  return (
    <div id="interactive-sandbox" className="relative w-full h-full min-h-[460px] p-6 bg-slate-950 text-slate-100 flex flex-col justify-between select-none overflow-hidden rounded-xl border border-slate-800">
      {/* Background grid accent */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

      {/* Header Info */}
      <div className="relative z-10 flex items-center justify-between pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Ambiente de Teste Interativo
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="text-slate-400">
            Cliques Detectados: <strong className="text-emerald-400 font-bold">{clickCount}</strong>
          </span>
          <span className="text-slate-500 hidden sm:inline">|</span>
          <span className="text-slate-400 hidden sm:inline">
            Último Alvo: <span className="text-sky-300 font-medium">{lastClickedElement}</span>
          </span>
        </div>
      </div>

      {/* Center Interactive Layout */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-5 my-auto py-4">
        {/* Module 1: Clicker Core */}
        <div 
          id="sandbox-module-generator"
          className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl p-4 flex flex-col items-center justify-between shadow-lg hover:border-slate-700 transition"
        >
          <div className="w-full flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Recurso Principal
            </span>
            <span className="font-mono text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/50">
              {coins} Ouro
            </span>
          </div>

          <div className="relative my-3">
            <button
              id="sandbox-coin-button"
              type="button"
              onClick={handleCoinClick}
              className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-slate-950 flex flex-col items-center justify-center font-bold shadow-xl shadow-amber-500/20 active:scale-95 transition-transform cursor-pointer border-4 border-amber-300 group"
            >
              <Trophy className="w-8 h-8 text-amber-950 group-hover:scale-110 transition-transform" />
              <span className="text-[11px] uppercase tracking-wider mt-1 font-extrabold">Coletar</span>
            </button>

            {/* Floating text effects */}
            {floatingTexts.map(item => (
              <span
                key={item.id}
                style={{ left: item.x, top: item.y }}
                className="absolute pointer-events-none text-xs font-black text-amber-300 drop-shadow animate-bounce"
              >
                {item.text}
              </span>
            ))}
          </div>

          <p className="text-[11px] text-slate-400 text-center">
            Clique repetidamente para minerar ou configure o macro para clicar aqui.
          </p>
        </div>

        {/* Module 2: Target Counters & Adjusters */}
        <div 
          id="sandbox-module-counters"
          className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-lg hover:border-slate-700 transition"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold flex items-center gap-1 text-sky-400">
              <Crosshair className="w-3.5 h-3.5" />
              Ajustador Numérico
            </span>
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800/50">
              Valor: {counter}
            </span>
          </div>

          <div className="flex items-center justify-center gap-3 my-4">
            <button
              id="sandbox-btn-minus"
              type="button"
              onClick={() => {
                setCounter(c => c - 1);
                setClickCount(prev => prev + 1);
                setLastClickedElement('Botão Subtrair (-)');
                onSandboxClick?.('Botão Subtrair (-)');
              }}
              className="w-11 h-11 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 text-slate-200 font-bold text-lg flex items-center justify-center transition cursor-pointer"
            >
              -
            </button>

            <div className="w-20 h-11 rounded-lg bg-slate-950 border border-slate-700 flex items-center justify-center font-mono text-xl font-bold text-sky-400">
              {counter}
            </div>

            <button
              id="sandbox-btn-plus"
              type="button"
              onClick={() => {
                setCounter(c => c + 1);
                setClickCount(prev => prev + 1);
                setLastClickedElement('Botão Somar (+)');
                onSandboxClick?.('Botão Somar (+)');
              }}
              className="w-11 h-11 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 text-slate-200 font-bold text-lg flex items-center justify-center transition cursor-pointer"
            >
              +
            </button>
          </div>

          <button
            id="sandbox-btn-reset-counter"
            type="button"
            onClick={() => {
              setCounter(0);
              setClickCount(prev => prev + 1);
              setLastClickedElement('Botão Reset');
              onSandboxClick?.('Botão Reset');
            }}
            className="w-full py-2 px-3 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-xs text-slate-400 hover:text-slate-200 flex items-center justify-center gap-1.5 transition border border-slate-700/60 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            Zerar Contador
          </button>
        </div>

        {/* Module 3: State Switches & Validation Buttons */}
        <div 
          id="sandbox-module-switches"
          className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-lg hover:border-slate-700 transition"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold flex items-center gap-1 text-emerald-400">
              <Power className="w-3.5 h-3.5" />
              Interruptores de Estado
            </span>
          </div>

          <div className="space-y-2.5 my-auto py-1">
            <button
              id="sandbox-toggle-a"
              type="button"
              onClick={() => {
                setSwitchA(s => !s);
                setClickCount(prev => prev + 1);
                setLastClickedElement('Interruptor Alfa');
                onSandboxClick?.('Interruptor Alfa');
              }}
              className={`w-full p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-between transition cursor-pointer ${
                switchA
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-800/60 border-slate-700 text-slate-400'
              }`}
            >
              <span>Canal Alfa</span>
              <span className={`px-2 py-0.5 text-[10px] rounded font-mono ${switchA ? 'bg-emerald-500 text-slate-950' : 'bg-slate-700 text-slate-300'}`}>
                {switchA ? 'LIGADO' : 'DESLIGADO'}
              </span>
            </button>

            <button
              id="sandbox-toggle-b"
              type="button"
              onClick={() => {
                setSwitchB(s => !s);
                setClickCount(prev => prev + 1);
                setLastClickedElement('Interruptor Beta');
                onSandboxClick?.('Interruptor Beta');
              }}
              className={`w-full p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-between transition cursor-pointer ${
                switchB
                  ? 'bg-indigo-950/60 border-indigo-500/50 text-indigo-300'
                  : 'bg-slate-800/60 border-slate-700 text-slate-400'
              }`}
            >
              <span>Canal Beta</span>
              <span className={`px-2 py-0.5 text-[10px] rounded font-mono ${switchB ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-slate-300'}`}>
                {switchB ? 'LIGADO' : 'DESLIGADO'}
              </span>
            </button>

            <button
              id="sandbox-btn-confirm"
              type="button"
              onClick={() => {
                setClickCount(prev => prev + 1);
                setLastClickedElement('Confirmar Operação');
                onSandboxClick?.('Confirmar Operação');
              }}
              className="w-full py-2.5 px-3 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-98 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950 transition cursor-pointer"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Executar Validação
            </button>
          </div>
        </div>
      </div>

      {/* Footer Instructions banner */}
      <div className="relative z-10 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
        <span className="truncate">
          💡 <strong>Dica prática:</strong> Ative a <strong>Gravação (R)</strong> e clique nos botões acima. O macro repetirá os cliques e acionará os botões automaticamente!
        </span>
        <button
          id="sandbox-clear-stats-btn"
          type="button"
          onClick={() => {
            setCoins(0);
            setClickCount(0);
            setCounter(0);
            setLastClickedElement('Resetado');
          }}
          className="text-slate-400 hover:text-slate-200 underline ml-2 shrink-0 cursor-pointer"
        >
          Limpar Estatísticas
        </button>
      </div>
    </div>
  );
}
