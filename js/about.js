const reveals = document.querySelectorAll('.reveal');
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if(!reduced && 'IntersectionObserver' in window){
  const io = new IntersectionObserver(entries=>{
    entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('visible'); io.unobserve(e.target); } });
  }, { threshold:0.12, rootMargin:'0px 0px -40px 0px' });
  reveals.forEach(el=> io.observe(el));
} else {
  reveals.forEach(el=> el.classList.add('visible'));
}
const hint = document.querySelector('.detail-scroll-hint');
const target = document.querySelector('.detail-body-content');
if(!reduced && window.Lenis){
  const lenis = new Lenis({ duration:1.5, easing:t=>Math.min(1,1.001-Math.pow(2,-10*t)), smoothWheel:true, syncTouch:false });
  function raf(time){ lenis.raf(time); requestAnimationFrame(raf); }
  requestAnimationFrame(raf);
  hint?.addEventListener('click', ()=> lenis.scrollTo(target, { duration:1.0 }));
} else {
  hint?.addEventListener('click', ()=> target?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }));
}
const lightbox = document.createElement('div');
lightbox.className = 'lightbox';
lightbox.innerHTML = '<button class="lightbox-close" aria-label="Cerrar">×</button><img alt="">';
document.body.appendChild(lightbox);
const lbImg = lightbox.querySelector('img');
const lbClose = lightbox.querySelector('.lightbox-close');
function openLightbox(src, alt){ lbImg.src = src; lbImg.alt = alt || ''; lightbox.classList.add('open'); document.body.style.overflow = 'hidden'; if(window.Lenis) document.documentElement.classList.add('lenis-stopped'); }
function closeLightbox(){ lightbox.classList.remove('open'); document.body.style.overflow = ''; document.documentElement.classList.remove('lenis-stopped'); }
document.querySelectorAll('[data-lightbox]').forEach(img=>{
  img.addEventListener('click', ()=> openLightbox(img.src, img.alt));
});
lightbox.addEventListener('click', e=>{ if(e.target === lightbox) closeLightbox(); });
lbClose.addEventListener('click', closeLightbox);
window.addEventListener('keydown', e=>{ if(e.key === 'Escape') closeLightbox(); });
