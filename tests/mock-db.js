const path = require('path');

function criar() {
  const cols = {}; const contadores = {};
  const col = n => (cols[n] = cols[n] || []);
  const casa = (doc, filtro) => Object.keys(filtro).every(k => String(doc[k]) === String(filtro[k]));
  const db = {
    _cols: cols,
    async getAsync(c, f = {}) { const r = col(c).find(d => casa(d, f)); return r ? JSON.parse(JSON.stringify(r)) : null; },
    async allAsync(c, f = {}, ord = null) {
      let r = col(c).filter(d => casa(d, f)).map(d => JSON.parse(JSON.stringify(d)));
      if (ord) r.sort((a, b) => (a[ord] < b[ord] ? -1 : a[ord] > b[ord] ? 1 : 0));
      return r;
    },
    async insertAsync(c, obj) {
      contadores[c] = (contadores[c] || 0) + 1;
      const reg = { id: contadores[c], ...obj, criado_em: new Date().toISOString() };
      col(c).push(reg); return JSON.parse(JSON.stringify(reg));
    },
    async updateAsync(c, f, upd) { col(c).filter(d => casa(d, f)).forEach(d => Object.assign(d, upd)); },
    async deleteAsync(c, f) { cols[c] = col(c).filter(d => !casa(d, f)); },
    async countAsync(c, f = {}) { return col(c).filter(d => casa(d, f)).length; }
  };
  return db;
}

function instalar() {
  const db = criar();
  const alvo = require.resolve(path.join(__dirname, '..', 'db', 'database.js'));
  require.cache[alvo] = { id: alvo, filename: alvo, loaded: true, exports: { db, inicializar: async () => {
    for (const u of [
      { id: 1, titulo: 'Introducao a Logica de Programacao', descricao: 'Fundamentos.', ordem: 1, ativa: 1 },
      { id: 2, titulo: 'Conceito de Variaveis', descricao: 'Variaveis.', ordem: 2, ativa: 1 },
      { id: 3, titulo: 'Estruturas Condicionais', descricao: 'Decisao.', ordem: 3, ativa: 1 },
      { id: 4, titulo: 'Estruturas de Repeticao', descricao: 'Lacos.', ordem: 4, ativa: 1 },
      { id: 5, titulo: 'Comparacao entre Linguagens', descricao: 'Comparacao.', ordem: 5, ativa: 1 }]) db._cols.unidades = (db._cols.unidades || []).concat([u]);
    const { seedFirebase } = require('../db/seed_firebase');
    await seedFirebase();
  } } };
  return db;
}
module.exports = { criar, instalar };
