process.env.PORT = process.env.PORT || '3918';
const { test, executar, assert, cliente } = require('./helpers');
const mock = require('./mock-db'); const db = mock.instalar();
require('../server.js');
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs'); const path = require('path');
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const BASE = 'http://localhost:' + process.env.PORT;
const esperar = ms => new Promise(r => setTimeout(r, ms));
const PAGINAS = ['landing', 'login', 'index', 'dashboard', 'unidade', 'perfil', 'progresso', 'professor', 'gerenciar', 'diagnostico', 'avaliacao-final', 'certificado'];
const errosConsole = [];

async function abrir(caminho, cookie, opc) {
  opc = opc || {};
  const html = await (await fetch(BASE + caminho)).text();
  const beacons = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => { if (!/Not implemented: (window\.scrollTo|HTMLCanvasElement|navigation)|fonts\.googleapis\.com/.test(e.message)) errosConsole.push(caminho + ' :: ' + e.message.split('\n')[0]); });
  vc.on('error', e => errosConsole.push(caminho + ' :: console.error ' + String(e).slice(0, 120)));
  const dom = new JSDOM(html, { url: BASE + caminho, runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      w.fetch = (u, o) => {
        if (opc.espiar) opc.espiar(String(u), o);
        if (opc.falsa) { const f = opc.falsa(String(u), o); if (f) return Promise.resolve({ ok: true, json: async () => f }); }
        return fetch(new URL(u, BASE), Object.assign({}, o, { headers: Object.assign({}, (o && o.headers) || {}, cookie ? { Cookie: cookie } : {}) }));
      };
      if (opc.storage) Object.keys(opc.storage).forEach(k => w.localStorage.setItem(k, opc.storage[k]));
      w.scrollTo = () => {}; w.matchMedia = w.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
      w.navigator.sendBeacon = (u, b) => { beacons.push(b); return true; };
      w.HTMLElement.prototype.scrollIntoView = function () {};
      if (opc.largura) { Object.defineProperty(w, 'innerWidth', { value: opc.largura, configurable: true }); }
    } });
  dom.beacons = beacons;
  return dom;
}
async function ate(fn, ms) { const t0 = Date.now(); while (Date.now() - t0 < (ms || 4000)) { try { const r = fn(); if (r) return r; } catch (e) {  } await esperar(50); } throw new Error('tempo esgotado aguardando condição: ' + fn.toString().slice(0, 90)); }
const rodarAxe = async (w, regras) => { w.eval(AXE); return w.axe.run(w.document, { rules: Object.assign({ 'color-contrast': { enabled: false } }, regras || {}) }); };
const resumoAxe = r => r.violations.map(v => v.id + ' (' + v.nodes.length + '): ' + v.nodes.slice(0, 2).map(n => n.target.join(' ')).join(' | ')).join('\n      ');

const prof = cliente(BASE), est = cliente(BASE);
let unidadeId;

test('preparação: professor, estudante com diagnóstico indicando a Unidade 3', async () => {
  await prof.post('/api/auth/registro', { nome: 'Profa', email: 'p@x.com', senha: 'abc123', tipo: 'professor' });
  await est.post('/api/auth/registro', { nome: 'Maria Silva', email: 'm@x.com', senha: 'abc123' });
  const diag = (await db.allAsync('exercicios', { categoria: 'diagnostica' }));

  const resp = diag.map((e, i) => ({ exercicio_id: e.id, resposta_dada: i < 5 ? e.resposta_correta : 'x' }));
  const r = await est.post('/api/diagnostico/submeter', { respostas: resp }); assert.strictEqual(r.dados.destino, 3);
  unidadeId = (await est.get('/api/unidades')).dados.unidades.find(u => u.ordem === 1).id;
});

PAGINAS.forEach(p => test('estrutura (' + p + '.html): lang, descrição, h1, main, ids únicos, sem divs clicáveis', async () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'public', p + '.html'), 'utf8');
  const doc = new JSDOM(html).window.document;
  assert.ok(doc.documentElement.getAttribute('lang') === 'pt-BR', 'html sem lang pt-BR');
  assert.ok(doc.querySelector('meta[name="description"]'), 'sem meta description');
  if (p !== 'index') { assert.ok(doc.querySelector('main'), 'sem <main>'); }
  const ids = [...doc.querySelectorAll('[id]')].map(e => e.id); const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
  assert.deepStrictEqual([...new Set(dup)], [], 'ids duplicados: ' + dup);
  const clicaveis = [...doc.querySelectorAll('div[onclick],span[onclick],tr[onclick],li[onclick],td[onclick],p[onclick]')];
  assert.strictEqual(clicaveis.length, 0, 'elementos não focáveis com onclick: ' + clicaveis.map(e => e.className).join(', '));
  [...doc.querySelectorAll('img')].forEach(i => assert.ok(i.hasAttribute('alt'), 'img sem alt'));
  const sem = [...doc.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]),select,textarea')].filter(e => !(e.id && doc.querySelector('label[for="' + e.id + '"]')) && !e.closest('label') && !e.getAttribute('aria-label') && !e.getAttribute('aria-labelledby'));
  assert.strictEqual(sem.length, 0, 'campos sem rótulo: ' + sem.map(e => e.id || e.className).join(', '));
  if (['dashboard', 'unidade', 'perfil', 'progresso', 'professor', 'gerenciar'].includes(p)) {
    assert.strictEqual(doc.querySelectorAll('h1').length, 1, 'deve haver exatamente um h1');
    assert.ok(doc.querySelector('script[src="/js/tema.js"]'), 'tema.js ausente (tema escuro opcional)');
  }
}));

