if (!process.argv.includes('--force')) {
  console.error('seed_content.js foi bloqueado para não sobrescrever as correções de conteúdo em dados.json. Use --force para ignorar este aviso.');
  process.exit(1);
}

const fs   = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'dados.json');
if (!fs.existsSync(DB_FILE)) {
  console.error('Banco não encontrado. Inicie o servidor primeiro para criar o banco.');
  process.exit(1);
}

const dados = JSON.parse(fs.readFileSync(DB_FILE,'utf8'));
dados._ids = dados._ids || {};

function nextId(tabela) {
  dados._ids[tabela] = (dados._ids[tabela]||0)+1;
  return dados._ids[tabela];
}
function addConteudo(unidade_id, titulo, corpo, tipo, ordem) {
  dados.conteudos.push({ id:nextId('conteudos'), unidade_id, titulo, corpo, tipo, ordem, criado_em:new Date().toISOString() });
}
function addExercicio(unidade_id, enunciado, tipo, opcoes, resposta_correta, explicacao, categoria, ordem) {
  dados.exercicios.push({
    id: nextId('exercicios'), unidade_id, enunciado, tipo,
    opcoes: opcoes ? JSON.stringify(opcoes) : null,
    resposta_correta, explicacao: explicacao||'',
    categoria: categoria||'formativa', ordem,
    criado_em: new Date().toISOString()
  });
}

dados.conteudos  = [];
dados.exercicios = [];
dados._ids.conteudos  = 0;
dados._ids.exercicios = 0;

addConteudo(1,
  'O que é um Algoritmo?',
  `<p>Um algoritmo é uma <strong>sequência finita, ordenada e não ambígua</strong> de passos para solucionar um problema ou realizar uma tarefa.</p>
<p>A palavra "Algoritmo" vem do nome do matemático persa Mohammed ibn Musa Al-Khowarizmi, que viveu por volta de 800 d.C. e cujos trabalhos introduziram o cálculo hindu na Europa.</p>
<p>Algoritmos não existem apenas na computação, você já criou vários hoje: a ordem de escovar os dentes, a receita de um bolo, as instruções de um manual. O que muda na computação é que os passos precisam ser precisos o suficiente para que um computador, que não tem julgamento próprio, possa executá-los corretamente.</p>
<p><strong>Todo algoritmo computacional precisa ter:</strong></p>
<ul>
<li><strong>Definição:</strong> cada passo deve ser claro, sem dupla interpretação</li>
<li><strong>Finitude:</strong> deve terminar após um número finito de passos</li>
<li><strong>Efetividade:</strong> as operações precisam ser simples o suficiente para serem executadas exatamente</li>
<li><strong>Entradas:</strong> zero ou mais dados que o algoritmo recebe para processar</li>
<li><strong>Saídas:</strong> um ou mais resultados produzidos ao final</li>
</ul>
<p><strong>Exemplo, Algoritmo para fritar um ovo:</strong></p>
<pre>1. Retire o ovo da geladeira
2. Coloque a frigideira no fogo
3. Coloque óleo na frigideira
4. Quebre o ovo, separando a casca
5. Ponha a clara e a gema na frigideira
6. Espere um minuto
7. Apague o fogo
8. Retire o ovo da frigideira</pre>
<p>Perceba: os passos são claros (definição), têm início e fim (finitude), e cada um é uma ação simples e executável (efetividade).</p>`,
  'texto', 1
);

addConteudo(1,
  'Como Representar Algoritmos?',
  `<p>Existem três formas principais de representar um algoritmo. Cada uma tem vantagens e desvantagens.</p>
<p><strong>1. Descrição Narrativa</strong><br>
Usa linguagem natural (português, inglês etc.). É a mais fácil de criar, mas a mais sujeita a ambiguidades.<br>
✓ Vantagem: qualquer pessoa entende. ✗ Desvantagem: difícil de traduzir diretamente para código.</p>
<p><strong>2. Fluxograma</strong><br>
Usa formas geométricas padronizadas internacionalmente:</p>
<ul>
<li><strong>Oval/Elipse</strong> → Início e Fim</li>
<li><strong>Retângulo</strong> → Processamento (cálculo, atribuição)</li>
<li><strong>Paralelogramo</strong> → Entrada ou Saída de dados</li>
<li><strong>Losango</strong> → Decisão (ponto de escolha: sim/não)</li>
<li><strong>Seta</strong> → Direção do fluxo</li>
</ul>
<p>✓ Vantagem: visual, padrão mundial. ✗ Desvantagem: fica grande para algoritmos complexos.</p>
<p><strong>3. Pseudocódigo (Linguagem Algorítmica)</strong><br>
Linguagem "Do meio do caminho", mais rigorosa que o português, mais flexível que uma linguagem de programação. Usa palavras como: ALGORITMO, DECLARE, LEIA, ESCREVA, SE/ENTÃO/SENÃO, ENQUANTO, PARA.</p>
<p>✓ Vantagem: muito próxima das linguagens de programação reais. ✗ Desvantagem: menos expressiva que a narrativa.</p>
<p><strong>Exemplo em pseudocódigo, Calcular média:</strong></p>
<pre>ALGORITMO
  DECLARE nota1, nota2, M : NUMÉRICO
  LEIA nota1
  LEIA nota2
  M &lt;- (nota1 + nota2) / 2
  SE M &gt;= 7.0 ENTÃO
    ESCREVA "Aprovado"
  SENÃO
    ESCREVA "Reprovado"
  FIM-SE
FIM_ALGORITMO</pre>
<p>Este mesmo algoritmo, quando traduzido para C, Java ou Python, manterá a mesma lógica, apenas a sintaxe muda.</p>`,
  'texto', 2
);

addConteudo(1,
  'Como o Computador Executa um Algoritmo?',
  `<p>Para entender como um algoritmo vira um programa, precisamos entender dois conceitos: a <strong>arquitetura de Von Neumann</strong> e os <strong>tradutores</strong>.</p>
<p><strong>Arquitetura de Von Neumann</strong><br>
Todos os computadores modernos seguem um modelo proposto por John Von Neumann: instruções e dados ficam juntos na memória. O processador executa um ciclo contínuo:</p>
<pre>1. Buscar instrução na memória
2. Decodificar a instrução
3. Executar a instrução
4. Voltar ao passo 1</pre>
<p>Este ciclo explica por que algoritmos funcionam: o computador executa os passos um de cada vez, na ordem em que aparecem.</p>
<p><strong>Compiladores e Interpretadores</strong></p>
<ul>
<li><strong>Compilador:</strong> traduz todo o programa de uma vez para código de máquina antes de executar. C usa compilador, mais rápido na execução.</li>
<li><strong>Interpretador:</strong> traduz e executa instrução por instrução. Python usa interpretador, mais flexível para desenvolvimento.</li>
<li><strong>Java</strong> usa abordagem híbrida: compila para bytecode, interpretado pela JVM. Por isso Java é portável: "Escreva uma vez, execute em qualquer lugar".</li>
</ul>
<p><strong>Paradigmas de Programação</strong></p>
<ul>
<li><strong>Imperativo/Estruturado:</strong> descreve o passo a passo (C, Java, Python)</li>
<li><strong>Orientado a Objetos:</strong> modela o problema como objetos (Java, Python)</li>
<li><strong>Declarativo:</strong> descreve o que você quer, não como obter (SQL, HTML)</li>
</ul>
<p>Neste curso usaremos o paradigma estruturado, que trabalha com três tipos: <strong>sequencial</strong>, <strong>condicional</strong> e <strong>de repetição</strong>.</p>`,
  'texto', 3
);

