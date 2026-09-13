const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Utilidades compartidas */
function clamp01(v){ return Math.min(Math.max(v, 0), 1); }
function docTop(el){ return el.getBoundingClientRect().top + window.scrollY; }
/* Ejecuta fn en el próximo frame por cada scroll, sin acumular llamadas de más. */
function onScroll(fn){
  let ticking = false;
  window.addEventListener('scroll', () => {
    if(!ticking){
      ticking = true;
      requestAnimationFrame(() => { fn(); ticking = false; });
    }
  }, { passive:true });
}

/* Los paneles "Ver más" se sacan de su <article> y se cuelgan directo de
   <body>: el <article> usa transform/filter para el efecto de aparición,
   y eso lo convierte en el contenedor de sus hijos position:fixed — el
   panel quedaba atrapado en ese contexto de apilamiento, por debajo del
   scrim y afectado por el desenfoque del artículo. */
document.querySelectorAll('.planchon-panel').forEach(panel => {
  document.body.appendChild(panel);
});

/* Ícono de volumen: alterna entre normal y silenciado */
const soundToggle = document.getElementById('soundToggle');
if(soundToggle){
  soundToggle.addEventListener('click', () => {
    const silenciado = soundToggle.getAttribute('aria-pressed') === 'true';
    soundToggle.setAttribute('aria-pressed', String(!silenciado));
  });
}

/* Partículas flotantes de fondo (fijas, recorren toda la página) */
const particlesEl = document.getElementById('particles');
if(particlesEl && !reduceMotion){
  const tints = ['var(--magenta-1)', 'var(--blue)', 'var(--violet)'];
  const count = window.innerWidth < 640 ? 14 : 26;
  for(let i = 0; i < count; i++){
    const dot = document.createElement('span');
    dot.className = 'pt';
    const size = 2 + Math.random() * 3;
    dot.style.width = dot.style.height = `${size.toFixed(1)}px`;
    dot.style.left = `${(Math.random() * 100).toFixed(1)}%`;
    dot.style.top = `${(Math.random() * 100).toFixed(1)}%`;
    dot.style.color = dot.style.background = tints[i % tints.length];
    dot.style.animationDuration = `${(14 + Math.random() * 16).toFixed(1)}s`;
    dot.style.animationDelay = `-${(Math.random() * 20).toFixed(1)}s`;
    particlesEl.appendChild(dot);
  }
}

/* Desenfoque de la presentación al salir con el scroll */
const presentacionEl = document.getElementById('presentacion');
if(presentacionEl && !reduceMotion){
  function updateHeroBlur(){
    const heroHeight = presentacionEl.offsetHeight || window.innerHeight;
    const progreso = clamp01(window.scrollY / heroHeight);
    presentacionEl.style.filter = `blur(${(progreso * 14).toFixed(1)}px)`;
    presentacionEl.style.opacity = String(1 - progreso * 0.85);
  }
  onScroll(updateHeroBlur);
  updateHeroBlur();
}

/* Video que avanza frame por frame con el scroll (puente + origen + vida en
   las orillas), sin detenerse: la duración completa del clip se reparte de
   forma lineal sobre todo el alto de las 3 secciones. */
const escenaVideoEl = document.getElementById('escena-video');
const clipStageEl = document.getElementById('clipStage');
const clipVideoEl = document.getElementById('clipPrincipal');

if(escenaVideoEl && clipVideoEl){
  function updateClip(){
    const rect = escenaVideoEl.getBoundingClientRect();
    const total = escenaVideoEl.offsetHeight - window.innerHeight;
    const progreso = total > 0 ? clamp01(-rect.top / total) : 0;

    // Fundido de entrada/salida basado en la distancia real a la pantalla:
    // así el video no aparece "de golpe" ya congelado en el frame 1 mientras
    // todavía falta scroll para llegar a él.
    const margen = window.innerHeight * 0.5;
    let opacidad = 1;
    if(rect.top > 0){
      opacidad = clamp01(1 - rect.top / margen);
    } else if(rect.bottom < window.innerHeight){
      opacidad = clamp01(rect.bottom / margen);
    }

    clipStageEl.style.opacity = opacidad.toFixed(3);
    if(clipVideoEl.duration){
      clipVideoEl.currentTime = progreso * clipVideoEl.duration;
    }
  }
  onScroll(updateClip);
  window.addEventListener('resize', updateClip);
  clipVideoEl.addEventListener('loadedmetadata', updateClip);
  updateClip();
}

