function escHtml(s) {
  return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escAttr(s) {
  return String(s == null ? '' : s).replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'&quot;');
}

async function verificarLogin(tipoEsperado) {
  const res  = await fetch('/api/auth/me');
  const data = await res.json();
  if (!data.sucesso) { window.location.href='/login.html'; return null; }
  if (tipoEsperado && data.usuario.tipo !== tipoEsperado) {
    window.location.href = data.usuario.tipo==='professor' ? '/professor.html' : '/dashboard.html';
    return null;
  }
  return data.usuario;
}

async function logout() {
  try { if (window.Telemetria) Telemetria.encerrarAba(); if (window.Telemetria) Telemetria.enviar(); } catch (e) {}
  await fetch('/api/auth/logout',{method:'POST'});
  window.location.href='/login.html';
}

function iniciarEstruturaPagina() {
  if (document.querySelector('.skip-link')) return;
  const main = document.querySelector('main') || document.querySelector('.page-body');
  if (!main) return;
  if (!main.id) main.id = 'conteudo-principal';
  if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex','-1');
  const a = document.createElement('a');
  a.className = 'skip-link';
  a.href = '#' + main.id;
  a.textContent = 'Pular para o conteúdo principal';
  a.addEventListener('click', function (ev) { ev.preventDefault(); main.focus(); main.scrollIntoView(); });
  document.body.insertBefore(a, document.body.firstChild);
}

function controleFonteHTML() {
  return `<div class="ctl-fonte" role="group" aria-label="Tamanho do texto">
      <button type="button" class="fonte-menos" aria-label="Diminuir tamanho do texto" title="Diminuir texto">A<span aria-hidden="true">−</span></button>
      <button type="button" class="fonte-padrao" aria-label="Voltar ao tamanho padrão do texto" title="Tamanho padrão">100%</button>
      <button type="button" class="fonte-mais" aria-label="Aumentar tamanho do texto" title="Aumentar texto">A<span aria-hidden="true">+</span></button>
    </div><span class="sr-only fonte-aviso" role="status" aria-live="polite"></span>`;
}
function atualizarControleFonte(raiz) {
  const F = window.TypeoffFonte; if (!F) return;
  const i = F.indice(), n = F.ESCALAS.length, pct = Math.round(F.ESCALAS[i] * 100);
  raiz.querySelectorAll('.fonte-menos').forEach(b => { b.disabled = i <= 0; });
  raiz.querySelectorAll('.fonte-mais').forEach(b => { b.disabled = i >= n - 1; });
  raiz.querySelectorAll('.fonte-padrao').forEach(b => { b.textContent = pct + '%'; });
  raiz.querySelectorAll('.fonte-aviso').forEach(b => { b.textContent = 'Tamanho do texto: ' + pct + '%'; });
}
function ligarControleFonte(raiz) {
  const F = window.TypeoffFonte; if (!F) return;
  const mudar = fn => () => { F.aplicar(fn(F.indice())); atualizarControleFonte(raiz); };
  raiz.querySelectorAll('.fonte-menos').forEach(b => b.addEventListener('click', mudar(i => i - 1)));
  raiz.querySelectorAll('.fonte-mais').forEach(b => b.addEventListener('click', mudar(i => i + 1)));
  raiz.querySelectorAll('.fonte-padrao').forEach(b => b.addEventListener('click', mudar(() => F.PADRAO)));
  atualizarControleFonte(raiz);
}

function montarControleFonteFlutuante() {
  if (document.getElementById('sidebar') || document.querySelector('.ctl-flutuante') || !window.TypeoffFonte) return;
  if (!document.querySelector('main')) return;

  const temaPermitido = !!document.querySelector('script[src="/js/tema.js"]:not([data-escala-apenas])');
  const d = document.createElement('div');
  d.className = 'ctl-flutuante'; d.setAttribute('role','region'); d.setAttribute('aria-label', temaPermitido ? 'Tamanho do texto e tema' : 'Tamanho do texto');
  d.innerHTML = controleFonteHTML() + (temaPermitido ? '<button type="button" class="btn-tema" id="btn-tema" aria-pressed="false">☾ Tema escuro</button>' : '');
  document.body.appendChild(d); ligarControleFonte(d);
  if (temaPermitido) {
    document.getElementById('btn-tema').addEventListener('click', function () { aplicarTema(temaAtual()==='escuro' ? 'claro' : 'escuro'); });
    atualizarBotaoTema();
  }
}

