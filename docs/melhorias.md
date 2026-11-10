# Relatório — Typeoff V2.0

Base: Typeoff-main.zip (V1.0) + Matriz Consolidada, Plano de Melhorias e Dossiê de Avaliação. O ZIP original não foi alterado.

## 1. Problemas tratados (P01–P18)
| ID | Situação | O que foi feito |
|---|---|---|
| P01 | Corrigido (verificado por cálculo) | `--cinza-medio` #9A9590 (2,97:1) → #5F5A55 (6,8:1); textos claros da sidebar/hero/landing com alfa ≥ .86; tokens de sucesso/aviso/dourado para texto; 43 pares de cores verificados ≥ 4,5:1. Tema escuro opcional (botão na barra lateral), sem mudar o tema padrão. |
| P02 | Corrigido | `<main>`, `<header>`, um `<h1>` por página, hierarquia h1→h2→h3, `meta description` em todas as páginas, link "Pular para o conteúdo", `Cache-Control` nos estáticos, `charset`, `nosniff`. |
| P03 | Corrigido | `label for` em todos os campos do Perfil, Gerenciar e Professor; `aria-label` onde não há rótulo visível; erros com `role="alert"`/`aria-invalid`. |
| P04 | Implementado; NVDA não testado | Cartões e linhas viraram links/botões focáveis; abas ARIA com setas; foco visível global; foco e Esc em modais; foco movido ao feedback do quiz; respeito a `prefers-reduced-motion` e preferência salva de movimento reduzido. |
| P05 | Corrigido (causa-raiz) | O quiz da unidade chamava a API sem categoria e misturava as questões de **diagnóstico e avaliação final** nas formativas (daí "Questão X de 10" e repetições). Agora só formativas. Servidor também oculta provisórias/repetidas; cadastro bloqueia duplicatas; migração substitui as já gravadas. |
| P06 | Corrigido | Cadastro/edição recusam "Teste", enunciado vazio ou sem explicação; migração troca a questão provisória por uma completa da reserva (mesmo registro). |
| P07 | Corrigido | Q2 (U1) reescrita com o algoritmo completo numerado; Q13 sem `\n` literal (também corrige bug do `onclick` inline que tornava a questão irrespondível); Q21 mostra os três códigos; Q24 com gramática corrigida; linhas numeradas em todo código. |
| P08 | Corrigido | Realce das diferenças de sintaxe (tipos, E/S, blocos, operadores, decisão/repetição, estrutura) com legenda e opção de desligar; não depende só de cor (sublinhados distintos). Palavras comuns (if/while/for) **não** são realçadas — isso é o que permanece. |
| P09 | Corrigido | Introdução da comparação, "O que observar" **antes** dos códigos e por linguagem, quadro "o que muda / o que permanece". |
| P10 | Corrigido (layout só verificado no CSS) | Três colunas a partir de 1180 px; empilhado abaixo; quebra de linha do código sem rolagem horizontal. |
| P11 | Implementado | Práticas leves "completar código" (lacunas) e "ordenar linhas" (botões ▲▼ acessíveis), 2 por unidade, com o mesmo endpoint e a regra dos 80%. Sem editor de código. |
| P12 | Corrigido | Objetivos, revisão rápida e meta de cada etapa por unidade (conteúdo complementar em `public/js/complemento.js`; um registro `objetivos` no banco tem prioridade). |
| P13 | Implementado | Diagramas SVG (fluxogramas, variável, 3 linguagens) com descrição em texto; referências por unidade. **Confira as edições/URLs** das referências. |
| P14 | Corrigido | Conteúdo em blocos expansíveis ("Expandir/Recolher todos"). Nada foi removido. |
| P15 | Corrigido | Selo "★ Recomendada" + borda dourada na unidade indicada pelo diagnóstico (sem mudar o cálculo). |
| P16 | Corrigido | Botão de menu (☰) para telas ≤ 768 px — na V1.0 o menu ficava oculto sem como abri-lo —, estado atual no menu, alvos ≥ 40 px. |
| P17 | Investigado; sem alterar gabaritos | Causas encontradas no código: mistura de categorias no quiz, Q13 irrespondível, "Teste", repetidas. Gabaritos e 80% intactos. O efeito real só se mede com dados novos. |
| P18 | Implementado | Telemetria (tempo por aba, aberturas, resultado por tentativa) + tempo/tentativa por questão; nova aba **Desempenho e uso** no Painel do Professor, com alertas por questão e marcação de contas de teste. Identidade vem da sessão; eventos validados e limitados. Registros antigos preservados (só passam a ter tempo/tentativa daqui em diante). |
| P19/P20 | Não tratados no software (por orientação) | São limitações do processo de avaliação. |