addConteudo(1,
  'Comparação, Algoritmo de Média com Classificação',
  JSON.stringify({
    python: `# Calcula média de duas notas e classifica o aluno
# Python: sem declaração de tipo, usa input() para ler dados
nota1 = float(input('Digite a nota 1: '))
nota2 = float(input('Digite a nota 2: '))
media = (nota1 + nota2) / 2
if media >= 7.0:
    print('Aprovado! Média:', media)
else:
    print('Reprovado. Média:', media)`,
    java: `// Calcula média de duas notas e classifica o aluno
// Java: tipos obrigatórios, tudo dentro de uma classe
import java.util.Scanner;
public class MediaAluno {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        double nota1 = sc.nextDouble();
        double nota2 = sc.nextDouble();
        double media = (nota1 + nota2) / 2;
        if (media >= 7.0) {
            System.out.printf("Aprovado! Media: %.2f%n", media);
        } else {
            System.out.printf("Reprovado. Media: %.2f%n", media);
        }
    }
}`,
    c: `// Calcula média de duas notas e classifica o aluno
// C: tipos obrigatórios, scanf/printf para I/O
#include <stdio.h>
int main() {
    float nota1, nota2, media;
    scanf("%f", &nota1);
    scanf("%f", &nota2);
    media = (nota1 + nota2) / 2;
    if (media >= 7.0) {
        printf("Aprovado! Media: %.2f\\n", media);
    } else {
        printf("Reprovado. Media: %.2f\\n", media);
    }
    return 0;
}`,
    observacoes: `<strong>O que observar:</strong> Python não exige declaração de tipo. Java requer que todo código esteja dentro de uma classe. C usa #include para acessar printf/scanf. A lógica é idêntica nas três: ler notas → calcular média → comparar → exibir resultado.`
  }),
  'comparacao', 4
);

addExercicio(1, JSON.stringify({tipo:'texto',texto:'Segundo os livros de referência, qual é a definição mais precisa de algoritmo no contexto da computação?'}), 'multipla_escolha',
  ['Um software instalado no computador para resolver problemas específicos','Uma sequência finita, ordenada e não ambígua de passos para solucionar um problema ou realizar uma tarefa','Uma linguagem de programação de alto nível utilizada por programadores','Um tipo de dado especial usado para armazenar instruções'],
  'Uma sequência finita, ordenada e não ambígua de passos para solucionar um problema ou realizar uma tarefa',
  'Algoritmo é a sequência de passos, finita, ordenada e não ambígua, que resolve um problema. Não depende de linguagem de programação. 💡 Dica: Pense em uma receita culinária: ela é um algoritmo, existe independente de estar escrita em português ou inglês.',
  'formativa', 1
);

addExercicio(1, JSON.stringify({tipo:'texto',texto:'Um estudante criou um algoritmo para calcular a tabuada do 5. O passo 5 diz: "Se i <= 10, volte ao passo 1" (em vez de voltar ao passo 2). Qual propriedade do algoritmo está sendo VIOLADA?'}), 'multipla_escolha',
  ['Definição','Finitude','Efetividade','Saída'],
  'Finitude',
  'Voltar ao passo 1 reiniciaria a variável i para 1 para sempre, criando um laço sem fim, violando a Finitude. 💡 Dica: Simule na cabeça: i começa em 1. Se o passo 5 voltasse ao passo 1, i voltaria a 1, o ciclo nunca terminaria.',
  'formativa', 2
);

addExercicio(1, JSON.stringify({tipo:'texto',texto:'Qual é a ordem correta das etapas em um algoritmo para calcular a média de um aluno?'}), 'multipla_escolha',
  ['Obter nota1 → Calcular média → Obter nota2 → Verificar aprovação','Início → Obter nota1 → Obter nota2 → Calcular média → Verificar aprovação → Fim','Calcular média → Obter notas → Verificar aprovação → Início → Fim','Obter nota1 → Verificar aprovação → Obter nota2 → Calcular média'],
  'Início → Obter nota1 → Obter nota2 → Calcular média → Verificar aprovação → Fim',
  'Em qualquer algoritmo: primeiro obtemos os dados de entrada, depois processamos, depois geramos saída. Não é possível calcular uma média sem ter as notas antes. 💡 Dica: Todo algoritmo segue o padrão EPO: Entrada → Processamento → Saída.',
  'formativa', 3
);

addExercicio(1, JSON.stringify({tipo:'texto',texto:'Qual das formas de representação de algoritmos é mais adequada para facilitar a tradução direta para uma linguagem de programação?'}), 'multipla_escolha',
  ['Descrição narrativa','Fluxograma','Pseudocódigo (linguagem algorítmica)','Diagrama de entidade-relacionamento'],
  'Pseudocódigo (linguagem algorítmica)',
  'O pseudocódigo usa estruturas (SE/ENTÃO, ENQUANTO, PARA) muito semelhantes às linguagens reais. Traduzir para C ou Python é quase mecânico. 💡 Dica: Compare o pseudocódigo com o código C, linha por linha, eles são quase idênticos.',
  'formativa', 4
);

addExercicio(1, JSON.stringify({tipo:'texto',texto:'Segundo a arquitetura de Von Neumann, o processador busca e executa as instruções de forma sequencial na memória, uma de cada vez, seguindo o ciclo: busca → decodifica → executa → busca próxima.'}), 'verdadeiro_falso',
  null, 'verdadeiro',
  'O ciclo busca-decodifica-executa é a base dos computadores modernos. Isso explica por que os programas executam passo a passo. 💡 Dica: Pense no processador como um leitor muito veloz que lê e executa uma instrução de cada vez, nunca pulando.',
  'formativa', 5
);

