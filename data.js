/* ============================================================================
   ENTRE ORILLAS — data.js   (v4 · textos definitivos + identidad real)

   FUENTES DE CONTENIDO
   --------------------
   · "El origen de los planchones de Montería" (documento de textos
     definitivos): el relato de origen y las fichas de los 12 planchones,
     cada una con sus seis secciones — CONOCE EL PLANCHÓN, TÉCNICA, SU GENTE,
     EL RÍO, COSTUMBRES Y VIDA COTIDIANA y ¿SABÍAS QUE...?
   · Manual de Identidad Visual del Colectivo XENDA: paleta de 7 colores,
     tipografía primaria Varino Normal y secundaria Century Gothic.
   · Proyecto ganador (Beca de Patrimonio, Montería 2026).

   ORDEN DEL RECORRIDO
   -------------------
   Las fichas se declaran aquí en el orden del documento (La Bonga N.º 1 →
   La 26), pero el recorrido las visita en el orden de ROUTE_ORDER, arriba:
   el vuelo aterriza en La Esmeralda, así que la ruta arranca ahí. El campo
   `num` de cada ficha se recalcula según su posición real en la ruta.
   ============================================================================ */

// ----------------------------------------------------------------------------
// MEDIA_ENABLED — interruptor maestro del material audiovisual.
//
// En false (ahora): la pieza no crea ni un solo <video> ni <img> de fondo, y
// las cuatro fases de cada planchón se dibujan con gráficos de marca. Así el
// recorrido está completo y fluido HOY, sin depender de archivos pesados, y
// sin imágenes rotas.
//
// En true: se vuelven a montar el vuelo, las tomas y los modelos 3D con las
// rutas de FLIGHT_MEDIA / VIDEO_LIB / MODELS_3D, encima de estos mismos
// gráficos, que quedan como fondo mientras un clip carga.
// ----------------------------------------------------------------------------
const MEDIA_ENABLED = true;

// ----------------------------------------------------------------------------
// FLIGHT_ENABLED — interruptor solo del vuelo (portada → primera parada).
// Independiente de MEDIA_ENABLED: ya hay clip real para el vuelo, pero las
// doce escenas de planchón siguen sin sus videos, así que sus gráficos de
// marca se quedan encendidos hasta que lleguen.
// ----------------------------------------------------------------------------
const FLIGHT_ENABLED = true;

// ----------------------------------------------------------------------------
// EL VUELO. `clip-principal.mp4` es el CLIP PRINCIPAL del Drive: cubre la
// portada y la transición por el río HASTA ANTES del primer planchón.
// La llegada es un clip aparte (VIDEO_LIB.llegada).
// ----------------------------------------------------------------------------
const FLIGHT_MEDIA = {
  landscape: "assets/videos/clip-principal.mp4",
  portrait: "assets/videos/clip-principal-vertical.mp4",
  // Si el reencuadre vertical no existe todavía, el motor cae a este:
  portraitFallback: "assets/videos/clip-principal.mp4",
};

const VIDEO_LIB = {
  llegada: "assets/videos/clip-principal.mp4",
  vuelo: "assets/videos/clip-principal.mp4",
  aerial: "assets/videos/aerial.mp4",
  neon: "assets/videos/neon-vector.mp4",
  interior: "assets/videos/interior.mp4",

  // Video "Superman" de cada planchón: la toma aérea de entrada, como si el
  // recorrido estuviera descendiendo hacia ese embarcadero en particular.
  // Se usa como fondo de la fase "conoce" (ver el campo `aerial` de cada
  // ficha en PLANCHONES, más abajo).
  "superman-la-esmeralda": "assets/videos/superman-la-esmeralda.mp4",
  "superman-la-26": "assets/videos/superman-la-26.mp4",
  "superman-el-minuto-de-dios": "assets/videos/superman-el-minuto-de-dios.mp4",
  "superman-la-estrella-del-sinu": "assets/videos/superman-la-estrella-del-sinu.mp4",
  "superman-la-bala-del-sinu": "assets/videos/superman-la-bala-del-sinu.mp4",
  "superman-dinastia-tordecilla": "assets/videos/superman-dinastia-tordecilla.mp4",
  "superman-el-canario": "assets/videos/superman-el-canario.mp4",
  "superman-los-2-hermanos": "assets/videos/superman-los-2-hermanos.mp4",
  "superman-el-colombiano": "assets/videos/superman-el-colombiano.mp4",
  "superman-pompeya": "assets/videos/superman-pompeya.mp4",
  "superman-el-rey-david": "assets/videos/superman-el-rey-david.mp4",
  "superman-la-bonga-1": "assets/videos/superman-la-bonga-1.mp4",
};