## 2. Alterações que mudam comportamento (leia)
1. O quiz de cada unidade tem apenas questões **formativas** (V1.0 misturava diagnóstico e final). O número de questões muda; o limiar de 80% não.
2. Estudantes não veem questões provisórias/repetidas (nada é apagado).
3. Cadastro de questões ficou mais rígido (explicação obrigatória, sem duplicata).
4. Listagens do professor deixaram de devolver o campo `senha`.
5. `db/seed_content.js` (gerador legado) exige `--force` para não desfazer as correções.

## 3. Arquivos
Alterados: `server.js`, `db/database.js`, `db/dados.json`, `db/seed_content.js`, `package.json`, `public/css/style.css`, `public/js/app.js`, e todas as páginas HTML. Novos: `lib/validacao.js`, `lib/analytics.js`, `db/atualizar_conteudo.js`, `db/correcoes_conteudo.json`, `public/js/{unidade,conteudo-v2,tema}.js`, `tests/`, `README.md`, `docs/`.

## 4. Preservado
Identidade visual e paleta, estrutura e navegação, Python/Java/C, conteúdos e unidades, login/sessões, Firebase/Firestore e estrutura das coleções (apenas campos novos e a coleção `telemetria`), progresso, respostas, certificados, painel do professor, bloqueio com 80%.

## 5. Testes (85 automatizados, todos passando no ambiente de desenvolvimento)
- Unitários/contraste (43): validação de questões, analytics, realçador, pares de cores.
- Integração (13, servidor real + banco em memória): cache/cabeçalhos, seed, auth, bloqueio e liberação com 80%, correção de práticas, telemetria válida/inválida, analytics, permissões, validação de cadastro, ocultação de provisórias/repetidas, migração (simulação, aplicação, idempotência, backup, dados intactos).
- Front-end (29, jsdom + axe-core): estrutura de todas as páginas; renderização e fluxo de dashboard, unidade (conteúdo, comparação, quiz, práticas até o resultado), professor, perfil, login e demais; **0 violações axe** (regras de contraste excluídas, pois o jsdom não calcula layout).

## 6. Não testado / limitações
- **Firebase real**: usei um banco em memória. A integração com Firestore, o deploy e a migração em dados reais **não foram executados** — rode `npm run atualizar:conteudo` (simulação) antes de aplicar.
- **Navegador real**: sem Chrome no ambiente. Layout (3 colunas, 375 px), aparência do tema escuro, foco visível e Lighthouse/WAVE/Skynet **não foram medidos**. O contraste foi verificado por cálculo de pares, não por varredura da página renderizada.
- **NVDA/leitores de tela e teclado em navegador real**: não testados (só jsdom).
- Tema escuro não cobre diagnóstico, avaliação final, landing, login e certificado (mantêm o visual claro).
- Atividades práticas não têm editor visual em Gerenciar (inserir via migração/Firestore).
- Segurança fora do escopo, **não alterada**: senhas em texto puro no Firestore; percentual de conclusão enviado pelo cliente. Recomenda-se tratar em seguida.
- Gagné 6–8 (praticar/avaliar): as práticas leves ajudam, mas não há editor/console; decisão pedagógica pendente.
- P19 e P20: ver protocolo de avaliação (amostra ≥ 15, pré/pós equivalentes, formulários e TCLE).


