process.env.PORT = process.env.PORT || '3917';
const { test, executar, assert, cliente } = require('./helpers');
const mock = require('./mock-db');
const db = mock.instalar();
require('../server.js');
const BASE = 'http://localhost:' + process.env.PORT;
const fs = require('fs'); const path = require('path');

const esperar = ms => new Promise(r => setTimeout(r, ms));
async function aguardarServidor() { for (let i = 0; i < 50; i++) { try { await fetch(BASE + '/login.html'); return; } catch (e) { await esperar(100); } } throw new Error('servidor não iniciou'); }

const prof = cliente(BASE), est = cliente(BASE), est2 = cliente(BASE);
let unidade1, ex1;

test('estáticos: cache, charset e cabeçalhos de segurança', async () => {
  const c = cliente(BASE);
  const css = await c.get('/css/style.css');
  assert.ok(css.headers.get('cache-control').includes('max-age'), 'CSS sem Cache-Control');
  assert.ok(css.headers.get('content-type').includes('charset=utf-8'));
  assert.strictEqual(css.headers.get('x-content-type-options'), 'nosniff');
  const html = await c.get('/login.html'); assert.strictEqual(html.headers.get('cache-control'), 'no-cache');
  assert.strictEqual((await c.get('/js/app.js')).status, 200);
  assert.strictEqual((await c.get('/js/unidade.js')).status, 200);
  assert.strictEqual((await c.get('/js/complemento.js')).status, 200);
  assert.strictEqual((await c.get('/../server.js')).status === 200, false, 'path traversal');
});
test('seed: conteúdo carregado (35 formativas, 10 diagnósticas, 10 finais, 20 conteúdos)', async () => {
  const f = await db.allAsync('exercicios', { categoria: 'formativa' });
  assert.strictEqual(f.length, 35); assert.strictEqual((await db.allAsync('exercicios', { categoria: 'diagnostica' })).length, 10);
  assert.strictEqual((await db.allAsync('exercicios', { categoria: 'avaliacao_final' })).length, 10);
  assert.strictEqual((await db.allAsync('conteudos', {})).length, 20);
});
test('auth: registro de professor e estudante; /api/auth/me não expõe senha', async () => {
  assert.ok((await prof.post('/api/auth/registro', { nome: 'Profa Teste Real', email: 'prof@x.com', senha: 'abc123', tipo: 'professor' })).dados.sucesso);
  assert.ok((await est.post('/api/auth/registro', { nome: 'Ana Souza', email: 'ana@x.com', senha: 'abc123' })).dados.sucesso);
  assert.ok((await est2.post('/api/auth/registro', { nome: 'Conta Teste', email: 'teste@x.com', senha: 'abc123' })).dados.sucesso);
  const me = await est.get('/api/auth/me'); assert.ok(me.dados.sucesso); assert.ok(!('senha' in me.dados.usuario));
});
test('unidades: Unidade 2 bloqueada até a Unidade 1 atingir 80% (regra preservada)', async () => {
  await est.post('/api/diagnostico/submeter', { respostas: [{ exercicio_id: 1, resposta_dada: 'x' }] });
  const r = await est.get('/api/unidades'); assert.ok(r.dados.sucesso);
  unidade1 = r.dados.unidades.find(u => u.ordem === 1); const u2 = r.dados.unidades.find(u => u.ordem === 2);
  assert.strictEqual(unidade1.status, 'em_andamento'); assert.strictEqual(u2.status, 'bloqueada');
  assert.ok(r.dados.diagnostico && r.dados.diagnostico.destino === '1', 'diagnóstico deve indicar Unidade 1');
});
test('exercícios: 7 questões na Unidade 1, incluindo 2 práticas; Q2 reescrita com algoritmo completo', async () => {
  const todas = await est.get('/api/exercicios/' + unidade1.id);
  assert.ok(todas.dados.exercicios.length > 7, 'sem filtro a rota ainda devolve todas as categorias (comportamento da API preservado)');
  const r = await est.get('/api/exercicios/' + unidade1.id + '?categoria=formativa'); const ex = r.dados.exercicios;
  assert.ok(ex.every(e => e.categoria === 'formativa'));
  ex1 = ex; assert.strictEqual(ex.length, 7);
  assert.ok(ex.some(e => e.tipo === 'ordenar_linhas') && ex.some(e => e.tipo === 'completar_codigo'));
  const q2 = ex.find(e => e.enunciado.includes('tabuada do 5')); const d = JSON.parse(q2.enunciado);
  assert.ok(d.codigo.includes('Passo 1') && d.codigo.includes('Passo 5'), 'algoritmo completo não apresentado');
  assert.ok(!ex.some(e => /"texto":"Teste"/.test(e.enunciado)));
});
test('responder: grava tentativa e tempo; práticas são corrigidas por comparação JSON', async () => {
  const mcq = ex1.filter(e => e.tipo === 'multipla_escolha')[2];
  const r1 = await est.post('/api/exercicios/responder', { exercicio_id: mcq.id, resposta_dada: mcq.resposta_correta, tempo_ms: 4321 });
  assert.ok(r1.dados.correta);
  const r2 = await est.post('/api/exercicios/responder', { exercicio_id: mcq.id, resposta_dada: 'errada', tempo_ms: 1000 });
  assert.ok(!r2.dados.correta);
  const regs = await db.allAsync('respostas', { exercicio_id: mcq.id });
  assert.deepStrictEqual(regs.map(r => r.tentativa), [1, 2]); assert.strictEqual(regs[0].tempo_ms, 4321); assert.strictEqual(regs[0].unidade_id, unidade1.id);
  const ord = ex1.find(e => e.tipo === 'ordenar_linhas');
  const ok = await est.post('/api/exercicios/responder', { exercicio_id: ord.id, resposta_dada: ord.resposta_correta }); assert.ok(ok.dados.correta);
  const comp = ex1.find(e => e.tipo === 'completar_codigo');
  assert.ok((await est.post('/api/exercicios/responder', { exercicio_id: comp.id, resposta_dada: comp.resposta_correta })).dados.correta);
  assert.ok(!(await est.post('/api/exercicios/responder', { exercicio_id: comp.id, resposta_dada: '["x","y","z"]' })).dados.correta);
  assert.strictEqual((await est.post('/api/exercicios/responder', { exercicio_id: mcq.id, resposta_dada: 5 })).status, 400);
  const ruim = await est.post('/api/exercicios/responder', { exercicio_id: mcq.id, resposta_dada: mcq.resposta_correta, tempo_ms: -5 });
  assert.strictEqual((await db.allAsync('respostas', { exercicio_id: mcq.id })).pop().tempo_ms, undefined);
});
test('telemetria: aceita eventos válidos e descarta inválidos; identidade vem da sessão', async () => {
  const r = await est.post('/api/telemetria', { eventos: [
    { tipo: 'aba_tempo', unidade_id: 1, aba: 'conteudo', tempo_ms: 45000, usuario_id: 999 },
    { tipo: 'aba_tempo', unidade_id: 1, aba: 'comparacao', tempo_ms: 20000 },
    { tipo: 'unidade_aberta', unidade_id: 1 },
    { tipo: 'unidade_resultado', unidade_id: 1, percentual: 60, acertos: 3, total: 5 },
    { tipo: 'aba_tempo', unidade_id: 1, aba: 'inexistente', tempo_ms: 5000 },
    { tipo: 'aba_tempo', unidade_id: 1, aba: 'conteudo', tempo_ms: 99999999 },
    { tipo: 'unidade_resultado', unidade_id: 1, percentual: 150, acertos: 3, total: 5 },
    { tipo: 'hack', unidade_id: 1 }, { tipo: 'aba_tempo', aba: 'conteudo', tempo_ms: 5000 } ] });
  assert.strictEqual(r.dados.registrados, 4);
  const t = await db.allAsync('telemetria', {}); assert.strictEqual(t.length, 4);
  const me = (await est.get('/api/auth/me')).dados.usuario.id; assert.ok(t.every(x => x.usuario_id === me), 'usuario_id deve vir da sessão');
  assert.strictEqual((await cliente(BASE).post('/api/telemetria', { eventos: [] })).status, 401);
  assert.strictEqual((await prof.post('/api/telemetria', { eventos: [{ tipo: 'unidade_aberta', unidade_id: 1 }] })).dados.registrados, 0);
});
test('progresso: 80% libera a Unidade 2; <80% não libera', async () => {
  const baixo = await est.post('/api/progresso/concluir/' + unidade1.id, { percentual: 60 }); assert.strictEqual(baixo.dados.sucesso, false);
  assert.strictEqual((await est.get('/api/unidades')).dados.unidades.find(u => u.ordem === 2).status, 'bloqueada');
  const ok = await est.post('/api/progresso/concluir/' + unidade1.id, { percentual: 80 }); assert.ok(ok.dados.sucesso);
  assert.strictEqual((await est.get('/api/unidades')).dados.unidades.find(u => u.ordem === 2).status, 'em_andamento');
});
test('professor: listagens NÃO expõem senha; estudante não acessa rotas do professor', async () => {
  const l = await prof.get('/api/professor/estudantes'); assert.ok(l.dados.estudantes.length >= 2);
  assert.ok(l.dados.estudantes.every(e => !('senha' in e)), 'senha vazou em /estudantes');
  const d = await prof.get('/api/professor/estudante?id=' + l.dados.estudantes[0].id); assert.ok(!('senha' in d.dados.estudante));
  assert.strictEqual((await est.get('/api/professor/analytics')).status, 403);
  assert.strictEqual((await est.post('/api/professor/conta-teste', { id: 1, valor: 1 })).status, 403);
});
test('analytics: métricas por unidade/aba/questão; contas de teste excluídas por padrão', async () => {
  const idTeste = (await db.getAsync('usuarios', { email: 'teste@x.com' })).id;
  const mcq = ex1.filter(e => e.tipo === 'multipla_escolha')[2];
  await est2.post('/api/exercicios/responder', { exercicio_id: mcq.id, resposta_dada: 'errada' });
  const a = (await prof.get('/api/professor/analytics')).dados; assert.ok(a.sucesso);
  assert.ok(a.alunos.find(x => x.id === idTeste).teste_sugerido, 'deve sugerir conta de teste');
  const u1 = a.unidades.find(u => u.ordem === 1); assert.strictEqual(u1.tempo_ms.conteudo, 45000); assert.strictEqual(u1.tempo_ms.comparacao, 20000);
  assert.strictEqual(u1.tentativas_media, 1);
  const q = a.questoes.find(x => x.exercicio_id === mcq.id); assert.strictEqual(q.respostas, 4); assert.strictEqual(q.tempo_medio_ms, 2661);
  const com = (await prof.get('/api/professor/analytics?incluir_teste=1')).dados; assert.ok(com.resumo.respostas >= a.resumo.respostas);
  assert.ok((await prof.post('/api/professor/conta-teste', { id: idTeste, valor: 1 })).dados.sucesso);
  const b = (await prof.get('/api/professor/analytics')).dados; assert.ok(b.alunos.find(x => x.id === idTeste).conta_teste);
  assert.strictEqual(b.questoes.find(x => x.exercicio_id === mcq.id).respostas, 3, 'após marcar como teste, a resposta da conta de teste não conta');
  assert.strictEqual(a.questoes.find(x => x.exercicio_id === mcq.id).respostas, 4, 'sem marcação manual a conta sugerida ainda conta (só é excluída quando marcada)');
});
test('admin: recusa "Teste", falta de explicação, gabarito fora das opções e duplicata', async () => {
  const base = { unidade_id: 1, tipo: 'multipla_escolha', opcoes: ['Sim', 'Não'], resposta_correta: 'Sim', explicacao: 'Porque a lógica é a mesma.', categoria: 'formativa', ordem: 20 };
  const en = t => JSON.stringify({ tipo: 'texto', texto: t });
  assert.strictEqual((await prof.post('/api/admin/exercicio', { ...base, enunciado: en('Teste') })).status, 400);
  assert.strictEqual((await prof.post('/api/admin/exercicio', { ...base, enunciado: en('Pergunta inédita número 1?'), explicacao: '' })).status, 400);
  assert.strictEqual((await prof.post('/api/admin/exercicio', { ...base, enunciado: en('Pergunta inédita número 1?'), resposta_correta: 'Talvez' })).status, 400);
  const ok = await prof.post('/api/admin/exercicio', { ...base, enunciado: en('Pergunta inédita número 1?') }); assert.ok(ok.dados.sucesso);
  const dup = await prof.post('/api/admin/exercicio', { ...base, enunciado: en('pergunta  INÉDITA número 1?') }); assert.strictEqual(dup.status, 409);
  const put = await prof.put('/api/admin/exercicio/' + ok.dados.id, { ...base, enunciado: en('Pergunta inédita número 1?'), explicacao: '' }); assert.strictEqual(put.status, 400);
  await prof.del('/api/admin/exercicio/' + ok.dados.id);
});
test('estudantes não veem "Teste" nem repetidas já existentes no banco, sem apagar dados', async () => {
  const en = t => JSON.stringify({ tipo: 'texto', texto: t });
  const antes = (await db.allAsync('exercicios', {})).length;
  const dupSrc = ex1.find(e => e.tipo === 'multipla_escolha');
  await db.insertAsync('exercicios', { unidade_id: 1, enunciado: en('Teste'), tipo: 'multipla_escolha', opcoes: JSON.stringify(['a', 'b']), resposta_correta: 'a', explicacao: '', categoria: 'formativa', ordem: 8 });
  await db.insertAsync('exercicios', { unidade_id: 1, enunciado: dupSrc.enunciado, tipo: 'multipla_escolha', opcoes: JSON.stringify(dupSrc.opcoes), resposta_correta: dupSrc.resposta_correta, explicacao: 'x', categoria: 'formativa', ordem: 9 });
  assert.strictEqual((await db.allAsync('exercicios', {})).length, antes + 2);
  const r = await est.get('/api/exercicios/1?categoria=formativa'); assert.strictEqual(r.dados.exercicios.length, 7, 'filtro público deve manter 7');
  const prof_ = await prof.get('/api/admin/exercicios?categoria=formativa'); assert.ok(prof_.dados.exercicios.length >= 9, 'professor continua vendo tudo');
});
test('migração: dry-run não altera; --apply corrige provisórias/repetidas, é idempotente e faz backup', async () => {
  const { migrar } = require('../db/atualizar_conteudo');

  const original = require('./fixtures/dados_v1.json');
  const antigaQ2 = original.exercicios.find(e => e.id === 2), antigaQ24 = original.exercicios.find(e => e.id === 24);
  const q2 = (await db.allAsync('exercicios', { unidade_id: 1 })).find(e => e.enunciado.includes('tabuada do 5'));
  await db.updateAsync('exercicios', { id: q2.id }, { enunciado: antigaQ2.enunciado, opcoes: antigaQ2.opcoes, explicacao: antigaQ2.explicacao });
  const q24 = (await db.allAsync('exercicios', { unidade_id: 5 })).find(e => e.enunciado.includes('O que há em comum'));
  await db.updateAsync('exercicios', { id: q24.id }, { enunciado: antigaQ24.enunciado });
  const fotoAntes = JSON.stringify(await db.allAsync('exercicios', {}));
  const log = []; const seco = await migrar(db, { aplicar: false, log: m => log.push(m) });
  assert.strictEqual(JSON.stringify(await db.allAsync('exercicios', {})), fotoAntes, 'dry-run alterou dados');
  assert.strictEqual(seco.placeholders.length, 1); assert.strictEqual(seco.duplicadas.length, 1); assert.strictEqual(seco.substituicoes_feitas.length, 2);
  const nUsuarios = (await db.allAsync('usuarios', {})).length, nResp = (await db.allAsync('respostas', {})).length, nProg = (await db.allAsync('progresso', {})).length;
  const real = await migrar(db, { aplicar: true, log: () => {} });
  assert.strictEqual(real.placeholders.length + real.duplicadas.length, 2); assert.strictEqual(real.sem_reserva.length, 0);
  assert.ok(real.backup && fs.existsSync(real.backup)); fs.unlinkSync(real.backup);
  const f = (await db.allAsync('exercicios', { unidade_id: 1 })).filter(e => e.categoria === 'formativa');
  const v = require('../lib/validacao'); const { publicas, descartadas } = v.filtrarExerciciosPublicos(f.map(e => ({ ...e, opcoes: e.opcoes ? JSON.parse(e.opcoes) : null })));
  assert.strictEqual(descartadas.length, 0, 'ainda há provisórias/repetidas: ' + JSON.stringify(descartadas));
  assert.ok(f.some(e => e.enunciado.includes('Passo 5')), 'Q2 não foi reescrita');
  assert.strictEqual((await db.allAsync('usuarios', {})).length, nUsuarios); assert.strictEqual((await db.allAsync('respostas', {})).length, nResp); assert.strictEqual((await db.allAsync('progresso', {})).length, nProg);
  const segunda = await migrar(db, { aplicar: true, log: () => {} });
  assert.strictEqual(segunda.placeholders.length + segunda.duplicadas.length + segunda.substituicoes_feitas.length + segunda.inseridas.length, 0, 'não é idempotente');
  if (segunda.backup) fs.unlinkSync(segunda.backup);
});

