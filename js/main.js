const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const loader = document.getElementById('loader');
const numEl = document.getElementById('loader-num');
const logEl = document.getElementById('loader-log');
const statusEl = document.getElementById('loader-status');
const messages = ['Trazando coordenadas','Mapeando Entre Orillas','Calculando densidad urbana','Revelando la ciudad','Sistema listo'];

requestAnimationFrame(() => loader.classList.add('zoomed'));

let msgIndex = 0;
const duration = reduced ? 200 : 2200;
const start = performance.now();

function loaderTick(now){
  const t = Math.min(1, (now - start) / duration);
  numEl.textContent = Math.floor(t * 100);
  const targetMsg = Math.floor(t * (messages.length - 1));
  if(targetMsg !== msgIndex && targetMsg < messages.length){
    msgIndex = targetMsg;
    statusEl.textContent = messages[msgIndex];
    const line = document.createElement('span');
    line.textContent = '> ' + messages[msgIndex];
    logEl.appendChild(line);
    if(logEl.children.length > 3) logEl.removeChild(logEl.firstChild);
  }
  if(t < 1){ requestAnimationFrame(loaderTick); }
  else {
    statusEl.textContent = messages[messages.length-1];
    setTimeout(() => loader.classList.add('hide'), 350);
  }
}
requestAnimationFrame(loaderTick);
setTimeout(() => loader.classList.add('hide'), 4200);

const clockEl = document.getElementById('clock');
function updateClock(){
  const d = new Date();
  const hh = String(d.getUTCHours()).padStart(2,'0');
  const mm = String(d.getUTCMinutes()).padStart(2,'0');
  const ss = String(d.getUTCSeconds()).padStart(2,'0');
  clockEl.textContent = `${hh}:${mm}:${ss} GMT`;
}
updateClock();
setInterval(updateClock, 1000);

const mapImg = document.getElementById('mapImg');
const mapImgwrap = document.getElementById('mapImgwrap');
const mapHint = document.getElementById('mapHint');

const MAX_SCALE = 1.42;
const ENTER_TRANSITION_MS = 1200;

let entered = false;
let transitioning = false;
let scale = 1;
let dragEnabled = false;
let dragX = 0, dragY = 0;
let targetX = 0, targetY = 0;
let isDragging = false;
let startX = 0, startY = 0, startDragX = 0, startDragY = 0;
let rafDrag = null, velX = 0, velY = 0, lastTX = 0, lastTY = 0;

function clamp(v, min, max){ return Math.max(min, Math.min(max, v)); }
function rubberBand(v, min, max, k=0.26){
  if(v < min){ const o = v - min; return min + o * k; }
  if(v > max){ const o = v - max; return max + o * k; }
  return v;
}

function maxOffset(){
  const rect = mapImgwrap.getBoundingClientRect();
  return {
    x: (scale - 1) * rect.width * 0.5,
    y: (scale - 1) * rect.height * 0.5
  };
}

function renderTransform(){
  mapImg.style.transform = reduced
    ? `scale(${scale})`
    : `translate(${dragX}px, ${dragY}px) scale(${scale})`;
}
function smoothTick(){
  const dx = targetX - dragX, dy = targetY - dragY;
  if(Math.abs(dx) < 0.15 && Math.abs(dy) < 0.15 && !isDragging){
    dragX = targetX; dragY = targetY;
    renderTransform();
    updateMarkerPositions();
    rafDrag = null;
    return;
  }
  dragX += dx * 0.13;
  dragY += dy * 0.13;
  renderTransform();
  updateMarkerPositions();
  rafDrag = requestAnimationFrame(smoothTick);
}
function kickSmooth(){ if(!rafDrag) rafDrag = requestAnimationFrame(smoothTick); }

function setDragEnabled(on){
  dragEnabled = on;
  mapImgwrap.classList.toggle('draggable', on);
  mapHint.classList.toggle('show', on);
}

function enterMap(){
  if(entered || transitioning) return;
  entered = true;
  transitioning = true;
  document.body.classList.add('entered');
  dragX = targetX = 0; dragY = targetY = 0;
  scale = MAX_SCALE;
  mapImg.style.transition = 'transform 1.2s cubic-bezier(.16,.8,.24,1)';
  renderTransform();
  updateMarkerPositions();
  setTimeout(() => {
    mapImg.style.transition = 'none';
    setDragEnabled(true);
    transitioning = false;
  }, reduced ? 0 : ENTER_TRANSITION_MS);
}

