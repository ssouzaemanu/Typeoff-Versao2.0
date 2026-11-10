const { db } = require('./database');

async function seedFirebase() {

  const diagnosticas = await db.allAsync('exercicios', { categoria: 'diagnostica' });
  if (diagnosticas.length >= 10) {
    console.log('Conteúdo já existe no Firebase, pulando seed.');
    return;
  }

  console.log('Preenchendo Firebase com conteúdos e exercícios...');

  const fs   = require('fs');
  const path = require('path');

  const dadosPath = path.join(__dirname, 'dados.json');
  if (!fs.existsSync(dadosPath)) {
    console.error('dados.json não encontrado, seed cancelado.');
    return;
  }

  const dados = JSON.parse(fs.readFileSync(dadosPath, 'utf8'));

  const existConteudos = await db.allAsync('conteudos', {});
  const existExercicios = await db.allAsync('exercicios', {});

  let contConteudos = 0, contExercicios = 0;

  for (const c of dados.conteudos || []) {
    const jaExiste = existConteudos.find(e => e.titulo === c.titulo && e.unidade_id === c.unidade_id);
    if (!jaExiste) {
      await db.insertAsync('conteudos', {
        unidade_id: c.unidade_id,
        titulo: c.titulo,
        corpo: c.corpo,
        tipo: c.tipo,
        ordem: c.ordem
      });
      contConteudos++;
    }
  }

  for (const e of dados.exercicios || []) {
    const jaExiste = existExercicios.find(x => x.enunciado === e.enunciado);
    if (!jaExiste) {
      await db.insertAsync('exercicios', {
        unidade_id: e.unidade_id || null,
        enunciado: e.enunciado,
        tipo: e.tipo,
        opcoes: e.opcoes || null,
        resposta_correta: e.resposta_correta,
        explicacao: e.explicacao || '',
        categoria: e.categoria || 'formativa',
        ordem: e.ordem || 1
      });
      contExercicios++;
    }
  }

  console.log(`Seed completo! ${contConteudos} conteúdos e ${contExercicios} exercícios inseridos.`);
}

module.exports = { seedFirebase };
