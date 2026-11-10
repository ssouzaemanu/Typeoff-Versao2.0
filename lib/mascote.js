const norm = s => String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9+*\/=<>!&|%#\s]/g, ' ').replace(/\s+/g, ' ').trim();
const PAGINAS_AVALIACAO = ['diagnostico', 'avaliacao-final'];

const KB = [
  { id: 'o_que_e_typeoff', cat: 'plataforma', rotulo: 'O que é o Typeoff?', chaves: ['o que e o typeoff', 'typeoff', 'o que e a plataforma', 'para que serve o typeoff', 'proposta do typeoff'], resposta: 'O **Typeoff** ensina lógica de programação mostrando o **mesmo problema em Python, Java e C lado a lado**. Assim você vê o que muda (a sintaxe) e o que permanece (a lógica).', rel: ['como_funciona', 'unidades'] },
  { id: 'quem_e_typo', cat: 'plataforma', rotulo: 'Quem é você?', chaves: ['quem e voce', 'quem e vc', 'seu nome', 'typo', 'mascote', 'o que voce faz', 'voce e um robo'], resposta: 'Eu sou o **Typo**, o guia do Typeoff! Explico como usar cada tela e tiro dúvidas de lógica de programação. Nas avaliações eu só ajudo com o uso da plataforma, nunca com as respostas.', rel: ['como_funciona', 'duvida_conteudo'] },
  { id: 'como_funciona', cat: 'avaliacao', rotulo: 'Como funciona o curso?', chaves: ['como funciona o curso', 'como funciona o typeoff', 'como funciona a plataforma', 'como usar o typeoff', 'como usar a plataforma', 'passo a passo do curso', 'etapas do curso'], resposta: 'O caminho é: **1) Diagnóstico** (define seu ponto de partida) → **2) Unidades** 1 a 5, cada uma com *Conteúdo → Comparação → Exercícios* → **3) Avaliação Final** → **4) Certificado**. Para liberar a próxima unidade você precisa de **80%** nos exercícios.', rel: ['diagnostico', 'desbloquear', 'abas'] },
  { id: 'diagnostico', cat: 'avaliacao', rotulo: 'O que é o diagnóstico?', chaves: ['diagnostico', 'remanejamento', 'ponto de partida', 'teste inicial', 'prova inicial'], resposta: 'O **diagnóstico** tem 10 questões e serve só para indicar por qual unidade você deve começar (quanto mais acertos, mais adiante). Não é uma nota do curso. Você o faz uma vez, e a unidade indicada aparece com ★ **Recomendada** no Início.', rel: ['tempo', 'desbloquear'] },
  { id: 'desbloquear', cat: 'avaliacao', rotulo: 'Como libero a próxima unidade?', chaves: ['desbloquear', 'liberar', 'libero', 'libera', 'liberada', 'liberado', 'bloqueada', 'bloqueado', 'proxima unidade', '80%', 'oitenta', 'nao abre', 'cadeado'], resposta: 'Cada unidade seguinte só abre quando você acerta **pelo menos 80%** dos exercícios da unidade anterior. Se não chegou lá, revise o conteúdo e tente de novo — pode repetir quantas vezes precisar.', rel: ['nao_atingi', 'exercicios'] },
  { id: 'unidades', cat: 'plataforma', rotulo: 'Quais são as unidades?', chaves: ['unidades', 'quantas unidades', 'conteudo do curso', 'temas', 'modulos', 'programa do curso'], resposta: 'São 5 unidades: **1** Introdução à lógica de programação, **2** Variáveis, **3** Estruturas condicionais, **4** Estruturas de repetição e **5** Comparação entre linguagens.', rel: ['abas', 'como_funciona'] },
  { id: 'abas', cat: 'plataforma', rotulo: 'Como funcionam as etapas?', chaves: ['etapas', 'abas', 'conteudo comparacao exercicios', 'tres etapas', 'barra de etapas'], resposta: 'Cada unidade tem 3 etapas: **Conteúdo** (a teoria, em blocos que você abre um a um), **Comparação** (o mesmo código em Python, Java e C) e **Exercícios** (para praticar, com feedback explicado).', rel: ['comparacao', 'exercicios'] },
  { id: 'comparacao', cat: 'plataforma', rotulo: 'Como ler a comparação?', chaves: ['comparacao', 'comparar', 'lado a lado', 'tres colunas', 'o que observar', 'ler a comparacao'], resposta: 'Leia a introdução, depois olhe os três códigos. O que está **realçado** muda de uma linguagem para outra (sintaxe); o resto é a **lógica**, que permanece. Em cada coluna há "O que observar" com dicas daquela linguagem.', rel: ['destaques', 'sintaxe_vs_logica'] },
  { id: 'destaques', cat: 'plataforma', rotulo: 'O que significam os destaques?', chaves: ['destaque', 'destaques', 'realce', 'realcado', 'sublinhado', 'legenda', 'cores do codigo', 'numeros de linha'], resposta: 'Os trechos realçados são **diferenças de sintaxe**: tipos e declaração, entrada e saída, blocos e delimitadores, operadores, decisão/repetição e estrutura do programa. Cada categoria tem um sublinhado diferente (veja a legenda). Dá para desligar o realce e os números de linha acima dos códigos.', rel: ['comparacao', 'sintaxe_vs_logica'] },
  { id: 'exercicios', cat: 'plataforma', rotulo: 'Como funcionam os exercícios?', chaves: ['exercicios', 'questoes', 'quiz', 'feedback', 'tentar de novo', 'errei', 'errar'], resposta: 'Você responde uma questão por vez e recebe **feedback com explicação**, tanto no acerto quanto no erro. Há múltipla escolha, verdadeiro/falso e práticas de **completar código** e **ordenar linhas**. No fim você vê seu percentual; com 80% a próxima unidade abre.', rel: ['praticas', 'nao_atingi'] },
  { id: 'praticas', cat: 'plataforma', rotulo: 'Como funcionam as práticas?', chaves: ['praticas', 'pratica', 'completar codigo', 'ordenar linhas', 'lacunas', 'ordenar'], resposta: 'Em **completar código**, escolha uma opção em cada lacuna e clique em *Verificar*. Em **ordenar linhas**, use os botões ▲ e ▼ para colocar as linhas na ordem de execução e clique em *Verificar ordem*. Tudo funciona também só com o teclado.', rel: ['exercicios'] },
  { id: 'nao_atingi', cat: 'plataforma', rotulo: 'Não atingi 80%, e agora?', chaves: ['nao atingi', 'reprovei', 'nao passei', 'abaixo de 80', 'tentar novamente', 'refazer', 'repetir exercicios'], resposta: 'Sem problema! Clique em **Revisar o conteúdo** ou em **Tentar novamente**. Releia os blocos, veja a comparação e refaça os exercícios; o feedback de cada questão mostra onde ajustar.', rel: ['desbloquear'] },
  { id: 'avaliacao_final', cat: 'avaliacao', rotulo: 'Como é a avaliação final?', chaves: ['avaliacao final', 'prova final', 'av final', 'exame final'], resposta: 'A **Avaliação Final** tem 10 questões (2 por unidade), exige **80%** para aprovação e só pode ser feita **uma vez**. Ela fica disponível depois de concluir as unidades (ou direto, se o diagnóstico foi 100%). Aprovado, você emite o certificado.', rel: ['certificado', 'tempo'] },
  { id: 'certificado', cat: 'avaliacao', rotulo: 'Como emito o certificado?', chaves: ['certificado', 'diploma', 'emitir certificado'], resposta: 'Depois de ser aprovado na Avaliação Final (80% ou mais), o botão **Emitir meu certificado** aparece e você também o encontra no menu, em **Certificado**.', rel: ['avaliacao_final'] },
  { id: 'progresso', cat: 'plataforma', rotulo: 'Onde vejo meu progresso?', chaves: ['progresso', 'desempenho', 'minhas notas', 'meus resultados', 'estatisticas'], resposta: 'Abra **Progresso** no menu: lá estão o resultado do diagnóstico, da avaliação final, o desempenho por unidade e sua jornada de aprendizagem.', rel: ['tempo'] },
  { id: 'tempo', cat: 'avaliacao', rotulo: 'O que o tempo significa?', chaves: ['tempo', 'cronometro', 'quanto tempo', 'demora', 'duracao', 'minutos'], resposta: 'O Typeoff registra quanto tempo você leva no **diagnóstico**, nos **exercícios** e na **avaliação final**, contando só enquanto a aba está aberta. O professor usa isso para acompanhar a turma; **o tempo não altera sua nota**. Sem pressa: o importante é entender.', rel: ['progresso'] },
  { id: 'fonte', cat: 'avaliacao', rotulo: 'Como aumento a letra?', chaves: ['fonte', 'letra', 'tamanho do texto', 'aumentar texto', 'diminuir texto', 'zoom', 'letra pequena', 'letra grande'], resposta: 'Use os botões **A−**, **100%** e **A+** (no menu lateral; no celular, abra o ☰; no diagnóstico e na avaliação, no canto da tela). Vai de 90% a 150% e fica salvo para todas as páginas.', rel: ['tema_escuro'] },
  { id: 'tema_escuro', cat: 'avaliacao', rotulo: 'Como ativo o tema escuro?', chaves: ['tema escuro', 'modo escuro', 'dark', 'escuro', 'fundo escuro', 'tema claro'], resposta: 'Clique em **☾ Tema escuro** no menu lateral (no celular, abra o ☰). No diagnóstico o botão fica no canto da tela. A escolha fica salva. Só a avaliação final permanece sempre no tema claro.', rel: ['fonte'] },
  { id: 'menu_celular', cat: 'plataforma', rotulo: 'Onde está o menu no celular?', chaves: ['menu', 'celular', 'telefone', 'mobile', 'menu sumiu', 'hamburguer'], resposta: 'Em telas pequenas, toque no botão **☰** no canto superior esquerdo para abrir o menu. Para fechar, toque fora dele ou pressione **Esc**.', rel: ['fonte'] },
  { id: 'senha', cat: 'plataforma', rotulo: 'Como altero meus dados?', chaves: ['alterar senha', 'trocar senha', 'mudar senha', 'mudar email', 'alterar nome', 'perfil', 'meus dados'], resposta: 'Abra **Perfil** no menu. Em *Editar dados da conta* você altera nome e e-mail e, informando a senha atual, define uma nova.', rel: ['esqueci_senha'] },
  { id: 'esqueci_senha', cat: 'plataforma', rotulo: 'Esqueci minha senha', chaves: ['esqueci a senha', 'esqueci minha senha', 'nao lembro a senha', 'recuperar senha', 'nao consigo entrar', 'nao consigo logar', 'login'], resposta: 'O Typeoff ainda não tem recuperação automática de senha. Peça ajuda ao seu **professor**, que pode orientar o acesso.', rel: ['professor_contato'] },
  { id: 'erro_tecnico', cat: 'avaliacao', rotulo: 'A página não carrega', chaves: ['nao carrega', 'travou', 'erro', 'bug', 'lento', 'demorando', 'tela branca', 'nao abre a pagina'], resposta: 'O **primeiro acesso do dia pode levar cerca de 1 minuto** (o servidor "acorda"). Se continuar, recarregue com **Ctrl + F5**. Persistindo, avise seu professor informando a tela e o que você estava fazendo.', rel: ['professor_contato'] },
  { id: 'professor_contato', cat: 'avaliacao', rotulo: 'Com quem falo sobre dúvidas?', chaves: ['professor', 'falar com o professor', 'contato', 'suporte', 'ajuda humana', 'reclamar'], resposta: 'Dúvidas sobre notas, regras do curso, erros em questões ou acesso são com o seu **professor**. Eu cuido de explicar a plataforma e os conceitos de lógica de programação.', rel: [] },
  { id: 'proxima_unidade', cat: 'plataforma', rotulo: 'Por onde eu começo?', chaves: ['por onde comeco', 'por onde começar', 'qual unidade estudar', 'qual unidade', 'minha proxima unidade', 'o que estudar agora', 'onde parei', 'continuar'], resposta: 'Vou ver o seu andamento…', acao: 'proxima_unidade', rel: ['como_funciona'] },
  { id: 'duvida_conteudo', cat: 'plataforma', rotulo: 'Tenho uma dúvida de conteúdo', chaves: ['duvida de conteudo', 'tenho uma duvida', 'quero ajuda com programacao'], resposta: 'Pode perguntar! Por exemplo: *o que é um algoritmo?*, *como funciona um laço for?*, *qual a diferença entre `elif` e `else if`?*, *o que muda entre Python, Java e C?*', rel: ['algoritmo', 'laco', 'sintaxe_vs_logica'] },

  { id: 'algoritmo', cat: 'conteudo', rotulo: 'O que é um algoritmo?', chaves: ['algoritmo', 'algoritmos', 'o que e um algoritmo', 'receita'], resposta: 'Algoritmo é uma **sequência finita e ordenada de passos** que resolve um problema. Uma receita de bolo é um bom exemplo: tem entrada (ingredientes), processamento (passos) e saída (o bolo).', rel: ['propriedades', 'representacao'] },
  { id: 'propriedades', cat: 'conteudo', rotulo: 'Propriedades de um algoritmo', chaves: ['propriedades', 'finitude', 'efetividade', 'definicao', 'precisao', 'nao ambiguo'], resposta: 'Um bom algoritmo é **bem definido** (cada passo é claro), **finito** (termina), **efetivo** (cada passo é executável) e tem **entradas** e **saídas**. Um laço que nunca acaba viola a finitude.', rel: ['laco_infinito', 'algoritmo'] },
  { id: 'representacao', cat: 'conteudo', rotulo: 'Como representar um algoritmo?', chaves: ['representar', 'representacao', 'fluxograma', 'pseudocodigo', 'descricao narrativa', 'narrativa'], resposta: 'Há três formas: **descrição narrativa** (texto), **fluxograma** (diagrama com símbolos) e **pseudocódigo** (passos em linguagem próxima ao código, mas sem sintaxe rígida). Na Unidade 1 há um fluxograma para você ver.', rel: ['algoritmo'] },
  { id: 'execucao', cat: 'conteudo', rotulo: 'Como o computador executa?', chaves: ['como o computador executa', 'processador', 'cpu', 'von neumann', 'instrucoes', 'memoria do computador'], resposta: 'O computador guarda **instruções e dados na memória** e o processador executa uma instrução por vez, em ciclos de *buscar → decodificar → executar* (modelo de Von Neumann). Por isso a ordem dos passos importa.', rel: ['algoritmo'] },
  { id: 'variavel', cat: 'conteudo', rotulo: 'O que é uma variável?', chaves: ['variavel', 'variaveis', 'declarar variavel', 'declaracao'], resposta: 'Variável é um **espaço na memória com nome, tipo e valor**, como uma caixa etiquetada. Python: `idade = 17`. Java: `int idade = 17;`. C: `int idade = 17;`.', rel: ['tipos', 'atribuicao'] },
  { id: 'tipos', cat: 'conteudo', rotulo: 'Quais são os tipos de dados?', chaves: ['tipo de dado', 'tipos de dados', 'int', 'float', 'double', 'string', 'char', 'boolean', 'inteiro', 'real', 'texto'], resposta: 'Os mais comuns: **inteiro** (`int`), **real** (`float`/`double`), **texto** (`str`/`String`, e `char` para um caractere em Java/C) e **lógico** (`bool`/`boolean`). Python descobre o tipo sozinho; Java e C exigem declará-lo.', rel: ['tipagem', 'variavel'] },
  { id: 'atribuicao', cat: 'conteudo', rotulo: 'O que significa x = x + 1?', chaves: ['atribuicao', 'x = x + 1', 'incrementar', 'incremento', 'sinal de igual', 'recebe'], resposta: '`=` **atribui**, não compara. Em `x = x + 1` o computador calcula o lado direito (valor atual de x mais 1) e guarda o resultado em x. Se x valia 5, passa a valer 6.', rel: ['relacionais', 'variavel'] },
  { id: 'operadores', cat: 'conteudo', rotulo: 'Quais são os operadores?', chaves: ['operadores', 'operador aritmetico', 'resto da divisao', 'modulo', 'potencia', '%', '**'], resposta: 'Aritméticos: `+ - * /` e `%` (resto). Em Python há `//` (divisão inteira) e `**` (potência); em Java use `Math.pow(a, b)`. Em C e Java, `7 / 2` entre inteiros dá `3`.', rel: ['divisao_inteira', 'precedencia'] },
  { id: 'divisao_inteira', cat: 'conteudo', rotulo: 'Por que 7/2 dá 3?', chaves: ['divisao inteira', '7/2', 'dividir inteiros', 'divisao dando errado', 'resultado sem virgula'], resposta: 'Em **C e Java**, dividir dois inteiros descarta a parte decimal: `7 / 2` é `3`. Para ter `3.5`, use pelo menos um número real (`7.0 / 2`) ou um *cast* como `(double) 7 / 2`. Em Python, `7 / 2` já dá `3.5` e `7 // 2` dá `3`.', rel: ['operadores', 'tipos'] },
  { id: 'precedencia', cat: 'conteudo', rotulo: 'Qual a ordem das operações?', chaves: ['precedencia', 'ordem das operacoes', 'parenteses'], resposta: 'Primeiro os **parênteses**, depois potência, depois `* / %` e por fim `+ -`. Assim, `2 + 3 * 4` é `14`, mas `(2 + 3) * 4` é `20`. Na dúvida, use parênteses.', rel: ['operadores'] },
  { id: 'relacionais', cat: 'conteudo', rotulo: 'Qual a diferença entre = e ==?', chaves: ['==', 'igualdade', 'comparar valores', 'operadores relacionais', 'diferente de', '!=', 'maior ou igual', 'diferenca entre = e =='], resposta: '`=` **guarda** um valor; `==` **compara** dois valores. Também existem `!=` (diferente), `>`, `<`, `>=` e `<=`. A comparação devolve verdadeiro ou falso.', rel: ['condicional', 'atribuicao'] },
  { id: 'condicional', cat: 'conteudo', rotulo: 'Como funciona o if/else?', chaves: ['if', 'else', 'se senao', 'condicional', 'condicionais', 'estrutura condicional', 'decisao'], resposta: 'O `if` executa um bloco **só se a condição for verdadeira**; o `else` cobre o caso contrário. Python: `if x > 5:` (dois-pontos e indentação). Java/C: `if (x > 5) { ... }`.', rel: ['elif', 'logicos'] },
  { id: 'elif', cat: 'conteudo', rotulo: 'elif ou else if?', chaves: ['elif', 'else if', 'senao se', 'varias condicoes'], resposta: 'É o "senão se". Em **Python** escreve-se `elif`; em **Java e C**, `else if` (duas palavras). A lógica é igual: testa-se na ordem e executa-se **só o primeiro ramo verdadeiro**.', rel: ['condicional'] },
  { id: 'logicos', cat: 'conteudo', rotulo: 'Operadores lógicos (e, ou, não)', chaves: ['operadores logicos', 'and', 'or', 'not', '&&', '||', 'e ou nao', 'logico'], resposta: '**E**: `and` (Python) / `&&` (Java, C). **OU**: `or` / `||`. **NÃO**: `not` / `!`. Ex.: `idade >= 18 and tem_documento` só é verdadeiro se as duas partes forem.', rel: ['condicional', 'relacionais'] },
  { id: 'switch', cat: 'conteudo', rotulo: 'O que é switch/case?', chaves: ['switch', 'case', 'escolha caso', 'multipla escolha de codigo', 'match'], resposta: '`switch/case` (Java e C) escolhe entre várias opções de um valor. Não esqueça o **`break`** ao fim de cada caso, senão a execução "cai" no próximo. Em Python 3.10+ existe o `match`; antes disso usa-se `if/elif`.', rel: ['condicional'] },
  { id: 'laco', cat: 'conteudo', rotulo: 'Para que servem os laços?', chaves: ['laco', 'lacos', 'repeticao', 'repetir', 'loop', 'estrutura de repeticao', 'iteracao'], resposta: 'Laço **repete um bloco** enquanto uma condição for verdadeira, evitando copiar código. Os principais são `for`, `while` e `do-while`. Use `for` quando sabe quantas vezes repetir e `while` quando depende de uma condição.', rel: ['for', 'while', 'laco_infinito'] },
  { id: 'for', cat: 'conteudo', rotulo: 'Como funciona o for?', chaves: ['for', 'laco for', 'contador do for', 'for i in range'], resposta: 'Python: `for i in range(1, 6):` (1 a 5). Java e C: `for (int i = 1; i <= 5; i++) { ... }`, onde o cabeçalho tem **início; condição; passo**. As três escrevem a mesma ideia.', rel: ['range', 'while'] },
  { id: 'range', cat: 'conteudo', rotulo: 'O que faz o range?', chaves: ['range', 'range(', 'limite exclusivo'], resposta: '`range(1, 6)` gera 1, 2, 3, 4, 5: o **limite final é exclusivo**. `range(5)` vai de 0 a 4. Por isso, para ir até `n`, escreve-se `range(1, n + 1)`.', rel: ['for'] },
  { id: 'while', cat: 'conteudo', rotulo: 'Como funciona o while?', chaves: ['while', 'enquanto', 'laco while'], resposta: '`while condição:` testa a condição **antes** de cada volta e repete enquanto ela for verdadeira. Lembre de **atualizar a variável de controle** dentro do laço, senão ele nunca termina.', rel: ['laco_infinito', 'dowhile'] },
  { id: 'dowhile', cat: 'conteudo', rotulo: 'O que é do-while?', chaves: ['do while', 'do-while', 'faca enquanto', 'executa pelo menos uma vez'], resposta: 'No **do-while** (Java e C) o bloco roda **pelo menos uma vez**, porque a condição é testada **depois**. Python não tem do-while; costuma-se usar `while True:` com `break`.', rel: ['while'] },
  { id: 'break_continue', cat: 'conteudo', rotulo: 'O que fazem break e continue?', chaves: ['break', 'continue', 'sair do laco', 'pular iteracao'], resposta: '`break` **encerra o laço** na hora. `continue` **pula para a próxima volta**, ignorando o resto do bloco naquela volta.', rel: ['laco'] },
  { id: 'laco_infinito', cat: 'conteudo', rotulo: 'O que é laço infinito?', chaves: ['laco infinito', 'loop infinito', 'nunca termina', 'travou no laco', 'infinito'], resposta: 'É um laço cuja condição **nunca vira falsa**, geralmente porque a variável de controle não é atualizada (ou é reiniciada a cada volta). Ele viola a **finitude** do algoritmo. Faça um teste de mesa e acompanhe o valor da variável a cada volta.', rel: ['teste_mesa', 'propriedades'] },
  { id: 'contador_acumulador', cat: 'conteudo', rotulo: 'Contador e acumulador', chaves: ['contador', 'acumulador', 'soma acumulada', 'somar valores', '+='], resposta: '**Contador** conta ocorrências (`c += 1`); **acumulador** soma valores (`soma += x`). Ambos precisam ser **inicializados antes do laço** (`soma = 0`).', rel: ['laco', 'fatorial'] },
  { id: 'teste_mesa', cat: 'conteudo', rotulo: 'O que é teste de mesa?', chaves: ['teste de mesa', 'simular', 'passo a passo do codigo', 'rastrear', 'tabela de variaveis'], resposta: '**Teste de mesa** é simular o algoritmo no papel: monte uma tabela com as variáveis e anote o valor de cada uma depois de cada passo. É a melhor forma de achar erros de lógica.', rel: ['laco_infinito'] },
  { id: 'fatorial', cat: 'conteudo', rotulo: 'Como calcular o fatorial?', chaves: ['fatorial', 'n!', 'fatorial de'], resposta: 'n! = 1 × 2 × … × n. Comece com `fatorial = 1` e, em um laço de 1 até n, faça `fatorial *= i`. A lógica é igual nas três linguagens; muda o cabeçalho do laço e o tipo (`long`/`long long` para números grandes).', rel: ['for', 'contador_acumulador'] },
  { id: 'sintaxe_vs_logica', cat: 'conteudo', rotulo: 'O que muda entre Python, Java e C?', chaves: ['diferenca entre python java e c', 'python java c', 'o que muda', 'o que permanece', 'sintaxe e logica', 'sintaxe', 'linguagens'], resposta: 'A **lógica** (ler, decidir, repetir, mostrar) é a mesma. Muda a **sintaxe**: tipos obrigatórios em Java e C, blocos por indentação (Python) ou chaves (Java/C), `;` no fim dos comandos, e a forma de ler e mostrar dados.', rel: ['tipagem', 'blocos', 'entrada_saida'] },
  { id: 'tipagem', cat: 'conteudo', rotulo: 'Tipagem dinâmica x estática', chaves: ['tipagem', 'tipagem dinamica', 'tipagem estatica', 'precisa declarar tipo', 'tipo da variavel'], resposta: '**Python** tem tipagem dinâmica: a variável pega o tipo do valor (`x = 5`, depois `x = "oi"`). **Java e C** têm tipagem estática: o tipo é declarado e não muda (`int x = 5;`). Estática pega mais erros antes de rodar.', rel: ['tipos'] },
  { id: 'compilado_interpretado', cat: 'conteudo', rotulo: 'Compilado ou interpretado?', chaves: ['compilado', 'interpretado', 'compilador', 'interpretador', 'jvm', 'bytecode', 'maquina virtual'], resposta: '**C** é compilado para código de máquina. **Java** é compilado para *bytecode* e executado pela **JVM**. **Python** costuma ser executado por um interpretador, linha a linha. Isso afeta velocidade e portabilidade.', rel: ['sintaxe_vs_logica'] },
  { id: 'entrada_saida', cat: 'conteudo', rotulo: 'Como ler e mostrar dados?', chaves: ['entrada e saida', 'input', 'print', 'printf', 'scanf', 'scanner', 'println', 'ler dados', 'mostrar na tela', 'ler do teclado'], resposta: 'Python: `nome = input("Nome: ")` e `print(nome)`. Java: `Scanner` para ler e `System.out.println(...)` para mostrar. C: `scanf("%d", &n)` para ler (note o `&`) e `printf("%d", n)` para mostrar.', rel: ['sintaxe_vs_logica'] },
  { id: 'blocos', cat: 'conteudo', rotulo: 'Indentação ou chaves?', chaves: ['indentacao', 'chaves', 'identacao', 'bloco de codigo', 'dois pontos', ':'], resposta: 'Python marca blocos com **dois-pontos e indentação** (os espaços fazem parte da sintaxe). Java e C usam **chaves** `{ }`. Em Java e C a indentação é só estilo; em Python, errar a indentação muda o programa.', rel: ['ponto_virgula'] },
  { id: 'ponto_virgula', cat: 'conteudo', rotulo: 'Quando usar ponto e vírgula?', chaves: ['ponto e virgula', ';', 'esqueci o ponto e virgula'], resposta: 'Em **Java e C** cada comando termina com `;`. Em **Python** não se usa. Esquecer o `;` é um dos erros de compilação mais comuns.', rel: ['blocos'] },
  { id: 'main', cat: 'conteudo', rotulo: 'O que é o main?', chaves: ['main', 'public static void main', 'funcao principal', 'ponto de entrada', '#include', 'import', 'include'], resposta: 'É o **ponto de entrada** do programa. Java: `public static void main(String[] args)` dentro de uma classe. C: `int main()`, com `#include <stdio.h>` para usar `printf`/`scanf`. Python não exige: o código roda de cima para baixo.', rel: ['sintaxe_vs_logica'] },
  { id: 'comentarios', cat: 'conteudo', rotulo: 'Como comentar o código?', chaves: ['comentario', 'comentarios', 'comentar'], resposta: 'Python: `# comentário`. Java e C: `// uma linha` ou `/* várias linhas */`. Comentários explicam o *porquê* do código e são ignorados na execução.', rel: [] },
  { id: 'lista_array', cat: 'conteudo', rotulo: 'Lista, array e vetor', chaves: ['lista', 'array', 'vetor', 'indice', 'lista python', 'posicao zero'], resposta: 'Python usa **listas** (crescem à vontade: `numeros = [4, 8, 15]`). Java e C usam **arrays de tamanho fixo** (`int[] numeros = new int[5];` / `int numeros[5];`). Em todas, o **primeiro índice é 0**.', rel: ['for'] },
  { id: 'memoria', cat: 'conteudo', rotulo: 'Gerenciamento de memória', chaves: ['garbage collector', 'coletor de lixo', 'malloc', 'free', 'gerenciamento de memoria', 'vazamento de memoria'], resposta: 'Em **Python e Java** a memória é liberada automaticamente (*garbage collector*). Em **C** você pode precisar gerenciar à mão com `malloc` e `free`. Mais controle, mais responsabilidade.', rel: ['compilado_interpretado'] },

  { id: 'prof_painel', cat: 'professor', rotulo: 'Como ler o painel?', chaves: ['painel', 'desempenho e uso', 'como ler', 'relatorio', 'aba de desempenho'], resposta: 'Em **Desempenho e uso** você vê, por unidade, o acerto e o tempo em cada etapa; por questão, taxa de acerto, tempo médio e alertas; e por estudante, os tempos de diagnóstico, exercícios e avaliação final. Os tempos só existem para atividades feitas depois da atualização do sistema.', rel: ['prof_alertas', 'prof_conta_teste'] },
  { id: 'prof_conta_teste', cat: 'professor', rotulo: 'Como marcar conta de teste?', chaves: ['conta de teste', 'contas de teste', 'marcar teste', 'excluir teste'], resposta: 'Na aba **Desempenho e uso**, no quadro "Contas de teste e atividade por estudante", marque a caixa **Teste** da conta. Ela deixa de entrar nas médias (dá para incluí-las de novo pela caixa no topo).', rel: ['prof_painel'] },
  { id: 'prof_alertas', cat: 'professor', rotulo: 'O que significam os alertas?', chaves: ['alertas', 'alerta', 'enunciado provisorio', 'repetida', 'taxa baixa', 'taxa de acerto baixa'], resposta: '**Enunciado provisório** (ex.: "Teste"), **repetida na unidade** e **taxa de acerto baixa** indicam questões que merecem revisão antes de concluir algo sobre a aprendizagem dos estudantes.', rel: ['prof_questao_recusada'] },
  { id: 'prof_questao_recusada', cat: 'professor', rotulo: 'Por que minha questão foi recusada?', chaves: ['questao recusada', 'nao salva', 'nao consigo salvar', 'recusada', 'erro ao salvar questao', 'cadastrar questao', 'gerenciar'], resposta: 'O cadastro exige **enunciado completo**, **alternativas válidas e diferentes**, **resposta correta igual a uma alternativa** e **explicação**, e recusa questão repetida na mesma unidade. A mensagem de erro indica qual regra falhou.', rel: ['prof_alertas'] }
];

