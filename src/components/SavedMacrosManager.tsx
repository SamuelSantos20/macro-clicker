import { Folder, Plus, Trash2, Upload } from 'lucide-react';
import { useRef } from 'react';
import type { Macro } from '../types';
interface Props {
  macros: Macro[];
  activeId: string;
  onLoad: (macro: Macro) => void;
  onNew: () => void;
  onDelete: (macro: Macro) => void;
  onImport: (file: File) => void;
}
export function SavedMacrosManager({
  macros,
  activeId,
  onLoad,
  onNew,
  onDelete,
  onImport,
}: Props) {
  const file = useRef<HTMLInputElement>(null);
  return (
    <aside className="library">
      <div className="library-title">
        <span>MINHAS SEQUÊNCIAS</span>
        <button
          className="icon-button"
          aria-label="Nova sequência"
          onClick={onNew}
        >
          <Plus size={15} />
        </button>
      </div>
      <div className="library-list">
        {macros.length === 0 ? (
          <p className="library-empty">
            Suas sequências salvas
            <br />
            aparecem aqui.
          </p>
        ) : (
          macros.map((m) => (
            <div
              key={m.id}
              className={'library-item ' + (m.id === activeId ? 'current' : '')}
            >
              <button onClick={() => onLoad(m)}>
                <Folder size={16} />
                <span>
                  <strong>{m.name}</strong>
                  <small>
                    {m.points.length} ações ·{' '}
                    {new Date(m.updatedAt).toLocaleDateString('pt-BR')}
                  </small>
                </span>
              </button>
              <button
                className="delete-macro"
                aria-label={'Excluir ' + m.name}
                onClick={() => onDelete(m)}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))
        )}
      </div>
      <button className="import-button" onClick={() => file.current?.click()}>
        <Upload size={14} /> Importar sequência
      </button>
      <input
        hidden
        ref={file}
        type="file"
        accept=".json"
        aria-label="Importar macro JSON"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onImport(f);
          e.target.value = '';
        }}
      />
      <div className="local-storage-note">
        <span className="live-dot" /> Biblioteca local
        <small>
          Salva neste navegador.
          <br />
          Exporte JSON para manter um backup.
        </small>
      </div>
    </aside>
  );
}