test('tempo: diagnóstico e avaliação final gravam tempo total e por questão, com limites', async () => {
  const c = cliente(BASE); await c.post('/api/auth/registro', { nome: 'Tempo Teste Um', email: 'tempo@x.com', senha: 'abc123' });
  const diag = await db.allAsync('exercicios', { categoria: 'diagnostica' });
  const resp = diag.map((e, i) => ({ exercicio_id: e.id, resposta_dada: e.resposta_correta, tempo_ms: 5000 + i }));
  resp[0].tempo_ms = -50; resp[1].tempo_ms = 99999999;
  const r = await c.post('/api/diagnostico/submeter', { respostas: resp, tempo_total_ms: 123456 });
  assert.ok(r.dados.sucesso); assert.strictEqual(r.dados.tempo_ms, 123456);
  const uid = (await db.getAsync('usuarios', { email: 'tempo@x.com' })).id;
  const doc = await db.getAsync('diagnostico_respostas', { usuario_id: uid }); assert.strictEqual(doc.tempo_ms, 123456);
  const rs = await db.allAsync('respostas', { usuario_id: uid, categoria: 'diagnostica' });
  assert.strictEqual(rs.filter(x => typeof x.tempo_ms === 'number').length, 8, 'só os 8 tempos válidos são gravados'); assert.ok(rs.every(x => x.tempo_ms === undefined || (x.tempo_ms >= 0 && x.tempo_ms <= 1800000)));
  const ruim = cliente(BASE); await ruim.post('/api/auth/registro', { nome: 'Tempo Invalido', email: 'tempo2@x.com', senha: 'abc123' });
  const r2 = await ruim.post('/api/diagnostico/submeter', { respostas: resp.slice(0, 3), tempo_total_ms: 'abc' }); assert.strictEqual(r2.dados.tempo_ms, null);
  assert.strictEqual((await db.getAsync('diagnostico_respostas', { usuario_id: (await db.getAsync('usuarios', { email: 'tempo2@x.com' })).id })).tempo_ms, undefined);
  const prog = (await c.get('/api/progresso')).dados; assert.strictEqual(prog.diagnostico.tempo_ms, 123456, 'progresso devolve o tempo');

  const fin = (await c.get('/api/avaliacao-final')).dados; assert.ok(fin.sucesso, JSON.stringify(fin).slice(0, 120));
  const rf = await c.post('/api/avaliacao-final/submeter', { respostas: fin.questoes.map((q, i) => ({ exercicio_id: q.id, resposta_dada: 'x', tempo_ms: 4000 })), tempo_total_ms: 777000 });
  assert.ok(rf.dados.sucesso); assert.strictEqual(rf.dados.tempo_ms, 777000);
  assert.strictEqual((await db.getAsync('avaliacao_final_respostas', { usuario_id: uid })).tempo_ms, 777000);
  assert.strictEqual((await c.get('/api/avaliacao-final')).dados.resultado.tempo_ms, 777000, 'resultado salvo mostra o tempo');
});
test('tempo: telemetria aceita duração da tentativa dos exercícios e analytics expõe os tempos ao professor', async () => {
  const c = cliente(BASE); await c.post('/api/auth/login', { email: 'tempo@x.com', senha: 'abc123' });
  const r = await c.post('/api/telemetria', { eventos: [{ tipo: 'unidade_resultado', unidade_id: 1, percentual: 80, acertos: 4, total: 5, tempo_ms: 95000 }, { tipo: 'unidade_resultado', unidade_id: 1, percentual: 80, acertos: 4, total: 5, tempo_ms: -1 }, { tipo: 'aba_tempo', unidade_id: 1, aba: 'exercicios', tempo_ms: 40000 }] });
  assert.strictEqual(r.dados.registrados, 3);
  const ev = (await db.allAsync('telemetria', {})).filter(e => e.tipo === 'unidade_resultado' && e.percentual === 80); assert.deepStrictEqual(ev.map(e => e.tempo_ms).sort(), [undefined, 95000].sort());
  const a = (await prof.get('/api/professor/analytics')).dados; const al = a.alunos.find(x => x.email === 'tempo@x.com');
  assert.strictEqual(al.tempo_diagnostico_ms, 123456); assert.strictEqual(al.tempo_avaliacao_final_ms, 777000); assert.strictEqual(al.tempo_exercicios_ms, 40000);
  assert.ok(a.resumo.tempo_medio_diagnostico_ms > 0); assert.ok(a.resumo.tempo_medio_avaliacao_final_ms > 0);
  assert.strictEqual(a.unidades.find(u => u.ordem === 1).tempo_tentativa_medio_ms, 95000);
});