const POR_ID = {}; KB.forEach(e => { e._chaves = e.chaves.map(norm); POR_ID[e.id] = e; });

function dist1(a, b) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, dif = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++dif > 1) return false;
    if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
  }
  return dif + (a.length - i) + (b.length - j) <= 1;
}

function pontuar(qn, tokens, e) {
  let s = 0;
  for (const k of e._chaves) {
    if (!k) continue;
    if (k.includes(' ')) { if (qn.includes(k)) s += 3 + k.split(' ').length * 0.3; continue; }
    if (k.length <= 2 || /[^a-z0-9]/.test(k)) { if (tokens.includes(k)) s += 2; continue; }
    for (const t of tokens) {
      if (t === k) { s += 2; break; }
      if (k.length >= 5 && t.length >= 5 && (t.startsWith(k) || k.startsWith(t))) { s += 1.6; break; }
      if (k.length >= 6 && t.length >= 6 && dist1(t, k)) { s += 1.2; break; }
    }
  }
  return s;
}

const RE_SAUDACAO = /^(oi|ola|ei|e ai|bom dia|boa tarde|boa noite|hello|hey|opa)\b/;
const RE_OBRIGADO = /\b(obrigad[oa]|valeu|brigad[oa]|thanks)\b/;
const RE_RESPOSTA_PRONTA = /(gabarito|qual (e |eh )?a resposta|resposta (certa|correta) (da|de|do|dessa|desta)|qual (a )?alternativa|me (da|passa|diz) a resposta|resolve (essa|a) questao|qual letra)/;

