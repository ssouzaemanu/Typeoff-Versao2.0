const { test, executar, assert } = require('./helpers');
const v = require('../lib/validacao');
const { calcularAnalytics } = require('../lib/analytics');
const { razao } = require('./contraste');
const vm = require('vm'); const fs = require('fs'); const path = require('path');

const mc = (texto, ops, certa, expl) => ({ enunciado: JSON.stringify({ tipo: 'texto', texto }), tipo: 'multipla_escolha', opcoes: ops, resposta_correta: certa, explicacao: expl === undefined ? 'Explicação suficiente.' : expl });

test('validacao: rejeita enunciado provisório "Teste"', () => {
  assert.ok(v.ehPlaceholder(JSON.stringify({ tipo: 'texto', texto: 'Teste' })));
  assert.ok(v.ehPlaceholder('teste'));
  assert.ok(v.ehPlaceholder(JSON.stringify({ tipo: 'texto', texto: '  ' })));
  assert.ok(!v.ehPlaceholder(JSON.stringify({ tipo: 'texto', texto: 'O que é uma variável?' })));
  assert.ok(!v.ehPlaceholder(JSON.stringify({ tipo: 'codigo', texto: '', codigo: 'x = 1' })));
});
test('validacao: cadastro exige explicação, alternativas válidas e gabarito presente nas opções', () => {
  assert.deepStrictEqual(v.validarExercicio(mc('Qual é a saída do programa?', ['1', '2'], '1')), []);
  assert.ok(v.validarExercicio(mc('Qual é a saída do programa?', ['1', '2'], '1', '')).length > 0);
  assert.ok(v.validarExercicio(mc('Qual é a saída do programa?', ['1', '2'], '3')).length > 0);
  assert.ok(v.validarExercicio(mc('Qual é a saída do programa?', ['1'], '1')).length > 0);
  assert.ok(v.validarExercicio(mc('Qual é a saída do programa?', ['a', 'A'], 'a')).length > 0);
  assert.ok(v.validarExercicio(mc('Teste', ['1', '2'], '1')).length > 0);
});
test('validacao: práticas (completar e ordenar) exigem gabarito coerente', () => {
  const comp = { tipo: 'completar_codigo', explicacao: 'Explicação suficiente.', enunciado: JSON.stringify({ tipo: 'completar', texto: 'Complete o código.', codigo: 'x = ___1___', lacunas: [['1', '2']] }), resposta_correta: JSON.stringify(['1']) };
  assert.deepStrictEqual(v.validarExercicio(comp), []);
  assert.ok(v.validarExercicio({ ...comp, resposta_correta: JSON.stringify(['9']) }).length > 0);
  const ord = { tipo: 'ordenar_linhas', explicacao: 'Explicação suficiente.', enunciado: JSON.stringify({ tipo: 'ordenar', texto: 'Ordene as linhas.', linhas: ['b', 'a'] }), resposta_correta: JSON.stringify(['a', 'b']) };
  assert.deepStrictEqual(v.validarExercicio(ord), []);
  assert.ok(v.validarExercicio({ ...ord, resposta_correta: JSON.stringify(['a', 'c']) }).length > 0);
});
test('validacao: duplicadas e provisórias são ocultadas dos estudantes, mantendo a primeira', () => {
  const E = (id, texto, ordem) => ({ id, unidade_id: 1, categoria: 'formativa', ordem, tipo: 'multipla_escolha', enunciado: JSON.stringify({ tipo: 'texto', texto }), opcoes: ['a', 'b'], resposta_correta: 'a' });
  const r = v.filtrarExerciciosPublicos([E(1, 'Pergunta completa um?', 1), E(2, 'Teste', 2), E(3, 'Pergunta  COMPLETA um?', 3), E(4, 'Outra pergunta completa?', 4)]);
  assert.deepStrictEqual(r.publicas.map(x => x.id), [1, 4]);
  assert.deepStrictEqual(r.descartadas.map(x => x.id), [2, 3]);
});
test('analytics: taxas por questão/unidade, tempo, alertas e exclusão de contas de teste', () => {
  const dados = {
    usuarios: [{ id: 1, tipo: 'estudante', nome: 'Ana', email: 'ana@x.com' }, { id: 2, tipo: 'estudante', nome: 'Conta Teste', email: 'teste@x.com', conta_teste: 1 }],
    unidades: [{ id: 1, ordem: 1, titulo: 'U1' }],
    exercicios: [{ id: 10, unidade_id: 1, categoria: 'formativa', ordem: 1, enunciado: JSON.stringify({ texto: 'Teste' }) }, { id: 11, unidade_id: 1, categoria: 'formativa', ordem: 2, enunciado: JSON.stringify({ texto: 'Pergunta válida aqui?' }) }],
    respostas: [{ usuario_id: 1, exercicio_id: 11, correta: 1, tempo_ms: 4000, tentativa: 1 }, { usuario_id: 1, exercicio_id: 11, correta: 0, tempo_ms: 6000, tentativa: 2 }, { usuario_id: 2, exercicio_id: 11, correta: 1 }],
    progresso: [], telemetria: [{ usuario_id: 1, tipo: 'aba_tempo', unidade_id: 1, aba: 'conteudo', tempo_ms: 30000 }, { usuario_id: 1, tipo: 'unidade_resultado', unidade_id: 1, percentual: 50, acertos: 1, total: 2 }, { usuario_id: 2, tipo: 'aba_tempo', unidade_id: 1, aba: 'conteudo', tempo_ms: 99999 }]
  };
  const r = calcularAnalytics(dados, { excluirTeste: true });
  assert.strictEqual(r.resumo.respostas, 2); assert.strictEqual(r.resumo.taxa, 50);
  const q11 = r.questoes.find(q => q.exercicio_id === 11); assert.strictEqual(q11.tempo_medio_ms, 5000);
  assert.ok(r.questoes.find(q => q.exercicio_id === 10).alertas.includes('enunciado provisório'));
  assert.strictEqual(r.unidades[0].tempo_ms.conteudo, 30000);
  const todos = calcularAnalytics(dados, { excluirTeste: false });
  assert.strictEqual(todos.resumo.respostas, 3);
  assert.ok(!JSON.stringify(r).includes('senha'));
});

