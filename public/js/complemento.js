(function () {
  function marcador(id) {
    return '<defs><marker id="' + id + '" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="sv-ponta"/></marker></defs>';
  }
  function svg(id, w, h, titulo, corpo) {
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" role="img" aria-labelledby="' + id + '-t">' +
      '<title id="' + id + '-t">' + titulo + '</title>' + marcador('pt-' + id) + corpo + '</svg>';
  }
  const seta = (id, pts) => '<polyline class="sv-seta" points="' + pts + '" marker-end="url(#pt-' + id + ')"/>';
  const caixa = (x, y, w, h, txt, cls, rx) => '<rect class="' + (cls || 'sv-caixa') + '" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + (rx || 6) + '"/>' +
    '<text class="sv-texto" x="' + (x + w / 2) + '" y="' + (y + h / 2 + 4) + '" text-anchor="middle">' + txt + '</text>';
  const losango = (cx, cy, hw, hh, txt) => '<polygon class="sv-caixa sv-dec" points="' + cx + ',' + (cy - hh) + ' ' + (cx + hw) + ',' + cy + ' ' + cx + ',' + (cy + hh) + ' ' + (cx - hw) + ',' + cy + '"/>' +
    '<text class="sv-texto" x="' + cx + '" y="' + (cy + 4) + '" text-anchor="middle">' + txt + '</text>';
  const rot = (x, y, txt) => '<text class="sv-rotulo" x="' + x + '" y="' + y + '">' + txt + '</text>';

  const d1 = svg('u1', 420, 450, 'Fluxograma do algoritmo de média de duas notas',
    caixa(150, 8, 120, 34, 'Início', 'sv-caixa sv-term', 17) + seta('u1', '210,42 210,62') +
    '<polygon class="sv-caixa sv-io" points="140,62 310,62 280,100 110,100"/><text class="sv-texto" x="210" y="86" text-anchor="middle">Ler nota1 e nota2</text>' + seta('u1', '210,100 210,120') +
    caixa(110, 120, 200, 38, 'media = (nota1 + nota2) / 2') + seta('u1', '210,158 210,178') +
    losango(210, 222, 90, 44, 'media &gt;= 7?') +
    seta('u1', '120,222 70,222 70,300') + rot(88, 214, 'Sim') +
    seta('u1', '300,222 350,222 350,300') + rot(312, 214, 'Não') +
    caixa(10, 300, 120, 38, 'Mostrar Aprovado') + caixa(290, 300, 120, 38, 'Mostrar Reprovado') +
    '<polyline class="sv-seta" points="70,338 70,417 150,417" marker-end="url(#pt-u1)"/><polyline class="sv-seta" points="350,338 350,417 270,417" marker-end="url(#pt-u1)"/>' +
    caixa(150, 400, 120, 34, 'Fim', 'sv-caixa sv-term', 17));

  const d2 = svg('u2', 420, 230, 'Variável como caixa na memória: nome, tipo e valor',
    '<text class="sv-texto sv-forte" x="210" y="20" text-anchor="middle">Variável = nome + tipo + valor guardado na memória</text>' +
    ['nome|"Ana"|texto', 'peso|62.5|número real', 'altura|1.68|número real'].map((s, i) => {
      const p = s.split('|'), x = 10 + i * 140;
      return '<text class="sv-texto sv-forte" x="' + (x + 60) + '" y="52" text-anchor="middle">' + p[0] + '</text>' +
        '<rect class="sv-caixa" x="' + x + '" y="60" width="120" height="56" rx="6"/>' +
        '<text class="sv-texto sv-valor" x="' + (x + 60) + '" y="94" text-anchor="middle">' + p[1] + '</text>' +
        '<text class="sv-rotulo" x="' + (x + 60) + '" y="138" text-anchor="middle">tipo: ' + p[2] + '</text>';
    }).join('') +
    '<text class="sv-texto" x="210" y="178" text-anchor="middle">Atribuição: altura = 1.70 troca o valor dentro da caixa.</text>' +
    '<text class="sv-rotulo" x="210" y="200" text-anchor="middle">O nome continua o mesmo; só o valor guardado muda.</text>');

  const d3 = svg('u3', 420, 430, 'Fluxograma de decisão em cadeia (if, else if, else)',
    caixa(90, 6, 120, 30, 'Início', 'sv-caixa sv-term', 15) + seta('u3', '150,36 150,60') +
    losango(150, 100, 65, 40, 'nota &gt;= 9?') + seta('u3', '215,100 290,100') + rot(238, 92, 'Sim') + caixa(290, 82, 120, 36, 'Conceito A') +
    seta('u3', '150,140 150,170') + rot(158, 160, 'Não') +
    losango(150, 210, 65, 40, 'nota &gt;= 7?') + seta('u3', '215,210 290,210') + rot(238, 202, 'Sim') + caixa(290, 192, 120, 36, 'Conceito B') +
    seta('u3', '150,250 150,280') + rot(158, 270, 'Não') +
    losango(150, 320, 65, 40, 'nota &gt;= 5?') + seta('u3', '215,320 290,320') + rot(238, 312, 'Sim') + caixa(290, 302, 120, 36, 'Conceito C') +
    seta('u3', '150,360 150,386') + rot(158, 378, 'Não') + caixa(50, 386, 200, 34, 'Segue testando… ou else'));

  const d4 = svg('u4', 420, 470, 'Fluxograma do laço for para calcular o fatorial',
    caixa(150, 6, 120, 30, 'Início', 'sv-caixa sv-term', 15) + seta('u4', '210,36 210,58') +
    caixa(110, 58, 200, 40, 'fatorial = 1 ; i = 1') + seta('u4', '210,98 210,118') +
    losango(210, 160, 80, 42, 'i &lt;= n?') +
    seta('u4', '210,202 210,232') + rot(220, 220, 'Sim') +
    caixa(110, 232, 200, 38, 'fatorial = fatorial * i') + seta('u4', '210,270 210,292') +
    caixa(110, 292, 200, 38, 'i = i + 1') +
    seta('u4', '110,311 50,311 50,160 130,160') +
    seta('u4', '290,160 355,160 355,362') + rot(305, 152, 'Não') +
    caixa(295, 362, 120, 36, 'Mostrar fatorial') + seta('u4', '355,398 355,424') + caixa(295, 424, 120, 30, 'Fim', 'sv-caixa sv-term', 15));

  const d5 = svg('u5', 420, 300, 'Três linguagens, uma mesma lógica',
    caixa(10, 10, 120, 44, 'Python') + caixa(150, 10, 120, 44, 'Java') + caixa(290, 10, 120, 44, 'C') +
    seta('u5', '70,54 140,128') + seta('u5', '210,54 210,128') + seta('u5', '350,54 280,128') +
    '<rect class="sv-caixa sv-nucleo" x="60" y="130" width="300" height="62" rx="10"/>' +
    '<text class="sv-texto sv-forte" x="210" y="156" text-anchor="middle">Mesma lógica</text><text class="sv-texto" x="210" y="176" text-anchor="middle">entrada → processamento → saída</text>' +
    caixa(10, 226, 195, 50, 'MUDA: sintaxe, tipos, memória') + caixa(215, 226, 195, 50, 'PERMANECE: a lógica') );

  const DIAGRAMAS = {
    1: { svg: d1, legenda: 'Fluxograma do algoritmo de média: ler duas notas, calcular a média e decidir entre aprovado e reprovado.',
         descricao: 'O fluxo começa em Início, lê nota1 e nota2, calcula media = (nota1 + nota2) / 2 e testa se media >= 7. Se sim, mostra Aprovado; se não, mostra Reprovado. Os dois caminhos terminam em Fim.' },
    2: { svg: d2, legenda: 'Uma variável é como uma caixa etiquetada: o nome identifica, o tipo define o que cabe e o valor é o conteúdo atual.',
         descricao: 'Três caixas lado a lado: nome guarda o texto "Ana"; peso guarda 62.5; altura guarda 1.68. Atribuir um novo valor a altura troca o conteúdo da caixa, mas o nome continua o mesmo.' },
    3: { svg: d3, legenda: 'Cadeia de decisões: o programa testa de cima para baixo e executa só o primeiro ramo verdadeiro.',
         descricao: 'Primeiro testa nota >= 9 (Conceito A). Se não for verdadeiro, testa nota >= 7 (Conceito B), depois nota >= 5 (Conceito C) e segue testando; o else cobre os demais casos.' },
    4: { svg: d4, legenda: 'Laço for do fatorial: inicializa, testa a condição, executa o corpo, atualiza o contador e volta ao teste.',
         descricao: 'Define fatorial = 1 e i = 1. Enquanto i <= n, faz fatorial = fatorial * i e i = i + 1, voltando ao teste. Quando i passa de n, mostra o fatorial e termina.' },
    5: { svg: d5, legenda: 'Python, Java e C expressam a mesma lógica com sintaxes diferentes.',
         descricao: 'As três linguagens apontam para um núcleo comum: entrada, processamento e saída. Abaixo: o que muda (sintaxe, tipos, memória) e o que permanece (a lógica).' }
  };

  const REF = {
    base: [
      'FORBELLONE, A. L. V.; EBERSPÄCHER, H. F. <em>Lógica de programação: a construção de algoritmos e estruturas de dados</em>. 3. ed. São Paulo: Pearson Prentice Hall, 2005.',
      'ASCENCIO, A. F. G.; CAMPOS, E. A. V. de. <em>Fundamentos da programação de computadores: algoritmos, Pascal, C/C++ e Java</em>. 3. ed. São Paulo: Pearson, 2012.'
    ],
    c: 'KERNIGHAN, B. W.; RITCHIE, D. M. <em>The C Programming Language</em>. 2. ed. Englewood Cliffs: Prentice Hall, 1988.',
    java: 'ORACLE. <em>The Java Tutorials</em>. Disponível em: https://docs.oracle.com/javase/tutorial/.',
    python: 'PYTHON SOFTWARE FOUNDATION. <em>O tutorial do Python (3)</em>. Disponível em: https://docs.python.org/pt-br/3/tutorial/.'
  };
  const REFERENCIAS = {
    1: [REF.base[0], REF.base[1], 'TANENBAUM, A. S.; AUSTIN, T. <em>Organização estruturada de computadores</em>. 6. ed. São Paulo: Pearson, 2013.'],
    2: [REF.base[0], REF.base[1], REF.c],
    3: [REF.base[1], REF.c, REF.java, REF.python],
    4: [REF.base[1], REF.c, REF.java, REF.python],
    5: ['SEBESTA, R. W. <em>Conceitos de linguagens de programação</em>. 11. ed. Porto Alegre: Bookman, 2018.', REF.c, REF.java, REF.python]
  };

  const OBJETIVOS = {
    1: {
      objetivos: ['Definir algoritmo e citar suas propriedades (definição, finitude, efetividade, entradas e saídas).',
                  'Reconhecer as formas de representar um algoritmo: descrição narrativa, fluxograma e pseudocódigo.',
                  'Explicar, em linhas gerais, como o computador executa instruções, passo a passo.',
                  'Perceber que o mesmo algoritmo pode ser escrito em Python, Java e C.'],
      revisao: 'Esta é a primeira unidade e não exige conhecimento prévio de programação. Antes de começar, pense em uma receita ou em um passo a passo do seu dia a dia: ele já é um algoritmo.'
    },
    2: {
      objetivos: ['Declarar variáveis e escolher o tipo adequado (inteiro, real, texto).',
                  'Atribuir, ler e atualizar valores de variáveis.',
                  'Montar expressões aritméticas respeitando a precedência dos operadores.',
                  'Comparar como Python, Java e C declaram e usam variáveis.'],
      revisao: 'Da Unidade 1: todo algoritmo tem entrada, processamento e saída. Em um programa, as variáveis guardam as entradas e os resultados intermediários.'
    },
    3: {
      objetivos: ['Usar if, else e else if para escolher caminhos no programa.',
                  'Combinar condições com operadores relacionais e lógicos.',
                  'Reconhecer a decisão múltipla (switch) e quando usá-la.',
                  'Identificar como cada linguagem escreve o “senão se” (elif ou else if).'],
      revisao: 'Da Unidade 2: variáveis guardam valores e operadores relacionais comparam esses valores. Agora o resultado dessa comparação (verdadeiro ou falso) decide qual caminho o programa segue.'
    },
    4: {
      objetivos: ['Explicar por que usar laços de repetição.',
                  'Escolher entre for, while e do-while conforme o problema.',
                  'Usar break e continue para controlar o laço.',
                  'Traduzir um laço for entre Python, Java e C (por exemplo, range).'],
      revisao: 'Da Unidade 3: uma condição devolve verdadeiro ou falso. Em um laço, a mesma condição é testada várias vezes para decidir se o bloco se repete.'
    },
    5: {
      objetivos: ['Identificar o que muda (sintaxe) e o que permanece (lógica) entre Python, Java e C.',
                  'Explicar diferenças de tipagem e de gerenciamento de memória.',
                  'Comparar como cada linguagem é executada (interpretada, compilada, máquina virtual).',
                  'Escolher uma linguagem de forma justificada para um contexto.'],
      revisao: 'Das Unidades 1 a 4: algoritmo, variáveis, decisão e repetição. Esta unidade reúne esses conceitos para comparar as três linguagens lado a lado.'
    }
  };

  const ETAPAS = {
    conteudo: 'Ao concluir esta etapa, você deve ser capaz de explicar os conceitos centrais da unidade com suas próprias palavras.',
    comparacao: 'Ao concluir esta etapa, você deve ser capaz de apontar o que muda (a sintaxe) e o que permanece (a lógica) no mesmo programa escrito em Python, Java e C.',
    exercicios: 'Ao concluir esta etapa, você terá praticado os conceitos. Para liberar a próxima unidade é preciso acertar pelo menos 80% das questões.'
  };

  const COMPARACAO = {
    1: {
      intro: 'O mesmo algoritmo (ler duas notas, calcular a média e classificar o aluno) foi escrito nas três linguagens. Leia primeiro o que observar, depois compare os códigos: os trechos realçados são os que mudam de uma linguagem para outra; o restante é a lógica que permanece.',
      muda: ['Declaração de tipos: Python não exige; Java e C exigem.', 'Entrada e saída: input/print, Scanner/printf e scanf/printf.', 'Delimitação dos blocos: indentação (Python) ou chaves (Java e C).'],
      permanece: ['A sequência: ler as notas → calcular a média → comparar com 7,0 → mostrar o resultado.', 'A decisão if/else e o cálculo (nota1 + nota2) / 2.'],
      foco: {
        python: ['Sem declaração de tipo: <code>float(input(...))</code> já cria a variável.', 'O bloco do <code>if</code>/<code>else</code> é marcado por <code>:</code> e pela indentação.', '<code>input</code> e <code>print</code> fazem a entrada e a saída.'],
        java: ['Todo o código fica dentro de uma classe e do método <code>main</code>.', 'Tipos obrigatórios (<code>double</code>) e leitura com <code>Scanner</code>.', 'Blocos entre chaves; cada comando termina em <code>;</code>.'],
        c: ['<code>#include &lt;stdio.h&gt;</code> libera <code>printf</code> e <code>scanf</code>.', 'Tipos obrigatórios (<code>float</code>); <code>scanf</code> usa <code>&amp;</code> antes da variável.', 'Blocos entre chaves; <code>main</code> termina com <code>return 0;</code>.']
      }
    },
    2: {
      intro: 'Aqui o problema é calcular o IMC e classificar o resultado. Observe como cada linguagem declara variáveis, trata texto e números e faz a potência. Os trechos realçados mostram essas diferenças.',
      muda: ['Tipos de texto e de número: str / String / char[].', 'Potência: <code>**</code>, <code>Math.pow()</code> ou multiplicação direta.', 'Formatação da saída: f-string ou <code>%.2f</code>.'],
      permanece: ['Ler nome, peso e altura; calcular imc = peso / altura²; classificar por faixas; mostrar o resultado.', 'A cadeia de decisões, da menor faixa para a maior.'],
      foco: {
        python: ['Variáveis criadas por atribuição, sem tipo.', 'Potência com <code>**</code>.', 'f-string insere variáveis no texto; <code>elif</code> no lugar de <code>else if</code>.'],
        java: ['Cada variável tem tipo (<code>String</code>, <code>double</code>).', 'Potência com <code>Math.pow()</code>.', '<code>printf</code> com <code>%s</code> e <code>%.2f</code>; <code>else if</code> em duas palavras.'],
        c: ['Texto é um vetor de caracteres com tamanho fixo: <code>char nome[50]</code>.', 'Potência feita por multiplicação: <code>altura * altura</code>.', '<code>scanf</code> usa <code>&amp;</code>, exceto para o vetor de caracteres.']
      }
    },
    3: {
      intro: 'A decisão em cadeia (se, senão se, senão) é igual nas três linguagens; muda só a escrita. Procure no código o <em>elif</em> do Python e o <em>else if</em> de Java e C, e note como cada uma delimita os blocos.',
      muda: ['Escrita do “senão se”: <code>elif</code> ou <code>else if</code>.', 'Uso de chaves ou de indentação.', 'Como o resultado é mostrado (variável texto ou impressão direta).'],
      permanece: ['Testar do maior para o menor limite.', 'Só um ramo executa: o primeiro cuja condição é verdadeira.'],
      foco: {
        python: ['<code>elif</code> (uma palavra) em vez de <code>else if</code>.', 'A variável <code>conceito</code> guarda o resultado e <code>print</code> aparece uma vez no final.', 'Sem tipos e sem chaves.'],
        java: ['<code>else if</code> em duas palavras, com chaves.', '<code>String conceito;</code> é declarada antes do <code>if</code>.', '<code>printf</code> com <code>%.1f</code> e <code>%s</code>.'],
        c: ['Ramos de um comando só podem dispensar chaves.', '<code>else if</code> em duas palavras.', 'Cada ramo imprime o conceito diretamente.']
      }
    },
    4: {
      intro: 'O cálculo do fatorial usa um laço <em>for</em>. A lógica (começar em 1 e multiplicar por cada i até n) é a mesma; o que muda é o cabeçalho do laço e o tipo numérico. Compare os trechos realçados.',
      muda: ['Cabeçalho do laço: <code>range(1, n + 1)</code> ou <code>for (int i = 1; i &lt;= n; i++)</code>.', 'Tipo numérico: sem tipo, <code>long</code> ou <code>long long</code>.', 'Impressão: f-string, concatenação ou <code>printf</code>.'],
      permanece: ['Inicializar fatorial = 1 e multiplicar por cada i de 1 até n.', 'Verificar n &lt; 0 antes do laço; o operador <code>*=</code> nas três.'],
      foco: {
        python: ['<code>range(1, n + 1)</code>: o limite superior é exclusivo.', 'Sem tipo: o inteiro cresce conforme necessário.', '<code>*=</code> igual às outras linguagens.'],
        java: ['O <code>for</code> reúne início, condição e passo.', '<code>long</code> (64 bits) para o fatorial.', 'Concatenação com <code>+</code> para mostrar o resultado.'],
        c: ['Mesmo <code>for</code> do Java.', '<code>long long</code> e <code>%lld</code> para o fatorial.', '<code>printf</code> com <code>%d</code> e <code>%lld</code>.']
      }
    },
    5: {
      intro: 'O problema agora usa uma coleção de números (soma, maior valor e busca). Observe que a estrutura de dados muda muito entre as linguagens, mas o algoritmo é o mesmo: percorrer os elementos acumulando e comparando.',
      muda: ['Estrutura de dados: lista dinâmica ou array de tamanho fixo.', 'Recursos prontos (<code>sum</code>, <code>max</code>, <code>in</code>) ou implementação manual.', 'Conversão de tipos (cast) na divisão.'],
      permanece: ['Percorrer os elementos acumulando a soma e o maior valor.', 'Buscar um alvo e informar a posição ou “não encontrado”.', 'Média = soma / quantidade.'],
      foco: {
        python: ['Lista dinâmica: <code>numeros = []</code> e <code>append</code>.', 'Funções prontas <code>sum</code>, <code>max</code> e <code>len</code>.', 'O operador <code>in</code> faz a busca.'],
        java: ['Array de tamanho fixo (<code>new int[5]</code>) e <code>.length</code>.', 'For-each: <code>for (int n : numeros)</code>.', 'Cast <code>(double)</code> para dividir com decimais.'],
        c: ['Array de tamanho fixo (<code>int numeros[5]</code>), sem <code>.length</code>.', 'Soma, maior valor e busca feitos com laços <code>for</code>.', 'Cast <code>(float)</code> e variável <code>enc</code> como 0 ou 1.']
      }
    }
  };

  window.COMPLEMENTO = { OBJETIVOS: OBJETIVOS, ETAPAS: ETAPAS, REFERENCIAS: REFERENCIAS, DIAGRAMAS: DIAGRAMAS, COMPARACAO: COMPARACAO };
})();
