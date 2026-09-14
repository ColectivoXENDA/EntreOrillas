const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Pantalla de carga: forzar siempre el inicio de la página al recargar
   (scrollRestoration manual) y ocultar el loader una vez el contenido está listo. */
if('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

const loaderEl = document.getElementById('loader');
const loaderLogoEl = document.querySelector('.loader-logo');
const brandLogoEl = document.querySelector('.brand-logo');

const salidaLoader = () => {
  /* El isotipo vuela desde el centro hasta la posición del brand (arriba-
     izquierda): se mide el destino con FLIP y se aplica translate + scale.
     Simultáneamente el fondo del loader se desvanece y el contenido queda al
     descubierto. */
  if(loaderLogoEl && brandLogoEl && !reduceMotion){
    /* Detener la animación de respiración y fijar el logo visible: si queda
       animando, el keyframe pisa el transform de la transición. */
    loaderLogoEl.style.animation = 'none';
    loaderLogoEl.style.opacity = '1';
    void loaderLogoEl.offsetWidth; // forzar reflow para medir el estado final

    const inicio = loaderLogoEl.getBoundingClientRect();
    const destino = brandLogoEl.getBoundingClientRect();
    const dx = (destino.left + destino.width / 2) - (inicio.left + inicio.width / 2);
    const dy = (destino.top + destino.height / 2) - (inicio.top + inicio.height / 2);
    const escala = destino.width / inicio.width;
    loaderLogoEl.style.transition = 'transform 0.7s cubic-bezier(0.22, 1, 0.36, 1)';
    requestAnimationFrame(() => {
      loaderLogoEl.style.transform = `translate(${dx}px, ${dy}px) scale(${escala})`;
    });
    /* El fade de lo demás arranca cuando el isotipo aterriza (después del
       vuelo de 0.7s): llega a su ubicación en la cabecera y luego todo
       se devela con el fundido del loader. */
    setTimeout(() => {
      loaderEl.classList.add('oculto');
      document.body.classList.add('revelado');
      loaderEl.addEventListener('transitionend', () => loaderEl.remove(), { once:true });
    }, 700);
    setTimeout(() => loaderLogoEl.remove(), 760);
  } else {
    loaderEl.classList.add('oculto');
    document.body.classList.add('revelado');
    loaderEl.addEventListener('transitionend', () => loaderEl.remove(), { once:true });
  }
};

const MINIMO_LOADER = 1500;
if(loaderEl && document.readyState === 'complete'){
  setTimeout(salidaLoader, MINIMO_LOADER);
} else {
  window.addEventListener('load', () => setTimeout(salidaLoader, MINIMO_LOADER));
  setTimeout(() => { if(loaderEl && !loaderEl.classList.contains('oculto')) salidaLoader(); }, 3500);
}

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

/* Scroll suave: el body toma la altura real del contenido y #recorrido viaja
   por transform con inercia (lerp). Se aplica también en móvil; solo se
   desactiva con prefers-reduced-motion. La barra nativa queda oculta por CSS
   (scrollbar-width/::-webkit-scrollbar), el scroll sigue funcionando. */
const suaveScrollEl = document.getElementById('recorrido');
/* El motor de scroll suave entrega el scrub de las escenas 3D con pin manual;
   el módulo basado en position:sticky queda inactivo mientras esté activo. */
let suave3DActivo = false;

if(suaveScrollEl && !reduceMotion){
  /* El clip del video es position:fixed y cubre el viewport. Si queda dentro
     del wrapper trasladado, el transform lo convierte en "fijo relativo al
     ancestro" y deja de cubrir la pantalla. Se cuelga directo de <body>, como
     los paneles. */
  const clipStageFijo = document.getElementById('clipStage');
  if(clipStageFijo) document.body.appendChild(clipStageFijo);

  suaveScrollEl.classList.add('suave');

  function fijarAlturaScroll(){
    document.body.style.height = `${suaveScrollEl.scrollHeight}px`;
  }
  fijarAlturaScroll();
  window.addEventListener('resize', fijarAlturaScroll);
  new ResizeObserver(fijarAlturaScroll).observe(suaveScrollEl);

  /* Escenas 3D: con el wrapper trasladado, position:sticky deja de fijar el
     pin. Se reemplaza por un pin manual: cada escena (250vh) queda "pegada"
     arriba durante sus primeros ~150vh — mientras el video gira — y luego
     vuelve a desplazarse, replicando el sticky nativo. */
  const escenas3DSuave = [...document.querySelectorAll('.planchon-3d-escena')]
    .map(escena => {
      const sticky = escena.querySelector('.planchon-3d-sticky');
      const video = escena.querySelector('video');
      return { escena, sticky, video };
    })
    .filter(item => item.sticky && item.video);

  if(escenas3DSuave.length){
    suave3DActivo = true;
    escenas3DSuave.forEach(item => {
      /* El sticky nativo interferiría con el transform del wrapper: se vuelve
         relativo y el pin lo maneja el motor con translate. */
      item.sticky.style.position = 'relative';
    });

    /* Pin manual por frame: p crece de 0 a 1 mientras la escena (250vh) pasa
       sus primeros ~150vh por la pantalla. El sticky se traslada exactamente
       lo que le falta para quedarse pegado al tope y, al terminar el pin,
       sigue el desplazamiento natural de la escena. */
    function pinEscenas3D(){
      escenas3DSuave.forEach(item => {
        const rect = item.escena.getBoundingClientRect();
        const rango = Math.max(1, item.escena.offsetHeight - window.innerHeight);
        const p = clamp01(-rect.top / rango);
        item.sticky.style.transform = `translate3d(0, ${p * rango}px, 0)`;
        if(item.video.duration){
          item.video.currentTime = p * item.video.duration;
        }
      });
    }
  }

  let actualScroll = window.scrollY;
  const factorSuave = 0.09; // más bajo = más flotante

  const pasoScroll = () => {
    const objetivo = window.scrollY;
    actualScroll += (objetivo - actualScroll) * factorSuave;
    if(Math.abs(objetivo - actualScroll) < 0.05) actualScroll = objetivo;
    suaveScrollEl.style.transform = `translate3d(0, ${-actualScroll}px, 0)`;
    if(suave3DActivo) pinEscenas3D();
    requestAnimationFrame(pasoScroll);
  };
  requestAnimationFrame(pasoScroll);
}

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

    // Fundido ligado al progreso del video: entra en el primer tramo y sale en
    // el último. Así nunca se ve el video "congelado/pausado" en el frame
    // inicial mientras llega a la pantalla, ni clavado en el frame final
    // cuando ya terminó.
    const fadeFraccion = 0.14;
    let opacidad = 1;
    if(progreso < fadeFraccion){
      opacidad = clamp01(progreso / fadeFraccion);
    } else if(progreso > 1 - fadeFraccion){
      opacidad = clamp01((1 - progreso) / fadeFraccion);
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
    if(suave3DActivo) return;
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
