/* SAORI · Laboratorio de grafos. Canvas 2D con proyección 3D propia, sin librerías.
   Datos: /assets/grafos/<nombre>.json (snapshots públicos generados con tools/gen_grafos.py).
   HUD: /api/server-status y /api/metricas (públicos). Los registros del "terminal" son
   decorativos: se sintetizan a partir de esas métricas, no son logs reales. */
(() => {
  'use strict';
  const EN = (document.documentElement.lang || '').startsWith('en');
  const L = EN ? 1 : 0;
  const T = EN
    ? { sets: { slimefun: 'Slimefun catalogue', plugins: 'Plugin architecture', web: 'Website code', saori: 'SAORI flow' }, nodes: 'nodes', edges: 'edges', drag: 'Drag to rotate', online: 'ONLINE', offline: 'NO SIGNAL', players: 'players', peak: 'weekly peak', uniq: 'unique players', ver: 'version', illus: 'illustrative', fps: 'fps', load: 'Loading graph…', fail: 'Graph unavailable' }
    : { sets: { slimefun: 'Catálogo Slimefun', plugins: 'Arquitectura de plugins', web: 'Código de la web', saori: 'Flujo SAORI' }, nodes: 'nodos', edges: 'aristas', drag: 'Arrastra para girar', online: 'EN LÍNEA', offline: 'SIN SEÑAL', players: 'jugadores', peak: 'pico semanal', uniq: 'jugadores distintos', ver: 'versión', illus: 'ilustrativo', fps: 'fps', load: 'Cargando grafo…', fail: 'Grafo no disponible' };
  const PAL = ['#ffe9a8', '#ff4fd8', '#3fe0d0', '#b89cff', '#ffb35c'];
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MOBILE = innerWidth < 760;
  const cache = {};
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

  // sprite de brillo por color: un drawImage por nodo, barato
  const sprites = PAL.map((c) => {
    const s = document.createElement('canvas'); s.width = s.height = 64;
    const x = s.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, '#fff'); g.addColorStop(0.18, c); g.addColorStop(0.45, c + '55'); g.addColorStop(1, c + '00');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64); return s;
  });

  function rnd(seed) { return () => ((seed = (seed * 16807) % 2147483647) / 2147483647); }

  // árbol radial sobre esfera: la profundidad fija el radio y cada hijo hereda la dirección del padre
  function layout(d) {
    const n = d.n.slice(0, innerWidth < 760 ? 400 : 1500), r = rnd(7), N = n.length;
    const depth = new Array(N).fill(0), kids = new Array(N).fill(0);
    for (let i = 1; i < N; i++) { const p = n[i][3]; if (p >= 0 && p < N) { depth[i] = depth[p] + 1; kids[p]++; } }
    const maxD = Math.max(1, ...depth);
    const dir = new Array(N), pts = new Array(N);
    let k1 = 0; const n1 = depth.filter((x) => x === 1).length || 1;
    for (let i = 0; i < N; i++) {
      const p = n[i][3];
      if (depth[i] === 0) dir[i] = [0, 0, 0];
      else if (depth[i] === 1) { // espiral de Fibonacci
        const y = 1 - (2 * (k1 + 0.5)) / n1, rr = Math.sqrt(1 - y * y), th = k1 * 2.39996; k1++;
        dir[i] = [Math.cos(th) * rr, y, Math.sin(th) * rr];
      } else {
        const b = dir[p], j = 0.55 / depth[i];
        const v = [b[0] + (r() - 0.5) * j, b[1] + (r() - 0.5) * j, b[2] + (r() - 0.5) * j];
        const m = Math.hypot(v[0], v[1], v[2]) || 1; dir[i] = [v[0] / m, v[1] / m, v[2] / m];
      }
      const rad = depth[i] === 0 ? 0 : 0.35 + 0.65 * (depth[i] / maxD) + (r() - 0.5) * 0.06;
      pts[i] = { x: dir[i][0] * rad, y: dir[i][1] * rad, z: dir[i][2] * rad, g: n[i][2] % PAL.length, l: n[i][L] || n[i][0], grp: n[i][2], p: n[i][3] < N ? n[i][3] : -1, s: 2 + Math.min(8, Math.sqrt(kids[i]) * 1.6) + (depth[i] === 0 ? 6 : 0) };
    }
    return { pts, groups: d.g, N };
  }

  function mount(root) {
    const sets = (root.dataset.sets || 'slimefun,plugins,web,saori').split(',');
    const tabs = el('div', 'sg-tabs'); tabs.setAttribute('role', 'tablist');
    const stage = el('div', 'sg-stage');
    const cv = el('canvas', 'sg-canvas'); cv.setAttribute('role', 'img');
    const tip = el('div', 'sg-tip'); tip.hidden = true;
    const legend = el('div', 'sg-legend');
    const info = el('div', 'sg-info', T.load);
    const hint = el('div', 'sg-hint', T.drag);
    stage.append(cv, tip, legend, info, hint);
    root.append(tabs, stage);
    const ctx = cv.getContext('2d');
    let G = null, yaw = 0.6, pitch = -0.25, vy = RM ? 0 : 0.0016, visible = false, dirty = true, hover = -1, proj = [], W = 0, H = 0, dpr = 1, raf = 0, drag = null, frames = 0, fpsT = performance.now(), fps = 0;

    sets.forEach((s, i) => {
      const b = el('button', 'sg-tab', T.sets[s] || s); b.type = 'button'; b.setAttribute('role', 'tab');
      b.onclick = () => select(s, b); tabs.append(b); if (i === 0) b.dataset.first = '1';
    });

    async function select(name, btn) {
      tabs.querySelectorAll('.sg-tab').forEach((t) => t.setAttribute('aria-selected', String(t === btn)));
      info.textContent = T.load;
      try {
        cache[name] = cache[name] || (await fetch(`/assets/grafos/${name}.json`).then((r) => { if (!r.ok) throw 0; return r.json(); }));
        G = layout(cache[name]); G.name = name;
        legend.replaceChildren(...G.groups.map((g, i) => { const s = el('span', null, g[L] || g[0]); s.style.setProperty('--c', PAL[i % PAL.length]); return s; }));
        info.textContent = `${G.N} ${T.nodes} · ${G.N - 1} ${T.edges}${name === 'saori' ? ' · ' + T.illus : ''}`;
        cv.setAttribute('aria-label', `${T.sets[name]}: ${info.textContent}`);
        root.dispatchEvent(new CustomEvent('sg:data', { detail: { name, n: G.N } }));
        dirty = true; kick();
      } catch { info.textContent = T.fail; }
    }

    function size() {
      const r = stage.getBoundingClientRect(); dpr = Math.min(devicePixelRatio || 1, MOBILE ? 1.5 : 2);
      W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; dirty = true; kick();
    }

    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      const cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.42, f = 2.6;
      // rejilla en perspectiva y órbitas
      ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(63,224,208,.10)'; ctx.beginPath();
      for (let i = -8; i <= 8; i++) { ctx.moveTo(cx + i * W * 0.02, H * 0.62); ctx.lineTo(cx + i * W * 0.12, H); }
      for (let j = 0; j < 6; j++) { const y = H * 0.62 + (H * 0.38) * Math.pow(j / 5, 1.7); ctx.moveTo(0, y); ctx.lineTo(W, y); }
      ctx.stroke();
      ctx.strokeStyle = 'rgba(228,187,104,.18)'; ctx.beginPath(); ctx.ellipse(cx, cy, R * 1.12, R * 0.3, -0.25, 0, 7); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,79,216,.14)'; ctx.beginPath(); ctx.ellipse(cx, cy, R * 1.02, R * 0.42, 0.5, 0, 7); ctx.stroke();
      if (!G) return;
      const cY = Math.cos(yaw), sY = Math.sin(yaw), cP = Math.cos(pitch), sP = Math.sin(pitch);
      proj = G.pts.map((p) => {
        const x = p.x * cY - p.z * sY, z1 = p.x * sY + p.z * cY, y = p.y * cP - z1 * sP, z = p.y * sP + z1 * cP;
        const k = f / (f + z); return { x: cx + x * R * k, y: cy + y * R * k, z, k };
      });
      // aristas en tres cubos de profundidad: tres trazos por fotograma
      const nb = hover >= 0 ? new Set([hover, G.pts[hover].p, ...G.pts.flatMap((p, i) => (p.p === hover ? [i] : []))]) : null;
      for (const [lo, hi, a] of [[0.35, 9, 0.10], [-0.35, 0.35, 0.18], [-9, -0.35, 0.3]]) {
        ctx.beginPath(); ctx.strokeStyle = `rgba(190,170,255,${nb ? a * 0.4 : a})`;
        for (let i = 1; i < G.N; i++) { const p = G.pts[i].p; if (p < 0) continue; const A = proj[i], B = proj[p]; const z = (A.z + B.z) / 2; if (z < lo || z >= hi) continue; ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); }
        ctx.stroke();
      }
      if (nb) { ctx.beginPath(); ctx.strokeStyle = 'rgba(63,224,208,.9)'; ctx.lineWidth = 1.4; for (const i of nb) { const p = G.pts[i]?.p; if (i > 0 && p >= 0 && (nb.has(p))) { ctx.moveTo(proj[i].x, proj[i].y); ctx.lineTo(proj[p].x, proj[p].y); } } ctx.stroke(); }
      const order = proj.map((_, i) => i).sort((a, b) => proj[b].z - proj[a].z);
      ctx.globalCompositeOperation = 'lighter';
      for (const i of order) {
        const q = proj[i], p = G.pts[i], s = p.s * q.k * (i === hover ? 2.4 : 1) * 3.2;
        ctx.globalAlpha = Math.max(0.25, Math.min(1, 0.9 - q.z * 0.5)) * (nb && !nb.has(i) ? 0.35 : 1);
        ctx.drawImage(sprites[p.g], q.x - s / 2, q.y - s / 2, s, s);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }

    function loop(t) {
      raf = 0; if (!visible || document.hidden) return;
      if (!drag && vy) { yaw += vy; dirty = true; }
      if (dirty) { draw(); dirty = false; }
      frames++; if (t - fpsT > 1000) { fps = frames; frames = 0; fpsT = t; root.dataset.fps = fps; }
      if (vy || drag) raf = requestAnimationFrame(loop);
    }
    function kick() { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(loop); }

    cv.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, yaw, pitch }; cv.setPointerCapture(e.pointerId); kick(); });
    cv.addEventListener('pointerup', () => { drag = null; kick(); });
    cv.addEventListener('pointercancel', () => { drag = null; });
    cv.addEventListener('pointermove', (e) => {
      const r = cv.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
      if (drag) { yaw = drag.yaw + (e.clientX - drag.x) * 0.008; pitch = Math.max(-1.3, Math.min(1.3, drag.pitch + (e.clientY - drag.y) * 0.006)); dirty = true; kick(); return; }
      if (!G || !proj.length) return;
      let best = -1, bd = 144;
      for (let i = 0; i < proj.length; i++) { const dx = proj[i].x - mx, dy = proj[i].y - my, d = dx * dx + dy * dy; if (d < bd && proj[i].z < 0.6) { bd = d; best = i; } }
      if (best !== hover) { hover = best; dirty = true; if (RM) draw(); }
      if (best >= 0) {
        const p = G.pts[best]; tip.hidden = false; tip.replaceChildren(el('b', null, p.l), el('small', null, (G.groups[p.grp] || [])[L] || ''));
        tip.style.transform = `translate(${Math.min(mx + 14, W - 220)}px, ${my + 12}px)`;
      } else tip.hidden = true;
    });
    cv.addEventListener('pointerleave', () => { hover = -1; tip.hidden = true; dirty = true; kick(); if (RM) draw(); });

    new ResizeObserver(size).observe(stage);
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !G && !root.dataset.started) { root.dataset.started = '1'; select(sets[0], tabs.firstChild); }
      kick();
    }, { rootMargin: '200px' }).observe(root);
    document.addEventListener('visibilitychange', kick);
    // con movimiento reducido no hay bucle: se pinta solo al cambiar
    if (RM) root.addEventListener('sg:data', () => requestAnimationFrame(draw));
    return root;
  }

  // ---------- HUD: telemetría pública ----------
  async function hud(box) {
    const $ = (s) => box.querySelector(s);
    const term = $('[data-hud="term"]'), deck = $('[data-hud="deck"]'), flux = $('[data-hud="flux"]');
    const lines = [];
    const push = (tag, txt) => { lines.push([tag, txt]); };
    const j = (u) => fetch(u, { headers: { accept: 'application/json' } }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    const [st, me] = await Promise.all([j('/api/server-status'), j('/api/metricas')]);
    if (deck) {
      const rows = st
        ? [['STATUS', st.enLinea ? T.online : T.offline, st.enLinea ? 'ok' : 'bad'], [T.players.toUpperCase(), `${st.jugadores ?? 0} / ${st.maximo ?? '—'}`], [T.ver.toUpperCase(), st.version || '—']]
        : [['STATUS', T.offline, 'bad']];
      if (me?.semana) rows.push([T.peak.toUpperCase(), String(me.semana.pico_maximo ?? '—')], [T.uniq.toUpperCase(), String(me.semana.jugadores_distintos ?? '—')]);
      deck.replaceChildren(...rows.map(([k, v, c]) => { const d = el('div', 'sg-row'); const b = el('b', c ? 'is-' + c : null, v); d.append(el('span', null, k), b); return d; }));
    }
    if (flux) {
      const ph = me?.semana?.por_hora || {};
      const vals = Array.from({ length: 24 }, (_, h) => Number(ph[h] || 0)); const mx = Math.max(1, ...vals);
      flux.innerHTML = `<svg viewBox="0 0 240 70" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="sgf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3fe0d0"/><stop offset="1" stop-color="#ff4fd8" stop-opacity=".2"/></linearGradient></defs>${vals.map((v, h) => `<rect x="${h * 10 + 1}" y="${68 - (v / mx) * 60}" width="8" height="${(v / mx) * 60 + 2}" fill="url(#sgf)"/>`).join('')}</svg><small>${EN ? 'players by hour · last 7 days' : 'jugadores por hora · últimos 7 días'}</small>`;
    }
    if (!term) return;
    const now = () => new Date().toTimeString().slice(0, 8);
    push('DAEMON', st ? `${EN ? 'server' : 'servidor'} ${st.enLinea ? T.online : T.offline} · ${st.version || 'Purpur'}` : (EN ? 'public telemetry unavailable · offline mode' : 'telemetría pública no disponible · modo offline'));
    if (st) push('FLUX', `${st.jugadores ?? 0} ${T.players} · ${EN ? 'capacity' : 'capacidad'} ${st.maximo ?? '—'}`);
    if (me?.semana) push('FLUX', `${T.peak} ${me.semana.pico_maximo} · ${me.semana.jugadores_distintos} ${T.uniq}`);
    if (me?.semana?.franja_habitual) push('RADAR', (EN ? 'busiest window ' : 'franja habitual ') + me.semana.franja_habitual.replace(/^entre /, ''));
    push('GRAPH', EN ? 'neural sphere ready · drag to rotate' : 'esfera neuronal lista · arrastra para girar');
    push('CIPHER', EN ? 'public channel · read-only snapshot' : 'canal público · snapshot de solo lectura');
    push('DOCKER', EN ? 'web container healthy' : 'contenedor web sano');
    box.addEventListener('sg:data', (e) => push('GRAPH', `${T.sets[e.detail.name]} · ${e.detail.n} ${T.nodes}`), true);
    let i = 0;
    const tick = () => {
      if (document.hidden) return;
      const [tag, txt] = lines[i % lines.length]; i++;
      const row = el('div', 'sg-log'); row.append(el('time', null, now()), el('b', 'tag-' + tag.toLowerCase(), `[${tag}]`), el('span', null, ' ' + txt));
      term.append(row); while (term.children.length > 7) term.firstChild.remove();
    };
    for (let k = 0; k < Math.min(4, lines.length); k++) tick();
    if (!RM) setInterval(tick, 2600);
  }

  const start = () => {
    document.querySelectorAll('[data-grafos]').forEach(mount);
    document.querySelectorAll('[data-hud-box]').forEach((b) => {
      new IntersectionObserver(([e], o) => { if (e.isIntersecting) { o.disconnect(); hud(b); } }).observe(b);
    });
  };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', start) : start();
})();
