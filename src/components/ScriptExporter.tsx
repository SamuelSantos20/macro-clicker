import { useState } from 'react';
import { ClickPoint, PlaybackSettings } from '../types';
import { generatePythonScript, generateAhkScript, generateBashScript } from '../utils/macroEngine';
import { Copy, Download, Check, Terminal, FileCode2 } from 'lucide-react';

interface ScriptExporterProps {
  points: ClickPoint[];
  settings: PlaybackSettings;
  macroName: string;
}

type ExportTab = 'python' | 'ahk' | 'bash' | 'json';

export function ScriptExporter({ points, settings, macroName }: ScriptExporterProps) {
  const [activeTab, setActiveTab] = useState<ExportTab>('python');
  const [copied, setCopied] = useState(false);

  const getScriptContent = (): string => {
    if (activeTab === 'python') {
      return generatePythonScript(points, settings, macroName);
    }
    if (activeTab === 'ahk') {
      return generateAhkScript(points, settings, macroName);
    }
    if (activeTab === 'bash') {
      return generateBashScript(points, settings, macroName);
    }
    return JSON.stringify(
      {
        macroName,
        createdAt: new Date().toISOString(),
        settings,
        pointsCount: points.length,
        points,
      },
      null,
      2
    );
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getScriptContent()).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const content = getScriptContent();
    const extensions: Record<ExportTab, string> = {
      python: 'py',
      ahk: 'ahk',
      bash: 'sh',
      json: 'json',
    };
    const mimeTypes: Record<ExportTab, string> = {
      python: 'text/x-python',
      ahk: 'text/plain',
      bash: 'application/x-sh',
      json: 'application/json',
    };

    const ext = extensions[activeTab];
    const mime = mimeTypes[activeTab];
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `macro_${macroName.toLowerCase().replace(/[^a-z0-9]/g, '_')}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="script-exporter-panel" className="flex flex-col h-full space-y-3">
      {/* Header and format selector */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
        <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('python')}
            className={`px-3 py-1 rounded font-semibold transition cursor-pointer ${
              activeTab === 'python' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Python (PyAutoGUI)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ahk')}
            className={`px-3 py-1 rounded font-semibold transition cursor-pointer ${
              activeTab === 'ahk' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            AutoHotkey (.ahk)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bash')}
            className={`px-3 py-1 rounded font-semibold transition cursor-pointer ${
              activeTab === 'bash' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Linux (xdotool)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('json')}
            className={`px-3 py-1 rounded font-semibold transition cursor-pointer ${
              activeTab === 'json' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            JSON Raw
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copiado!' : 'Copiar'}
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Baixar Arquivo
          </button>
        </div>
      </div>

      {/* Description tag */}
      <div className="text-[11px] text-slate-400 flex items-center gap-2">
        <Terminal className="w-3.5 h-3.5 text-indigo-400" />
        <span>
          {activeTab === 'python' && 'Script Python pronto para rodar no seu computador com coordenadas calibradas por porcentagem de tela.'}
          {activeTab === 'ahk' && 'Script para AutoHotkey (Windows). Pressione F8 para rodar no jogo ou software, e ESC para parar.'}
          {activeTab === 'bash' && 'Script Bash para Linux utilizando xdotool para cliques automáticos no X11.'}
          {activeTab === 'json' && 'Estrutura JSON com coordenadas, delays e parâmetros salvos para backup ou integração.'}
        </span>
      </div>

      {/* Code Viewer */}
      <div className="relative flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3 overflow-hidden">
        <div className="absolute top-2 right-2 text-[10px] uppercase font-mono text-slate-500 flex items-center gap-1">
          <FileCode2 className="w-3 h-3" />
          {activeTab}
        </div>
        <pre className="w-full h-full overflow-auto text-xs font-mono text-emerald-300 leading-relaxed custom-scrollbar pt-2">
          <code>{getScriptContent()}</code>
        </pre>
      </div>
    </div>
  );
}
