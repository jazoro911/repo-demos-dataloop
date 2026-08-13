/* ═══════════════════════════════════════════════════════════════
   global-search.js — Buscador global Dataloop
   Busca texto dentro de todos los archivos de demos indexados.
   
   CÓMO FUNCIONA:
   1. Carga search-index.json con la lista de archivos por código
   2. Al buscar, hace fetch() de cada archivo HTML
   3. Busca el query dentro del contenido del archivo
   4. Muestra resultados con el nombre del archivo y su código padre

   USO: incluir en cada página antes de </body>
   <script src="[ruta-raiz]/global-search.js"></script>
   ═══════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════
   NAVEGACIÓN RETRÁCTIL + MODO OSCURO — compartido en todo el sitio
   ═══════════════════════════════════════════════════════════════
   Estas funciones son globales (no están dentro de un IIFE) porque
   los botones del riel las llaman con onclick="toggleSidebar()" /
   onclick="toggleTema()" en cada página. Así una sola copia de este
   archivo controla el sidebar y el tema en TODAS las páginas del
   sitio — no hay que repetir este script en cada HTML.
   ═══════════════════════════════════════════════════════════════ */
function abrirSidebar() {
  var sidebar = document.getElementById('sidebar');
  var overlay = document.getElementById('sidebar-overlay');
  if (sidebar) sidebar.classList.add('abierto');
  if (overlay) overlay.classList.add('activo');
}

function cerrarSidebar() {
  var sidebar = document.getElementById('sidebar');
  var overlay = document.getElementById('sidebar-overlay');
  if (sidebar) sidebar.classList.remove('abierto');
  if (overlay) overlay.classList.remove('activo');
}

function toggleSidebar() {
  var sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  if (sidebar.classList.contains('abierto')) {
    cerrarSidebar();
  } else {
    abrirSidebar();
  }
}

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') cerrarSidebar();
});

function actualizarIconoTema(tema) {
  var icono = document.getElementById('icono-tema');
  if (icono) icono.textContent = (tema === 'oscuro') ? '☀️' : '🌙';
}

function toggleTema() {
  var actual = document.documentElement.getAttribute('data-theme') === 'oscuro' ? 'oscuro' : 'claro';
  var nuevo = actual === 'oscuro' ? 'claro' : 'oscuro';
  document.documentElement.setAttribute('data-theme', nuevo);
  try { localStorage.setItem('tema-dataloop', nuevo); } catch (err) {}
  actualizarIconoTema(nuevo);
}

/* Sincroniza el ícono de sol/luna con el tema ya aplicado en <html>
   (el <script> inline en el <head> de cada página ya puso el
   data-theme correcto antes de pintar, para evitar parpadeos).
   Diferido a DOMContentLoaded porque el botón #icono-tema todavía
   no existe cuando este script se ejecuta (se carga antes de <body>). */
function sincronizarIconoInicial() {
  actualizarIconoTema(document.documentElement.getAttribute('data-theme'));
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', sincronizarIconoInicial);
} else {
  sincronizarIconoInicial();
}


