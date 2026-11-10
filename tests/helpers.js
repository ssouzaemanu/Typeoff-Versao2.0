let total = 0, falhas = 0; const fila = [];
function test(nome, fn) { fila.push({ nome, fn }); }
async function executar(titulo) {
  console.log('\n== ' + titulo + ' ==');
  for (const t of fila) {
    total++;
    try { await t.fn(); console.log('  ✓ ' + t.nome); }
    catch (e) { falhas++; console.log('  ✗ ' + t.nome + '\n      ' + (e && e.message ? e.message : e)); }
  }
  fila.length = 0;
  return { total, falhas };
}
function resumo() { return { total, falhas }; }
const assert = require('assert');
function cliente(base) {
  let cookie = '';
  async function req(metodo, caminho, corpo, extra) {
    const r = await fetch(base + caminho, { method: metodo, redirect: 'manual',
      headers: Object.assign({ 'Content-Type': 'application/json' }, cookie ? { Cookie: cookie } : {}, (extra && extra.headers) || {}),
      body: corpo === undefined ? undefined : JSON.stringify(corpo) });
    const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0];
    const tipo = r.headers.get('content-type') || '';
    let dados = null; const texto = await r.text();
    if (tipo.includes('json')) { try { dados = JSON.parse(texto); } catch (e) {  } }
    return { status: r.status, dados, texto, headers: r.headers };
  }
  return { get: (c) => req('GET', c), post: (c, b) => req('POST', c, b || {}), put: (c, b) => req('PUT', c, b || {}), del: (c) => req('DELETE', c), get cookie() { return cookie; } };
}
module.exports = { test, executar, resumo, assert, cliente };
