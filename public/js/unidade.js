let usuario     = null;
let unidadeId   = null;
let unidadeObj  = null;
let conteudos   = [];
let comparacoes = [];
let exercicios  = [];
let quiz = { indice:0, acertos:0, respondidos:new Set(), inicio:0, primeira:true };
const cronQuiz = criarCronometro();
let etapaAtual  = 'conteudo';
let editCtx     = {};
const extras = window.COMPLEMENTO || { OBJETIVOS:{}, ETAPAS:{}, REFERENCIAS:{}, DIAGRAMAS:{}, COMPARACAO:{} };
const TIPOS_AUXILIARES = ['comparacao','objetivos','referencias'];

function movimentoReduzido() {
  return document.documentElement.getAttribute('data-movimento') === 'reduzido' ||
    (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}
function jsonSeguro(txt, padrao) { try { return JSON.parse(txt); } catch (e) { return padrao; } }

async function iniciar() {
  usuario = await verificarLogin();
  if (!usuario) return;

  const params = new URLSearchParams(window.location.search);
  unidadeId = params.get('id');
  if (!unidadeId) { window.location.href = '/dashboard.html'; return; }

  const [unidsRes, unidRes] = await Promise.all([
    fetch('/api/unidades').then(r=>r.json()),
    fetch(`/api/unidades/${unidadeId}`).then(r=>r.json())
  ]);

  if (!unidRes.sucesso) { window.location.href='/dashboard.html'; return; }
  unidadeObj = unidRes.unidade;

  if (unidadeObj.status === 'bloqueada' && usuario.tipo !== 'professor') {
    mostrarToast('Unidade bloqueada.','erro');
    setTimeout(()=>window.location.href='/dashboard.html',1500);
    return;
  }

  document.title = `Typeoff: ${unidadeObj.titulo}`;
  document.getElementById('topbar-titulo').textContent = `Unidade ${unidadeObj.ordem}`;
  document.getElementById('breadcrumb-u').textContent  = unidadeObj.titulo;

  renderizarSidebar(usuario, unidsRes.unidades||[], 'unidade:' + unidadeId);

  conteudos = unidRes.conteudos || [];
  renderizarMetas();
  renderizarObjetivos();
  renderizarConteudo();
  renderizarVisual();
  renderizarReferencias();

  comparacoes = conteudos.filter(c => c.tipo === 'comparacao');
  renderizarComparacao();

  const exRes = await fetch(`/api/exercicios/${unidadeId}?categoria=formativa`).then(r=>r.json());
  exercicios = (exRes.exercicios || []).filter(e => e.categoria !== 'somativa');
  renderizarQuizInicio();

  if (usuario.tipo === 'professor') {
    const fab = document.createElement('button');
    fab.type = 'button';
    fab.className = 'btn-editar-flutuante';
    fab.textContent = '✎ Editar esta unidade';
    fab.onclick = abrirPainelEdicao;
    document.body.appendChild(fab);
  }

  if (usuario.tipo === 'estudante') {
    Telemetria.registrar({ tipo:'unidade_aberta', unidade_id: parseInt(unidadeId,10) });
    Telemetria.iniciarAba(unidadeId, 'conteudo');
  }
}

function irParaEtapa(etapa) {
  etapaAtual = etapa;
  document.querySelectorAll('.tela').forEach(t=>t.classList.remove('ativa'));
  document.getElementById(`tela-${etapa}`).classList.add('ativa');

  const ordens = ['conteudo','comparacao','exercicios'];
  const atual  = ordens.indexOf(etapa);
  ordens.forEach((e,i) => {
    const el  = document.getElementById(`etapa-${e}`);
    const dot = document.getElementById(`dot-${e}`);
    el.className  = 'etapa-item';
    el.removeAttribute('aria-current');
    dot.textContent = i < atual ? '✓' : i+1;
    if (i < atual)  el.classList.add('concluida');
    if (i === atual) { el.classList.add('ativa'); el.setAttribute('aria-current','step'); }
  });

  window.scrollTo({ top: 0, behavior: movimentoReduzido() ? 'auto' : 'smooth' });
  const h = document.getElementById('h-' + etapa);
  if (h) { try { h.focus({ preventScroll: true }); } catch (e) { h.focus(); } }

  if (usuario && usuario.tipo === 'estudante') Telemetria.iniciarAba(unidadeId, etapa);
  window.dispatchEvent(new CustomEvent('typeoff:etapa', { detail: { etapa: etapa } }));
}

function renderizarMetas() {
  ['conteudo','comparacao','exercicios'].forEach(e => {
    const el = document.getElementById('meta-' + e);
    if (el && extras.ETAPAS[e]) el.textContent = extras.ETAPAS[e];
  });
}

function renderizarObjetivos() {
  const wrap = document.getElementById('objetivos-wrap');
  let obj = null;
  const doBanco = conteudos.find(c => c.tipo === 'objetivos');
  if (doBanco) obj = jsonSeguro(doBanco.corpo, null);
  if (!obj) obj = extras.OBJETIVOS[unidadeObj.ordem];
  if (!obj || !obj.objetivos) return;
  wrap.innerHTML = `
    <section class="objetivos-card" aria-labelledby="h-objetivos">
      <h3 id="h-objetivos">Objetivos de aprendizagem desta unidade</h3>
      <p class="etapa-meta" style="margin-bottom:.4rem">Ao concluir a unidade, você será capaz de:</p>
      <ul>${obj.objetivos.map(o => `<li>${o}</li>`).join('')}</ul>
      ${obj.revisao ? `<details class="dica"><summary>Revisão rápida</summary><div class="dica-corpo revisao-previa">${obj.revisao}</div></details>` : ''}
    </section>`;
}

function renderizarVisual() {
  const wrap = document.getElementById('visual-wrap');
  const d = extras.DIAGRAMAS[unidadeObj.ordem];
  if (!d) return;
  wrap.innerHTML = `
    <details class="sanfona">
      <summary><span class="sf-seta" aria-hidden="true">▶</span><h3 class="sf-titulo" id="h-visual">Diagrama da unidade</h3></summary>
      <div class="sf-corpo">
        <figure class="diagrama">
          ${d.svg}
          <figcaption>${d.legenda}</figcaption>
          <details><summary>Descrição do diagrama em texto</summary><p>${d.descricao}</p></details>
        </figure>
      </div>
    </details>`;
}

function renderizarReferencias() {
  const wrap = document.getElementById('referencias-wrap');
  let lista = null;
  const doBanco = conteudos.find(c => c.tipo === 'referencias');
  if (doBanco) {
    const j = jsonSeguro(doBanco.corpo, null);
    lista = Array.isArray(j) ? j : [doBanco.corpo];
  }
  if (!lista) lista = extras.REFERENCIAS[unidadeObj.ordem];
  if (!lista || !lista.length) return;
  wrap.innerHTML = `
    <details class="dica" id="h-refs">
      <summary>Referências e leituras sugeridas</summary>
      <div class="dica-corpo referencias-card" style="border:none;padding:0;margin:0"><ul>${lista.map(r => `<li>${r}</li>`).join('')}</ul></div>
    </details>`;
}

function renderizarConteudo() {
  const el = document.getElementById('conteudo-lista');
  const textos = conteudos.filter(c => !TIPOS_AUXILIARES.includes(c.tipo));
  if (!textos.length) return;

  const botaoEditar = c => usuario.tipo==='professor'
    ? `<button type="button" class="btn btn-secondary btn-sm" style="float:right;margin-left:1rem" onclick="abrirEdicaoConteudo(${c.id})">✎ Editar</button>` : '';

  const blocos = textos.map((c, i) => {
    const corpo = c.tipo === 'codigo' ? Codigo.html(c.corpo, '') : c.corpo;
    return `
      <details class="sanfona"${i === 0 ? ' open' : ''}>
        <summary>
          <span class="sf-seta" aria-hidden="true">▶</span>
          <h3 class="sf-titulo">${escHtml(c.titulo)}</h3>
          <span class="sf-meta">Bloco ${i+1} de ${textos.length}</span>
        </summary>
        <div class="sf-corpo">${botaoEditar(c)}<div>${corpo}</div></div>
      </details>`;
  }).join('');

  el.innerHTML = textos.length > 1 ? `
    <div class="sf-acoes btn-grupo-sf">
      <button type="button" class="btn btn-secondary btn-sm" id="btn-alternar-blocos" aria-pressed="false" onclick="alternarTodosBlocos()">Expandir tudo</button>
    </div>${blocos}` : blocos;
}

function alternarSanfonas(abrir) {
  document.querySelectorAll('#conteudo-lista details.sanfona').forEach(d => { d.open = abrir; });
  const b = document.getElementById('btn-alternar-blocos');
  if (b) { b.textContent = abrir ? 'Recolher tudo' : 'Expandir tudo'; b.setAttribute('aria-pressed', abrir ? 'true' : 'false'); }
}
function alternarTodosBlocos() {
  const b = document.getElementById('btn-alternar-blocos');
  alternarSanfonas(!(b && b.getAttribute('aria-pressed') === 'true'));
}

function renderizarComparacao() {
  const el = document.getElementById('comparacao-lista');
  if (!comparacoes.length) return;
  const usadas = {};
  const comp2 = extras.COMPARACAO[unidadeObj.ordem] || {};

  const cartoes = comparacoes.map((c, idx) => {
    let html = `<section class="conteudo-card" aria-labelledby="h-comp-${c.id}">
      ${usuario.tipo==='professor' ? `<button type="button" class="btn btn-secondary btn-sm" style="float:right;margin-left:1rem" onclick="abrirEdicaoConteudo(${c.id})">✎ Editar</button>` : ''}
      <h3 id="h-comp-${c.id}">${escHtml(c.titulo)}</h3>`;
    const langs = jsonSeguro(c.corpo, null);
    if (!langs) { html += `<p>${c.corpo}</p></section>`; return html; }

    const extra = idx === 0 ? comp2 : {};
    const intro     = langs.intro     || extra.intro;
    const muda      = langs.muda      || extra.muda;
    const permanece = langs.permanece || extra.permanece;
    const foco      = langs.foco      || extra.foco || {};

    html += `<div class="comp-intro">
      ${intro ? `<p>${intro}</p>` : '<p>Compare os três códigos: os trechos realçados mostram o que muda de uma linguagem para outra; o restante é a lógica, que permanece.</p>'}
      ${(langs.observacoes && !(foco && Object.keys(foco).length)) ? `<div class="comp-observacoes-topo"><h4 style="font-size:.78rem;text-transform:uppercase;letter-spacing:.08em;margin:.5rem 0 .25rem">O que observar</h4><div>${langs.observacoes}</div></div>` : ''}
    </div>`;

    if (muda || permanece) {
      html += `<details class="dica"><summary>O que muda e o que permanece</summary><div class="dica-corpo comp-mudapermanece">
        ${muda ? `<div class="cmp-caixa cmp-muda"><h4>O que muda (sintaxe)</h4><ul>${muda.map(m=>`<li>${m}</li>`).join('')}</ul></div>` : ''}
        ${permanece ? `<div class="cmp-caixa cmp-permanece"><h4>O que permanece (lógica)</h4><ul>${permanece.map(m=>`<li>${m}</li>`).join('')}</ul></div>` : ''}
      </div></details>`;
    }

    const ordemLangs = [['python','Python'],['java','Java'],['c','C']].filter(([k]) => langs[k]);
    const cards = ordemLangs.map(([k, nome]) => {
      const u = {};
      const bloco = Codigo.html(langs[k], k, { usadas: u });
      Object.keys(u).forEach(x => usadas[x] = true);
      const obs = (foco[k] && foco[k].length)
        ? `<div class="lang-obs"><strong class="obs-titulo">O que observar em ${nome}</strong><ul>${foco[k].map(f=>`<li>${f}</li>`).join('')}</ul></div>` : '';
      return `<div class="lang-card"><div class="lang-header lang-${k}">${nome}</div>${bloco}${obs}</div>`;
    }).join('');
    html += `<div class="comp-grid${ordemLangs.length === 3 ? ' tres-colunas' : ''}">${cards}</div></section>`;
    return html;
  }).join('');

  const legenda = Object.keys(Codigo.categorias).filter(k => usadas[k]).map(k =>
    `<span class="chip"><span class="codigo" style="background:transparent"><span class="dif dif-${k}">abc</span></span> ${Codigo.categorias[k]}</span>`).join('');

  const ferramentas = `
    <div class="comp-ferramentas" role="group" aria-label="Opções de exibição do código">
      <label><input type="checkbox" id="opt-destaque" checked onchange="alternarOpcoesCodigo()"> Destacar diferenças de sintaxe</label>
      <label><input type="checkbox" id="opt-numeros" checked onchange="alternarOpcoesCodigo()"> Mostrar números de linha</label>
    </div>
    <div class="comp-legenda" id="comp-legenda" aria-label="Legenda dos destaques">${legenda}</div>`;
  el.innerHTML = ferramentas + cartoes;
}

function alternarOpcoesCodigo() {
  const dest = document.getElementById('opt-destaque').checked;
  const nums = document.getElementById('opt-numeros').checked;
  document.querySelectorAll('#comparacao-lista .codigo').forEach(p => {
    p.classList.toggle('sem-destaque', !dest);
    p.classList.toggle('sem-numeros', !nums);
  });
  const leg = document.getElementById('comp-legenda'); if (leg) leg.style.display = dest ? '' : 'none';
}

function renderizarQuizInicio() {
  if (!exercicios.length) return;
  quiz = { indice:0, acertos:0, respondidos:new Set(), inicio:Date.now(), primeira:true };
  cronQuiz.iniciar();
  renderizarQuestao();
}

function dadosEnunciado(ex) { return jsonSeguro(ex.enunciado, { tipo:'texto', texto: ex.enunciado }); }

function renderizarQuestao() {
  const el = document.getElementById('exercicios-wrap');
  if (quiz.indice >= exercicios.length) { mostrarResultado(); return; }

  const ex = exercicios[quiz.indice];
  const total = exercicios.length;
  const pct = Math.round((quiz.indice / total) * 100);
  const d = dadosEnunciado(ex);
  let enunciadoHTML = '';
  let areaResposta = '';
  let rotuloTipo = '';

  if (ex.tipo === 'completar_codigo') {
    rotuloTipo = '<span class="pratica-tag">✎ Prática: complete o código</span>';
    enunciadoHTML = renderizarCompletar(d);
    areaResposta = `<button type="button" class="btn btn-primary mt-2" id="btn-verificar" onclick="verificarCompletar()">Verificar resposta</button>`;
  } else if (ex.tipo === 'ordenar_linhas') {
    rotuloTipo = '<span class="pratica-tag">⇅ Prática: ordene as linhas</span>';
    enunciadoHTML = renderizarOrdenar(d);
    areaResposta = `<button type="button" class="btn btn-primary mt-2" id="btn-verificar" onclick="verificarOrdem()">Verificar ordem</button>`;
  } else {
    enunciadoHTML = renderizarEnunciado(ex.enunciado);
    if (ex.tipo === 'multipla_escolha' && ex.opcoes) {
      areaResposta = `<div class="quiz-opcoes" role="group" aria-labelledby="q-enunciado">` + ex.opcoes.map((op,i) => `
        <button type="button" class="quiz-opcao" id="op-${i}" data-valor="${escHtml(op)}">
          <span class="opcao-letra" aria-hidden="true">${String.fromCharCode(65+i)}.</span>
          <span class="opcao-texto"><span class="sr-only">Alternativa ${String.fromCharCode(65+i)}: </span>${escHtml(op)}</span>
        </button>`).join('') + `</div>`;
    } else if (ex.tipo === 'verdadeiro_falso') {
      areaResposta = `<div class="quiz-opcoes" role="group" aria-labelledby="q-enunciado">
        <button type="button" class="quiz-opcao" id="op-0" data-valor="verdadeiro"><span class="opcao-letra" aria-hidden="true">V.</span><span class="opcao-texto">Verdadeiro</span></button>
        <button type="button" class="quiz-opcao" id="op-1" data-valor="falso"><span class="opcao-letra" aria-hidden="true">F.</span><span class="opcao-texto">Falso</span></button></div>`;
    }
  }

  el.innerHTML = `
    <div class="quiz-container">
      <div class="quiz-header">
        <div class="quiz-prog-label">
          <span id="q-titulo" tabindex="-1">Questão ${quiz.indice+1} de ${total}</span>
          <span aria-live="polite">${quiz.acertos} acerto(s)</span>
        </div>
        <div class="progress-bar-wrap" role="progressbar" aria-label="Progresso nos exercícios" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}">
          <div class="progress-bar-fill" style="width:${pct}%"></div>
        </div>
      </div>
      ${rotuloTipo}
      <div class="quiz-question" id="q-enunciado">${enunciadoHTML}</div>
      ${areaResposta}
      <div id="feedback-area" role="status" aria-live="polite" tabindex="-1"></div>
      <div id="btn-proxima" class="hidden">
        <button type="button" class="btn btn-primary mt-2" onclick="proximaQuestao()">
          ${quiz.indice+1 < total ? 'Próxima questão →' : 'Ver resultado →'}
        </button>
      </div>
    </div>`;

  el.querySelectorAll('.quiz-opcao').forEach(b => b.addEventListener('click', () => responder(b.dataset.valor)));
  if (ex.tipo === 'ordenar_linhas') desenharOrdenar();
  quiz.inicio = Date.now();
  if (!quiz.primeira) { const t = document.getElementById('q-titulo'); if (t) t.focus(); }
  quiz.primeira = false;
}

function renderizarEnunciado(raw) {
  let d = { tipo:'texto', texto: raw };
  try { d = JSON.parse(raw); } catch(e) {}
  const textoHTML = d.texto ? `<div style="white-space:pre-wrap;margin-bottom:${d.tipo!=='texto'?'.75rem':'0'}">${d.texto}</div>` : '';
  if (d.tipo === 'codigo' && d.codigo) {
    const cores = { python:'#1F4E73',java:'#7A2F20',c:'#1F5030',generico:'#1B2A6B' };
    const cor  = cores[d.linguagem] || cores.generico;
    const lang = d.linguagem ? d.linguagem.charAt(0).toUpperCase()+d.linguagem.slice(1) : 'Código';
    return `${textoHTML}<div class="codigo-bloco" style="border-radius:6px;overflow:hidden;border:1px solid var(--cinza-claro)">
      <div style="background:${cor};color:#FFE9B8;padding:.35rem .875rem;font-family:var(--fonte-codigo);font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em">${escHtml(lang)}</div>
      ${Codigo.html(d.codigo, d.linguagem, { destaque:false })}</div>`;
  }
  if (d.tipo === 'imagem' && d.imagem) {
    return `${textoHTML}<img src="${escHtml(d.imagem)}" alt="${escHtml(d.alt || 'Imagem da questão')}" style="max-width:100%;max-height:280px;border-radius:6px;border:1px solid var(--cinza-claro);display:block;margin-top:.5rem" onerror="this.style.display='none'">`;
  }
  return textoHTML || raw;
}

function renderizarCompletar(d) {
  const lacunas = d.lacunas || [];
  let blocoHtml = Codigo.html(d.codigo || '', d.linguagem, { destaque:false, rotulo:'Código com lacunas para completar' });
  blocoHtml = blocoHtml.replace(/___(\d+)___/g, function (_, n) {
    const i = parseInt(n,10) - 1;
    const ops = (lacunas[i] || []);
    return `<select class="lacuna-select" data-i="${i}" aria-label="Lacuna ${n}"><option value="">escolha…</option>${ops.map(o=>`<option value="${escHtml(o)}">${escHtml(o)}</option>`).join('')}</select>`;
  });
  const lang = d.linguagem ? d.linguagem.charAt(0).toUpperCase()+d.linguagem.slice(1) : 'Código';
  return `<div style="white-space:pre-wrap;margin-bottom:.75rem">${d.texto || ''}</div>
    <div class="codigo-bloco" style="border-radius:6px;overflow:hidden;border:1px solid var(--cinza-claro)">
      <div style="background:var(--codigo-fundo);color:#FFE9B8;padding:.35rem .875rem;font-family:var(--fonte-codigo);font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em">${escHtml(lang)}</div>${blocoHtml}</div>`;
}

function verificarCompletar() {
  const sels = Array.from(document.querySelectorAll('.lacuna-select'));
  if (sels.some(s => !s.value)) { mostrarToast('Escolha uma opção em todas as lacunas antes de verificar.','erro'); return; }
  const respostas = sels.sort((a,b) => a.dataset.i - b.dataset.i).map(s => s.value);
  sels.forEach(s => s.disabled = true);
  enviarResposta(JSON.stringify(respostas), function (data, acertou) {
    const certas = jsonSeguro(data.resposta_correta, []);
    sels.forEach(s => {
      const i = parseInt(s.dataset.i,10);
      const ok = (certas[i] || '').toLowerCase() === s.value.toLowerCase();
      s.style.borderColor = ok ? 'var(--sucesso)' : 'var(--erro)';
      s.setAttribute('aria-label', `Lacuna ${i+1}: ${ok ? 'correta' : 'incorreta'}`);
    });
    return acertou ? '' : `<br>Resposta correta: <strong>${certas.map(escHtml).join(' · ')}</strong>`;
  });
}

function renderizarOrdenar(d) {
  quiz.ordem = (d.linhas || []).slice();
  quiz.linguagemOrdem = d.linguagem;
  return `<div style="white-space:pre-wrap;margin-bottom:.75rem">${d.texto || ''}</div>
    <p class="etapa-meta" style="margin-bottom:.5rem">Use os botões ▲ e ▼ para colocar as linhas na ordem correta de execução.</p>
    <ol class="ordenar-lista" id="ordenar-lista" aria-label="Linhas do programa"></ol>
    <div class="sr-only" id="ordenar-aviso" role="status" aria-live="polite"></div>`;
}

function desenharOrdenar(aviso) {
  const ol = document.getElementById('ordenar-lista'); if (!ol) return;
  const n = quiz.ordem.length;
  ol.innerHTML = quiz.ordem.map((linha, i) => `
    <li class="ordenar-item">
      <span class="ordenar-pos" aria-hidden="true">${i+1}</span>
      <code>${escHtml(linha)}</code>
      <span class="ordenar-btns">
        <button type="button" data-i="${i}" data-dir="-1" aria-label="Mover a linha ${i+1} para cima"${i===0?' disabled':''}>▲</button>
        <button type="button" data-i="${i}" data-dir="1" aria-label="Mover a linha ${i+1} para baixo"${i===n-1?' disabled':''}>▼</button>
      </span>
    </li>`).join('');
  ol.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    const i = parseInt(b.dataset.i,10), dir = parseInt(b.dataset.dir,10), j = i + dir;
    if (j < 0 || j >= quiz.ordem.length) return;
    const t = quiz.ordem[i]; quiz.ordem[i] = quiz.ordem[j]; quiz.ordem[j] = t;
    desenharOrdenar(`Linha movida para a posição ${j+1}.`);
    const alvo = document.querySelector(`#ordenar-lista button[data-i="${j}"][data-dir="${dir}"]`) || document.querySelector(`#ordenar-lista button[data-i="${j}"]:not([disabled])`);
    if (alvo) alvo.focus();
  }));
  const av = document.getElementById('ordenar-aviso'); if (av && aviso) av.textContent = aviso;
}