addConteudo(2, 'O que é uma Variável?',
  `<p>Imagine a memória do computador como um grande <strong>armário cheio de gavetas</strong>. Cada gaveta tem um número (endereço) e pode guardar um valor. Uma variável é justamente o apelido que damos a uma dessas gavetas para identificá-la de forma amigável.</p>
<p>Se declaramos <code>int idade = 18;</code>, estamos dizendo: "Reserve uma gaveta, chame-a de <code>idade</code>, e coloque o valor 18 nela".</p>
<p><strong>Três coisas que definem uma variável:</strong></p>
<ol><li><strong>Nome (identificador):</strong> como chamamos a variável no código</li>
<li><strong>Tipo:</strong> que tipo de dado ela armazena (inteiro, decimal, caractere…)</li>
<li><strong>Valor:</strong> o conteúdo atual armazenado</li></ol>
<p><strong>Regras para nomear variáveis em C:</strong></p>
<ul>
<li>Pode usar letras, números e sublinha (<code>_</code>)</li>
<li>Deve começar com letra ou sublinha, nunca com número</li>
<li>Não pode ter espaços nem caracteres especiais (ç, ã, etc.)</li>
<li>Não pode ser uma palavra reservada (<code>if</code>, <code>while</code>, <code>int</code>…)</li>
<li>C diferencia maiúsculas: <code>nota</code> e <code>Nota</code> são variáveis diferentes!</li>
</ul>
<p>✅ Válidos: <code>nota1</code>, <code>media_final</code>, <code>nomeAluno</code>, <code>_total</code><br>
❌ Inválidos: <code>3notas</code>, <code>nota final</code>, <code>if</code>, <code>COMPUTAÇÃO</code></p>`,
  'texto', 1
);

addConteudo(2, 'Tipos de Dados',
  `<p>Cada variável precisa de um tipo, pois tipos diferentes ocupam quantidades diferentes de memória. Em C, os tipos primitivos são:</p>
<pre>int   , 4 bytes, Números inteiros         ex: int idade = 20;
float , 4 bytes, Decimais (simples)       ex: float altura = 1.75f;
double, 8 bytes, Decimais (maior precisão) ex: double pi = 3.14159;
char  , 1 byte , Um caractere             ex: char letra = 'A';</pre>
<p><strong>Curiosidade sobre char:</strong> O tipo <code>char</code> armazena um caractere usando a tabela ASCII, uma correspondência entre letras e números. A letra <code>'A'</code> corresponde ao número 65. Por isso em C você pode usar <code>char</code> tanto para letras quanto para inteiros pequenos.</p>
<p><strong>Diferenças entre as linguagens:</strong></p>
<ul>
<li><strong>Python:</strong> tipagem dinâmica, <code>x = 10</code> cria um inteiro automaticamente</li>
<li><strong>Java:</strong> tipagem estática, obrigatório declarar: <code>int x = 10;</code></li>
<li><strong>C:</strong> tipagem estática, obrigatório declarar: <code>int x = 10;</code></li>
</ul>
<p><strong>Divisão de inteiros, atenção!</strong><br>
Em C e Java, dividir dois inteiros produz um resultado inteiro, a parte decimal é descartada! <code>10 / 3 = 3</code>, não 3.33. Para obter decimal, ao menos um operando deve ser float: <code>10.0 / 3 = 3.33</code>.</p>`,
  'texto', 2
);

addConteudo(2, 'Operações com Variáveis',
  `<p>Com variáveis declaradas, podemos realizar operações. Os <strong>operadores aritméticos</strong> em C:</p>
<pre>+  → Adição:        5 + 3 = 8
→ Subtração:     10 - 4 = 6
*  → Multiplicação: 6 * 7 = 42
/  → Divisão:       10 / 3 = 3  (inteiros!)
%  → Resto:         10 % 3 = 1</pre>
<p><strong>Precedência</strong> segue a matemática: multiplicação e divisão antes de adição e subtração. Use parênteses para mudar a ordem:</p>
<pre>int r1 = 2 + 3 * 4;     // r1 = 14 (multiplicação primeiro)
int r2 = (2 + 3) * 4;   // r2 = 20 (parênteses primeiro)</pre>
<p><strong>Incremento e decremento:</strong></p>
<pre>x++;   // equivale a x = x + 1 (incrementa depois de usar)
++x;   // incrementa antes de usar
x--;   // equivale a x = x - 1</pre>
<p><strong>Constantes simbólicas</strong>, para valores que nunca mudam, use:</p>
<pre>#define PI 3.14159
#define ACELERACAO_GRAVIDADE 9.8</pre>
<p>Assim, se o valor precisar mudar, você altera em apenas um lugar.</p>`,
  'texto', 3
);

addConteudo(2, 'Comparação, Cálculo de IMC',
  JSON.stringify({
    python: `# Variáveis em Python, sem declaração de tipo
nome = input('Seu nome: ')
peso = float(input('Peso (kg): '))
altura = float(input('Altura (m): '))
imc = peso / (altura ** 2)   # ** é potência em Python
print(f'{nome}, seu IMC é: {imc:.2f}')
if imc < 18.5:
    print('Abaixo do peso')
elif imc < 25.0:
    print('Peso normal')
else:
    print('Acima do peso')`,
    java: `// Variáveis em Java, tipos obrigatórios
import java.util.Scanner;
public class IMC {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String nome = sc.nextLine();
        double peso = sc.nextDouble();
        double altura = sc.nextDouble();
        double imc = peso / Math.pow(altura, 2);
        System.out.printf("%s, seu IMC: %.2f%n", nome, imc);
        if (imc < 18.5)
            System.out.println("Abaixo do peso");
        else if (imc < 25.0)
            System.out.println("Peso normal");
        else
            System.out.println("Acima do peso");
    }
}`,
    c: `// Variáveis em C, declaração explícita obrigatória
#include <stdio.h>
int main() {
    char nome[50];
    float peso, altura, imc;
    scanf("%s", nome);
    scanf("%f", &peso);
    scanf("%f", &altura);
    imc = peso / (altura * altura);
    printf("%s, seu IMC: %.2f\\n", nome, imc);
    if (imc < 18.5)
        printf("Abaixo do peso\\n");
    else if (imc < 25.0)
        printf("Peso normal\\n");
    else
        printf("Acima do peso\\n");
    return 0;
}`,
    observacoes: `<strong>Potência:</strong> Python usa <code>**</code>, Java usa <code>Math.pow()</code>, C usa multiplicação direta.<br><strong>Texto:</strong> Python usa <code>str</code>, Java usa <code>String</code>, C usa array de <code>char</code> com tamanho fixo.<br><strong>Formatação:</strong> Python usa f-strings (<code>f'{var:.2f}'</code>), Java e C usam <code>%.2f</code>.`
  }),
  'comparacao', 4
);

addExercicio(2, JSON.stringify({tipo:'codigo',texto:'Analise o código C abaixo. Qual valor será impresso?',codigo:'int a = 5;\nint b = 3;\nint c = a * b + 2;\nprintf("%d", c);',linguagem:'c'}), 'multipla_escolha',
  ['17','40','13','10'], '17',
  'C = 5 * 3 + 2. Multiplicação primeiro: 5 × 3 = 15. Depois adição: 15 + 2 = 17. 💡 Dica: Em matemática, 5 × 3 + 2 = 17, não 25. Programação segue a mesma regra de precedência!',
  'formativa', 1
);