const MSG_AVALIACAO = 'Durante o **diagnóstico** e a **avaliação final** eu não ajudo com o conteúdo das questões, para o resultado mostrar o que você realmente sabe. Posso explicar como a plataforma funciona. Depois, volto a ajudar com tudo!';
const MSG_PRE_DIAGNOSTICO = 'Faça primeiro o **diagnóstico inicial**; quando terminar, eu explico qualquer conteúdo. Por enquanto posso ajudar com o **uso da plataforma** (como funciona o curso, tempo, tema, fonte...).';
const MSG_SEM_RESPOSTA = 'Eu não entrego a resposta pronta, mas posso ajudar a **pensar**: releia o conteúdo, faça um **teste de mesa** do código e me pergunte o conceito (ex.: *"o que é laço infinito?"*). Depois que você responder, o feedback explica o porquê.';
const MSG_NAO_ENTENDI = 'Hmm, não encontrei isso na minha base. Tente perguntar de outro jeito (ex.: *"o que é uma variável?"*) ou escolha um tema abaixo. Para dúvidas sobre notas ou acesso, fale com o seu professor.';
const MSG_FORA_AVALIACAO = 'Nesse momento eu só posso ajudar com o **uso da plataforma** (tempo, regras, tema, fonte...). ' + 'Sobre o conteúdo, depois da avaliação eu te ajudo!';

