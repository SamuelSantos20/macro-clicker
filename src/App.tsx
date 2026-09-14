import { useState, useRef, useEffect } from 'react';
import {
  MousePointer2,
  Save,
  FolderPlus,
  ArrowUpRight,
  Keyboard,
  Grid2X2,
  Monitor,
  Image,
  FlaskConical,
  X,
  ChevronRight,
  Check,
  Menu,
} from 'lucide-react';
import type { Macro, Surface, CanvasMode, ClickPoint } from './types';
import {
  newMacro,
  parseMacro,
  importMacro,
  pointAt,
  errorMessage,
  MAX_FILE_BYTES,
} from './utils/model';
import { soundManager } from './utils/audio';
import { useLibrary } from './hooks/useLibrary';
import { usePlayback } from './hooks/usePlayback';
import { ClickCanvas, type CanvasHandle } from './components/ClickCanvas';
import { SequenceEditor } from './components/SequenceEditor';
import { PlaybackControls } from './components/PlaybackControls';
import { SavedMacrosManager } from './components/SavedMacrosManager';
import { AnalysisPanel } from './components/AnalysisPanel';
import { ScriptExporter } from './components/ScriptExporter';
import { Inspector } from './components/Inspector';
import { Modal } from './components/Modal';

export default function App() {
  const [macro, setMacro] = useState<Macro>(newMacro);
  const [selected, setSelected] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState<'editor' | 'export'>('editor');
  const [help, setHelp] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [pending, setPending] = useState<{
    message: string;
    action: () => void;
  } | null>(null);
  const [notice, setNotice] = useState<{
    message: string;
    error: boolean;
  } | null>(null);
  const library = useLibrary();
  const canvas = useRef<CanvasHandle>(null);
  const playback = usePlayback(
    (e) => canvas.current?.fire(e),
    () => canvas.current?.cancel(),
  );
  const locked = playback.status !== 'idle';
  const notify = (message: string, error = false) =>
    setNotice({ message, error });
  const update = (patch: Partial<Macro>) => {
    try {
      setMacro(parseMacro({ ...macro, ...patch, updatedAt: Date.now() }));
      setDirty(true);
    } catch (error) {
      notify(errorMessage(error), true);
    }
  };
  useEffect(() => {
    soundManager.setEnabled(macro.settings.soundEnabled);
  }, [macro.settings.soundEnabled]);
  useEffect(() => {
    if (library.initialError)
      setNotice({ message: library.initialError, error: true });
  }, [library.initialError]);
  useEffect(() => {
    const before = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', before);
    return () => window.removeEventListener('beforeunload', before);
  }, [dirty]);
  const save = (copy = false) => {
    try {
      if (!macro.name.trim())
        throw new Error('Dê um nome à sequência antes de salvar.');
      const next = parseMacro({
        ...macro,
        id: copy ? crypto.randomUUID() : macro.id,
        name: copy ? macro.name + ' (cópia)' : macro.name,
        updatedAt: Date.now(),
      });
      library.save(next);
      setMacro(next);
      setDirty(false);
      notify(
        copy
          ? 'Cópia salva na biblioteca.'
          : 'Sequência salva neste navegador.',
      );
    } catch (error) {
      notify('Falha ao salvar: ' + errorMessage(error), true);
    }
  };
  const guard = (action: () => void) => {
    playback.stop();
    if (dirty)
      setPending({
        message: 'Há alterações não salvas. Descartar e continuar?',
        action,
      });
    else action();
  };
  const load = (next: Macro) =>
    guard(() => {
      setMacro(next);
      setSelected(next.points[0]?.id ?? null);
      setDirty(false);
      setTab('editor');
      setShowLibrary(false);
    });
  const startRecord = () => {
    if (macro.surface.mode === 'custom-image' && !macro.surface.imageUrl) {
      notify('Carregue uma imagem antes de gravar.', true);
      return;
    }
    playback.record();
    setTab('editor');
  };
  const play = () => {
    try {
      parseMacro(macro);
      if (macro.points.length) playback.play(macro);
    } catch (e) {
      notify(errorMessage(e), true);
    }
  };
  const clear = () => {
    playback.stop();
    if (macro.points.length)
      setPending({
        message:
          'Remover todas as ações desta sequência? As versões salvas continuam na biblioteca.',
        action: () => {
          update({ points: [] });
          setSelected(null);
        },
      });
  };
  const changeSurface = (surface: Surface) => {
    playback.stop();
    update({
      surface,
      points: macro.points.map((p) => ({
        ...p,
        ...pointAt(
          (p.percentX / 100) * surface.width,
          (p.percentY / 100) * surface.height,
          surface,
        ),
      })),
      target: {
        ...macro.target,
        width: surface.width,
        height: surface.height,
        confirmed: false,
      },
    });
  };
  const mode = (mode: CanvasMode) => {
    if (mode === macro.surface.mode) return;
    const apply = () => changeSurface({ mode, width: 800, height: 520 });
    if (macro.surface.imageUrl)
      setPending({
        message: 'Trocar a referência remove a imagem desta versão. Continuar?',
        action: apply,
      });
    else apply();
  };
  const addRecord = (point: ClickPoint, replaceId?: string) => {
    if (macro.points.length >= 2000 && !replaceId) {
      playback.stop();
      notify('Limite de 2000 ações atingido.', true);
      return;
    }
    const labeled = {
      ...point,
      label: replaceId
        ? (macro.points.find((p) => p.id === replaceId)?.label ?? 'Clique')
        : 'Ação ' + String(macro.points.length + 1).padStart(2, '0'),
    };
    update({
      points: replaceId
        ? macro.points.map((p) => (p.id === replaceId ? labeled : p))
        : [...macro.points, labeled],
    });
    setSelected(labeled.id);
  };
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      if (document.querySelector('dialog[open]')) return;
      if (e.key === 'Escape') {
        playback.stop();
        return;
      }
      const el = e.target as HTMLElement;
      if (
        el.closest('input,textarea,select,[contenteditable="true"]') ||
        tab !== 'editor'
      )
        return;
      if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        if (playback.status === 'recording') playback.stop();
        else if (!locked) startRecord();
      }
      if (e.key === ' ' && !el.closest('button')) {
        e.preventDefault();
        if (playback.status === 'playing') playback.pause();
        else if (playback.status !== 'recording') play();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });
  const upload = async (file: File) => {
    try {
      if (file.size > MAX_FILE_BYTES) throw new Error('O arquivo excede 4 MB.');
      const next = importMacro(await file.text());
      next.id = crypto.randomUUID();
      guard(() => {
        try {
          library.save(next);
          setMacro(next);
          setDirty(false);
          setSelected(next.points[0]?.id ?? null);
          setTab('editor');
          notify(
            'Sequência importada e salva. Arquivos antigos usam percentuais como referência.',
          );
        } catch (e) {
          notify(errorMessage(e), true);
        }
      });
    } catch (e) {
      notify('Falha na importação: ' + errorMessage(e), true);
    }
  };
  const point = macro.points.find((p) => p.id === selected);
  const statusLabel = {
    idle: 'Pronto',
    recording: 'Gravando',
    playing: 'Em execução',
    paused: 'Pausado',
  }[playback.status];
  return (
    <div className="app-shell">
      <nav className="app-rail" aria-label="Navegação principal">
        <a className="brand-mark" href="#workspace" aria-label="Macro Clicker">
          <MousePointer2 size={24} />
        </a>
        <button
          className={tab === 'editor' ? 'rail-active' : ''}
          onClick={() => setTab('editor')}
          aria-label="Bancada"
        >
          <Grid2X2 size={20} />
        </button>
        <button
          onClick={() => {
            playback.stop();
            setTab('export');
          }}
          className={tab === 'export' ? 'rail-active' : ''}
          aria-label="Exportar"
        >
          <ArrowUpRight size={21} />
        </button>
        <div className="rail-spacer" />
        <button onClick={() => setHelp(true)} aria-label="Atalhos e ajuda">
          <Keyboard size={20} />
        </button>
        <span className="rail-version">1.0</span>
      </nav>
      <div className={'library-shell ' + (showLibrary ? 'mobile-open' : '')}>
        <div className="product-name">
          Macro Clicker<span>WORKSPACE</span>
        </div>
        <SavedMacrosManager
          macros={library.macros}
          activeId={macro.id}
          onLoad={load}
          onNew={() =>
            guard(() => {
              setMacro(newMacro());
              setSelected(null);
              setDirty(false);
              setTab('editor');
              setShowLibrary(false);
            })
          }
          onDelete={(m) =>
            setPending({
              message: 'Excluir “' + m.name + '” da biblioteca local?',
              action: () => {
                try {
                  library.remove(m.id);
                  if (m.id === macro.id) setDirty(true);
                  notify('Sequência removida da biblioteca.');
                } catch (e) {
                  notify(errorMessage(e), true);
                }
              },
            })
          }
          onImport={(f) => void upload(f)}
        />
      </div>
      <div className="main-shell" id="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu icon-button"
              onClick={() => setShowLibrary(!showLibrary)}
              aria-label="Abrir biblioteca"
            >
              <Menu size={17} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>
              {tab === 'editor' ? 'Bancada de automação' : 'Exportação'}
            </strong>
          </div>
          <div className="topbar-right">
            <span className={'status-badge ' + playback.status}>
              <span />
              {statusLabel}
            </span>
            <button
              className="icon-button"
              onClick={() => setHelp(true)}
              aria-label="Ver atalhos"
            >
              <Keyboard size={17} />
            </button>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <span className="eyebrow">SEQUÊNCIA DE AUTOMAÇÃO</span>
              <input
                className="macro-title"
                aria-label="Nome da sequência"
                maxLength={120}
                value={macro.name}
                disabled={locked}
                onChange={(e) => update({ name: e.target.value })}
              />
              <div className="save-state">
                <span className={dirty ? 'unsaved-dot' : 'saved-dot'} />
                {dirty ? 'Alterações não salvas' : 'Versão de trabalho'}
                <span className="subtle">/ {macro.points.length} ações</span>
              </div>
            </div>
            <div className="heading-actions">
              <button disabled={locked} onClick={() => save(true)}>
                <FolderPlus size={15} /> Salvar cópia
              </button>
              <button
                className="dark-button"
                disabled={locked}
                onClick={() => save()}
              >
                <Save size={15} /> Salvar sequência
              </button>
            </div>
          </div>
          <div className="workspace-tabs">
            <button
              className={tab === 'editor' ? 'active' : ''}
              onClick={() => setTab('editor')}
            >
              Editor de sequência
            </button>
            <button
              className={tab === 'export' ? 'active' : ''}
              onClick={() => {
                playback.stop();
                setTab('export');
              }}
            >
              Exportar & backup <ArrowUpRight size={13} />
            </button>
            <span>Armazenamento neste dispositivo</span>
          </div>
          {notice && (
            <div
              className={'notice ' + (notice.error ? 'error' : '')}
              role={notice.error ? 'alert' : 'status'}
            >
              <span>{notice.error ? '!' : <Check size={16} />}</span>
              {notice.message}
              <button
                className="icon-button"
                onClick={() => setNotice(null)}
                aria-label="Fechar mensagem"
              >
                <X size={15} />
              </button>
            </div>
          )}
          {tab === 'editor' ? (
            <>
              <AnalysisPanel macro={macro} />
              <div className="editor-layout">
                <div className="workspace-column">
                  <section className="board panel">
                    <div className="board-toolbar">
                      <div className="surface-tabs">
                        {(
                          [
                            {
                              mode: 'interactive-sandbox',
                              label: 'Laboratório',
                              icon: FlaskConical,
                            },
                            {
                              mode: 'screen-capture',
                              label: 'Tela ao vivo',
                              icon: Monitor,
                            },
                            {
                              mode: 'custom-image',
                              label: 'Imagem',
                              icon: Image,
                            },
                            {
                              mode: 'calibration-grid',
                              label: 'Grade',
                              icon: Grid2X2,
                            },
                          ] as const
                        ).map((item) => (
                          <button
                            key={item.mode}
                            disabled={locked}
                            className={
                              macro.surface.mode === item.mode ? 'selected' : ''
                            }
                            onClick={() => mode(item.mode)}
                          >
                            <item.icon size={14} />
                            {item.label}
                          </button>
                        ))}
                      </div>
                      <span className="board-caption">ÁREA DE TRABALHO</span>
                    </div>
                    <ClickCanvas
                      ref={canvas}
                      macro={macro}
                      status={playback.status}
                      step={playback.progress.step}
                      onRecord={addRecord}
                      onSurface={changeSurface}
                    />
                    <PlaybackControls
                      status={playback.status}
                      count={macro.points.length}
                      onRecord={startRecord}
                      onPlay={play}
                      onPause={playback.pause}
                      onStop={playback.stop}
                    />
                    {playback.status !== 'idle' && (
                      <div className="execution-progress" role="status">
                        Ciclo {playback.progress.loop} /{' '}
                        {macro.settings.loops || '∞'}
                        <span>
                          Ação {Math.max(0, playback.progress.step + 1)} /{' '}
                          {macro.points.length}
                        </span>
                        <span>
                          {playback.progress.clicks} cliques concluídos
                        </span>
                      </div>
                    )}
                  </section>
                  <SequenceEditor
                    macro={macro}
                    selected={selected}
                    locked={locked}
                    onSelect={setSelected}
                    onChange={(points) => update({ points })}
                    onClear={clear}
                    onTest={(p) => {
                      setSelected(p.id);
                      playback.play({
                        ...macro,
                        points: [p],
                        settings: { ...macro.settings, loops: 1 },
                      });
                    }}
                    onDuplicate={(id) => {
                      if (macro.points.length >= 2000) return;
                      const index = macro.points.findIndex((p) => p.id === id);
                      if (index === -1) return;
                      const original = macro.points[index];
                      const duplicate = {
                        ...original,
                        id: crypto.randomUUID(),
                        label: original.label + ' (cópia)',
                        timestamp: Date.now(),
                      };
                      const nextPoints = [...macro.points];
                      nextPoints.splice(index + 1, 0, duplicate);
                      update({ points: nextPoints });
                      setSelected(duplicate.id);
                    }}
                  />
                  <label className="description-label">
                    NOTAS DA SEQUÊNCIA
                    <textarea
                      placeholder="Descreva o objetivo ou os cuidados desta automação…"
                      maxLength={2000}
                      rows={2}
                      disabled={locked}
                      value={macro.description}
                      onChange={(e) => update({ description: e.target.value })}
                    />
                  </label>
                </div>
                <Inspector
                  macro={macro}
                  point={point}
                  locked={locked}
                  onPoint={(point) =>
                    update({
                      points: macro.points.map((p) =>
                        p.id === point.id ? point : p,
                      ),
                    })
                  }
                  onSettings={(settings) => update({ settings })}
                />
              </div>
            </>
          ) : (
            <ScriptExporter
              macro={macro}
              locked={locked}
              onTarget={(target) => update({ target })}
              onNotice={notify}
            />
          )}
          <footer className="workspace-footer">
            <span>
              MACRO CLICKER <b>/</b> BANCADA LOCAL
            </span>
            <span>
              Prévia no navegador. Execução externa via scripts exportados.
            </span>
          </footer>
        </main>
      </div>
      {help && (
        <Modal title="Atalhos da bancada" onClose={() => setHelp(false)}>
          <p>Os atalhos funcionam no editor, fora dos campos de texto.</p>
          <div className="shortcut">
            <span>Iniciar / concluir gravação</span>
            <kbd>R</kbd>
          </div>
          <div className="shortcut">
            <span>Executar / pausar / retomar</span>
            <kbd>Espaço</kbd>
          </div>
          <div className="shortcut">
            <span>Interromper execução</span>
            <kbd>Esc</kbd>
          </div>
          <p className="field-help">
            A gravação acrescenta etapas. Dois cliques próximos viram uma ação
            dupla; segurar por 400 ms ou mais registra um pressionamento. Em
            imagens e captura, os cliques externos precisam ser executados pelo
            script exportado.
          </p>
          <button className="primary" onClick={() => setHelp(false)}>
            Entendido
          </button>
        </Modal>
      )}
      {pending && (
        <Modal title="Confirmar alteração" onClose={() => setPending(null)}>
          <p>{pending.message}</p>
          <div className="button-group">
            <button onClick={() => setPending(null)}>Cancelar</button>
            <button
              className="primary"
              onClick={() => {
                const action = pending.action;
                setPending(null);
                action();
              }}
            >
              Continuar
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
