const params = new URLSearchParams(location.search);
const id = parseInt(params.get('id'), 10);
const slug = params.get('slug');
const root = document.getElementById('detailRoot');
const data = typeof PLANCHONES !== 'undefined' ? PLANCHONES : [];
let item = null;
if(slug) item = data.find(p => p.slug === slug);
else if(!isNaN(id)) item = data.find(p => p.id === id);

if(!item){
  document.title = 'No encontrado — Entre Orillas';
  root.innerHTML = `<div class="detail-notfound"><h1>Planchón no encontrado</h1><p class="mono" style="color:var(--muted);font-size:12px">ID "${params.get('id')||params.get('slug')||''}" no existe</p><a href="index.html" class="detail-nav-back">Volver al mapa</a><div class="detail-related" style="width:100%;max-width:600px;margin-top:20px"><h3>Elige un planchón</h3><div class="detail-related-grid">${data.map(p=>`<a class="detail-related-card" href="planchon.html?id=${p.id}"><div class="detail-related-num">#${p.id}</div><div class="detail-related-name">${p.name}</div></a>`).join('')}</div></div></div>`;
} else {
  document.title = `${item.name} — Entre Orillas`;
  const others = data.filter(p => p.id !== item.id).slice(0,6);
  root.innerHTML = `
  <section class="detail-hero-full">
    <div class="detail-hero-full-media"><img src="${item.imagen}" alt="${item.name}" onerror="this.src='images/map-bg.png'"></div>
    <div class="detail-hero-full-content">
      <span class="detail-hero-badge">#${String(item.id).padStart(2,'0')} · PLANCHÓN</span>
      <div class="detail-kicker mono">Entre Orillas · Río Sinú</div>
      <h1 class="detail-title-big">${item.name}</h1>
      <p class="detail-hero-desc">${item.desc}</p>
    </div>
    <div class="detail-scroll-hint">Desliza para explorar</div>
  </section>
  <div class="detail-body-content">
    <div class="detail-layout">
      <div class="detail-main">
        <div class="detail-meta reveal">
          <div class="detail-meta-card"><div class="detail-meta-label">Horario</div><div class="detail-meta-value">${item.horario}</div></div>
          <div class="detail-meta-card"><div class="detail-meta-label">Tarifa</div><div class="detail-meta-value">${item.precio}</div></div>
          <div class="detail-meta-card"><div class="detail-meta-label">Coordenadas mapa</div><div class="detail-meta-value">X:${item.x}% Y:${item.y}%</div></div>
          <div class="detail-meta-card"><div class="detail-meta-label">Destino</div><div class="detail-meta-value">X:${item.destX}% Y:${item.destY}%</div></div>
        </div>
        <section class="detail-section reveal">
          <h2>Historia</h2>
          <p>${item.historia}</p>
        </section>
        <section class="detail-section reveal">
          <div class="detail-placeholder">Info placeholder — reemplaza <code>js/data/planchones.js</code> con texto real.</div>
        </section>
        <section class="detail-related reveal">
          <h3>Otros planchones</h3>
          <div class="detail-related-grid">
            ${others.map(p=>`<a class="detail-related-card" href="planchon.html?id=${p.id}"><div class="detail-related-num">#${p.id}</div><div class="detail-related-name">${p.name}</div></a>`).join('')}
          </div>
        </section>
      </div>
      <aside class="detail-side reveal">
        <div class="detail-gallery">
          <img src="${item.imagen}" alt="${item.name} 1" onerror="this.src='images/map-bg.png'" data-lightbox>
          <img src="${item.imagen}" alt="${item.name} 2" onerror="this.src='images/map-bg.png'" data-lightbox>
        </div>
      </aside>
    </div>
  </div>`;
  const reveals = root.querySelectorAll('.reveal');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!reducedMotion && 'IntersectionObserver' in window){
    const io = new IntersectionObserver(entries=>{
      entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('visible'); io.unobserve(e.target); } });
    }, { threshold:0.12, rootMargin:'0px 0px -40px 0px' });
    reveals.forEach(el=> io.observe(el));
  } else {
    reveals.forEach(el=> el.classList.add('visible'));
  }
  const hint = document.querySelector('.detail-scroll-hint');
  const target = document.querySelector('.detail-body-content');
  if(!reducedMotion && window.Lenis){
    const lenis = new Lenis({ duration:1.5, easing:t=>Math.min(1,1.001-Math.pow(2,-10*t)), smoothWheel:true, syncTouch:false });
    function raf(time){ lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    hint?.addEventListener('click', ()=> lenis.scrollTo(target, { duration:1.0 }));
  } else {
    hint?.addEventListener('click', ()=> target?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' }));
  }
  const lightbox = document.createElement('div');
  lightbox.className = 'lightbox';
  lightbox.innerHTML = '<button class="lightbox-close" aria-label="Cerrar">×</button><img alt="">';
  document.body.appendChild(lightbox);
  const lbImg = lightbox.querySelector('img');
  const lbClose = lightbox.querySelector('.lightbox-close');
  function openLightbox(src, alt){ lbImg.src = src; lbImg.alt = alt || ''; lightbox.classList.add('open'); document.body.style.overflow = 'hidden'; if(window.Lenis) document.documentElement.classList.add('lenis-stopped'); }
  function closeLightbox(){ lightbox.classList.remove('open'); document.body.style.overflow = ''; document.documentElement.classList.remove('lenis-stopped'); }
  root.querySelectorAll('[data-lightbox]').forEach(img=>{
    img.addEventListener('click', ()=> openLightbox(img.src, img.alt));
  });
  lightbox.addEventListener('click', e=>{ if(e.target === lightbox) closeLightbox(); });
  lbClose.addEventListener('click', closeLightbox);
  window.addEventListener('keydown', e=>{ if(e.key === 'Escape') closeLightbox(); });
}