function verificarOrdem() {
  document.querySelectorAll('#ordenar-lista button').forEach(b => b.disabled = true);
  enviarResposta(JSON.stringify(quiz.ordem), function (data, acertou) {
    const certa = jsonSeguro(data.resposta_correta, []);
    document.querySelectorAll('#ordenar-lista .ordenar-item').forEach((li, i) => {
      const ok = certa[i] === quiz.ordem[i];
      li.classList.add(ok ? 'certo' : 'errado');
      const pos = li.querySelector('.ordenar-pos'); if (pos) pos.textContent = ok ? '✓' : '✗';
    });
    return acertou ? '' : `<br>Ordem correta: <ol style="margin:.4rem 0 0 1.25rem">${certa.map(l=>`<li><code>${escHtml(l)}</code></li>`).join('')}</ol>`;
  });
}

async function enviarResposta(resposta, complemento) {
  if (quiz.respondidos.has(quiz.indice)) return;
  quiz.respondidos.add(quiz.indice);
  const ex = exercicios[quiz.indice];
  const btn = document.getElementById('btn-verificar'); if (btn) btn.disabled = true;
  document.querySelectorAll('.quiz-opcao').forEach(b=>b.disabled=true);

  let data;
  try {
    const res = await fetch('/api/exercicios/responder',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ exercicio_id: ex.id, resposta_dada: resposta, tempo_ms: Date.now() - quiz.inicio })
    });
    data = await res.json();
    if (!data || data.sucesso === false) throw new Error((data && data.erro) || 'Falha ao registrar a resposta.');
  } catch (e) {
    quiz.respondidos.delete(quiz.indice);
    document.querySelectorAll('.quiz-opcao').forEach(b=>b.disabled=false);
    if (btn) btn.disabled = false;
    mostrarToast('Não foi possível registrar a resposta. Tente novamente.','erro');
    return;
  }
  if (data.correta) quiz.acertos++;

  const extra = complemento ? complemento(data, data.correta) : '';
  const fb = document.getElementById('feedback-area');
  fb.innerHTML = `<div class="feedback-box ${data.correta?'feedback-correto':'feedback-errado'}">
    <strong>${data.correta ? '✓ Correto!' : '✗ Incorreto.'}</strong>
    ${data.explicacao ? `<br>${data.explicacao}` : ''}
    ${extra}
  </div>`;
  document.getElementById('btn-proxima').classList.remove('hidden');
  fb.focus();
  return data;
}

