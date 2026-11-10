function lum(hex){const h=hex.replace('#','');const c=[0,2,4].map(i=>parseInt(h.substr(i,2),16)/255).map(v=>v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4));return .2126*c[0]+.7152*c[1]+.0722*c[2];}
function razao(a,b){const [x,y]=[lum(a),lum(b)].sort((p,q)=>q-p);return (x+0.05)/(y+0.05);}
module.exports={lum,razao};
if(require.main===module){const [a,b]=process.argv.slice(2);console.log(razao(a,b).toFixed(2));}
