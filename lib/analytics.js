const { dadosEnunciado, ehPlaceholder, chaveEnunciado } = require('./validacao');

const ABAS = ['conteudo', 'comparacao', 'exercicios'];
const ehVerdadeiro = v => v === 1 || v === '1' || v === true;

function contaTeste(u) {
  if (u.conta_teste === 1 || u.conta_teste === '1' || u.conta_teste === true) return { teste: true, origem: 'manual' };
  if (u.conta_teste === 0 || u.conta_teste === '0' || u.conta_teste === false) return { teste: false, origem: 'manual' };
  const sugerida = /(^|[^a-z])(teste|test|demo|exemplo)([^a-z]|$)/i.test((u.nome || '') + ' ' + (u.email || ''));
  return { teste: false, sugerida, origem: 'automatica' };
}

function resumoEnunciado(raw) {
  const d = dadosEnunciado(raw);
  const t = String(d.texto || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return t.length > 90 ? t.slice(0, 87) + '…' : (t || '(sem texto)');
}
const taxa = (a, n) => n > 0 ? Math.round((a / n) * 100) : null;
const media = arr => arr.length ? Math.round(arr.reduce((s, x) => s + x, 0) / arr.length) : null;

function calcularAnalytics(dados, opcoes) {
  opcoes = opcoes || {};
  const excluirTeste = opcoes.excluirTeste !== false;
  const usuarios = (dados.usuarios || []).filter(u => u.tipo === 'estudante');
  const infoConta = {}; usuarios.forEach(u => infoConta[u.id] = contaTeste(u));
  const incluido = id => infoConta[id] && !(excluirTeste && infoConta[id].teste);
  const unidades = (dados.unidades || []).slice().sort((a, b) => a.ordem - b.ordem);
  const exerc = {}; (dados.exercicios || []).forEach(e => exerc[e.id] = e);

  const formativa = r => exerc[r.exercicio_id] && exerc[r.exercicio_id].unidade_id != null && (exerc[r.exercicio_id].categoria || 'formativa') === 'formativa';
  const respostas = (dados.respostas || []).filter(r => incluido(r.usuario_id) && formativa(r));
  const tele = (dados.telemetria || []).filter(t => incluido(t.usuario_id));

  const chaves = {};
  (dados.exercicios || []).forEach(e => {
    if (e.unidade_id == null || (e.categoria || 'formativa') !== 'formativa') return;
    const k = e.unidade_id + '|' + chaveEnunciado(e.enunciado);
    (chaves[k] = chaves[k] || []).push(e.id);
  });

  const porQuestao = {};
  respostas.forEach(r => (porQuestao[r.exercicio_id] = porQuestao[r.exercicio_id] || []).push(r));
  const unidadeOrdem = {}; unidades.forEach(u => unidadeOrdem[u.id] = u.ordem);
  const questoes = (dados.exercicios || []).filter(e => e.unidade_id != null && (e.categoria || 'formativa') === 'formativa').map(e => {
    const rs = porQuestao[e.id] || [];
    const ac = rs.filter(r => ehVerdadeiro(r.correta)).length;
    const tempos = rs.map(r => r.tempo_ms).filter(x => typeof x === 'number' && x >= 0);
    const tent = rs.map(r => r.tentativa).filter(x => typeof x === 'number');
    const alertas = [];
    if (ehPlaceholder(e.enunciado)) alertas.push('enunciado provisório');
    if ((chaves[e.unidade_id + '|' + chaveEnunciado(e.enunciado)] || []).length > 1) alertas.push('repetida na unidade');
    if (rs.length >= 5 && taxa(ac, rs.length) < 40) alertas.push('taxa de acerto baixa (revisar enunciado ou dificuldade)');
    if (rs.length >= 5 && taxa(ac, rs.length) > 95) alertas.push('taxa de acerto muito alta');
    return { exercicio_id: e.id, unidade_id: e.unidade_id, unidade_ordem: unidadeOrdem[e.unidade_id] || null, ordem: e.ordem,
      tipo: e.tipo, resumo: resumoEnunciado(e.enunciado), respostas: rs.length, acertos: ac, taxa: taxa(ac, rs.length),
      tempo_medio_ms: media(tempos), tentativa_media: tent.length ? Math.round((tent.reduce((s, x) => s + x, 0) / tent.length) * 10) / 10 : null,
      respostas_com_telemetria: tempos.length, alertas };
  }).sort((a, b) => (a.unidade_ordem - b.unidade_ordem) || (a.ordem - b.ordem));

  const progresso = (dados.progresso || []).filter(p => incluido(p.usuario_id));
  const resUnidades = unidades.map(u => {
    const rs = respostas.filter(r => exerc[r.exercicio_id].unidade_id === u.id);
    const ac = rs.filter(r => ehVerdadeiro(r.correta)).length;
    const te = tele.filter(t => t.unidade_id === u.id);
    const tempoAba = {}; ABAS.forEach(a => tempoAba[a] = te.filter(t => t.tipo === 'aba_tempo' && t.aba === a).reduce((s, t) => s + (t.tempo_ms || 0), 0));
    const alunos = new Set(rs.map(r => r.usuario_id));
    te.forEach(t => alunos.add(t.usuario_id));
    const resultados = te.filter(t => t.tipo === 'unidade_resultado');
    const tentPorAluno = {}; resultados.forEach(t => tentPorAluno[t.usuario_id] = (tentPorAluno[t.usuario_id] || 0) + 1);
    const nT = Object.keys(tentPorAluno).length;
    return { unidade_id: u.id, ordem: u.ordem, titulo: u.titulo, estudantes_ativos: alunos.size, respostas: rs.length, acertos: ac, taxa: taxa(ac, rs.length),
      tempo_ms: tempoAba, tempo_medio_por_aluno_ms: alunos.size ? Math.round((tempoAba.conteudo + tempoAba.comparacao + tempoAba.exercicios) / alunos.size) : null,
      tentativas_media: nT ? Math.round((Object.values(tentPorAluno).reduce((s, x) => s + x, 0) / nT) * 10) / 10 : null,
      concluidas: progresso.filter(p => p.unidade_id === u.id && p.status === 'concluida').length,
      tempo_tentativa_medio_ms: media(resultados.map(t => t.tempo_ms).filter(x => typeof x === 'number')),
      melhor_percentual_media: (() => { const m = {}; resultados.forEach(t => { m[t.usuario_id] = Math.max(m[t.usuario_id] || 0, t.percentual || 0); }); const v = Object.values(m); return v.length ? Math.round(v.reduce((s, x) => s + x, 0) / v.length) : null; })() };
  });

  const alunos = usuarios.map(u => {
    const rs = (dados.respostas || []).filter(r => r.usuario_id === u.id && formativa(r));
    const ac = rs.filter(r => ehVerdadeiro(r.correta)).length;
    const te = (dados.telemetria || []).filter(t => t.usuario_id === u.id);
    const tempo = te.filter(t => t.tipo === 'aba_tempo').reduce((s, t) => s + (t.tempo_ms || 0), 0);
    const datas = rs.map(r => r.criado_em).concat(te.map(t => t.criado_em)).filter(Boolean).sort();
    const info = infoConta[u.id];
    const tDiag = (dados.diagnosticos || []).filter(x => x.usuario_id === u.id && typeof x.tempo_ms === 'number').pop();
    const tFinal = (dados.finais || []).filter(x => x.usuario_id === u.id && typeof x.tempo_ms === 'number').pop();
    const tExerc = te.filter(t => t.tipo === 'aba_tempo' && t.aba === 'exercicios').reduce((s, t) => s + (t.tempo_ms || 0), 0);
    return { tempo_diagnostico_ms: tDiag ? tDiag.tempo_ms : null, tempo_avaliacao_final_ms: tFinal ? tFinal.tempo_ms : null, tempo_exercicios_ms: tExerc || null, id: u.id, nome: u.nome, email: u.email, conta_teste: !!info.teste, teste_sugerido: !!info.sugerida, origem_marcacao: info.origem,
      respostas: rs.length, acertos: ac, taxa: taxa(ac, rs.length), tempo_ms: tempo, tem_telemetria: te.length > 0,
      unidades_concluidas: (dados.progresso || []).filter(p => p.usuario_id === u.id && p.status === 'concluida').length,
      ultima_atividade: datas.length ? datas[datas.length - 1] : null };
  });

  const ac = respostas.filter(r => ehVerdadeiro(r.correta)).length;
  const tempos = arr => media(arr.filter(x => incluido(x.usuario_id) && typeof x.tempo_ms === 'number').map(x => x.tempo_ms));
  return {
    resumo: { tempo_medio_diagnostico_ms: tempos(dados.diagnosticos || []), tempo_medio_avaliacao_final_ms: tempos(dados.finais || []),
      estudantes_considerados: usuarios.filter(u => incluido(u.id)).length, contas_teste: usuarios.filter(u => infoConta[u.id].teste).length,
      contas_teste_sugeridas: usuarios.filter(u => infoConta[u.id].sugerida).length, respostas: respostas.length, acertos: ac, taxa: taxa(ac, respostas.length),
      respostas_com_telemetria: respostas.filter(r => typeof r.tempo_ms === 'number').length, eventos_telemetria: tele.length, excluindo_contas_teste: excluirTeste },
    unidades: resUnidades, questoes, alunos
  };
}

module.exports = { calcularAnalytics, contaTeste };
