(function () {
  var ESCALAS = [0.9, 1, 1.15, 1.3, 1.5];
  var PADRAO = 1;
  function ler(chave) { try { return localStorage.getItem(chave); } catch (e) { return null; } }
  function gravar(chave, valor) { try { localStorage.setItem(chave, valor); } catch (e) {  } }
  var so = document.currentScript && document.currentScript.hasAttribute('data-escala-apenas');
  var raiz = document.documentElement;

  if (!so && ler('typeoff_tema') === 'escuro') raiz.setAttribute('data-theme', 'dark');
  if (ler('typeoff_movimento') === 'reduzido') raiz.setAttribute('data-movimento', 'reduzido');

  function indiceSalvo() {
    var i = parseInt(ler('typeoff_fonte'), 10);
    return (i >= 0 && i < ESCALAS.length) ? i : PADRAO;
  }
  function aplicar(i) {
    i = Math.max(0, Math.min(ESCALAS.length - 1, i));
    raiz.style.setProperty('--escala-fonte', ESCALAS[i]);
    raiz.setAttribute('data-fonte', String(i));
    gravar('typeoff_fonte', String(i));
    return i;
  }
  raiz.style.setProperty('--escala-fonte', ESCALAS[indiceSalvo()]);
  raiz.setAttribute('data-fonte', String(indiceSalvo()));
  window.TypeoffFonte = { ESCALAS: ESCALAS, PADRAO: PADRAO, indice: function () { return parseInt(raiz.getAttribute('data-fonte'), 10); }, aplicar: aplicar };
})();