function sugestoesDe(ids, modoAvaliacao, papel) {
  return (ids || []).map(id => POR_ID[id]).filter(e => e && permitido(e, modoAvaliacao, papel)).slice(0, 3).map(e => ({ id: e.id, rotulo: e.rotulo }));
}
function permitido(e, modoAvaliacao, papel) {
  if (e.cat === 'professor') return papel === 'professor';
  if (modoAvaliacao) return e.cat === 'avaliacao';
  return true;
}
const SUGESTOES_PADRAO = ['como_funciona', 'unidades', 'duvida_conteudo'];

function responderLocal(entrada) {
  const modo = !!entrada.modoAvaliacao, papel = entrada.papel || 'estudante';
  const MSG_AV = entrada.preDiagnostico ? MSG_PRE_DIAGNOSTICO : MSG_AVALIACAO;
  const pronto = (e, extra) => ({ origem: 'base', id: e.id, resposta: e.resposta, acao: e.acao || null, sugestoes: sugestoesDe(e.rel, modo, papel), confianca: extra || 10 });
  if (entrada.id) {
    const e = POR_ID[entrada.id];
    if (!e) return { origem: 'nao_entendi', resposta: MSG_NAO_ENTENDI, sugestoes: sugestoesDe(SUGESTOES_PADRAO, modo, papel), confianca: 0 };
    if (!permitido(e, modo, papel)) return { origem: 'restrito', resposta: modo ? MSG_AV : MSG_NAO_ENTENDI, sugestoes: sugestoesDe(['como_funciona', 'tempo'], modo, papel), confianca: 10 };
    return pronto(e);
  }
  const qn = norm(entrada.pergunta);
  if (!qn) return { origem: 'nao_entendi', resposta: 'Pode escrever sua pergunta, ou escolher um dos temas abaixo.', sugestoes: sugestoesDe(SUGESTOES_PADRAO, modo, papel), confianca: 0 };
  const tokens = qn.split(' ');
  if (RE_SAUDACAO.test(qn) && tokens.length <= 3) return { origem: 'base', id: 'oi', resposta: 'Oi! Eu sou o **Typo**. Como posso ajudar?', sugestoes: sugestoesDe(modo ? ['diagnostico', 'tempo', 'fonte'] : SUGESTOES_PADRAO, modo, papel), confianca: 10 };
  if (RE_OBRIGADO.test(qn)) return { origem: 'base', id: 'obrigado', resposta: 'Por nada! Estou por aqui se precisar. 😊', sugestoes: [], confianca: 10 };
  if (RE_RESPOSTA_PRONTA.test(qn)) return { origem: 'restrito', resposta: modo ? MSG_AV : MSG_SEM_RESPOSTA, sugestoes: sugestoesDe(modo ? ['como_funciona', 'tempo'] : ['teste_mesa', 'duvida_conteudo', 'exercicios'], modo, papel), confianca: 10 };

  let melhor = null, nota = 0, melhorConteudoBloqueado = 0;
  for (const e of KB) {
    const s = pontuar(qn, tokens, e) * (e.peso || 1);
    if (!permitido(e, modo, papel)) { if (s > melhorConteudoBloqueado && e.cat !== 'professor') melhorConteudoBloqueado = s; continue; }
    if (s > nota) { nota = s; melhor = e; }
  }
  if (modo && melhorConteudoBloqueado >= 2 && melhorConteudoBloqueado > nota) {
    return { origem: 'restrito', resposta: MSG_AV, sugestoes: sugestoesDe(['como_funciona', 'tempo', 'fonte'], modo, papel), confianca: 10 };
  }
  if (melhor && nota >= 1.2) return pronto(melhor, nota);
  return { origem: 'nao_entendi', resposta: modo ? (entrada.preDiagnostico ? MSG_PRE_DIAGNOSTICO : MSG_FORA_AVALIACAO) : MSG_NAO_ENTENDI, sugestoes: sugestoesDe(modo ? ['como_funciona', 'tempo', 'fonte'] : SUGESTOES_PADRAO, modo, papel), confianca: nota };
}