addExercicio(2, JSON.stringify({tipo:'texto',texto:'Qual é a principal diferença entre uma variável e uma constante simbólica em C?'}), 'multipla_escolha',
  ['Variáveis são mais rápidas; constantes são mais lentas','Uma variável pode ter seu valor alterado durante a execução; uma constante mantém o mesmo valor do início ao fim','Constantes só podem armazenar números; variáveis armazenam qualquer tipo','Não há diferença prática entre elas'],
  'Uma variável pode ter seu valor alterado durante a execução; uma constante mantém o mesmo valor do início ao fim',
  'Uma variável é uma posição de memória cujo conteúdo pode ser modificado. Uma constante (com #define ou const) tem seu valor fixado. Usar constantes para valores que nunca mudam (como PI) torna o código mais legível. 💡 Dica: "Const" vem de "Constante", algo que não muda.',
  'formativa', 2
);

addExercicio(2, JSON.stringify({tipo:'texto',texto:'Em C, qual é a forma correta de declarar simultaneamente duas variáveis inteiras chamadas x e y?'}), 'multipla_escolha',
  ['int x, y;','x, y : int;','Integer x; integer y;','var x, y = int;'],
  'int x, y;',
  'Em C, é possível declarar múltiplas variáveis do mesmo tipo separando os nomes por vírgula: tipo var1, var2; A sintaxe é sempre: tipo primeiro, depois os nomes. 💡 Dica: As outras opções usam sintaxes de Pascal ou pseudocódigo.',
  'formativa', 3
);

addExercicio(2, JSON.stringify({tipo:'codigo',texto:'Qual será o valor de resultado após a execução?',codigo:'float x = 7.0;\nfloat y = 2.0;\nfloat resultado = x / y;',linguagem:'c'}), 'multipla_escolha',
  ['3','3.0','3.5','Erro, divisão de floats não é permitida'],
  '3.5',
  'Quando ambas as variáveis são float, a divisão preserva as casas decimais. 7.0 / 2.0 = 3.5. Se fossem int (7/2), seria 3. 💡 Dica: A regra é simples: se pelo menos um operando é float, o resultado é float.',
  'formativa', 4
);

addExercicio(2, JSON.stringify({tipo:'texto',texto:'O tipo char em C só pode armazenar letras do alfabeto, não podendo armazenar números inteiros.'}), 'verdadeiro_falso',
  null, 'falso',
  'O tipo char em C armazena 1 byte e pode representar tanto um caractere (pela tabela ASCII) quanto um número inteiro de -128 a 127. O caractere "A" corresponde ao inteiro 65 na tabela ASCII. 💡 Dica: Tente char c = 65; printf("%c", c);, o resultado será a letra "A"!',
  'formativa', 5
);

addConteudo(3, 'Tomando Decisões no Código',
  `<p>Na vida real, tomamos decisões o tempo todo: "Se chover, vou de guarda-chuva. Senão, vou sem." Em programação, usamos as <strong>estruturas condicionais</strong> para que o programa tome decisões com base em condições.</p>
<p><strong>Os três tipos de decisão:</strong></p>
<ol>
<li><strong>Decisão simples (if):</strong> executa um bloco só se a condição for verdadeira</li>
<li><strong>Decisão composta (if/else):</strong> executa um bloco se verdadeiro, outro se falso</li>
<li><strong>Decisão múltipla (if/else if/else ou switch):</strong> testa múltiplas condições</li>
</ol>
<p><strong>Sintaxe em C:</strong></p>
<pre>// Decisão simples
if (condição) {
    // executa só se verdadeira
}

// Decisão composta
if (condição) {
    // executa se verdadeira
} else {
    // executa se falsa
}

// Decisão múltipla
if (condição1) {
    ...
} else if (condição2) {
    ...
} else {
    // nenhuma das anteriores
}</pre>
<p><strong>⚠️ Erro mais comum:</strong> confundir <code>=</code> (atribuição) com <code>==</code> (comparação).</p>
<pre>x = 5;    // ATRIBUIÇÃO: guarda 5 em x
x == 5;   // COMPARAÇÃO: verifica se x é igual a 5</pre>
<p>Usar <code>=</code> dentro de um <code>if</code> no lugar de <code>==</code> é um bug silencioso, compila mas se comporta errado!</p>`,
  'texto', 1
);

addConteudo(3, 'Operadores Relacionais e Lógicos',
  `<p><strong>Operadores relacionais</strong>, comparam dois valores:</p>
<pre>&gt;   → Maior que         ex: x &gt; 10
&lt;   → Menor que         ex: y &lt; 0
&gt;=  → Maior ou igual    ex: nota &gt;= 7
&lt;=  → Menor ou igual    ex: idade &lt;= 18
==  → Igual a           ex: opcao == 1
!=  → Diferente de      ex: senha != 0</pre>
<p><strong>Operadores lógicos</strong>, combinam condições:</p>
<pre>&amp;&amp;  → E (AND)  , verdadeiro se AMBAS forem verdadeiras
||  → OU (OR)  , verdadeiro se PELO MENOS UMA for verdadeira
!   → NÃO (NOT), inverte: verdadeiro vira falso</pre>
<p><strong>Tabela-verdade resumida:</strong></p>
<pre>true  &amp;&amp; true  = true
true  &amp;&amp; false = false
false &amp;&amp; false = false

true  || false = true
false || false = false

!true  = false
!false = true</pre>
<p><strong>Exemplo prático, verificar nota válida:</strong></p>
<pre>float nota;
scanf("%f", &amp;nota);
if (nota &gt;= 0 &amp;&amp; nota &lt;= 10) {
    if (nota &gt;= 7) {
        printf("Aprovado");
    } else {
        printf("Reprovado");
    }
} else {
    printf("Nota inválida");
}</pre>
<p>Em Python, os operadores lógicos são por extenso: <code>and</code>, <code>or</code>, <code>not</code>. Em Java e C, são os símbolos: <code>&amp;&amp;</code>, <code>||</code>, <code>!</code>.</p>`,
  'texto', 2
);

addConteudo(3, 'Decisão Múltipla com switch',
  `<p>Quando temos muitas possibilidades para um mesmo valor, o <code>switch</code> é mais legível que uma série de <code>if/else if</code>.</p>
<pre>int dia;
scanf("%d", &amp;dia);
switch (dia) {
    case 1:  printf("Domingo");    break;
    case 2:  printf("Segunda");    break;
    case 3:  printf("Terça");      break;
    case 4:  printf("Quarta");     break;
    case 5:  printf("Quinta");     break;
    case 6:  printf("Sexta");      break;
    case 7:  printf("Sábado");     break;
    default: printf("Dia inválido");
}</pre>
<p><strong>Pontos importantes:</strong></p>
<ul>
<li><code>switch</code> só funciona com valores inteiros (<code>int</code>) ou caracteres (<code>char</code>)</li>
<li>O <code>break</code> ao final de cada <code>case</code> é obrigatório, sem ele, a execução "cai" para o próximo case</li>
<li><code>default</code> é opcional e captura qualquer valor não coberto pelos <code>case</code></li>
</ul>
<p><strong>Python não tem switch tradicional</strong>, usa <code>if/elif/else</code>. A partir do Python 3.10 foi introduzido <code>match/case</code>. Java tem <code>switch</code> com a mesma sintaxe do C.</p>`,
  'texto', 3
);