const AUDIO_LIB = {
  river: "assets/audio-river-ambient.mp3",
};

// ----------------------------------------------------------------------------
// MODELOS 3D REALES — los 12 completos. Sustituyen el wireframe SVG genérico
// en la fase 3 de cada planchón. Exportados a MP4/H.264.
// ----------------------------------------------------------------------------
const MODELS_3D = {
  "la-esmeralda": "assets/videos/3d-la-esmeralda.mp4",
  "la-26": "assets/videos/3d-la-26.mp4",
  "el-minuto-de-dios": "assets/videos/3d-el-minuto-de-dios.mp4",
  "la-estrella-del-sinu": "assets/videos/3d-la-estrella-del-sinu.mp4",
  "la-bala-del-sinu": "assets/videos/3d-la-bala-del-sinu.mp4",
  "dinastia-tordecilla": "assets/videos/3d-dinastia-tordecilla.mp4",
  "el-canario": "assets/videos/3d-el-canario.mp4",
  "los-2-hermanos": "assets/videos/3d-los-2-hermanos.mp4",
  "el-colombiano": "assets/videos/3d-el-colombiano.mp4",
  "pompeya": "assets/videos/3d-pompeya.mp4",
  "el-rey-david": "assets/videos/3d-el-rey-david.mp4",
  "la-bonga-1": "assets/videos/3d-la-bonga-1.mp4",
};

// ----------------------------------------------------------------------------
// VIDEOS 360° — reproductor de video normal (no son panorámicas
// equirectangulares navegables, son tomas de cámara de acción). Se muestran
// dentro de la ficha final de cada planchón, con controles, independientes
// del scroll. Falta el de "El Minuto de Dios": mientras no exista, esa
// parada simplemente no muestra el bloque 360°.
// ----------------------------------------------------------------------------
const VIDEOS_360 = {
  "la-esmeralda": "assets/videos/360-la-esmeralda.mp4",
  "la-26": "assets/videos/360-la-26.mp4",
  "la-estrella-del-sinu": "assets/videos/360-la-estrella-del-sinu.mp4",
  "la-bala-del-sinu": "assets/videos/360-la-bala-del-sinu.mp4",
  "dinastia-tordecilla": "assets/videos/360-dinastia-tordecilla.mp4",
  "el-canario": "assets/videos/360-el-canario.mp4",
  "los-2-hermanos": "assets/videos/360-los-2-hermanos.mp4",
  "el-colombiano": "assets/videos/360-el-colombiano.mp4",
  "pompeya": "assets/videos/360-pompeya.mp4",
  "el-rey-david": "assets/videos/360-el-rey-david.mp4",
  "la-bonga-1": "assets/videos/360-la-bonga-1.mp4",
};

// ----------------------------------------------------------------------------
// IDENTIDAD. El logotipo real del manual, ya recortado y con fondo
// transparente. Dos versiones: el logotipo solo para el header (más legible
// a 22 px de alto) y el lockup completo con el claim para la portada.
// ----------------------------------------------------------------------------
const BRAND = {
  logo: "assets/img/logo-entre-orillas-mark.png",   // header
  logoFull: "assets/img/logo-entre-orillas.png",    // portada, con el claim
  wordmark: "Entre Orillas",
  claim: "El río que nos mueve",
  waves: "assets/img/marca-ondas.png",
};

// ----------------------------------------------------------------------------
// ORDEN DEL RECORRIDO
// El documento de textos definitivos lista los planchones de La Bonga N.º 1 a
// La 26. Pero el CLIP PRINCIPAL aterriza cerca de LA ESMERALDA, y el vuelo es
// el que manda: la primera escena tiene que continuar el último fotograma del
// clip. Así que la ruta se recorre en sentido inverso, arrancando en La
// Esmeralda y subiendo por el río — y La 26 conserva el papel de cierre que
// le da el propio documento ("el punto de llegada").
//
// Para cambiar el recorrido basta reordenar esta lista: la numeración 01…12,
// el mapa, los enlaces "siguiente" y el HUD se recalculan solos.
// ----------------------------------------------------------------------------
const ROUTE_ORDER = [
  "la-esmeralda",          // aquí aterriza el vuelo
  "la-26",
  "el-minuto-de-dios",
  "la-estrella-del-sinu",
  "la-bala-del-sinu",
  "dinastia-tordecilla",
  "el-canario",
  "los-2-hermanos",
  "el-colombiano",
  "pompeya",
  "el-rey-david",
  "la-bonga-1",            // el punto de llegada
];