async function responder(resposta) {
  if (quiz.respondidos.has(quiz.indice)) return;
  const data = await enviarResposta(resposta, function (d, acertou) {
    document.querySelectorAll('.quiz-opcao').forEach(btn => {
      const v = (btn.dataset.valor || '').trim().toLowerCase();
      if (v === String(d.resposta_correta).trim().toLowerCase()) btn.classList.add('correta');
      else if (!acertou && v === String(resposta).trim().toLowerCase()) btn.classList.add('errada');
    });
    return acertou ? '' : `<br>Resposta correta: <strong>${escHtml(d.resposta_correta)}</strong>`;
  });
  return data;
}

function proximaQuestao() {
  quiz.indice++;
  renderizarQuestao();
}

async function mostrarResultado() {
  const total = exercicios.length;
  const pct   = Math.round((quiz.acertos / total) * 100);
  const aprovado = pct >= 80;
  const tempoTentativa = Math.round(cronQuiz.parar());
  const el = document.getElementById('exercicios-wrap');

  let data = {};
  try {
    const res = await fetch(`/api/progresso/concluir/${unidadeId}`,{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ percentual: pct })
    });
    data = await res.json();
  } catch (e) { mostrarToast('Não foi possível salvar o progresso agora.','erro'); }

  if (usuario.tipo === 'estudante') {
    Telemetria.registrar({ tipo:'unidade_resultado', unidade_id: parseInt(unidadeId,10), percentual: pct, acertos: quiz.acertos, total: total, tempo_ms: tempoTentativa });
    Telemetria.enviar();
  }

  el.innerHTML = `
    <div class="resultado-box">
      <div class="resultado-score ${aprovado?'aprovado':'reprovado'}">${pct}%</div>
      <div class="resultado-msg" style="color:var(--cinza-medio)">
        ${quiz.acertos} de ${total} questões corretas · tempo: ${formatarDuracao(tempoTentativa)}
      </div>
      <p id="resultado-msg-final" tabindex="-1" style="font-family:var(--fonte-codigo);font-size:.95rem;font-weight:700;color:${aprovado?'var(--sucesso-texto)':'var(--erro-texto)'}">
        ${aprovado ? 'Parabéns! Você atingiu a meta de 80%.' : 'Meta não atingida. São necessários pelo menos 80% para avançar.'}
      </p>
      <div class="resultado-acoes">
        ${aprovado ? `
          ${data.certificado_gerado ? `<button type="button" class="btn btn-gold btn-lg" onclick="window.location.href='/certificado.html'">✦ Ver meu certificado</button>` : ''}
          <button type="button" class="btn btn-primary btn-lg" onclick="window.location.href='/dashboard.html'">Ir para a próxima unidade →</button>
        ` : `
          <button type="button" class="btn btn-secondary btn-lg" onclick="irParaEtapa('conteudo')">Revisar o conteúdo desta unidade</button>
          <button type="button" class="btn btn-primary" onclick="reiniciarExercicios()">Tentar novamente</button>
        `}
      </div>
    </div>`;
  const m = document.getElementById('resultado-msg-final'); if (m) m.focus();
}