addConteudo(3, 'Comparação, Classificação de Notas',
  JSON.stringify({
    python: `# Classificação de notas, Python
# elif é a contração de "Else if" em Python
nota = float(input('Digite a nota (0 a 10): '))
if nota >= 9.0:
    conceito = 'A, Excelente'
elif nota >= 7.0:
    conceito = 'B, Bom'
elif nota >= 5.0:
    conceito = 'C, Regular'
elif nota >= 3.0:
    conceito = 'D, Insuficiente'
else:
    conceito = 'F, Reprovado'
print(f'Nota {nota:.1f} → Conceito: {conceito}')`,
    java: `// Classificação de notas, Java
import java.util.Scanner;
public class ClassificaNotas {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        double nota = sc.nextDouble();
        String conceito;
        if (nota >= 9.0) {
            conceito = "A, Excelente";
        } else if (nota >= 7.0) {
            conceito = "B, Bom";
        } else if (nota >= 5.0) {
            conceito = "C, Regular";
        } else if (nota >= 3.0) {
            conceito = "D, Insuficiente";
        } else {
            conceito = "F, Reprovado";
        }
        System.out.printf("Nota %.1f -> Conceito: %s%n", nota, conceito);
    }
}`,
    c: `// Classificação de notas, C
#include <stdio.h>
int main() {
    float nota;
    scanf("%f", &nota);
    if (nota >= 9.0)
        printf("A, Excelente\\n");
    else if (nota >= 7.0)
        printf("B, Bom\\n");
    else if (nota >= 5.0)
        printf("C, Regular\\n");
    else if (nota >= 3.0)
        printf("D, Insuficiente\\n");
    else
        printf("F, Reprovado\\n");
    return 0;
}`,
    observacoes: `<strong>Python</strong> usa <code>elif</code> (uma palavra) em vez de <code>else if</code> (duas palavras). <strong>Java e C</strong> são idênticos na estrutura. A lógica de testar do maior para o menor é igual nas três linguagens.`
  }),
  'comparacao', 4
);

addExercicio(3, JSON.stringify({tipo:'codigo',texto:'Analise o código C abaixo. Qual mensagem será exibida se x = 15?',codigo:'If (x > 10 && x < 20) {\n    printf("Entre 10 e 20");\n} else if (x >= 20) {\n    printf("Maior ou igual a 20");\n} else {\n    printf("Menor ou igual a 10");\n}',linguagem:'c'}), 'multipla_escolha',
  ['Menor ou igual a 10','Entre 10 e 20','Maior ou igual a 20','Nenhuma mensagem'],
  'Entre 10 e 20',
  'X = 15. Verificando: 15 > 10 é verdadeiro E 15 < 20 é verdadeiro. Como ambas as condições do && são verdadeiras, o primeiro bloco executa. 💡 Dica: Com &&, AMBAS precisam ser verdadeiras.',
  'formativa', 1
);

addExercicio(3, JSON.stringify({tipo:'texto',texto:'Qual é a diferença entre os operadores = e == em C?'}), 'multipla_escolha',
  ['Não há diferença, ambos comparam valores','= é o operador de atribuição (armazena um valor em uma variável); == é o operador de igualdade (compara dois valores)','== armazena valores; = compara','= é usado em Java; == é usado em C'],
  '= é o operador de atribuição (armazena um valor em uma variável); == é o operador de igualdade (compara dois valores)',
  '= (um sinal) atribui um valor a uma variável: x = 5 armazena 5 em x. == (dois sinais) compara: x == 5 verifica se x é igual a 5. Usar = em vez de == dentro de um if é um dos bugs mais comuns! 💡 Dica progressiva: if(x = 5) não compara, atribui 5 e verifica se 5 é não-zero!',
  'formativa', 2
);

addExercicio(3, JSON.stringify({tipo:'texto',texto:'Em Python, como seria escrita a estrutura condicional equivalente ao seguinte código C?\n\nif (temperatura > 30) { printf("Quente"); } else { printf("Frio"); }'}), 'multipla_escolha',
  ['If temperatura > 30 then: print("Quente") else: print("Frio")','If (temperatura > 30): print("Quente") else: print("Frio")','If temperatura > 30:\\n    print("Quente")\\nelse:\\n    print("Frio")','If {temperatura > 30} print("Quente") else print("Frio")'],
  'If temperatura > 30:\\n    print("Quente")\\nelse:\\n    print("Frio")',
  'Em Python: sem parênteses obrigatórios, termina com : (dois pontos), e o bloco é definido pela indentação. O else também termina com :. 💡 Dica: Em Python, a indentação não é estilo, é sintaxe obrigatória.',
  'formativa', 3
);

addExercicio(3, JSON.stringify({tipo:'codigo',texto:'Analise o código abaixo. Qual será a saída quando nota = 45?',codigo:'If (nota >= 90) {\n    printf("A");\n} else if (nota >= 80) {\n    printf("B");\n} else if (nota >= 70) {\n    printf("c");\n} else if (nota >= 60) {\n    printf("D");\n} else {\n    printf("F");\n}',linguagem:'c'}), 'multipla_escolha',
  ['D','C','F','B'],
  'F',
  'Nota = 45. Nenhuma condição (>=90, >=80, >=70, >=60) é satisfeita por 45, portanto o bloco else final executa, imprimindo "F". 💡 Dica: Em uma cadeia if/else if, o computador testa de cima para baixo e executa o PRIMEIRO bloco verdadeiro.',
  'formativa', 4
);

addExercicio(3, JSON.stringify({tipo:'texto',texto:'Em Java, ao contrário de C, não é possível usar o operador && para combinar condições em uma estrutura if. Deve-se usar o operador AND por extenso.'}), 'verdadeiro_falso',
  null, 'falso',
  'Java usa os mesmos operadores que C: && para AND, || para OR, ! para NOT. O operador AND por extenso existe em Python (and), não em Java nem C. 💡 Dica: C, Java → && / || / !   Python → and / or / not',
  'formativa', 5
);

addConteudo(4, 'Por que Repetir?, Introdução aos Laços',
  `<p>Imagine que você precisa imprimir "Olá" 1000 vezes. Escrever <code>printf("Olá\\n");</code> mil vezes seria inviável. As <strong>estruturas de repetição</strong> (laços ou loops) permitem que um bloco de código seja executado várias vezes automaticamente.</p>
<p><strong>Toda estrutura de repetição tem:</strong></p>
<ol>
<li><strong>Condição de parada:</strong> o teste que define se o laço continua ou para</li>
<li><strong>Corpo do laço:</strong> o bloco de código que é repetido</li>
<li><strong>Atualização:</strong> algo que muda a cada iteração para que a condição eventualmente se torne falsa</li>
</ol>
<p><strong>⚠️ Laço infinito, nunca faça sem intenção:</strong></p>
<pre>int x = 0;
while (x &lt; 10) {
    printf("X = %d\\n", x);
    // Esqueceu o x++ aqui!!! O laço nunca para.
}</pre>
<p>Em C existem três comandos de repetição: <code>while</code>, <code>do-while</code> e <code>for</code>. Cada um tem uma situação em que se encaixa melhor.</p>`,
  'texto', 1
);

