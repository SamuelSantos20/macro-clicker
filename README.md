# Macro Clicker

Bancada local para gravar, editar e testar sequências de cliques, com exportação para Python/PyAutoGUI, AutoHotkey v2 e Bash/xdotool. Interface em português, biblioteca de sequências, editor por etapas e parâmetros de execução.

## Executar o projeto

Requer Node.js 22.13 ou superior na linha 22 LTS e npm.

```sh
npm ci
npm run dev
```

Abra http://127.0.0.1:5173. Não é necessário configurar API, banco de dados ou arquivo `.env`.

```sh
npm run check        # ESLint, testes, TypeScript estrito e build
npm run build        # gera dist/
npm run preview      # serve o build localmente
npm run format       # formata o código com Prettier
npm run format:check # verifica a formatação
npm run clean        # remove apenas dist/
```

## Fluxo de uso

1. Dê um nome à sequência e escolha Laboratório, Tela ao vivo, Imagem ou Grade.
2. Clique em **Gravar ações**, interaja com a referência e conclua a gravação. Também é possível adicionar ações manualmente.
3. Selecione uma etapa para editar posição, espera, botão, clique simples/duplo ou duração de pressionamento. A tabela permite reordenar, testar e excluir etapas.
4. Ajuste repetições, velocidade, intervalo fixo ou gravado e variação de posição/espera. Zero repetições significa execução contínua até parar.
5. Execute a prévia. Pausar preserva a espera restante; retomar continua a etapa. Durante a gravação ou execução, os parâmetros ficam bloqueados.
6. Salve na biblioteca local e exporte um JSON para backup. Para gerar scripts, confira a origem e as dimensões da área de destino.

Atalhos fora dos campos de edição: **R** grava/conclui, **Espaço** executa/pausa/retoma e **Esc** interrompe.

O primeiro intervalo é contado a partir do início da gravação. Pressionamentos de pelo menos 400 ms são gravados como ações de segurar; dois cliques próximos podem formar uma ação dupla. A velocidade altera as esperas; a duração de segurar e os 80 ms entre cliques duplos permanecem explícitos.

## Referências e execução externa

A prévia aciona os controles do laboratório. Nos outros modos, ela mostra os pontos sobre a referência. **Uma página web não controla outras janelas do computador**: a captura de tela fornece uma imagem ao vivo, e a execução externa acontece pelo script exportado.

As coordenadas pertencem à resolução da referência, independentemente do tamanho da interface. A exportação transforma os percentuais dos pontos na área de destino informada. Para uma janela, informe a origem e o tamanho de sua área de conteúdo; mantenha posição, resolução e escala durante a execução. A variação espacial é limitada à área calibrada.

| Formato           | Requisitos                                   | Início / interrupção                                   |
| ----------------- | -------------------------------------------- | ------------------------------------------------------ |
| Python `.py`      | Python 3 e `python -m pip install pyautogui` | Aguarda 3 segundos; Ctrl+C ou canto da tela interrompe |
| AutoHotkey `.ahk` | AutoHotkey **v2**, Windows                   | F8 inicia; Esc encerra e libera os botões              |
| Bash `.sh`        | Bash, awk, xdotool e sessão Linux **X11**    | Aguarda 3 segundos; Ctrl+C interrompe                  |
| JSON `.json`      | A própria bancada                            | Backup e importação, sem executar cliques              |

O suporte a monitores e permissões depende da ferramenta escolhida. PyAutoGUI tem limitações em múltiplos monitores; xdotool não fornece este fluxo em Wayland. Os scripts não localizam janelas automaticamente nem detectam mudanças no conteúdo da tela.

Captura de tela requer um navegador compatível, contexto seguro (HTTPS ou localhost) e seleção explícita da fonte. O vídeo é encerrado ao parar a captura ou sair dessa referência. Imagens aceitas: PNG, JPEG e WebP, até 2 MB e 16.384 pixels por dimensão.

## Dados e recuperação

- A biblioteca fica no `localStorage` deste navegador e desta origem, na chave `macro_clicker_library_v2`. Não há sincronização com GitHub nem servidor de macros. O limite é 200 sequências, sujeito à quota do navegador.
- O JSON v2 preserva descrição, ações, parâmetros, imagem e calibração. Limites: 2.000 ações e arquivo de até 4 MB. Um backup que excederia o limite de importação é recusado com uma mensagem.
- Os dois formatos anteriores são migrados na leitura, incluindo repetições contínuas e esperas fracionárias. A chave antiga `macro_clicker_saved_macros_v1` permanece disponível.
- Registros inválidos não são carregados. Se uma biblioteca v2 parcialmente inválida precisar ser atualizada, o conteúdo original é copiado para uma chave `macro_clicker_library_v2_recovery_<timestamp>` antes da escrita. Falhas de quota são exibidas e não são anunciadas como salvamento concluído.
- Exporte backups antes de limpar dados do navegador. Alterações não salvas geram confirmação ao trocar de sequência e aviso ao fechar a página.

## Estrutura

| Caminho                    | Responsabilidade                                      |
| -------------------------- | ----------------------------------------------------- |
| `src/utils/model.ts`       | Validação, migração e serialização                    |
| `src/utils/coordinates.ts` | Transformação entre referência, interface e destino   |
| `src/utils/recording.ts`   | Identificação e temporização das ações gravadas       |
| `src/utils/playback.ts`    | Motor de reprodução com relógio injetável             |
| `src/utils/macroEngine.ts` | Geradores de scripts e estimativas                    |
| `src/hooks/`               | Integração React da execução e da biblioteca          |
| `src/components/`          | Bancada, referências, editor, parâmetros e exportação |
| `tests/`                   | Regressões de modelo, execução, componentes e scripts |

Nomes, rótulos e notas são mantidos como dados no JSON; não são interpolados no código executável. Todos os geradores revalidam os valores em sua própria entrada. Veja [validação e limites dos testes](docs/VALIDATION.md).

Os testes de scripts usam Python e Bash com substitutos para os comandos de mouse, sem acionar o sistema operacional. Quando um interpretador não está disponível, esses testes são marcados como ignorados; configure `PYTHON_BINARY` ou `BASH_BINARY` com o caminho do executável para habilitá-los. A integração contínua executa a suíte em Ubuntu com Node 22.