function reiniciarExercicios() {
  quiz = { indice:0, acertos:0, respondidos:new Set(), inicio:Date.now(), primeira:false };
  cronQuiz.iniciar();
  renderizarQuestao();
}

function abrirPainelEdicao() {
  window.location.href = `/gerenciar.html?unidade=${unidadeId}`;
}

function abrirEdicaoConteudo(id) {
  const c = conteudos.find(x=>x.id===id);
  if (!c) return;
  editCtx = { tipo:'conteudo', id };
  document.getElementById('edit-modal-titulo').textContent = `Editar: ${c.titulo}`;
  document.getElementById('edit-form-area').innerHTML = `
    <div class="form-group"><label for="ef-titulo">Título</label>
      <input type="text" id="ef-titulo" value="${escHtml(c.titulo)}"></div>
    <div class="form-group"><label for="ef-tipo">Tipo</label>
      <select id="ef-tipo">
        <option value="texto"     ${c.tipo==='texto'?'selected':''}>Texto</option>
        <option value="codigo"    ${c.tipo==='codigo'?'selected':''}>Código</option>
        <option value="comparacao"${c.tipo==='comparacao'?'selected':''}>Comparação JSON</option>
        <option value="objetivos" ${c.tipo==='objetivos'?'selected':''}>Objetivos (JSON)</option>
        <option value="referencias"${c.tipo==='referencias'?'selected':''}>Referências (JSON)</option>
      </select></div>
    <div class="form-group"><label for="ef-corpo">Conteúdo</label>
      <textarea id="ef-corpo" rows="10" style="font-family:var(--fonte-codigo);font-size:.83rem">${escHtml(c.corpo)}</textarea></div>
    <div class="form-group"><label for="ef-ordem">Ordem</label>
      <input type="number" id="ef-ordem" value="${c.ordem}" min="1"></div>`;
  document.getElementById('edit-overlay').classList.add('aberto');
  setTimeout(() => { const f = document.getElementById('ef-titulo'); if (f) f.focus(); }, 30);
}

async function salvarEdicao() {
  if (editCtx.tipo === 'conteudo') {
    const titulo = document.getElementById('ef-titulo').value.trim();
    const tipo   = document.getElementById('ef-tipo').value;
    const corpo  = document.getElementById('ef-corpo').value.trim();
    const ordem  = document.getElementById('ef-ordem').value;

    await fetch(`/api/admin/conteudo/${editCtx.id}`,{method:'DELETE'});
    await fetch('/api/admin/conteudo',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ unidade_id: unidadeId, titulo, tipo, corpo, ordem:parseInt(ordem) })
    });
    mostrarToast('Conteúdo atualizado!','sucesso');
    fecharEditor();
    location.reload();
  }
}

function fecharEditor() {
  document.getElementById('edit-overlay').classList.remove('aberto');
}
document.addEventListener('click', e=>{
  if(e.target===document.getElementById('edit-overlay')) fecharEditor();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && document.getElementById('edit-overlay').classList.contains('aberto')) fecharEditor();
});

iniciar();
