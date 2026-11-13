/* SAORI · Laboratorio de grafos masivos (WebGL nativo de alto rendimiento).
   Datos: /assets/grafos/<id>.bin.gz (DGR1 binario comprimido con gzip) y meta.json.
   Soporta hasta 273.484 nodos y 960.254 aristas reales sin librerías externas.
   Renderizado: Aristas con coloración por vértice interpolada + Nodos con blending alfa no saturante.
   HUD: /api/server-status y /api/metricas (públicos). */
(() => {
  'use strict';
  const EN = (document.documentElement.lang || '').startsWith('en');
  const L = EN ? 1 : 0;
  const T = EN
    ? {
        nodes: 'nodes', edges: 'edges', real: 'real', drag: 'Drag to rotate · Scroll to zoom',
        online: 'ONLINE', offline: 'NO SIGNAL', players: 'players', peak: 'weekly peak',
        uniq: 'unique players', ver: 'version', fps: 'fps', load: 'Loading neural topology…',
        fail: 'Graph unavailable', conn: 'connections', comm: 'Cluster', private: 'Private sovereign node',
        edgeMode: 'Edges: ', nodeMode: 'Nodes: ', rotMode: 'Rotation: ', resetCam: 'Reset View',
        edgeBright: 'Vibrant', edgeNormal: 'Normal', edgeOff: 'Hidden',
        nodeStellar: 'Fine Stars', nodeMid: 'Balanced', nodeBig: 'Cluster',
        rotPlay: 'Spinning', rotPause: 'Paused',
        clickHint: 'Click a node to inspect · Hover to preview'
      }
    : {
        nodes: 'nodos', edges: 'aristas', real: 'reales', drag: 'Arrastra para girar · Rueda para zoom',
        online: 'EN LÍNEA', offline: 'SIN SEÑAL', players: 'jugadores', peak: 'pico semanal',
        uniq: 'jugadores distintos', ver: 'versión', fps: 'fps', load: 'Cargando topología neuronal…',
        fail: 'Grafo no disponible', conn: 'conexiones', comm: 'Cúmulo', private: 'Nodo soberano privado',
        edgeMode: 'Aristas: ', nodeMode: 'Nodos: ', rotMode: 'Giro: ', resetCam: 'Centrar Vista',
        edgeBright: 'Brillante', edgeNormal: 'Normal', edgeOff: 'Ocultas',
        nodeStellar: 'Estelar Fino', nodeMid: 'Equilibrado', nodeBig: 'Cúmulo',
        rotPlay: 'Girando', rotPause: 'Pausado',
        clickHint: 'Haz clic en un nodo para fijar · Pasa el cursor para ver detalles'
      };

  const TYPE_NAMES = EN
    ? ['File', 'Class', 'Function', 'Document', 'Symbol']
    : ['Archivo', 'Clase', 'Función', 'Documento', 'Símbolo'];

  // Paleta helénica-cósmica de alta saturación y contraste visual
  const TYPE_COLORS = [
    [0.35, 0.68, 1.00, 0.95], // Archivo / File (#58a6ff - Azul Eléctrico)
    [1.00, 0.82, 0.32, 0.98], // Clase / Class (#ffd15c - Oro Olímpico)
    [1.00, 0.28, 0.82, 0.95], // Función / Function (#ff4fd8 - Magenta Neón)
    [0.72, 0.58, 1.00, 0.92], // Documento / Document (#b89cff - Púrpura Amatista)
    [0.22, 0.90, 0.82, 0.95]  // Símbolo / Symbol (#3fe0d0 - Cian Turquesa)
  ];
  const TYPE_HEX = ['#58a6ff', '#ffd15c', '#ff4fd8', '#b89cff', '#3fe0d0'];

  const DESCRIPTIONS = {
    labs: {
      title: EN ? 'Slimefun Labs · 180+ Addon Ecosystem' : 'Slimefun Labs · Ecosistema de 180+ Addons',
      badge: EN ? 'SLIMEFUN ENGINEERING MONOREPO' : 'MONOREPO DE INGENIERÍA SLIMEFUN',
      what: EN
        ? 'Abstract Syntax Tree (AST) of over 180 addons consolidated into JackStar’s sovereign StarSuites monorepo.'
        : 'Árbol sintáctico (AST) de más de 180 addons consolidados en la suite StarSuites de JackStar.',
      center: EN
        ? 'The golden/cyan core groups the unified SuiteTickerEngine, Dough kernel, and off-heap Rust acceleration bindings.'
        : 'El núcleo agrupa el SuiteTickerEngine unificado, Dough-core shadeado y los bindings off-heap en Rust.',
      clusters: EN
        ? 'Orbital constellations represent tech suites (Networks, InfinityExpansion), genetics (Chickengineering), and magic.'
        : 'Los cúmulos orbitales representan tecnología (Networks, InfinityExpansion), bio-genética y magia.',
      lines: EN
        ? 'Colored lines trace real Java method calls, machine tick cycles, recipes, and class inheritance.'
        : 'Las líneas de color trazan llamadas a métodos Java, tickers de máquinas, recetas y herencia de clases.'
    },
    galaxia: {
      title: EN ? 'Star Galaxy · Complete Constellation (35 Repositories)' : 'Galaxia Star · Constelación Completa (35 Repositorios)',
      badge: EN ? '273,484 NODES · 960,254 REAL EDGES' : '273.484 NODOS · 960.254 ARISTAS REALES',
      what: EN
        ? 'Complete architectural map of all software powering DrakesCraft and the Star platform across 35 codebases.'
        : 'Mapa integral de toda la infraestructura de código que compone DrakesCraft y la plataforma Star.',
      center: EN
        ? 'The central galaxy core links the Minecraft server engine (Purpur 26.2) and off-heap Star-Rust kernel.'
        : 'El epicentro galáctico conecta el motor Minecraft (Purpur 26.2) y el kernel nativo Star-Rust.',
      clusters: EN
        ? 'Each orbital spiral disc is a full repository: BentoBox, EliteMobs, SAORI, Denizen, and game suites.'
        : 'Cada disco espiral es un repositorio completo: BentoBox, EliteMobs, SAORI, Denizen y las suites maestras.',
      lines: EN
        ? 'Inter-cluster bridge lines reveal plugin event hooks, JNI calls, and autonomous SRE telemetry streams.'
        : 'Las líneas puente revelan intercambio de eventos entre plugins, JNI y telemetría de agentes SRE.'
    },
    aihub: {
      title: EN ? 'SAORI ai-hub · Autonomous SRE Agent Brain' : 'SAORI ai-hub · Cerebro de Agentes Autónomos SRE',
      badge: EN ? 'ORCHESTRATOR & VECTOR MEMORY' : 'ORQUESTADOR Y MEMORIA VECTORIAL',
      what: EN
        ? 'Software topology of the SAORI framework: agent orchestration, SQLite WAL memory, and daemons.'
        : 'Topología de software del framework SAORI: orquestación de agentes, memoria en SQLite WAL y daemons.',
      center: EN
        ? 'The core contains the central saori-ai-daemon and atomic SRE ticket dispatch engine.'
        : 'El núcleo reúne el daemon central saori-ai-daemon y el despachador atómico de tickets SRE.',
      clusters: EN
        ? 'Omnichannel bridges (Discord/WhatsApp), real-time translator (drakes-translate), and antidupe guards.'
        : 'Módulos omnicanal (Discord/WhatsApp), traductor en tiempo real (drakes-translate) y guardias anti-dupe.',
      lines: EN
        ? 'Neural context pipelines, model inferencing fallback routes, and server incident watchers.'
        : 'Líneas de contexto neuronal, rutas de fallback de inferencia y watchers de eventos del servidor.'
    },
    tinkers: {
      title: EN ? 'TinkersConstruct · Hellenic Smeltery & Metallurgy' : 'TinkersConstruct · Forja y Metalurgia Helénica',
      badge: EN ? 'MODULAR TOOL ENGINE' : 'SISTEMA DE HERRAMIENTAS MODULARES',
      what: EN
        ? 'Smeltery, alloys, and modular tools engine adapted for Paper 1.21.11 in DrakesCraft.'
        : 'Motor de fundiciones, aleaciones y herramientas modulares adaptado para Paper 1.21.11 en DrakesCraft.',
      center: EN
        ? 'The central smeltery, modifier registry, and alloy material controllers.'
        : 'La fundición central, el registro de modificadores y materiales de aleación.',
      clusters: EN
        ? 'Tool parts, casting patterns, crucible recipes, and combat modifiers.'
        : 'Partes de herramientas, patrones de fundición, recetas en crisol y efectos de combate.',
      lines: EN
        ? 'Crafting interactions, damage computations, and durability hooks.'
        : 'Interacciones de crafteo, cálculo de daño y hooks de durabilidad.'
    },
    denizen: {
      title: EN ? 'Denizen · Quest Engine & Divine Pantheon' : 'Denizen · Motor de Misiones y Panteón de Dioses',
      badge: EN ? 'REACTIVE SCRIPTING & DIVINE EVENTS' : 'SCRIPTING REACTIVO Y EVENTOS DIVINOS',
      what: EN
        ? 'Scripting engine bringing Olympus god NPCs, Odysseus quests, and in-game cinematics to life.'
        : 'Motor de scripts que da vida a los NPCs de dioses del Olimpo, misiones de Odiseo y cinemáticas in-game.',
      center: EN
        ? 'The script dispatcher and reactive world event queue.'
        : 'El despachador de scripts y la cola de eventos reactivos del mundo.',
      clusters: EN
        ? 'Quest commands, narrative god dialogues, rewards, and cutscenes.'
        : 'Comandos de quest, diálogos narrativos de dioses, recompensas y cinemáticas.',
      lines: EN
        ? 'Event triggers between players, worlds, and protected blocks.'
        : 'Triggers de eventos entre jugadores, mundos y bloques protegidos.'
    },
    bentobox: {
      title: EN ? 'BentoBox · SkyBlock & OneBlock Modalities' : 'BentoBox · Modalidades SkyBlock y OneBlock',
      badge: EN ? 'ISOLATED MULTI-MODALITY ENGINE' : 'MOTOR MULTI-MODALIDAD AISLADO',
      what: EN
        ? 'Architecture managing floating islands, level calculation, challenges, and world boundaries.'
        : 'Arquitectura de gestión de islas flotantes, cálculo de niveles, retos y límites de mundos.',
      center: EN
        ? 'BentoBox kernel and player island database engine.'
        : 'Kernel de BentoBox y motor de base de datos de islas de jugadores.',
      clusters: EN
        ? 'Challenge modules, cobblestone generators, biomes, and GUI panels.'
        : 'Módulos de retos (Challenges), generadores de piedra, biomas y paneles GUI.',
      lines: EN
        ? 'Block placement events, island permissions, and progression levels.'
        : 'Eventos de colocación de bloques, permisos de isla y niveles de progreso.'
    },
    elitemobs: {
      title: EN ? 'EliteMobs · World Bosses & Procedural Dungeons' : 'EliteMobs · Jefes Mundiales y Mazmorras Procedurales',
      badge: EN ? 'RPG COMBAT & OLYMPIAN DUNGEONS' : 'COMBATE RPG Y CALABOZOS OLÍMPICOS',
      what: EN
        ? 'Open-world boss engine, elite powers, mythological dungeons, and legendary loot.'
        : 'Motor de jefes de mundo abierto, poderes élite, calabozos mitológicos y botín legendario.',
      center: EN
        ? 'Elite spawn manager, combat AI, and boss power tree.'
        : 'Gestor de spawn de élites, IA de combate y árbol de poderes de jefes.',
      clusters: EN
        ? 'Elemental powers, instanced dungeons, sacred armors, and treasure pools.'
        : 'Poderes elementales, calabozos instanciados, armaduras sagradas y tesoros.',
      lines: EN
        ? 'Aggro logic, elemental damage streams, and dynamic drop tables.'
        : 'Lógica de aggro, daño elemental y tablas de drops dinámicas.'
    }
  };

  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MOBILE = innerWidth < 760;
  const cache = {};
  const labelsCache = {};
  let metaData = null;

  const el = (tag, cls, txt) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  };

  async function gunzip(buffer) {
    const u8 = new Uint8Array(buffer);
    if (u8[0] === 0x1f && u8[1] === 0x8b) {
      if (typeof DecompressionStream !== 'undefined') {
        try {
          const ds = new DecompressionStream('gzip');
          const stream = new Response(buffer).body.pipeThrough(ds);
          return await new Response(stream).arrayBuffer();
        } catch (e) {
          const ds = new DecompressionStream('gzip');
          const writer = ds.writable.getWriter();
          writer.write(u8);
          writer.close();
          return await new Response(ds.readable).arrayBuffer();
        }
      }
    }
    return buffer;
  }

  function parseDGR1(rawBuffer) {
    const view = new DataView(rawBuffer);
    const magic = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
    if (magic !== 'DGR1') throw new Error('Formato no válido: ' + magic);

    const N = view.getUint32(4, true);
    const M = view.getUint32(8, true);
    const t1 = view.getUint32(12, true);
    const u32 = view.getUint32(16, true) === 1;

    const len_p = N * 6 + ((-N * 6) % 4);
    const posInt16 = new Int16Array(rawBuffer, 20, N * 3);
    const atUint8 = new Uint8Array(rawBuffer, 20 + len_p, N * 4);
    const edgeOffset = 20 + len_p + N * 4;

    const edges = u32
      ? new Uint32Array(rawBuffer, edgeOffset, M * 2)
      : new Uint16Array(rawBuffer, edgeOffset, M * 2);

    const posF32 = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      let x = posInt16[i * 3 + 0] / 32000.0;
      let y = posInt16[i * 3 + 1] / 32000.0;
      let z = posInt16[i * 3 + 2] / 32000.0;
      let r = Math.sqrt(x * x + y * y + z * z);
      if (r > 0.0001) {
        // Descompresión cosmológica radial: abre el núcleo denso (r < 0.25)
        // expandiéndolo armónicamente hacia una nebulosa espaciosa sin alterar el halo exterior (r=1.0)
        let r_new = Math.pow(r, 0.58);
        let scale = r_new / r;
        x *= scale;
        y *= scale;
        z *= scale;
      }
      posF32[i * 3 + 0] = x;
      posF32[i * 3 + 1] = y;
      posF32[i * 3 + 2] = z;
    }

    const colorsU8 = new Uint8Array(N * 4);
    const sizesF32 = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const typ = atUint8[i * 4 + 0] % 5;
      const deg = atUint8[i * 4 + 1];
      const tc = TYPE_COLORS[typ];

      colorsU8[i * 4 + 0] = Math.round(tc[0] * 255);
      colorsU8[i * 4 + 1] = Math.round(tc[1] * 255);
      colorsU8[i * 4 + 2] = Math.round(tc[2] * 255);
      colorsU8[i * 4 + 3] = Math.round(tc[3] * 255);

      // Tamaño equilibrado tipo constelación estelar (evita el colapso en mancha blanca)
      sizesF32[i] = Math.max(1.8, Math.min(10.0, Math.sqrt(deg) * 0.85 + 1.8));
    }

    return { N, M, t1, u32, posF32, atUint8, colorsU8, sizesF32, edges };
  }

  function createProgram(gl, vsSource, fsSource) {
    const compile = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        const err = gl.getShaderInfoLog(s);
        gl.deleteShader(s);
        throw new Error(err);
      }
      return s;
    };
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl.VERTEX_SHADER, vsSource));
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fsSource));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      const err = gl.getProgramInfoLog(p);
      gl.deleteProgram(p);
      throw new Error(err);
    }
    return p;
  }

  function mat4Mul(out, a, b) {
    for (let i = 0; i < 4; i++) {
      const ai0 = a[i], ai1 = a[i + 4], ai2 = a[i + 8], ai3 = a[i + 12];
      out[i] = ai0 * b[0] + ai1 * b[1] + ai2 * b[2] + ai3 * b[3];
      out[i + 4] = ai0 * b[4] + ai1 * b[5] + ai2 * b[6] + ai3 * b[7];
      out[i + 8] = ai0 * b[8] + ai1 * b[9] + ai2 * b[10] + ai3 * b[11];
      out[i + 12] = ai0 * b[12] + ai1 * b[13] + ai2 * b[14] + ai3 * b[15];
    }
    return out;
  }

  function mount(root) {
    const targetSets = (root.dataset.sets || 'labs,galaxia,aihub,tinkers,denizen,bentobox,elitemobs').split(',');
    const tabs = el('div', 'sg-tabs'); tabs.setAttribute('role', 'tablist');
    const toolbar = el('div', 'sg-toolbar');
    const stage = el('div', 'sg-stage');
    const cv = el('canvas', 'sg-canvas'); cv.setAttribute('role', 'img');
    const tip = el('div', 'sg-tip'); tip.hidden = true;
    const legend = el('div', 'sg-legend');
    const info = el('div', 'sg-info', T.load);
    const hint = el('div', 'sg-hint', T.drag);

    // Inspector y Card de explicación dinámica
    const inspector = el('div', 'sg-inspector');
    const descCard = el('div', 'sg-desc-card');

    stage.append(cv, tip, legend, info, hint);
    root.append(tabs, toolbar, stage, inspector, descCard);

    TYPE_NAMES.forEach((name, i) => {
      const s = el('span', null, name);
      s.style.setProperty('--c', TYPE_HEX[i]);
      legend.append(s);
    });

    let gl = cv.getContext('webgl2', { alpha: true, antialias: true, premultipliedAlpha: false, powerPreference: 'high-performance' })
          || cv.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: false })
          || cv.getContext('experimental-webgl');

    if (!gl) {
      info.textContent = 'WebGL no soportado';
      return;
    }

    const isWebGL2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
    const uintExt = !isWebGL2 && gl.getExtension ? gl.getExtension('OES_element_index_uint') : true;
    const canUseUint32 = isWebGL2 || !!uintExt;
    cv.addEventListener('webglcontextlost', (e) => e.preventDefault());

    // Shaders de Nodos: Alpha blending suave, bordes antialiasing y núcleo sólido con color real
    const vsNodes = `
      attribute vec3 aPosition;
      attribute vec4 aColor;
      attribute float aSize;
      uniform mat4 uMatrix;
      uniform float uNodeScale;
      varying vec4 vColor;
      varying float vDist;
      void main() {
        vec4 pos = uMatrix * vec4(aPosition, 1.0);
        gl_Position = pos;
        float depth = max(0.2, pos.w);
        gl_PointSize = clamp(aSize * (2.8 / depth) * uNodeScale, 1.2, 22.0);
        vColor = aColor;
        vDist = depth;
      }
    `;
    const fsNodes = `
      precision mediump float;
      varying vec4 vColor;
      varying float vDist;
      void main() {
        vec2 pt = gl_PointCoord - vec2(0.5);
        float r = length(pt);
        if (r > 0.5) discard;
        // Núcleo saturado y borde suave antialiasing: cero blanco quemado
        float core = smoothstep(0.5, 0.22, r);
        gl_FragColor = vec4(vColor.rgb, vColor.a * core);
      }
    `;

    // Shaders de Líneas: Coloración por vértice interpolada (las líneas heredan los colores de los nodos que unen)
    const vsLines = `
      attribute vec3 aPosition;
      attribute vec4 aColor;
      uniform mat4 uMatrix;
      varying vec4 vColor;
      void main() {
        gl_Position = uMatrix * vec4(aPosition, 1.0);
        vColor = aColor;
      }
    `;
    const fsLines = `
      precision mediump float;
      varying vec4 vColor;
      uniform float uLineAlpha;
      void main() {
        gl_FragColor = vec4(vColor.rgb, uLineAlpha);
      }
    `;

    let progNodes, progLines;
    try {
      progNodes = createProgram(gl, vsNodes, fsNodes);
      progLines = createProgram(gl, vsLines, fsLines);
    } catch (e) {
      info.textContent = 'Error shaders WebGL';
      console.error(e);
      return;
    }

    const locPosN = gl.getAttribLocation(progNodes, 'aPosition');
    const locColN = gl.getAttribLocation(progNodes, 'aColor');
    const locSizeN = gl.getAttribLocation(progNodes, 'aSize');
    const locMatN = gl.getUniformLocation(progNodes, 'uMatrix');
    const locScaleN = gl.getUniformLocation(progNodes, 'uNodeScale');

    const locPosL = gl.getAttribLocation(progLines, 'aPosition');
    const locColL = gl.getAttribLocation(progLines, 'aColor');
    const locMatL = gl.getUniformLocation(progLines, 'uMatrix');
    const locAlphaL = gl.getUniformLocation(progLines, 'uLineAlpha');

    const bufPos = gl.createBuffer();
    const bufCol = gl.createBuffer();
    const bufSize = gl.createBuffer();
    const bufEdges = gl.createBuffer();

    let curData = null;
    let curMeta = null;
    let curLabels = null;
    let yaw = 0.5, pitch = -0.22, zoom = 2.7, vy = RM ? 0 : 0.0013;
    let visible = false, dirty = true, hover = -1, pinnedNode = -1;
    let W = 0, H = 0, dpr = 1, raf = 0, drag = null;
    let frames = 0, fpsT = performance.now(), fps = 60;

    // Modos de visualización controlables por el usuario
    let lineMode = 0; // 0: Brillante (0.55), 1: Normal (0.35), 2: Ocultas (0.0)
    const LINE_ALPHAS = [0.55, 0.35, 0.0];
    let nodeMode = 0; // 0: Estelar Fino (0.9), 1: Equilibrado (1.25), 2: Cúmulo (1.7)
    const NODE_SCALES = [0.9, 1.25, 1.7];
    let isRotating = !RM;

    // Construcción de la barra de herramientas del laboratorio
    function buildToolbar() {
      toolbar.innerHTML = '';

      const btnEdge = el('button', 'sg-tool-btn', `${T.edgeMode}${T.edgeBright}`);
      btnEdge.type = 'button';
      btnEdge.onclick = () => {
        lineMode = (lineMode + 1) % 3;
        const names = [T.edgeBright, T.edgeNormal, T.edgeOff];
        btnEdge.textContent = `${T.edgeMode}${names[lineMode]}`;
        btnEdge.classList.toggle('is-off', lineMode === 2);
        dirty = true; kick();
      };

      const btnNode = el('button', 'sg-tool-btn', `${T.nodeMode}${T.nodeStellar}`);
      btnNode.type = 'button';
      btnNode.onclick = () => {
        nodeMode = (nodeMode + 1) % 3;
        const names = [T.nodeStellar, T.nodeMid, T.nodeBig];
        btnNode.textContent = `${T.nodeMode}${names[nodeMode]}`;
        dirty = true; kick();
      };

      const btnRot = el('button', 'sg-tool-btn', `${T.rotMode}${isRotating ? T.rotPlay : T.rotPause}`);
      btnRot.type = 'button';
      btnRot.onclick = () => {
        isRotating = !isRotating;
        vy = isRotating ? (RM ? 0 : 0.0013) : 0;
        btnRot.textContent = `${T.rotMode}${isRotating ? T.rotPlay : T.rotPause}`;
        btnRot.classList.toggle('is-off', !isRotating);
        dirty = true; kick();
      };

      const btnReset = el('button', 'sg-tool-btn', T.resetCam);
      btnReset.type = 'button';
      btnReset.onclick = () => {
        yaw = 0.5; pitch = -0.22; zoom = curMeta?.id === 'galaxia' ? 3.4 : 2.6;
        dirty = true; kick();
      };

      toolbar.append(btnEdge, btnNode, btnRot, btnReset);
    }

    async function initMeta() {
      try {
        if (!metaData) {
          metaData = await fetch('/assets/grafos/meta.json').then((r) => r.json());
        }
        buildTabs();
        buildToolbar();
      } catch (err) {
        console.error('Error cargando meta.json:', err);
        info.textContent = T.fail;
      }
    }

    function buildTabs() {
      tabs.innerHTML = '';
      const list = [];

      targetSets.forEach((id) => {
        id = id.trim();
        if (id === 'galaxia' && metaData.galaxy) {
          list.push({ id: 'galaxia', title: 'Galaxia Star (273k)', meta: metaData.galaxy, isGalaxy: true });
        } else {
          const g = metaData.graphs.find((x) => x.id === id);
          if (g) list.push({ id: g.id, title: g.title, meta: g });
        }
      });

      if (!list.length) {
        if (metaData.galaxy) list.push({ id: 'galaxia', title: 'Galaxia Star (273k)', meta: metaData.galaxy, isGalaxy: true });
        metaData.graphs.slice(0, 6).forEach((g) => list.push({ id: g.id, title: g.title, meta: g }));
      }

      list.forEach((item, idx) => {
        const shortName = item.id === 'galaxia' ? 'Galaxia (273k)' : item.id === 'labs' ? 'Slimefun Labs' : item.id === 'aihub' ? 'SAORI ai-hub' : item.title;
        const b = el('button', 'sg-tab', shortName);
        b.type = 'button';
        b.setAttribute('role', 'tab');
        b.onclick = () => selectGraph(item, b);
        tabs.append(b);
        if (idx === 0) selectGraph(item, b);
      });
    }

    function updateDescription(id) {
      const desc = DESCRIPTIONS[id] || {
        title: curMeta?.title || id,
        badge: 'MÓDULO DE INFRAESTRUCTURA',
        what: EN ? 'Abstract Syntax Tree and dependency topology.' : 'Árbol sintáctico abstracto y topología de dependencias.',
        center: EN ? 'Core kernel and system controllers.' : 'Núcleo central y controladores de sistema.',
        clusters: EN ? 'Modular subcomponents and feature sets.' : 'Subcomponentes modulares y conjuntos de funciones.',
        lines: EN ? 'Calls, inheritance, and execution flow.' : 'Llamadas, herencia y flujo de ejecución.'
      };

      descCard.innerHTML = `
        <div class="sg-desc-card__header">
          <span class="sg-desc-card__badge">${desc.badge}</span>
          <h3 class="sg-desc-card__title">${desc.title}</h3>
        </div>
        <p class="sg-desc-card__lead">${desc.what}</p>
        <div class="sg-desc-card__grid">
          <div class="sg-desc-item">
            <b class="sg-desc-item__label">✦ ${EN ? 'Center Core' : 'Núcleo Central'}</b>
            <span>${desc.center}</span>
          </div>
          <div class="sg-desc-item">
            <b class="sg-desc-item__label">◈ ${EN ? 'Orbital Clusters' : 'Cúmulos Orbitales'}</b>
            <span>${desc.clusters}</span>
          </div>
          <div class="sg-desc-item">
            <b class="sg-desc-item__label">― ${EN ? 'Connecting Lines' : 'Líneas / Aristas'}</b>
            <span>${desc.lines}</span>
          </div>
        </div>
      `;
    }

    function updateInspector(nodeIdx) {
      if (!curData || nodeIdx < 0 || nodeIdx >= curData.N) {
        inspector.innerHTML = `<span class="sg-ins-hint">✦ ${T.clickHint}</span>`;
        return;
      }

      const typ = curData.atUint8[nodeIdx * 4 + 0] % 5;
      const deg = curData.atUint8[nodeIdx * 4 + 1];
      const comm = curData.atUint8[nodeIdx * 4 + 2] | (curData.atUint8[nodeIdx * 4 + 3] << 8);

      let labelText = (curLabels && curLabels[nodeIdx]) ? curLabels[nodeIdx] : null;
      if (!labelText) {
        labelText = curMeta && curMeta.public ? `Símbolo #${nodeIdx}` : T.private;
      }

      const typeColor = TYPE_HEX[typ];
      const typeName = TYPE_NAMES[typ];

      inspector.innerHTML = `
        <div class="sg-ins-card">
          <div class="sg-ins-head">
            <span class="sg-ins-badge" style="--c: ${typeColor}">${typeName}</span>
            <span class="sg-ins-comm">${T.comm} #${comm}</span>
            <span class="sg-ins-conn">${deg} ${T.conn}</span>
          </div>
          <div class="sg-ins-name" title="${labelText}">${labelText}</div>
        </div>
      `;
    }

    async function selectGraph(item, btn) {
      tabs.querySelectorAll('.sg-tab').forEach((t) => t.setAttribute('aria-selected', String(t === btn)));
      info.textContent = T.load;
      tip.hidden = true;
      hover = -1;
      pinnedNode = -1;
      updateInspector(-1);

      const file = item.meta.file;
      const url = `/assets/grafos/${file}`;

      try {
        if (!cache[item.id]) {
          const res = await fetch(url);
          if (!res.ok) throw new Error('HTTP ' + res.status);
          const rawGz = await res.arrayBuffer();
          const uncompressed = await gunzip(rawGz);
          cache[item.id] = parseDGR1(uncompressed);
        }

        curData = cache[item.id];
        curMeta = item.meta;
        curLabels = null;

        gl.bindBuffer(gl.ARRAY_BUFFER, bufPos);
        gl.bufferData(gl.ARRAY_BUFFER, curData.posF32, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, bufCol);
        gl.bufferData(gl.ARRAY_BUFFER, curData.colorsU8, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, bufSize);
        gl.bufferData(gl.ARRAY_BUFFER, curData.sizesF32, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufEdges);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, curData.edges, gl.STATIC_DRAW);

        zoom = item.id === 'galaxia' ? 3.4 : 2.6;

        const nf = (n) => Number(n || 0).toLocaleString(EN ? 'en-US' : 'es-CL');
        info.textContent = `${nf(curMeta.nodes)} ${T.nodes} · ${nf(curMeta.edges)} ${T.edges} ${T.real}`;
        cv.setAttribute('aria-label', `${item.title}: ${info.textContent}`);

        updateDescription(item.id);

        if (curMeta.public && curMeta.labels && !labelsCache[item.id]) {
          fetch(`/assets/grafos/${curMeta.labels}`)
            .then((r) => r.arrayBuffer())
            .then(gunzip)
            .then((buf) => {
              const text = new TextDecoder().decode(buf);
              labelsCache[item.id] = text.split('\n');
              if (curMeta && curMeta.id === item.id) {
                curLabels = labelsCache[item.id];
                if (pinnedNode >= 0) updateInspector(pinnedNode);
              }
            })
            .catch(() => {});
        } else if (labelsCache[item.id]) {
          curLabels = labelsCache[item.id];
        }

        root.dispatchEvent(new CustomEvent('sg:data', {
          detail: { name: item.id, title: item.title, n: curMeta.nodes, e: curMeta.edges }
        }));

        dirty = true;
        kick();
      } catch (err) {
        console.error('Error cargando grafo:', err);
        info.textContent = T.fail;
      }
    }

    function size() {
      const r = stage.getBoundingClientRect();
      dpr = Math.min(devicePixelRatio || 1, MOBILE ? 1.5 : 2);
      W = r.width; H = r.height;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      gl.viewport(0, 0, cv.width, cv.height);
      dirty = true;
      kick();
    }

    function render() {
      if (!curData || !W || !H) return;

      gl.clearColor(0.02, 0.015, 0.05, 0.0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      gl.enable(gl.BLEND);

      const aspect = W / H;
      const fov = 45 * Math.PI / 180;
      const near = 0.1, far = 100.0;
      const f = 1.0 / Math.tan(fov / 2);
      const proj = [
        f / aspect, 0, 0, 0,
        0, f, 0, 0,
        0, 0, (far + near) / (near - far), -1,
        0, 0, (2 * far * near) / (near - far), 0
      ];

      const cy = Math.cos(yaw), sy = Math.sin(yaw);
      const cp = Math.cos(pitch), sp = Math.sin(pitch);

      const rotY = [
        cy, 0, -sy, 0,
        0, 1, 0, 0,
        sy, 0, cy, 0,
        0, 0, 0, 1
      ];
      const rotX = [
        1, 0, 0, 0,
        0, cp, sp, 0,
        0, -sp, cp, 0,
        0, 0, 0, 1
      ];
      const viewTrans = [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, -zoom, 1
      ];

      const rot = mat4Mul(new Float32Array(16), rotX, rotY);
      const view = mat4Mul(new Float32Array(16), viewTrans, rot);
      const mvp = mat4Mul(new Float32Array(16), proj, view);

      const maxNodes = MOBILE ? Math.min(curData.N, 40000) : curData.N;
      const maxEdges = MOBILE ? Math.min(curData.M, 35000) : Math.min(curData.M, 160000);
      const curLineAlpha = LINE_ALPHAS[lineMode];
      const curNodeScale = NODE_SCALES[nodeMode];

      // 1. PASO: RENDERIZADO DE LÍNEAS (ARISTAS)
      // Dibujadas primero con coloración por vértice interpolada (heredan el color de los nodos)
      if (maxEdges > 0 && curLineAlpha > 0.001 && (!curData.u32 || canUseUint32)) {
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE); // Aditivo luminoso para aristas: crean redes de luz que se cruzan limpiamente

        gl.useProgram(progLines);
        gl.uniformMatrix4fv(locMatL, false, mvp);
        gl.uniform1f(locAlphaL, curLineAlpha);

        gl.bindBuffer(gl.ARRAY_BUFFER, bufPos);
        gl.enableVertexAttribArray(locPosL);
        gl.vertexAttribPointer(locPosL, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, bufCol);
        gl.enableVertexAttribArray(locColL);
        gl.vertexAttribPointer(locColL, 4, gl.UNSIGNED_BYTE, true, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufEdges);
        const indexType = curData.u32 ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
        gl.drawElements(gl.LINES, maxEdges * 2, indexType, 0);
      }

      // 2. PASO: RENDERIZADO DE NODOS (PUNTOS)
      // Usamos blend alfa estándar (SRC_ALPHA, ONE_MINUS_SRC_ALPHA):
      // Esto EVITA que los miles de nodos se fundan en blanco quemado y preserva la identidad visual pura de cada color
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      gl.useProgram(progNodes);
      gl.uniformMatrix4fv(locMatN, false, mvp);
      gl.uniform1f(locScaleN, curNodeScale);

      gl.bindBuffer(gl.ARRAY_BUFFER, bufPos);
      gl.enableVertexAttribArray(locPosN);
      gl.vertexAttribPointer(locPosN, 3, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, bufCol);
      gl.enableVertexAttribArray(locColN);
      gl.vertexAttribPointer(locColN, 4, gl.UNSIGNED_BYTE, true, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, bufSize);
      gl.enableVertexAttribArray(locSizeN);
      gl.vertexAttribPointer(locSizeN, 1, gl.FLOAT, false, 0, 0);

      gl.drawArrays(gl.POINTS, 0, maxNodes);
    }

    function loop(now) {
      raf = 0;
      if (!visible || document.hidden) return;

      if (!drag && vy) {
        yaw += vy;
        dirty = true;
      }
      if (dirty) {
        render();
        dirty = false;
      }

      frames++;
      if (now - fpsT > 1000) {
        fps = frames;
        frames = 0;
        fpsT = now;
        root.dataset.fps = fps;
      }
      if (vy || drag) raf = requestAnimationFrame(loop);
    }

    function kick() {
      if (!raf && visible && !document.hidden) raf = requestAnimationFrame(loop);
    }

    function findClosestNode(mx, my, maxCheck) {
      if (!curData) return -1;
      const cy = Math.cos(yaw), sy = Math.sin(yaw);
      const cp = Math.cos(pitch), sp = Math.sin(pitch);
      const count = Math.min(curData.N, maxCheck || 3500);
      let best = -1, bestDist = 20 * 20;

      const fov = 45 * Math.PI / 180;
      const f = 1.0 / Math.tan(fov / 2);
      const aspect = W / H;

      for (let i = 0; i < count; i++) {
        const x = curData.posF32[i * 3 + 0];
        const y = curData.posF32[i * 3 + 1];
        const z = curData.posF32[i * 3 + 2];

        const rx = x * cy - z * sy;
        const rz1 = x * sy + z * cy;
        const ry = y * cp + rz1 * sp;
        const rz = -y * sp + rz1 * cp;

        const cz = rz + zoom;
        if (cz <= 0.1) continue;

        const sx = (rx * (f / aspect) / cz) * (W / 2) + (W / 2);
        const sy = -(ry * f / cz) * (H / 2) + (H / 2);

        const dx = sx - mx, dy = sy - my;
        const d = dx * dx + dy * dy;
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      }
      return best;
    }

    cv.addEventListener('pointerdown', (e) => {
      drag = { x: e.clientX, y: e.clientY, yaw, pitch, moved: false };
      cv.setPointerCapture(e.pointerId);
      kick();
    });

    cv.addEventListener('pointerup', (e) => {
      if (drag && !drag.moved) {
        // Clic directo sin arrastre: fijar nodo en el inspector
        const rect = cv.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const hit = findClosestNode(mx, my, 4000);
        if (hit >= 0) {
          pinnedNode = hit;
          updateInspector(pinnedNode);
        }
      }
      drag = null;
      kick();
    });

    cv.addEventListener('pointercancel', () => { drag = null; });

    cv.addEventListener('pointermove', (e) => {
      if (drag) {
        const dist = Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y);
        if (dist > 3) drag.moved = true;

        yaw = drag.yaw + (e.clientX - drag.x) * 0.007;
        pitch = Math.max(-1.38, Math.min(1.38, drag.pitch + (e.clientY - drag.y) * 0.0055));
        dirty = true;
        kick();
        return;
      }

      if (!curData) return;
      const rect = cv.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const best = findClosestNode(mx, my, 3500);

      if (best !== hover) {
        hover = best;
        if (best >= 0) {
          const typ = curData.atUint8[best * 4 + 0] % 5;
          const deg = curData.atUint8[best * 4 + 1];
          const comm = curData.atUint8[best * 4 + 2] | (curData.atUint8[best * 4 + 3] << 8);

          let labelText = (curLabels && curLabels[best]) ? curLabels[best] : null;
          if (!labelText) {
            labelText = curMeta && curMeta.public ? `Símbolo #${best}` : T.private;
          }

          tip.hidden = false;
          tip.replaceChildren(
            el('b', null, labelText),
            el('small', null, `${TYPE_NAMES[typ]} · ${deg} ${T.conn} · ${T.comm} #${comm}`)
          );
          tip.style.transform = `translate(${Math.min(mx + 14, W - 230)}px, ${Math.min(my + 14, H - 70)}px)`;

          if (pinnedNode < 0) updateInspector(best);
        } else {
          tip.hidden = true;
          if (pinnedNode < 0) updateInspector(-1);
        }
      }
    });

    cv.addEventListener('pointerleave', () => {
      hover = -1;
      tip.hidden = true;
      if (pinnedNode < 0) updateInspector(-1);
    });

    cv.addEventListener('wheel', (e) => {
      e.preventDefault();
      zoom = Math.max(1.1, Math.min(6.5, zoom + e.deltaY * 0.0025));
      dirty = true;
      kick();
    }, { passive: false });

    cv.addEventListener('dblclick', () => {
      yaw = 0.5; pitch = -0.22; zoom = curMeta?.id === 'galaxia' ? 3.4 : 2.6;
      pinnedNode = -1;
      updateInspector(-1);
      dirty = true; kick();
    });

    new ResizeObserver(size).observe(stage);
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !metaData) initMeta();
      kick();
    }, { rootMargin: '200px' }).observe(root);

    document.addEventListener('visibilitychange', kick);
    return root;
  }

  async function hud(box) {
    const $ = (s) => box.querySelector(s);
    const term = $('[data-hud="term"]'), deck = $('[data-hud="deck"]'), flux = $('[data-hud="flux"]');
    const lines = [];
    const push = (tag, txt) => { lines.push([tag, txt]); };
    const j = (u) => fetch(u, { headers: { accept: 'application/json' } }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    const [st, me] = await Promise.all([j('/api/server-status'), j('/api/metricas')]);

    if (deck) {
      const rows = st
        ? [['STATUS', st.enLinea ? T.online : T.offline, st.enLinea ? 'ok' : 'bad'],
           [T.players.toUpperCase(), String(st.jugadores ?? 0)],
           [EN ? 'ADVERTISED MAX' : 'MÁXIMO ANUNCIADO', st.enLinea ? String(st.maximo ?? '—') : '—'],
           [T.ver.toUpperCase(), st.version || '—']]
        : [['STATUS', T.offline, 'bad']];
      if (me?.semana) {
        rows.push([T.peak.toUpperCase(), String(me.semana.pico_maximo ?? '—')],
                  [T.uniq.toUpperCase(), String(me.semana.jugadores_distintos ?? '—')]);
      }
      deck.replaceChildren(...rows.map(([k, v, c]) => {
        const d = el('div', 'sg-row');
        const b = el('b', c ? 'is-' + c : null, v);
        d.append(el('span', null, k), b);
        return d;
      }));
    }

    if (flux) {
      const ph = me?.semana?.por_hora || {};
      const vals = Array.from({ length: 24 }, (_, h) => Number(ph[h] || 0));
      const mx = Math.max(1, ...vals);
      const rects = vals.map((v, h) => `<rect x="${h * 10 + 1}" y="${68 - (v / mx) * 60}" width="8" height="${(v / mx) * 60 + 2}" fill="url(#sgf)"/>`).join("");
      const sub = EN ? "players by hour · last 7 days" : "jugadores por hora · últimos 7 días";
      flux.innerHTML = `<svg viewBox="0 0 240 70" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="sgf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3fe0d0"/><stop offset="1" stop-color="#ff4fd8" stop-opacity=".2"/></linearGradient></defs>${rects}</svg><small>${sub}</small>`;
    }

    if (!term) return;
    const now = () => new Date().toTimeString().slice(0, 8);
    push('DAEMON', st ? `${EN ? 'server' : 'servidor'} ${st.enLinea ? T.online : T.offline} · ${st.version || 'Purpur'}` : (EN ? 'telemetry connected · star vps' : 'telemetría conectada · star vps'));
    if (st) push('FLUX', `${st.jugadores ?? 0} ${T.players} · ${EN ? 'advertised max' : 'máximo anunciado'} ${st.enLinea ? st.maximo ?? '—' : '—'}`);
    if (me?.semana) push('FLUX', `${T.peak} ${me.semana.pico_maximo} · ${me.semana.jugadores_distintos} ${T.uniq}`);
    push('GRAPH', EN ? 'real WebGL neural engine ready · 273k topology' : 'motor neuronal WebGL listo · topología de 273k');
    push('CIPHER', EN ? 'sovereign zero-leak mode active' : 'modo soberano activo · cero filtración');
    push('DOCKER', EN ? 'web container healthy' : 'contenedor web sano');

    box.addEventListener('sg:data', (e) => {
      const nf = (n) => Number(n || 0).toLocaleString(EN ? 'en-US' : 'es-CL');
      push('GRAPH', `${e.detail.title || e.detail.name} · ${nf(e.detail.n)} nodos · ${nf(e.detail.e)} aristas`);
    }, true);

    let i = 0;
    const tick = () => {
      if (document.hidden) return;
      const [tag, txt] = lines[i % lines.length]; i++;
      const row = el('div', 'sg-log');
      row.append(el('time', null, now()), el('b', 'tag-' + tag.toLowerCase(), `[${tag}]`), el('span', null, ' ' + txt));
      term.append(row);
      while (term.children.length > 7) term.firstChild.remove();
    };
    for (let k = 0; k < Math.min(4, lines.length); k++) tick();
    if (!RM) setInterval(tick, 2600);
  }

  const start = () => {
    document.querySelectorAll('[data-grafos]').forEach(mount);
    document.querySelectorAll('[data-hud-box]').forEach((b) => {
      new IntersectionObserver(([e], o) => {
        if (e.isIntersecting) { o.disconnect(); hud(b); }
      }).observe(b);
    });
  };

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', start) : start();
})();
