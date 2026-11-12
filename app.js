fetch('data.json').then(r => r.json()).then(function(DATA){
const F = DATA.fields; // Código, Alias, Propietario, Tensión, Linea MT, Subestación, Zona, Nº clientes, Nº trafos, Pot. inst., Pot. contr., Tipo, UOT, Id Nodo
const iLinea = F.indexOf('Linea MT'), iSub = F.indexOf('Subestación'), iProp = F.indexOf('Propietario'), iAlias = F.indexOf('Alias'), iNodo = F.indexOf('Id Nodo'), iTipo = F.indexOf('Tipo Construcción');
const norm = s => String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[\s_\-.]+/g,'');
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

// Build one list of all CTs
const all = [];
DATA.endesa.forEach(r => all.push({kind:'endesa', code:r[0], lat:r[1], lon:r[2]}));
DATA.ext.forEach(r => all.push({kind:'ext', code:r[0], lat:r[1], lon:r[2], v:r.slice(3)}));
all.forEach(ct => {
  ct.k = norm(ct.code);
  ct.extra = ct.kind==='ext' ? [ct.v[iAlias], ct.v[iLinea], ct.v[iSub], ct.v[iNodo]].map(norm).join('|') : '';
});
document.getElementById('n-endesa').textContent = DATA.endesa.length.toLocaleString('es-ES');
document.getElementById('n-ext').textContent = DATA.ext.length.toLocaleString('es-ES');

const show = {endesa:true, ext:true};

// Map
const map = L.map('map', {preferCanvas:true, zoomControl:false, attributionControl:true}).setView([37.18,-3.6], 10);
if (matchMedia('(min-width:760px)').matches) L.control.zoom({position:'topright'}).addTo(map);
const IGN = (svc, layer, fmt) => `https://www.ign.es/wmts/${svc}?service=WMTS&request=GetTile&version=1.0.0&format=${fmt}&layer=${layer}&style=default&tilematrixset=GoogleMapsCompatible&tilematrix={z}&tilerow={y}&tilecol={x}`;
const ignBase = L.tileLayer(IGN('ign-base','IGNBaseTodo','image/jpeg'), {maxZoom:20, maxNativeZoom:19, attribution:'Mapa base © <a href="https://www.ign.es" target="_blank" rel="noopener">IGN</a> (CC BY 4.0)'});
const sat = L.tileLayer(IGN('pnoa-ma','OI.OrthoimageCoverage','image/jpeg'), {maxZoom:20, maxNativeZoom:19, attribution:'Ortofoto PNOA © <a href="https://www.ign.es" target="_blank" rel="noopener">IGN</a> (CC BY 4.0)'});
const osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom:19, attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'});
let streets = ignBase, base = ignBase.addTo(map), tileFails = 0, tileOk = 0;
[ignBase,sat,osm].forEach(l => {
  l.on('tileerror', () => {
    tileFails++;
    // If the IGN base map never loads, fall back to OpenStreetMap once
    if (!tileOk && tileFails > 6 && base === ignBase){ map.removeLayer(ignBase); streets = base = osm.addTo(map); base.bringToBack(); tileFails = 0; return; }
    if (!tileOk && tileFails > 6) document.getElementById('tilenote').hidden = false;
  });
  l.on('tileload', () => { tileOk++; document.getElementById('tilenote').hidden = true; });
});
const renderer = L.canvas({padding:0.3});
const layers = {endesa:L.layerGroup(), ext:L.layerGroup()};
function colors(){ return {endesa:css('--endesa'), ext:css('--ext'), sel:css('--sel')}; }
let C = colors();
all.forEach(ct => {
  ct.m = L.circleMarker([ct.lat, ct.lon], {renderer, radius:5, weight:1.5, color:'#ffffff', fillColor:C[ct.kind], fillOpacity:.95});
  ct.m.on('click', () => select(ct, false));
  layers[ct.kind].addLayer(ct.m);
});
layers.endesa.addTo(map); layers.ext.addTo(map);
map.fitBounds(L.latLngBounds(all.map(c=>[c.lat,c.lon])), {padding:[20,20]});
const selRing = L.circleMarker([0,0], {renderer, radius:12, weight:3, color:C.sel, fill:false, interactive:false});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { C = colors(); all.forEach(ct=>ct.m.setStyle({fillColor:C[ct.kind]})); selRing.setStyle({color:C.sel}); });

// Filters
['endesa','ext'].forEach(k => {
  const b = document.getElementById('f-'+k);
  b.addEventListener('click', () => {
    show[k] = !show[k]; b.setAttribute('aria-pressed', show[k]);
    show[k] ? layers[k].addTo(map) : map.removeLayer(layers[k]);
    runSearch();
  });
});

