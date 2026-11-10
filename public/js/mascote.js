(function () {
  if (window.__typo) return; window.__typo = true;

  var CHAVE = 'typeoff_typo';
  var h = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  function fmt(t) {
    return h(t).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>').replace(/\n/g, '<br>');
  }
  function ler() { try { return JSON.parse(localStorage.getItem(CHAVE)) || {}; } catch (e) { return {}; } }
  function gravar(o) { try { localStorage.setItem(CHAVE, JSON.stringify(o)); } catch (e) {  } }

  function svgTypo(expr) {
    var olhos = expr === 'pensando'
      ? '<ellipse cx="26" cy="31" rx="3" ry="4" fill="#1B2A6B"/><ellipse cx="40" cy="31" rx="3" ry="4" fill="#1B2A6B"/>'
      : '<ellipse cx="25" cy="33" rx="3" ry="4" fill="#1B2A6B"/><ellipse cx="39" cy="33" rx="3" ry="4" fill="#1B2A6B"/>';
    var boca = expr === 'pensando' ? '<path d="M28 42 h9" stroke="#1B2A6B" stroke-width="2.5" stroke-linecap="round" fill="none"/>'
      : expr === 'alerta' ? '<path d="M27 41.5 h10" stroke="#1B2A6B" stroke-width="2.5" stroke-linecap="round" fill="none"/>'
      : '<path d="M26 40 Q32 46.5 38 40" stroke="#1B2A6B" stroke-width="2.5" stroke-linecap="round" fill="none"/>';
    return '<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">' +
      '<path d="M35 14 L41 5" stroke="#C9A96E" stroke-width="3" stroke-linecap="round"/><circle cx="42" cy="4" r="3.2" fill="#C9A96E"/>' +
      '<path d="M8 28 L2.5 34 L8 40" stroke="#C9A96E" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M56 28 L61.5 34 L56 40" stroke="#C9A96E" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<rect x="8" y="14" width="48" height="42" rx="15" fill="#1B2A6B" stroke="#C9A96E" stroke-width="2.5"/>' +
      '<rect x="14" y="21" width="36" height="28" rx="10" fill="#F2EDE4"/>' +
      '<g class="typo-olhos">' + olhos + '</g>' + boca +
      '<circle cx="19" cy="40" r="2.4" fill="#C9A96E" opacity=".55"/><circle cx="45" cy="40" r="2.4" fill="#C9A96E" opacity=".55"/></svg>';
  }

  var caminho = location.pathname.replace(/^\//, '').replace(/\.html$/, '');
  var PAGINA = ({ '': 'landing', index: 'landing', landing: 'landing' })[caminho] || caminho;
  var AVALIACAO = PAGINA === 'diagnostico' || PAGINA === 'avaliacao-final';
  var ctx = { etapa: PAGINA === 'unidade' ? 'conteudo' : null, nome: null, papel: null };

  var ROTULOS = {
    proxima_unidade: 'Por onde eu começo?', desbloquear: 'Como libero a próxima unidade?', como_funciona: 'Como funciona o curso?',
    abas: 'Como funcionam as etapas?', destaques: 'O que significam os destaques?', sintaxe_vs_logica: 'O que muda entre Python, Java e C?',
    comparacao: 'Como ler a comparação?', praticas: 'Como funcionam as práticas?', nao_atingi: 'Não atingi 80%, e agora?', tempo: 'O que o tempo significa?',
    certificado: 'Como emito o certificado?', senha: 'Como altero meus dados?', esqueci_senha: 'Esqueci minha senha', duvida_conteudo: 'Tenho uma dúvida de conteúdo',
    prof_conta_teste: 'Como marcar conta de teste?', prof_alertas: 'O que significam os alertas?', prof_questao_recusada: 'Por que minha questão foi recusada?',
    o_que_e_typeoff: 'O que é o Typeoff?', fonte: 'Como aumento a letra?', tema_escuro: 'Como ativo o tema escuro?', diagnostico: 'O que é o diagnóstico?',
    avaliacao_final: 'Como é a avaliação final?', unidades: 'Quais são as unidades?', exercicios: 'Como funcionam os exercícios?', progresso: 'Onde vejo meu progresso?',
    algoritmo: 'O que é um algoritmo?', laco: 'Para que servem os laços?', condicional: 'Como funciona o if/else?', variavel: 'O que é uma variável?', prof_painel: 'Como ler o painel?'
  };
  var DICAS = {
    landing: { t: 'Oi! Eu sou o **Typo**. Aqui você vê a mesma lógica em Python, Java e C lado a lado. Crie sua conta para começar.', c: ['o_que_e_typeoff', 'como_funciona', 'unidades'] },
    login: { t: 'Bem-vindo! Entre com seu e-mail ou crie uma conta nova na aba **Criar conta**.', c: ['o_que_e_typeoff', 'esqueci_senha'] },
    dashboard: { t: 'Escolha uma unidade liberada. A que tem ★ **Recomendada** foi indicada pelo seu diagnóstico.', c: ['proxima_unidade', 'desbloquear', 'como_funciona'] },
    'unidade:conteudo': { t: 'Leia os blocos com calma, um de cada vez. Quando terminar, siga para a **Comparação**.', c: ['abas', 'duvida_conteudo', 'tempo'] },
    'unidade:comparacao': { t: 'Aqui o foco é ver o que **muda** (sintaxe, nos trechos realçados) e o que **permanece** (a lógica).', c: ['destaques', 'sintaxe_vs_logica', 'comparacao'] },
    'unidade:exercicios': { t: 'Pode errar à vontade: o feedback explica cada resposta. Com **80%** você libera a próxima unidade.', c: ['praticas', 'nao_atingi', 'exercicios'] },
    progresso: { t: 'Aqui você acompanha seu desempenho e o tempo gasto em cada etapa.', c: ['tempo', 'certificado', 'desbloquear'] },
    perfil: { t: 'Neste espaço você edita seus dados e vê um resumo do seu curso.', c: ['senha', 'esqueci_senha', 'fonte'] },
    diagnostico: { t: 'Este é o **diagnóstico**: sem nota, só para indicar seu ponto de partida. Aqui eu só ajudo com o uso da plataforma, não com as respostas.', c: ['diagnostico', 'tempo', 'fonte'], expr: 'alerta' },
    'avaliacao-final': { t: 'Esta é a **avaliação final**: 10 questões, 80% para aprovar, uma única vez. Aqui eu só ajudo com o uso da plataforma.', c: ['avaliacao_final', 'tempo', 'fonte'], expr: 'alerta' },
    certificado: { t: 'Aqui está o seu certificado. Use o botão de imprimir ou salvar em PDF.', c: ['avaliacao_final', 'progresso'] },
    professor: { t: 'Em **Desempenho e uso** você vê acerto, tempo e alertas por questão. Marque contas de teste para tirá-las das médias.', c: ['prof_painel', 'prof_conta_teste', 'prof_alertas'] },
    gerenciar: { t: 'Cadastre questões completas: enunciado, alternativas e explicação. Repetidas e provisórias são recusadas.', c: ['prof_questao_recusada', 'prof_alertas'] }
  };
  function chaveCtx() { return PAGINA === 'unidade' ? 'unidade:' + (ctx.etapa || 'conteudo') : PAGINA; }
  function dicaAtual() { return DICAS[chaveCtx()] || { t: 'Posso ajudar com o uso da plataforma e com dúvidas de lógica de programação.', c: ['como_funciona', 'duvida_conteudo'] }; }

  var raiz = document.createElement('div');
  raiz.className = 'typo'; raiz.id = 'typo';
  raiz.innerHTML =
    '<div class="typo-balao" id="typo-balao" role="status" hidden><button type="button" class="typo-x" aria-label="Fechar dica">×</button><p id="typo-balao-txt"></p><button type="button" class="typo-mais">Conversar com o Typo</button></div>' +
    '<section class="typo-painel" id="typo-painel" role="dialog" aria-modal="false" aria-labelledby="typo-titulo" hidden>' +
      '<div class="typo-topo"><span class="typo-avatar"></span><div class="typo-titulo"><strong id="typo-titulo">Typo</strong><span>seu guia no Typeoff</span></div>' +
      '<button type="button" class="typo-fechar" aria-label="Fechar conversa com o Typo">✕</button></div>' +
      '<div class="typo-log" id="typo-log" role="log" aria-live="polite" aria-relevant="additions"></div>' +
      '<div class="typo-chips" id="typo-chips" role="group" aria-label="Temas sugeridos"></div>' +
      '<form class="typo-form" id="typo-form" autocomplete="off"><label class="typo-sr" for="typo-q">Sua pergunta para o Typo</label>' +
      '<input class="typo-input" id="typo-q" type="text" maxlength="300" placeholder="Pergunte algo…"><button type="submit" class="typo-enviar">Enviar</button></form>' +
      '<div class="typo-rodape"><label><input type="checkbox" id="typo-dicas"> Mostrar dicas automáticas</label></div>' +
    '</section>' +
    '<button type="button" class="typo-btn" id="typo-btn" aria-expanded="false" aria-controls="typo-painel" aria-label="Abrir o Typo, guia e assistente de dúvidas"></button>';

  var el = {};
  function montar() {
    document.body.appendChild(raiz); document.body.classList.add('tem-typo');
    ['btn', 'painel', 'balao', 'balao-txt', 'log', 'chips', 'form', 'q', 'dicas'].forEach(function (k) { el[k] = document.getElementById('typo-' + k); });
    el.avatar = raiz.querySelector('.typo-avatar');
    el.btn.innerHTML = svgTypo(dicaAtual().expr || 'feliz');
    el.avatar.innerHTML = svgTypo('feliz');
    el.btn.addEventListener('click', function () { aberto() ? fechar(true) : abrir(); });
    raiz.querySelector('.typo-fechar').addEventListener('click', function () { fechar(true); });
    raiz.querySelector('.typo-x').addEventListener('click', esconderBalao);
    raiz.querySelector('.typo-mais').addEventListener('click', function () { esconderBalao(); abrir(); });
    el.form.addEventListener('submit', function (ev) { ev.preventDefault(); var t = el.q.value.trim(); if (t) { el.q.value = ''; perguntar({ pergunta: t }, t); } });
    el.dicas.checked = ler().dicas !== false;
    el.dicas.addEventListener('change', function () { var s = ler(); s.dicas = el.dicas.checked; gravar(s); if (!el.dicas.checked) esconderBalao(); });
    raiz.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && aberto()) { ev.stopPropagation(); fechar(true); } });
  }

  function aberto() { return !el.painel.hidden; }
  function msg(papel, html, extra) {
    var d = document.createElement('div'); d.className = 'typo-msg ' + papel; d.innerHTML = html;
    if (extra && extra.link) { var a = document.createElement('a'); a.href = extra.link.href; a.textContent = extra.link.texto; d.appendChild(document.createElement('br')); d.appendChild(a); }
    if (extra && extra.aviso) { var s = document.createElement('span'); s.className = 'typo-aviso'; s.textContent = extra.aviso; d.appendChild(s); }
    el.log.appendChild(d); el.log.scrollTop = el.log.scrollHeight; return d;
  }
  function chips(ids) {
    el.chips.innerHTML = '';
    (ids || []).forEach(function (it) {
      var id = typeof it === 'string' ? it : it.id, rot = typeof it === 'string' ? (ROTULOS[it] || it) : it.rotulo;
      var b = document.createElement('button'); b.type = 'button'; b.className = 'typo-chip'; b.textContent = rot;
      b.addEventListener('click', function () { if (id === '__temas') chips(dicaAtual().c); else perguntar({ id: id }, rot); });
      el.chips.appendChild(b);
    });
  }
  function saudacao() {
    var d = dicaAtual(), nome = ctx.nome ? ', ' + ctx.nome : '';
    msg('bot', fmt('Oi' + nome + '! Eu sou o **Typo**. ' + d.t));
    chips(d.c);
  }
  function abrir() {
    esconderBalao();
    el.painel.hidden = false; el.btn.setAttribute('aria-expanded', 'true');
    if (!el.log.children.length) saudacao();
    setTimeout(function () { el.q.focus(); }, 30);
  }
  function fechar(devolverFoco) {
    el.painel.hidden = true; el.btn.setAttribute('aria-expanded', 'false');
    if (devolverFoco) el.btn.focus();
  }
  function esconderBalao() { el.balao.hidden = true; }
  function mostrarDica() {
    var s = ler(); if (s.dicas === false || aberto()) return;
    var chave = chaveCtx(); s.vistos = s.vistos || {};
    if (s.vistos[chave]) return;
    s.vistos[chave] = 1; gravar(s);
    var d = dicaAtual();
    el.balao.querySelector('#typo-balao-txt').innerHTML = fmt(d.t);
    el.balao.hidden = false;
    el.btn.innerHTML = svgTypo(d.expr || 'feliz');
  }

  var ocupado = false;
  function perguntar(corpo, textoUsuario) {
    if (ocupado) return;
    if (textoUsuario) msg('eu', h(textoUsuario));
    ocupado = true; raiz.querySelector('.typo-enviar').disabled = true;
    var pensando = document.createElement('div'); pensando.className = 'typo-pensando'; pensando.textContent = 'Typo está pensando…'; el.log.appendChild(pensando);
    el.log.scrollTop = el.log.scrollHeight; el.btn.innerHTML = svgTypo('pensando');
    var envio = Object.assign({ pagina: PAGINA, etapa: ctx.etapa }, corpo);
    fetch('/api/mascote/perguntar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(envio) })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        pensando.remove();
        if (!d || d.sucesso === false) { msg('bot', fmt((d && d.erro) || 'Não consegui responder agora. Tente de novo em instantes.')); chips(dicaAtual().c); return; }
        if (d.acao === 'proxima_unidade') return responderProximaUnidade(d);
        msg('bot', fmt(d.resposta), { aviso: d.aviso });
        var sug = (d.sugestoes || []).slice(); sug.push({ id: '__temas', rotulo: 'Ver outros temas' }); chips(sug);
      })
      .catch(function () { pensando.remove(); msg('bot', fmt('Não consegui falar com o servidor agora. Verifique sua conexão e tente de novo.')); chips(dicaAtual().c); })
      .then(function () { ocupado = false; raiz.querySelector('.typo-enviar').disabled = false; el.btn.innerHTML = svgTypo(dicaAtual().expr || 'feliz'); });
  }

  function responderProximaUnidade(d) {
    if (ctx.papel === 'professor') { msg('bot', fmt('Essa pergunta é para estudantes. Você acompanha a turma em **Painel Geral**.')); chips(dicaAtual().c); return; }
    return fetch('/api/unidades').then(function (r) { return r.json(); }).then(function (u) {
      if (!u || !u.sucesso) { msg('bot', fmt('Entre na sua conta para eu ver seu andamento. Enquanto isso: o curso começa pelo **diagnóstico inicial**.')); return; }
      var unidades = u.unidades || [], diag = u.diagnostico;
      if (!diag) { msg('bot', fmt('Comece pelo **diagnóstico inicial**: ele indica por qual unidade você deve começar.'), { link: { href: '/diagnostico.html', texto: 'Fazer o diagnóstico' } }); return; }
      var destino = parseInt(diag.destino, 10), alvo = null;
      unidades.forEach(function (x) { if (!alvo && x.ordem === destino && x.status !== 'concluida' && x.status !== 'bloqueada') alvo = x; });
      if (!alvo) unidades.forEach(function (x) { if (!alvo && x.status === 'em_andamento') alvo = x; });
      if (alvo) { msg('bot', fmt('Sua próxima parada é a **Unidade ' + alvo.ordem + ': ' + alvo.titulo + '**' + (alvo.percentual ? ' (você está com ' + Math.round(alvo.percentual) + '%).' : '.')), { link: { href: '/unidade.html?id=' + alvo.id, texto: 'Abrir a Unidade ' + alvo.ordem } }); return; }
      msg('bot', fmt('Você já concluiu as unidades! O próximo passo é a **Avaliação Final**.'), { link: { href: '/avaliacao-final.html', texto: 'Ir para a Avaliação Final' } });
    }).catch(function () { msg('bot', fmt('Não consegui ver seu andamento agora. Veja o **Início**: a unidade com ★ é a recomendada.')); })
      .then(function () { chips(d.sugestoes && d.sugestoes.length ? d.sugestoes : dicaAtual().c); });
  }

  function iniciar() {
    montar();
    fetch('/api/auth/me').then(function (r) { return r.json(); }).then(function (d) {
      if (d && d.sucesso && d.usuario) { ctx.papel = d.usuario.tipo; ctx.nome = (d.usuario.nome || '').split(' ')[0] || null; }
    }).catch(function () {}).then(function () { setTimeout(mostrarDica, 1500); });
  }
  window.addEventListener('typeoff:etapa', function (ev) {
    ctx.etapa = ev.detail && ev.detail.etapa; if (!el.btn) return;
    if (!aberto()) setTimeout(mostrarDica, 600);
  });
  window.Typo = { abrir: function () { abrir(); }, fechar: function () { fechar(false); }, contexto: function () { return { pagina: PAGINA, etapa: ctx.etapa }; } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