function temaAtual() { return document.documentElement.getAttribute('data-theme') === 'dark' ? 'escuro' : 'claro'; }
function aplicarTema(t) {
  if (t === 'escuro') document.documentElement.setAttribute('data-theme','dark');
  else document.documentElement.removeAttribute('data-theme');
  try { localStorage.setItem('typeoff_tema', t); } catch (e) {}
  atualizarBotaoTema();
}
function atualizarBotaoTema() {
  const b = document.getElementById('btn-tema'); if (!b) return;
  const escuro = temaAtual() === 'escuro';
  b.setAttribute('aria-pressed', escuro ? 'true' : 'false');
  b.textContent = escuro ? '☀ Tema claro' : '☾ Tema escuro';
}

function abrirMenuMovel() {
  const sb = document.getElementById('sidebar'); if (!sb) return;
  sb.classList.add('aberta'); document.body.classList.add('menu-aberto');
  const bd = document.getElementById('sidebar-backdrop'); if (bd) bd.classList.add('aberta');
  const t = document.getElementById('menu-toggle'); if (t) t.setAttribute('aria-expanded','true');
  const primeiro = sb.querySelector('a, button'); if (primeiro) primeiro.focus();
}
function fecharMenuMovel(devolverFoco) {
  const sb = document.getElementById('sidebar'); if (!sb) return;
  sb.classList.remove('aberta'); document.body.classList.remove('menu-aberto');
  const bd = document.getElementById('sidebar-backdrop'); if (bd) bd.classList.remove('aberta');
  const t = document.getElementById('menu-toggle');
  if (t) { t.setAttribute('aria-expanded','false'); if (devolverFoco) t.focus(); }
}

function prepararTopbar() {
  const topbar = document.querySelector('.topbar');
  if (!topbar || document.getElementById('menu-toggle')) return;
  const primeiro = topbar.firstElementChild;
  const wrap = document.createElement('div');
  wrap.className = 'topbar-esq';
  const btn = document.createElement('button');
  btn.type = 'button'; btn.id = 'menu-toggle'; btn.className = 'menu-toggle';
  btn.setAttribute('aria-label','Abrir menu de navegação');
  btn.setAttribute('aria-controls','sidebar');
  btn.setAttribute('aria-expanded','false');
  btn.innerHTML = '<span aria-hidden="true">☰</span>';
  btn.addEventListener('click', function () {
    document.getElementById('sidebar').classList.contains('aberta') ? fecharMenuMovel(true) : abrirMenuMovel();
  });
  topbar.insertBefore(wrap, primeiro);
  wrap.appendChild(btn);
  if (primeiro) wrap.appendChild(primeiro);
  if (!document.getElementById('sidebar-backdrop')) {
    const bd = document.createElement('div');
    bd.id = 'sidebar-backdrop'; bd.className = 'sidebar-backdrop';
    bd.addEventListener('click', function () { fecharMenuMovel(true); });
    document.body.appendChild(bd);
  }
}

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    const sb = document.getElementById('sidebar');
    if (sb && sb.classList.contains('aberta')) { fecharMenuMovel(true); return; }
  }
});
window.addEventListener('resize', function () { if (window.innerWidth > 768) fecharMenuMovel(false); });