## 7. Atualização V2.1 — tamanho do texto e visual minimalista
- **Fonte ajustável:** botões A− / 100% / A+ (5 níveis: 90, 100, 115, 130, 150%), preferência salva (`localStorage`) e aplicada antes da pintura (`tema.js`). Todo o texto do CSS usa `rem`; a barra lateral cresce junto (limite de 340 px). Não escala o texto interno dos diagramas SVG.
- **Menos informação por tela, sem remover conteúdo:** cartões de unidade sem descrição visível (continua para leitores de tela), estatísticas em linha, breadcrumb simplificado; recolhidos por padrão: guia "Como ler esta comparação", "Revisão rápida", "O que muda e o que permanece", diagrama, referências, "Jornada de aprendizagem" e textos explicativos do painel do professor; o quadro "O que observar" geral não se repete quando já há notas por linguagem; um único botão Expandir/Recolher tudo.
- Nenhuma correção P01–P18 foi removida. 33 testes de front-end (4 novos), 43 unitários e 13 de integração passando.
- Não verificado em navegador real: aparência em 150% de fonte e em 375 px.

- **Tema escuro no diagnóstico inicial:** botão "☾ Tema escuro" ao lado do controle de fonte (canto inferior direito), mesma preferência das demais páginas, com versão escura de todas as classes da tela. A avaliação final continua só em tema claro (tem apenas o controle de fonte). Contraste do tema escuro do diagnóstico verificado por cálculo de pares; aparência não vista em navegador real.

## 8. Atualização V2.1 — tempos e mascote Typo
**Tempos.** `criarCronometro()` (app.js) conta só com a aba visível. Diagnóstico e avaliação final enviam `tempo_total_ms` e `tempo_ms` por questão; os exercícios enviam a duração de cada tentativa. O servidor aceita apenas valores dentro de limites (questão ≤ 30 min, prova ≤ 4 h, tentativa ≤ 2 h) e grava em `diagnostico_respostas`, `avaliacao_final_respostas`, `respostas` e `telemetria`. O estudante vê "tempo: X min Y s" ao concluir e no Progresso. No painel do professor: tempo médio no diagnóstico e na avaliação final, tempo por tentativa em cada unidade e, por estudante, diagnóstico, exercícios, avaliação final e tempo de uso. Só existe para atividades feitas depois da atualização.

**Typo.** Personagem em SVG (identidade `</>`), botão rotulado, painel acessível (`role="dialog"`, log com `aria-live`, Esc fecha e devolve o foco), dica contextual por tela e por etapa da unidade, resposta personalizada para "Por onde eu começo?" (lê o andamento via `/api/unidades`) e aviso do que ele não faz. Respostas do servidor são escapadas (sem HTML). O cliente só envia pergunta, página e etapa.

**Decisões a conhecer.**
1. Antes do diagnóstico concluído, o servidor trata o estudante como em avaliação: o Typo responde só sobre a plataforma. A restrição por página (`pagina`) vem do cliente e pode ser burlada por quem manipule a requisição; é uma barreira pedagógica, não de segurança.
2. A IA é opcional e **não foi testada contra a API real** (só com chamada simulada); falhas, tempo esgotado ou resposta vazia caem na base local. Perguntas enviadas à IA saem do servidor para a API da Anthropic (sem nome ou e-mail), então avise os estudantes e confira a política de privacidade da instituição antes de ativar.
3. As perguntas dos estudantes **não são armazenadas**.
4. A base local é uma lista de temas autorais por palavras-chave; perguntas fora dela recebem sugestões de temas. O professor deve revisar os textos.

**Testes.** Suíte: 62 unitários/contraste (incl. base do Typo e IA simulada), 18 de integração (tempos e rota do mascote) e 49 de front-end (Typo em todas as telas, painel, teclado, XSS, dica por etapa, axe com painel aberto e tema escuro, cronômetro, fluxo completo do diagnóstico e da avaliação final no jsdom). Não vistos em navegador real: posição do Typo em telas pequenas e sobreposição com outros elementos.