// Search
const q = document.getElementById('q'), res = document.getElementById('results'), clearB = document.getElementById('clear');
let current = [], activeIdx = -1;
function esc(s){ return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function hl(text, raw){
  const t = String(text); if (!raw) return esc(t);
  const i = t.toLowerCase().indexOf(raw.toLowerCase());
  return i < 0 ? esc(t) : esc(t.slice(0,i)) + '<mark>' + esc(t.slice(i,i+raw.length)) + '</mark>' + esc(t.slice(i+raw.length));
}
function runSearch(){
  const raw = q.value.trim(), n = norm(raw);
  clearB.hidden = !raw;
  if (!n){ res.hidden = true; current = []; return; }
  const hits = [];
  for (const ct of all){
    if (!show[ct.kind]) continue;
    let s = -1;
    if (ct.k === n) s = 0;
    else if (ct.k.startsWith(n) || ct.k.replace(/^p/,'').startsWith(n)) s = 1;
    else if (ct.k.includes(n)) s = 2;
    else if (ct.extra && ct.extra.includes(n)) s = 3;
    if (s >= 0) hits.push([s, ct]);
  }
  hits.sort((a,b) => a[0]-b[0] || a[1].k.length-b[1].k.length || a[1].k.localeCompare(b[1].k));
  current = hits.slice(0, 60).map(h=>h[1]); activeIdx = -1;
  let html = `<div class="meta">${hits.length ? hits.length.toLocaleString('es-ES') + (hits.length===1?' resultado':' resultados') + (hits.length>60?' · mostrando 60':'') : 'Ningún CT coincide con «'+esc(raw)+'». Prueba con el número sin la P o con parte del código.'}</div>`;
  current.forEach((ct,i) => {
    const sub = ct.kind==='endesa' ? 'Endesa' : [ct.v[iProp], ct.v[iLinea] && 'Línea ' + ct.v[iLinea], ct.v[iSub] && 'SET ' + ct.v[iSub]].filter(Boolean).join(' · ');
    html += `<button class="res" type="button" data-i="${i}"><span class="dot" style="background:var(--${ct.kind})"></span><span class="txt"><span class="code">${hl(ct.code, raw)}</span><span class="sub">${ct.kind==='ext'? hl(sub, raw) : esc(sub)}</span></span></button>`;
  });
  res.innerHTML = html; res.hidden = false;
}
q.addEventListener('input', runSearch);
q.addEventListener('focus', () => { if (q.value.trim()) runSearch(); });
q.addEventListener('keydown', e => {
  const btns = res.querySelectorAll('.res');
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp'){
    if (!btns.length) return; e.preventDefault();
    activeIdx = (activeIdx + (e.key==='ArrowDown'?1:-1) + btns.length) % btns.length;
    btns.forEach((b,i)=>b.classList.toggle('active', i===activeIdx)); btns[activeIdx].scrollIntoView({block:'nearest'});
  } else if (e.key === 'Enter'){
    e.preventDefault(); const ct = current[activeIdx >= 0 ? activeIdx : 0]; if (ct) select(ct, true);
  } else if (e.key === 'Escape'){ res.hidden = true; }
});
res.addEventListener('click', e => { const b = e.target.closest('.res'); if (b) select(current[+b.dataset.i], true); });
clearB.addEventListener('click', () => { q.value=''; runSearch(); q.focus(); });
map.on('click', () => { res.hidden = true; });