/* Guía en forma de río: solo aparece durante el recorrido de los planchones */
const riverMapEl = document.getElementById('riverMap');
const riverProgress = document.getElementById('riverProgress');
const riverNodes = document.getElementById('riverNodes');
const planchonesEl = document.getElementById('planchones');

if(riverMapEl && riverProgress && riverNodes && planchonesEl){
  const largo = riverProgress.getTotalLength();
  riverProgress.style.strokeDasharray = `${largo}`;
  riverProgress.style.strokeDashoffset = `${largo}`;

  const tituloEls = Array.from(document.querySelectorAll('#planchones .planchon .planchon-intro h2'));
  let nodos = [];
  function calcularNodos(){
    riverNodes.innerHTML = '';
    const planchonesTop = docTop(planchonesEl);
    const total = planchonesEl.offsetHeight - window.innerHeight;
    nodos = tituloEls.map(h2 => {
      // La fracción de cada nodo coincide con el punto exacto en que el
      // título de ese planchón queda a la altura del centro de pantalla,
      // usando la misma fórmula que "progreso" más abajo.
      const fraccion = total > 0 ? clamp01((docTop(h2) - planchonesTop) / total) : 0;
      const punto = riverProgress.getPointAtLength(fraccion * largo);
      const nodo = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      nodo.setAttribute('class', 'river-node');
      nodo.setAttribute('r', '4');
      nodo.setAttribute('cx', punto.x);
      nodo.setAttribute('cy', punto.y);
      riverNodes.appendChild(nodo);
      return { fraccion, nodo };
    });
  }
  calcularNodos();

  function updateRiver(){
    const rect = planchonesEl.getBoundingClientRect();
    const total = planchonesEl.offsetHeight - window.innerHeight;
    // El "punto de lectura" es el centro de la pantalla, para que un nodo se
    // encienda justo cuando su título pasa por la mitad del viewport.
    const progreso = total > 0 ? clamp01((-rect.top + window.innerHeight * 0.5) / total) : 0;

    const margen = window.innerHeight * 0.5;
    let opacidad = 1;
    if(rect.top > 0){
      opacidad = clamp01(1 - rect.top / margen);
    } else if(rect.bottom < window.innerHeight){
      opacidad = clamp01(rect.bottom / margen);
    }

    riverMapEl.style.opacity = opacidad.toFixed(3);
    riverProgress.style.strokeDashoffset = `${largo * (1 - progreso)}`;
    nodos.forEach(({ fraccion, nodo }) => {
      nodo.classList.toggle('is-passed', progreso > fraccion + 0.02);
      nodo.classList.toggle('is-active', Math.abs(progreso - fraccion) <= 0.05);
    });
  }
  onScroll(updateRiver);
  window.addEventListener('resize', () => { calcularNodos(); updateRiver(); });
  updateRiver();
}

/* HUD: ubicación actual (nombre de la sección) + porcentaje del recorrido */
const hudUbicacionEl = document.getElementById('hudUbicacion');
const hudProgress = document.getElementById('hudProgress');
const hudBarFill = document.getElementById('hudBarFill');

