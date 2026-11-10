const http=require('http'),fs=require('fs'),path=require('path'),
      crypto=require('crypto'),url=require('url');

const PORT=process.env.PORT||3000,PUBLIC=path.join(__dirname,'public');
const META_APROVACAO=80;

const { db, inicializar } = require('./db/database');
const validacao = require('./lib/validacao');
const mascote = require('./lib/mascote');
const { calcularAnalytics } = require('./lib/analytics');

const sessions={};
function getSession(req){
  const m=(req.headers.cookie||'').match(/sid=([a-f0-9]+)/);
  if(m&&sessions[m[1]])return{id:m[1],data:sessions[m[1]]};
  const id=crypto.randomBytes(24).toString('hex');sessions[id]={};
  return{id,data:sessions[id]};
}
function setCookie(res,sid){res.setHeader('Set-Cookie',`sid=${sid}; Path=/; HttpOnly; Max-Age=86400`);}

const MIME={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon'};

const CACHE_ESTATICO={'.css':'public, max-age=3600, must-revalidate','.js':'public, max-age=3600, must-revalidate','.png':'public, max-age=86400','.ico':'public, max-age=86400','.svg':'public, max-age=86400'};
function cabecalhosBase(res){res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');}
function semSenha(u){if(!u)return u;const{senha,...resto}=u;return resto;}
const limiteTelemetria={};
const ABAS_VALIDAS=['conteudo','comparacao','exercicios'];
const avisadas=new Set();
const limiteMascote={},limiteIA={};
function dentroDoLimite(mapa,chave,max){const a=Date.now(),l=mapa[chave]||{ini:a,n:0};if(a-l.ini>3600000){l.ini=a;l.n=0;}l.n++;mapa[chave]=l;return l.n<=max;}

function tempoValido(v,max){const n=Number(v);return(v!==null&&v!==undefined&&v!==''&&Number.isFinite(n)&&n>=0&&n<=max)?Math.round(n):null;}
function tempoCampo(v,max){const t=tempoValido(v,max);return t===null?{}:{tempo_ms:t};}
function json(res,data,status=200){res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));}
function redirect(res,loc){res.writeHead(302,{Location:loc});res.end();}
function bodyJson(req){return new Promise(r=>{let b='';req.on('data',c=>b+=c);req.on('end',()=>{try{r(JSON.parse(b));}catch{r({});}});});}

async function ultimaUnidadeId(){
  const uns=await db.allAsync('unidades',{ativa:1},'ordem');
  return uns.length?uns[uns.length-1].id:null;
}
async function estudanteConcluiuCurso(uid){
  const u=await ultimaUnidadeId();
  if(!u)return false;
  const p=await db.getAsync('progresso',{usuario_id:uid,unidade_id:u});
  return p&&p.status==='concluida';
}
async function podeAvaliacaoFinal(uid){
  if(await estudanteConcluiuCurso(uid))return true;
  const dr=await db.getAsync('diagnostico_respostas',{usuario_id:uid});
  return dr&&dr.percentual===100;
}
async function gerarCertificado(uid,nota){
  if(await db.getAsync('certificados',{usuario_id:uid}))return false;
  const u=await db.getAsync('usuarios',{id:uid});
  const codigo='CERT-'+crypto.randomBytes(4).toString('hex').toUpperCase();
  await db.insertAsync('certificados',{usuario_id:uid,nome_aluno:u.nome,codigo,nota_final:nota,data_emissao:new Date().toISOString()});
  return true;
}
function calcularUnidadeInicial(percentual){
  if(percentual===100)return'avaliacao_final';
  if(percentual>=80)return 5;
  if(percentual>=60)return 4;
  if(percentual>=50)return 3;
  if(percentual>=40)return 2;
  return 1;
}
async function desbloquearUnidadesAte(uid,unidadeOrdem){
  const unidades=await db.allAsync('unidades',{ativa:1},'ordem');
  for(const u of unidades){
    const existente=await db.getAsync('progresso',{usuario_id:uid,unidade_id:u.id});
    const status=u.ordem<=unidadeOrdem?'em_andamento':'bloqueada';
    if(existente){await db.updateAsync('progresso',{id:existente.id},{status});}
    else{await db.insertAsync('progresso',{usuario_id:uid,unidade_id:u.id,status,percentual:0});}
  }
}