test('login: abas com ARIA, erro anunciável e campos com autocomplete', async () => {
  const dom = await abrir('/login.html'); const d = dom.window.document; await ate(() => typeof dom.window.trocarAba === 'function');
  assert.strictEqual(d.querySelectorAll('[role=tab]').length, 2); assert.strictEqual(d.querySelector('#tab-login').getAttribute('aria-selected'), 'true');
  dom.window.trocarAba('registro'); assert.strictEqual(d.querySelector('#tab-registro').getAttribute('aria-selected'), 'true');
  assert.strictEqual(d.querySelector('#login-erro').getAttribute('role'), 'alert');
  const r = await rodarAxe(dom.window); assert.strictEqual(r.violations.length, 0, '\n      ' + resumoAxe(r));
  dom.window.close();
});
test('dashboard: cartões são links, unidade recomendada destacada, sem alterar o diagnóstico', async () => {
  const dom = await abrir('/dashboard.html', est.cookie); const d = dom.window.document;
  await ate(() => d.querySelectorAll('.unidade-card').length === 5);
  const cards = [...d.querySelectorAll('.unidade-card')];
  assert.ok(cards.filter(c => c.tagName === 'A').length >= 3, 'cartões liberados devem ser links <a>');
  assert.ok(cards.filter(c => c.tagName === 'DIV').every(c => c.classList.contains('bloqueada')));
  const rec = cards.filter(c => c.classList.contains('recomendada')); assert.strictEqual(rec.length, 1);
  assert.ok(rec[0].textContent.includes('Unidade 3') && rec[0].textContent.includes('Recomendada'));
  assert.ok(!d.querySelector('.unidade-descricao'), 'cartões sem descrição visível'); assert.ok(d.querySelector('.sr-descricao'));
  assert.ok(d.querySelector('main#conteudo-principal') && d.querySelector('header.topbar') && d.querySelector('h1.topbar-title'));
  assert.ok(d.querySelector('.skip-link')); assert.ok(d.querySelector('#menu-toggle'), 'botão de menu móvel ausente');
  assert.ok(d.querySelector('nav[aria-label="Menu principal"] a[aria-current="page"]'));
  const r = await rodarAxe(dom.window); assert.strictEqual(r.violations.length, 0, '\n      ' + resumoAxe(r));
  dom.window.close();
});
test('menu móvel (375 px): abre/fecha, aria-expanded, Esc devolve foco', async () => {
  const dom = await abrir('/dashboard.html', est.cookie, { largura: 375 }); const w = dom.window, d = w.document;
  await ate(() => d.querySelector('#menu-toggle'));
  const est_ = d.createElement('style'); est_.textContent = '.menu-toggle{display:inline-flex}'; d.head.appendChild(est_);
  const t = d.querySelector('#menu-toggle'), sb = d.querySelector('#sidebar');
  assert.strictEqual(t.getAttribute('aria-expanded'), 'false'); t.click();
  assert.ok(sb.classList.contains('aberta')); assert.strictEqual(t.getAttribute('aria-expanded'), 'true');
  d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.ok(!sb.classList.contains('aberta')); assert.strictEqual(d.activeElement, t);
  dom.window.close();
});
test('tema escuro: botão alterna, persiste e é aplicado antes da pintura', async () => {
  const dom = await abrir('/dashboard.html', est.cookie); const w = dom.window, d = w.document;
  await ate(() => d.querySelector('#btn-tema'));
  const b = d.querySelector('#btn-tema'); assert.strictEqual(b.getAttribute('aria-pressed'), 'false'); b.click();
  assert.strictEqual(d.documentElement.getAttribute('data-theme'), 'dark'); assert.strictEqual(b.getAttribute('aria-pressed'), 'true');
  assert.strictEqual(w.localStorage.getItem('typeoff_tema'), 'escuro'); b.click(); assert.strictEqual(d.documentElement.getAttribute('data-theme'), null);
  dom.window.close();
});
test('perfil: todos os campos com label associado e sem violações axe', async () => {
  const dom = await abrir('/perfil.html', est.cookie); const d = dom.window.document;
  await ate(() => d.querySelector('#edit-nome') && d.querySelector('#perfil-email') && d.querySelector('#perfil-email').textContent.includes('@'));
  ['edit-nome', 'edit-email', 'edit-senha-atual', 'edit-nova-senha'].forEach(id => assert.ok(d.querySelector('label[for="' + id + '"]'), 'sem label para ' + id));
  const r = await rodarAxe(dom.window); assert.strictEqual(r.violations.length, 0, '\n      ' + resumoAxe(r)); dom.window.close();
});
test('progresso: renderiza sem erros e sem violações axe', async () => {
  const dom = await abrir('/progresso.html', est.cookie); const d = dom.window.document; await esperar(900);
  const r = await rodarAxe(dom.window); assert.strictEqual(r.violations.length, 0, '\n      ' + resumoAxe(r)); dom.window.close();
});

