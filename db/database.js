const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

let db_fs;

const COLECOES = ['usuarios','conteudos','exercicios','respostas','progresso',
                  'certificados','diagnostico_respostas','avaliacao_final_respostas','unidades','telemetria'];

const UNIDADES_INICIAIS = [
  {id:1,titulo:'Introducao a Logica de Programacao',descricao:'Fundamentos do pensamento computacional.',ordem:1,ativa:1},
  {id:2,titulo:'Conceito de Variaveis',descricao:'Armazenamento de dados: tipos, declaracao e operacoes.',ordem:2,ativa:1},
  {id:3,titulo:'Estruturas Condicionais',descricao:'Tomada de decisao no codigo.',ordem:3,ativa:1},
  {id:4,titulo:'Estruturas de Repeticao',descricao:'Lacos e loops: for, while, do-while.',ordem:4,ativa:1},
  {id:5,titulo:'Comparacao entre Linguagens',descricao:'Analise comparativa Python, Java e C.',ordem:5,ativa:1}
];

async function inicializar() {
  const cred = {
    type: 'service_account',
    project_id: process.env.FB_PROJECT_ID,
    private_key_id: process.env.FB_PRIVATE_KEY_ID,
    private_key: process.env.FB_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.FB_CLIENT_EMAIL,
    client_id: process.env.FB_CLIENT_ID,
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: process.env.FB_CLIENT_CERT_URL,
    universe_domain: 'googleapis.com'
  };

  initializeApp({ credential: cert(cred) });
  db_fs = getFirestore();

  for (const u of UNIDADES_INICIAIS) {
    const ref = db_fs.collection('unidades').doc(String(u.id));
    const snap = await ref.get();
    if (!snap.exists) {
      await ref.set({ ...u, criado_em: new Date().toISOString() });
      console.log('Unidade ' + u.id + ' criada.');
    }
  }

  const ctRef = db_fs.collection('_contadores').doc('ids');
  const ctSnap = await ctRef.get();
  if (!ctSnap.exists) {
    const init = {};
    for (const c of COLECOES) init[c] = 0;
    init.unidades = UNIDADES_INICIAIS.length;
    await ctRef.set(init);
  }

  console.log('Firebase Firestore conectado!');

  const { seedFirebase } = require('./seed_firebase');
  await seedFirebase();
}

async function proximoId(colecao) {
  const ref = db_fs.collection('_contadores').doc('ids');
  let novoId;
  await db_fs.runTransaction(async t => {
    const snap = await t.get(ref);
    const atual = (snap.data() && snap.data()[colecao]) || 0;
    novoId = atual + 1;
    t.update(ref, { [colecao]: novoId });
  });
  return novoId;
}

const db = {

  async getAsync(colecao, filtro = {}) {
    const chaves = Object.keys(filtro);

    if (chaves.length === 1 && filtro.id !== undefined) {
      const snap = await db_fs.collection(colecao).doc(String(filtro.id)).get();
      return snap.exists ? { ...snap.data() } : null;
    }

    let query = db_fs.collection(colecao);
    const [primeiraChave, primeiroValor] = [chaves[0], filtro[chaves[0]]];
    if (primeiraChave) query = query.where(primeiraChave, '==', primeiroValor);

    const snap = await query.get();
    const docs = snap.docs.map(d => ({ ...d.data() }));

    const resultado = docs.find(doc =>
      chaves.every(k => String(doc[k]) === String(filtro[k]))
    );
    return resultado || null;
  },

  async allAsync(colecao, filtro = {}, ordenarPor = null) {
    const chaves = Object.keys(filtro);
    let query = db_fs.collection(colecao);

    if (chaves.length > 0) {
      query = query.where(chaves[0], '==', filtro[chaves[0]]);
    }

    const snap = await query.get();
    let docs = snap.docs.map(d => ({ ...d.data() }));

    if (chaves.length > 1) {
      docs = docs.filter(doc =>
        chaves.every(k => String(doc[k]) === String(filtro[k]))
      );
    }

    if (ordenarPor) {
      docs.sort((a, b) => {
        if (a[ordenarPor] < b[ordenarPor]) return -1;
        if (a[ordenarPor] > b[ordenarPor]) return 1;
        return 0;
      });
    }

    return docs;
  },

  async insertAsync(colecao, obj) {
    const id = await proximoId(colecao);
    const registro = { id, ...obj, criado_em: new Date().toISOString() };
    await db_fs.collection(colecao).doc(String(id)).set(registro);
    return registro;
  },

  async updateAsync(colecao, filtro, atualizacao) {

    if (Object.keys(filtro).length === 1 && filtro.id !== undefined) {
      await db_fs.collection(colecao).doc(String(filtro.id)).update(atualizacao);
      return 1;
    }

    const docs = await this.allAsync(colecao, filtro);
    const batch = db_fs.batch();
    docs.forEach(doc => {
      const ref = db_fs.collection(colecao).doc(String(doc.id));
      batch.update(ref, atualizacao);
    });
    await batch.commit();
    return docs.length;
  },

  async deleteAsync(colecao, filtro) {
    if (Object.keys(filtro).length === 1 && filtro.id !== undefined) {
      await db_fs.collection(colecao).doc(String(filtro.id)).delete();
      return 1;
    }
    const docs = await this.allAsync(colecao, filtro);
    const batch = db_fs.batch();
    docs.forEach(doc => {
      const ref = db_fs.collection(colecao).doc(String(doc.id));
      batch.delete(ref);
    });
    await batch.commit();
    return docs.length;
  },

  async countAsync(colecao, filtro = {}) {
    const docs = await this.allAsync(colecao, filtro);
    return docs.length;
  }
};

module.exports = { db, inicializar };