function exitMap(){
  if(!entered || transitioning) return;
  entered = false;
  transitioning = true;
  setDragEnabled(false);
  dragX = targetX = 0; dragY = targetY = 0;
  scale = 1;
  document.body.classList.remove('entered');
  mapImg.style.transition = 'transform 1.2s cubic-bezier(.16,.8,.24,1)';
  renderTransform();
  updateMarkerPositions();
  hideAll();
  if(rafDrag){ cancelAnimationFrame(rafDrag); rafDrag = null; }
  setTimeout(() => {
    mapImg.style.transition = 'none';
    transitioning = false;
  }, reduced ? 0 : ENTER_TRANSITION_MS);
}

window.addEventListener('wheel', (e) => {
  if(transitioning || isDragging) return;
  if(!entered && e.deltaY > 0){ enterMap(); }
  else if(entered && e.deltaY < 0){ exitMap(); }
}, { passive:true });

let touchStartY = null;
window.addEventListener('touchstart', (e) => {
  touchStartY = e.touches[0].clientY;
}, { passive:true });
window.addEventListener('touchmove', (e) => {
  if(transitioning || isDragging || touchStartY === null) return;
  const dy = touchStartY - e.touches[0].clientY;
  if(!entered && dy > 12){ enterMap(); }
  else if(entered && dy < -12){ exitMap(); }
}, { passive:true });