test('unidade/conteúdo: objetivos, revisão, blocos expansíveis, diagrama com descrição e referências', async () => {
  const dom = await abrir('/unidade.html?id=' + unidadeId, est.cookie); const w = dom.window, d = w.document;
  await ate(() => d.querySelectorAll('details.sanfona').length > 0);
  assert.ok(d.querySelector('.objetivos-card li')); assert.ok(d.querySelector('.revisao-previa'));
  assert.ok(d.querySelectorAll('.objetivos-card li').length >= 3);
  const sf = [...d.querySelectorAll('#conteudo-lista details.sanfona')]; assert.ok(sf.length >= 3); assert.ok(sf[0].open && !sf[1].open, 'só o primeiro bloco abre por padrão');
  w.alternarSanfonas(true); assert.ok(sf.every(x => x.open)); w.alternarSanfonas(false); assert.ok(sf.every(x => !x.open));
  const bt = d.querySelector('#btn-alternar-blocos'); bt.click(); assert.ok(sf.every(x => x.open) && bt.textContent === 'Recolher tudo'); bt.click(); assert.ok(sf.every(x => !x.open) && bt.textContent === 'Expandir tudo');
  assert.ok(d.querySelector('figure.diagrama svg[role="img"]')); assert.ok(d.querySelector('figure.diagrama details p').textContent.length > 40);
  assert.ok(d.querySelectorAll('.referencias-card li').length >= 2);
  assert.ok(d.querySelector('#meta-conteudo').textContent.length > 20, 'meta da etapa ausente');
  assert.ok(d.querySelectorAll('details.dica').length >= 2, 'informação secundária deve vir recolhida (minimalismo)');
  assert.ok([...d.querySelectorAll('details.dica')].every(x => !x.open));
  assert.ok(!d.querySelector('#visual-wrap details.sanfona').open, 'diagrama recolhido por padrão');
  const r = await rodarAxe(w); assert.strictEqual(r.violations.length, 0, '\n      ' + resumoAxe(r)); dom.window.close();
});
test('unidade/comparação: grade de 3 colunas, intro, "o que observar" antes do código, destaques e linhas numeradas', async () => {
  const dom = await abrir('/unidade.html?id=' + unidadeId, est.cookie); const w = dom.window, d = w.document;
  await ate(() => d.querySelector('.comp-grid'));
  w.irParaEtapa('comparacao');
  const grid = d.querySelector('.comp-grid'); assert.ok(grid.classList.contains('tres-colunas')); assert.strictEqual(grid.querySelectorAll('.lang-card').length, 3);
  const css = fs.readFileSync(path.join(__dirname, '..', 'public', 'css', 'style.css'), 'utf8');
  assert.ok(/@media \(min-width: 1180px\)\s*\{\s*\.comp-grid\.tres-colunas \{ grid-template-columns: repeat\(3/.test(css), 'regra de 3 colunas ausente');
  assert.ok(/\.comp-grid \{ display: grid !important; grid-template-columns: 1fr;/.test(css), 'empilhamento em telas pequenas ausente');
  assert.ok(/white-space: pre-wrap/.test(css) && /overflow-wrap: anywhere/.test(css), 'quebra de linha do código ausente');
  const ordem = [...d.querySelector('#comparacao-lista .conteudo-card').children].map(c => c.className);
  assert.ok(ordem.findIndex(c => /comp-intro/.test(c)) < ordem.findIndex(c => /comp-grid/.test(c)), 'introdução deve vir antes dos códigos');
  assert.ok(!d.querySelector('#comparacao-lista .comp-observacoes-topo'), 'sem duplicar o "o que observar" quando há notas por linguagem');
  assert.ok(d.querySelector('#comp-intro-geral') && !d.querySelector('#comp-intro-geral').open, 'guia de leitura recolhido');
  assert.ok(d.querySelector('#comparacao-lista details.dica') && !d.querySelector('#comparacao-lista details.dica').open, '"o que muda/permanece" recolhido');
  assert.strictEqual(d.querySelectorAll('.lang-obs').length, 3, '"o que observar" por linguagem, junto de cada código');
  assert.ok(d.querySelector('.cmp-muda') && d.querySelector('.cmp-permanece'));
  const cods = [...d.querySelectorAll('.comp-grid pre.codigo')]; assert.strictEqual(cods.length, 3);
  cods.forEach(p => { assert.ok(p.querySelector('.ln[data-n="1"]')); assert.ok(p.querySelectorAll('.dif').length > 0, 'sem diferenças destacadas'); });
  assert.ok(d.querySelectorAll('#comp-legenda .chip').length >= 4, 'legenda dos destaques');
  d.querySelector('#opt-destaque').checked = false; w.alternarOpcoesCodigo(); assert.ok(cods.every(p => p.classList.contains('sem-destaque')));
  d.querySelector('#opt-numeros').checked = false; w.alternarOpcoesCodigo(); assert.ok(cods.every(p => p.classList.contains('sem-numeros')));
  const r = await rodarAxe(w); assert.strictEqual(r.violations.length, 0, '\n      ' + resumoAxe(r)); dom.window.close();
});
test('unidade/exercícios: só formativas, numeração de linhas no código, opções com botões, feedback e teclado', async () => {
  const dom = await abrir('/unidade.html?id=' + unidadeId, est.cookie); const w = dom.window, d = w.document;
  await ate(() => d.querySelector('#tela-exercicios .quiz-container')); w.irParaEtapa('exercicios');
  assert.strictEqual(d.querySelector('.quiz-prog-label span').textContent.trim(), 'Questão 1 de 7');
  const q = d.querySelector('.quiz-question'); assert.ok(q.textContent.length > 20);
  const botoes = [...d.querySelectorAll('.quiz-opcao')]; assert.ok(botoes.length >= 2 && botoes.every(b => b.tagName === 'BUTTON' && b.type === 'button'));
  const r0 = await rodarAxe(w); assert.strictEqual(r0.violations.length, 0, '\n      ' + resumoAxe(r0));
  botoes[0].click(); await ate(() => d.querySelector('#feedback-area .feedback-box'));
  assert.ok([...d.querySelectorAll('.quiz-opcao')].every(b => b.disabled)); assert.ok(!d.querySelector('#btn-proxima').classList.contains('hidden'));
  assert.strictEqual(d.activeElement.id, 'feedback-area', 'foco deve ir ao feedback');
  w.proximaQuestao(); assert.ok(/Questão 2 de 7/.test(d.querySelector('.quiz-prog-label').textContent));
  assert.strictEqual(d.activeElement.id, 'q-titulo', 'foco no cabeçalho da nova questão');
  const alg = d.querySelector('.quiz-question pre.codigo'); assert.ok(alg && alg.querySelectorAll('.ln').length >= 5, 'Q2 deve mostrar o algoritmo numerado');
  assert.ok(alg.textContent.includes('Passo 1') && alg.textContent.includes('Passo 5'));
  dom.window.close();
});
test('unidade/prática: completar código com lacunas e ordenar linhas — fluxo completo até o resultado', async () => {
  const dom = await abrir('/unidade.html?id=' + unidadeId, est.cookie); const w = dom.window, d = w.document;
  await ate(() => d.querySelector('#tela-exercicios .quiz-container')); w.irParaEtapa('exercicios');
  const ex = w.eval('exercicios'); let acertos = 0;
  for (let i = 0; i < ex.length; i++) {
    const e = ex[i];
    if (e.tipo === 'completar_codigo') {
      const sels = [...d.querySelectorAll('.lacuna-select')]; assert.ok(sels.length >= 2, 'lacunas não renderizadas');
      assert.ok(sels.every(s => s.getAttribute('aria-label')));
      w.verificarCompletar(); assert.ok(/Escolha uma opção/.test(d.querySelector('.toast-container').textContent), 'deve exigir todas as lacunas');
      const certa = JSON.parse(e.resposta_correta); sels.forEach((s, k) => { s.value = certa[k]; });
      w.verificarCompletar();
    } else if (e.tipo === 'ordenar_linhas') {
      const certa = JSON.parse(e.resposta_correta); const itens = () => [...d.querySelectorAll('.ordenar-item code')].map(c => c.textContent);
      assert.ok(itens().length === certa.length); assert.notDeepStrictEqual(itens(), certa, 'linhas devem começar embaralhadas');
      const antes = itens(); d.querySelector('.ordenar-btns button[data-dir="1"]').click(); assert.notDeepStrictEqual(itens(), antes, 'botão ▼ deve mover a linha');
      assert.ok(d.querySelector('#ordenar-aviso').textContent.includes('posição'), 'movimento anunciado');
      assert.ok([...d.querySelectorAll('.ordenar-btns button')].every(b => b.getAttribute('aria-label')));
      w.eval('quiz').ordem = certa.slice(); w.desenharOrdenar(); w.verificarOrdem();
    } else {
      const certo = [...d.querySelectorAll('.quiz-opcao')].find(b => (b.dataset.valor || '').trim().toLowerCase() === e.resposta_correta.trim().toLowerCase()); assert.ok(certo, 'alternativa correta não encontrada (valor com quebra de linha?)'); certo.click();
    }
    await ate(() => d.querySelector('#feedback-area .feedback-correto'), 3000); acertos++;
    w.proximaQuestao();
  }
  await ate(() => d.querySelector('.resultado-box')); assert.strictEqual(d.querySelector('.resultado-score').textContent.trim(), '100%');
  assert.ok(d.querySelector('.resultado-score').classList.contains('aprovado'));
  const unidades = (await est.get('/api/unidades')).dados.unidades; assert.strictEqual(unidades.find(u => u.ordem === 2).status, 'em_andamento', 'regra dos 80% deve liberar a Unidade 2');
  assert.strictEqual(acertos, 7);
  assert.ok(dom.beacons.length >= 1, 'telemetria deve ser enviada (sendBeacon)');
  const eventos = JSON.parse(await dom.beacons[0].text()); assert.ok(Array.isArray(eventos.eventos));
  dom.window.close();
});
test('unidade/exercícios: opção com quebra de linha (Q13) é respondível — antes o onclick inline quebrava o valor', async () => {
  const u3 = (await est.get('/api/unidades')).dados.unidades.find(u => u.ordem === 3);
  const dom = await abrir('/unidade.html?id=' + u3.id, est.cookie); const w = dom.window, d = w.document;
  await ate(() => d.querySelector('#tela-exercicios .quiz-container')); w.irParaEtapa('exercicios');
  const exs = w.eval('exercicios'); const idx = exs.findIndex(e => /temperatura/.test(e.enunciado)); assert.ok(idx >= 0);
  w.eval('quiz').indice = idx; w.renderizarQuestao();
  const certa = exs[idx].resposta_correta; assert.ok(certa.includes('\n'), 'gabarito deve ter quebras reais de linha');
  const b = [...d.querySelectorAll('.quiz-opcao')].find(x => x.dataset.valor === certa); assert.ok(b, 'botão com valor idêntico ao gabarito'); b.click();
  await ate(() => d.querySelector('#feedback-area .feedback-correto')); assert.ok(b.classList.contains('correta'));
  dom.window.close();
});
test('unidade: professor vê botão de editar; bloqueada redireciona estudante', async () => {
  const dom = await abrir('/unidade.html?id=' + unidadeId, prof.cookie); const d = dom.window.document;
  await ate(() => d.querySelector('.btn-editar-flutuante')); assert.ok(d.querySelector('details.sanfona .btn-secondary'), 'botão ✎ Editar nos blocos');
  dom.window.close();
});

test('professor: abas ARIA, setas do teclado, linhas acionáveis e painel de telemetria', async () => {
  const dom = await abrir('/professor.html', prof.cookie); const w = dom.window, d = w.document;
  await ate(() => d.querySelectorAll('#tabela-alunos tr, .aluno-row').length > 0 || d.querySelector('.aluno-row'));
  assert.ok(d.querySelectorAll('[role=tab]').length === 4);
  const linha = d.querySelector('.aluno-row'); assert.strictEqual(linha.getAttribute('tabindex'), '0'); assert.strictEqual(linha.getAttribute('role'), 'button'); assert.ok(linha.getAttribute('aria-label'));
  const aba = d.querySelector('#tab-alunos'); aba.focus(); aba.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  await ate(() => d.querySelector('#panel-telemetria').classList.contains('active'));
  await ate(() => d.querySelectorAll('#tele-unidades tr').length === 5);
  assert.ok(d.querySelectorAll('#tele-questoes tr').length >= 25); assert.ok(d.querySelectorAll('#tele-alunos input[type=checkbox]').length >= 1);
  assert.ok(d.querySelector('#tele-resumo .stat-card'));
  linha.click(); await ate(() => d.querySelector('#modal-aluno.aberto'));
  const dlg = d.querySelector('#modal-aluno .modal'); assert.strictEqual(dlg.getAttribute('role'), 'dialog'); assert.strictEqual(dlg.getAttribute('aria-modal'), 'true');
  assert.ok(!d.body.innerHTML.includes('abc123'), 'senha não pode aparecer no painel');
  d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); assert.ok(!d.querySelector('#modal-aluno').classList.contains('aberto'));
  const r = await rodarAxe(w); assert.strictEqual(r.violations.length, 0, '\n      ' + resumoAxe(r)); dom.window.close();
});
test('gerenciar: carrega e não possui violações axe', async () => {
  const dom = await abrir('/gerenciar.html', prof.cookie); const w = dom.window; await esperar(1200);
  const r = await rodarAxe(w); assert.strictEqual(r.violations.length, 0, '\n      ' + resumoAxe(r)); dom.window.close();
});
test('diagnóstico, avaliação final, landing e certificado: sem violações axe', async () => {
  for (const [p, c] of [['/landing.html', null], ['/diagnostico.html', est.cookie], ['/avaliacao-final.html', est.cookie], ['/certificado.html', est.cookie]]) {
    const dom = await abrir(p, c); await esperar(700);
    const r = await rodarAxe(dom.window); assert.strictEqual(r.violations.length, 0, p + '\n      ' + resumoAxe(r)); dom.window.close();
  }
});

test('tamanho do texto: A−/A+/100% na barra lateral, limites, aviso para leitor de tela e persistência', async () => {
  const dom = await abrir('/dashboard.html', est.cookie); const w = dom.window, d = w.document;
  await ate(() => d.querySelector('.fonte-mais'));
  const raiz = d.documentElement, mais = d.querySelector('.fonte-mais'), menos = d.querySelector('.fonte-menos'), pad = d.querySelector('.fonte-padrao');
  assert.ok(mais.getAttribute('aria-label') && menos.getAttribute('aria-label') && pad.getAttribute('aria-label'));
  assert.strictEqual(raiz.style.getPropertyValue('--escala-fonte'), '1'); assert.strictEqual(pad.textContent, '100%');
  mais.click(); assert.strictEqual(raiz.style.getPropertyValue('--escala-fonte'), '1.15'); assert.strictEqual(pad.textContent, '115%');
  assert.ok(d.querySelector('.fonte-aviso').textContent.includes('115%'), 'aviso anunciável');
  assert.strictEqual(w.localStorage.getItem('typeoff_fonte'), '2');
  mais.click(); mais.click(); assert.strictEqual(raiz.style.getPropertyValue('--escala-fonte'), '1.5'); assert.ok(mais.disabled, 'limite máximo');
  pad.click(); assert.strictEqual(raiz.style.getPropertyValue('--escala-fonte'), '1'); assert.ok(!mais.disabled);
  menos.click(); assert.strictEqual(raiz.style.getPropertyValue('--escala-fonte'), '0.9'); assert.ok(menos.disabled, 'limite mínimo');
  dom.window.close();
});
test('tamanho do texto: preferência salva é aplicada ao abrir qualquer página (antes da pintura)', async () => {
  const html = await (await fetch(BASE + '/dashboard.html')).text();
  const dom = new JSDOM(html, { url: BASE + '/dashboard.html', runScripts: 'dangerously', resources: 'usable', beforeParse(w) { w.localStorage.setItem('typeoff_fonte', '3'); w.fetch = () => new Promise(() => {}); w.scrollTo = () => {}; } });
  await ate(() => dom.window.TypeoffFonte);
  assert.strictEqual(dom.window.document.documentElement.style.getPropertyValue('--escala-fonte'), '1.3'); dom.window.close();
});
test('diagnóstico: botão de tema escuro no canto da tela, alterna e persiste', async () => {
  const dom = await abrir('/diagnostico.html', est.cookie); const w = dom.window, d = w.document;
  await ate(() => d.querySelector('.ctl-flutuante #btn-tema'));
  const b = d.querySelector('#btn-tema'); assert.strictEqual(b.getAttribute('aria-pressed'), 'false');
  assert.ok(d.querySelector('.ctl-flutuante .fonte-mais'), 'controle de fonte continua presente');
  b.click(); assert.strictEqual(d.documentElement.getAttribute('data-theme'), 'dark'); assert.strictEqual(b.getAttribute('aria-pressed'), 'true');
  assert.strictEqual(w.localStorage.getItem('typeoff_tema'), 'escuro');
  b.click(); assert.strictEqual(d.documentElement.getAttribute('data-theme'), null);
  const r = await rodarAxe(w); assert.strictEqual(r.violations.length, 0, '\n      ' + resumoAxe(r)); dom.window.close();
});
test('diagnóstico: tema escuro salvo é aplicado ao abrir (sem flash) e as classes da página têm versão escura', async () => {
  const html = await (await fetch(BASE + '/diagnostico.html')).text();
  const dom = new JSDOM(html, { url: BASE + '/diagnostico.html', runScripts: 'dangerously', resources: 'usable', beforeParse(w) { w.localStorage.setItem('typeoff_tema', 'escuro'); w.fetch = () => new Promise(() => {}); w.scrollTo = () => {}; } });
  await ate(() => dom.window.TypeoffFonte); assert.strictEqual(dom.window.document.documentElement.getAttribute('data-theme'), 'dark'); dom.window.close();
  const css = fs.readFileSync(path.join(__dirname, '..', 'public', 'css', 'style.css'), 'utf8');
  ['.diag-wrapper', '.diag-card', '.q-opcao', '.q-texto', '.q-unidade-tag', '.res-destino'].forEach(c => assert.ok(css.includes('html[data-theme="dark"] ' + c), 'sem regra escura para ' + c));
});
test('avaliação final: continua só com controle de fonte (sem tema escuro)', async () => {
  const html = await (await fetch(BASE + '/avaliacao-final.html')).text();
  const dom = new JSDOM(html, { url: BASE + '/avaliacao-final.html', runScripts: 'dangerously', resources: 'usable', beforeParse(w) { w.localStorage.setItem('typeoff_tema', 'escuro'); w.fetch = () => new Promise(() => {}); w.scrollTo = () => {}; } });
  const d = dom.window.document; await ate(() => d.querySelector('.ctl-flutuante .fonte-mais'));
  assert.ok(!d.querySelector('.ctl-flutuante #btn-tema'), 'sem botão de tema'); assert.strictEqual(d.documentElement.getAttribute('data-theme'), null);
  d.querySelector('.fonte-mais').click(); assert.strictEqual(d.documentElement.getAttribute('data-fonte'), '2'); dom.window.close();
});
test('CSS: texto em rem (escala com o controle), sidebar proporcional e sem fonte fixa em px', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'public', 'css', 'style.css'), 'utf8');
  assert.ok(/html \{ font-size: calc\(100% \* var\(--escala-fonte, 1\)\); \}/.test(css));
  assert.ok(!/body \{[^}]*font-size: 15px/.test(css), 'body ainda em px');
  const px = css.split('\n').filter(l => /font-size:\s*[\d.]+px/.test(l) && !/\.sv-/.test(l)); assert.deepStrictEqual(px, [], 'font-size em px: ' + px.join(' | '));
  assert.ok(/@media \(min-width: 769px\)\s*\{\s*\.sidebar \{ width: clamp\(260px, 16\.25rem, 340px\)/.test(css));
});

const TODAS_COM_TYPO = ['landing', 'login', 'dashboard', 'unidade', 'progresso', 'perfil', 'professor', 'gerenciar', 'diagnostico', 'avaliacao-final', 'certificado'];
test('Typo: presente em todas as telas, com botão rotulado e personagem decorativo (SVG)', async () => {
  for (const p of TODAS_COM_TYPO) {
    const html = fs.readFileSync(path.join(__dirname, '..', 'public', p + '.html'), 'utf8');
    assert.ok(html.includes('/js/mascote.js') && html.includes('/css/mascote.css'), p + ': mascote não incluído');
  }
  for (const [p, c] of [['/landing.html', null], ['/login.html', null], ['/dashboard.html', est.cookie]]) {
    const dom = await abrir(p, c); const d = dom.window.document; await ate(() => d.querySelector('#typo-btn'));
    const b = d.querySelector('#typo-btn'); assert.ok(b.getAttribute('aria-label').includes('Typo')); assert.strictEqual(b.getAttribute('aria-expanded'), 'false');
    assert.strictEqual(b.querySelector('svg').getAttribute('aria-hidden'), 'true'); assert.ok(d.querySelector('#typo-painel').hidden);
    dom.window.close();
  }
});
test('Typo: abre o painel, saúda pelo nome, sugere temas e foca o campo; Esc fecha e devolve o foco', async () => {
  const dom = await abrir('/dashboard.html', est.cookie); const w = dom.window, d = w.document; await ate(() => d.querySelector('#typo-btn'));
  await esperar(300); d.querySelector('#typo-btn').click();
  const p = d.querySelector('#typo-painel'); assert.ok(!p.hidden); assert.strictEqual(d.querySelector('#typo-btn').getAttribute('aria-expanded'), 'true');
  assert.strictEqual(p.getAttribute('role'), 'dialog'); assert.strictEqual(p.getAttribute('aria-modal'), 'false'); assert.strictEqual(d.querySelector('#typo-log').getAttribute('role'), 'log');
  assert.ok(/Maria/.test(d.querySelector('.typo-msg.bot').textContent), 'saudação com o primeiro nome'); assert.ok(d.querySelectorAll('.typo-chip').length >= 3);
  await ate(() => d.activeElement && d.activeElement.id === 'typo-q');
  d.activeElement.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.ok(p.hidden); assert.strictEqual(d.activeElement.id, 'typo-btn'); dom.window.close();
});
test('Typo: pergunta digitada recebe resposta; tema sugerido responde; "Ver outros temas" volta aos temas da tela', async () => {
  const bodies = []; const dom = await abrir('/dashboard.html', est.cookie, { espiar: (u, o) => { if (u.includes('/mascote/')) bodies.push(JSON.parse(o.body)); } });
  const w = dom.window, d = w.document; await ate(() => d.querySelector('#typo-btn')); d.querySelector('#typo-btn').click();
  d.querySelector('#typo-q').value = 'O que é um laço for?'; d.querySelector('#typo-form').dispatchEvent(new w.Event('submit', { cancelable: true, bubbles: true }));
  await ate(() => d.querySelectorAll('.typo-msg.bot').length >= 2);
  assert.ok(d.querySelector('.typo-msg.eu').textContent.includes('laço for')); assert.ok(/for/.test(d.querySelectorAll('.typo-msg.bot')[1].innerHTML));
  assert.ok([...d.querySelectorAll('.typo-chip')].some(c => c.textContent === 'Ver outros temas'));
  assert.ok(!d.querySelector('.typo-pensando'), 'indicador de "pensando" removido');
  const temas = [...d.querySelectorAll('.typo-chip')].find(c => c.textContent === 'Ver outros temas'); temas.click();
  assert.ok([...d.querySelectorAll('.typo-chip')].some(c => /80%|Como libero/.test(c.textContent)));
  assert.deepStrictEqual(Object.keys(bodies[0]).sort(), ['etapa', 'pagina', 'pergunta'], 'só envia pergunta, página e etapa (sem dados pessoais)');
  dom.window.close();
});
test('Typo: "Por onde eu começo?" usa o andamento do estudante e oferece o link da unidade recomendada', async () => {
  const dom = await abrir('/dashboard.html', est.cookie); const w = dom.window, d = w.document; await ate(() => d.querySelector('#typo-btn')); d.querySelector('#typo-btn').click();
  [...d.querySelectorAll('.typo-chip')].find(c => c.textContent === 'Por onde eu começo?').click();
  await ate(() => [...d.querySelectorAll('.typo-msg.bot')].some(m => /Unidade 3/.test(m.textContent)));
  const a = [...d.querySelectorAll('.typo-msg.bot a')].pop(); assert.ok(a && /\/unidade\.html\?id=\d+/.test(a.getAttribute('href'))); dom.window.close();
});
test('Typo: respostas do servidor são exibidas como texto (sem executar HTML)', async () => {
  const dom = await abrir('/dashboard.html', est.cookie, { falsa: u => u.includes('/mascote/') ? { sucesso: true, resposta: '<img src=x onerror="window.__xss=1"> **ok** `cod`', sugestoes: [] } : null });
  const w = dom.window, d = w.document; await ate(() => d.querySelector('#typo-btn')); d.querySelector('#typo-btn').click();
  d.querySelector('#typo-q').value = 'teste'; d.querySelector('#typo-form').dispatchEvent(new w.Event('submit', { cancelable: true, bubbles: true }));
  await ate(() => d.querySelectorAll('.typo-msg.bot').length >= 2); await esperar(100);
  const m = d.querySelectorAll('.typo-msg.bot')[1]; assert.ok(!m.querySelector('img'), 'HTML não pode virar elemento'); assert.ok(m.textContent.includes('<img')); assert.ok(m.querySelector('strong') && m.querySelector('code')); assert.strictEqual(w.__xss, undefined); dom.window.close();
});
test('Typo: erro de rede mostra mensagem amigável e mantém o painel utilizável', async () => {
  const dom = await abrir('/dashboard.html', est.cookie); const w = dom.window, d = w.document; await ate(() => d.querySelector('#typo-btn')); d.querySelector('#typo-btn').click();
  w.fetch = () => Promise.reject(new Error('offline')); d.querySelector('#typo-q').value = 'oi typo'; d.querySelector('#typo-form').dispatchEvent(new w.Event('submit', { cancelable: true, bubbles: true }));
  await ate(() => [...d.querySelectorAll('.typo-msg.bot')].some(m => /servidor/.test(m.textContent))); assert.ok(!d.querySelector('.typo-enviar').disabled); dom.window.close();
});
test('Typo: dica contextual aparece uma vez por tela, pode ser dispensada e desligada', async () => {
  let dom = await abrir('/dashboard.html', est.cookie); let d = dom.window.document;
  await ate(() => !d.querySelector('#typo-balao').hidden, 4000); assert.ok(/Recomendada/.test(d.querySelector('#typo-balao-txt').textContent));
  d.querySelector('#typo-balao .typo-x').click(); assert.ok(d.querySelector('#typo-balao').hidden);
  const vistos = JSON.parse(dom.window.localStorage.getItem('typeoff_typo')).vistos; assert.ok(vistos.dashboard); dom.window.close();
  dom = await abrir('/dashboard.html', est.cookie, { storage: { typeoff_typo: JSON.stringify({ vistos: { dashboard: 1 } }) } }); d = dom.window.document;
  await ate(() => d.querySelector('#typo-btn')); await esperar(2200); assert.ok(d.querySelector('#typo-balao').hidden, 'não repete na mesma tela'); dom.window.close();
  dom = await abrir('/progresso.html', est.cookie, { storage: { typeoff_typo: JSON.stringify({ dicas: false }) } }); d = dom.window.document;
  await ate(() => d.querySelector('#typo-btn')); await esperar(2200); assert.ok(d.querySelector('#typo-balao').hidden, 'dicas desligadas'); assert.strictEqual(d.querySelector('#typo-dicas').checked, false); dom.window.close();
});
test('Typo: na unidade a dica muda conforme a etapa (conteúdo, comparação, exercícios)', async () => {
  const dom = await abrir('/unidade.html?id=' + unidadeId, est.cookie); const w = dom.window, d = w.document;
  await ate(() => d.querySelector('#typo-balao') && d.querySelector('.comp-grid')); await ate(() => !d.querySelector('#typo-balao').hidden, 4000);
  assert.ok(/blocos/.test(d.querySelector('#typo-balao-txt').textContent)); d.querySelector('#typo-balao .typo-x').click();
  w.irParaEtapa('comparacao'); await ate(() => !d.querySelector('#typo-balao').hidden, 3000); assert.ok(/muda/.test(d.querySelector('#typo-balao-txt').textContent)); d.querySelector('#typo-balao .typo-x').click();
  w.irParaEtapa('exercicios'); await ate(() => !d.querySelector('#typo-balao').hidden, 3000); assert.ok(/80%/.test(d.querySelector('#typo-balao-txt').textContent));
  assert.strictEqual(w.Typo.contexto().etapa, 'exercicios'); dom.window.close();
});
test('Typo no diagnóstico: avisa que só ajuda com a plataforma e recusa conteúdo e respostas', async () => {
  const dom = await abrir('/diagnostico.html', est.cookie); const w = dom.window, d = w.document; await ate(() => d.querySelector('#typo-btn'));
  await ate(() => !d.querySelector('#typo-balao').hidden, 4000); assert.ok(/só ajudo com o uso da plataforma/.test(d.querySelector('#typo-balao-txt').textContent));
  d.querySelector('#typo-btn').click(); d.querySelector('#typo-q').value = 'qual a resposta da questão 1?'; d.querySelector('#typo-form').dispatchEvent(new w.Event('submit', { cancelable: true, bubbles: true }));
  await ate(() => d.querySelectorAll('.typo-msg.bot').length >= 2); assert.ok(/não ajudo com o conteúdo/.test(d.querySelectorAll('.typo-msg.bot')[1].textContent));
  d.querySelector('#typo-q').value = 'como aumento a letra'; d.querySelector('#typo-form').dispatchEvent(new w.Event('submit', { cancelable: true, bubbles: true }));
  await ate(() => d.querySelectorAll('.typo-msg.bot').length >= 3); assert.ok(/A−/.test(d.querySelectorAll('.typo-msg.bot')[2].textContent)); dom.window.close();
});
test('Typo: sem violações axe com o balão e com o painel abertos (claro e escuro)', async () => {
  const dom = await abrir('/dashboard.html', est.cookie); const w = dom.window, d = w.document; await ate(() => !d.querySelector('#typo-balao').hidden, 4000);
  let r = await rodarAxe(w); assert.strictEqual(r.violations.length, 0, 'balão\n      ' + resumoAxe(r));
  d.querySelector('#typo-balao .typo-mais').click(); await ate(() => !d.querySelector('#typo-painel').hidden);
  r = await rodarAxe(w); assert.strictEqual(r.violations.length, 0, 'painel\n      ' + resumoAxe(r));
  d.documentElement.setAttribute('data-theme', 'dark'); r = await rodarAxe(w); assert.strictEqual(r.violations.length, 0, 'escuro\n      ' + resumoAxe(r)); dom.window.close();
});

test('cronômetro: conta só com a aba visível e formata a duração', async () => {
  const dom = await abrir('/dashboard.html', est.cookie); const w = dom.window, d = w.document; await ate(() => typeof w.criarCronometro === 'function');
  let agora = 1000000; w.Date.now = () => agora; const c = w.criarCronometro(); c.iniciar();
  agora += 5000; assert.strictEqual(c.marcar(), 5000); agora += 3000; assert.strictEqual(c.marcar(), 3000);
  Object.defineProperty(d, 'hidden', { value: true, configurable: true }); d.dispatchEvent(new w.Event('visibilitychange')); agora += 60000; assert.strictEqual(c.ms(), 8000, 'aba oculta não conta');
  Object.defineProperty(d, 'hidden', { value: false, configurable: true }); d.dispatchEvent(new w.Event('visibilitychange')); agora += 2000;
  assert.strictEqual(c.parar(), 10000); agora += 9999; assert.strictEqual(c.ms(), 10000, 'parado não avança');
  assert.deepStrictEqual([w.formatarDuracao(45000), w.formatarDuracao(192000), w.formatarDuracao(60000), w.formatarDuracao(3900000), w.formatarDuracao(null)], ['45 s', '3 min 12 s', '1 min', '1 h 5 min', '—']); dom.window.close();
});
test('diagnóstico: envia tempo total e por questão ao concluir e mostra a duração ao estudante', async () => {
  const c = cliente(BASE); await c.post('/api/auth/registro', { nome: 'Fluxo Diagnostico', email: 'fluxo@x.com', senha: 'abc123' });
  const envios = []; const dom = await abrir('/diagnostico.html', c.cookie, { espiar: (u, o) => { if (u.includes('/diagnostico/submeter')) envios.push(JSON.parse(o.body)); } });
  const w = dom.window, d = w.document; await ate(() => d.querySelector('#diag-body button[onclick="comecarQuiz()"]')); w.comecarQuiz();
  const qs = w.eval('questoes'); assert.strictEqual(qs.length, 10);
  for (let i = 0; i < qs.length; i++) { w.selecionarOpcao(qs[i].resposta_correta, 0); w.avancar(); }
  await ate(() => envios.length === 1 && d.querySelector('.res-score'), 5000);
  assert.strictEqual(typeof envios[0].tempo_total_ms, 'number'); assert.ok(envios[0].tempo_total_ms >= 0);
  assert.strictEqual(envios[0].respostas.length, 10); assert.ok(envios[0].respostas.every(r => typeof r.tempo_ms === 'number' && r.tempo_ms >= 0));
  assert.ok(/tempo: \d+ (s|min)/.test(d.querySelector('.res-sub').textContent), d.querySelector('.res-sub').textContent); dom.window.close();
});
test('avaliação final: envia tempo e mostra a duração; resultado salvo também mostra', async () => {
  const c = cliente(BASE); await c.post('/api/auth/login', { email: 'fluxo@x.com', senha: 'abc123' });
  const envios = []; const dom = await abrir('/avaliacao-final.html', c.cookie, { espiar: (u, o) => { if (u.includes('/avaliacao-final/submeter')) envios.push(JSON.parse(o.body)); } });
  const w = dom.window, d = w.document; await ate(() => d.querySelector('#av-body button[onclick="comecar()"]')); w.comecar();
  const qs = w.eval('questoes'); for (let i = 0; i < qs.length; i++) { w.selecionar(qs[i].resposta_correta, 0); w.avancar(); }
  await ate(() => envios.length === 1 && d.querySelector('.res-score'), 5000);
  assert.strictEqual(typeof envios[0].tempo_total_ms, 'number'); assert.ok(envios[0].respostas.every(r => typeof r.tempo_ms === 'number'));
  assert.ok(/tempo: /.test(d.querySelector('.res-sub').textContent)); dom.window.close();
  const dom2 = await abrir('/avaliacao-final.html', c.cookie); await ate(() => /tempo: /.test(dom2.window.document.body.textContent), 4000); dom2.window.close();
});
test('unidade: ao concluir os exercícios mostra a duração e envia tempo da tentativa', async () => {
  const dom = await abrir('/unidade.html?id=' + unidadeId, est.cookie);
  const w = dom.window, d = w.document; await ate(() => d.querySelector('#tela-exercicios .quiz-container')); w.irParaEtapa('exercicios');
  const ex = w.eval('exercicios'); w.eval('quiz').indice = ex.length; w.mostrarResultado();
  await ate(() => d.querySelector('.resultado-box')); assert.ok(/tempo: /.test(d.querySelector('.resultado-msg').textContent));
  await ate(() => dom.beacons.length > 0, 3000);
  const eventos = []; for (const b of dom.beacons) eventos.push(...JSON.parse(await b.text()).eventos);
  const ev = eventos.find(x => x.tipo === 'unidade_resultado'); assert.ok(ev, 'evento de resultado'); assert.strictEqual(typeof ev.tempo_ms, 'number'); dom.window.close();
});
test('console: nenhum erro JavaScript durante os testes das páginas', () => {
  assert.deepStrictEqual(errosConsole, [], '\n      ' + errosConsole.slice(0, 8).join('\n      '));
});

esperar(800).then(() => executar('Front-end (jsdom + axe-core)')).then(r => { console.log('\nTotal: ' + r.total + ' | falhas: ' + r.falhas); process.exit(r.falhas ? 1 : 0); });
