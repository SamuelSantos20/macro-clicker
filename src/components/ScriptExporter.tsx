import { useState } from 'react';
import { Download, Copy, Check } from 'lucide-react';
import type { Macro, TargetRegion } from '../types';
import {
  generatePythonScript,
  generateAhkScript,
  generateBashScript,
} from '../utils/macroEngine';
import { serializeMacro, errorMessage } from '../utils/model';
interface Props {
  macro: Macro;
  locked: boolean;
  onTarget: (target: TargetRegion) => void;
  onNotice: (message: string, error?: boolean) => void;
}
export function ScriptExporter({ macro, locked, onTarget, onNotice }: Props) {
  const [format, setFormat] = useState<'python' | 'ahk' | 'bash' | 'json'>(
    'python',
  );
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    setCopied(false);
    try {
      if (!navigator.clipboard)
        throw new Error(
          'Área de transferência indisponível neste navegador. Baixe o arquivo.',
        );
      await navigator.clipboard.writeText(content);
      setCopied(true);
      onNotice('Conteúdo copiado.');
    } catch (error) {
      onNotice('Não foi possível copiar: ' + errorMessage(error), true);
    }
  };
  let content = '',
    error = '';
  try {
    content =
      format === 'json'
        ? serializeMacro(macro)
        : format === 'python'
          ? generatePythonScript(macro)
          : format === 'ahk'
            ? generateAhkScript(macro)
            : generateBashScript(macro);
  } catch (e) {
    error = errorMessage(e);
  }
  const download = () => {
    const url = URL.createObjectURL(
      new Blob([content], {
        type:
          format === 'json' ? 'application/json' : 'text/plain;charset=utf-8',
      }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download =
      'macro_' +
      (macro.name.replace(/[^a-zA-Z0-9_-]/g, '_') || 'sequencia') +
      '.' +
      { python: 'py', ahk: 'ahk', bash: 'sh', json: 'json' }[format];
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <section className="export-panel panel">
      <div className="panel-heading">
        <div>
          <h2>Exportar sequência</h2>
          <p>Execute no computador ou guarde um backup completo.</p>
        </div>
      </div>
      <div className="export-body">
        <label>
          Formato
          <select
            value={format}
            onChange={(e) => {
              setFormat(e.target.value as typeof format);
              setCopied(false);
            }}
          >
            <option value="python">Python 3 · PyAutoGUI</option>
            <option value="ahk">Windows · AutoHotkey v2</option>
            <option value="bash">Linux X11 · xdotool</option>
            <option value="json">Backup completo · JSON v2</option>
          </select>
        </label>
        {format !== 'json' && (
          <fieldset disabled={locked}>
            <legend>Área de destino no computador</legend>
            <p className="field-help">
              Informe a posição e o tamanho da área representada pela
              referência, em pixels. Para uma janela, use sua área de conteúdo.
              Mantenha posição, resolução e escala durante a execução.
            </p>
            <div className="fields four">
              {(['x', 'y', 'width', 'height'] as const).map((key, i) => (
                <label key={key}>
                  {['Origem X', 'Origem Y', 'Largura', 'Altura'][i]}
                  <input
                    type="number"
                    min={i < 2 ? -32768 : 1}
                    max={i < 2 ? 32768 : 16384}
                    value={macro.target[key]}
                    onChange={(e) =>
                      onTarget({
                        ...macro.target,
                        [key]: Number(e.target.value),
                        confirmed: false,
                      })
                    }
                  />
                </label>
              ))}
            </div>
            <label className="check-label">
              <input
                type="checkbox"
                checked={macro.target.confirmed}
                onChange={(e) =>
                  onTarget({ ...macro.target, confirmed: e.target.checked })
                }
              />{' '}
              Conferi a área de destino e a escala da referência
            </label>
          </fieldset>
        )}
        <div className="export-guidance">
          {format === 'python'
            ? 'Instale Python 3 e PyAutoGUI (python -m pip install pyautogui). Início após 3 s. Ctrl+C ou canto da tela interrompe.'
            : format === 'ahk'
              ? 'Requer AutoHotkey v2. F8 inicia; Esc encerra e libera os botões pressionados.'
              : format === 'bash'
                ? 'Requer Bash, awk e xdotool em uma sessão X11. Início após 3 s; Ctrl+C interrompe.'
                : 'Preserva ações, imagem, referência, parâmetros e calibração. Compatível com importação nesta bancada.'}
        </div>
        {error ? (
          <p className="export-empty">{error}</p>
        ) : (
          <pre className="code-preview">
            <code>{content}</code>
          </pre>
        )}
        <div className="button-group">
          <button className="primary" disabled={!!error} onClick={download}>
            <Download size={14} /> Baixar arquivo
          </button>
          <button
            disabled={!!error}
            onClick={() => {
              void copy();
            }}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}{' '}
            {copied ? 'Copiado' : 'Copiar'}
          </button>
        </div>
      </div>
    </section>
  );
}