window.addEventListener('keydown', (e) => {
  if(transitioning) return;
  if(!entered && (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ')){ enterMap(); }
  else if(entered && (e.key === 'ArrowUp' || e.key === 'PageUp')){ exitMap(); }
});

document.getElementById('mapPrompt').addEventListener('click', enterMap);

function onPointerDown(e){
  if(!dragEnabled) return;
  isDragging = true;
  mapImgwrap.classList.add('dragging');
  startX = e.clientX; startY = e.clientY;
  startDragX = targetX; startDragY = targetY;
  velX = 0; velY = 0; lastTX = targetX; lastTY = targetY;
  if(rafDrag){ cancelAnimationFrame(rafDrag); rafDrag = null; }
  mapImgwrap.setPointerCapture(e.pointerId);
}

function onPointerMove(e){
  if(!isDragging) return;
  const bounds = maxOffset();
  const rawX = startDragX + (e.clientX - startX);
  const rawY = startDragY + (e.clientY - startY);
  targetX = clamp(rawX, -bounds.x, bounds.x);
  targetY = clamp(rawY, -bounds.y, bounds.y);
  lastTX = targetX; lastTY = targetY;
  updateMarkerPositions();
  kickSmooth();
}

function onPointerUp(e){
  if(!isDragging) return;
  isDragging = false;
  mapImgwrap.classList.remove('dragging');
  try{ mapImgwrap.releasePointerCapture(e.pointerId); }catch(err){}
  const bounds = maxOffset();
  targetX = clamp(targetX, -bounds.x, bounds.x);
  targetY = clamp(targetY, -bounds.y, bounds.y);
  kickSmooth();
}

mapImgwrap.addEventListener('pointerdown', onPointerDown);
window.addEventListener('pointermove', onPointerMove);
window.addEventListener('pointerup', onPointerUp);
window.addEventListener('pointercancel', onPointerUp);

const neonCursor = document.getElementById('neonCursor');
const mapStageEl = document.getElementById('mapStage');
const neonTargets = document.querySelectorAll('.sidebar-nav a, .sidebar-title, .map-logo, .map-prompt p, .map-topbar span, .sidebar-eyebrow, .sidebar-social span, .map-hint span, .loader-top span, #loader .loader-count');
let mouseX = window.innerWidth/2, mouseY = window.innerHeight/2, raf = null;
const isCoarse = window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches || window.innerWidth <= 820;
function updateNeonPos(){
  neonCursor.style.left = mouseX + 'px';
  neonCursor.style.top = mouseY + 'px';
  raf = null;
}
function updateNeonGlow(){
  neonTargets.forEach(el=>{
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width/2, cy = r.top + r.height/2;
    const dist = Math.hypot(mouseX - cx, mouseY - cy);
    const threshold = 110;
    const t = Math.max(0, 1 - dist / threshold);
    const eased = t * t * (3 - 2 * t);
    el.style.setProperty('--glow', eased.toFixed(3));
    if(eased > 0.01) el.classList.add('neon-active');
    else el.classList.remove('neon-active');
    el.style.filter = eased > 0.01 ? `brightness(${1 + eased*0.22}) saturate(${1 + eased*0.18})` : '';
  });
  const hoverEl = document.elementFromPoint(mouseX, mouseY);
  const isHover = hoverEl && hoverEl.closest('a, .map-logo, .sidebar-title, button');
  neonCursor.classList.toggle('hover', !!isHover);
}
if(!isCoarse && neonCursor){
  window.addEventListener('mousemove', (e)=>{
    mouseX = e.clientX; mouseY = e.clientY;
    if(!raf) raf = requestAnimationFrame(updateNeonPos);
    updateNeonGlow();
  }, {passive:true});
  function showNeon(){ neonCursor.classList.add('visible'); document.body.classList.add('neon-on'); }
  function hideNeon(){ neonCursor.classList.remove('visible'); document.body.classList.remove('neon-on'); neonTargets.forEach(el=>{ el.classList.remove('neon-active'); el.style.setProperty('--glow','0'); el.style.filter=''; }); }
  mapStageEl.addEventListener('mouseenter', showNeon);
  mapStageEl.addEventListener('mouseleave', hideNeon);
  document.getElementById('mapSidebar').addEventListener('mouseenter', showNeon);
  document.getElementById('mapSidebar').addEventListener('mouseleave', hideNeon);
  const origDown = onPointerDown, origUp = onPointerUp;
  function neonDown(e){ neonCursor.classList.add('dragging'); return origDown(e); }
  function neonUp(e){ neonCursor.classList.remove('dragging'); return origUp(e); }
  mapImgwrap.removeEventListener('pointerdown', onPointerDown);
  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('pointerup', onPointerUp);
  window.removeEventListener('pointercancel', onPointerUp);
  mapImgwrap.addEventListener('pointerdown', neonDown);
  window.addEventListener('pointermove', (e)=>{ onPointerMove(e); if(isDragging) neonCursor.classList.add('dragging'); });
  window.addEventListener('pointerup', neonUp);
  window.addEventListener('pointercancel', neonUp);
}

/* ─── Map Markers ─── */

const LOCATIONS = typeof PLANCHONES !== 'undefined' ? PLANCHONES : [
  { id:1,  x:76.3, y:53,   destX:76,   destY:46.8, name:'Planchón La bonga N°1' },
  { id:2,  x:72.2, y:56.2, destX:71.6, destY:47.4, name:'Planchón El rey David' },
  { id:3,  x:66.8, y:57.5, destX:67.1, destY:46.1, name:'Planchón Pompeya' },
  { id:4,  x:61.2, y:56.2, destX:61.7, destY:43.6, name:'Planchón El colombiano' },
  { id:5,  x:55.9, y:52.2, destX:56.8, destY:41.5, name:'Planchón Los 2 hermanos' },
  { id:6,  x:51.5, y:48.4, destX:52.2, destY:39.6, name:'Planchón El canario' },
  { id:7,  x:47.2, y:45.5, destX:47.7, destY:37.4, name:'Planchón Dinastía tordecilla' },
  { id:8,  x:42.2, y:44,   destX:42.3, destY:34.4, name:'Planchón La bala del Sinú' },
  { id:9,  x:37.2, y:43.9, destX:37.2, destY:32,   name:'Planchón La estrella del Sinú' },
  { id:10, x:33.2, y:44.3, destX:32.7, destY:31.6, name:'Planchón La esmeralda' },
  { id:11, x:29,   y:45.7, destX:28.4, destY:33.3, name:'Planchón El minuto de Dios' },
  { id:12, x:23.4, y:46.7, destX:23.7, destY:35.2, name:'Planchón La 26' },
];

const mapMarkersEl = document.getElementById('mapMarkers');
const routeSvg = document.getElementById('routeSvg');
const SVG_NS = 'http://www.w3.org/2000/svg';
const IMG_OFFSET = 6;
const IMG_SCALE  = 1.12;
const markerEls = [];
const routeGroups = {};
let activeMarker = null;
let pinnedRoute = null;
let tooltipEl = null;

function renderMarkers(){
  LOCATIONS.forEach(loc => {
    const el = document.createElement('div');
    el.className = 'map-marker';
    el.dataset.id = loc.id;
    el.innerHTML = `<div class="map-marker-pin"><span>${loc.id}</span></div>`;
    el.style.left = ((loc.x - IMG_OFFSET) / IMG_SCALE) + '%';
    el.style.top  = ((loc.y - IMG_OFFSET) / IMG_SCALE) + '%';
    el.addEventListener('click', e => {
      e.stopPropagation();
      window.location.href = `planchon.html?id=${loc.id}`;
    });
    el.addEventListener('mouseenter', () => { showRoute(loc.id); showTooltip(el, loc); });
    el.addEventListener('mouseleave', () => { hideRoute(loc.id); hideTooltip(); });
    mapMarkersEl.appendChild(el);
    markerEls.push({ el, loc });
  });
}

function renderRoutes(){
  LOCATIONS.forEach(loc => {
    const g = document.createElementNS(SVG_NS, 'g');
    g.classList.add('route-group');
    g.dataset.id = loc.id;

    const line = document.createElementNS(SVG_NS, 'line');
    line.classList.add('route-line', 'route-line-animated');

    const dot = document.createElementNS(SVG_NS, 'circle');
    dot.classList.add('route-dot');
    dot.setAttribute('r', '4');

    const label = document.createElementNS(SVG_NS, 'text');
    label.classList.add('route-label');
    label.textContent = loc.id;

    g.appendChild(line);
    g.appendChild(dot);
    g.appendChild(label);
    routeSvg.appendChild(g);
    routeGroups[loc.id] = { g, line, dot, label };
  });
}

function showRoute(id){
  const group = routeGroups[id];
  if(group) group.g.classList.add('visible');
}

function hideRoute(id){
  const group = routeGroups[id];
  if(group) group.g.classList.remove('visible');
}

function hideAllRoutes(){
  Object.values(routeGroups).forEach(g => g.g.classList.remove('visible'));
  pinnedRoute = null;
}

function toggleRoute(id){
  if(pinnedRoute === id){
    hideRoute(id);
    pinnedRoute = null;
  } else {
    hideAllRoutes();
    pinnedRoute = id;
    showRoute(id);
  }
}

function updateRoutePositions(){
  const wrapW = mapImgwrap.clientWidth;
  const wrapH = mapImgwrap.clientHeight;
  const dx = reduced ? 0 : dragX;
  const dy = reduced ? 0 : dragY;
  LOCATIONS.forEach(loc => {
    const group = routeGroups[loc.id];
    if(!group) return;
    const srcPxX = (loc.x / 100) * wrapW;
    const srcPxY = (loc.y / 100) * wrapH;
    const dstPxX = (loc.destX / 100) * wrapW;
    const dstPxY = (loc.destY / 100) * wrapH;
    const sx = wrapW/2 - (wrapW/2 - srcPxX) * scale + dx;
    const sy = wrapH/2 - (wrapH/2 - srcPxY) * scale + dy;
    const ex = wrapW/2 - (wrapW/2 - dstPxX) * scale + dx;
    const ey = wrapH/2 - (wrapH/2 - dstPxY) * scale + dy;
    group.line.setAttribute('x1', sx);
    group.line.setAttribute('y1', sy);
    group.line.setAttribute('x2', ex);
    group.line.setAttribute('y2', ey);
    group.dot.setAttribute('cx', ex);
    group.dot.setAttribute('cy', ey);
    group.label.setAttribute('x', ex);
    group.label.setAttribute('y', ey - 12);
  });
}

function showTooltip(markerEl, loc){
  if(activeMarker) activeMarker.classList.remove('active');
  activeMarker = markerEl;
  markerEl.classList.add('active');
  if(!tooltipEl){
    tooltipEl = document.createElement('div');
    tooltipEl.className = 'map-tooltip';
    document.body.appendChild(tooltipEl);
  }
  tooltipEl.textContent = `${loc.id} — ${loc.name}`;
  tooltipEl.classList.add('visible');
  positionTooltip();
}

function hideTooltip(){
  if(activeMarker){ activeMarker.classList.remove('active'); activeMarker = null; }
  if(tooltipEl) tooltipEl.classList.remove('visible');
}

function positionTooltip(){
  if(!activeMarker || !tooltipEl) return;
  const r = activeMarker.getBoundingClientRect();
  tooltipEl.style.left = (r.left + r.width / 2) + 'px';
  tooltipEl.style.top  = r.top + 'px';
}

function hideAll(){
  hideTooltip();
  hideAllRoutes();
}

function updateMarkerPositions(){
  markerEls.forEach(({ el, loc }) => {
    const imgPxX = (loc.x / 100) * mapImgwrap.clientWidth;
    const imgPxY = (loc.y / 100) * mapImgwrap.clientHeight;
    const dx = reduced ? 0 : dragX;
    const dy = reduced ? 0 : dragY;
    const screenX = mapImgwrap.clientWidth / 2 - (mapImgwrap.clientWidth / 2 - imgPxX) * scale + dx;
    const screenY = mapImgwrap.clientHeight / 2 - (mapImgwrap.clientHeight / 2 - imgPxY) * scale + dy;
    el.style.left = screenX + 'px';
    el.style.top  = screenY + 'px';
  });
  updateRoutePositions();
  positionTooltip();
}

document.addEventListener('click', e => {
  if(!e.target.closest('.map-marker')) hideAll();
});

renderMarkers();
renderRoutes();
updateMarkerPositions();
updateRoutePositions();
window.addEventListener('resize', () => { updateMarkerPositions(); updateRoutePositions(); });

/* ─── Coord Debug Mode ─── */

let debugMode = false;
const coordPanel = document.getElementById('coordPanel');
const coordGrid = document.getElementById('coordGrid');
const coordCurrent = document.getElementById('coordCurrent');
const coordHistory = document.getElementById('coordHistory');
const coordCopy = document.getElementById('coordCopy');
const coordClear = document.getElementById('coordClear');
const coordExport = document.getElementById('coordExport');
const coordHint = document.querySelector('.coord-panel-hint');
let debugEntries = [];

function toggleDebug(){
  debugMode = !debugMode;
  coordPanel.classList.toggle('visible', debugMode);
  coordGrid.classList.toggle('visible', debugMode);
  coordHint.textContent = debugMode ? 'Ctrl+D para cerrar' : 'Ctrl+D para activar';
  if(!debugMode){ coordCurrent.textContent = 'X: — %  Y: — %'; }
}

function getCoordFromEvent(e){
  const rect = mapImgwrap.getBoundingClientRect();
  const wrapX = e.clientX - rect.left;
  const wrapY = e.clientY - rect.top;
  const wrapW = rect.width;
  const wrapH = rect.height;
  const dx = reduced ? 0 : dragX;
  const dy = reduced ? 0 : dragY;
  const imgPxX = (wrapX - wrapW/2 - dx) / scale + wrapW/2;
  const imgPxY = (wrapY - wrapH/2 - dy) / scale + wrapH/2;
  const imgPctX = (imgPxX / wrapW) * 100;
  const imgPctY = (imgPxY / wrapH) * 100;
  return {
    x: Math.round(imgPctX * 10) / 10,
    y: Math.round(imgPctY * 10) / 10
  };
}

function onDebugClick(e){
  if(!debugMode) return;
  if(e.target.closest('.coord-panel')) return;
  e.preventDefault();
  e.stopPropagation();
  const coords = getCoordFromEvent(e);
  coordCurrent.textContent = `X: ${coords.x}%  Y: ${coords.y}%`;
  const num = debugEntries.length + 1;
  debugEntries.push({ num, x: coords.x, y: coords.y });
  renderDebugHistory();
}

function onDebugMove(e){
  if(!debugMode) return;
  if(e.target.closest('.coord-panel')) return;
  const coords = getCoordFromEvent(e);
  coordCurrent.textContent = `X: ${coords.x}%  Y: ${coords.y}%`;
}

function renderDebugHistory(){
  coordHistory.innerHTML = debugEntries.map(entry =>
    `<div class="coord-entry">
      <span class="coord-entry-num">${entry.num}.</span>
      <span class="coord-entry-val">X:${entry.x} Y:${entry.y}</span>
    </div>`
  ).join('');
}

coordCopy.addEventListener('click', () => {
  const text = debugEntries.map(e => `{ id:${e.num}, x:${e.x}, y:${e.y}, name:'' }`).join(',\n');
  navigator.clipboard.writeText(text).then(() => {
    coordCopy.textContent = 'Copiado!';
    setTimeout(() => { coordCopy.textContent = 'Copiar'; }, 1500);
  });
});

coordClear.addEventListener('click', () => {
  debugEntries = [];
  coordHistory.innerHTML = '';
  coordCurrent.textContent = 'X: — %  Y: — %';
});

coordExport.addEventListener('click', () => {
  const lines = debugEntries.map(e => `${e.num}. X: ${e.x}%  Y: ${e.y}%`);
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'coordenadas.txt';
  a.click();
});

window.addEventListener('keydown', e => {
  if(e.ctrlKey && e.key === 'd'){
    e.preventDefault();
    toggleDebug();
  }
});

mapStageEl.addEventListener('click', onDebugClick, true);
mapStageEl.addEventListener('mousemove', onDebugMove, { passive:true });