test('mascote: responde sem login (base local) e valida a entrada', async () => {
  const anon = cliente(BASE); const r = await anon.post('/api/mascote/perguntar', { pergunta: 'o que é um algoritmo?', pagina: 'landing' });
  assert.ok(r.dados.sucesso); assert.strictEqual(r.dados.origem, 'base'); assert.strictEqual(r.dados.id, 'algoritmo');
  assert.strictEqual((await anon.post('/api/mascote/perguntar', { pergunta: 'x'.repeat(5000) })).dados.origem, 'nao_entendi', 'pergunta longa é truncada, sem erro');
  assert.strictEqual((await anon.post('/api/mascote/perguntar', { pergunta: 123, id: {} })).dados.origem, 'nao_entendi');
  assert.strictEqual((await anon.post('/api/mascote/perguntar', { id: 'inexistente' })).dados.origem, 'nao_entendi');
});
test('mascote: antes do diagnóstico e nas páginas de avaliação só ajuda com a plataforma (integridade)', async () => {
  const novo = cliente(BASE); await novo.post('/api/auth/registro', { nome: 'Sem Diagnostico', email: 'semdiag@x.com', senha: 'abc123' });
  const pre = (await novo.post('/api/mascote/perguntar', { pergunta: 'o que é um algoritmo?', pagina: 'dashboard' })).dados;
  assert.strictEqual(pre.origem, 'restrito'); assert.ok(pre.resposta.includes('diagnóstico inicial'));
  assert.strictEqual((await novo.post('/api/mascote/perguntar', { pergunta: 'quanto tempo eu levei', pagina: 'dashboard' })).dados.origem, 'base');
  const feito = cliente(BASE); await feito.post('/api/auth/login', { email: 'tempo@x.com', senha: 'abc123' });
  assert.strictEqual((await feito.post('/api/mascote/perguntar', { pergunta: 'o que é um algoritmo?', pagina: 'dashboard' })).dados.origem, 'base');
  assert.strictEqual((await feito.post('/api/mascote/perguntar', { pergunta: 'o que é um algoritmo?', pagina: 'avaliacao-final' })).dados.origem, 'restrito');
  assert.strictEqual((await feito.post('/api/mascote/perguntar', { pergunta: 'qual a resposta?', pagina: 'diagnostico' })).dados.origem, 'restrito');
});
test('mascote: temas de professor só para professor; IA só com chave, logado e fora de avaliação (chamada simulada)', async () => {
  assert.strictEqual((await prof.post('/api/mascote/perguntar', { pergunta: 'como marcar conta de teste', pagina: 'professor' })).dados.id, 'prof_conta_teste');
  assert.notStrictEqual((await est.post('/api/mascote/perguntar', { pergunta: 'como marcar conta de teste', pagina: 'dashboard' })).dados.id, 'prof_conta_teste');
  const original = global.fetch; let chamadas = 0;
  global.fetch = (u, o) => String(u).includes('api.anthropic.com') ? (chamadas++, Promise.resolve({ ok: true, json: async () => ({ content: [{ type: 'text', text: 'Resposta simulada da IA.' }] }) })) : original(u, o);
  const feito = cliente(BASE); await feito.post('/api/auth/login', { email: 'tempo@x.com', senha: 'abc123' });
  try {
    const sem = (await feito.post('/api/mascote/perguntar', { pergunta: 'explique recursão em programação', pagina: 'dashboard' })).dados; assert.strictEqual(sem.origem, 'nao_entendi'); assert.strictEqual(chamadas, 0, 'sem chave não chama IA');
    process.env.ANTHROPIC_API_KEY = 'chave-de-teste';
    const com = (await feito.post('/api/mascote/perguntar', { pergunta: 'explique recursão em programação', pagina: 'dashboard' })).dados; assert.strictEqual(com.origem, 'ia'); assert.strictEqual(chamadas, 1); assert.ok(com.aviso);
    const nav = (await feito.post('/api/mascote/perguntar', { pergunta: 'explique recursão em programação', pagina: 'avaliacao-final' })).dados; assert.notStrictEqual(nav.origem, 'ia'); assert.ok(nav.resposta.includes('uso da plataforma')); assert.strictEqual(chamadas, 1, 'avaliação nunca usa IA');
    assert.strictEqual((await cliente(BASE).post('/api/mascote/perguntar', { pergunta: 'explique recursão em programação' })).dados.origem, 'nao_entendi'); assert.strictEqual(chamadas, 1, 'sem login não usa IA');
    for (let i = 0; i < 20; i++) await feito.post('/api/mascote/perguntar', { pergunta: 'explique recursão em programação ' + i, pagina: 'dashboard' });
    assert.ok(chamadas <= 15, 'limite de IA por hora: ' + chamadas);
  } finally { delete process.env.ANTHROPIC_API_KEY; global.fetch = original; }
});

aguardarServidor().then(() => executar('Integração (servidor + banco em memória)')).then(r => { console.log('\nTotal: ' + r.total + ' | falhas: ' + r.falhas); process.exit(r.falhas ? 1 : 0); });