async function renderizarSidebar(usuario, unidades=[], paginaAtual='') {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  const nomeSeguro = escHtml(usuario.nome);
  const iniciais = escHtml(usuario.nome.split(' ').filter(Boolean).map(n=>n[0]).slice(0,2).join('').toUpperCase());
  const cur = (nome) => paginaAtual===nome ? ' aria-current="page"' : '';
  const act = (nome) => paginaAtual===nome ? 'active' : '';

  let navPrincipal = '';
  if (usuario.tipo==='professor') {
    navPrincipal = `
      <a class="nav-item ${act('professor')}"  href="/professor.html"${cur('professor')}><span class="nav-icon" aria-hidden="true">📊</span> Painel Geral</a>
      <a class="nav-item ${act('gerenciar')}"  href="/gerenciar.html"${cur('gerenciar')}><span class="nav-icon" aria-hidden="true">⚙️</span> Gerenciar</a>
      <a class="nav-item ${act('perfil')}"     href="/perfil.html"${cur('perfil')}><span class="nav-icon" aria-hidden="true">◉</span> Perfil</a>
    `;
  } else {
    navPrincipal = `
      <a class="nav-item ${act('dashboard')}"   href="/dashboard.html"${cur('dashboard')}><span class="nav-icon" aria-hidden="true">⌂</span> Início</a>
      <a class="nav-item ${act('progresso')}"   href="/progresso.html"${cur('progresso')}><span class="nav-icon" aria-hidden="true">◈</span> Progresso</a>
      <a class="nav-item ${act('perfil')}"      href="/perfil.html"${cur('perfil')}><span class="nav-icon" aria-hidden="true">◉</span> Perfil</a>
      <a class="nav-item ${act('certificado')}" href="/certificado.html"${cur('certificado')}><span class="nav-icon" aria-hidden="true">✦</span> Certificado</a>
      <a class="nav-item ${act('avaliacao')}"   href="/avaliacao-final.html"${cur('avaliacao')}><span class="nav-icon" aria-hidden="true">◇</span> Av. Final</a>
    `;
  }

  let unidadesHTML = '';
  if (usuario.tipo==='estudante' && unidades.length>0) {
    unidadesHTML = `
      <div class="nav-section-title" id="nav-unidades-titulo">Unidades</div>
      <div class="sidebar-unidades" role="group" aria-labelledby="nav-unidades-titulo">
        ${unidades.map(u=>{
          const dot=`<span class="unidade-status-dot dot-${u.status==='em_andamento'?'andamento':u.status}" aria-hidden="true"></span>`;
          const bloqueada = u.status==='bloqueada';
          const lblStatus = {concluida:' (concluída)',em_andamento:' (em andamento)',bloqueada:' (bloqueada)'}[u.status]||'';
          const atual = paginaAtual==='unidade:'+u.id;
          if (bloqueada) {
            return `<span class="unidade-nav-item bloqueada" aria-disabled="true">${dot}<span>Unidade ${u.ordem}<span class="sr-only">${lblStatus}</span></span></span>`;
          }
          return `<a class="unidade-nav-item" href="/unidade.html?id=${u.id}"${atual?' aria-current="page"':''}>
            ${dot}<span>Unidade ${u.ordem}<span class="sr-only">${lblStatus}</span></span>
          </a>`;
        }).join('')}
      </div>`;
  }

  sidebar.setAttribute('aria-label','Barra lateral');
  sidebar.innerHTML = `
    <div class="sidebar-logo">
      <div class="logo-icon" aria-hidden="true">&lt;/&gt;</div>
      <div class="logo-name">Typeoff</div>
    </div>
    <nav class="sidebar-nav" aria-label="Menu principal">
      <div class="nav-section-title">Menu</div>
      ${navPrincipal}
      ${unidadesHTML}
    </nav>
    <div class="sidebar-footer">
      <div class="usuario-info">
        <div class="usuario-avatar" aria-hidden="true">${iniciais}</div>
        <div>
          <div class="usuario-nome">${nomeSeguro}</div>
          <div class="usuario-tipo">${escHtml(usuario.tipo)}</div>
        </div>
      </div>
      <div class="ctl-linha">
        ${controleFonteHTML()}
        <button type="button" class="btn-tema" id="btn-tema" aria-pressed="false">☾ Tema escuro</button>
      </div>
      <button type="button" class="btn-logout" onclick="logout()">Sair</button>
    </div>`;
  document.getElementById('btn-tema').addEventListener('click', function () {
    aplicarTema(temaAtual()==='escuro' ? 'claro' : 'escuro');
  });
  atualizarBotaoTema();
  ligarControleFonte(sidebar);
  prepararTopbar();
  iniciarEstruturaPagina();
}

function mostrarToast(mensagem, tipo='info') {
  let c=document.querySelector('.toast-container');
  if (!c){
    c=document.createElement('div');c.className='toast-container';
    c.setAttribute('role','status'); c.setAttribute('aria-live','polite'); c.setAttribute('aria-atomic','false');
    document.body.appendChild(c);
  }
  const icons={sucesso:'✓',erro:'✗',info:'ℹ'};
  const t=document.createElement('div');
  t.className=`toast ${tipo}`;
  if (tipo==='erro') t.setAttribute('role','alert');
  t.innerHTML=`<span aria-hidden="true">${icons[tipo]||icons.info}</span> <span>${mensagem}</span>`;
  c.appendChild(t);
  setTimeout(()=>{t.style.opacity='0';t.style.transform='translateX(120%)';t.style.transition='all 0.3s ease';setTimeout(()=>t.remove(),300);},tipo==='erro'?6000:3500);
}

