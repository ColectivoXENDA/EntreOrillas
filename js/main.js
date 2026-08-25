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
    rafDrag = null;
    return;
  }
  dragX += dx * 0.13;
  dragY += dy * 0.13;
  renderTransform();
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
  renderTransform();
  setTimeout(() => {
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
  renderTransform();
  if(rafDrag){ cancelAnimationFrame(rafDrag); rafDrag = null; }
  setTimeout(() => { transitioning = false; }, reduced ? 0 : ENTER_TRANSITION_MS);
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
  const over = 28;
  targetX = clamp(rubberBand(rawX, -bounds.x, bounds.x), -bounds.x - over, bounds.x + over);
  targetY = clamp(rubberBand(rawY, -bounds.y, bounds.y), -bounds.y - over, bounds.y + over);
  velX = targetX - lastTX; velY = targetY - lastTY;
  if(targetX < -bounds.x || targetX > bounds.x) velX *= 0.35;
  if(targetY < -bounds.y || targetY > bounds.y) velY *= 0.35;
  lastTX = targetX; lastTY = targetY;
  kickSmooth();
}

function onPointerUp(e){
  if(!isDragging) return;
  isDragging = false;
  mapImgwrap.classList.remove('dragging');
  try{ mapImgwrap.releasePointerCapture(e.pointerId); }catch(err){}
  const bounds = maxOffset();
  const cx = clamp(targetX, -bounds.x, bounds.x);
  const cy = clamp(targetY, -bounds.y, bounds.y);
  const over = targetX !== cx || targetY !== cy;
  if(over){
    targetX = cx; targetY = cy;
    velX = 0; velY = 0;
    kickSmooth();
    return;
  }
  if(!reduced && (Math.abs(velX) > 0.5 || Math.abs(velY) > 0.5)){
    targetX = clamp(targetX + velX * 8, -bounds.x, bounds.x);
    targetY = clamp(targetY + velY * 8, -bounds.y, bounds.y);
    kickSmooth();
  }
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