(function () {

  /* ── Detectar profundidad de la página para construir rutas ── */
  var path    = window.location.pathname;
  var depth   = (path.match(/\//g) || []).length;
  /* index.html = depth 1, categorias/ = depth 2, codigos/gob-001/ = depth 3 */
  var root = '';
  if      (path.includes('/codigos/'))   root = '../../';
  else if (path.includes('/categorias/')) root = '../';
  else                                    root = '';

  var INDEX_URL = root + 'search-index.json';

  /* ── Estado global ── */
  var searchIndex   = null;   /* array cargado desde JSON          */
  var fileCache     = {};     /* cache: ruta → contenido texto      */
  var panelVisible  = false;
  var lastQuery     = '';
  var searchTimeout = null;

  /* ── Inyectar HTML del panel ── */
  var panelHTML = `
<div id="gs-panel" style="display:none;">
  <div id="gs-header">
    <span id="gs-title">Buscar en demos</span>
    <button id="gs-close" title="Cerrar">✕</button>
  </div>
  <div id="gs-input-wrap">
    <input id="gs-input" type="text" placeholder="Ej: IMM_TEND, waterfall, kpi..." autocomplete="off" spellcheck="false">
    <span id="gs-spinner" style="display:none;">⏳</span>
  </div>
  <div id="gs-status"></div>
  <div id="gs-results"></div>
</div>
<style>
  #gs-panel {
    position: fixed;
    top: 0; left: 0;
    width: 100%; height: 100%;
    background: rgba(10,20,40,.55);
    backdrop-filter: blur(3px);
    z-index: 9999;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 80px;
  }
  #gs-box {
    background: #fff;
    border-radius: 14px;
    box-shadow: 0 12px 48px rgba(0,0,0,.25);
    width: 580px;
    max-width: 95vw;
    max-height: 70vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  #gs-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 18px 0;
  }
  #gs-title {
    font-family: 'Montserrat', sans-serif;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .08em;
    color: #6B8AAB;
  }
  #gs-close {
    background: none;
    border: none;
    font-size: 16px;
    cursor: pointer;
    color: #6B8AAB;
    padding: 2px 6px;
    border-radius: 4px;
  }
  #gs-close:hover { background: #f0f4f8; }
  #gs-input-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 18px;
    border-bottom: 1px solid #e8ecf5;
  }
  #gs-input {
    flex: 1;
    border: none;
    outline: none;
    font-size: 16px;
    font-family: inherit;
    color: #1C334F;
    background: transparent;
  }
  #gs-input::placeholder { color: #b0bec5; }
  #gs-status {
    font-size: 11px;
    color: #9aacbc;
    padding: 6px 18px 0;
    min-height: 20px;
  }
  #gs-results {
    overflow-y: auto;
    flex: 1;
    padding: 6px 0 12px;
  }
  .gs-result-group {
    padding: 8px 18px 4px;
  }
  .gs-group-header {
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: .08em;
    color: #1C334F;
    margin-bottom: 6px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .gs-group-cat {
    font-size: 9px;
    font-weight: 600;
    color: #9aacbc;
    text-transform: uppercase;
  }
  .gs-result-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 7px 10px;
    border-radius: 7px;
    cursor: pointer;
    text-decoration: none;
    transition: background .12s;
    gap: 10px;
  }
  .gs-result-item:hover { background: #f0f5ff; }
  .gs-result-left {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }
  .gs-result-icon { font-size: 14px; flex-shrink: 0; }
  .gs-result-file {
    font-size: 12px;
    font-weight: 700;
    color: #1C334F;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .gs-result-match {
    font-size: 10px;
    color: #64748b;
    margin-top: 1px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 320px;
  }
  .gs-result-match mark {
    background: #fef08a;
    color: #1C334F;
    border-radius: 2px;
    padding: 0 2px;
    font-weight: 700;
  }
  .gs-result-arrow {
    color: #c5d5e8;
    font-size: 14px;
    flex-shrink: 0;
  }
  .gs-empty {
    text-align: center;
    padding: 32px 18px;
    color: #9aacbc;
    font-size: 13px;
  }
  .gs-empty-icon { font-size: 32px; margin-bottom: 8px; }
  .gs-divider {
    height: 1px;
    background: #f0f4f8;
    margin: 6px 18px;
  }
</style>
`;

  /* Wrap panel in a box div (esto solo arma el fragmento en memoria,
     no toca document.body todavía — eso se hace en inyectarPanel(),
     diferido hasta que el DOM esté listo) */
  var wrapper = document.createElement('div');
  wrapper.innerHTML = panelHTML;
  /* Wrap the inner content */
  var panel = wrapper.querySelector('#gs-panel');
  var box   = document.createElement('div');
  box.id    = 'gs-box';
  /* Move children except style into box */
  var children = Array.from(panel.children).filter(function(c){ return c.tagName !== 'STYLE'; });
  children.forEach(function(c){ box.appendChild(c); });
  panel.insertBefore(box, panel.firstChild);
  var style = wrapper.querySelector('style');

  function inyectarPanel() {
    document.body.appendChild(panel);
    if (style) document.head.appendChild(style);
  }

  /* ── Activar buscador del sidebar ── */
  function hookSidebar() {
    var sb = document.getElementById('buscador-sidebar') || document.querySelector('.sidebar-buscador');
    if (!sb) return;
    /* Cambiar placeholder */
    sb.placeholder = '🔍 Buscar en demos...';
    sb.addEventListener('focus', function(){ openPanel(this.value); });
    sb.addEventListener('input', function(){
      openPanel(this.value);
      document.getElementById('gs-input').value = this.value;
      triggerSearch(this.value);
    });
    sb.addEventListener('keydown', function(e){
      if(e.key === 'Enter') { openPanel(this.value); }
    });
  }

  /* ── Abrir / cerrar panel ── */
  function openPanel(query) {
    panel.style.display = 'flex';
    panelVisible = true;
    var inp = document.getElementById('gs-input');
    inp.value = query || '';
    setTimeout(function(){ inp.focus(); }, 50);
    if(query) triggerSearch(query);
    loadIndex();
  }

  function closePanel() {
    panel.style.display = 'none';
    panelVisible = false;
    /* Clear sidebar input */
    var sb = document.getElementById('buscador-sidebar') || document.querySelector('.sidebar-buscador');
    if(sb) sb.value = '';
  }

  panel.addEventListener('click', function(e){
    if(e.target === panel) closePanel();
  });
  panel.querySelector('#gs-close').addEventListener('click', closePanel);
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape' && panelVisible) closePanel();
  });

  panel.querySelector('#gs-input').addEventListener('input', function(){
    triggerSearch(this.value);
  });

  /* ── Cargar índice ── */
  function loadIndex() {
    if(searchIndex) return;
    fetch(INDEX_URL)
      .then(function(r){ return r.json(); })
      .then(function(data){
        searchIndex = data;
        setStatus('Índice cargado · ' + data.reduce(function(a,c){ return a+c.archivos.length; },0) + ' archivos indexados');
        setTimeout(function(){ setStatus(''); }, 2000);
        var q = document.getElementById('gs-input').value;
        if(q.trim().length >= 2) triggerSearch(q);
      })
      .catch(function(){ setStatus('⚠️ No se pudo cargar el índice'); });
  }

  /* ── Buscar ── */
  function triggerSearch(q) {
    clearTimeout(searchTimeout);
    q = q.trim();
    if(q === lastQuery) return;
    if(q.length < 2) {
      document.getElementById('gs-results').innerHTML = '';
      setStatus('');
      return;
    }
    searchTimeout = setTimeout(function(){ doSearch(q); }, 280);
  }

  function doSearch(q) {
    lastQuery = q;
    if(!searchIndex) { setStatus('Cargando índice...'); loadIndex(); return; }

    setStatus('Buscando...');
    showSpinner(true);
    document.getElementById('gs-results').innerHTML = '';

    var results   = [];
    var pending   = 0;
    var qLower    = q.toLowerCase();

    searchIndex.forEach(function(entry) {
      entry.archivos.forEach(function(archivo) {
        /* 1. Coincidencia en nombre de archivo — inmediata */
        if(archivo.toLowerCase().includes(qLower)) {
          results.push({
            codigo:   entry.codigo,
            titulo:   entry.titulo,
            categoria:entry.categoria,
            url:      root + entry.url,
            archivo:  archivo,
            snippet:  'Nombre de archivo coincide',
            matchName: true
          });
        }

        /* 2. Coincidencia en contenido — fetch */
        var fileUrl = root + 'codigos/' + entry.codigo + '/' + archivo;
        pending++;
        fetchFile(fileUrl, function(text) {
          pending--;
          if(text) {
            var idx = text.toLowerCase().indexOf(qLower);
            if(idx >= 0) {
              /* Evitar duplicado si ya apareció por nombre */
              var alreadyByName = results.some(function(r){
                return r.codigo===entry.codigo && r.archivo===archivo && r.matchName;
              });
              if(!alreadyByName) {
                var snippet = extractSnippet(text, idx, q.length);
                results.push({
                  codigo:   entry.codigo,
                  titulo:   entry.titulo,
                  categoria:entry.categoria,
                  url:      root + entry.url,
                  archivo:  archivo,
                  snippet:  snippet,
                  matchName: false
                });
              }
            }
          }
          if(pending === 0) renderResults(results, q);
        });
      });
    });

    if(pending === 0) renderResults(results, q);
  }

  function fetchFile(url, cb) {
    if(fileCache[url] !== undefined) { cb(fileCache[url]); return; }
    fetch(url)
      .then(function(r){ return r.ok ? r.text() : null; })
      .then(function(t){ fileCache[url] = t || ''; cb(fileCache[url]); })
      .catch(function(){ fileCache[url] = ''; cb(''); });
  }

  function extractSnippet(text, idx, qLen) {
    var start = Math.max(0, idx - 40);
    var end   = Math.min(text.length, idx + qLen + 80);
    var raw   = text.slice(start, end).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return (start > 0 ? '…' : '') + raw + (end < text.length ? '…' : '');
  }

  /* ── Render resultados ── */
  function renderResults(results, q) {
    showSpinner(false);
    var container = document.getElementById('gs-results');

    if(!results.length) {
      setStatus('');
      container.innerHTML = '<div class="gs-empty"><div class="gs-empty-icon">🔍</div>Sin resultados para <strong>"' + escHTML(q) + '"</strong></div>';
      return;
    }

    /* Agrupar por código */
    var groups = {};
    results.forEach(function(r){
      if(!groups[r.codigo]) groups[r.codigo] = { titulo: r.titulo, categoria: r.categoria, url: r.url, items: [] };
      groups[r.codigo].items.push(r);
    });

    setStatus(results.length + ' resultado' + (results.length!==1?'s':'') + ' en ' + Object.keys(groups).length + ' código' + (Object.keys(groups).length!==1?'s':''));

    var html = '';
    var first = true;
    Object.keys(groups).forEach(function(cod){
      var g = groups[cod];
      if(!first) html += '<div class="gs-divider"></div>';
      first = false;
      html += '<div class="gs-result-group">';
      html += '<div class="gs-group-header">🗂️ ' + escHTML(g.titulo) + ' <span class="gs-group-cat">' + escHTML(g.categoria) + '</span></div>';
      g.items.forEach(function(item){
        var highlighted = highlightMatch(item.snippet, q);
        html += '<a class="gs-result-item" href="' + escHTML(item.url) + '">';
        html += '  <div class="gs-result-left">';
        html += '    <span class="gs-result-icon">' + (item.matchName ? '📄' : '🔎') + '</span>';
        html += '    <div>';
        html += '      <div class="gs-result-file">' + escHTML(item.archivo) + '</div>';
        html += '      <div class="gs-result-match">' + highlighted + '</div>';
        html += '    </div>';
        html += '  </div>';
        html += '  <span class="gs-result-arrow">→</span>';
        html += '</a>';
      });
      html += '</div>';
    });

    container.innerHTML = html;
  }

  function highlightMatch(text, q) {
    var escaped = escHTML(text);
    var re = new RegExp('(' + escRE(escHTML(q)) + ')', 'gi');
    return escaped.replace(re, '<mark>$1</mark>');
  }

  /* ── Utilidades ── */
  function setStatus(msg) { document.getElementById('gs-status').textContent = msg; }
  function showSpinner(v) { document.getElementById('gs-spinner').style.display = v ? 'inline' : 'none'; }
  function escHTML(s)     { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function escRE(s)       { return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }

  /* ── Init ── */
  function iniciar() {
    inyectarPanel();
    hookSidebar();
  }

  if(document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }

  loadIndex();

})();


/* ═══════════════════════════════════════════════════════════════
   TRANSICIÓN DESLIZANTE — solo al abrir un folder
   ═══════════════════════════════════════════════════════════════
   Control manual con clases CSS + setTimeout, NO con la API nativa
   de transiciones del navegador (esa dependía de que el navegador
   soportara @view-transition/pageswap y no se podía confirmar que
   funcionara igual en todos los casos). Este método funciona en
   cualquier navegador porque son solo animaciones CSS normales:

   1. Al hacer click en un .folder-card, se cancela la navegación,
      se le agrega la clase "pagina-saliendo" al <body> (definida en
      styles.css) y se guarda una bandera en sessionStorage.
   2. Cuando termina la animación de salida, recién ahí se navega
      de verdad al código.
   3. La página de destino, al cargar, revisa esa bandera: si viene
      de un folder, agrega "pagina-entrando" al <body> y la bandera
      se borra para que no se repita si luego recargas o navegas
      por el sidebar.
   ═══════════════════════════════════════════════════════════════ */
(function () {

  var STORAGE_KEY  = 'dl-viene-de-folder';
  var DURACION_SALIDA = 200; // debe coincidir con la animación .pagina-saliendo en styles.css

  console.log('[dataloop-folder-fx] script de transición cargado');

  /* Paso 1: interceptar click en folders */
  document.addEventListener('click', function (e) {
    var folder = e.target.closest('.folder-card');
    if (!folder) return;

    console.log('[dataloop-folder-fx] click detectado en folder →', folder.getAttribute('href'));

    var destino = folder.getAttribute('href');
    if (!destino) return;

    e.preventDefault();
    document.body.classList.add('pagina-saliendo');
    try { sessionStorage.setItem(STORAGE_KEY, '1'); } catch (err) {}

    setTimeout(function () {
      window.location.href = destino;
    }, DURACION_SALIDA);
  }, true);

  /* Paso 2: si esta página se abrió desde un folder, animar entrada */
  var vieneDeFolder = false;
  try { vieneDeFolder = sessionStorage.getItem(STORAGE_KEY) === '1'; } catch (err) {}

  if (vieneDeFolder) {
    try { sessionStorage.removeItem(STORAGE_KEY); } catch (err) {}

    var activarEntrada = function () {
      document.body.classList.add('pagina-entrando');
      document.body.addEventListener('animationend', function limpiar() {
        document.body.classList.remove('pagina-entrando');
        document.body.removeEventListener('animationend', limpiar);
      });
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', activarEntrada);
    } else {
      activarEntrada();
    }
  }

})();