let _focoAntesModal = null;
function _focaveis(el) {
  return Array.prototype.slice.call(el.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'))
    .filter(function (n) { return n.offsetParent !== null; });
}
function abrirModal(id){
  const ov = document.getElementById(id); if (!ov) return;
  _focoAntesModal = document.activeElement;
  const dlg = ov.querySelector('.modal') || ov;
  dlg.setAttribute('role','dialog'); dlg.setAttribute('aria-modal','true');
  const h = dlg.querySelector('h2,h3'); if (h) { if (!h.id) h.id = id + '-titulo'; dlg.setAttribute('aria-labelledby', h.id); }
  const fechar = dlg.querySelector('.modal-close'); if (fechar && !fechar.getAttribute('aria-label')) fechar.setAttribute('aria-label','Fechar janela');
  ov.classList.add('aberto');
  setTimeout(function () { const f = _focaveis(dlg); if (f.length) f[0].focus(); }, 30);
}
function fecharModal(id){
  const ov = document.getElementById(id); if (!ov) return;
  ov.classList.remove('aberto');
  if (_focoAntesModal && document.contains(_focoAntesModal)) { try { _focoAntesModal.focus(); } catch (e) {} }
}
document.addEventListener('click',e=>{ if(e.target.classList && e.target.classList.contains('modal-overlay')) fecharModal(e.target.id); });
document.addEventListener('keydown', function (e) {
  const aberto = document.querySelector('.modal-overlay.aberto');
  if (!aberto) return;
  if (e.key === 'Escape') { fecharModal(aberto.id); return; }
  if (e.key === 'Tab') {
    const dlg = aberto.querySelector('.modal') || aberto;
    const f = _focaveis(dlg); if (!f.length) return;
    const primeiro = f[0], ultimo = f[f.length-1];
    if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
  }
});

function formatarData(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'});
}

function tornarAcionavel(el, aoAcionar, rotulo) {
  el.setAttribute('tabindex','0'); el.setAttribute('role','button');
  if (rotulo) el.setAttribute('aria-label', rotulo);
  el.addEventListener('click', aoAcionar);
  el.addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); aoAcionar(ev); }
  });
}