function carregarApp() {
  const ctx = { document: { addEventListener() {}, querySelector() { return null; }, getElementById() { return null; }, documentElement: { getAttribute() { return null; } } }, window: { addEventListener() {} }, navigator: {}, console };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'app.js'), 'utf8') + '\nthis.Codigo = Codigo;', ctx);
  return ctx.Codigo;
}
test('Codigo: numera linhas e escapa HTML', () => {
  const C = carregarApp(); const h = C.html('a = 1\nb = "<x>"', 'python');
  assert.ok(h.includes('data-n="1"') && h.includes('data-n="2"')); assert.ok(h.includes('&lt;x&gt;')); assert.ok(!h.includes('<x>'));
});
test('Codigo: destaca diferenças de sintaxe entre Python, Java e C', () => {
  const C = carregarApp(); const u = {};
  const py = C.html('elif x and not y:\n    print(1)', 'python', { usadas: u });
  assert.ok(py.includes('dif-fluxo') && py.includes('dif-op') && py.includes('dif-io'));
  const jv = C.html('} else if (a && b) {\n    System.out.println(x);\n}', 'java', { usadas: u });
  assert.ok(jv.includes('dif-fluxo') && jv.includes('dif-op') && jv.includes('dif-io') && jv.includes('dif-bloco'));
  const c = C.html('#include <stdio.h>\nint main() { scanf("%d", &n); }', 'c', { usadas: u });
  assert.ok(c.includes('dif-estr') && c.includes('dif-decl') && c.includes('dif-io'));
  ['decl', 'io', 'bloco', 'op', 'fluxo', 'estr'].forEach(k => assert.ok(u[k], 'categoria ausente: ' + k));
  const sem = C.html('int x;', 'c', { destaque: false }); assert.ok(!sem.includes('dif-'));
});
test('Codigo: palavras comuns (if, while, for) NÃO são destacadas como diferença', () => {
  const C = carregarApp();
  assert.ok(!/dif[^>]*>if</.test(C.html('if x > 1:', 'python')));
  assert.ok(!/dif[^>]*>while</.test(C.html('while (x) {', 'c')));
});