// ----------------------------------------------------------------------------
// EL RECORRIDO (journey). `heightVh` es cuánto scroll ocupa: a más alto, más
// lento avanza el vuelo. Los beats declaran `from`/`to` en progreso del
// recorrido (0 = primer fotograma, 1 = último).
//
// Mapa del clip principal:
//   0.00 – 0.21  entrada desde las nubes, descendiendo
//   0.21 – 0.36  el puente queda centrado en pantalla
//   0.36 – 0.51  cruza el puente
//   0.51 – 0.66  río abajo, ya pasado el puente
//   0.66 – 0.83  vuelo en espiral
//   0.83 – 1.00  llegada al embarcadero
// ----------------------------------------------------------------------------
const JOURNEY = {
  id: "recorrido",
  heightVh: 820,
  // En móvil el recorrido se acorta: 820vh de pulgar es demasiado.
  heightVhMobile: 520,

  altitudeTrack: [
    [0.00, 1200], [0.21, 520], [0.38, 300],
    [0.58, 180], [0.80, 95], [1.00, 42],
  ],
  coords: { lat0: 8.7479, lat1: 8.7617, lon0: 75.8814, lon1: 75.8857 },

  beats: [
    {
      id: "hero",
      kind: "hero",
      from: 0.00, to: 0.205,
      label: "Entre Orillas",
      eyebrow: "Ruta turística y cultural",
      title: "Entre Orillas",
      subtitle: "El río que nos mueve",
      text: "Una ruta por la memoria, la identidad y la vida del río Sinú: los doce planchones que conectan las dos márgenes de Montería.",
      indicator: true,
      brand: true,
    },
    {
      id: "puente",
      kind: "side",
      from: 0.235, to: 0.405,
      label: "Puente Gustavo Rojas Pinilla",
      eyebrow: "El punto de partida",
      title: "Más que una sucesión de puntos",
      text: "El recorrido propone descubrir cómo cada planchón ha construido una identidad propia a partir de su nombre, sus colores, las personas que lo habitan y las relaciones que mantiene con el territorio.",
    },
    {
      id: "origen",
      kind: "side",
      side: "right",
      from: 0.435, to: 0.605,
      label: "El origen · el señor Pello",
      eyebrow: "Antes de zarpar",
      title: "Una varita de palo de limón",
      text: "Un campesino conocido como el señor Pello imaginó la embarcación directamente sobre la tierra húmeda, usando como herramienta una varita de palo de limón. Plasmó la idea en una hoja y se la presentó al señor González, quien tenía los recursos para construirla. Funcionó, y empezó a extenderse por la ciudad.",
    },
    {
      id: "la-33",
      kind: "side",
      from: 0.635, to: 0.800,
      label: "El Planchón de la 33",
      eyebrow: "El primero de todos",
      title: "Construido para el ganado",
      text: "Antes de que existiera, el crecimiento del río podía arrastrar a los animales mientras intentaban cruzarlo. La solución fue una estructura de tablas que hiciera el cruce más seguro. Con el tiempo dejaron de transportar solo animales: hoy no necesitan motor, aprovechan la corriente del Sinú mientras un trabajador controla la dirección con una guaya que atraviesa el río.",
    },
    {
      id: "llegada",
      kind: "arrival",
      from: 0.855, to: 1.0,
      label: "Llegada · La Esmeralda",
      eyebrow: "Primera parada",
      title: "La Esmeralda",
      text: "El vuelo desciende hacia el embarcadero. Aquí comienza el recorrido por los doce planchones del Sinú.",
    },
  ],
};

const CLOSING_SCENE = {
  id: "cierre",
  kind: "closing",
  video: "vuelo",
  coords: "8.7628° N · 75.8857° W",
  altitude: 900,
  eyebrow: "Cierre del recorrido",
  title: "Entre una orilla y otra también viajan historias",
  text: "Cada planchón tiene una identidad propia: algunos se reconocen por sus nombres, otros por sus colores, sus historias, sus familias o sus sonidos. Todos forman parte de una misma red que sigue haciendo del río un espacio de encuentro.",
  ctaLabel: "Visitar la ruta real",
  ctaUrl: "#",
};

/* ----------------------------------------------------------------------------
   LOS 12 PLANCHONES, en el orden del documento de textos definitivos.

   Estructura de cada ficha — las seis secciones del documento repartidas
   sobre las cuatro fases visuales de la escena:

     fase 1 · toma aérea      -> conoce   (CONOCE EL PLANCHÓN)
     fase 2 · vectorización   -> tecnica  (TÉCNICA, registro y planos)
     fase 3 · modelo 3D       -> modelo   (TÉCNICA, modelo 3D / 360°)
     fase 4 · interior        -> gente    (SU GENTE)
     ficha final              -> rio + costumbres + sabias

   `layout` rompe la repetición entre los doce: "full" | "split" | "frame" | "center"
   ---------------------------------------------------------------------------- */