// Selection + navigation sheet
const sheet = document.getElementById('sheet');
let selected = null;
function select(ct, fly){
  selected = ct; res.hidden = true; q.blur();
  selRing.setLatLng([ct.lat, ct.lon]).addTo(map); ct.m.bringToFront();
  renderSheet(ct);
  const z = fly ? Math.max(map.getZoom(), 17) : map.getZoom();
  const wide = matchMedia('(min-width:760px)').matches;
  const off = wide ? L.point(-(sheet.offsetWidth+12)/2, 0) : L.point(0, sheet.offsetHeight/2);
  const target = map.unproject(map.project([ct.lat, ct.lon], z).add(off), z);
  if (fly) map.flyTo(target, z, {duration:.6}); else map.panTo(target);
  try { history.replaceState(null, '', '#ct-' + ct.code.replace(/[^A-Za-z0-9-]/g,'')); } catch(e){}
}
function renderSheet(ct){
  const ll = ct.lat.toFixed(6) + ',' + ct.lon.toFixed(6);
  const label = encodeURIComponent('CT ' + ct.code);
  const links = {
    google: `https://www.google.com/maps/dir/?api=1&destination=${ll}&travelmode=driving`,
    waze:   `https://waze.com/ul?ll=${ll}&navigate=yes`,
    apple:  `https://maps.apple.com/?daddr=${ll}&dirflg=d`,
    geo:    `geo:${ll}?q=${ll}(${label})`
  };
  let det = '';
  if (ct.kind === 'ext'){
    det = '<table class="det"><tbody>' + F.map((f,i) => (i===0 || ct.v[i]==='' ) ? '' : `<tr><td>${esc(f)}</td><td>${esc(ct.v[i])}</td></tr>`).join('') + '</tbody></table>';
  }
  const eyebrow = ct.kind==='endesa' ? 'CT Endesa' : 'CT externo · ' + esc(ct.v[iProp] || '') + (ct.v[iTipo] ? ' · ' + esc(ct.v[iTipo]) : '');
  sheet.innerHTML = `
    <div class="grab"></div>
    <div class="sh-head">
      <div class="t">
        <span class="eyebrow"><span class="dot" style="background:var(--${ct.kind})"></span>${eyebrow}</span>
        <span class="sh-code">${esc(ct.code)}</span>
        <span class="coords" id="coords">${ll}</span>
      </div>
      <button class="iconbtn" id="sh-close" type="button" aria-label="Cerrar ficha"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
    </div>
    <div class="nav-title">Cómo llegar</div>
    <div class="navgrid">
      <a class="navbtn primary" href="${links.geo}">Abrir en mi app de navegación</a>
      <a class="navbtn" href="${links.google}" target="_blank" rel="noopener">Google Maps</a>
      <a class="navbtn" href="${links.waze}" target="_blank" rel="noopener">Waze</a>
      <a class="navbtn" href="${links.apple}" target="_blank" rel="noopener">Apple Maps</a>
      <button class="navbtn" id="copy" type="button">Copiar coordenadas</button>
    </div>
    <p class="hint">«Abrir en mi app de navegación» usa un enlace <code>geo:</code>: en Android el móvil te deja elegir entre las apps instaladas. En iPhone, o si no responde, usa Google Maps, Waze o Apple Maps.</p>
    ${det}`;
  sheet.hidden = false; document.body.classList.add('sheet-open');
  document.documentElement.style.setProperty('--sheet-h', sheet.offsetHeight + 'px');
  document.getElementById('sh-close').onclick = closeSheet;
  document.getElementById('copy').onclick = () => {
    const done = () => toast('Coordenadas copiadas: ' + ll);
    const fallback = () => { const r = document.createRange(); r.selectNodeContents(document.getElementById('coords')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); toast('Coordenadas seleccionadas. Mantén pulsado para copiar.'); };
    try { navigator.clipboard.writeText(ll).then(done, fallback); } catch(e){ fallback(); }
  };
}
function closeSheet(){ sheet.hidden = true; document.body.classList.remove('sheet-open'); map.removeLayer(selRing); selected = null; try{ history.replaceState(null,'',location.pathname + location.search); }catch(e){} }

let tt; function toast(msg){ const t = document.getElementById('toast'); t.textContent = msg; t.hidden = false; clearTimeout(tt); tt = setTimeout(()=>t.hidden=true, 2600); }

// Base layer toggle
const bSat = document.getElementById('b-sat');
bSat.addEventListener('click', () => {
  map.removeLayer(base); base = (base === sat ? streets : sat).addTo(map); base.bringToBack();
  const on = base === sat; bSat.classList.toggle('on', on); bSat.setAttribute('aria-label', on ? 'Cambiar a mapa de calles' : 'Cambiar a vista satélite');
});

// My location
let me = null;
document.getElementById('b-loc').addEventListener('click', () => {
  if (!navigator.geolocation){ toast('Este navegador no permite obtener tu ubicación.'); return; }
  toast('Buscando tu ubicación…');
  navigator.geolocation.getCurrentPosition(p => {
    const ll = [p.coords.latitude, p.coords.longitude];
    if (!me) me = L.circleMarker(ll, {renderer, radius:8, weight:3, color:'#ffffff', fillColor:css('--accent'), fillOpacity:1}).addTo(map); else me.setLatLng(ll);
    map.flyTo(ll, 16, {duration:.6});
    // nearest visible CT
    let best=null, bd=Infinity; for (const ct of all){ if(!show[ct.kind]) continue; const d = map.distance(ll,[ct.lat,ct.lon]); if (d<bd){bd=d;best=ct;} }
    if (best) toast('CT más cercano: ' + best.code + ' a ' + (bd<1000? Math.round(bd)+' m' : (bd/1000).toFixed(1)+' km'));
  }, () => toast('No se pudo obtener tu ubicación. Revisa el permiso de ubicación del navegador.'), {enableHighAccuracy:true, timeout:10000});
});

// Open CT from link (#ct-CODE)
function fromHash(){
  const m = location.hash.match(/^#ct-([A-Za-z0-9-]+)$/); if (!m) return;
  const ct = all.find(c => c.code.replace(/[^A-Za-z0-9-]/g,'') === m[1]); if (ct && ct !== selected) select(ct, true);
}
window.addEventListener('hashchange', fromHash); fromHash();
}).catch(e => { document.getElementById('tilenote').textContent = 'No se pudieron cargar los datos de los CT. Comprueba la conexión y vuelve a abrir la app.'; document.getElementById('tilenote').hidden = false; });
