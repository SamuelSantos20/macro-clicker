# Correções e validação

Revisão de 9 de setembro de 2026. Escopo: problemas identificados na análise do projeto, reformulação da interface e prevenção de regressões.

## Correções funcionais

| Problema                                                | Implementação e evidência                                                                                                                                                   |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Marcadores interceptavam a prévia                       | Camadas visuais ignoram eventos; os alvos são resolvidos dentro dos controles do laboratório. Gravação e reprodução verificadas no navegador, inclusive após redimensionar. |
| Coordenadas dependiam do tamanho da interface           | Superfície lógica com transformação explícita. Testes de escalas, limites e origens negativas.                                                                              |
| Captura conectava o stream antes de montar o vídeo      | Vídeo montado antes da conexão, tratamento de resolução, recusa e limpeza. Testes de componentes com MediaStream substituto.                                                |
| Pausa repetia etapas ou perdia esperas                  | Motor com espera restante e sequência imutável durante execução; testes com relógio controlado para pausa, retomada, cancelamento e laço infinito.                          |
| Botões e pressionamentos perdiam semântica              | Eventos de pressionar/soltar, botão do meio, clique direito, clique duplo e duração de segurar preservados.                                                                 |
| Temporização incluía o tempo ocioso anterior à gravação | Relógio reiniciado ao começar a captura; teste do primeiro intervalo.                                                                                                       |
| Importação e biblioteca aceitavam dados inconsistentes  | Validação de tipo, limites, versão, identificadores e coordenadas; migração dos formatos anteriores; preservação de loops zero.                                             |
| Salvamento e cópia anunciavam sucesso sem concluir      | Estado de sucesso apenas após a operação; testes de quota, biblioteca parcialmente inválida e clipboard ausente/recusado.                                                   |
| Exportação perdia informações                           | JSON v2 com descrição, imagem, referência, parâmetros e calibração; teste de ida e volta e limite de tamanho.                                                               |
| Interface não oferecia fluxo operacional claro          | Biblioteca lateral, tabela de etapas, painel de parâmetros, laboratório funcional e exportação separada. Navegação responsiva e controles com nomes acessíveis.             |
| Qualidade dependia apenas de compilação permissiva      | TypeScript estrito, ESLint, testes automatizados e workflow de validação em pushes e pull requests. Dependências e configurações do template sem uso removidas.             |

## Fronteira de segurança dos scripts

**Invariante:** editar ou importar nome, rótulo, nota ou valores de configuração não pode introduzir instruções arbitrárias em Python, AutoHotkey ou Bash.

O caminho validado é entrada/importação → modelo → gerador público → script. `parseMacro` valida números finitos, limites e opções permitidas; os geradores chamam essa validação novamente. Textos livres não entram no código gerado. O JSON preserva esses textos sem executá-los.

`tests/core.test.ts` cobre aspas, quebras de linha, delimitadores, substituição de shell, escapes do AutoHotkey e separadores Unicode; também chama os geradores diretamente com parâmetros inválidos. Scripts vazios e destinos sem calibração confirmada são recusados.

Uma investigação independente conferiu as entradas legadas e a exposição dos geradores. Uma revisão independente da correção não encontrou injeção residual e identificou três regressões adicionais, corrigidas e cobertas em `tests/export-runtime.test.ts`:

1. Liberação de botão no Python mesmo quando a proteção de canto da tela interrompe a execução. A proteção é restaurada imediatamente após a limpeza.
2. Intervalo único de 80 ms entre os dois cliques, sem a espera extra de uma chamada agregada do PyAutoGUI.
3. Variação temporal em Bash com alcance positivo e negativo até o limite configurado, combinando dois valores de `RANDOM`.

## Verificações realizadas

- `npm run check`: ESLint, 26 testes, TypeScript estrito e build Vite.
- Python: compilação e execução dos scripts gerados com módulo PyAutoGUI substituto, incluindo interrupção durante pressionamento.
- Bash: `bash -n` e execução com comandos de mouse/espera substitutos, incluindo botões e amostragem da variação máxima.
- Navegador: gravação, reprodução com incremento real do estoque, reprodução após alteração para viewport de 390 × 844, ausência de transbordamento horizontal da página e salvamento na biblioteca.
- AutoHotkey: verificação das saídas e semântica esperada nos testes; não houve execução em interpretador AutoHotkey v2.

Os testes de captura usam permissões e streams simulados. Não foi capturada uma tela pessoal nem realizada automação nativa de cliques durante a validação. Permissões reais, múltiplos monitores, escala do sistema e comportamento de aplicativos externos dependem do ambiente e não são comprovados por esta suíte.

As durações exibidas são estimativas calculadas com os intervalos configurados. Temporizadores do navegador e ferramentas nativas podem sofrer atrasos do sistema; não há garantia de tempo real.