const mascote = require('../lib/mascote');
const base = (p, o) => mascote.responderLocal(Object.assign({ pergunta: p, papel: 'estudante', pagina: 'dashboard' }, o || {}));
test('mascote/KB: ids únicos, sugestões existentes e sem resposta vazia', () => {
  const ids = mascote.KB.map(e => e.id); assert.strictEqual(new Set(ids).size, ids.length, 'ids repetidos');
  mascote.KB.forEach(e => { assert.ok(e.resposta && e.resposta.length > 20, e.id); (e.rel || []).forEach(r => assert.ok(mascote.POR_ID[r], e.id + ' -> ' + r)); assert.ok(e.rotulo, e.id); });
  assert.ok(mascote.KB.length >= 55);
});
test('mascote/cliente: todo tema sugerido na interface existe na base', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'mascote.js'), 'utf8');
  const rot = [...src.match(/var ROTULOS = \{([\s\S]*?)\};/)[1].matchAll(/(\w+):\s*'/g)].map(m => m[1]);
  const chips = [...src.matchAll(/c: \[([^\]]*)\]/g)].flatMap(m => m[1].split(',').map(s => s.trim().replace(/'/g, '')).filter(Boolean));
  [...new Set(rot.concat(chips))].forEach(id => assert.ok(mascote.POR_ID[id], 'tema inexistente na base: ' + id));
  chips.forEach(id => assert.ok(rot.includes(id), 'tema sem rótulo no cliente: ' + id));
});
test('mascote: responde dúvidas de conteúdo e de plataforma', () => {
  [['o que é um algoritmo?', 'algoritmo'], ['como funciona um laço for?', 'for'], ['diferença entre elif e else if', 'elif'], ['por que 7/2 dá 3', 'divisao_inteira'],
   ['esqueci minha senha', 'esqueci_senha'], ['como libero a unidade 2', 'desbloquear'], ['quanto tempo eu levei', 'tempo'], ['como aumento a letra', 'fonte'],
   ['como ativo o modo escuro', 'tema_escuro'], ['o que e uma varivel', 'variavel'], ['qual a diferença entre = e ==', 'relacionais'], ['por onde começar', 'proxima_unidade']]
    .forEach(([p, id]) => assert.strictEqual(base(p).id, id, p));
  assert.strictEqual(base('banana azul').origem, 'nao_entendi'); assert.ok(base('banana azul').sugestoes.length >= 2);
  assert.strictEqual(base('oi').id, 'oi'); assert.strictEqual(base('zzzz qwerty').origem, 'nao_entendi');
  assert.strictEqual(mascote.responderLocal({ id: 'proxima_unidade', papel: 'estudante' }).acao, 'proxima_unidade');
});
test('mascote: não entrega resposta pronta de exercícios (dá dica de método)', () => {
  const r = base('qual a resposta da questão 3?'); assert.strictEqual(r.origem, 'restrito'); assert.ok(/teste de mesa/i.test(r.resposta)); assert.ok(!/gabarito é/i.test(r.resposta));
  assert.strictEqual(base('quero o gabarito').origem, 'restrito');
});
test('mascote/avaliação: só responde sobre a plataforma; conteúdo e respostas são recusados (integridade)', () => {
  const av = (p, o) => base(p, Object.assign({ modoAvaliacao: true, pagina: 'avaliacao-final' }, o || {}));
  ['o que é um algoritmo?', 'como funciona um laço for?', 'o que é uma variável', 'qual a resposta?', 'qual a alternativa certa', 'explique o while'].forEach(p => assert.strictEqual(av(p).origem, 'restrito', p));
  ['quanto tempo eu levei', 'como aumento a letra', 'não carrega a página', 'como é a avaliação final'].forEach(p => assert.strictEqual(av(p).origem, 'base', p));
  assert.strictEqual(av('', { id: 'algoritmo' }).origem, 'restrito', 'atalho por id também respeita o modo');
  assert.ok(av('o que é um algoritmo').resposta.includes('não ajudo com o conteúdo'));
  assert.ok(base('o que é um algoritmo', { modoAvaliacao: true, preDiagnostico: true }).resposta.includes('diagnóstico inicial'));
  assert.ok(av('como funciona o curso').sugestoes.every(s => ['avaliacao', 'plataforma'].includes(mascote.POR_ID[s.id].cat) && mascote.POR_ID[s.id].cat === 'avaliacao'));
});
test('mascote: temas de professor só aparecem para professor', () => {
  assert.strictEqual(base('como marcar conta de teste', { papel: 'professor' }).id, 'prof_conta_teste');
  assert.notStrictEqual(base('como marcar conta de teste').id, 'prof_conta_teste');
  assert.ok(base('como funciona o curso').sugestoes.every(s => mascote.POR_ID[s.id].cat !== 'professor'));
});
const fakeFetch = (resp, chamadas) => async (url, init) => { chamadas.push({ url, init }); return resp; };
test('mascote/IA: só é usada fora de avaliação, logado, com chave e quando a base não entendeu', async () => {
  const ch = []; const ok = { ok: true, json: async () => ({ content: [{ type: 'text', text: 'Recursão é quando uma função chama a si mesma.' }] }) };
  const ia = { chave: 'k', modelo: 'modelo-x', fetchFn: fakeFetch(ok, ch) };
  const E = { pergunta: 'explique recursão em programação', papel: 'estudante', pagina: 'dashboard', logado: true, modoAvaliacao: false };
  const r = await mascote.responder(E, { ia }); assert.strictEqual(r.origem, 'ia'); assert.ok(r.aviso.includes('IA')); assert.strictEqual(ch.length, 1);
  assert.strictEqual(ch[0].url, 'https://api.anthropic.com/v1/messages'); const corpo = JSON.parse(ch[0].init.body);
  assert.strictEqual(ch[0].init.headers['x-api-key'], 'k'); assert.strictEqual(corpo.model, 'modelo-x'); assert.ok(corpo.max_tokens <= 400); assert.ok(corpo.system.includes('Nunca entregue a resposta')); assert.ok(corpo.messages[0].content.length <= 300);
  const nao = async (e, op) => { const c2 = []; const rr = await mascote.responder(e, { ia: Object.assign({}, ia, { fetchFn: fakeFetch(ok, c2) }) }); assert.strictEqual(c2.length, 0, op); return rr; };
  await nao(Object.assign({}, E, { modoAvaliacao: true }), 'modo avaliação'); await nao(Object.assign({}, E, { logado: false }), 'sem login');
  await nao(Object.assign({}, E, { pergunta: 'como libero a unidade 2' }), 'base entendeu'); await nao(Object.assign({}, E, { id: 'algoritmo' }), 'atalho por id');
  await nao(Object.assign({}, E, { pergunta: 'oi?' }), 'pergunta curta');
  const semChave = await mascote.responder(E, { ia: null }); assert.strictEqual(semChave.origem, 'nao_entendi');
});
test('mascote/IA: falhas (HTTP, rede, resposta vazia) caem na base sem quebrar', async () => {
  const E = { pergunta: 'explique recursão em programação', papel: 'estudante', logado: true };
  for (const f of [async () => ({ ok: false, json: async () => ({}) }), async () => { throw new Error('rede'); }, async () => ({ ok: true, json: async () => ({ content: [] }) })]) {
    const r = await mascote.responder(E, { ia: { chave: 'k', fetchFn: f } }); assert.strictEqual(r.origem, 'nao_entendi');
  }
});
test('analytics: tempos de diagnóstico, exercícios e avaliação final por estudante e médias', () => {
  const d = { usuarios: [{ id: 1, tipo: 'estudante', nome: 'A', email: 'a@x' }, { id: 2, tipo: 'estudante', nome: 'B', email: 'b@x' }], unidades: [{ id: 1, ordem: 1, titulo: 'U1' }], exercicios: [], respostas: [], progresso: [],
    telemetria: [{ usuario_id: 1, tipo: 'aba_tempo', unidade_id: 1, aba: 'exercicios', tempo_ms: 60000 }, { usuario_id: 1, tipo: 'aba_tempo', unidade_id: 1, aba: 'exercicios', tempo_ms: 30000 }, { usuario_id: 1, tipo: 'unidade_resultado', unidade_id: 1, percentual: 80, acertos: 4, total: 5, tempo_ms: 120000 }, { usuario_id: 2, tipo: 'unidade_resultado', unidade_id: 1, percentual: 60, acertos: 3, total: 5, tempo_ms: 60000 }],
    diagnosticos: [{ usuario_id: 1, tempo_ms: 300000 }, { usuario_id: 2, tempo_ms: 100000 }, { usuario_id: 2 }], finais: [{ usuario_id: 1, tempo_ms: 600000 }] };
  const r = calcularAnalytics(d); const a = r.alunos.find(x => x.id === 1), b = r.alunos.find(x => x.id === 2);
  assert.strictEqual(a.tempo_diagnostico_ms, 300000); assert.strictEqual(a.tempo_avaliacao_final_ms, 600000); assert.strictEqual(a.tempo_exercicios_ms, 90000);
  assert.strictEqual(b.tempo_diagnostico_ms, 100000); assert.strictEqual(b.tempo_avaliacao_final_ms, null);
  assert.strictEqual(r.resumo.tempo_medio_diagnostico_ms, 200000); assert.strictEqual(r.resumo.tempo_medio_avaliacao_final_ms, 600000);
  assert.strictEqual(r.unidades[0].tempo_tentativa_medio_ms, 90000);
});

const PARES = [
  ['texto secundário (cinza-medio) s/ branco', '#5F5A55', '#FFFFFF', 4.5], ['texto secundário s/ fundo da página', '#5F5A55', '#F2EDE4', 4.5],
  ['texto secundário s/ borda clara', '#5F5A55', '#D8D4CC', 4.5],
  ['sidebar: títulos s/ azul-escuro', '#C3C9E0', '#1B2A6B', 4.5], ['sidebar: item (alfa .86 ≈ #D9D6DD) s/ azul', '#D9D6DD', '#1B2A6B', 4.5],
  ['sucesso-texto s/ branco', '#1B7A43', '#FFFFFF', 4.5], ['sucesso-texto s/ tom verde', '#1B7A43', '#E7F4EC', 4.5],
  ['aviso-texto s/ branco', '#A8520F', '#FFFFFF', 4.5], ['erro-texto s/ branco', '#A93226', '#FFFFFF', 4.5],
  ['dourado-texto s/ branco', '#7A5A1F', '#FFFFFF', 4.5], ['título azul s/ branco', '#1B2A6B', '#FFFFFF', 4.5],
  ['botão primário: branco s/ azul-escuro', '#FFFFFF', '#1B2A6B', 4.5], ['botão dourado: azul s/ dourado', '#1B2A6B', '#C9A96E', 4.5],
  ['código: palavra-chave', '#F7A8C4', '#1B2A6B', 4.5], ['código: tipo', '#8FE3D0', '#1B2A6B', 4.5], ['código: texto', '#F2D58A', '#1B2A6B', 4.5],
  ['código: comentário', '#B9C2E4', '#1B2A6B', 4.5], ['código: número', '#FFC38B', '#1B2A6B', 4.5], ['código: função', '#A9CBFF', '#1B2A6B', 4.5],
  ['código: diferença (sobre tom dourado)', '#FFE9B8', '#41466C', 4.5], ['código: nº de linha', '#B8C0E0', '#1B2A6B', 4.5],
  ['cabeçalho Python', '#9FE8D6', '#1F4E73', 4.5], ['cabeçalho Java', '#FFD3A8', '#7A2F20', 4.5], ['cabeçalho C', '#BFE9F7', '#1F5030', 4.5],
  ['tema escuro: texto s/ superfície', '#E2E0EE', '#182050', 4.5], ['tema escuro: título s/ fundo', '#D7DEFA', '#0E1330', 4.5],
  ['tema escuro: secundário s/ superfície', '#B6BDDB', '#182050', 4.5], ['tema escuro: sucesso', '#7FE3A8', '#182050', 4.5],
  ['tema escuro: erro', '#FFB3AB', '#182050', 4.5], ['tema escuro: aviso', '#FFB877', '#182050', 4.5], ['tema escuro: botão primário', '#FFFFFF', '#4A6FA5', 4.5],
  ['tema escuro: link s/ superfície', '#A9C4FF', '#182050', 4.5], ['tema escuro: texto dourado', '#E8CB8F', '#182050', 4.5],
  ['diagnóstico escuro: etiqueta de unidade', '#A9C4FF', '#29356B', 4.5], ['diagnóstico escuro: título s/ caixa da questão', '#D7DEFA', '#1D2858', 4.5], ['diagnóstico escuro: opção correta', '#8FE9B4', '#182050', 4.5], ['diagnóstico escuro: opção errada', '#FFC2BB', '#182050', 4.5], ['diagnóstico escuro: dica', '#F0D9A8', '#1F2652', 4.5],
  ['typo: texto do balão s/ azul', '#F2EDE4', '#1B2A6B', 4.5], ['typo: botão do balão', '#1B2A6B', '#C9A96E', 4.5], ['typo: subtítulo do topo', '#D9D6DD', '#1B2A6B', 4.5], ['typo: link na mensagem s/ tom azul', '#3A5A8C', '#E8ECF3', 4.5], ['typo: balão do usuário', '#FFFFFF', '#1B2A6B', 4.5],
  ['landing: offwhite alfa .86 s/ azul', '#DAD8DD', '#1B2A6B', 4.5], ['selo "recomendada"', '#1B2A6B', '#C9A96E', 4.5]
];
PARES.forEach(([nome, fg, bg, min]) => test('contraste ≥ ' + min + ': ' + nome, () => {
  const r = razao(fg, bg); assert.ok(r >= min, nome + ' = ' + r.toFixed(2) + ':1 (mínimo ' + min + ')');
}));

executar('Unitários, realçador e contraste').then(r => { console.log('\nTotal: ' + r.total + ' | falhas: ' + r.falhas); process.exit(r.falhas ? 1 : 0); });