addConteudo(4, 'Os Três Tipos de Laço',
  `<p><strong>1. while, "Enquanto"</strong><br>
Verifica a condição ANTES de executar o bloco. Se falsa desde o início, o bloco nunca executa.</p>
<pre>int cont = 1;
while (cont &lt;= 10) {
    printf("%d\\n", cont);
    cont++;    // atualização obrigatória!
}</pre>
<p>Use <code>while</code> quando não sabe quantas vezes vai repetir.</p>

<p><strong>2. do-while, "Faça...enquanto"</strong><br>
Executa o bloco PRIMEIRO e só depois verifica. Garante pelo menos uma execução.</p>
<pre>float nota;
do {
    printf("Digite uma nota (0 a 10): ");
    scanf("%f", &amp;nota);
} while (nota &lt; 0 || nota &gt; 10);</pre>
<p>Use <code>do-while</code> quando o bloco precisa executar ao menos uma vez.</p>

<p><strong>3. for, "para"</strong><br>
O for é compacto, deixa visível o início, condição e incremento na mesma linha. Ideal quando sabe exatamente quantas vezes repetir.</p>
<pre>// Estrutura: for (inicialização; condição; incremento)
for (int i = 1; i &lt;= 10; i++) {
    printf("%d\\n", i);
}</pre>

<p><strong>Regra prática:</strong></p>
<ul>
<li>Número de repetições conhecido → <code>for</code></li>
<li>Número desconhecido, pode ser zero repetições → <code>while</code></li>
<li>Número desconhecido, mínimo uma repetição → <code>do-while</code></li>
</ul>`,
  'texto', 2
);

addConteudo(4, 'Break, continue e Padrões de Laço',
  `<p><strong>break</strong>, encerra o laço imediatamente, saindo dele por completo.</p>
<pre>for (int i = 1; i &lt;= 100; i++) {
    if (i == 7) {
        printf("Encontrei o 7!\\n");
        break;  // sai do laço
    }
}</pre>

<p><strong>continue</strong>, pula o restante da iteração atual e vai para a próxima.</p>
<pre>// Imprime apenas os números ímpares de 1 a 20
for (int i = 1; i &lt;= 20; i++) {
    if (i % 2 == 0) continue;  // pula os pares
    printf("%d\\n", i);
}</pre>

<p><strong>Padrões comuns em laços:</strong></p>
<pre>int soma = 0;       // ACUMULADOR: começa em 0 e vai somando
int cont = 0;       // CONTADOR: conta quantos itens processou
int maior = -99999; // MÁXIMO: começa com valor muito baixo

for (int i = 1; i &lt;= 10; i++) {
    int num;
    scanf("%d", &amp;num);
    soma += num;
    cont++;
    if (num &gt; maior) maior = num;
}
printf("Soma: %d | Média: %.2f | Maior: %d\\n",
       soma, (float)soma/cont, maior);</pre>`,
  'texto', 3
);

addConteudo(4, 'Comparação, Cálculo de Fatorial',
  JSON.stringify({
    python: `# Fatorial com for, Python
# range(1, n+1) gera 1, 2, 3, ..., n
n = int(input('Digite um número: '))
if n < 0:
    print('Fatorial não definido para negativos')
else:
    fatorial = 1
    for i in range(1, n + 1):
        fatorial *= i    # fatorial = fatorial * i
    print(f'{n}! = {fatorial}')`,
    java: `// Fatorial com for, Java
// Usa long para suportar números grandes
import java.util.Scanner;
public class Fatorial {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        if (n < 0) {
            System.out.println("Fatorial nao definido para negativos");
        } else {
            long fatorial = 1;
            for (int i = 1; i <= n; i++) {
                fatorial *= i;
            }
            System.out.println(n + "! = " + fatorial);
        }
    }
}`,
    c: `// Fatorial com for, C
// Usa long long para suportar números grandes
#include <stdio.h>
int main() {
    int n;
    scanf("%d", &n);
    if (n < 0) {
        printf("Fatorial nao definido para negativos\\n");
    } else {
        long long fatorial = 1;
        for (int i = 1; i <= n; i++) {
            fatorial *= i;
        }
        printf("%d! = %lld\\n", n, fatorial);
    }
    return 0;
}`,
    observacoes: `<strong>O algoritmo é idêntico nas três:</strong> inicializar fatorial = 1, multiplicar por cada i de 1 até n.<br><strong>Python</strong> usa range(1, n+1), o limite superior é exclusivo.<br><strong>Java</strong> usa <code>long</code> (64 bits); <strong>C</strong> usa <code>long long</code> com <code>%lld</code>.<br>O operador <code>*=</code> existe nas três com a mesma sintaxe.`
  }),
  'comparacao', 4
);

addExercicio(4, JSON.stringify({tipo:'codigo',texto:'Qual será a saída do seguinte código C?',codigo:'For (int i = 0; i < 3; i++) {\n    printf("%d ", i);\n}',linguagem:'c'}), 'multipla_escolha',
  ['1 2 3','0 1 2','0 1 2 3','1 2'],
  '0 1 2',
  'O laço inicia com i=0, executa enquanto i<3. i=0 (imprime 0) → i=1 (imprime 1) → i=2 (imprime 2) → i=3 (3<3 é FALSO, para). Saída: "0 1 2". 💡 Dica: Simule o laço passo a passo na cabeça.',
  'formativa', 1
);

addExercicio(4, JSON.stringify({tipo:'texto',texto:'Em Python, qual é o equivalente ao laço for(i=1; i<=5; i++) de C, usando a função range()?'}), 'multipla_escolha',
  ['For i in range(0, 5):','For i in range(1, 6):','For i in range(5):','For i in range(1, 5):'],
  'For i in range(1, 6):',
  'Range(1, 6) gera: 1, 2, 3, 4, 5. O parâmetro inicial é inclusivo e o final é exclusivo. 💡 Dica: range(início, fim), o início é incluído, o fim é excluído. Para incluir o 5, o fim deve ser 6.',
  'formativa', 2
);

addExercicio(4, JSON.stringify({tipo:'codigo',texto:'Qual será o valor impresso?',codigo:'int contador = 0;\nint i = 1;\nwhile (i <= 10) {\n    if (i % 2 == 0) {\n        contador++;\n    }\n    i++;\n}\nprintf("%d", contador);',linguagem:'c'}), 'multipla_escolha',
  ['4','5','6','10'],
  '5',
  'O código conta os pares de 1 a 10. O operador % retorna o resto da divisão; se resto por 2 for zero, o número é par. Pares de 1 a 10: 2, 4, 6, 8, 10 = 5 números. 💡 Dica: i % 2 == 0 significa "I é divisível por 2", ou seja, é par.',
  'formativa', 3
);