const server=http.createServer(async(req,res)=>{
  const parsed=url.parse(req.url,true),pathname=parsed.pathname,method=req.method;
  const sess=getSession(req);setCookie(res,sess.id);cabecalhosBase(res);
  const usuario=sess.data.usuario||null;
  function reqAuth(){if(!usuario){redirect(res,'/login.html');return false;}return true;}
  function reqProf(){if(!usuario||usuario.tipo!=='professor'){json(res,{erro:'Acesso negado.'},403);return false;}return true;}

  if(!pathname.startsWith('/api/')){
    let fp=path.join(PUBLIC,pathname==='/'?'/index.html':pathname);
    if(!fp.startsWith(PUBLIC)){res.writeHead(403);res.end();return;}
    if(fs.existsSync(fp)&&fs.statSync(fp).isDirectory())fp=path.join(fp,'index.html');
    if(fs.existsSync(fp)){const ext=path.extname(fp);res.writeHead(200,{'Content-Type':MIME[ext]||'text/plain','Cache-Control':CACHE_ESTATICO[ext]||'no-cache'});fs.createReadStream(fp).pipe(res);}
    else{res.writeHead(404);res.end('Not found');}
    return;
  }

  const body=(method==='POST'||method==='PUT')?await bodyJson(req):{};

  if(pathname==='/api/auth/me'&&method==='GET')return json(res,usuario?{sucesso:true,usuario}:{sucesso:false});
  if(pathname==='/api/auth/logout'&&method==='POST'){sess.data.usuario=null;return json(res,{sucesso:true});}
  if(pathname==='/api/auth/login'&&method==='POST'){
    const u=await db.getAsync('usuarios',{email:body.email,senha:body.senha});
    if(!u)return json(res,{sucesso:false,erro:'E-mail ou senha incorretos.'});
    sess.data.usuario={id:u.id,nome:u.nome,email:u.email,tipo:u.tipo};
    return json(res,{sucesso:true,tipo:u.tipo});
  }
  if(pathname==='/api/auth/registro'&&method==='POST'){
    const{nome,email,senha,tipo}=body;
    if(!nome||!email||!senha)return json(res,{sucesso:false,erro:'Preencha todos os campos.'});
    if(await db.getAsync('usuarios',{email}))return json(res,{sucesso:false,erro:'E-mail ja cadastrado.'});
    const u=await db.insertAsync('usuarios',{nome,email,senha,tipo:tipo||'estudante',diagnostico_feito:0});
    const uns=await db.allAsync('unidades',{ativa:1},'ordem');
    for(const un of uns) await db.insertAsync('progresso',{usuario_id:u.id,unidade_id:un.id,status:'bloqueada',percentual:0});
    sess.data.usuario={id:u.id,nome:u.nome,email:u.email,tipo:u.tipo};
    return json(res,{sucesso:true});
  }

  if(pathname==='/api/perfil'&&method==='GET'){
    if(!reqAuth())return;
    const u=await db.getAsync('usuarios',{id:usuario.id});
    if(!u)return json(res,{sucesso:false});
    const respostas=await db.allAsync('respostas',{usuario_id:usuario.id});
    const acertos=respostas.filter(r=>r.correta===1||r.correta==='1').length;
    const concluidas=(await db.allAsync('progresso',{usuario_id:usuario.id,status:'concluida'})).length;
    const cert=await db.getAsync('certificados',{usuario_id:usuario.id});
    const diag=await db.getAsync('diagnostico_respostas',{usuario_id:usuario.id});
    const avFinal=await db.getAsync('avaliacao_final_respostas',{usuario_id:usuario.id});
    return json(res,{sucesso:true,perfil:{
      id:u.id,nome:u.nome,email:u.email,tipo:u.tipo,criado_em:u.criado_em,
      total_respostas:respostas.length,total_acertos:acertos,
      percentual_geral:respostas.length>0?Math.round((acertos/respostas.length)*100):0,
      unidades_concluidas:concluidas,
      total_unidades:(await db.allAsync('unidades',{ativa:1})).length,
      curso_concluido:await estudanteConcluiuCurso(usuario.id),
      certificado:cert||null,diagnostico_feito:u.diagnostico_feito||0,
      diagnostico_percentual:diag?diag.percentual:null,
      avaliacao_final:avFinal||null,
      pode_avaliacao_final:await podeAvaliacaoFinal(usuario.id)
    }});
  }
  if(pathname==='/api/perfil/atualizar'&&method==='POST'){
    if(!reqAuth())return;
    const{nome,email,senha_atual,nova_senha}=body;
    const u=await db.getAsync('usuarios',{id:usuario.id});
    if(!u)return json(res,{sucesso:false,erro:'Usuario nao encontrado.'});
    if(nova_senha){
      if(u.senha!==senha_atual)return json(res,{sucesso:false,erro:'Senha atual incorreta.'});
      await db.updateAsync('usuarios',{id:usuario.id},{nome,email,senha:nova_senha});
    }else{await db.updateAsync('usuarios',{id:usuario.id},{nome,email});}
    sess.data.usuario={...usuario,nome,email};
    return json(res,{sucesso:true});
  }

  if(pathname==='/api/diagnostico'&&method==='GET'){
    if(!reqAuth())return;
    const u=await db.getAsync('usuarios',{id:usuario.id});
    const feito=u&&u.diagnostico_feito;
    if(feito){
      const dr=await db.getAsync('diagnostico_respostas',{usuario_id:usuario.id});
      return json(res,{sucesso:true,feito:true,resultado:dr});
    }
    const questoes=(await db.allAsync('exercicios',{categoria:'diagnostica'},'ordem'))
      .map(e=>({...e,opcoes:e.opcoes?JSON.parse(e.opcoes):null}));
    return json(res,{sucesso:true,feito:false,questoes});
  }
  if(pathname==='/api/diagnostico/submeter'&&method==='POST'){
    if(!reqAuth())return;
    const uid=usuario.id;
    const{respostas:resp}=body;
    if(!resp||!resp.length)return json(res,{sucesso:false,erro:'Nenhuma resposta enviada.'});
    const tempoTotal=tempoValido(body.tempo_total_ms,14400000);
    let acertos=0;
    for(const r of resp){
      const ex=await db.getAsync('exercicios',{id:parseInt(r.exercicio_id)});
      if(!ex)continue;
      const correta=r.resposta_dada.trim().toLowerCase()===ex.resposta_correta.trim().toLowerCase()?1:0;
      if(correta)acertos++;
      await db.insertAsync('respostas',{usuario_id:uid,exercicio_id:parseInt(r.exercicio_id),resposta_dada:r.resposta_dada,correta,categoria:'diagnostica',...tempoCampo(r.tempo_ms,1800000)});
    }
    const total=resp.length,percentual=Math.round((acertos/total)*100);
    const destino=calcularUnidadeInicial(percentual);
    await db.insertAsync('diagnostico_respostas',{usuario_id:uid,total,acertos,percentual,destino:String(destino),...tempoCampo(tempoTotal,14400000)});
    await db.updateAsync('usuarios',{id:uid},{diagnostico_feito:1});
    if(destino==='avaliacao_final'){await desbloquearUnidadesAte(uid,5);}
    else{await desbloquearUnidadesAte(uid,destino);}
    return json(res,{sucesso:true,acertos,total,percentual,destino,tempo_ms:tempoTotal,
      mensagem:destino==='avaliacao_final'?'Parabens! Voce pode ir direto para a Avaliacao Final.':`Voce comeca na Unidade ${destino}.`});
  }

  if(pathname==='/api/avaliacao-final'&&method==='GET'){
    if(!reqAuth())return;
    if(!await podeAvaliacaoFinal(usuario.id))return json(res,{sucesso:false,erro:'Conclua todas as unidades primeiro.'});
    const feita=await db.getAsync('avaliacao_final_respostas',{usuario_id:usuario.id});
    if(feita)return json(res,{sucesso:true,feita:true,resultado:feita});
    const questoes=(await db.allAsync('exercicios',{categoria:'avaliacao_final'},'ordem'))
      .map(e=>({...e,opcoes:e.opcoes?JSON.parse(e.opcoes):null}));
    return json(res,{sucesso:true,feita:false,questoes});
  }
  if(pathname==='/api/avaliacao-final/submeter'&&method==='POST'){
    if(!reqAuth())return;
    const uid=usuario.id;
    if(!await podeAvaliacaoFinal(uid))return json(res,{sucesso:false,erro:'Sem permissao.'});
    const{respostas:resp}=body;
    if(!resp||!resp.length)return json(res,{sucesso:false,erro:'Nenhuma resposta.'});
    const tempoTotal=tempoValido(body.tempo_total_ms,14400000);
    let acertos=0;
    const detalhes=[];
    for(const r of resp){
      const ex=await db.getAsync('exercicios',{id:parseInt(r.exercicio_id)});
      if(!ex)continue;
      const correta=r.resposta_dada.trim().toLowerCase()===ex.resposta_correta.trim().toLowerCase()?1:0;
      if(correta)acertos++;
      await db.insertAsync('respostas',{usuario_id:uid,exercicio_id:parseInt(r.exercicio_id),resposta_dada:r.resposta_dada,correta,categoria:'avaliacao_final',...tempoCampo(r.tempo_ms,1800000)});
      detalhes.push({exercicio_id:ex.id,correta,explicacao:ex.explicacao,resposta_correta:ex.resposta_correta,resposta_dada:r.resposta_dada});
    }
    const total=resp.length,percentual=Math.round((acertos/total)*100);
    const aprovado=percentual>=META_APROVACAO;
    await db.insertAsync('avaliacao_final_respostas',{usuario_id:uid,total,acertos,percentual,aprovado:aprovado?1:0,...tempoCampo(tempoTotal,14400000)});
    let certGerado=false;
    if(aprovado)certGerado=await gerarCertificado(uid,percentual);
    return json(res,{sucesso:true,acertos,total,percentual,aprovado,certGerado,detalhes,tempo_ms:tempoTotal});
  }

  if(pathname==='/api/unidades'&&method==='GET'){
    if(!reqAuth())return;
    const uid=usuario.id;
    const unidades=await db.allAsync('unidades',{ativa:1},'ordem');
    const resultado=[];
    for(const u of unidades){
      const p=await db.getAsync('progresso',{usuario_id:uid,unidade_id:u.id});
      resultado.push({...u,status:p?p.status:'bloqueada',percentual:p?p.percentual:0});
    }
    const uObj=await db.getAsync('usuarios',{id:uid});
    const diag=await db.getAsync('diagnostico_respostas',{usuario_id:uid});
    return json(res,{sucesso:true,unidades:resultado,
      diagnostico_feito:uObj?uObj.diagnostico_feito||0:0,
      pode_avaliacao_final:await podeAvaliacaoFinal(uid),
      diagnostico:diag||null});
  }
  const mU=pathname.match(/^\/api\/unidades\/(\d+)$/);
  if(mU&&method==='GET'){
    if(!reqAuth())return;
    const u=await db.getAsync('unidades',{id:parseInt(mU[1])});
    if(!u)return json(res,{sucesso:false,erro:'Nao encontrada.'});
    const p=await db.getAsync('progresso',{usuario_id:usuario.id,unidade_id:u.id});
    return json(res,{sucesso:true,unidade:{...u,status:p?p.status:'bloqueada',percentual:p?p.percentual:0},
      conteudos:await db.allAsync('conteudos',{unidade_id:u.id},'ordem')});
  }

  const mEx=pathname.match(/^\/api\/exercicios\/(\d+)$/);
  if(mEx&&method==='GET'){
    if(!reqAuth())return;
    const filtro={unidade_id:parseInt(mEx[1])};
    if(parsed.query.categoria)filtro.categoria=parsed.query.categoria;
    const todos=(await db.allAsync('exercicios',filtro,'ordem'))
      .map(e=>({...e,opcoes:e.opcoes?JSON.parse(e.opcoes):null}));

    const{publicas,descartadas}=validacao.filtrarExerciciosPublicos(todos);
    descartadas.forEach(d=>{if(!avisadas.has(d.id)){avisadas.add(d.id);console.warn('[conteudo] exercicio '+d.id+' oculto dos estudantes: '+d.motivo+'. Corrija em Gerenciar ou rode db/atualizar_conteudo.js.');}});
    return json(res,{sucesso:true,exercicios:publicas});
  }
  if(pathname==='/api/exercicios/responder'&&method==='POST'){
    if(!reqAuth())return;
    const ex=await db.getAsync('exercicios',{id:parseInt(body.exercicio_id)});
    if(!ex)return json(res,{sucesso:false,erro:'Nao encontrado.'});
    if(typeof body.resposta_dada!=='string')return json(res,{sucesso:false,erro:'Resposta invalida.'},400);

    const normResp=v=>{const t=String(v).trim();if(t.startsWith('[')){try{return JSON.stringify(JSON.parse(t)).toLowerCase();}catch(e){}}return t.toLowerCase();};
    const correta=normResp(body.resposta_dada)===normResp(ex.resposta_correta)?1:0;

    const anteriores=await db.allAsync('respostas',{usuario_id:usuario.id,exercicio_id:parseInt(body.exercicio_id)});
    const reg={usuario_id:usuario.id,exercicio_id:parseInt(body.exercicio_id),resposta_dada:body.resposta_dada,correta,categoria:ex.categoria,
      unidade_id:ex.unidade_id==null?null:ex.unidade_id,tentativa:anteriores.length+1};
    const t=Number(body.tempo_ms);
    if(Number.isFinite(t)&&t>=0&&t<=1800000)reg.tempo_ms=Math.round(t);
    await db.insertAsync('respostas',reg);
    return json(res,{sucesso:true,correta:correta===1,explicacao:ex.explicacao,resposta_correta:ex.resposta_correta});
  }

  if(pathname==='/api/telemetria'&&method==='POST'){
    if(!usuario)return json(res,{sucesso:false},401);
    if(usuario.tipo!=='estudante')return json(res,{sucesso:true,registrados:0});
    const eventos=Array.isArray(body.eventos)?body.eventos.slice(0,20):[];
    const agora=Date.now(),lim=limiteTelemetria[usuario.id]||{inicio:agora,n:0};
    if(agora-lim.inicio>3600000){lim.inicio=agora;lim.n=0;}
    let registrados=0;
    for(const ev of eventos){
      if(lim.n>=600)break;
      const unidade_id=parseInt(ev&&ev.unidade_id);
      if(!Number.isInteger(unidade_id)||unidade_id<1)continue;
      let reg=null;
      if(ev.tipo==='aba_tempo'&&ABAS_VALIDAS.includes(ev.aba)){
        const ms=Math.round(Number(ev.tempo_ms));
        if(Number.isFinite(ms)&&ms>=1000&&ms<=1800000)reg={tipo:'aba_tempo',unidade_id,aba:ev.aba,tempo_ms:ms};
      }else if(ev.tipo==='unidade_aberta'){reg={tipo:'unidade_aberta',unidade_id};}
      else if(ev.tipo==='unidade_resultado'){
        const pct=Math.round(Number(ev.percentual)),ac=Math.round(Number(ev.acertos)),tot=Math.round(Number(ev.total));
        if(pct>=0&&pct<=100&&ac>=0&&tot>=1&&ac<=tot)reg={tipo:'unidade_resultado',unidade_id,percentual:pct,acertos:ac,total:tot,...tempoCampo(ev.tempo_ms,7200000)};
      }
      if(!reg)continue;
      await db.insertAsync('telemetria',{usuario_id:usuario.id,...reg});
      registrados++;lim.n++;
    }
    limiteTelemetria[usuario.id]=lim;
    return json(res,{sucesso:true,registrados});
  }

  if(pathname==='/api/mascote/perguntar'&&method==='POST'){
    const pergunta=typeof body.pergunta==='string'?body.pergunta.trim().slice(0,300):'';
    const idEntrada=typeof body.id==='string'?body.id.slice(0,40):null;
    const pagina=typeof body.pagina==='string'?body.pagina.slice(0,30):'';
    const chaveLim=usuario?'u'+usuario.id:'s'+sess.id;
    if(!dentroDoLimite(limiteMascote,chaveLim,120))return json(res,{sucesso:false,erro:'Muitas perguntas em pouco tempo. Aguarde alguns minutos.'},429);
    let modoAvaliacao=mascote.PAGINAS_AVALIACAO.includes(pagina),preDiagnostico=false;
    if(usuario&&usuario.tipo==='estudante'){
      const u=await db.getAsync('usuarios',{id:usuario.id});
      if(u&&!u.diagnostico_feito){modoAvaliacao=true;preDiagnostico=!mascote.PAGINAS_AVALIACAO.includes(pagina);}
    }
    const chaveIA=process.env.ANTHROPIC_API_KEY;
    const usarIA=!!(chaveIA&&usuario&&dentroDoLimite(limiteIA,'u'+usuario.id,15));
    const r=await mascote.responder({pergunta,id:idEntrada,pagina,papel:usuario?usuario.tipo:'estudante',modoAvaliacao,preDiagnostico,logado:!!usuario},
      {ia:usarIA?{chave:chaveIA,modelo:process.env.MASCOTE_MODELO||'claude-haiku-5-5'}:null});
    return json(res,{sucesso:true,...r});
  }

  if(pathname==='/api/progresso'&&method==='GET'){
    if(!reqAuth())return;
    const uid=usuario.id;
    const unidades=await db.allAsync('unidades',{ativa:1},'ordem');
    const progresso=[];
    for(const u of unidades){
      const p=await db.getAsync('progresso',{usuario_id:uid,unidade_id:u.id});
      progresso.push({...u,status:p?p.status:'bloqueada',percentual:p?p.percentual:0});
    }
    const respostas=(await db.allAsync('respostas',{usuario_id:uid})).filter(r=>r.categoria==='formativa');
    const acertos=respostas.filter(r=>r.correta===1||r.correta==='1').length;
    const diagRes=await db.getAsync('diagnostico_respostas',{usuario_id:uid});
    const avRes=await db.getAsync('avaliacao_final_respostas',{usuario_id:uid});
    return json(res,{sucesso:true,progresso,
      estatisticas:{total_respostas:respostas.length,total_acertos:acertos,
        percentual_geral:respostas.length>0?Math.round((acertos/respostas.length)*100):0},
      diagnostico:diagRes||null,avaliacao_final:avRes||null,
      pode_avaliacao_final:await podeAvaliacaoFinal(uid)});
  }
  const mConc=pathname.match(/^\/api\/progresso\/concluir\/(\d+)$/);
  if(mConc&&method==='POST'){
    if(!reqAuth())return;
    const unidadeId=parseInt(mConc[1]),uid=usuario.id;
    const{percentual}=body;
    const p=await db.getAsync('progresso',{usuario_id:uid,unidade_id:unidadeId});
    if(percentual>=META_APROVACAO){
      if(p)await db.updateAsync('progresso',{id:p.id},{status:'concluida',percentual});
      else await db.insertAsync('progresso',{usuario_id:uid,unidade_id:unidadeId,status:'concluida',percentual});
      const atual=await db.getAsync('unidades',{id:unidadeId});
      const todas=await db.allAsync('unidades',{},'ordem');
      const proxima=todas.find(u=>u.ordem===atual.ordem+1);
      if(proxima){
        const pp=await db.getAsync('progresso',{usuario_id:uid,unidade_id:proxima.id});
        if(pp)await db.updateAsync('progresso',{id:pp.id},{status:'em_andamento'});
        else await db.insertAsync('progresso',{usuario_id:uid,unidade_id:proxima.id,status:'em_andamento',percentual:0});
      }
      return json(res,{sucesso:true,desbloqueou:!!proxima,curso_concluido:await estudanteConcluiuCurso(uid)});
    }else{
      if(p)await db.updateAsync('progresso',{id:p.id},{percentual});
      else await db.insertAsync('progresso',{usuario_id:uid,unidade_id:unidadeId,status:'em_andamento',percentual});
      return json(res,{sucesso:false,mensagem:`Minimo ${META_APROVACAO}% para avancar.`});
    }
  }

  if(pathname==='/api/certificado'&&method==='GET'){
    if(!reqAuth())return;
    const cert=await db.getAsync('certificados',{usuario_id:usuario.id});
    if(!cert)return json(res,{sucesso:false,erro:'Certificado nao disponivel.'});
    return json(res,{sucesso:true,certificado:cert});
  }

  if(pathname==='/api/professor/estudantes'&&method==='GET'){
    if(!reqAuth()||!reqProf())return;
    const estudantes=await db.allAsync('usuarios',{tipo:'estudante'});
    const resultado=[];
    for(const u of estudantes){
      const r=await db.allAsync('respostas',{usuario_id:u.id});
      const acertos=r.filter(x=>x.correta===1||x.correta==='1').length;
      const cert=await db.getAsync('certificados',{usuario_id:u.id});
      const diag=await db.getAsync('diagnostico_respostas',{usuario_id:u.id});
      const avFinal=await db.getAsync('avaliacao_final_respostas',{usuario_id:u.id});
      resultado.push({...semSenha(u),exercicios_feitos:r.length,acertos,
        percentual:r.length>0?Math.round((acertos/r.length)*100):0,
        unidades_concluidas:(await db.allAsync('progresso',{usuario_id:u.id,status:'concluida'})).length,
        curso_concluido:await estudanteConcluiuCurso(u.id),
        certificado:cert||null,diagnostico:diag||null,avaliacao_final:avFinal||null});
    }
    return json(res,{sucesso:true,estudantes:resultado});
  }
  if(pathname==='/api/professor/estudante'&&method==='GET'){
    if(!reqAuth()||!reqProf())return;
    const uid=parseInt(parsed.query.id);
    const u=await db.getAsync('usuarios',{id:uid,tipo:'estudante'});
    if(!u)return json(res,{sucesso:false,erro:'Nao encontrado.'});
    const respostas=await db.allAsync('respostas',{usuario_id:uid});
    const acertos=respostas.filter(r=>r.correta===1||r.correta==='1').length;
    const unidades=await db.allAsync('unidades',{ativa:1},'ordem');
    const progresso=[];
    for(const un of unidades){
      const p=await db.getAsync('progresso',{usuario_id:uid,unidade_id:un.id});
      progresso.push({...un,status:p?p.status:'bloqueada',percentual:p?p.percentual:0});
    }
    return json(res,{sucesso:true,estudante:{
      ...semSenha(u),total_respostas:respostas.length,total_acertos:acertos,
      percentual_geral:respostas.length>0?Math.round((acertos/respostas.length)*100):0,
      progresso,certificado:await db.getAsync('certificados',{usuario_id:uid})||null,
      diagnostico:await db.getAsync('diagnostico_respostas',{usuario_id:uid})||null,
      avaliacao_final:await db.getAsync('avaliacao_final_respostas',{usuario_id:uid})||null
    }});
  }

  if(pathname==='/api/professor/analytics'&&method==='GET'){
    if(!reqAuth()||!reqProf())return;
    const excluirTeste=parsed.query.incluir_teste!=='1';
    const dados={
      usuarios:await db.allAsync('usuarios',{tipo:'estudante'}),
      unidades:await db.allAsync('unidades',{ativa:1},'ordem'),
      exercicios:await db.allAsync('exercicios',{}),
      respostas:await db.allAsync('respostas',{}),
      progresso:await db.allAsync('progresso',{}),
      telemetria:await db.allAsync('telemetria',{}),
      diagnosticos:await db.allAsync('diagnostico_respostas',{}),
      finais:await db.allAsync('avaliacao_final_respostas',{})
    };
    return json(res,{sucesso:true,...calcularAnalytics(dados,{excluirTeste})});
  }
  if(pathname==='/api/professor/conta-teste'&&method==='POST'){
    if(!reqAuth()||!reqProf())return;
    const id=parseInt(body.id);
    const alvo=await db.getAsync('usuarios',{id,tipo:'estudante'});
    if(!alvo)return json(res,{sucesso:false,erro:'Estudante nao encontrado.'},404);
    await db.updateAsync('usuarios',{id},{conta_teste:body.valor?1:0});
    return json(res,{sucesso:true});
  }

  if(pathname==='/api/admin/conteudo'&&method==='POST'){
    if(!reqAuth()||!reqProf())return;
    const{unidade_id,titulo,corpo,tipo,ordem}=body;
    const c=await db.insertAsync('conteudos',{unidade_id:parseInt(unidade_id),titulo,corpo,tipo:tipo||'texto',ordem:parseInt(ordem)||1});
    return json(res,{sucesso:true,id:c.id});
  }
  const mPC=pathname.match(/^\/api\/admin\/conteudo\/(\d+)$/);
  if(mPC&&method==='PUT'){
    if(!reqAuth()||!reqProf())return;
    const{titulo,corpo,tipo,ordem}=body;
    await db.updateAsync('conteudos',{id:parseInt(mPC[1])},{titulo,corpo,tipo,ordem:parseInt(ordem)||1});
    return json(res,{sucesso:true});
  }
  if(mPC&&method==='DELETE'){if(!reqAuth()||!reqProf())return;await db.deleteAsync('conteudos',{id:parseInt(mPC[1])});return json(res,{sucesso:true});}

  if(pathname==='/api/admin/exercicio'&&method==='POST'){
    if(!reqAuth()||!reqProf())return;
    const{unidade_id,enunciado,tipo,opcoes,resposta_correta,explicacao,categoria,ordem}=body;

    const errosCad=validacao.validarExercicio({enunciado,tipo,opcoes,resposta_correta,explicacao});
    if(errosCad.length)return json(res,{sucesso:false,erro:errosCad.join(' '),erros:errosCad},400);
    const dup=validacao.encontrarDuplicada({enunciado,unidade_id,categoria:categoria||'formativa'},await db.allAsync('exercicios',unidade_id?{unidade_id:parseInt(unidade_id)}:{}));
    if(dup)return json(res,{sucesso:false,erro:'Ja existe uma questao igual nesta unidade (ID '+dup.id+'). Reformule ou edite a existente.'},409);
    const e=await db.insertAsync('exercicios',{
      unidade_id:unidade_id?parseInt(unidade_id):null,enunciado,tipo,
      opcoes:opcoes?JSON.stringify(opcoes):null,
      resposta_correta,explicacao:explicacao||'',
      categoria:categoria||'formativa',ordem:parseInt(ordem)||1
    });
    return json(res,{sucesso:true,id:e.id});
  }
  const mPE=pathname.match(/^\/api\/admin\/exercicio\/(\d+)$/);
  if(mPE&&method==='PUT'){
    if(!reqAuth()||!reqProf())return;
    const{enunciado,tipo,opcoes,resposta_correta,explicacao,categoria,ordem}=body;
    const errosEd=validacao.validarExercicio({enunciado,tipo,opcoes,resposta_correta,explicacao});
    if(errosEd.length)return json(res,{sucesso:false,erro:errosEd.join(' '),erros:errosEd},400);
    const atualEx=await db.getAsync('exercicios',{id:parseInt(mPE[1])});
    if(!atualEx)return json(res,{sucesso:false,erro:'Questao nao encontrada.'},404);
    const dupEd=validacao.encontrarDuplicada({enunciado,unidade_id:atualEx.unidade_id,categoria:categoria||atualEx.categoria||'formativa'},await db.allAsync('exercicios',atualEx.unidade_id!=null?{unidade_id:atualEx.unidade_id}:{}),atualEx.id);
    if(dupEd)return json(res,{sucesso:false,erro:'Ja existe uma questao igual nesta unidade (ID '+dupEd.id+').'},409);
    await db.updateAsync('exercicios',{id:parseInt(mPE[1])},{enunciado,tipo,
      opcoes:opcoes?JSON.stringify(opcoes):null,
      resposta_correta,explicacao:explicacao||'',
      categoria:categoria||'formativa',ordem:parseInt(ordem)||1});
    return json(res,{sucesso:true});
  }
  if(mPE&&method==='DELETE'){if(!reqAuth()||!reqProf())return;await db.deleteAsync('exercicios',{id:parseInt(mPE[1])});return json(res,{sucesso:true});}

  if(pathname==='/api/admin/exercicios'&&method==='GET'){
    if(!reqAuth()||!reqProf())return;
    const{categoria}=parsed.query;
    let filtro={};if(categoria)filtro.categoria=categoria;
    return json(res,{sucesso:true,exercicios:(await db.allAsync('exercicios',filtro,'ordem'))
      .map(e=>({...e,opcoes:e.opcoes?JSON.parse(e.opcoes):null}))});
  }

  json(res,{erro:'Rota nao encontrada.'},404);
});

inicializar().then(()=>{
  server.listen(PORT,()=>{
    console.log('\n  ========================================');
    console.log('   Typeoff rodando! http://localhost:'+PORT);
    console.log('   Firebase: conectado');
    console.log('  ========================================\n');
  });
}).catch(err=>{
  console.error('Erro ao conectar Firebase:', err);
  process.exit(1);
});