const SISTEMA_IA = [
  'Você é o Typo, mascote e assistente de dúvidas do Typeoff, uma plataforma educacional que ensina lógica de programação comparando Python, Java e C.',
  'Responda sempre em português do Brasil, em tom amigável e claro, com no máximo 5 frases curtas. Pode usar `código` entre crases e **negrito**.',
  'Fale apenas de: lógica de programação (algoritmos, variáveis, condicionais, laços), diferenças entre Python, Java e C, e uso da plataforma. Se o assunto for outro, diga gentilmente que só ajuda com isso.',
  'Nunca entregue a resposta de questões de exercícios ou avaliações; se pedirem, ofereça uma dica conceitual e sugira um teste de mesa.',
  'Não peça nem repita dados pessoais. Se não tiver certeza, diga isso e sugira falar com o professor.'
].join(' ');

async function perguntarIA(pergunta, opcoes) {
  const f = (opcoes && opcoes.fetchFn) || (typeof fetch === 'function' ? fetch : null);
  if (!f || !opcoes || !opcoes.chave) return null;
  const ctl = typeof AbortController === 'function' ? new AbortController() : null;
  const t = ctl ? setTimeout(() => ctl.abort(), opcoes.timeoutMs || 8000) : null;
  try {
    const r = await f('https://api.anthropic.com/v1/messages', {
      method: 'POST', signal: ctl ? ctl.signal : undefined,
      headers: { 'content-type': 'application/json', 'x-api-key': opcoes.chave, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: opcoes.modelo || 'claude-haiku-5-5', max_tokens: 350, system: SISTEMA_IA, messages: [{ role: 'user', content: String(pergunta).slice(0, 300) }] })
    });
    if (!r.ok) return null;
    const j = await r.json();
    const txt = j && Array.isArray(j.content) ? j.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim() : '';
    return txt ? txt.slice(0, 1200) : null;
  } catch (e) { return null; } finally { if (t) clearTimeout(t); }
}

async function responder(entrada, opcoes) {
  const local = responderLocal(entrada);
  const ia = opcoes && opcoes.ia;
  const podeIA = ia && ia.chave && !entrada.modoAvaliacao && entrada.logado && !entrada.id && entrada.pergunta &&
    local.origem === 'nao_entendi' && String(entrada.pergunta).trim().length >= 6;
  if (!podeIA) return local;
  const txt = await perguntarIA(entrada.pergunta, ia);
  if (!txt) return local;
  return { origem: 'ia', resposta: txt, sugestoes: local.sugestoes, aviso: 'Resposta gerada por IA — confira com o seu professor se tiver dúvida.', confianca: 5 };
}

module.exports = { KB, norm, responderLocal, responder, perguntarIA, PAGINAS_AVALIACAO, SISTEMA_IA, POR_ID };