addExercicio(4, JSON.stringify({tipo:'texto',texto:'O que acontece quando o comando continue é executado dentro de um laço for?'}), 'multipla_escolha',
  ['O laço é encerrado imediatamente','O programa para de executar','O restante da iteração atual é ignorado e o laço avança para a próxima iteração','O laço reinicia do início, zerando a variável de controle'],
  'O restante da iteração atual é ignorado e o laço avança para a próxima iteração',
  'Continue pula o restante do bloco atual e vai para o próximo incremento/verificação. Diferente do break, que sai do laço completamente. 💡 Dica: break = sair do laço. continue = pular esta iteração. São complementares!',
  'formativa', 4
);

addExercicio(4, JSON.stringify({tipo:'texto',texto:'Em Java, o laço for-each (enhanced for) percorre automaticamente todos os elementos de um array ou coleção, sem necessidade de gerenciar manualmente o índice.'}), 'verdadeiro_falso',
  null, 'verdadeiro',
  'Em Java, for (int elemento : array) percorre todos os elementos do array automaticamente. O equivalente em Python é for elemento in lista:. Use for-each quando não precisar do índice. 💡 Dica: Mais seguro que o for tradicional, evita erros de índice fora dos limites.',
  'formativa', 5
);

addConteudo(5, 'O que Muda e o que Permanece?',
  `<p>Você já aprendeu os conceitos fundamentais: variáveis, condicionais e repetição. Agora vamos observar como esses conceitos aparecem em <strong>Python, Java e C</strong>.</p>
<p><strong>A grande revelação desta unidade:</strong> a lógica é universal. Um algoritmo para calcular fatorial funciona da mesma forma nas três, o que muda é apenas a sintaxe.</p>
<p>Pense nas linguagens humanas: "I love programming", "Amo programação", "J'Aime la programmation", a ideia é a mesma, a expressão muda. Com linguagens de programação é igual.</p>
<p><strong>Tabela comparativa:</strong></p>
<pre>Aspecto           Python          Java              C
─────────────────────────────────────────────────────
Declaração tipo   Não precisa     Obrigatória       Obrigatória
Blocos            Indentação      Chaves {}         Chaves {}
else if           elif            else if           else if
Operadores lógic  and/or/not      &&/||/!           &&/||/!
Entrada           input()         Scanner           scanf()
Saída             print()         System.out.println printf()
Ponto e vírgula   Não             Obrigatório       Obrigatório
Estrutura mínima  Só o código     Classe + main     Função main
Tipagem           Dinâmica        Estática          Estática
Gerenc. memória   Automático      Automático (GC)   Manual</pre>`,
  'texto', 1
);

addConteudo(5, 'Diferenças Importantes na Prática',
  `<p><strong>Tipagem dinâmica vs. estática:</strong></p>
<pre># Python, tipagem dinâmica
x = 10        # x é int
x = "texto"   # agora x é string, Python aceita!</pre>
<pre>// C, tipagem estática
int x = 10;
x = "texto";  // ERRO! x é int, não pode receber string</pre>

<p><strong>Gerenciamento de memória:</strong></p>
<p>Em C, memória alocada dinamicamente deve ser liberada manualmente:</p>
<pre>int *v = malloc(10 * sizeof(int));  // aloca
// usa o vetor...
free(v);  // OBRIGATÓRIO! Sem isso: vazamento de memória</pre>
<p>Em Java e Python, o <strong>garbage collector</strong> faz isso automaticamente.</p>

<p><strong>Portabilidade:</strong></p>
<ul>
<li><strong>C:</strong> gera executável específico para o sistema operacional. Um .exe do Windows não roda no Linux.</li>
<li><strong>Java:</strong> compila para bytecode (.class). A JVM executa em qualquer sistema. "Write once, run anywhere."</li>
<li><strong>Python:</strong> o mesmo .py roda em qualquer sistema com Python instalado.</li>
</ul>

<p><strong>Velocidade de execução:</strong><br>
C > Java > Python (em geral). C gera código de máquina nativo, o mais rápido. Java tem a JVM como intermediário. Python é interpretado, mais lento, mas o desenvolvedor escreve mais rápido.</p>`,
  'texto', 2
);

addConteudo(5, 'Quando Usar Cada Linguagem?',
  `<p>Não existe linguagem "Melhor", existe a linguagem certa para cada situação.</p>
<p><strong>C é ideal para:</strong></p>
<ul>
<li>Sistemas operacionais (Linux, Windows são escritos em C)</li>
<li>Drivers de hardware, firmware</li>
<li>Aplicações que precisam de máxima velocidade</li>
<li>Sistemas embarcados (Arduino, microcontroladores)</li>
</ul>
<p><strong>Java é ideal para:</strong></p>
<ul>
<li>Aplicações corporativas e web</li>
<li>Android (apps mobile)</li>
<li>Sistemas que precisam rodar em múltiplos sistemas operacionais</li>
<li>Grandes projetos em equipe</li>
</ul>
<p><strong>Python é ideal para:</strong></p>
<ul>
<li>Ciência de dados, inteligência artificial, machine learning</li>
<li>Scripts e automação de tarefas</li>
<li>Desenvolvimento rápido de protótipos</li>
<li>Ensino de programação (sintaxe simples e legível)</li>
</ul>
<p><strong>Neste curso, estudamos as três porque:</strong></p>
<ol>
<li>Os <strong>conceitos de lógica são universais</strong>, aprender em uma ajuda em todas</li>
<li>Cada uma tem <strong>pontos fortes únicos</strong> que você vai encontrar na carreira</li>
<li>Comparar linguagens <strong>aprofunda a compreensão</strong>, quando você vê for em Python e em C e percebe que é a mesma coisa, o conceito fica muito mais sólido</li>
</ol>`,
  'texto', 3
);