const PLANCHONES = [
  {
    id: "la-bonga-1",
    num: "01",
    name: "La Bonga N.º 1",
    tagline: "Una conexión directa con el territorio",
    layout: "full",
    aerial: "superman-la-bonga-1",
    coords: "8.7617° N · 75.8857° W",
    conoce: {
      lead: "Su nombre está relacionado con el embarcadero de la margen izquierda, donde se encuentra una bonga que hace parte del paisaje y permite reconocer este lugar.",
      more: "Ese vínculo entre el nombre y un elemento presente en el territorio muestra cómo la identidad de los planchones también se construye a partir de aquello que las personas observan y reconocen en su entorno.",
      meta: ["Embarcadero histórico", "Margen izquierda"],
    },
    tecnica: {
      lead: "El levantamiento permite conocer su forma, dimensiones, materiales y los elementos que hacen posible su funcionamiento.",
      meta: ["Planos y cortes", "Registro de materiales"],
    },
    modelo: {
      lead: "A través del modelo 3D, los renders, las fotografías y las imágenes 360° se puede explorar el planchón desde diferentes perspectivas.",
    },
    gente: {
      lead: "Trabajar en un planchón no consiste únicamente en trasladar pasajeros de una orilla a otra: también implica establecer relaciones con quienes usan el servicio y conocer el comportamiento del río.",
      meta: ["Cierre del recorrido", "Voces de la conexión"],
    },
    rio: "El paisaje sonoro binaural, las fotografías y las imágenes 360° permiten cerrar el recorrido desde una experiencia visual y auditiva, y reconocer sonidos encontrados a lo largo de la ruta.",
    costumbres: "El último planchón es también una oportunidad para mirar nuevamente aquello que estuvo presente durante todo el recorrido: el comercio, la gastronomía y las formas de habitar la orilla.",
    sabias: "¿Sabías que el nombre de La Bonga N.º 1 está relacionado con una bonga ubicada en el embarcadero de la margen izquierda del río? Ese elemento del entorno se convirtió en la referencia para identificar el planchón, el último de la ruta.",
  },
  {
    id: "el-rey-david",
    num: "02",
    name: "El Rey David",
    tagline: "Fe, identidad y tradición",
    layout: "split",
    aerial: "superman-el-rey-david",
    coords: "8.7609° N · 75.8856° W",
    conoce: {
      lead: "Su nombre guarda un vínculo religioso, y permite acercarse a una dimensión particular de la identidad: la que se construye a partir de creencias, símbolos y significados.",
      more: "Los planchones no son únicamente estructuras destinadas al transporte: también son lugares cargados de significados construidos por quienes los utilizan y trabajan en ellos.",
      meta: ["Vínculo religioso", "Significados cotidianos"],
    },
    tecnica: {
      lead: "Planos, dimensiones, materiales y fotografías permiten conocer con detalle la estructura que hace posible su funcionamiento.",
      meta: ["Registro arquitectónico", "Estructura y cubierta"],
    },
    modelo: {
      lead: "El modelo 3D, los renders y las imágenes 360° permiten explorar la embarcación desde distintos puntos de vista: queda documentada no solo como transporte, sino como pieza del paisaje del río.",
    },
    gente: {
      lead: "Los testimonios permiten comprender el valor humano que existe detrás de cada cruce: una memoria que difícilmente podría encontrarse en un mapa o en un registro técnico.",
      meta: ["Recorridos de vida", "Relatos recuperados"],
    },
    rio: "Desde El Rey David el río se experimenta como espacio de conexión y movimiento: observar las dos orillas desde el agua, reconocer los cambios del paisaje y escuchar los sonidos que acompañan el desplazamiento.",
    costumbres: "El comercio, la gastronomía y los encuentros que ocurren mientras las personas esperan o realizan el cruce hacen parte de una cotidianidad construida alrededor del río.",
    sabias: "¿Sabías que el nombre El Rey David está relacionado con una referencia religiosa? Las creencias y los significados personales también pueden formar parte de la identidad de los espacios cotidianos.",
  },
  {
    id: "pompeya",
    num: "03",
    name: "Pompeya",
    tagline: "Un oficio sobre el río",
    layout: "frame",
    aerial: "superman-pompeya",
    coords: "8.7601° N · 75.8855° W",
    conoce: {
      lead: "Pompeya permite acercarse a una de las dimensiones más importantes de los planchones: el trabajo. Cada día conecta personas, actividades y territorios a través del Sinú.",
      more: "El planchonero no solamente conduce una embarcación: desarrolla una relación permanente con el río, con los pasajeros y con las condiciones de cada jornada.",
      meta: ["Oficio diario", "Conexión de territorios"],
    },
    tecnica: {
      lead: "Los planos, fotografías y recursos gráficos permiten reconocer su forma, dimensiones, materiales y características particulares.",
      meta: ["Configuración actual", "Arquitectura cotidiana"],
    },
    modelo: {
      lead: "El modelo 3D, los renders y las imágenes 360° permiten recorrer digitalmente el planchón y hacer visible una arquitectura que normalmente solo se observa durante el cruce.",
    },
    gente: {
      lead: "Sus historias de vida muestran las relaciones que se construyen alrededor del trabajo y del río, y las experiencias que permanecen detrás de cada recorrido.",
      meta: ["Puesto de mando", "Experiencia del oficio"],
    },
    rio: "El río es el escenario permanente del oficio: sus cambios, sonidos, movimientos y paisajes forman parte de una experiencia que se repite a diario, pero que nunca es exactamente igual.",
    costumbres: "Esperar, conversar, trabajar, comprar, vender o simplemente permanecer junto al río son formas de habitar que también construyen identidad.",
    sabias: "¿Sabías que detrás del funcionamiento cotidiano de un planchón existe un oficio que depende del conocimiento y la experiencia de quienes trabajan directamente sobre el río?",
  },
  {
    id: "el-colombiano",
    num: "04",
    name: "El Colombiano",
    tagline: "Los colores de una identidad",
    layout: "center",
    aerial: "superman-el-colombiano",
    coords: "8.7593° N · 75.8854° W",
    conoce: {
      lead: "Se reconoce por los elementos visuales que acompañan su identidad: sus colores y referencias asociadas a Colombia le dan una presencia particular dentro del paisaje del río.",
      more: "Nombres, colores, símbolos y formas contribuyen a diferenciar los planchones entre sí. Aquí se observa cómo una práctica local puede incorporar referencias de una identidad más amplia.",
      meta: ["Colores patrios", "Presencia particular"],
    },
    tecnica: {
      lead: "Planos, fotografías, dimensiones y registros de materiales permiten comprender cómo se organiza el espacio que usan a diario trabajadores y pasajeros.",
      meta: ["Franjas de color", "Organización del espacio"],
    },
    modelo: {
      lead: "El modelo 3D, los renders y las imágenes 360° permiten explorar sus características desde diferentes perspectivas y conservar una representación digital de su estado actual.",
    },
    gente: {
      lead: "Las personas que trabajan en El Colombiano son parte fundamental de su identidad: sus rostros y sus historias muestran cómo el oficio construye pertenencia.",
      meta: ["Rostros del planchón", "Pertenencia"],
    },
    rio: "El paisaje cambia constantemente durante el recorrido, y los sonidos del agua, la embarcación y las personas construyen una experiencia particular entre las dos orillas.",
    costumbres: "Quienes trabajan, esperan, venden, compran o se encuentran alrededor del embarcadero construyen la dinámica que acompaña el funcionamiento del planchón.",
    sabias: "¿Sabías que los colores y elementos visuales de El Colombiano hacen parte de aquello que permite reconocerlo dentro del paisaje del río? Su identidad visual es otra forma de diferenciarlo.",
  },
  {
    id: "los-2-hermanos",
    num: "05",
    name: "Los 2 Hermanos",
    tagline: "Familia y memoria",
    layout: "full",
    aerial: "superman-los-2-hermanos",
    coords: "8.7586° N · 75.8853° W",
    conoce: {
      lead: "Lleva en su nombre una referencia directa a los vínculos familiares, y permite acercarse a la relación que existe entre familia, trabajo y territorio.",
      more: "La ruta invita a reconocer esa dimensión afectiva que puede permanecer detrás de un nombre y convertirse con el tiempo en parte de la memoria del lugar.",
      meta: ["Vínculo familiar", "Memoria del lugar"],
    },
    tecnica: {
      lead: "Los planos y fotografías muestran aquello que normalmente se observa de manera rápida durante el cruce: los elementos que conforman su estructura.",
      meta: ["Doble baranda", "Zona de carga"],
    },
    modelo: {
      lead: "El modelo 3D, los renders y las imágenes 360° amplían la mirada y permiten explorar digitalmente una estructura que forma parte de la movilidad cotidiana de Montería.",
    },
    gente: {
      lead: "Cada planchonero tiene una experiencia particular y una relación distinta con el oficio, el río y las personas que utilizan la embarcación.",
      meta: ["Retrato colectivo", "Servicio diario"],
    },
    rio: "El movimiento del agua, el sonido de la embarcación y las voces de los pasajeros crean un ambiente particular que cambia a lo largo del día.",
    costumbres: "Personas que esperan, trabajan, conversan, venden, compran o permanecen en el espacio: pequeñas acciones cotidianas que, repetidas en el tiempo, construyen la identidad del lugar.",
    sabias: "¿Sabías que el nombre Los 2 Hermanos hace referencia a un vínculo familiar? Un nombre sencillo puede ser la puerta de entrada a las relaciones humanas que hacen parte de la historia de los planchones.",
  },
  {
    id: "el-canario",
    num: "06",
    name: "El Canario",
    tagline: "Un lugar para escuchar",
    layout: "split",
    aerial: "superman-el-canario",
    coords: "8.7578° N · 75.8851° W",
    conoce: {
      lead: "Su nombre está relacionado con los sonidos de aves que pueden escucharse en su entorno: el paisaje sonoro tiene un papel importante dentro de la identidad del lugar.",
      more: "Aquí la experiencia propone detenerse y escuchar. El agua, las aves, la vegetación, las voces y los motores construyen una atmósfera que pasa desapercibida cuando solo se piensa en el río como lugar de paso.",
      meta: ["Paisaje sonoro", "Sonidos de aves"],
    },
    tecnica: {
      lead: "Planos, fotografías, dimensiones y registros de materiales permiten acercarse a sus características desde una mirada arquitectónica.",
      meta: ["Techo de zinc", "Cubierta abierta"],
    },
    modelo: {
      lead: "El modelo 3D, los renders y las imágenes 360° convierten la documentación técnica en una herramienta para conservar la memoria visual del lugar.",
    },
    gente: {
      lead: "Sus relatos permiten conocer cómo se desarrolla el oficio, qué experiencias han acumulado y qué relación han construido con el río a través del tiempo.",
      meta: ["Familia Martínez", "Construido en 1978"],
    },
    rio: "Escuchar el río desde este punto permite descubrir una dimensión que no siempre es visible: el paisaje sonoro que acompaña el cruce y las actividades de la orilla. Cierra los ojos y escucha.",
    costumbres: "El comercio, la gastronomía, los encuentros y las distintas maneras de permanecer junto al río construyen una dinámica propia alrededor del embarcadero.",
    sabias: "¿Sabías que la familia de Hernán Martínez lleva más de 40 años vinculada a El Canario, construido por su padre en 1978? Aquí, aquello que se escucha también es una forma de reconocer y recordar el lugar.",
  },
  {
    id: "dinastia-tordecilla",
    num: "07",
    name: "Dinastía Tordecilla",
    tagline: "Una historia que continúa",
    layout: "frame",
    aerial: "superman-dinastia-tordecilla",
    coords: "8.7571° N · 75.8850° W",
    conoce: {
      lead: "Su nombre remite a una historia familiar y abre la posibilidad de comprender cómo un oficio permanece en el tiempo a través de quienes lo aprenden, lo practican y lo transmiten.",
      more: "En los planchones el conocimiento no está únicamente en la estructura de la embarcación: también está en quienes conocen el río y han aprendido a leer sus dinámicas.",
      meta: ["Oficio heredado", "Tradición familiar"],
    },
    tecnica: {
      lead: "Los planos, fotografías y recursos gráficos permiten conocer sus características físicas, materiales y elementos principales.",
      meta: ["Bancas de madera", "Baranda familiar"],
    },
    modelo: {
      lead: "El modelo 3D, los renders y las imágenes 360° permiten recorrer la embarcación desde diferentes perspectivas y conservar su imagen dentro del paisaje actual del río.",
    },
    gente: {
      lead: "A través de las entrevistas se pueden escuchar sus voces y reconocer los aprendizajes que hacen posible que una práctica como esta continúe formando parte de la cotidianidad del río.",
      meta: ["Transmisión del saber", "Generaciones"],
    },
    rio: "El río no es únicamente el espacio que se atraviesa: también es el entorno en el que se construyen conocimientos, recuerdos y formas de vida.",
    costumbres: "El comercio, la gastronomía, los encuentros y las actividades diarias forman un paisaje humano que cambia durante el día, pero conserva prácticas reconocibles.",
    sabias: "¿Sabías que la palabra “dinastía” permite acercarse a la idea de continuidad familiar y transmisión de conocimientos? El nombre abre una mirada hacia la relación entre familia, oficio y memoria.",
  },
  {
    id: "la-bala-del-sinu",
    num: "08",
    name: "La Bala del Sinú",
    tagline: "Movimiento entre orillas",
    layout: "center",
    aerial: "superman-la-bala-del-sinu",
    coords: "8.7563° N · 75.8848° W",
    conoce: {
      lead: "Es reconocida por la sensación de rapidez que acompaña su desplazamiento: su nombre transmite una idea de velocidad y movimiento.",
      more: "Desde aquí el río puede observarse como un territorio en movimiento: las orillas cambian de posición mientras la embarcación avanza y el tiempo del recorrido adquiere otra percepción.",
      meta: ["Cruce veloz", "Percepción del movimiento"],
    },
    tecnica: {
      lead: "Los planos y fotografías hacen visible la configuración de una embarcación que normalmente se experimenta en movimiento.",
      meta: ["Guaya tensora", "Timón manual"],
    },
    modelo: {
      lead: "El modelo 3D, los renders y las imágenes 360° permiten explorarla desde diferentes perspectivas y conservar una representación digital de su estado actual.",
    },
    gente: {
      lead: "Los planchoneros son quienes convierten el movimiento de La Bala del Sinú en una actividad cotidiana, y quienes conocen este recorrido desde dentro.",
      meta: ["Memoria viva", "Relación con los pasajeros"],
    },
    rio: "El agua, el viento, el sonido de la embarcación y las voces de quienes viajan construyen una experiencia que cambia mientras el planchón avanza.",
    costumbres: "El movimiento del planchón hace parte de una dinámica social mucho más amplia: esperar el cruce, encontrarse, trabajar, comprar o desplazarse.",
    sabias: "¿Sabías que La Bala del Sinú es reconocida por la rapidez de su cruce? Su nombre se relaciona con esa percepción de movimiento y velocidad que caracteriza la experiencia de atravesar el río.",
  },
  {
    id: "la-estrella-del-sinu",
    num: "09",
    name: "La Estrella del Sinú",
    tagline: "Una expresión sobre el agua",
    layout: "full",
    aerial: "superman-la-estrella-del-sinu",
    coords: "8.7556° N · 75.8846° W",
    conoce: {
      lead: "Llama la atención por sus características visuales y ornamentales: sus detalles le dan una presencia particular dentro del paisaje.",
      more: "Este planchón invita a ampliar la idea de patrimonio. No solamente los grandes edificios o monumentos conservan valores culturales: también hay estructuras cotidianas que desarrollan características propias y se vuelven referentes.",
      meta: ["Detalles ornamentales", "Referente visual"],
    },
    tecnica: {
      lead: "Planos, elevaciones, cortes, fotografías y detalles permiten observar los elementos que conforman la embarcación.",
      meta: ["Ornamentos tallados", "Techo a dos aguas"],
    },
    modelo: {
      lead: "El modelo 3D, los renders y las imágenes 360° permiten acercarse a sus formas y detalles: documentar una expresión constructiva que forma parte del paisaje cotidiano del río.",
    },
    gente: {
      lead: "Sus historias permiten conocer el oficio desde quienes lo realizan a diario y comprender las relaciones que se construyen entre trabajo, río y comunidad.",
      meta: ["Voces conservadas", "Trabajo y comunidad"],
    },
    rio: "Desde la embarcación se pueden observar las dos orillas, el movimiento del agua y las diferentes actividades que ocurren alrededor.",
    costumbres: "El comercio, la gastronomía, los encuentros y los oficios muestran cómo los espacios cercanos al río se convierten en lugares de trabajo, permanencia, encuentro y tránsito.",
    sabias: "¿Sabías que La Estrella del Sinú destaca por sus elementos ornamentales? Sus detalles permiten reconocer que la creatividad también puede formar parte de una estructura de uso cotidiano.",
  },
  {
    id: "la-esmeralda",
    num: "10",
    name: "La Esmeralda",
    tagline: "Una identidad que se reconoce",
    layout: "full",
    aerial: "superman-la-esmeralda",
    coords: "8.7534° N · 75.8838° W",
    conoce: {
      lead: "Su nombre y sus colores hacen que pueda reconocerse con facilidad, y muestran cómo una embarcación construye una imagen propia a partir de elementos sencillos que permanecen en la memoria.",
      more: "Los planchones no son iguales entre sí. En La Esmeralda, la identidad visual es una oportunidad para observar cómo los colores, los nombres y las formas participan en la construcción de la memoria del río.",
      meta: ["Identidad visual propia", "Color reconocible"],
    },
    tecnica: {
      lead: "Planos, fotografías, dimensiones y registros de materiales permiten conocer la embarcación más allá de su apariencia general.",
      meta: ["Sillas y barandas", "Chalecos salvavidas"],
    },
    modelo: {
      lead: "El modelo 3D, los renders y las imágenes 360° permiten explorarla desde diferentes perspectivas: la técnica se convierte en otra forma de documentar el patrimonio cotidiano del río.",
    },
    gente: {
      lead: "Sus planchoneros conocen cada cambio del río y sostienen, día a día, el cruce entre las dos orillas.",
      meta: ["Contacto diario", "Conocimiento del río"],
    },
    rio: "El paisaje, el agua, las orillas y los sonidos que acompañan el trayecto forman parte de una experiencia cotidiana que puede observarse desde diferentes momentos del día.",
    costumbres: "La gastronomía, el comercio, las artesanías, los encuentros y las formas de permanencia construyen un paisaje humano alrededor del planchón.",
    sabias: "¿Sabías que el nombre y la identidad visual de La Esmeralda están relacionados con el color que caracteriza al planchón? Esa relación entre nombre y apariencia permite reconocerlo fácilmente.",
  },
  {
    id: "el-minuto-de-dios",
    num: "11",
    name: "El Minuto de Dios",
    tagline: "Trabajo, territorio y sustento",
    layout: "frame",
    aerial: "superman-el-minuto-de-dios",
    coords: "8.7549° N · 75.8843° W",
    conoce: {
      lead: "Su nombre está relacionado con el sector en el que se encuentra, y muestra cómo los planchones mantienen una relación directa con los barrios y comunidades que se desarrollan alrededor del río.",
      more: "Detrás de cada recorrido existen personas para quienes esta actividad forma parte de su vida diaria y de la economía de sus hogares: el planchón es un punto donde movilidad, trabajo y territorio se encuentran.",
      meta: ["Sector Minuto de Dios", "Sustento familiar"],
    },
    tecnica: {
      lead: "Los planos, fotografías y recursos gráficos documentan su estado actual y permiten observar detalles que normalmente pasan desapercibidos.",
      meta: ["Motor de guaya", "Zona de pasajeros"],
    },
    modelo: {
      lead: "El modelo 3D, los renders y las imágenes 360° permiten explorar el planchón digitalmente y unir la mirada arquitectónica con la experiencia cotidiana del lugar.",
    },
    gente: {
      lead: "Sus historias permiten conocer el oficio desde una perspectiva humana y comprender cómo la relación con el río puede convertirse en parte de una trayectoria de vida.",
      meta: ["Sustento diario", "Recuerdos y aprendizajes"],
    },
    rio: "El paisaje de las orillas, el movimiento del agua y los sonidos de la embarcación construyen una experiencia particular para quienes realizan el cruce.",
    costumbres: "Trabajando, esperando, conversando, comprando, vendiendo o simplemente permaneciendo junto al río: el embarcadero se usa mucho más allá del momento del cruce.",
    sabias: "¿Sabías que el nombre de El Minuto de Dios está relacionado con el sector en el que se encuentra? Los nombres también se convierten en una forma de reconocer los lugares desde los que se construye la vida cotidiana.",
  },
  {
    id: "la-26",
    num: "12",
    name: "La 26",
    tagline: "El nombre que da el paisaje",
    layout: "center",
    aerial: "superman-la-26",
    coords: "8.7541° N · 75.8841° W",
    conoce: {
      lead: "Su nombre está relacionado directamente con la calle 26, estableciendo una conexión sencilla entre la embarcación y el territorio que la rodea.",
      more: "Cada planchón es particular, pero todos hacen parte de una misma red de conexiones que atraviesa lugares, personas y formas de relacionarse con el río.",
      meta: ["Calle 26", "Red de conexión"],
    },
    tecnica: {
      lead: "Planos, fotografías, dimensiones, materiales y detalles permiten conocer las características físicas de la embarcación y documentar su estado actual.",
      meta: ["Cubierta de madera", "Baranda perimetral"],
    },
    modelo: {
      lead: "El modelo 3D, los renders, las fotografías y las imágenes 360° permiten explorar el planchón desde diferentes perspectivas.",
    },
    gente: {
      lead: "Sus historias, junto con las de los demás planchoneros, permiten entender que la memoria de los planchones es también una memoria humana.",
      meta: ["Voces del oficio", "Memoria viva"],
    },
    rio: "El embarcadero, el agua, los pasajeros y el movimiento del planchón forman parte de una escena que se repite a diario y que, al detenerse a observarla, revela la relación entre la ciudad y el río.",
    costumbres: "Los alrededores del embarcadero son espacios de paso, encuentro, trabajo y permanencia, donde conviven el comercio, la gastronomía y los servicios de la zona.",
    sabias: "¿Sabías que el nombre de La 26 está relacionado directamente con la calle 26? Su nombre conecta la embarcación con el territorio, una característica que también aparece en otros puntos de la ruta.",
  },
];

/* Tarjetas del beat de costumbres del recorrido. Vacío mientras no haya
   fotografías reales: un marco con una imagen rota dentro es peor que nada.
   Al tenerlas, añadir aquí {src, caption, depth, at, spot} y activarlas
   poniendo MEDIA_ENABLED en true. */
const COSTUMBRE_CARDS = [];
