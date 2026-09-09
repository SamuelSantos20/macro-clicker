import { useRef, useState } from 'react';
import type { Macro } from '../types';
import { parseMacro, errorMessage } from '../utils/model';
const KEY = 'macro_clicker_library_v2';
const LEGACY = 'macro_clicker_saved_macros_v1';
export function useLibrary() {
  const [initial] = useState(() => {
    try {
      const raw = localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY);
      if (!raw) return { macros: [] as Macro[], error: '' };
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length > 200)
        throw new Error('Biblioteca inválida.');
      const macros: Macro[] = [];
      let invalid = 0;
      for (const entry of parsed) {
        try {
          const macro = parseMacro(entry);
          if (macros.some((m) => m.id === macro.id))
            throw new Error('ID duplicado');
          macros.push(macro);
        } catch {
          invalid++;
        }
      }
      return {
        macros,
        error: invalid
          ? invalid +
            ' registro(s) inválido(s) não foram carregados. A biblioteca original foi preservada.'
          : '',
      };
    } catch (error) {
      return {
        macros: [] as Macro[],
        error: 'Não foi possível carregar a biblioteca: ' + errorMessage(error),
      };
    }
  });
  const [macros, setMacros] = useState(initial.macros);
  const backedUp = useRef(false);
  const persist = (next: Macro[]) => {
    if (next.length > 200)
      throw new Error('A biblioteca permite até 200 macros.');
    const validated = next.map(parseMacro);
    if (initial.error && !backedUp.current) {
      const original = localStorage.getItem(KEY);
      if (original)
        localStorage.setItem(KEY + '_recovery_' + Date.now(), original);
      backedUp.current = true;
    }
    // Write first: no success state if quota or storage access fails.
    localStorage.setItem(KEY, JSON.stringify(validated));
    setMacros(validated);
  };
  return {
    macros,
    initialError: initial.error,
    save: (macro: Macro) =>
      persist([parseMacro(macro), ...macros.filter((m) => m.id !== macro.id)]),
    remove: (id: string) => persist(macros.filter((m) => m.id !== id)),
  };
}
