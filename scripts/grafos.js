/* SAORI · Laboratorio de grafos masivos (WebGL nativo de alto rendimiento).
   Datos: /assets/grafos/<id>.bin.gz (DGR1 binario comprimido con gzip) y meta.json.
   Soporta hasta 273.484 nodos y 960.254 aristas reales sin librerías externas.
   HUD: /api/server-status y /api/metricas (públicos). */
(() => {
  'use strict';
  const EN = (document.documentElement.lang || '').startsWith('en');
  const L = EN ? 1 : 0;
  const T = EN
    ? { nodes: 'nodes', edges: 'edges', real: 'real', drag: 'Drag to rotate · Scroll to zoom',
        online: 'ONLINE', offline: 'NO SIGNAL', players: 'players', peak: 'weekly peak',
        uniq: 'unique players', ver: 'version', fps: 'fps', load: 'Loading neural topology…',
        fail: 'Graph unavailable', conn: 'connections', comm: 'Cluster', private: 'Private sovereign node' }
    : { nodes: 'nodos', edges: 'aristas', real: 'reales', drag: 'Arrastra para girar · Rueda para zoom',
        online: 'EN LÍNEA', offline: 'SIN SEÑAL', players: 'jugadores', peak: 'pico semanal',
        uniq: 'jugadores distintos', ver: 'versión', fps: 'fps', load: 'Cargando topología neuronal…',
        fail: 'Grafo no disponible', conn: 'conexiones', comm: 'Cúmulo', private: 'Nodo soberano privado' };

  const TYPE_NAMES = EN
    ? ['File', 'Class', 'Function', 'Document', 'Symbol']
    : ['Archivo', 'Clase', 'Función', 'Documento', 'Símbolo'];

  const TYPE_COLORS = [
    [0.42, 0.71, 1.00, 0.85],
    [1.00, 0.88, 0.58, 0.95],
    [1.00, 0.31, 0.85, 0.90],
    [0.72, 0.61, 1.00, 0.85],
    [0.25, 0.88, 0.82, 0.90]
  ];
  const TYPE_HEX = ['#6cb6ff', '#ffe9a8', '#ff4fd8', '#b89cff', '#3fe0d0'];

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
    for (let i = 0; i < N * 3; i++) {
      posF32[i] = posInt16[i] / 32000.0;
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

      sizesF32[i] = Math.max(2.5, Math.min(22.0, Math.sqrt(deg) * 2.2 + 3.0));
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
    const stage = el('div', 'sg-stage');
    const cv = el('canvas', 'sg-canvas'); cv.setAttribute('role', 'img');
    const tip = el('div', 'sg-tip'); tip.hidden = true;
    const legend = el('div', 'sg-legend');
    const info = el('div', 'sg-info', T.load);
    const hint = el('div', 'sg-hint', T.drag);
    stage.append(cv, tip, legend, info, hint);
    root.append(tabs, stage);

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

    const vsNodes = `
      attribute vec3 aPosition;
      attribute vec4 aColor;
      attribute float aSize;
      uniform mat4 uMatrix;
      varying vec4 vColor;
      varying float vDist;
      void main() {
        vec4 pos = uMatrix * vec4(aPosition, 1.0);
        gl_Position = pos;
        float depth = max(0.2, pos.w);
        gl_PointSize = clamp(aSize * (3.4 / depth), 1.5, 36.0);
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
        float alpha = smoothstep(0.5, 0.04, r);
        gl_FragColor = vec4(vColor.rgb, vColor.a * alpha);
      }
    `;

    const vsLines = `
      attribute vec3 aPosition;
      uniform mat4 uMatrix;
      void main() {
        gl_Position = uMatrix * vec4(aPosition, 1.0);
      }
    `;
    const fsLines = `
      precision mediump float;
      uniform vec4 uLineColor;
      void main() {
        gl_FragColor = uLineColor;
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

    const locPosL = gl.getAttribLocation(progLines, 'aPosition');
    const locMatL = gl.getUniformLocation(progLines, 'uMatrix');
    const locColL = gl.getUniformLocation(progLines, 'uLineColor');

    const bufPos = gl.createBuffer();
    const bufCol = gl.createBuffer();
    const bufSize = gl.createBuffer();
    const bufEdges = gl.createBuffer();

    let curData = null;
    let curMeta = null;
    let curLabels = null;
    let yaw = 0.5, pitch = -0.22, zoom = 2.7, vy = RM ? 0 : 0.0013;
    let visible = false, dirty = true, hover = -1;
    let W = 0, H = 0, dpr = 1, raf = 0, drag = null;
    let frames = 0, fpsT = performance.now(), fps = 60;

    async function initMeta() {
      try {
        if (!metaData) {
          metaData = await fetch('/assets/grafos/meta.json').then((r) => r.json());
        }
        buildTabs();
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

    async function selectGraph(item, btn) {
      tabs.querySelectorAll('.sg-tab').forEach((t) => t.setAttribute('aria-selected', String(t === btn)));
      info.textContent = T.load;
      tip.hidden = true;
      hover = -1;

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

        if (curMeta.public && curMeta.labels && !labelsCache[item.id]) {
          fetch(`/assets/grafos/${curMeta.labels}`)
            .then((r) => r.arrayBuffer())
            .then(gunzip)
            .then((buf) => {
              const text = new TextDecoder().decode(buf);
              labelsCache[item.id] = text.split('\n');
              if (curMeta && curMeta.id === item.id) curLabels = labelsCache[item.id];
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
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

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

      if (maxEdges > 0 && (!curData.u32 || canUseUint32)) {
        gl.useProgram(progLines);
        gl.uniformMatrix4fv(locMatL, false, mvp);
        gl.uniform4f(locColL, 0.42, 0.58, 0.95, MOBILE ? 0.14 : 0.18);

        gl.bindBuffer(gl.ARRAY_BUFFER, bufPos);
        gl.enableVertexAttribArray(locPosL);
        gl.vertexAttribPointer(locPosL, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufEdges);
        const indexType = curData.u32 ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
        gl.drawElements(gl.LINES, maxEdges * 2, indexType, 0);
      }

      gl.useProgram(progNodes);
      gl.uniformMatrix4fv(locMatN, false, mvp);

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

    cv.addEventListener('pointerdown', (e) => {
      drag = { x: e.clientX, y: e.clientY, yaw, pitch };
      cv.setPointerCapture(e.pointerId);
      kick();
    });
    cv.addEventListener('pointerup', () => { drag = null; kick(); });
    cv.addEventListener('pointercancel', () => { drag = null; });

    cv.addEventListener('pointermove', (e) => {
      if (drag) {
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

      const cy = Math.cos(yaw), sy = Math.sin(yaw);
      const cp = Math.cos(pitch), sp = Math.sin(pitch);
      const checkCount = Math.min(curData.N, 600);
      let best = -1, bestDist = 18 * 18;

      for (let i = 0; i < checkCount; i++) {
        const x = curData.posF32[i * 3 + 0];
        const y = curData.posF32[i * 3 + 1];
        const z = curData.posF32[i * 3 + 2];

        const rx = x * cy - z * sy;
        const rz1 = x * sy + z * cy;
        const ry = y * cp + rz1 * sp;
        const rz = -y * sp + rz1 * cp;

        const cz = rz + zoom;
        if (cz <= 0.1) continue;

        const fov = 45 * Math.PI / 180;
        const f = 1.0 / Math.tan(fov / 2);
        const aspect = W / H;

        const sx = (rx * (f / aspect) / cz) * (W / 2) + (W / 2);
        const sy = -(ry * f / cz) * (H / 2) + (H / 2);

        const dx = sx - mx, dy = sy - my;
        const d = dx * dx + dy * dy;
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      }

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
        } else {
          tip.hidden = true;
        }
      }
    });

    cv.addEventListener('pointerleave', () => {
      hover = -1;
      tip.hidden = true;
    });

    cv.addEventListener('wheel', (e) => {
      e.preventDefault();
      zoom = Math.max(1.1, Math.min(6.5, zoom + e.deltaY * 0.0025));
      dirty = true;
      kick();
    }, { passive: false });

    cv.addEventListener('dblclick', () => {
      yaw = 0.5; pitch = -0.22; zoom = curMeta?.id === 'galaxia' ? 3.4 : 2.6;
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
           [T.players.toUpperCase(), `${st.jugadores ?? 0} / ${st.maximo ?? '—'}`],
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
    if (st) push('FLUX', `${st.jugadores ?? 0} ${T.players} · ${EN ? 'capacity' : 'capacidad'} ${st.maximo ?? '—'}`);
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
