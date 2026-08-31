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
    updateLandmarkPositions();
  updateRegionLabelPositions();
  updateRondaPositions();
    rafDrag = null;
    return;
  }
  dragX += dx * 0.13;
  dragY += dy * 0.13;
  renderTransform();
  updateMarkerPositions();
  updateLandmarkPositions();
  updateRegionLabelPositions();
  updateRondaPositions();
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
  updateLandmarkPositions();
  updateRegionLabelPositions();
  updateRondaPositions();
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
  updateLandmarkPositions();
  updateRegionLabelPositions();
  updateRondaPositions();
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
function tryEnterMap(){
  if(entered || transitioning) return false;
  enterMap();
  return true;
}
function bindMapa(){
  const nav = document.getElementById('navMapa');
  if(!nav) return;
  nav.style.pointerEvents = 'auto';
  nav.addEventListener('click', e=>{
    e.preventDefault();
    e.stopPropagation();
    const loaderHidden = loader.classList.contains('hide');
    if(!loaderHidden){
      loader.classList.add('hide');
      setTimeout(()=> tryEnterMap(), 200);
      return;
    }
    if(!tryEnterMap()){
      if(!entered) setTimeout(()=> tryEnterMap(), 550);
      else { targetX = 0; targetY = 0; kickSmooth(); updateMarkerPositions(); updateLandmarkPositions(); updateRegionLabelPositions(); updateRondaPositions(); }
    }
  });
}
document.addEventListener('DOMContentLoaded', bindMapa);
if(document.readyState !== 'loading') bindMapa();

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
  updateLandmarkPositions();
  updateRegionLabelPositions();
  updateRondaPositions();
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
  { id:1,  x:71.8, y:56.4, destX:71.2, destY:47.3, name:'Planchón La bonga N°1' },
  { id:2,  x:69.1, y:57.4, destX:69,   destY:46.5, name:'Planchón El rey David' },
  { id:3,  x:66.6, y:57.1, destX:66.7, destY:45.3, name:'Planchón Pompeya' },
  { id:4,  x:64.1, y:57.5, destX:64.7, destY:45,   name:'Planchón El colombiano' },
  { id:5,  x:61.1, y:56.6, destX:61.7, destY:43.6, name:'Planchón Los 2 hermanos' },
  { id:6,  x:59.7, y:55.5, destX:57.2, destY:41.5, name:'Planchón El canario' },
  { id:7,  x:56.2, y:52.3, destX:54.5, destY:40.5, name:'Planchón Dinastía tordecilla' },
  { id:8,  x:53.9, y:50.4, destX:52,   destY:38.8, name:'Planchón La bala del Sinú' },
  { id:9,  x:52.4, y:49.3, destX:50.7, destY:38.4, name:'Planchón La estrella del Sinú' },
  { id:10, x:49.1, y:46.2, destX:47.2, destY:37.2, name:'Planchón La esmeralda' },
  { id:11, x:43.8, y:44.6, destX:43.7, destY:34.9, name:'Planchón El minuto de Dios' },
  { id:12, x:40.4, y:44.3, destX:42.4, destY:33.9, name:'Planchón La 26' },
];

const mapMarkersEl = document.getElementById('mapMarkers');
const routeSvg = document.getElementById('routeSvg');
const SVG_NS = 'http://www.w3.org/2000/svg';
const IMG_OFFSET = 6;
const IMG_SCALE  = 1.12;
const markerEls = [];
const routeGroups = {};
let activeMarker = null;
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
    el.addEventListener('mouseenter', () => { showTooltip(el, loc); });
    el.addEventListener('mouseleave', () => { hideTooltip(); });
    mapMarkersEl.appendChild(el);
    markerEls.push({ el, loc });
  });
}

