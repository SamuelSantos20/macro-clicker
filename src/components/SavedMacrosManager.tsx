import { useState, useRef, type FormEvent, type ChangeEvent } from 'react';
import { Macro, ClickPoint } from '../types';
import { Bookmark, Save, FolderOpen, Trash2, Clock, Play, Upload } from 'lucide-react';

interface SavedMacrosManagerProps {
  currentPoints: ClickPoint[];
  currentMacroName: string;
  currentMacroId: string | null;
  onMacroNameChange: (name: string) => void;
  savedMacros: Macro[];
  onSaveCurrent: (name: string, description: string, asNew?: boolean) => void;
  onLoadMacro: (macro: Macro) => void;
  onDeleteMacro: (id: string) => void;
  onImportJson: (imported: Macro) => void;
}

export function SavedMacrosManager({
  currentPoints,
  currentMacroName,
  currentMacroId,
  onMacroNameChange,
  savedMacros,
  onSaveCurrent,
  onLoadMacro,
  onDeleteMacro,
  onImportJson,
}: SavedMacrosManagerProps) {
  const [desc, setDesc] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = (e: FormEvent, asNew: boolean) => {
    e.preventDefault();
    if (!currentMacroName.trim()) return;
    onSaveCurrent(currentMacroName.trim(), desc.trim(), asNew);
    setShowSaveForm(false);
    setDesc('');
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.points && Array.isArray(parsed.points)) {
          const newMacro: Macro = {
            id: `imported_${Date.now()}`,
            name: parsed.macroName || parsed.name || 'Macro Importada',
            description: parsed.description || 'Importada de arquivo JSON',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            points: parsed.points,
            defaultLoops: parsed.settings?.loops || 5,
            defaultSpeed: parsed.settings?.speed || 1,
            canvasWidth: 800,
            canvasHeight: 520,
            tags: ['importada'],
          };
          onImportJson(newMacro);
        }
      } catch {
        // error parsing json
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div id="saved-macros-panel" className="flex flex-col h-full space-y-3">
      {/* Top action header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Biblioteca de Macros Guardadas
          </h4>
          <p className="text-[11px] text-slate-400">
            {savedMacros.length} {savedMacros.length === 1 ? 'macro salva' : 'macros salvas'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleFileUpload}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1 cursor-pointer transition"
            title="Importar macro de arquivo JSON"
          >
            <Upload className="w-3.5 h-3.5" />
            Importar
          </button>

          <button
            id="btn-open-save-macro-form"
            type="button"
            onClick={() => setShowSaveForm(!showSaveForm)}
            disabled={currentPoints.length === 0}
            className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              currentPoints.length === 0
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            Salvar Atual
          </button>
        </div>
      </div>

      {/* Save current modal/card */}
      {showSaveForm && (
        <form onSubmit={handleSave} className="p-3 bg-slate-900 border border-slate-700 rounded-xl space-y-2">
          <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
            <Bookmark className="w-3.5 h-3.5 text-emerald-400" />
            Guardar Macro Atual
          </div>
          <div>
            <label className="text-[10px] text-slate-400 block mb-1">Nome da Macro</label>
            <input
              type="text"
              required
              value={currentMacroName}
              onChange={(e) => onMacroNameChange(e.target.value)}
              placeholder="Ex: Farm Coletor Automático"
              className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-slate-100 text-xs"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 block mb-1">Descrição (opcional)</label>
            <input
              type="text"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Ex: Clica 4 vezes no gerador e valida"
              className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-slate-100 text-xs"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowSaveForm(false)}
              className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer"
            >
              Cancelar
            </button>
            {currentMacroId && (
              <button
                type="button"
                onClick={(e) => handleSave(e, true)}
                className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer"
              >
                Salvar como Cópia
              </button>
            )}
            <button
              type="button"
              onClick={(e) => handleSave(e, false)}
              className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
            >
              {currentMacroId ? 'Atualizar Atual' : 'Confirmar e Salvar'}
            </button>
          </div>
        </form>
      )}

      {/* Saved list */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {savedMacros.map((macro) => {
          const isCurrentlyActive = macro.name === currentMacroName && macro.points.length === currentPoints.length;
          return (
            <div
              key={macro.id}
              className={`p-3 rounded-xl border transition flex items-center justify-between ${
                isCurrentlyActive
                  ? 'bg-emerald-950/40 border-emerald-500/60 shadow-md'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="space-y-0.5 max-w-[65%]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-100 truncate">{macro.name}</span>
                  {macro.tags?.includes('predefinida') && (
                    <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                      Exemplo
                    </span>
                  )}
                </div>
                {macro.description && (
                  <p className="text-[11px] text-slate-400 truncate">{macro.description}</p>
                )}
                <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                  <span>{macro.points.length} cliques</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {new Date(macro.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onLoadMacro(macro)}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 transition cursor-pointer shadow"
                  title="Carregar para reproduzir e editar"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  Carregar
                </button>
                {!macro.tags?.includes('predefinida') && (
                  <button
                    type="button"
                    onClick={() => onDeleteMacro(macro.id)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 text-xs transition cursor-pointer"
                    title="Excluir macro"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