addConteudo(5, 'Comparação, Busca e Soma em Listas/Arrays',
  JSON.stringify({
    python: `# Soma e busca em lista, Python
# Listas são dinâmicas: crescem automaticamente
numeros = []
for i in range(5):
    n = int(input(f'Número {i+1}: '))
    numeros.append(n)

soma  = sum(numeros)          # função embutida!
media = soma / len(numeros)
maior = max(numeros)          # função embutida!
print(f'Soma: {soma} | Média: {media:.1f} | Maior: {maior}')

alvo = int(input('Qual número buscar? '))
if alvo in numeros:           # operador 'in' busca na lista
    print(f'{alvo} na posição {numeros.index(alvo)}')
else:
    print(f'{alvo} não encontrado')`,
    java: `// Soma e busca em array, Java
import java.util.Scanner;
public class SomaBusca {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int[] numeros = new int[5];   // tamanho fixo!
        int soma = 0;
        for (int i = 0; i < 5; i++) {
            numeros[i] = sc.nextInt();
            soma += numeros[i];
        }
        double media = (double) soma / numeros.length;
        int maior = numeros[0];
        for (int n : numeros)         // for-each!
            if (n > maior) maior = n;
        System.out.printf("Soma: %d | Media: %.1f | Maior: %d%n",
                          soma, media, maior);
        int alvo = sc.nextInt();
        boolean enc = false;
        for (int i = 0; i < numeros.length; i++) {
            if (numeros[i] == alvo) {
                System.out.println(alvo + " na posicao " + i);
                enc = true; break;
            }
        }
        if (!enc) System.out.println(alvo + " nao encontrado");
    }
}`,
    c: `// Soma e busca em array, C
#include <stdio.h>
int main() {
    int numeros[5];
    int soma = 0;
    for (int i = 0; i < 5; i++) {
        scanf("%d", &numeros[i]);
        soma += numeros[i];
    }
    float media = (float) soma / 5;
    int maior = numeros[0];
    for (int i = 1; i < 5; i++)
        if (numeros[i] > maior) maior = numeros[i];
    printf("Soma: %d | Media: %.1f | Maior: %d\\n",
           soma, media, maior);
    int alvo;
    scanf("%d", &alvo);
    int enc = 0;
    for (int i = 0; i < 5; i++) {
        if (numeros[i] == alvo) {
            printf("%d na posicao %d\\n", alvo, i);
            enc = 1; break;
        }
    }
    if (!enc) printf("%d nao encontrado\\n", alvo);
    return 0;
}`,
    observacoes: `<strong>Python</strong> tem funções embutidas sum(), max(), len() e o operador in para busca, muito mais conciso.<br><strong>Java</strong> tem for-each e .length nos arrays.<br><strong>C</strong> não tem funções embutidas para soma ou máximo, você implementa manualmente.<br><strong>Cast de tipo:</strong> Java e C precisam de cast explícito (double) ou (float) para divisão com decimal.`
  }),
  'comparacao', 4
);

addExercicio(5, JSON.stringify({tipo:'texto',texto:'Analise os três trechos de código que calculam o fatorial de um número n (Python usa range(1, n+1), Java e C usam for(i=1; i<=n; i++)). Qual afirmação é correta?'}), 'multipla_escolha',
  ['Os três usam sintaxe completamente diferente e não têm equivalência lógica','O algoritmo subjacente (acumular o produto de 1 até n) é idêntico nos três; a diferença é apenas sintática','Python está errado pois usa range(1, n+1) em vez de range(1, n)','Java e C são idênticos em tudo'],
  'O algoritmo subjacente (acumular o produto de 1 até n) é idêntico nos três; a diferença é apenas sintática',
  'O mesmo algoritmo pode ser implementado em diferentes linguagens. A lógica é idêntica. A sintaxe varia: Python não precisa de tipos e usa range(), C e Java são muito similares. 💡 Dica: range(1, n+1) em Python está correto, o limite superior é exclusivo.',
  'formativa', 1
);

addExercicio(5, JSON.stringify({tipo:'texto',texto:'Qual das afirmações abaixo descreve corretamente a diferença entre C e Java no gerenciamento de memória?'}), 'multipla_escolha',
  ['Em C, a memória é gerenciada automaticamente pelo garbage collector; em Java, o programador a gerencia manualmente','Em Java, um garbage collector libera automaticamente a memória não utilizada; em C, o programador deve liberar manualmente com free()','Ambas as linguagens usam garbage collector','Nenhuma das linguagens requer gerenciamento de memória'],
  'Em Java, um garbage collector libera automaticamente a memória não utilizada; em C, o programador deve liberar manualmente com free()',
  'Java tem garbage collection automático (a JVM libera memória não usada). Em C, memória alocada com malloc() deve ser liberada com free(), esquecer causa memory leak. 💡 Dica: Memory leak em C é como um vazamento num cano, consome memória até o sistema travar.',
  'formativa', 2
);

addExercicio(5, JSON.stringify({tipo:'texto',texto:'Em Python, o que acontece quando se tenta adicionar um número inteiro a uma string, como em "Nota: " + 10?'}), 'multipla_escolha',
  ['A operação é realizada normalmente, convertendo o inteiro para string automaticamente','O Python lança um TypeError, pois não é possível concatenar tipos diferentes diretamente','O resultado é a string "Nota: 10"','O Python converte a string para número e soma'],
  'O Python lança um TypeError, pois não é possível concatenar tipos diferentes diretamente',
  'Python tem tipagem dinâmica mas não faz conversão implícita entre tipos incompatíveis. Use str(10) ou f-strings. 💡 Dica: Use f"Nota: {10}" ou "Nota: " + str(10).',
  'formativa', 3
);

addExercicio(5, JSON.stringify({tipo:'texto',texto:'Qual é comum entre as três abordagens de saída formatada: printf() em C, System.out.printf() em Java, e print(f"...") em Python?'}), 'multipla_escolha',
  ['Todas usam o símbolo % para inserir variáveis na string','Todas permitem inserir valores de variáveis dentro de uma string de saída, mas com sintaxes diferentes','Todas são exatamente iguais em sintaxe','Apenas C e Java são equivalentes; Python funciona de forma completamente diferente'],
  'Todas permitem inserir valores de variáveis dentro de uma string de saída, mas com sintaxes diferentes',
  'O conceito é o mesmo: interpolação de variáveis na string de saída. A diferença está na sintaxe: C/Java usam especificadores %s, %d; Python moderno usa f-strings com {} direto no texto. 💡 Dica: Três formas de expressar a mesma ideia, inserir variáveis em texto.',
  'formativa', 4
);

addExercicio(5, JSON.stringify({tipo:'texto',texto:'Um programa escrito em Java pode ser executado em qualquer sistema operacional que tenha a JVM instalada, sem necessidade de recompilar o código. O mesmo não é verdade para programas em C, que geralmente precisam ser recompilados para cada sistema operacional alvo.'}), 'verdadeiro_falso',
  null, 'verdadeiro',
  'Este é o princípio "Write Once, Run Anywhere" do Java. O compilador Java gera bytecode (não código nativo), que a JVM interpreta em qualquer plataforma. Em C, o executável é específico para o sistema, um .exe do Windows não roda no Linux. 💡 Dica: Por isso Android usa Java/Kotlin, a JVM cuida das diferenças de hardware.',
  'formativa', 5
);

fs.writeFileSync(DB_FILE, JSON.stringify(dados, null, 2));
console.log('✅ Conteúdos, comparações e exercícios inseridos com sucesso!');
console.log(`   Conteúdos: ${dados.conteudos.length} (${[1,2,3,4,5].map(u=>dados.conteudos.filter(c=>c.unidade_id===u).length+' U'+u).join(', ')})`);
console.log(`   Exercícios: ${dados.exercicios.length}`);