function renderRoutes(){
  LOCATIONS.forEach(loc => {
    const g = document.createElementNS(SVG_NS, 'g');
    g.classList.add('route-group', 'visible');
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
  tooltipEl.style.top  = r.bottom + 'px';
}

function hideAll(){
  hideTooltip();
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

/* ─── Landmarks ─── */

const LANDMARKS = [
  { x:76.9, y:44,   name:'Universidad del Sinú' },
  { x:58.6, y:37.7, name:'Centro verde' },
  { x:68.1, y:58,   name:'Plaza cultural María Varilla' },
  { x:62.9, y:58.2, name:'Muelle turístico de Montería' },
  { x:43.9, y:53.9, name:'Plaza mayor de Montería' },
  { x:43.1, y:59.5, name:'Parque principal de Montería' },
  { x:30.9, y:45.3, name:'Malecón río Sinú Montería' },
  { x:20.1, y:40.5, name:'Puente Metálico Gustavo Rojas Pinilla' },
  { x:79.2, y:46.2, name:'Puente Segundo Centenario' },
];

const landmarkEls = [];
let landmarkTooltip = null;

function renderLandmarks(){
  LANDMARKS.forEach(lm => {
    const el = document.createElement('div');
    el.className = 'map-landmark';
    el.innerHTML = '<div class="landmark-pin"><div class="landmark-pin-dot"></div></div>';
    el.style.left = ((lm.x - IMG_OFFSET) / IMG_SCALE) + '%';
    el.style.top  = ((lm.y - IMG_OFFSET) / IMG_SCALE) + '%';
    el.addEventListener('mouseenter', () => {
      if(!landmarkTooltip){
        landmarkTooltip = document.createElement('div');
        landmarkTooltip.className = 'map-tooltip landmark-tooltip';
        document.body.appendChild(landmarkTooltip);
      }
      landmarkTooltip.textContent = lm.name;
      landmarkTooltip.classList.add('visible');
      const r = el.getBoundingClientRect();
      landmarkTooltip.style.left = (r.left + r.width / 2) + 'px';
      landmarkTooltip.style.top  = r.bottom + 'px';
    });
    el.addEventListener('mouseleave', () => {
      if(landmarkTooltip) landmarkTooltip.classList.remove('visible');
    });
    mapMarkersEl.appendChild(el);
    landmarkEls.push({ el, lm });
  });
}

function updateLandmarkPositions(){
  const wrapW = mapImgwrap.clientWidth;
  const wrapH = mapImgwrap.clientHeight;
  const dx = reduced ? 0 : dragX;
  const dy = reduced ? 0 : dragY;
  landmarkEls.forEach(({ el, lm }) => {
    const imgPxX = (lm.x / 100) * wrapW;
    const imgPxY = (lm.y / 100) * wrapH;
    const screenX = wrapW/2 - (wrapW/2 - imgPxX) * scale + dx;
    const screenY = wrapH/2 - (wrapH/2 - imgPxY) * scale + dy;
    el.style.left = screenX + 'px';
    el.style.top  = screenY + 'px';
  });
}

/* ─── Etiquetas de margen (texto grande, sin pin) ─── */

const REGION_LABELS = [
  { x:51.5, y:17.5, name:'Margen izquierda' },
  { x:48.6, y:74.4, name:'Margen derecha' },
];

const regionLabelEls = [];

function renderRegionLabels(){
  REGION_LABELS.forEach(rl => {
    const el = document.createElement('div');
    el.className = 'map-region-label';
    el.textContent = rl.name;
    mapMarkersEl.appendChild(el);
    regionLabelEls.push({ el, rl });
  });
}

function updateRegionLabelPositions(){
  const wrapW = mapImgwrap.clientWidth;
  const wrapH = mapImgwrap.clientHeight;
  const dx = reduced ? 0 : dragX;
  const dy = reduced ? 0 : dragY;
  regionLabelEls.forEach(({ el, rl }) => {
    const imgPxX = (rl.x / 100) * wrapW;
    const imgPxY = (rl.y / 100) * wrapH;
    const screenX = wrapW/2 - (wrapW/2 - imgPxX) * scale + dx;
    const screenY = wrapH/2 - (wrapH/2 - imgPxY) * scale + dy;
    el.style.left = screenX + 'px';
    el.style.top  = screenY + 'px';
  });
}

/* ─── Rondas del Sinú (rutas peatonales, línea verde) ─── */

const RONDA_SINU = [
  { x:21.9, y:47.5 }, { x:29.7, y:46.6 }, { x:35.5, y:45.6 }, { x:40.6, y:45.1 },
  { x:46.2, y:46   }, { x:49.7, y:47.8 }, { x:54.4, y:52.3 }, { x:58.6, y:55.9 },
  { x:62.9, y:58.7 }, { x:68.1, y:59.1 }, { x:71.6, y:59.4 }, { x:75.1, y:57.5 },
  { x:78.4, y:52.9 }, { x:81.4, y:49.3 },
];
const RONDA_SINU_OCCIDENTE = [
  { x:56.3, y:39.2 }, { x:56.6, y:40.9 }, { x:60,   y:41.3 },
  { x:62.6, y:42.4 }, { x:64.9, y:43.8 }, { x:66.3, y:44.9 },
];
const RONDAS = [
  { name:'Ronda del Sinú', points:RONDA_SINU },
  { name:'Ronda del Sinú de Occidente', points:RONDA_SINU_OCCIDENTE },
];
const rondaPolylines = [];

function renderRondas(){
  RONDAS.forEach(({ name, points }) => {
    const poly = document.createElementNS(SVG_NS, 'polyline');
    poly.classList.add('ronda-path');
    routeSvg.appendChild(poly);

    const label = document.createElementNS(SVG_NS, 'text');
    label.classList.add('ronda-label');
    label.textContent = name;
    routeSvg.appendChild(label);

    rondaPolylines.push({ poly, label, points });
  });
}

function updateRondaPositions(){
  const wrapW = mapImgwrap.clientWidth;
  const wrapH = mapImgwrap.clientHeight;
  const dx = reduced ? 0 : dragX;
  const dy = reduced ? 0 : dragY;
  rondaPolylines.forEach(({ poly, label, points }) => {
    const coords = points.map(p => {
      const imgPxX = (p.x / 100) * wrapW;
      const imgPxY = (p.y / 100) * wrapH;
      return {
        x: wrapW/2 - (wrapW/2 - imgPxX) * scale + dx,
        y: wrapH/2 - (wrapH/2 - imgPxY) * scale + dy
      };
    });
    poly.setAttribute('points', coords.map(c => `${c.x},${c.y}`).join(' '));
    const mid = coords[Math.floor(coords.length / 2)];
    label.setAttribute('x', mid.x);
    label.setAttribute('y', mid.y - 12);
  });
}

renderMarkers();
renderRoutes();
renderLandmarks();
renderRegionLabels();
renderRondas();
updateMarkerPositions();
updateRoutePositions();
updateLandmarkPositions();
updateRegionLabelPositions();
updateRondaPositions();
window.addEventListener('resize', () => { updateMarkerPositions(); updateRoutePositions(); updateLandmarkPositions(); updateRegionLabelPositions(); updateRondaPositions(); });

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

/* ─── Debug: alternar mapa de fondo ─── */

const MAP_BACKGROUNDS = ['images/map-bg.png', 'images/map-bg2.png'];
let mapBgIndex = 0;

function toggleMapBackground(){
  mapBgIndex = (mapBgIndex + 1) % MAP_BACKGROUNDS.length;
  mapImg.src = MAP_BACKGROUNDS[mapBgIndex];
  coordCurrent.textContent = `Mapa: ${MAP_BACKGROUNDS[mapBgIndex]}`;
}

window.addEventListener('keydown', e => {
  if(e.ctrlKey && e.key === 'm'){
    e.preventDefault();
    toggleMapBackground();
  }
});