if(hudUbicacionEl || hudProgress || hudBarFill){
  const hitosUbicacion = [
    { el: document.getElementById('presentacion'), label: 'Presentación' },
    { el: document.getElementById('introduccion'), label: 'Puente Gustavo Rojas Pinilla' },
    { el: document.getElementById('origen'), label: 'El origen de los planchones' },
    { el: document.getElementById('vida-en-las-orillas'), label: 'La vida en las orillas' },
    ...Array.from(document.querySelectorAll('.planchon')).map(planchon => {
      const nombre = planchon.querySelector('.planchon-intro h2');
      return { el: planchon, label: nombre ? nombre.textContent.trim() : '' };
    }),
    { el: document.getElementById('cierre'), label: 'Cierre' },
  ].filter(hito => hito.el);

  function updateHud(){
    const y = window.scrollY + window.innerHeight * 0.35;
    let actual = hitosUbicacion[0];
    for(const hito of hitosUbicacion){
      if(docTop(hito.el) <= y) actual = hito;
      else break;
    }
    if(hudUbicacionEl && actual) hudUbicacionEl.textContent = actual.label;

    const alto = document.documentElement.scrollHeight - window.innerHeight;
    const progreso = alto > 0 ? clamp01(window.scrollY / alto) : 0;
    if(hudProgress) hudProgress.textContent = Math.round(progreso * 100);
    if(hudBarFill) hudBarFill.style.width = `${(progreso * 100).toFixed(1)}%`;
  }
  onScroll(updateHud);
  window.addEventListener('resize', updateHud);
  updateHud();
}

/* Reveal al hacer scroll: desvanecimiento + desenfoque para todo el texto */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if(entry.isIntersecting){
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0 });

document.querySelectorAll('#recorrido section, .planchon').forEach(el => revealObserver.observe(el));

/* Panel "Ver más" de cada planchón (y del origen): drawer que se desliza
   desde el lado contrario al texto. */
const panelScrim = document.getElementById('planchonPanelScrim');

function cerrarPaneles(){
  document.querySelectorAll('.planchon-panel.abierto').forEach(panel => {
    panel.classList.remove('abierto');
    panel.setAttribute('aria-hidden', 'true');
    const boton = document.querySelector(`[aria-controls="${panel.id}"]`);
    if(boton) boton.setAttribute('aria-expanded', 'false');
  });
  if(panelScrim) panelScrim.classList.remove('abierto');
}

document.querySelectorAll('.planchon-toggle').forEach(boton => {
  boton.addEventListener('click', () => {
    const panel = document.getElementById(boton.getAttribute('aria-controls'));
    if(!panel) return;
    const yaAbierto = panel.classList.contains('abierto');
    cerrarPaneles();
    if(!yaAbierto){
      panel.classList.add('abierto');
      panel.setAttribute('aria-hidden', 'false');
      boton.setAttribute('aria-expanded', 'true');
      if(panelScrim) panelScrim.classList.add('abierto');
    }
  });
});

document.querySelectorAll('.planchon-panel-cerrar').forEach(boton => {
  boton.addEventListener('click', cerrarPaneles);
});
if(panelScrim) panelScrim.addEventListener('click', cerrarPaneles);
window.addEventListener('keydown', e => { if(e.key === 'Escape') cerrarPaneles(); });

/* Modelo 3D de cada planchón: gira frame por frame con el scroll (pin con position:sticky) */
const escenas3D = [...document.querySelectorAll('.planchon-3d-escena')]
  .map(escena => ({ escena, video: escena.querySelector('video') }))
  .filter(item => item.video);

if(escenas3D.length){
  function updateEscenas3D(){
    escenas3D.forEach(({ escena, video }) => {
      const rect = escena.getBoundingClientRect();
      const total = escena.offsetHeight - window.innerHeight;
      const progreso = total > 0 ? clamp01(-rect.top / total) : 0;
      if(video.duration){
        video.currentTime = progreso * video.duration;
      }
    });
  }
  onScroll(updateEscenas3D);
  window.addEventListener('resize', updateEscenas3D);
  escenas3D.forEach(({ video }) => video.addEventListener('loadedmetadata', updateEscenas3D));
  updateEscenas3D();
}
