import { useState } from 'react';
import { ClickPoint, ClickButton, ClickType } from '../types';
import { Clock, Plus, Trash2, Play, MousePointer, Tag, ChevronUp, ChevronDown } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface SequenceEditorProps {
  points: ClickPoint[];
  onPointsChange: (points: ClickPoint[]) => void;
  onPointSelect?: (point: ClickPoint) => void;
  canvasWidth?: number;
  canvasHeight?: number;
}

export function SequenceEditor({
  points,
  onPointsChange,
  onPointSelect,
  canvasWidth = 800,
  canvasHeight = 520,
}: SequenceEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newX, setNewX] = useState(250);
  const [newY, setNewY] = useState(200);
  const [newDelay, setNewDelay] = useState(300);
  const [showAddForm, setShowAddForm] = useState(false);

  const handleUpdatePoint = (id: string, updates: Partial<ClickPoint>) => {
    onPointsChange(
      points.map((p) => {
        if (p.id !== id) return p;
        const updated = { ...p, ...updates };
        if (updates.x !== undefined) {
          updated.percentX = Number(((updated.x / canvasWidth) * 100).toFixed(2));
        }
        if (updates.y !== undefined) {
          updated.percentY = Number(((updated.y / canvasHeight) * 100).toFixed(2));
        }
        return updated;
      })
    );
  };

  const handleDelete = (id: string) => {
    onPointsChange(points.filter((p) => p.id !== id));
  };

  const handleAddManualPoint = () => {
    const now = Date.now();
    const newPt: ClickPoint = {
      id: `manual_${now}`,
      x: Number(newX),
      y: Number(newY),
      percentX: Number(((newX / canvasWidth) * 100).toFixed(2)),
      percentY: Number(((newY / canvasHeight) * 100).toFixed(2)),
      timestamp: now,
      delayMs: Number(newDelay),
      button: 'left',
      clickType: 'single',
      label: `Ponto #${points.length + 1}`,
    };
    onPointsChange([...points, newPt]);
    setShowAddForm(false);
  };

  const handleTestClick = (p: ClickPoint) => {
    // Sound is already played by virtual cursor logic in ClickCanvas or parent components
    onPointSelect?.(p);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newPoints = [...points];
    const temp = newPoints[index - 1];
    newPoints[index - 1] = newPoints[index];
    newPoints[index] = temp;
    onPointsChange(newPoints);
  };

  const handleMoveDown = (index: number) => {
    if (index === points.length - 1) return;
    const newPoints = [...points];
    const temp = newPoints[index + 1];
    newPoints[index + 1] = newPoints[index];
    newPoints[index] = temp;
    onPointsChange(newPoints);
  };

  return (
    <div id="sequence-editor-container" className="flex flex-col h-full space-y-4">
      {/* Header with count and actions */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Sequência de Cliques
          </h4>
          <p className="text-[11px] text-slate-400">
            {points.length} {points.length === 1 ? 'ponto registrado' : 'pontos registrados'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="btn-toggle-add-point"
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1 cursor-pointer transition"
          >
            <Plus className="w-3.5 h-3.5" />
            {showAddForm ? 'Fechar' : 'Novo Ponto'}
          </button>
          {points.length > 0 && (
            <button
              id="btn-clear-sequence"
              type="button"
              onClick={() => onPointsChange([])}
              className="px-2.5 py-1 rounded bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800/60 text-rose-300 text-xs font-medium flex items-center gap-1 cursor-pointer transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Manual Point Form */}
      {showAddForm && (
        <div className="p-3 bg-slate-900 border border-slate-700 rounded-xl space-y-3">
          <div className="text-xs font-bold text-slate-200 flex items-center gap-1">
            <MousePointer className="w-3.5 h-3.5 text-indigo-400" />
            Inserir Coordenada Manual
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">X (px)</label>
              <input
                type="number"
                value={newX}
                onChange={(e) => setNewX(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Y (px)</label>
              <input
                type="number"
                value={newY}
                onChange={(e) => setNewY(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Espera (ms)</label>
              <input
                type="number"
                value={newDelay}
                onChange={(e) => setNewDelay(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handleAddManualPoint}
            className="w-full py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer transition"
          >
            Adicionar à Sequência
          </button>
        </div>
      )}

      {/* Points List */}
      {points.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 border border-dashed border-slate-800 rounded-xl text-center">
          <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-3">
            <MousePointer className="w-6 h-6" />
          </div>
          <p className="text-xs font-semibold text-slate-300 mb-1">Nenhum clique registrado</p>
          <p className="text-[11px] text-slate-500 max-w-xs leading-relaxed">
            Clique no botão <strong>Gravar</strong> e clique sobre a tela para mapear os pontos da sua macro.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[460px] custom-scrollbar">
          {points.map((point, index) => {
            const isEditing = editingId === point.id;
            return (
              <div
                key={point.id}
                className={`p-3 rounded-xl border transition ${
                  isEditing
                    ? 'bg-slate-900 border-indigo-500/80 shadow-md'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-black flex items-center justify-center">
                      {index + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-200">
                          {point.label || `Ponto #${index + 1}`}
                        </span>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          {point.button} • {point.clickType}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5 flex items-center gap-2">
                        <span>X: {point.x}px</span>
                        <span>Y: {point.y}px</span>
                        <span className="text-slate-600">|</span>
                        <span className="flex items-center gap-1 text-sky-400">
                          <Clock className="w-3 h-3" />
                          {point.delayMs}ms
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      title="Mover para cima"
                      className={`p-1.5 rounded-lg transition cursor-pointer ${
                        index === 0 ? 'bg-slate-800/50 text-slate-600' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === points.length - 1}
                      title="Mover para baixo"
                      className={`p-1.5 rounded-lg transition cursor-pointer ${
                        index === points.length - 1 ? 'bg-slate-800/50 text-slate-600' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTestClick(point)}
                      title="Testar este clique"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 text-xs transition cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(isEditing ? null : point.id)}
                      title="Editar detalhes"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition cursor-pointer"
                    >
                      <Tag className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(point.id)}
                      title="Remover ponto"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-rose-400 hover:text-rose-300 text-xs transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Inline Edit Form */}
                {isEditing && (
                  <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">X (px)</label>
                      <input
                        type="number"
                        value={point.x}
                        onChange={(e) => handleUpdatePoint(point.id, { x: Number(e.target.value) })}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Y (px)</label>
                      <input
                        type="number"
                        value={point.y}
                        onChange={(e) => handleUpdatePoint(point.id, { y: Number(e.target.value) })}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Rótulo / Nome</label>
                      <input
                        type="text"
                        value={point.label || ''}
                        onChange={(e) => handleUpdatePoint(point.id, { label: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 text-xs"
                        placeholder="Ex: Botão Iniciar"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Delay antes do clique (ms)</label>
                      <input
                        type="number"
                        min="10"
                        step="10"
                        value={point.delayMs}
                        onChange={(e) => handleUpdatePoint(point.id, { delayMs: Math.max(10, Number(e.target.value)) })}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Botão do Mouse</label>
                      <select
                        value={point.button}
                        onChange={(e) => handleUpdatePoint(point.id, { button: e.target.value as ClickButton })}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 text-xs cursor-pointer"
                      >
                        <option value="left">Esquerdo (Left)</option>
                        <option value="right">Direito (Right)</option>
                        <option value="middle">Meio (Middle)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Tipo de Clique</label>
                      <select
                        value={point.clickType}
                        onChange={(e) => handleUpdatePoint(point.id, { clickType: e.target.value as ClickType })}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 text-xs cursor-pointer"
                      >
                        <option value="single">Clique Único</option>
                        <option value="double">Clique Duplo</option>
                        <option value="press">Pressionar Longo</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