const Codigo = (function () {
  const KW = {
    python: ['if','else','while','for','def','return','break','continue','pass','import','from','as','class','try','except','finally','with','lambda','True','False','None','is','elif','and','or','not','in'],
    java:   ['public','private','protected','static','void','class','if','else','while','for','do','return','break','continue','new','true','false','null','switch','case','default','final','import','package','try','catch','finally','this','throw','throws'],
    c:      ['if','else','while','for','do','return','break','continue','switch','case','default','const','struct','typedef','sizeof','void','NULL','static','enum']
  };
  const TIPOS = {
    python: [],
    java:   ['int','double','float','char','boolean','long','short','byte','String'],
    c:      ['int','float','double','char','long','short','unsigned','signed']
  };
  const set = a => { const s = {}; a.forEach(x => s[x] = 1); return s; };
  const KWS = { python:set(KW.python), java:set(KW.java), c:set(KW.c) };
  const TYS = { python:set(TIPOS.python), java:set(TIPOS.java), c:set(TIPOS.c) };
  const IO  = {
    python: set(['print','input']),
    java:   set(['System','out','println','print','printf','Scanner','nextInt','nextDouble','nextLine','next']),
    c:      set(['printf','scanf','puts','gets','getchar','putchar','fgets'])
  };
  const ESTR = {
    python: set(['def','sum','max','min','len','append']),
    java:   set(['public','class','static','void','main','args','import','package','new','length']),
    c:      set(['main','void'])
  };
  const CATEGORIAS = {
    decl:  'Tipos e declaração de variáveis',
    io:    'Entrada e saída de dados',
    bloco: 'Blocos e delimitadores',
    op:    'Operadores',
    fluxo: 'Decisão e repetição (escrita específica)',
    estr:  'Estrutura do programa e recursos da linguagem'
  };
  const NOMES = { python:'Python', java:'Java', c:'C' };

  const RE = /(#\s*(?:include|define)\b[^\n]*)|(\/\/[^\n]*|#[^\n]*)|([fF]"(?:\\.|[^"\\])*"|[fF]'(?:\\.|[^'\\])*')|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(\belse\s+if\b)|(\b\d+(?:\.\d+)?[fFlL]*\b)|([A-Za-z_]\w*)|(&&|\|\||\*\*|==|!=|<=|>=|\+=|-=|\*=|\/=|\+\+|--|->|[{};:!&])|(\s+)|([\s\S])/g;

  function span(cls, txt, cat) {
    if (cat) return '<span class="' + cls + ' dif dif-' + cat + '" data-cat="' + cat + '" title="' + escHtml(CATEGORIAS[cat]) + '">' + escHtml(txt) + '</span>';
    return cls ? '<span class="' + cls + '">' + escHtml(txt) + '</span>' : escHtml(txt);
  }

  function tokenizarLinha(linha, lang, destaque, usadas) {
    const ehPy = lang === 'python', ehJava = lang === 'java', ehC = lang === 'c';
    const trim = linha.trim();
    const iniciaFor = /^for\b/.test(trim);
    let out = '', m;
    RE.lastIndex = 0;
    const marca = (cat) => { if (!destaque || !cat) return null; if (usadas) usadas[cat] = true; return cat; };
    while ((m = RE.exec(linha)) !== null) {
      const resto = linha.slice(RE.lastIndex);
      if (m[1] !== undefined) { out += span('tk-kw', m[1], marca('estr')); continue; }
      if (m[2] !== undefined) {
        if (ehC && /^#/.test(m[2])) { out += span('tk-kw', m[2], marca('estr')); } else { out += span('tk-cm', m[2]); }
        continue;
      }
      if (m[3] !== undefined) { out += span('tk-st', m[3], marca('io')); continue; }
      if (m[4] !== undefined) { out += span('tk-st', m[4]); continue; }
      if (m[5] !== undefined) { out += span('tk-kw', m[5], marca('fluxo')); continue; }
      if (m[6] !== undefined) { out += span('tk-nu', m[6]); continue; }
      if (m[7] !== undefined) {
        const id = m[7];
        const prox = resto.charAt(0);
        let cls = '', cat = null;
        if (KWS[lang] && KWS[lang][id]) cls = 'tk-kw';
        if (TYS[lang] && TYS[lang][id]) { cls = 'tk-ty'; cat = 'decl'; }
        if (ehJava && id === 'final') cat = 'decl';
        if (ehC && id === 'const') cat = 'decl';
        if (ehPy && /^(int|float|str|bool)$/.test(id) && prox === '(') { cls = 'tk-ty'; cat = 'decl'; }
        if (IO[lang] && IO[lang][id]) { cls = cls || 'tk-fn'; cat = 'io'; }
        if (ESTR[lang] && ESTR[lang][id] && (cat === null)) {
          if (ehPy && /^(sum|max|min|len|append)$/.test(id)) { if (prox === '(') { cls = cls || 'tk-fn'; cat = 'estr'; } }
          else { cls = cls || 'tk-kw'; cat = 'estr'; }
        }
        if (ehPy) {
          if (id === 'elif' || id === 'range') cat = 'fluxo';
          if (id === 'in') cat = iniciaFor ? 'fluxo' : 'op';
          if (id === 'and' || id === 'or' || id === 'not') cat = 'op';
        }
        if (ehJava && (id === 'Math' || id === 'pow')) { cls = cls || 'tk-fn'; cat = 'op'; }
        if (!cls && prox === '(') cls = 'tk-fn';
        out += span(cls, id, marca(cat));
        continue;
      }
      if (m[8] !== undefined) {
        const t = m[8];
        let cat = null;
        if (t === '{' || t === '}' || t === ';') cat = 'bloco';
        else if (t === ':') {
          if (ehPy) cat = /^\s*(#.*)?$/.test(resto) ? 'bloco' : null;
          else if (ehJava && iniciaFor) cat = 'fluxo';
        }
        else if (t === '&&' || t === '||' || t === '**') cat = 'op';
        else if (t === '!') cat = 'op';
        else if (t === '&') cat = ehC ? 'io' : null;
        out += span('', t, marca(cat));
        continue;
      }
      out += escHtml(m[0]);
    }
    return out;
  }

  function html(texto, lang, opc) {
    opc = opc || {};
    const numeros = opc.numeros !== false;
    const destaque = opc.destaque !== false;
    const l = (lang || '').toLowerCase();
    const linguagem = KWS[l] ? l : null;
    const linhas = String(texto == null ? '' : texto).replace(/\r/g,'').replace(/\n+$/,'').split('\n');
    const corpo = linhas.map(function (ln, i) {
      const conteudo = linguagem ? tokenizarLinha(ln, linguagem, destaque, opc.usadas) : escHtml(ln);
      return '<span class="ln" data-n="' + (i + 1) + '">' + conteudo + '</span>';
    }).join('');
    const nome = linguagem ? NOMES[linguagem] : 'código';
    const rotulo = opc.rotulo || ('Código em ' + nome + ', ' + linhas.length + (linhas.length === 1 ? ' linha' : ' linhas'));
    return '<pre class="codigo' + (numeros ? '' : ' sem-numeros') + '" role="group" aria-label="' + escHtml(rotulo) + '">' + corpo + '</pre>';
  }

  return { html: html, categorias: CATEGORIAS, nomes: NOMES };
})();

function criarCronometro() {
  const c = { acum: 0, ini: 0, ativo: false, ultima: 0 };
  c.ms = function () { return c.acum + (c.ativo && c.ini ? Date.now() - c.ini : 0); };
  c.iniciar = function () { c.acum = 0; c.ultima = 0; c.ativo = true; c.ini = document.hidden ? 0 : Date.now(); };
  c.marcar = function () { const t = c.ms(), d = t - c.ultima; c.ultima = t; return d; };
  c.parar = function () { const t = c.ms(); c.acum = t; c.ini = 0; c.ativo = false; return t; };
  document.addEventListener('visibilitychange', function () {
    if (!c.ativo) return;
    if (document.hidden) { if (c.ini) { c.acum += Date.now() - c.ini; c.ini = 0; } }
    else if (!c.ini) { c.ini = Date.now(); }
  });
  return c;
}
function formatarDuracao(ms) {
  if (ms == null || isNaN(ms)) return '—';
  const s = Math.round(ms / 1000);
  if (s < 60) return s + ' s';
  const m = Math.floor(s / 60), r = s % 60;
  if (m < 60) return m + ' min' + (r ? ' ' + r + ' s' : '');
  const h = Math.floor(m / 60);
  return h + ' h ' + (m % 60) + ' min';
}

const Telemetria = {
  fila: [], _retomar: null, _aba: null, _inicio: 0, _acum: 0, _ativo: false,
  registrar: function (ev) {
    this.fila.push(ev);
    if (this.fila.length >= 10) this.enviar();
  },
  enviar: function () {
    if (!this.fila.length) return;
    const lote = this.fila.splice(0, 20);
    const corpo = JSON.stringify({ eventos: lote });
    try {
      if (navigator.sendBeacon && navigator.sendBeacon('/api/telemetria', new Blob([corpo], { type: 'application/json' }))) return;
    } catch (e) {  }
    try { fetch('/api/telemetria', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: corpo, keepalive: true }).catch(function () {}); } catch (e) {}
  },
  iniciarAba: function (unidadeId, aba) {
    this.encerrarAba();
    this._aba = { unidade_id: parseInt(unidadeId, 10), aba: aba };
    this._acum = 0; this._inicio = Date.now(); this._ativo = true;
  },
  encerrarAba: function () {
    if (!this._aba) return;
    if (this._ativo && this._inicio) this._acum += Date.now() - this._inicio;
    const ms = this._acum;
    if (ms >= 1000) this.registrar({ tipo: 'aba_tempo', unidade_id: this._aba.unidade_id, aba: this._aba.aba, tempo_ms: ms });
    this._aba = null; this._acum = 0; this._inicio = 0; this._ativo = false;
  }
};
document.addEventListener('visibilitychange', function () {
  if (document.hidden) {
    if (Telemetria._aba) {
      Telemetria._retomar = { unidade_id: Telemetria._aba.unidade_id, aba: Telemetria._aba.aba };
      Telemetria.encerrarAba();
    }
    Telemetria.enviar();
  } else if (Telemetria._retomar) {
    const r = Telemetria._retomar; Telemetria._retomar = null;
    Telemetria.iniciarAba(r.unidade_id, r.aba);
  }
});
window.addEventListener('pagehide', function () { Telemetria.encerrarAba(); Telemetria.enviar(); });

document.addEventListener('DOMContentLoaded', function () {
  iniciarEstruturaPagina();
  montarControleFonteFlutuante();
  if (document.querySelector('.topbar')) prepararTopbar();
});
