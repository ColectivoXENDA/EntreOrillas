/* ==========================================================================
   ENTRE ORILLAS — script.js   (v5 · sin media, transiciones secuenciales)

   POR QUÉ ESTA VERSIÓN
   --------------------
   La v4 pintaba cada escena con timelines de GSAP solapadas y con capas de
   video que todavía no existen. De ahí los tres defectos que se veían:
   textos de dos fases superpuestos, bandas de color (imágenes rotas) y saltos
   al entrar en un planchón.

   Aquí el planteamiento es otro y es el que da fluidez:

   1. UN SOLO RELOJ POR ESCENA. El scroll no dispara animaciones: escribe un
      número, el progreso de la escena. Un único bucle rAF persigue ese número
      con interpolación y REDIBUJA todo a partir de él. Cada fotograma es una
      función pura del progreso, así que nada puede quedar a medias, ni
      pisarse, ni desincronizarse al subir.

   2. VENTANAS DE FASE QUE NO SE TOCAN. Las cinco fases de cada planchón
      tienen su tramo y entre tramo y tramo hay un hueco real. Los fundidos
      viven DENTRO de cada ventana, así que es imposible ver dos textos a la
      vez.

   3. SIN MEDIA (MEDIA_ENABLED = false en data.js). No se crea ni un <video>
      ni una <img> de fondo: las cuatro fases se dibujan con gráficos de
      marca y con el esquema vectorial del planchón, que es el protagonista.
      Cuando lleguen los clips, el interruptor los vuelve a montar encima.

   ACTUALIZACIÓN — SIN GSAP
   ------------------------
   MEDIA_ENABLED ya está en `true` (video real en las 12 escenas). El pineado
   ya no lo hace GSAP ScrollTrigger: lo hace `position: sticky` nativo del
   navegador (ver styles.css) y un motor de progreso propio, mucho más
   liviano, en la sección "4. MOTOR DE SCROLL NATIVO" más abajo. Ese motor
   implementa la misma interfaz que se usaba antes (`ScrollTrigger.create`,
   `.progress`, `.isActive`, `onUpdate`/`onToggle`/`onEnter`/`onLeave`), así
   que todo lo que sigue en este archivo no cambió una línea.
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMobile = window.matchMedia("(max-width: 760px)").matches;
  const isTouch = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
  const MEDIA = typeof MEDIA_ENABLED !== "undefined" ? MEDIA_ENABLED : false;
  const FLIGHT = (typeof FLIGHT_ENABLED !== "undefined" ? FLIGHT_ENABLED : false) || MEDIA;
  const TAU = Math.PI * 2;

  /* ---------------------------------- utilidades -------------------------- */
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;

  /** Rampa suave entre dos umbrales: 0 antes de `a`, 1 después de `b`. */
  function smoothstep(a, b, v) {
    if (b <= a) return v >= b ? 1 : 0;
    const t = clamp((v - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  }

  /** Pulso: sube en [a,b] y baja en [c,d]. La base de todas las fases. */
  function pulse(a, b, c, d, v) {
    return Math.min(smoothstep(a, b, v), 1 - smoothstep(c, d, v));
  }

  /** Pseudo-aleatorio determinista: misma entrada, mismo resultado siempre. */
  function seeded(i) {
    const x = Math.sin(i * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  }

  function el(tag, className, html) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (html !== undefined) node.innerHTML = html;
    return node;
  }

  const chips = (list) =>
    (list || []).length ? `<ul class="meta-chips">${list.map((m) => `<li>${m}</li>`).join("")}</ul>` : "";

  /* Estado del HUD. Arriba del todo porque los ScrollTrigger pueden disparar
     sus callbacks durante su propia creación. */
  let altTarget = 1200, altShown = 1200, routeProgress = 0;
  let journeyLat = JOURNEY.coords.lat0, journeyLon = JOURNEY.coords.lon0;
  let nodeEls = [], listEls = [];
  let a11yOn = false;

  const globalStack = document.getElementById("globalStack");
  const main = document.getElementById("main");

  /* --- ORDEN DEL RECORRIDO ----------------------------------------------
     Las fichas se escriben en data.js en el orden del documento, pero se
     visitan en el de ROUTE_ORDER (el vuelo aterriza en La Esmeralda). Se
     reordena una sola vez y se renumera según la posición real, de modo que
     el resto del archivo no necesita saber nada de esto. */
  if (typeof ROUTE_ORDER !== "undefined" && Array.isArray(ROUTE_ORDER)) {
    const byId = new Map(PLANCHONES.map((p) => [p.id, p]));
    const ordered = ROUTE_ORDER.map((id) => byId.get(id)).filter(Boolean);
    // Una ficha que no esté en la lista se conserva al final: añadir un
    // planchón nuevo nunca lo hace desaparecer del recorrido.
    PLANCHONES.forEach((p) => { if (!ROUTE_ORDER.includes(p.id)) ordered.push(p); });
    PLANCHONES.length = 0;
    ordered.forEach((p, i) => {
      p.num = String(i + 1).padStart(2, "0");
      PLANCHONES.push(p);
    });
  }

  // ==========================================================================
  // 0. MARCA
  // ==========================================================================
  const LOGO_SRC = (typeof BRAND !== "undefined" && BRAND.logo) || "";
  const LOGO_FULL = (typeof BRAND !== "undefined" && BRAND.logoFull) || LOGO_SRC;

  /* El logotipo real manda; el compuesto con tipografía es el respaldo por si
     el archivo falta. Se precarga aparte y solo se asigna al <img> visible
     cuando ya se sabe que carga: así no hay ni un fotograma de imagen rota. */
  function mountLogo(src, img, onReady) {
    if (!src || !img) return;
    const probe = new Image();
    probe.addEventListener("load", () => {
      if (!probe.naturalWidth) return;
      img.src = src;
      img.hidden = false;
      if (onReady) onReady();
    });
    probe.src = src;
  }

  const brandLogo = document.getElementById("brandLogo");
  const brandFallback = document.getElementById("brandFallback");
  mountLogo(LOGO_SRC, brandLogo, () => { if (brandFallback) brandFallback.hidden = true; });

  // ==========================================================================
  // 1. CONSTRUCCIÓN DEL DOM
  // ==========================================================================

  /* --- 1a. ESCENARIO DEL VUELO ------------------------------------------
     Capa fija de fondo. Con media, un único <video> con el recorrido entero.
     Sin media, un cielo y un río dibujados por capas que se desplazan con el
     progreso: el vuelo sigue leyéndose como vuelo. */
  const flightStage = el("div", "flight-stage");
  flightStage.id = "flightStage";
  flightStage.setAttribute("aria-hidden", "true");

  const flightMedia = el("div", "flight-media");
  let flightVideo = null;

  /* Servido como archivo suelto, el seek depende de que el servidor honre
     peticiones por rango de bytes; si no las sirve bien, currentTime se queda
     clavado en 0 aunque la duración se lea correctamente (síntoma: readyState
     nunca pasa de HAVE_METADATA). El clip del vuelo pesa poco: se trae
     entero como Blob y se sirve desde un object URL propio del navegador,
     así el seek es puramente local y no depende de cómo sirva el servidor. */
  const blobUrlCache = new Map();
  function loadAsBlobUrl(url, onReady) {
    if (!url) return;
    if (blobUrlCache.has(url)) { onReady(blobUrlCache.get(url)); return; }
    fetch(url).then((r) => r.blob()).then((blob) => {
      const objUrl = URL.createObjectURL(blob);
      blobUrlCache.set(url, objUrl);
      onReady(objUrl);
    }).catch(() => onReady(url));   // si falla el fetch, se intenta directo
  }
  function setFlightSrc(video, url) {
    loadAsBlobUrl(url, (resolved) => {
      video.dataset.logicalSrc = url;
      video.setAttribute("src", resolved);
      video.load();
    });
  }

  if (FLIGHT) {
    flightVideo = document.createElement("video");
    flightVideo.className = "flight-video";
    flightVideo.muted = true;
    flightVideo.playsInline = true;
    flightVideo.setAttribute("muted", "");
    flightVideo.setAttribute("playsinline", "");
    flightVideo.setAttribute("webkit-playsinline", "");
    flightVideo.setAttribute("preload", "auto");
    flightVideo.setAttribute("aria-hidden", "true");
    flightMedia.appendChild(flightVideo);
  } else {
    flightStage.classList.add("flight-stage--gfx");
    flightMedia.innerHTML =
      `<div class="gfx-sky"></div>
       <div class="gfx-river" id="gfxRiver">
         <span class="gfx-bank gfx-bank--l"></span>
         <span class="gfx-bank gfx-bank--r"></span>
         <span class="gfx-shimmer"></span>
       </div>
       <div class="gfx-haze"></div>`;
  }

  flightStage.append(flightMedia, el("div", "flight-overlay"));
  globalStack.after(flightStage);

  /* --- 1b. EL RECORRIDO --------------------------------------------------- */
  function buildJourney(J) {
    const section = el("section", "journey");
    section.id = J.id;
    section.style.height = (isMobile && J.heightVhMobile ? J.heightVhMobile : J.heightVh) + "vh";

    const pin = el("div", "journey-pin");

    const beats = J.beats.map((b) => {
      if (b.id === "la-33" && typeof COSTUMBRE_CARDS !== "undefined" && !b.cards) {
        b.cards = COSTUMBRE_CARDS;
      }

      const root = el("div", `journey-beat beat--${b.kind}` +
        (b.side === "right" ? " beat--right" : ""));
      root.dataset.beat = b.id;
      root.setAttribute("data-screen-label", b.label || b.id);

      const inner = el("div", "beat-inner");

      if (b.kind === "hero") {
        const words = (b.title || "").split(" ")
          .map((w, i) => `<span class="pw"><span class="pw-i" style="--i:${i}">${w}</span></span>`)
          .join(" ");
        inner.innerHTML =
          `<span class="eyebrow beat-eyebrow">${b.eyebrow}</span>
           <div class="hero-lockup">
             <img class="hero-logo" id="heroLogo" alt="Entre Orillas" hidden>
             <h1 class="beat-title beat-title--hero" id="heroType">${words}</h1>
           </div>
           <p class="beat-subtitle">${b.subtitle || ""}</p>
           <p class="beat-text">${b.text || ""}</p>`;
      } else {
        inner.innerHTML =
          `<span class="eyebrow beat-eyebrow">${b.eyebrow}</span>
           <h2 class="beat-title">${b.title}</h2>
           <p class="beat-text">${b.text || ""}</p>`;
      }

      root.appendChild(inner);

      let indicator = null;
      if (b.indicator) {
        indicator = el("div", "scroll-indicator beat-indicator",
          `<span class="scroll-indicator__mouse"><span class="scroll-indicator__dot"></span></span>
           <span class="scroll-indicator__label">${isTouch ? "Desliza para navegar el río" : "Baja para navegar el río"}</span>`);
        root.appendChild(indicator);
      }

      // Tarjetas flotantes: solo si hay fotografías reales que poner dentro.
      const cardEls = (MEDIA ? (b.cards || []) : []).map((c) => {
        const fig = el("figure", "float-card",
          `<img src="${c.src}" alt="${c.caption}" loading="lazy" decoding="async">
           <figcaption>${c.caption}</figcaption>`);
        fig.style.left = c.spot[0] + "%";
        fig.style.top = c.spot[1] + "%";
        root.appendChild(fig);
        return { el: fig, data: c };
      });

      pin.appendChild(root);
      return {
        data: b, root, inner, indicator, cardEls,
        words: Array.from(inner.querySelectorAll(".pw-i")),
      };
    });

    section.appendChild(pin);
    return { section, pin, beats };
  }

  const journey = buildJourney(JOURNEY);

  /* La portada: el lockup con el claim. Se consulta sobre `journey.section`
     porque la sección todavía no está insertada en el documento. */
  const heroLogo = journey.section.querySelector("#heroLogo");
  const heroType = journey.section.querySelector("#heroType");
  const heroSub = journey.section.querySelector(".beat-subtitle");
  mountLogo(LOGO_FULL, heroLogo, () => {
    if (heroType) heroType.classList.add("is-sr");
    if (heroSub) heroSub.hidden = true;   // el claim ya viene en el logotipo
  });

  /* --- 1c. Fondos ---------------------------------------------------------
     Con media, un <video>. Sin media, un gráfico de marca cuyo tono deriva
     del índice del planchón: doce escenas que no se confunden entre sí. */
  function makeBackdrop(kind, srcKey, index) {
    if (MEDIA && srcKey) {
      const v = document.createElement("video");
      v.className = "bg-video";
      v.muted = true; v.loop = true; v.playsInline = true;
      v.setAttribute("muted", "");
      v.setAttribute("playsinline", "");
      v.setAttribute("webkit-playsinline", "");
      v.setAttribute("preload", "none");
      v.setAttribute("aria-hidden", "true");
      v.dataset.src = (typeof VIDEO_LIB !== "undefined" && VIDEO_LIB[srcKey]) || srcKey;
      return v;
    }
    const node = el("div", `bg-gfx bg-gfx--${kind}`);
    node.setAttribute("aria-hidden", "true");
    // El tono recorre el degradado de marca a lo largo de la ruta: azul en
    // las primeras paradas, magenta en las últimas.
    node.style.setProperty("--h", (index / Math.max(PLANCHONES.length - 1, 1)).toFixed(3));
    return node;
  }

  const closingBackdrop = makeBackdrop("closing", MEDIA ? CLOSING_SCENE.video : null, PLANCHONES.length - 1);
  globalStack.appendChild(closingBackdrop);
  globalStack.appendChild(el("div", "video-overlay"));

  function buildClosing(sc) {
    const section = el("section", "stop stop--closing");
    section.id = sc.id;
    section.setAttribute("data-screen-label", "Cierre");
    const card = el("div", "scene-card",
      `<span class="eyebrow">${sc.eyebrow}</span>
       <h2 class="title">${sc.title}</h2>
       <p class="text">${sc.text}</p>
       <a class="cta-btn" href="${sc.ctaUrl}">${sc.ctaLabel}</a>`);
    section.appendChild(card);
    return { section, card };
  }

  /* --- 1d. Escena de planchón --------------------------------------------
     Cinco bloques de texto sobre cuatro tratamientos visuales:
       conoce  -> vista aérea
       tecnica -> vectorización: barrido + el esquema dibujándose
       modelo  -> el esquema completo, en neón
       gente   -> a bordo
       ficha   -> el río + costumbres + ¿sabías que...?
     ---------------------------------------------------------------------- */
  const wireTpl = document.getElementById("wireTpl");

  /* VENTANAS DE FASE. Entre una y la siguiente hay un hueco de 0.02, y los
     fundidos ocurren dentro de la propia ventana: por construcción no puede
     haber dos fases visibles a la vez. */
  const FADE = 0.045;
  const PHASE_WINDOWS = {
    conoce:  [0.000, 0.190],
    tecnica: [0.215, 0.400],
    modelo:  [0.425, 0.605],
    gente:   [0.630, 0.810],
    ficha:   [0.835, 1.000],
  };

  function buildPlanchon(p, index, total) {
    const wrapper = el("section", `planchon lay-${p.layout || "full"}`);
    wrapper.id = p.id;
    wrapper.setAttribute("data-screen-label", `${p.num} ${p.name}`);
    // Más alto = más scroll por planchón = más margen entre fases: se sentían
    // muy pegadas una a otra, sobre todo al bajar rápido.
    wrapper.style.height = (isMobile ? 500 : 640) + "vh";
    if (index === 0) wrapper.classList.add("planchon--first");
    if ((p.layout || "full") === "full" && index % 2 === 1) wrapper.classList.add("side-right");

    const pin = el("div", "planchon-pin");
    if (p.layout === "split") pin.appendChild(el("div", "stage-panel"));

    const media = el("div", "stage-media");
    const aerial = makeBackdrop("aerial", p.aerial || "aerial", index);
    const interior = makeBackdrop("interior", p.interior || "interior", index);

    /* El esquema vectorial es el protagonista de las fases 2 y 3: se dibuja
       solo y luego queda completo, en neón. */
    const wireWrap = el("div", "wire-wrap");
    const wire = wireTpl.content.firstElementChild.cloneNode(true);
    wireWrap.appendChild(wire);

    const scan = el("div", "vec-scan");
    const grid = el("div", "vec-grid");

    /* Modelo 3D real: si hay video para este planchón, se monta encima del
       esquema vectorial y lo sustituye durante la fase "modelo" — el
       wireframe se desvanece cuando el video toma su lugar. Gira con el
       scroll usando el mismo motor del vuelo (createFlightEngine). */
    let model3dVideo = null, model3dEngine = null;
    if (MEDIA && typeof MODELS_3D !== "undefined" && MODELS_3D[p.id]) {
      model3dVideo = document.createElement("video");
      model3dVideo.className = "bg-video bg-video--model model3d-video";
      model3dVideo.muted = true; model3dVideo.playsInline = true;
      model3dVideo.setAttribute("muted", "");
      model3dVideo.setAttribute("playsinline", "");
      model3dVideo.setAttribute("webkit-playsinline", "");
      model3dVideo.setAttribute("preload", "none");
      model3dVideo.setAttribute("aria-hidden", "true");
      model3dVideo.dataset.src = MODELS_3D[p.id];
      model3dEngine = createFlightEngine(model3dVideo);
      // Arranca en pausa: si no, su rAF interno queda vivo desde el primer
      // fotograma para las 12 escenas aunque ninguna esté en pantalla todavía.
      model3dEngine.pause();
    }

    media.append(aerial, interior, grid, wireWrap, scan);
    if (model3dVideo) media.appendChild(model3dVideo);
    media.appendChild(el("div", "video-overlay"));

    const content = el("div", "stage-content");
    const numeral = el("div", "stage-numeral", p.num || String(index + 1).padStart(2, "0"));

    function phase(kind, html) {
      const outer = el("div", `planchon-phase phase-${kind}`);
      const inner = el("div", "phase-inner", html);
      outer.appendChild(inner);
      return outer;
    }

    const conoce = p.conoce || {}, tecnica = p.tecnica || {};
    const modelo = p.modelo || {}, gente = p.gente || {};

    const phases = {
      conoce: phase("aerial",
        `<span class="tag">Conoce el planchón · ${p.num}/${String(total).padStart(2, "0")}</span>
         <h3 class="title">${p.name}</h3>
         <p class="subtitle">${p.tagline}</p>
         <p class="text">${conoce.lead || ""}</p>
         ${conoce.more ? `<p class="text text--more">${conoce.more}</p>` : ""}
         ${chips(conoce.meta)}`),

      tecnica: phase("tec",
        `<span class="tag">Técnica · levantamiento</span>
         <h3 class="title">Cómo está hecho</h3>
         <p class="text">${tecnica.lead || ""}</p>
         ${chips(tecnica.meta)}`),

      modelo: phase("neon",
        `<span class="tag">${MEDIA && MODELS_3D[p.id] ? "Modelo 3D" : "Morfología"}</span>
         <h3 class="title">${p.tagline}</h3>
         <p class="neon-caption">${modelo.lead || ""}</p>
         <button class="know-more-btn" type="button" data-plan-id="${p.id}">
           Conocer más <span aria-hidden="true">→</span>
         </button>`),

      gente: phase("interior",
        `<span class="tag">Su gente · a bordo</span>
         <h3 class="title">Quienes sostienen el cruce</h3>
         <p class="text">${gente.lead || ""}</p>
         ${chips(gente.meta)}`),

      ficha: phase("ficha",
        `<div class="ficha">
           <div class="ficha-grid">
             <div class="ficha-block">
               <span class="ficha-key">El río</span>
               <p class="text">${p.rio || ""}</p>
             </div>
             <div class="ficha-block">
               <span class="ficha-key">Costumbres y vida cotidiana</span>
               <p class="text">${p.costumbres || ""}</p>
             </div>
           </div>
           <div class="ficha-sabias">
             <span class="ficha-key">¿Sabías que...?</span>
             <p class="text">${p.sabias || ""}</p>
           </div>
           ${MEDIA && typeof VIDEOS_360 !== "undefined" && VIDEOS_360[p.id] ? `
           <div class="ficha-360">
             <span class="ficha-key">Vista 360°</span>
             <video class="ficha-360-video" controls playsinline preload="metadata" poster="assets/img/posters-360/360-${p.id}.jpg" src="${VIDEOS_360[p.id]}" data-lazysrc="${VIDEOS_360[p.id]}"></video>
           </div>` : ""}
           <div class="ficha-foot">
             <span class="ficha-coord">${p.coords || ""}</span>
             <a class="more-link" href="#${index + 1 < total ? PLANCHONES[index + 1].id : CLOSING_SCENE.id}">
               ${index + 1 < total ? `Siguiente · ${PLANCHONES[index + 1].name}` : "Cerrar el recorrido"} →
             </a>
           </div>
         </div>`),
    };

    content.appendChild(numeral);
    Object.keys(phases).forEach((k) => content.appendChild(phases[k]));
    pin.append(media, content);
    wrapper.appendChild(pin);

    // Longitudes de trazo: NO se pueden medir aquí. Un SVG que todavía no
    // está en el documento es un "non-rendered element" y getTotalLength()
    // lanza. Se miden en el paso 1e, después de insertar la escena.
    const wirePaths = Array.from(wire.querySelectorAll(".wire-path"))
      .map((node) => ({ node, len: 300 }));

    return {
      data: p, index, wrapper, pin, media, numeral, scan, grid, wireWrap, wirePaths,
      backdrops: { aerial, interior },
      model3dVideo, model3dEngine,
      phases,
      shown: 0, target: 0, active: false,
    };
  }

  /* --- 1e. Ensamblado ----------------------------------------------------- */
  const closing = buildClosing(CLOSING_SCENE);

  main.appendChild(journey.section);
  const planchones = PLANCHONES.map((p, i) => {
    const b = buildPlanchon(p, i, PLANCHONES.length);
    main.appendChild(b.wrapper);
    return b;
  });
  main.appendChild(closing.section);

  /* Ahora que las escenas están en el documento, los trazos ya se pueden
     medir: se deja cada uno "sin dibujar" para que la fase 2 los dibuje. */
  planchones.forEach((s) => {
    s.wirePaths.forEach((wp) => {
      try { wp.len = wp.node.getTotalLength() || 300; } catch (e) { wp.len = 300; }
      wp.node.style.strokeDasharray = `${wp.len}`;
      wp.node.style.strokeDashoffset = `${wp.len}`;
    });
  });

  /* --- 1f. Partículas ----------------------------------------------------- */
  const fgParticles = document.getElementById("fgParticles");
  if (fgParticles && !reduceMotion && !isMobile) {
    const tints = ["var(--magenta)", "var(--blue)", "var(--violet)"];
    for (let i = 0; i < 16; i++) {
      const s = seeded(i * 3 + 1), s2 = seeded(i * 7 + 5);
      const dot = el("span", "pt");
      const size = 2 + s * 3;
      dot.style.width = dot.style.height = `${size.toFixed(1)}px`;
      dot.style.left = `${(s * 100).toFixed(1)}%`;
      dot.style.top = `${(s2 * 100).toFixed(1)}%`;
      dot.style.color = dot.style.background = tints[i % 3];
      dot.style.animationDuration = `${(14 + s2 * 16).toFixed(1)}s`;
      dot.style.animationDelay = `-${(s * 20).toFixed(1)}s`;
      fgParticles.appendChild(dot);
    }
  }

  /* --- 1g. MODO ACCESIBLE: la segunda interfaz -----------------------------
     Se construye una sola vez, desde los mismos datos, como un documento
     lineal e independiente del recorrido visual. `a11ySections` guarda cada
     bloque leíble (encabezado o párrafo) para la navegación y la lectura en
     voz alta; `a11yToc` es el índice por el que se salta de sección. */
  const a11yContent = document.getElementById("a11yContent");
  const a11yToc = document.getElementById("a11yToc");
  let a11ySections = [];   // { id, title, els: [nodo,...] } — una por parada
  let a11yBlocks = [];     // { el, text } — cada encabezado/párrafo leíble

  if (a11yContent) {
    let blockSeq = 0;
    function block(tag, text, extra) {
      if (!text) return "";
      blockSeq += 1;
      const id = `a11yb-${blockSeq}`;
      return `<${tag} id="${id}"${extra || ""}>${text}</${tag}>`;
    }

    const sectionsHtml = [];
    sectionsHtml.push({
      id: "intro", title: "Entre Orillas",
      html: block("h1", "Entre Orillas — el río que nos mueve") +
        JOURNEY.beats.map((b) => block("h2", b.title) + block("p", b.text || "")).join(""),
    });
    PLANCHONES.forEach((p) => {
      const c = p.conoce || {}, t = p.tecnica || {}, m = p.modelo || {}, g = p.gente || {};
      sectionsHtml.push({
        id: p.id, title: `${p.num} · ${p.name}`,
        html:
          block("h2", `${p.num} · ${p.name} — ${p.tagline}`) +
          block("h3", "Conoce el planchón") + block("p", c.lead) + block("p", c.more) +
          block("h3", "Técnica") + block("p", t.lead) + block("p", m.lead) +
          block("h3", "Su gente") + block("p", g.lead) +
          block("h3", "El río") + block("p", p.rio) +
          block("h3", "Costumbres y vida cotidiana") + block("p", p.costumbres) +
          block("h3", "¿Sabías que…?") + block("p", p.sabias),
      });
    });
    sectionsHtml.push({
      id: CLOSING_SCENE.id, title: "Cierre",
      html: block("h2", CLOSING_SCENE.title) + block("p", CLOSING_SCENE.text),
    });

    a11yContent.innerHTML = sectionsHtml.map((s) => s.html).join("");

    a11ySections = sectionsHtml.map((s) => ({ id: s.id, title: s.title }));
    a11yBlocks = Array.from(a11yContent.querySelectorAll("h1, h2, h3, p"))
      .map((el) => ({ el, text: el.textContent.trim() }))
      .filter((b) => b.text);

    // El índice: un botón por parada. Saltar mueve el foco y, si se está
    // leyendo, retoma la lectura desde el primer bloque de esa sección.
    if (a11yToc) {
      let cursor = 0;
      sectionsHtml.forEach((s, si) => {
        const startIdx = cursor;
        // Cuenta cuántos bloques leíbles caen dentro de esta sección para
        // saber dónde retomar la lectura al saltar.
        const tmp = document.createElement("div");
        tmp.innerHTML = s.html;
        cursor += tmp.querySelectorAll("h1, h2, h3, p").length;

        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = s.title;
        btn.dataset.blockIndex = String(startIdx);
        btn.addEventListener("click", () => a11yJumpTo(startIdx, si));
        a11yToc.appendChild(btn);
      });
    }
  }

  // ==========================================================================
  // 2. PRESUPUESTO DE VIDEO (solo con media activa)
  // ==========================================================================
  function activateVideoSrc(video) {
    if (!video.dataset || !video.dataset.src) return;
    if (video.getAttribute("src") !== video.dataset.src) {
      video.setAttribute("src", video.dataset.src);
      video.load();
    }
    const pr = video.play(); if (pr !== undefined) pr.catch(() => {});
  }
  function releaseVideoSrc(video) {
    if (!video.getAttribute("src")) return;
    try { video.pause(); } catch (e) { /* nada */ }
    video.removeAttribute("src");
    video.load();
  }

  /* Videos 360°: reproductor normal con controles, el usuario decide cuándo
     reproducir; nunca se ponen en marcha solos. Antes se les asignaba el
     `src` con un IntersectionObserver aparte, atado directamente al propio
     <video>, que vive dentro del panel "ficha" — un panel que se muestra y
     oculta con `visibility` según la fase del scroll. Ese observer anidado
     resultaba poco fiable (el cambio de visibilidad del ancestro no siempre
     disparaba una nueva medición a tiempo) y el video se quedaba en gris.
     Ahora el `src` se asigna en cuanto el PLANCHÓN completo entra en
     pantalla — el mismo observer, ya probado, que activa los demás videos —
     así no depende de la visibilidad fina del panel. */
  function activate360Src(video) {
    if (video.dataset.lazysrc && video.getAttribute("src") !== video.dataset.lazysrc) {
      video.setAttribute("src", video.dataset.lazysrc);
    }
  }

  if (MEDIA && "IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (a11yOn) return;
        if (e.isIntersecting) {
          e.target.querySelectorAll("video[data-src]").forEach(activateVideoSrc);
          e.target.querySelectorAll(".ficha-360-video[data-lazysrc]").forEach(activate360Src);
        } else {
          // Antes esto solo liberaba en móvil: en escritorio, cada video que
          // llegaba a activarse quedaba reproduciéndose para siempre, así que
          // al llegar al último planchón podían estar decodificando los 36 a
          // la vez. Con decodificadores de hardware limitados a 1-2 streams,
          // el resto cae a software y ahí está el lag general de la página.
          e.target.querySelectorAll("video").forEach(releaseVideoSrc);
        }
      });
    }, { rootMargin: isMobile ? "80% 0px" : "140% 0px" });
    planchones.forEach((b) => io.observe(b.wrapper));
    io.observe(closing.section);
  }

  // ==========================================================================
  // 3. MOTOR DEL VUELO
  //    Con media: el scroll fija un tiempo objetivo y el video LO SIGUE
  //    reproduciéndose hacia delante a velocidad variable (playbackRate), en
  //    vez de saltar con currentTime en cada fotograma. Es lo que quita la
  //    vibración: sobre un video real, comprimido con keyframes espaciados,
  //    reposicionar currentTime muchas veces por segundo obliga a decodificar
  //    desde el keyframe más cercano en cada salto, y esa descarga desigual
  //    es justo el tembleque que se veía. Reproducir hacia delante decodifica
  //    en orden, así que es fluido por construcción — y de paso GARANTIZA que
  //    el clip se reproduce entero: nunca se salta un tramo, solo se acelera
  //    o se frena. Solo se hace un salto duro (`currentTime =`) cuando hay que
  //    retroceder (el usuario sube el scroll) o el salto es demasiado grande.
  //    Sin media: mueve el gráfico, sin decodificar nada, así que ahí sí cabe
  //    el vaivén perpetuo en reposo.
  // ==========================================================================
  function createFlightEngine(video) {
    const MAX_RATE = 3.2;        // techo de aceleración: más bajo = más estable
    const HARD_SEEK = 0.7;       // segundos de diferencia → salto directo
    const PAUSE_AT = 0.010;      // por debajo de esto, se detiene
    const RESUME_AT = 0.045;     // y no vuelve a arrancar hasta superar esto
    // Dos umbrales distintos (histéresis) en vez de uno: con uno solo, un
    // valor de `dist` que ronda justo la frontera hace que cada fotograma
    // decida una cosa distinta —para, arranca, para, arranca— y ESE
    // parpadeo de play()/pause() muchas veces por segundo es la vibración.
    const REVERSE_AT = 0.035;    // umbral para el salto puntual hacia atrás
    const RATE_SMOOTH = 0.16;    // qué tan rápido converge la velocidad mostrada

    let duration = 0, ready = false, live = true, target = 0;
    let settled = true, curRate = 1;

    function onReady() {
      if (ready || !isFinite(video.duration) || video.duration <= 0) return;
      duration = video.duration; ready = true;
      video.pause();
      try { video.currentTime = clamp(target, 0, duration); } catch (e) { /* aún no */ }
    }
    ["loadedmetadata", "durationchange", "canplay"].forEach((ev) =>
      video.addEventListener(ev, onReady));

    /* iOS no deja mover el tiempo de un video que nunca se ha reproducido. */
    function unlock() {
      const pr = video.play();
      if (pr !== undefined) pr.then(() => video.pause()).catch(() => {});
    }
    window.addEventListener("touchstart", unlock, { once: true, passive: true });
    window.addEventListener("pointerdown", unlock, { once: true });

    function tick() {
      requestAnimationFrame(tick);
      if (!ready || !live || video.seeking) return;

      const diff = target - video.currentTime;
      const dist = Math.abs(diff);

      if (dist > HARD_SEEK) {
        // Salto grande: scroll muy rápido, retroceso largo, o el primer
        // cuadro. Aquí sí se justifica un salto directo.
        try { video.currentTime = clamp(target, 0, duration); } catch (e) { /* nada */ }
        settled = false; curRate = 1;
        return;
      }

      if (diff < 0) {
        // Retroceder: <video> no reproduce en reversa. Solo se corrige con
        // un salto puntual cuando la diferencia ya es clara, nunca por
        // fracciones de fotograma: eso es lo que evita el rebote.
        if (dist > REVERSE_AT) {
          if (!video.paused) video.pause();
          try { video.currentTime = clamp(target, 0, duration); } catch (e) { /* nada */ }
          settled = dist < PAUSE_AT;
        }
        return;
      }

      // Histéresis: una vez en reposo, hace falta una diferencia clara
      // (RESUME_AT) para volver a moverse; una vez en marcha, hace falta
      // caer por debajo de PAUSE_AT para detenerse. El hueco entre ambos
      // umbrales es lo que impide el parpadeo.
      if (settled) {
        if (dist < RESUME_AT) { curRate = 1; return; }
        settled = false;
      } else if (dist < PAUSE_AT) {
        settled = true;
        if (!video.paused) video.pause();
        video.playbackRate = curRate = 1;
        return;
      }

      // La velocidad se amortigua en vez de fijarse de golpe cada fotograma:
      // sin esto, cada micro-cambio de `dist` (el propio ruido del scroll)
      // se traduce en un salto de velocidad y se siente como tembleque.
      const wantRate = clamp(1 + dist * 6.5, 1, MAX_RATE);
      curRate += (wantRate - curRate) * RATE_SMOOTH;
      video.playbackRate = curRate;
      if (video.paused) { const pr = video.play(); if (pr !== undefined) pr.catch(() => {}); }
    }
    requestAnimationFrame(tick);

    return {
      setProgress(p) {
        target = duration ? clamp(p, 0, 1) * duration : 0;
      },
      pause() { live = false; if (!video.paused) video.pause(); },
      resume() { live = true; },
      swap(url) {
        if (!url || video.dataset.logicalSrc === url) return;
        const keep = duration ? clamp(video.currentTime / duration, 0, 1) : 0;
        ready = false; duration = 0;
        setFlightSrc(video, url);
        video.addEventListener("loadedmetadata", () => {
          onReady();
          if (duration) { target = keep * duration; try { video.currentTime = target; } catch (e) {} }
        }, { once: true });
      },
    };
  }

  /* Sin media, el "vuelo" es el gráfico: el río se desplaza y se acerca según
     el progreso, con el mismo suavizado. */
  function createGraphicFlight() {
    const riverEl = document.getElementById("gfxRiver");
    let target = 0, shown = 0, live = true, lastTick = 0;

    function apply(now) {
      if (!riverEl) return;
      const drift = Math.sin((now / 1000 / 9) * TAU) * 0.6;   // respiración
      riverEl.style.transform =
        `translate3d(-50%, ${(-shown * 46 + drift).toFixed(2)}%, 0) ` +
        `scale(${(1 + shown * 0.55).toFixed(4)})`;
      flightMedia.style.setProperty("--descend", shown.toFixed(4));
    }

    function tick(now) {
      requestAnimationFrame(tick);
      lastTick = now;
      if (!live) return;
      shown += (target - shown) * (isMobile ? 0.16 : 0.11);
      apply(now);
    }
    requestAnimationFrame(tick);

    return {
      setProgress(p) {
        target = clamp(p, 0, 1);
        // Si el rAF está estrangulado, se aplica en el acto: sin suavizado,
        // pero el vuelo sigue respondiendo al scroll.
        const now = (window.performance || Date).now();
        if (now - lastTick > 260) { shown = target; apply(now); }
      },
      pause() { live = false; },
      resume() { live = true; },
      swap() { /* sin media no hay archivo que cambiar */ },
    };
  }

  const flight = FLIGHT ? createFlightEngine(flightVideo) : createGraphicFlight();

  if (FLIGHT) {
    const portraitMQ = window.matchMedia("(orientation: portrait)");
    const pickOrientation = () => (portraitMQ.matches ? "portrait" : "landscape");
    const srcFor = (o) => FLIGHT_MEDIA[o] || FLIGHT_MEDIA.landscape;
    flightStage.dataset.orient = pickOrientation();
    let fellBack = false;
    flightVideo.addEventListener("error", () => {
      const fb = FLIGHT_MEDIA.portraitFallback;
      if (!fellBack && fb && flightVideo.dataset.logicalSrc !== fb) {
        fellBack = true; setFlightSrc(flightVideo, fb); return;
      }
      flightStage.classList.add("is-fallback");
    });
    setFlightSrc(flightVideo, srcFor(pickOrientation()));

    const onOrient = () => {
      const next = pickOrientation();
      if (next === flightStage.dataset.orient) return;
      flightStage.dataset.orient = next; fellBack = false;
      flight.swap(srcFor(next));
      ScrollTrigger.refresh();
    };
    if (portraitMQ.addEventListener) portraitMQ.addEventListener("change", onOrient);
    window.addEventListener("orientationchange", () => setTimeout(onOrient, 250));
  }

  // ==========================================================================
  // 4. MOTOR DE SCROLL NATIVO — reemplaza GSAP + ScrollTrigger.
  //    El pineado real lo hace `position: sticky` (CSS puro, en el
  //    stylesheet, compositado por el navegador — cero JS por fotograma para
  //    la parte visual). Este motor solo MIDE: para cada "trigger" calcula,
  //    a partir de las mismas cadenas "top top" / "bottom top" / "top 80%"
  //    que ya usaba el resto del archivo con GSAP, en qué scrollY empieza y
  //    termina su rango, y en cada fotograma actualiza `.progress` /
  //    `.isActive` y dispara los mismos callbacks (onUpdate, onToggle,
  //    onEnter, onLeave, onEnterBack, onLeaveBack, onRefresh). El resto del
  //    archivo no cambia: sigue leyendo `trigger.progress` igual que antes.
  // ==========================================================================
  function __parseMarker(str, elTop, elBottom, vh) {
    const [elWord, vpWord] = str.trim().split(/\s+/);
    const elPos = elWord === "bottom" ? elBottom : elWord === "center" ? (elTop + elBottom) / 2 : elTop;
    let vpPos;
    if (vpWord.endsWith("%")) vpPos = vh * (parseFloat(vpWord) / 100);
    else vpPos = vpWord === "bottom" ? vh : vpWord === "center" ? vh / 2 : 0;
    return elPos - vpPos;
  }

  const __triggers = [];

  function __measure(t) {
    const rect = t.el.getBoundingClientRect();
    const elTop = rect.top + window.scrollY;
    const elBottom = elTop + rect.height;
    const vh = window.innerHeight;
    const a = __parseMarker(t.startStr, elTop, elBottom, vh);
    const b = __parseMarker(t.endStr, elTop, elBottom, vh);
    t.start = Math.min(a, b);
    t.end = Math.max(a, b);
  }

  function __update(t, fireEvents) {
    if (t._disabled) return;
    const y = window.scrollY;
    const span = t.end - t.start;
    t.progress = span > 0 ? clamp((y - t.start) / span, 0, 1) : (y >= t.start ? 1 : 0);
    const state = y < t.start ? "before" : y > t.end ? "after" : "inside";
    const wasActive = t.isActive;
    t.isActive = state === "inside";
    if (!fireEvents) { t._state = state; return; }
    if (t.vars.onUpdate) t.vars.onUpdate(t);
    const prev = t._state;
    if (state !== prev) {
      t._state = state;
      if (prev === "before" && state === "inside") { if (t.vars.onEnter) t.vars.onEnter(t); }
      else if (prev === "inside" && state === "after") { if (t.vars.onLeave) t.vars.onLeave(t); }
      else if (prev === "after" && state === "inside") { if (t.vars.onEnterBack) t.vars.onEnterBack(t); }
      else if (prev === "inside" && state === "before") { if (t.vars.onLeaveBack) t.vars.onLeaveBack(t); }
      else if (prev === "before" && state === "after") { if (t.vars.onEnter) t.vars.onEnter(t); if (t.vars.onLeave) t.vars.onLeave(t); }
      else if (prev === "after" && state === "before") { if (t.vars.onEnterBack) t.vars.onEnterBack(t); if (t.vars.onLeaveBack) t.vars.onLeaveBack(t); }
    }
    if (wasActive !== t.isActive && t.vars.onToggle) t.vars.onToggle(t);
  }

  const ScrollTrigger = {
    create(vars) {
      const t = {
        el: vars.trigger, startStr: vars.start || "top bottom", endStr: vars.end || "bottom top",
        vars, start: 0, end: 0, progress: 0, isActive: false, _state: "before",
      };
      t.kill = () => { const i = __triggers.indexOf(t); if (i >= 0) __triggers.splice(i, 1); };
      // Usados por el modo accesible para congelar todos los triggers
      // mientras `#main` está en `display:none` (si no, se seguirían
      // midiendo posiciones contra contenido invisible sin sentido).
      t.disable = () => { t._disabled = true; };
      t.enable = () => { t._disabled = false; __measure(t); };
      __measure(t);
      __update(t, false);
      __triggers.push(t);
      if (vars.onRefresh) vars.onRefresh(t);
      return t;
    },
    getAll() { return __triggers.slice(); },
    refresh() {
      __triggers.forEach(__measure);
      __triggers.forEach((t) => { __update(t, false); if (t.vars.onRefresh) t.vars.onRefresh(t); });
    },
    config() { /* ignoreMobileResize/autoRefreshEvents: sticky no lo necesita */ },
    normalizeScroll() { /* el scroll táctil nativo ya funciona bien con sticky */ },
  };

  const gsap = {
    registerPlugin() {},
    plugins: null,
    /* Tweens mínimos con CSS transitions — lo único que se anima por fuera
       del bucle de progreso es el fundido del cierre (opacidad simple). */
    to(target, v) {
      const durMs = (v.duration != null ? v.duration : 0.5) * 1000;
      const delayMs = (v.delay || 0) * 1000;
      const props = Object.keys(v).filter((k) => !["duration", "delay", "ease", "onComplete"].includes(k));
      setTimeout(() => {
        target.style.transition = props.map((p) => `${p} ${durMs}ms ease`).join(", ");
        requestAnimationFrame(() => { props.forEach((p) => { target.style[p] = v[p]; }); });
        if (v.onComplete) setTimeout(v.onComplete, durMs);
      }, delayMs);
    },
  };

  let __rafOn = true;
  (function __tickTriggers() {
    __triggers.forEach((t) => __update(t, true));
    if (__rafOn) requestAnimationFrame(__tickTriggers);
  })();

  window.addEventListener("load", () => ScrollTrigger.refresh());
  document.addEventListener("visibilitychange", () => ScrollTrigger.refresh());

  function scrollToId(id) {
    const node = document.getElementById(id);
    if (!node) return;
    const y = node.getBoundingClientRect().top + window.pageYOffset;
    if (reduceMotion) window.scrollTo(0, y);
    else if (gsap.plugins && gsap.plugins.scrollTo) gsap.to(window, { scrollTo: y, duration: 0.9, ease: "power2.inOut" });
    else window.scrollTo({ top: y, behavior: "smooth" });
  }

  main.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute("href").slice(1);
    if (!id || !document.getElementById(id)) return;
    e.preventDefault();
    scrollToId(id);
  });

  const stopLabel = document.getElementById("stopLabel");
  let lastLabel = null;
  function setStopLabel(t) {
    if (!stopLabel || t === lastLabel) return;
    lastLabel = t;
    stopLabel.textContent = t;
    // Vacío = beat de portada en pantalla: la píldora se retira para no
    // duplicar el logo central del hero.
    stopLabel.style.visibility = t ? "visible" : "hidden";
  }

  // ==========================================================================
  // 5. EL RECORRIDO — beats
  // ==========================================================================
  const BEAT_FADE = 0.055;
  const CARD_WIN = 0.34;

  function altitudeAt(p) {
    const track = JOURNEY.altitudeTrack;
    for (let i = 1; i < track.length; i++) {
      if (p <= track[i][0]) {
        const [p0, a0] = track[i - 1], [p1, a1] = track[i];
        return lerp(a0, a1, p1 === p0 ? 0 : (p - p0) / (p1 - p0));
      }
    }
    return track[track.length - 1][1];
  }

  /* La portada no depende del bucle: su entrada la hace CSS (ver @keyframes
     pw-rise / beat-in). Si el navegador estrangula el requestAnimationFrame
     —pestaña en segundo plano, ahorro de batería— la portada se ve igual.
     Por eso `intro` vale 1 desde el primer fotograma. */
  const intro = 1;
  let journeyShown = 0, journeyTargetP = 0;

  function renderBeats(p) {
    let best = null, bestA = 0.02;

    journey.beats.forEach((b) => {
      const d = b.data;
      const entry = d.kind === "hero"
        ? Math.max(intro, smoothstep(d.from, d.from + BEAT_FADE, p))
        : smoothstep(d.from, d.from + BEAT_FADE, p);
      const exit = 1 - smoothstep(d.to - BEAT_FADE, d.to, p);
      const a = Math.min(entry, exit);
      const local = clamp((p - d.from) / (d.to - d.from), 0, 1);

      b.root.style.opacity = a.toFixed(3);
      b.root.style.visibility = a < 0.004 ? "hidden" : "visible";

      const y = (0.5 - local) * 46;
      b.inner.style.transform =
        `translate3d(0, ${y.toFixed(1)}px, 0) scale(${(0.985 + a * 0.015).toFixed(4)})`;

      b.words.forEach((w, i) => {
        const wp = smoothstep(i * 0.10, i * 0.10 + 0.62, entry);
        w.style.transform = `translate3d(0, ${((1 - wp) * 116).toFixed(1)}%, 0)`;
        w.style.opacity = wp.toFixed(3);
      });

      if (b.indicator) {
        b.indicator.style.opacity = (a * (1 - smoothstep(0.05, 0.13, p))).toFixed(3);
      }

      b.cardEls.forEach((c) => {
        const cl = clamp((local - c.data.at) / CARD_WIN, 0, 1);
        const ca = pulse(0, 0.2, 0.8, 1, cl) * a;
        const travel = 120 + c.data.depth * 260;
        const rot = (seeded(c.data.at * 37) - 0.5) * 5;
        c.el.style.opacity = ca.toFixed(3);
        c.el.style.visibility = ca < 0.004 ? "hidden" : "visible";
        c.el.style.transform =
          `translate3d(0, ${((0.5 - cl) * travel).toFixed(1)}px, 0) rotate(${rot.toFixed(2)}deg) ` +
          `scale(${(0.94 + ca * 0.06).toFixed(3)})`;
      });

      if (a > bestA) { bestA = a; best = d; }
    });

    if (best) setStopLabel(best.kind === "hero" ? "" : best.label);
    altTarget = altitudeAt(p);
    const c = JOURNEY.coords;
    journeyLat = lerp(c.lat0, c.lat1, p);
    journeyLon = lerp(c.lon0, c.lon1, p);
  }

  function clearBeatStyles() {
    journey.beats.forEach((b) => {
      [b.root, b.inner].forEach((n) => {
        n.style.opacity = ""; n.style.visibility = "";
        n.style.transform = ""; n.style.filter = "";
      });
      b.words.forEach((w) => { w.style.transform = ""; w.style.opacity = ""; });
      b.cardEls.forEach((c) => {
        c.el.style.opacity = ""; c.el.style.visibility = ""; c.el.style.transform = "";
      });
    });
  }

  const journeyTrigger = ScrollTrigger.create({
    trigger: journey.section,
    start: "top top", end: "bottom bottom",
    pin: journey.pin, anticipatePin: 1,
    onUpdate: (self) => {
      journeyTargetP = self.progress;
      if (!rafAlive()) { journeyShown = self.progress; renderBeats(journeyShown); flight.setProgress(journeyShown); }
    },
    onRefresh: (self) => {
      journeyTargetP = self.progress; journeyShown = self.progress;
      renderBeats(journeyShown); flight.setProgress(journeyShown);
    },
  });

  /* El logo del header se retira mientras el beat de portada está visible,
     para no duplicar el logo central del hero.
     v2: este beat vive DENTRO del contenedor `sticky` (nunca se mueve por sí
     solo mientras el recorrido avanza), así que el truco geométrico de
     "top top"/"bottom top" que usaba GSAP no aplica aquí — ese cálculo
     asume un elemento en flujo normal, no uno fijo dentro de un pin. Como
     `renderBeats()` ya escribe la opacidad real de cada beat en su
     `root.style.opacity`, basta con leerla de vuelta. */
  const brandLink = document.getElementById("brandLink");
  const heroBeatRoot = journey.beats[0] && journey.beats[0].data.kind === "hero" ? journey.beats[0].root : null;

  // ==========================================================================
  // 6. LA ESCENA DE PLANCHÓN — dibujada, no animada
  //    Todo lo que se ve es una función del progreso de la escena. Por eso no
  //    hay dos fases encendidas nunca, ni residuos al subir.
  // ==========================================================================
  function renderPlanchon(s, p) {
    const W = PHASE_WINDOWS;

    /* --- textos: una ventana cada uno, con hueco entre ellas ------------- */
    Object.keys(W).forEach((key) => {
      const [from, to] = W[key];
      const node = s.phases[key];
      const a = pulse(from, from + FADE, to - FADE, to, p);
      const local = clamp((p - from) / (to - from), 0, 1);
      node.style.opacity = a.toFixed(3);
      node.style.visibility = a < 0.004 ? "hidden" : "visible";
      // Deriva vertical suave: entra desde abajo, sale hacia arriba.
      node.firstElementChild.style.transform =
        `translate3d(0, ${((0.5 - local) * 34).toFixed(1)}px, 0)`;
    });

    /* --- fondos: se relevan en los huecos entre fases -------------------- */
    const aerialA = 1 - smoothstep(W.tecnica[1] - 0.05, W.modelo[0] + 0.06, p);
    const interiorA = smoothstep(W.modelo[1] - 0.04, W.gente[0] + 0.05, p);
    s.backdrops.aerial.style.opacity = aerialA.toFixed(3);
    s.backdrops.interior.style.opacity = interiorA.toFixed(3);
    // Acercamiento continuo de la vista aérea durante toda la escena.
    s.backdrops.aerial.style.transform = `scale(${(1 + p * 0.14).toFixed(4)})`;
    s.backdrops.interior.style.transform = `scale(${(1.12 - interiorA * 0.1).toFixed(4)})`;

    /* --- vectorización: rejilla, barrido y el esquema dibujándose -------- */
    const tecA = pulse(W.tecnica[0] - 0.05, W.tecnica[0] + 0.04, W.tecnica[1], W.tecnica[1] + 0.05, p);
    s.grid.style.opacity = (tecA * 0.5).toFixed(3);

    const sweep = clamp((p - (W.tecnica[0] - 0.02)) / 0.22, 0, 1);
    s.scan.style.opacity = (tecA * (1 - smoothstep(0.82, 1, sweep))).toFixed(3);
    s.scan.style.left = (sweep * 100).toFixed(2) + "%";

    // En la fase 3 el esquema se gira un poco: lee como volumen sin ser 3D.
    // El relevo con el video 3D real es rápido a propósito (antes tardaba
    // 0.10 de progreso, ~64vh de scroll, en completarse): con un video real
    // detrás, ese cruce lento se veía como el esquema y la foto conviviendo
    // encimados un buen rato — bastaba con detenerse ahí para verlo "roto".
    const modelA = pulse(W.modelo[0] - 0.015, W.modelo[0] + 0.015, W.modelo[1] - 0.015, W.modelo[1] + 0.015, p);

    // El esquema vive de la fase 2 a la 3: se dibuja, queda completo en neón
    // y se retira al entrar en el interior. Si hay un video 3D real, el
    // esquema se desvanece dentro de la propia fase "modelo" para darle
    // paso — nunca conviven a la vez.
    const wireA = pulse(W.tecnica[0] - 0.03, W.tecnica[0] + 0.05, W.modelo[1] - 0.02, W.modelo[1] + 0.04, p) *
                  (s.model3dVideo ? 1 - modelA : 1);
    s.wireWrap.style.opacity = wireA.toFixed(3);
    s.wireWrap.style.visibility = wireA < 0.004 ? "hidden" : "visible";

    const spin = lerp(-16, 16, clamp((p - W.modelo[0]) / (W.modelo[1] - W.modelo[0]), 0, 1));
    s.wireWrap.style.transform =
      `perspective(1200px) rotateY(${(spin * modelA).toFixed(2)}deg) ` +
      `scale(${(0.94 + modelA * 0.1).toFixed(3)})`;
    s.wireWrap.classList.toggle("is-neon", modelA > 0.5);

    // Modelo 3D real: gira con el mismo progreso que usaría el esquema,
    // usando el motor del vuelo para un scrub suave del video.
    if (s.model3dVideo && s.model3dEngine) {
      const localModel = clamp((p - W.modelo[0]) / (W.modelo[1] - W.modelo[0]), 0, 1);
      s.model3dEngine.setProgress(localModel);
      s.model3dVideo.style.opacity = modelA.toFixed(3);
      s.model3dVideo.style.visibility = modelA < 0.004 ? "hidden" : "visible";
    }

    // Trazos: se dibujan escalonados a lo largo de la fase 2.
    s.wirePaths.forEach((wp, k) => {
      const t = smoothstep(0.04 + k * 0.028, 0.30 + k * 0.028, p - W.tecnica[0] + 0.04);
      wp.node.style.strokeDashoffset = `${(wp.len * (1 - t)).toFixed(1)}`;
    });

    /* --- numeral: presente pero nunca compitiendo con el texto ---------- */
    const numA = lerp(0.5, 0.14, smoothstep(0.05, 0.2, p)) *
                 (1 - smoothstep(W.ficha[0] - 0.02, W.ficha[0] + 0.08, p) * 0.5);
    s.numeral.style.opacity = numA.toFixed(3);
  }

  function clearPlanchonStyles(s) {
    Object.keys(s.phases).forEach((k) => {
      const n = s.phases[k];
      n.style.opacity = ""; n.style.visibility = "";
      n.firstElementChild.style.transform = "";
    });
    [s.backdrops.aerial, s.backdrops.interior, s.grid, s.scan, s.wireWrap, s.numeral, s.model3dVideo]
      .filter(Boolean)
      .forEach((n) => { n.style.opacity = ""; n.style.visibility = ""; n.style.transform = ""; });
    s.wirePaths.forEach((wp) => { wp.node.style.strokeDashoffset = ""; });
  }

  planchones.forEach((s, i) => {
    s.trigger = ScrollTrigger.create({
      trigger: s.wrapper,
      start: "top top", end: "bottom top",
      pin: s.pin, anticipatePin: 1,
      onUpdate: (self) => {
        s.target = self.progress;
        if (!rafAlive()) { s.shown = self.progress; renderPlanchon(s, s.shown); }
      },
      onRefresh: (self) => {
        s.target = self.progress; s.shown = self.progress;
        renderPlanchon(s, s.shown);
      },
      onToggle: (self) => {
        s.active = self.isActive;
        if (self.isActive) {
          setStopLabel(`${s.data.num}/${String(PLANCHONES.length).padStart(2, "0")} · ${s.data.name}`);
          altTarget = 38 + seeded(i) * 30;
          setRiverNode(i);
          if (s.model3dEngine) s.model3dEngine.resume();
        } else {
          // Al salir, la escena se cuadra con su progreso real: así no queda
          // congelada a mitad de una fase si el bucle no llega a alcanzarla.
          s.shown = s.target = self.progress;
          renderPlanchon(s, s.shown);
          // El motor de scrubbing del modelo 3D corre su propio rAF: si no se
          // pausa aquí, las 12 escenas lo mantienen vivo todo el tiempo, estén
          // o no en pantalla — de ahí el lag general de la página.
          if (s.model3dEngine) s.model3dEngine.pause();
        }
      },
    });
    renderPlanchon(s, 0);
  });

  /* --- ENTRADA DE CADA ESCENA --------------------------------------------
     Dos cosas, y hacen falta las dos:

     1. RETRASO. La escena que entra permanece invisible durante la primera
        mitad de su aproximación: mientras el bloque de texto de la escena
        anterior sigue en pantalla, detrás no aparece nada. El fundido solo
        arranca cuando ya está a punto de quedar pineada.

     2. BORDE DIFUMINADO. Aunque el fundido sea progresivo, el borde superior
        de la sección que sube es una línea recta, y una línea recta se ve
        aunque esté al 20 %. Una máscara la deshace: el borde llega
        degradado y se endereza solo cuando ya cubre el viewport entero.

     Se funde el PIN entero, no solo su fondo, para que la variante enmarcada
     (lay-frame) —cuyo suelo lo pone el pin— entre igual de suave. */
  const ENTER_DELAY = 0.52;   // fracción de la aproximación sin nada visible

  planchones.forEach((s, i) => {
    const isFirst = i === 0;

    function applyEntry(p) {
      const k = smoothstep(ENTER_DELAY, 1, p);
      s.pin.style.opacity = k.toFixed(3);
      if (k <= 0.001) {
        s.pin.style.visibility = "hidden";
        s.pin.style.maskImage = s.pin.style.webkitMaskImage = "";
      } else {
        s.pin.style.visibility = "visible";
        if (k >= 0.999) {
          s.pin.style.maskImage = s.pin.style.webkitMaskImage = "";
        } else {
          // El degradado se va estrechando: 52vh de pluma al empezar, 0 al
          // quedar pineada.
          const feather = (1 - k) * 52;
          const grad = `linear-gradient(180deg, transparent 0, #000 ${feather.toFixed(1)}%)`;
          s.pin.style.maskImage = grad;
          s.pin.style.webkitMaskImage = grad;
        }
      }
      if (isFirst) flightStage.style.opacity = (1 - k).toFixed(3);
    }

    applyEntry(0);

    ScrollTrigger.create({
      trigger: s.wrapper,
      start: "top bottom", end: "top top", scrub: true,
      onUpdate: (self) => applyEntry(self.progress),
      onLeave: () => {
        applyEntry(1);
        if (isFirst) flight.pause();
      },
      onEnterBack: () => { if (isFirst) flight.resume(); },
      onLeaveBack: () => {
        applyEntry(0);
        if (isFirst) flight.resume();
      },
    });
  });

  // ==========================================================================
  // 7. EL BUCLE ÚNICO
  //    Un solo rAF para toda la pieza: persigue los progresos objetivo con
  //    interpolación y redibuja. De aquí sale la suavidad: el scroll puede
  //    llegar a saltos, lo que se ve nunca.
  // ==========================================================================
  const EASE_IN = isMobile ? 0.20 : 0.14;

  /* Red de seguridad: si el navegador estrangula el requestAnimationFrame
     (pestaña en segundo plano, ahorro de batería, iframe fuera de vista) el
     scroll dibuja directamente, sin suavizado. Se pierde la interpolación,
     no el contenido. */
  let rafBeat = 0;
  const rafAlive = () => (window.performance || Date).now() - rafBeat < 260;

  function frame() {
    requestAnimationFrame(frame);
    rafBeat = (window.performance || Date).now();
    if (a11yOn) return;

    // Recorrido. Se relee `journeyTrigger.progress` en cada fotograma en vez
    // de fiarse solo del `onUpdate` — con scroll muy rápido, GSAP puede
    // saltarse la llamada a ese callback para la posición final de reposo, y
    // entonces `journeyTargetP` se queda en un valor viejo mientras el
    // trigger ya está en otro lado: el contenido queda congelado a mitad de
    // un fundido en vez de terminarlo. Leer `.progress` directo asegura que
    // siempre se persigue el valor real, esté o no al día el callback.
    journeyTargetP = journeyTrigger.progress;
    journeyShown += (journeyTargetP - journeyShown) * EASE_IN;
    if (Math.abs(journeyTargetP - journeyShown) > 0.00005) {
      renderBeats(journeyShown);
      flight.setProgress(journeyShown);
    }
    if (brandLink && heroBeatRoot) {
      brandLink.classList.toggle("is-hero-visible", parseFloat(heroBeatRoot.style.opacity || "0") > 0.5);
    }

    // Escenas: solo las que están en pantalla. Mismo motivo que arriba: se
    // relee el progreso real del trigger en vez de depender del `onUpdate`.
    for (let i = 0; i < planchones.length; i++) {
      const s = planchones[i];
      s.target = s.trigger.progress;
      if (!s.active && Math.abs(s.target - s.shown) < 0.00005) continue;
      s.shown += (s.target - s.shown) * EASE_IN;
      renderPlanchon(s, s.shown);
    }

    // HUD.
    altShown += (altTarget - altShown) * 0.06;
    if (hudAlt) hudAlt.textContent = Math.max(0, Math.round(altShown));
    if (hudCoords) {
      const inJourney = journeyTrigger.isActive;
      const lat = inJourney ? journeyLat : lerp(JOURNEY.coords.lat1, 8.7628, routeProgress);
      const lon = inJourney ? journeyLon : lerp(JOURNEY.coords.lon1, 75.8857, routeProgress);
      hudCoords.textContent = `${lat.toFixed(4)}° N · ${lon.toFixed(4)}° W`;
    }
  }

  // ==========================================================================
  // 8. CIERRE
  // ==========================================================================
  closing.card.style.opacity = "0";
  closingBackdrop.style.opacity = "0";
  ScrollTrigger.create({
    trigger: closing.section, start: "top 80%", end: "bottom bottom",
    onEnter: () => {
      if (MEDIA) activateVideoSrc(closingBackdrop);
      gsap.to(closingBackdrop, { opacity: 1, duration: 1.2, ease: "power1.inOut" });
      gsap.to(closing.card, { opacity: 1, duration: 0.8, ease: "power2.out", delay: 0.2 });
      setStopLabel(CLOSING_SCENE.eyebrow);
      altTarget = CLOSING_SCENE.altitude;
    },
    onLeaveBack: () => {
      gsap.to(closingBackdrop, { opacity: 0, duration: 0.8 });
      gsap.to(closing.card, { opacity: 0, duration: 0.4 });
    },
  });

  // ==========================================================================
  // 9. HUD — mapa del río, coordenadas y altitud
  // ==========================================================================
  const riverMap = document.getElementById("riverMap");
  const riverSvg = riverMap && riverMap.querySelector("svg");
  const riverTrack = document.getElementById("riverTrack");
  const riverProgress = document.getElementById("riverProgress");
  const riverNodesG = document.getElementById("riverNodes");
  const riverList = document.getElementById("riverList");
  const hudCoords = document.getElementById("hudCoords");
  const hudAlt = document.getElementById("hudAlt");
  const hudProgressEl = document.getElementById("hudProgress");
  const hudBarFill = document.getElementById("hudBarFill");

  if (riverSvg) {
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    defs.innerHTML = `<linearGradient id="riverGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#494FFF"/>
        <stop offset="55%" stop-color="#8626FC"/>
        <stop offset="100%" stop-color="#F501F9"/>
      </linearGradient>`;
    riverSvg.prepend(defs);
  }

  if (riverTrack && riverNodesG) {
    const L = riverTrack.getTotalLength();
    PLANCHONES.forEach((p, i) => {
      const frac = 0.14 + ((i + 0.5) / PLANCHONES.length) * 0.74;
      const pt = riverTrack.getPointAtLength(L * frac);

      const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      c.setAttribute("cx", pt.x); c.setAttribute("cy", pt.y); c.setAttribute("r", 3.4);
      c.setAttribute("class", "river-node");
      const halo = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      halo.setAttribute("cx", pt.x); halo.setAttribute("cy", pt.y); halo.setAttribute("r", 7);
      halo.setAttribute("class", "river-halo");
      riverNodesG.append(c, halo);
      nodeEls.push(c);

      /* El nodo SVG mide 7px: en un teléfono es un blanco imposible. El que
         recibe el toque es el botón de la lista, con 52px de alto. */
      if (riverList) {
        const li = el("li", "river-item");
        const btn = el("button", "river-btn",
          `<span class="river-btn__num">${p.num}</span>
           <span class="river-btn__name">${p.name}</span>
           <span class="river-btn__tag">${p.tagline}</span>`);
        btn.type = "button";
        btn.addEventListener("click", () => { closeMap(); scrollToId(p.id); });
        li.appendChild(btn);
        riverList.appendChild(li);
        listEls.push(li);
      }
    });
  }

  function setRiverNode(idx) {
    nodeEls.forEach((n, k) => {
      n.classList.toggle("is-active", k === idx);
      n.classList.toggle("is-passed", k < idx);
    });
    listEls.forEach((n, k) => {
      n.classList.toggle("is-active", k === idx);
      n.classList.toggle("is-passed", k < idx);
    });
  }

  const mapToggle = document.getElementById("mapToggle");
  const mapClose = document.getElementById("mapClose");
  function openMap() {
    document.body.classList.add("map-open");
    if (mapToggle) mapToggle.setAttribute("aria-pressed", "true");
  }
  function closeMap() {
    document.body.classList.remove("map-open");
    if (mapToggle) mapToggle.setAttribute("aria-pressed", "false");
  }
  if (mapToggle) {
    mapToggle.addEventListener("click", () => {
      document.body.classList.contains("map-open") ? closeMap() : openMap();
    });
  }
  if (mapClose) mapClose.addEventListener("click", closeMap);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMap(); });

  if (riverProgress) {
    const L = riverProgress.getTotalLength();
    riverProgress.style.strokeDasharray = `${L}`;
    riverProgress.style.strokeDashoffset = `${L}`;
    ScrollTrigger.create({
      trigger: main, start: "top top", end: "bottom bottom",
      onUpdate: (self) => { riverProgress.style.strokeDashoffset = `${L * (1 - self.progress)}`; },
    });
  }

  ScrollTrigger.create({
    trigger: main, start: "top top", end: "bottom bottom",
    onUpdate: (self) => {
      routeProgress = self.progress;
      if (hudProgressEl) hudProgressEl.textContent = Math.round(self.progress * 100);
      if (hudBarFill) hudBarFill.style.width = `${(self.progress * 100).toFixed(1)}%`;
    },
  });

  // ==========================================================================
  // 9b. FICHA AMPLIADA — "Conocer más": planimetría, fotos y datos
  //    Un solo panel para los 12, con el contenido armado al vuelo y
  //    guardado en caché la primera vez que se abre cada planchón.
  // ==========================================================================
  const planDetail = document.getElementById("planDetail");
  const planDetailBody = document.getElementById("planDetailBody");
  const planDetailClose = document.getElementById("planDetailClose");
  const planCache = new Map();
  let planOpenerBtn = null;

  function buildPlanDetail(p) {
    const metaAll = [...((p.conoce || {}).meta || []), ...((p.tecnica || {}).meta || [])];
    const dataRows = [
      ["Parada", `${p.num} / ${String(PLANCHONES.length).padStart(2, "0")}`],
      ["Coordenadas", p.coords || "—"],
      ...metaAll.map((m) => ["Registro", m]),
    ];

    return `
      <header class="plan-detail__head">
        <span class="plan-detail__num">${p.num}</span>
        <div>
          <h2>${p.name}</h2>
          <p class="plan-detail__tagline">${p.tagline}</p>
        </div>
      </header>

      <section class="plan-detail__section">
        <h3>Planimetría</h3>
        <p class="plan-detail__hint">Planos y cortes del levantamiento. Arrastra tus archivos aquí cuando estén listos.</p>
        <div class="plan-grid plan-grid--plans">
          <div class="plan-slot"><image-slot id="plan-${p.id}-planta" placeholder="Planta"></image-slot><span>Planta</span></div>
          <div class="plan-slot"><image-slot id="plan-${p.id}-corte" placeholder="Corte transversal"></image-slot><span>Corte transversal</span></div>
          <div class="plan-slot"><image-slot id="plan-${p.id}-detalle" placeholder="Detalle constructivo"></image-slot><span>Detalle constructivo</span></div>
        </div>
      </section>

      <section class="plan-detail__section">
        <h3>Fotografías</h3>
        <p class="plan-detail__hint">Registro fotográfico de campo.</p>
        <div class="plan-grid plan-grid--photos">
          ${[1, 2, 3, 4].map((n) => `<div class="plan-slot"><image-slot id="plan-${p.id}-foto-${n}" placeholder="Foto ${n}"></image-slot></div>`).join("")}
        </div>
      </section>

      <section class="plan-detail__section">
        <h3>Datos</h3>
        <dl class="plan-data">
          ${dataRows.map(([k, v]) => `<div class="plan-data__row"><dt>${k}</dt><dd>${v}</dd></div>`).join("")}
        </dl>
      </section>`;
  }

  function openPlanDetail(id, opener) {
    if (!planDetail || !planDetailBody) return;
    const p = PLANCHONES.find((x) => x.id === id);
    if (!p) return;
    if (!planCache.has(id)) planCache.set(id, buildPlanDetail(p));
    planDetailBody.innerHTML = planCache.get(id);
    planOpenerBtn = opener || null;
    planDetail.hidden = false;
    requestAnimationFrame(() => planDetail.classList.add("is-open"));
    document.body.classList.add("plan-detail-open");
    planDetailClose.focus();
  }

  function closePlanDetail() {
    if (!planDetail || planDetail.hidden) return;
    planDetail.classList.remove("is-open");
    document.body.classList.remove("plan-detail-open");
    setTimeout(() => { planDetail.hidden = true; }, 280);
    if (planOpenerBtn) planOpenerBtn.focus();
  }

  main.addEventListener("click", (e) => {
    const btn = e.target.closest(".know-more-btn");
    if (!btn) return;
    openPlanDetail(btn.dataset.planId, btn);
  });
  if (planDetailClose) planDetailClose.addEventListener("click", closePlanDetail);
  if (planDetail) {
    planDetail.addEventListener("click", (ev) => { if (ev.target === planDetail) closePlanDetail(); });
  }
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && planDetail && !planDetail.hidden) closePlanDetail();
  });

  // ==========================================================================
  // 10. PAISAJE SONORO
  // ==========================================================================
  const soundToggle = document.getElementById("soundToggle");
  const riverAudio = document.getElementById("riverAudio");

  /* Sin material sonoro, el botón se retira: un control que no hace nada es
     peor que no tenerlo. Vuelve solo al activar MEDIA_ENABLED con el
     paisaje sonoro en assets/. */
  if (!MEDIA && soundToggle) soundToggle.hidden = true;

  if (MEDIA && soundToggle && riverAudio) {
    soundToggle.addEventListener("click", () => {
      const on = soundToggle.getAttribute("aria-pressed") === "true";
      if (on) { riverAudio.pause(); soundToggle.setAttribute("aria-pressed", "false"); }
      else {
        if (!riverAudio.src) riverAudio.src = AUDIO_LIB.river;
        riverAudio.volume = 0.45;
        const pr = riverAudio.play(); if (pr !== undefined) pr.catch(() => {});
        soundToggle.setAttribute("aria-pressed", "true");
      }
    });
  }

  // ==========================================================================
  // 11. MODO ACCESIBLE — control de lectura en voz alta
  //    Web Speech API sobre los mismos bloques que ya se indexaron al
  //    construir #a11yContent. Un locutor por bloque, encadenados: al
  //    terminar uno empieza el siguiente solo si se sigue en "reproducir".
  // ==========================================================================
  const a11yView = document.getElementById("a11yView");
  const a11yToggle = document.getElementById("a11yToggle");
  const a11yPlay = document.getElementById("a11yPlay");
  const a11yStop = document.getElementById("a11yStop");
  const a11yPrev = document.getElementById("a11yPrev");
  const a11yNext = document.getElementById("a11yNext");
  const a11yStatus = document.getElementById("a11yStatus");

  const TTS_OK = "speechSynthesis" in window;
  let ttsPlaying = false, ttsIdx = -1, ttsVoice = null;

  if (TTS_OK) {
    const pickVoice = () => {
      const voices = speechSynthesis.getVoices();
      ttsVoice = voices.find((v) => /^es/i.test(v.lang)) || voices[0] || null;
    };
    pickVoice();
    if (speechSynthesis.onvoiceschanged !== undefined) speechSynthesis.addEventListener("voiceschanged", pickVoice);
  } else if (a11yPlay) {
    a11yPlay.disabled = true;
    a11yPlay.title = "Este navegador no puede leer en voz alta. Usa el lector de pantalla del sistema.";
  }

  function a11yHighlight(i) {
    a11yBlocks.forEach((b, k) => b.el.classList.toggle("is-reading", k === i));
    const b = a11yBlocks[i];
    if (!b) return;
    // Desplazamiento manual, no scrollIntoView: mantiene el bloque a un
    // tercio de la pantalla en vez de pegado al borde.
    const y = b.el.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.3;
    window.scrollTo({ top: Math.max(0, y), behavior: reduceMotion ? "auto" : "smooth" });
    if (a11yToc) {
      Array.from(a11yToc.children).forEach((btn) => {
        const start = Number(btn.dataset.blockIndex);
        const next = btn.nextElementSibling ? Number(btn.nextElementSibling.dataset.blockIndex) : Infinity;
        btn.classList.toggle("is-current", i >= start && i < next);
      });
    }
  }

  function a11ySetStatus(text) { if (a11yStatus) a11yStatus.textContent = text; }

  function a11ySpeak(i) {
    if (!TTS_OK || i < 0 || i >= a11yBlocks.length) { a11yStopReading(); return; }
    speechSynthesis.cancel();
    ttsIdx = i;
    a11yHighlight(i);
    a11ySetStatus(`Leyendo ${i + 1} de ${a11yBlocks.length}`);
    const u = new SpeechSynthesisUtterance(a11yBlocks[i].text);
    u.lang = "es-ES";
    if (ttsVoice) u.voice = ttsVoice;
    u.rate = 1;
    u.onend = () => { if (ttsPlaying) a11ySpeak(i + 1); };
    u.onerror = (ev) => {
      const err = ev && ev.error;
      // "canceled"/"interrupted" son el eco de nuestro propio
      // speechSynthesis.cancel() (al detener, saltar o apagar el modo): no
      // es un fallo real y no hay que avisar ni encadenar al siguiente.
      if (err === "canceled" || err === "interrupted") return;
      // Cualquier otro error (not-allowed, synthesis-failed, audio-busy…) es
      // real. Antes esto seguía encadenando al bloque siguiente en cada
      // fallo: si el navegador no puede hablar, eso recorre los 193 bloques
      // en una fracción de segundo y deja el botón congelado en "pausar"
      // sin que nada se lea nunca. Se detiene y se avisa en su lugar.
      a11yStopReading();
      a11ySetStatus("No se pudo activar la lectura en voz alta en este navegador. Usa el lector de pantalla del sistema.");
      if (a11yPlay) {
        a11yPlay.disabled = true;
        a11yPlay.title = "La lectura en voz alta no está disponible en este navegador.";
      }
    };
    speechSynthesis.speak(u);
  }

  function a11yStartReading(fromIdx) {
    if (!TTS_OK) return;
    ttsPlaying = true;
    if (a11yPlay) { a11yPlay.setAttribute("aria-pressed", "true"); a11yPlay.querySelector(".a11y-play-icon").textContent = "⏸"; }
    a11ySpeak(fromIdx != null ? fromIdx : Math.max(ttsIdx, 0));
  }

  function a11yStopReading() {
    ttsPlaying = false;
    if (TTS_OK) speechSynthesis.cancel();
    if (a11yPlay) { a11yPlay.setAttribute("aria-pressed", "false"); a11yPlay.querySelector(".a11y-play-icon").textContent = "▶"; }
    a11ySetStatus("");
    a11yBlocks.forEach((b) => b.el.classList.remove("is-reading"));
  }

  function a11yJumpTo(idx) {
    ttsIdx = clamp(idx, 0, a11yBlocks.length - 1);
    if (ttsPlaying) a11ySpeak(ttsIdx);
    else a11yHighlight(ttsIdx);
  }

  if (a11yPlay) {
    a11yPlay.addEventListener("click", () => {
      if (ttsPlaying) a11yStopReading();
      else a11yStartReading(ttsIdx < 0 ? 0 : ttsIdx);
    });
  }
  if (a11yStop) a11yStop.addEventListener("click", () => { a11yStopReading(); ttsIdx = -1; });
  if (a11yPrev) a11yPrev.addEventListener("click", () => a11yJumpTo((ttsIdx < 0 ? 0 : ttsIdx) - 1));
  if (a11yNext) a11yNext.addEventListener("click", () => a11yJumpTo((ttsIdx < 0 ? -1 : ttsIdx) + 1));

  function setA11yMode(on, opts) {
    a11yOn = on;
    document.body.classList.toggle("a11y-mode", on);
    if (a11yToggle) a11yToggle.setAttribute("aria-pressed", String(on));
    if (a11yView) a11yView.hidden = !on;
    ScrollTrigger.getAll().forEach((st) => (on ? st.disable(false) : st.enable()));
    if (on) {
      flight.pause();
      clearBeatStyles();
      planchones.forEach(clearPlanchonStyles);
      document.querySelectorAll("video").forEach((v) => { try { v.pause(); } catch (e) {} });
      // Solo se empieza a leer si el modo lo activó un clic real: si lo
      // encendió `prefers-reduced-motion` al cargar, no hay gesto del
      // usuario y varios navegadores silencian la voz sin uno.
      if (opts && opts.autoRead && TTS_OK) a11yStartReading(0);
    } else {
      a11yStopReading();
      flight.resume();
      ScrollTrigger.refresh();
    }
  }

  if (a11yToggle) {
    a11yToggle.addEventListener("click", () => {
      const turningOn = a11yToggle.getAttribute("aria-pressed") !== "true";
      setA11yMode(turningOn, { autoRead: turningOn });
    });
  }

  // ==========================================================================
  // 12. ARRANQUE Y RECÁLCULO
  // ==========================================================================
  renderBeats(0);
  requestAnimationFrame(frame);
  if (reduceMotion) setA11yMode(true);

  /* En móvil solo se recalcula cuando cambia el ANCHO: si se atiende el alto,
     la barra de direcciones de iOS dispara un refresh por cada scroll. */
  let rt, lastW = window.innerWidth;
  window.addEventListener("resize", () => {
    if (isTouch && window.innerWidth === lastW) return;
    lastW = window.innerWidth;
    clearTimeout(rt);
    rt = setTimeout(() => ScrollTrigger.refresh(), 220);
  });
});
