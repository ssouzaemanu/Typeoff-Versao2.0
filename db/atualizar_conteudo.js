const fs = require('fs');
const path = require('path');
const v = require('../lib/validacao');

async function migrar(db, opcoes) {
  const aplicar = !!(opcoes && opcoes.aplicar);
  const log = (opcoes && opcoes.log) || console.log;
  const corr = JSON.parse(fs.readFileSync(path.join(__dirname, 'correcoes_conteudo.json'), 'utf8'));
  const resumo = { substituidas: [], placeholders: [], duplicadas: [], substituicoes_feitas: [], inseridas: [], sem_reserva: [], ja_aplicadas: 0, backup: null };
  const original = {};

  const todos = await db.allAsync('exercicios', {});
  const formativas = todos.filter(e => e.unidade_id != null && (e.categoria || 'formativa') === 'formativa');
  const guardar = e => { if (!original[e.id]) original[e.id] = JSON.parse(JSON.stringify(e)); };
  const atualizar = async (e, campos) => {
    guardar(e);
    Object.assign(e, campos);
    if (aplicar) await db.updateAsync('exercicios', { id: e.id }, campos);
  };

  for (const s of corr.substituicoes) {
    const alvo = formativas.find(e => String(e.unidade_id) === String(s.unidade_id) && e.enunciado === s.enunciado);
    if (alvo) { resumo.ja_aplicadas++; continue; }
    const cand = formativas.find(e => String(e.unidade_id) === String(s.unidade_id) && v.norm(v.dadosEnunciado(e.enunciado).texto + ' ' + (v.dadosEnunciado(e.enunciado).codigo || '')).includes(v.norm(s.match)));
    if (!cand) { log('  - correção não encontrada (já ajustada pelo professor?): "' + s.match + '" na unidade ' + s.unidade_id); continue; }
    await atualizar(cand, { enunciado: s.enunciado, opcoes: s.opcoes, resposta_correta: s.resposta_correta, explicacao: s.explicacao, revisada: true });
    resumo.substituicoes_feitas.push(cand.id);
    log('  ✓ questão ' + cand.id + ' (unidade ' + cand.unidade_id + ') reescrita: "' + s.match + '"');
  }

  const aSubstituir = [];
  for (const e of formativas) if (v.ehPlaceholder(e.enunciado)) { aSubstituir.push({ e, motivo: 'enunciado provisório' }); resumo.placeholders.push(e.id); }
  const vistos = new Map();
  for (const e of formativas.slice().sort((a, b) => (a.ordem - b.ordem) || (a.id - b.id))) {
    if (v.ehPlaceholder(e.enunciado)) continue;
    const k = e.unidade_id + '|' + v.chaveEnunciado(e.enunciado);
    if (vistos.has(k)) { aSubstituir.push({ e, motivo: 'repetida da questão ' + vistos.get(k) }); resumo.duplicadas.push(e.id); }
    else vistos.set(k, e.id);
  }
  const chavesPorUnidade = {};
  formativas.forEach(e => { (chavesPorUnidade[e.unidade_id] = chavesPorUnidade[e.unidade_id] || new Set()).add(v.chaveEnunciado(e.enunciado)); });
  for (const { e, motivo } of aSubstituir) {
    const usadas = chavesPorUnidade[e.unidade_id] || new Set();
    const nova = corr.reserva.find(r => String(r.unidade_id) === String(e.unidade_id) && !usadas.has(v.chaveEnunciado(r.enunciado)));
    if (!nova) { resumo.sem_reserva.push(e.id); log('  ! questão ' + e.id + ' (unidade ' + e.unidade_id + ', ' + motivo + '): sem questão de reserva disponível. Edite manualmente em Gerenciar.'); continue; }
    usadas.add(v.chaveEnunciado(nova.enunciado)); chavesPorUnidade[e.unidade_id] = usadas;
    await atualizar(e, { enunciado: nova.enunciado, tipo: nova.tipo, opcoes: nova.opcoes, resposta_correta: nova.resposta_correta, explicacao: nova.explicacao, revisada: true });
    resumo.substituidas.push(e.id);
    log('  ✓ questão ' + e.id + ' (unidade ' + e.unidade_id + ', ' + motivo + ') substituída por questão completa da reserva.');
  }

  for (const n of corr.novas_questoes) {
    const k = v.chaveEnunciado(n.enunciado);
    if (formativas.some(e => String(e.unidade_id) === String(n.unidade_id) && v.chaveEnunciado(e.enunciado) === k)) continue;
    if (aplicar) { const r = await db.insertAsync('exercicios', { ...n, revisada: true }); resumo.inseridas.push(r.id); }
    else resumo.inseridas.push('(novo)');
    log('  ✓ prática ' + n.tipo + ' adicionada à unidade ' + n.unidade_id);
  }

  if (aplicar && Object.keys(original).length) {
    const nome = path.join(__dirname, 'backup_conteudo_' + new Date().toISOString().replace(/[:.]/g, '-') + '.json');
    fs.writeFileSync(nome, JSON.stringify(Object.values(original), null, 1));
    resumo.backup = nome;
    log('  Backup dos registros originais alterados: ' + nome);
  }
  return resumo;
}

module.exports = { migrar };

if (require.main === module) {
  const aplicar = process.argv.includes('--apply');
  (async () => {
    if (!process.env.FB_PRIVATE_KEY || !process.env.FB_PROJECT_ID) {
      console.error('Defina as variáveis de ambiente do Firebase (FB_PROJECT_ID, FB_PRIVATE_KEY, FB_CLIENT_EMAIL, ...) antes de rodar a migração. Veja o README.');
      process.exit(1);
    }
    const { db, inicializar } = require('./database');
    await inicializar();
    console.log(aplicar ? '\nMIGRAÇÃO DO CONTEÚDO — APLICANDO ALTERAÇÕES' : '\nMIGRAÇÃO DO CONTEÚDO — SIMULAÇÃO (use --apply para gravar)');
    const r = await migrar(db, { aplicar });
    console.log('\nResumo:', JSON.stringify({ reescritas: r.substituicoes_feitas.length, ja_aplicadas: r.ja_aplicadas, provisorias_substituidas: r.placeholders.length, duplicadas_substituidas: r.duplicadas.length, sem_reserva: r.sem_reserva.length, praticas_novas: r.inseridas.length }));
    process.exit(0);
  })().catch(e => { console.error(e); process.exit(1); });
}
