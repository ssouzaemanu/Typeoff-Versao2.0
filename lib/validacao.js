const TIPOS_VALIDOS = ['multipla_escolha', 'verdadeiro_falso', 'completar_codigo', 'ordenar_linhas'];
const PLACEHOLDERS = /^(teste|test|testando|teste\s*\d*|asdf+|xxx+|lorem ipsum.*|\.+|-+|tbd|todo|pergunta|questao|enunciado)$/;

function norm(s) {
  return String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/\s+/g, ' ').trim();
}

function dadosEnunciado(raw) {
  try { const d = JSON.parse(raw); if (d && typeof d === 'object' && !Array.isArray(d)) return d; } catch (e) {  }
  return { tipo: 'texto', texto: String(raw == null ? '' : raw) };
}

function textoCompleto(raw) {
  const d = dadosEnunciado(raw);
  return [d.texto || '', d.codigo || '', Array.isArray(d.linhas) ? d.linhas.slice().sort().join('\n') : ''].join('\n');
}
function chaveEnunciado(raw) { return norm(textoCompleto(raw)); }

function ehPlaceholder(raw) {
  const d = dadosEnunciado(raw);
  const t = norm(String(d.texto || '').replace(/<[^>]*>/g, ' '));
  const temConteudoExtra = !!(d.codigo || (Array.isArray(d.linhas) && d.linhas.length) || d.imagem);
  if (!t) return !temConteudoExtra;
  return PLACEHOLDERS.test(t) || (t.length < 6 && !temConteudoExtra);
}

function respostaEhValida(ex) {
  if (ex.resposta_correta == null || String(ex.resposta_correta).trim() === '') return false;
  if (ex.tipo === 'multipla_escolha') {
    const ops = Array.isArray(ex.opcoes) ? ex.opcoes : null;
    if (!ops || ops.length < 2) return false;
    return ops.some(o => norm(o) === norm(ex.resposta_correta));
  }
  return true;
}

function validarExercicio(c) {
  const erros = [];
  if (!c || typeof c !== 'object') return ['Dados da questão ausentes.'];
  if (!TIPOS_VALIDOS.includes(c.tipo)) erros.push('Tipo de questão inválido.');
  if (!c.enunciado || !String(c.enunciado).trim()) erros.push('O enunciado é obrigatório.');
  else if (ehPlaceholder(c.enunciado)) erros.push('O enunciado parece provisório (ex.: "Teste"). Escreva uma pergunta completa.');
  if (!c.explicacao || String(c.explicacao).trim().length < 10) erros.push('A explicação é obrigatória (mínimo de 10 caracteres) para o feedback ao estudante.');
  if (c.resposta_correta == null || String(c.resposta_correta).trim() === '') erros.push('A resposta correta é obrigatória.');

  if (c.tipo === 'multipla_escolha') {
    const ops = Array.isArray(c.opcoes) ? c.opcoes.map(o => String(o == null ? '' : o).trim()) : [];
    if (ops.length < 2) erros.push('Informe pelo menos 2 alternativas.');
    if (ops.some(o => !o)) erros.push('Há alternativas em branco.');
    if (new Set(ops.map(norm)).size !== ops.length) erros.push('Há alternativas repetidas.');
    if (c.resposta_correta != null && !ops.some(o => norm(o) === norm(c.resposta_correta))) erros.push('A resposta correta deve ser idêntica a uma das alternativas.');
  } else if (c.tipo === 'verdadeiro_falso') {
    if (!['verdadeiro', 'falso'].includes(norm(c.resposta_correta))) erros.push('Para verdadeiro/falso, a resposta deve ser "verdadeiro" ou "falso".');
  } else if (c.tipo === 'completar_codigo') {
    const d = dadosEnunciado(c.enunciado);
    const lac = Array.isArray(d.lacunas) ? d.lacunas : [];
    const marcas = (String(d.codigo || '').match(/___\d+___/g) || []);
    let resp = null; try { resp = JSON.parse(c.resposta_correta); } catch (e) {  }
    if (!lac.length || marcas.length !== lac.length) erros.push('O código deve ter uma marca ___N___ para cada lacuna.');
    if (!Array.isArray(resp) || resp.length !== lac.length || resp.some((r, i) => !(lac[i] || []).some(o => norm(o) === norm(r)))) erros.push('A resposta correta deve listar, para cada lacuna, uma das opções.');
  } else if (c.tipo === 'ordenar_linhas') {
    const d = dadosEnunciado(c.enunciado);
    const linhas = Array.isArray(d.linhas) ? d.linhas : [];
    let resp = null; try { resp = JSON.parse(c.resposta_correta); } catch (e) {  }
    if (linhas.length < 2) erros.push('Informe pelo menos 2 linhas para ordenar.');
    if (!Array.isArray(resp) || resp.slice().sort().join('\u0001') !== linhas.slice().sort().join('\u0001')) erros.push('A ordem correta deve conter exatamente as mesmas linhas do enunciado.');
  }
  return erros;
}

function encontrarDuplicada(candidato, existentes, ignorarId) {
  const chave = chaveEnunciado(candidato.enunciado);
  return (existentes || []).find(e =>
    e.id !== ignorarId &&
    String(e.unidade_id) === String(candidato.unidade_id == null ? e.unidade_id : candidato.unidade_id) &&
    (e.categoria || 'formativa') === (candidato.categoria || 'formativa') &&
    chaveEnunciado(e.enunciado) === chave) || null;
}

function filtrarExerciciosPublicos(lista) {
  const descartadas = [];
  const vistos = new Map();
  const ordenada = lista.slice().sort((a, b) => (a.ordem - b.ordem) || (a.id - b.id));
  const publicas = [];
  for (const e of ordenada) {
    if (ehPlaceholder(e.enunciado)) { descartadas.push({ id: e.id, motivo: 'enunciado provisório' }); continue; }
    if (!respostaEhValida(e)) { descartadas.push({ id: e.id, motivo: 'resposta/alternativas inválidas' }); continue; }
    const k = (e.categoria || 'formativa') + '|' + chaveEnunciado(e.enunciado);
    if (vistos.has(k)) { descartadas.push({ id: e.id, motivo: 'repetida da questão ' + vistos.get(k) }); continue; }
    vistos.set(k, e.id);
    publicas.push(e);
  }
  return { publicas, descartadas };
}

module.exports = { TIPOS_VALIDOS, norm, dadosEnunciado, chaveEnunciado, ehPlaceholder, respostaEhValida, validarExercicio, encontrarDuplicada, filtrarExerciciosPublicos };
