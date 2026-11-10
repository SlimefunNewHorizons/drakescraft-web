/* Hero de la portada: mini sistema solar alrededor del emblema.
 * Canvas 2D con proyeccion 3D propia, sprites precalculados y pausa fuera de pantalla. */
(() => {
  "use strict";
  const stage = document.querySelector(".op-stage");
  const cv = stage && stage.querySelector("[data-emblem]");
  const logo = stage && stage.querySelector(".op-stage__logo");
  if (!cv || !cv.getContext) return;
  const ctx = cv.getContext("2d");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const small = matchMedia("(max-width: 760px), (pointer: coarse)").matches;
  const TAU = Math.PI * 2, { sin, cos, min, max, sqrt, atan2, random: rnd } = Math;
  const D = 4.4, SUN = 0.29;
  let W = 0, H = 0, R = 0, cx = 0, cy = 0, dpr = 1, t = 7.3, last = 0, raf = 0, vis = true;
  let yaw = 0, pitch = 0.44, roll = 0, inX = 0, inY = 0, input = 0, sunSprite = null, greca = null;

  const mk = (s) => { const c = document.createElement("canvas"); c.width = c.height = s; return [c, c.getContext("2d")]; };
  const glow = (col, s = 64) => {
    const [c, g] = mk(s), h = s / 2, r = g.createRadialGradient(h, h, 0, h, h, h);
    r.addColorStop(0, col); r.addColorStop(0.35, col.replace(/[\d.]+\)$/, "0.35)")); r.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = r; g.fillRect(0, 0, s, s); return c;
  };
  // Esfera iluminada desde +x; al dibujar se rota hacia el sol.
  const sphere = (hi, mid, s = 96) => {
    const [c, g] = mk(s), h = s / 2, r = g.createRadialGradient(h * 1.42, h * 0.82, h * 0.04, h * 1.1, h, h * 1.15);
    r.addColorStop(0, "#fff"); r.addColorStop(0.14, hi); r.addColorStop(0.55, mid); r.addColorStop(1, "#06030c");
    g.fillStyle = r; g.beginPath(); g.arc(h, h, h - 1, 0, TAU); g.fill();
    g.globalCompositeOperation = "source-atop"; g.lineWidth = s * 0.03; g.strokeStyle = "rgba(255,255,255,.18)";
    for (let k = 0; k < 3; k++) { g.beginPath(); g.ellipse(h, h + (k - 1) * h * 0.42, h, h * 0.1, 0, 0, TAU); g.stroke(); }
    return c;
  };

  const bodies = [
    { a: 0.44, e: 0.07, i: 0.22, n: 0.3, w: 0.95, r: 0.04, c: ["#ffe9b0", "#c88f2c"], g: "rgba(255,206,120,.9)" },
    { a: 0.55, e: 0.16, i: -0.55, n: 1.2, w: -0.6, r: 0.058, c: ["#e6d6ff", "#7446d4"], g: "rgba(169,138,232,.9)", moon: ["#f4e9ff", "#8a6fd0", 0.09, 2.4] },
    { a: 0.76, e: 0.1, i: 0.16, n: 2.5, w: 0.34, r: 0.07, c: ["#cdf7ff", "#178db5"], g: "rgba(111,227,255,.9)", ring: 1, moon: ["#fff6dc", "#c99c45", 0.12, -1.7] },
    { a: 0.88, e: 0.09, i: -0.3, n: 4.1, w: -0.26, r: 0.052, c: ["#ffd3f1", "#bf2f8c"], g: "rgba(255,95,200,.9)" },
    { a: 0.68, e: 0.83, i: 0.95, n: 0.7, w: 0.42, r: 0.02, c: ["#ffffff", "#9feaff"], g: "rgba(190,240,255,1)", comet: [] },
  ].filter((b, k) => !small || k !== 3);
  const ORB = ["rgba(229,189,114,", "rgba(169,138,232,", "rgba(111,227,255,", "rgba(255,95,200,", "rgba(200,240,255,"];
  bodies.forEach((b, k) => {
    b.th = rnd() * TAU; b.col = ORB[k];
    b.spr = sphere(b.c[0], b.c[1]); b.gl = glow(b.g);
    if (b.moon) { b.mspr = sphere(b.moon[0], b.moon[1], 48); b.mth = rnd() * TAU; }
    b.path = new Float32Array(97 * 3);
    for (let j = 0; j <= 96; j++) b.path.set(place(b, (j / 96) * TAU), j * 3);
  });
  const sunGlow = glow("rgba(255,206,122,.95)", 128), violet = glow("rgba(122,79,214,.7)", 128);

  // Plano orbital -> mundo: inclinacion sobre X y nodo sobre Y.
  function place(b, th) {
    const r = (b.a * (1 - b.e * b.e)) / (1 + b.e * cos(th)), x = r * cos(th) - 0, z = r * sin(th);
    const y = -z * sin(b.i), z1 = z * cos(b.i);
    return [x * cos(b.n) + z1 * sin(b.n), y, -x * sin(b.n) + z1 * cos(b.n)];
  }
  const P = [0, 0, 0, 1];
  function proj(x, y, z) {
    const cy_ = cos(yaw), sy_ = sin(yaw), cp = cos(pitch), sp = sin(pitch);
    const x1 = x * cy_ + z * sy_, z1 = -x * sy_ + z * cy_;
    const y2 = y * cp + z1 * sp, z2 = -y * sp + z1 * cp, s = D / (D + z2);
    P[0] = cx + x1 * s * R; P[1] = cy - y2 * s * R; P[2] = z2; P[3] = s; return P;
  }

  // Cinturon de asteroides y estrellas de fondo.
  const belt = Array.from({ length: small ? 90 : 230 }, () => {
    const a = 0.6 + rnd() * 0.1;
    return { a, th: rnd() * TAU, y: (rnd() - 0.5) * 0.025, w: 0.32 * (0.62 / a) ** 1.5, s: 0.6 + rnd() * 1.2, k: rnd() < 0.5 };
  });
  const stars = Array.from({ length: small ? 36 : 80 }, (_, k) => ({ x: rnd(), y: rnd(), p: rnd() * TAU, f: 0.6 + rnd() * 2, z: rnd() * 0.8 + 0.2, big: k < 6 }));
  const CONS = [
    ["ΔΡΑΚΩΝ", [[0.1, 0.12], [0.22, 0], [0.32, 0.14], [0.2, 0.26], [0.36, 0.42], [0.56, 0.36], [0.7, 0.52], [0.64, 0.72], [0.82, 0.86], [1, 0.8]], [[0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9]]],
    ["ΚΑΣΣΙΟΠΕΙΑ", [[0, 0.35], [0.26, 0.72], [0.5, 0.4], [0.74, 0.78], [1, 0.25]], [[0, 1], [1, 2], [2, 3], [3, 4]]],
    ["ΩΡΙΩΝ", [[0.2, 0.08], [0.8, 0.14], [0.42, 0.5], [0.5, 0.53], [0.58, 0.56], [0.26, 0.95], [0.8, 0.9], [0.5, 0]], [[0, 7], [7, 1], [0, 2], [1, 4], [2, 3], [3, 4], [2, 5], [4, 6]]],
    ["ΛΥΡΑ", [[0.5, 0], [0.36, 0.36], [0.62, 0.36], [0.7, 0.92], [0.44, 0.96]], [[0, 1], [0, 2], [1, 2], [1, 4], [2, 3], [3, 4]]],
    ["ΑΕΤΟΣ", [[0.5, 0.42], [0.44, 0.3], [0.56, 0.54], [0.08, 0.62], [0.92, 0.18], [0.52, 1]], [[1, 0], [0, 2], [0, 3], [0, 4], [0, 5]]],
  ];
  const SLOTS = [[0.03, 0.04], [0.72, 0.03], [0.04, 0.73], [0.73, 0.72]];

  function buildSun() {
    const s = Math.ceil(SUN * R * 2 * dpr), [c, g] = mk(s), h = s / 2;
    g.save(); g.beginPath(); g.arc(h, h, h - 1, 0, TAU); g.clip();
    g.fillStyle = "#1c1030"; g.fillRect(0, 0, s, s);
    if (logo && logo.naturalWidth) g.drawImage(logo, 0, 0, s, s);
    let r = g.createRadialGradient(h * 0.7, h * 0.6, h * 0.1, h, h, h);
    r.addColorStop(0, "rgba(255,240,200,.22)"); r.addColorStop(0.55, "rgba(0,0,0,0)"); r.addColorStop(1, "rgba(10,4,24,.55)");
    g.fillStyle = r; g.fillRect(0, 0, s, s); g.restore();
    g.lineWidth = max(1.5, s * 0.018); g.strokeStyle = "#f1cf86"; g.beginPath(); g.arc(h, h, h - g.lineWidth / 2, 0, TAU); g.stroke();
    sunSprite = c;
  }
  function buildGreca() {
    const p = new Path2D(), rg = 0.95 * R, bw = 0.045 * R, n = Math.round((TAU * rg) / (bw * 1.25)), du = TAU / n;
    const pt = (u, v, m) => { const a = u, rr = rg - bw / 2 + v * bw; p[m](cos(a) * rr, sin(a) * rr); };
    const U = [[0, 0], [0, 1], [0.8, 1], [0.8, 0.28], [0.3, 0.28], [0.3, 0.66], [0.55, 0.66]];
    for (let k = 0; k < n; k++) U.forEach(([u, v], j) => pt(k * du + u * du, v, j ? "lineTo" : "moveTo"));
    p.moveTo(rg - bw / 2, 0); p.arc(0, 0, rg - bw / 2, 0, TAU); p.moveTo(rg + bw * 0.62, 0); p.arc(0, 0, rg + bw * 0.62, 0, TAU);
    greca = p;
  }

  function resize() {
    const w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h) return;
    dpr = min(devicePixelRatio || 1, 2); W = w; H = h; R = min(w, h) / 2; cx = w / 2; cy = h / 2;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    buildSun(); buildGreca(); draw(0);
  }

  const spr = (img, x, y, size, a, rot) => {
    ctx.globalAlpha = a;
    if (rot === undefined) ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
    else { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.drawImage(img, -size / 2, -size / 2, size, size); ctx.restore(); }
  };
  const light = (z) => min(1, max(0.35, 0.78 - z * 0.45));

  function drawBody(b, q) {
    const [x, y, z, s] = q, rad = b.r * s * R, l = light(z), toSun = atan2(cy - y, cx - x);
    ctx.globalCompositeOperation = "lighter"; spr(b.gl, x, y, rad * (b.comet ? 10 : 6), 0.6 * l);
    ctx.globalCompositeOperation = "source-over";
    if (b.ring) ringHalf(b, x, y, rad, l, Math.PI, TAU);
    spr(b.spr, x, y, rad * 2, l, toSun);
    if (b.ring) ringHalf(b, x, y, rad, l, 0, Math.PI);
  }
  function ringHalf(b, x, y, rad, l, a0, a1) {
    ctx.globalAlpha = 0.75 * l; ctx.lineWidth = rad * 0.28;
    const gr = ctx.createLinearGradient(x - rad * 2.2, y, x + rad * 2.2, y);
    gr.addColorStop(0, "rgba(255,230,170,.2)"); gr.addColorStop(0.5, "rgba(255,226,160,.95)"); gr.addColorStop(1, "rgba(160,230,255,.35)");
    ctx.strokeStyle = gr; ctx.beginPath(); ctx.ellipse(x, y, rad * 2.1, rad * 0.62, -0.38 + roll, a0, a1); ctx.stroke();
  }
  function drawComet(b, q) {
    const [x, y, z, s] = q, tr = b.comet, l = light(z);
    ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round";
    for (let k = 1; k < tr.length; k++) {
      ctx.globalAlpha = (1 - k / tr.length) * 0.55 * l; ctx.lineWidth = max(0.6, (1 - k / tr.length) * 3 * s);
      ctx.strokeStyle = "#9feaff"; ctx.beginPath(); ctx.moveTo(tr[k - 1][0], tr[k - 1][1]); ctx.lineTo(tr[k][0], tr[k][1]); ctx.stroke();
    }
    const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy) || 1, len = R * min(0.42, 0.06 / max(0.12, d / R)) * 2.2;
    const ex = x + (dx / d) * len, ey = y + (dy / d) * len, g = ctx.createLinearGradient(x, y, ex, ey);
    g.addColorStop(0, "rgba(220,250,255,.75)"); g.addColorStop(0.35, "rgba(140,215,255,.25)"); g.addColorStop(1, "rgba(120,200,255,0)");
    ctx.globalAlpha = 0.8 * l; ctx.fillStyle = g; ctx.beginPath();
    const nx = -dy / d, ny = dx / d, wd = b.r * s * R * 1.3;
    ctx.moveTo(x + nx * wd, y + ny * wd); ctx.lineTo(ex + nx * wd * 1.8, ey + ny * wd * 1.8); ctx.lineTo(ex - nx * wd * 0.8, ey - ny * wd * 0.8); ctx.lineTo(x - nx * wd, y - ny * wd); ctx.fill();
    ctx.globalCompositeOperation = "source-over"; drawBody(b, q);
  }

  function drawSun() {
    const sr = SUN * R, pulse = 1 + 0.06 * sin(t * 1.6) + 0.03 * sin(t * 3.7);
    ctx.globalCompositeOperation = "lighter";
    spr(violet, cx, cy, sr * 6.5, 0.7);
    spr(sunGlow, cx, cy, sr * 4.2 * pulse, 0.95);
    ctx.save(); ctx.translate(cx, cy);
    for (let k = 0; k < 2; k++) {
      ctx.rotate(k ? -t * 0.11 : t * 0.07);
      for (let j = 0; j < 14; j++) {
        const a = (j / 14) * TAU + k * 0.22, L = sr * (1.45 + 0.35 * sin(t * 1.3 + j * 1.7 + k)) * pulse;
        const g = ctx.createLinearGradient(0, 0, cos(a) * L, sin(a) * L);
        g.addColorStop(0.55, "rgba(255,220,150,.55)"); g.addColorStop(1, "rgba(255,214,140,0)");
        ctx.globalAlpha = k ? 0.5 : 0.8; ctx.fillStyle = g; ctx.beginPath();
        ctx.moveTo(cos(a - 0.05) * sr * 0.9, sin(a - 0.05) * sr * 0.9); ctx.lineTo(cos(a) * L, sin(a) * L); ctx.lineTo(cos(a + 0.05) * sr * 0.9, sin(a + 0.05) * sr * 0.9); ctx.fill();
      }
    }
    ctx.restore();
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 0.5 + 0.3 * sin(t * 1.6);
    ctx.lineWidth = 1; ctx.strokeStyle = "#ffd98a"; ctx.beginPath(); ctx.arc(cx, cy, sr * 1.12 * pulse, 0, TAU); ctx.stroke();
    if (sunSprite) spr(sunSprite, cx, cy, sr * 2, 1);
  }
  function eclipse(x, y, rad) {
    const sr = SUN * R; if (Math.hypot(x - cx, y - cy) > sr + rad * 2) return;
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, sr, 0, TAU); ctx.clip();
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad * 2.4); g.addColorStop(0, "rgba(6,2,14,.55)"); g.addColorStop(1, "rgba(6,2,14,0)");
    ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(x - rad * 3, y - rad * 3, rad * 6, rad * 6); ctx.restore();
  }

  function sky() {
    const ox = -yaw * 14, oy = (pitch - 0.44) * 30;
    for (const s of stars) {
      const tw = 0.5 + 0.5 * sin(t * s.f + s.p), x = s.x * W + ox * s.z, y = s.y * H + oy * s.z;
      ctx.globalAlpha = 0.15 + 0.7 * tw * s.z; ctx.fillStyle = s.big ? "#fff3d6" : "#d9ccff";
      ctx.fillRect(x - 0.7, y - 0.7, 1.4, 1.4);
      if (s.big && tw > 0.82) {
        const L = (tw - 0.82) * 60; ctx.globalAlpha = (tw - 0.82) * 4; ctx.strokeStyle = "#ffe7b0"; ctx.lineWidth = 0.7;
        ctx.beginPath(); ctx.moveTo(x - L, y); ctx.lineTo(x + L, y); ctx.moveTo(x, y - L * 0.7); ctx.lineTo(x, y + L * 0.7); ctx.stroke();
      }
    }
    const per = 10, lanes = small ? 1 : 2;
    for (let k = 0; k < lanes; k++) {
      const tt = reduced ? 4.5 : t + k * per / 2, cyc = Math.floor(tt / per), ph = tt % per;
      const [name, pts, edges] = CONS[(cyc * 2 + k) % CONS.length], slot = SLOTS[(cyc + k * 2) % SLOTS.length];
      const draw = min(1, ph / 2.5), fade = ph < 0.4 ? ph / 0.4 : ph > 7.5 ? max(0, (per - 0.5 - ph) / 2) : 1;
      const bx = slot[0] * W, by = slot[1] * H, bs = 0.24 * min(W, H), X = (p) => bx + p[0] * bs, Y = (p) => by + p[1] * bs;
      ctx.globalAlpha = 0.55 * fade; ctx.strokeStyle = "#e5bd72"; ctx.lineWidth = 0.8; ctx.beginPath();
      edges.forEach(([i, j], e) => {
        const f = min(1, max(0, draw * edges.length - e)); if (!f) return;
        ctx.moveTo(X(pts[i]), Y(pts[i])); ctx.lineTo(X(pts[i]) + (X(pts[j]) - X(pts[i])) * f, Y(pts[i]) + (Y(pts[j]) - Y(pts[i])) * f);
      });
      ctx.stroke(); ctx.fillStyle = "#fff0c8";
      pts.forEach((p) => { ctx.globalAlpha = fade * 0.9; ctx.beginPath(); ctx.arc(X(p), Y(p), 1.6, 0, TAU); ctx.fill(); });
      ctx.globalAlpha = 0.6 * fade * draw; ctx.font = `600 ${max(8, R * 0.032)}px Cinzel, serif`; ctx.fillStyle = "#e5bd72";
      ctx.fillText(name, bx, by + bs * 1.12);
    }
  }

  function orbitPaths(b, front) {
    const p = new Path2D(), arr = b.path; let on = false;
    for (let j = 0; j < 96; j++) {
      const a = proj(arr[j * 3], arr[j * 3 + 1], arr[j * 3 + 2]), x0 = a[0], y0 = a[1], z0 = a[2];
      const c = proj(arr[j * 3 + 3], arr[j * 3 + 4], arr[j * 3 + 5]);
      if ((z0 + c[2] < 0) === front) { if (!on) p.moveTo(x0, y0); p.lineTo(c[0], c[1]); on = true; } else on = false;
    }
    ctx.globalAlpha = 1; ctx.strokeStyle = b.col + (front ? (b.comet ? ".35)" : ".7)") : ".22)"); ctx.lineWidth = front ? 1.4 : 0.9;
    ctx.stroke(p);
  }
  function beltPass(front) {
    for (const k of [0, 1]) {
      ctx.globalAlpha = front ? 0.85 : 0.35; ctx.fillStyle = k ? "#c9b2ff" : "#f1cf86"; ctx.beginPath();
      for (const p of belt) {
        if (p.k !== !!k) continue;
        const x = p.a * cos(p.th), z = p.a * sin(p.th), y = p.y - z * 0.1, q = proj(x, y, z);
        if ((q[2] < 0) !== front) continue;
        const s = p.s * q[3]; ctx.rect(q[0] - s / 2, q[1] - s / 2, s, s);
      }
      ctx.fill();
    }
  }

  function draw(dt) {
    if (!R) return;
    t += dt;
    if (input) { yaw += (inX * 0.42 + t * 0.03 - yaw) * min(1, dt * 4); pitch += (0.44 + inY * 0.16 - pitch) * min(1, dt * 4); }
    else { yaw = t * 0.03 + sin(t * 0.23) * 0.22; pitch = 0.44 + sin(t * 0.17) * 0.07; }
    roll = (input ? inX : sin(t * 0.21)) * 0.06;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    const vg = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R);
    vg.addColorStop(0, "rgba(9,4,20,.62)"); vg.addColorStop(0.7, "rgba(9,4,20,.4)"); vg.addColorStop(1, "rgba(9,4,20,0)");
    ctx.globalAlpha = 1; ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    sky();
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * 0.02); ctx.globalAlpha = 0.45; ctx.strokeStyle = "#e5bd72"; ctx.lineWidth = 1.1; ctx.stroke(greca); ctx.restore();
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(roll); ctx.translate(-cx, -cy);
    const items = [];
    for (const b of bodies) {
      const rr = (b.a * (1 - b.e * b.e)) / (1 + b.e * cos(b.th));
      b.th += dt * b.w * (b.a * b.a * sqrt(1 - b.e * b.e)) / (rr * rr);
      const w = place(b, b.th), q = proj(w[0], w[1], w[2]).slice();
      items.push({ z: q[2], f: () => (b.comet ? drawComet(b, q) : drawBody(b, q)), x: q[0], y: q[1], r: b.r * q[3] * R });
      if (b.comet) { b.comet.unshift([q[0], q[1]]); if (b.comet.length > (small ? 22 : 34)) b.comet.pop(); }
      if (b.moon) {
        b.mth += dt * b.moon[3];
        const m = b.moon[2], mq = proj(w[0] + cos(b.mth) * m, w[1] + sin(b.mth) * m * 0.45, w[2] + sin(b.mth) * m).slice();
        items.push({ z: mq[2], f: () => drawBody({ r: 0.014, spr: b.mspr, gl: b.gl }, mq), x: mq[0], y: mq[1], r: 0.014 * mq[3] * R });
      }
    }
    for (const p of belt) p.th += dt * p.w;
    items.sort((a, b) => b.z - a.z);
    bodies.forEach((b) => orbitPaths(b, false)); beltPass(false);
    let i = 0;
    for (; i < items.length && items[i].z >= 0; i++) items[i].f();
    ctx.restore(); drawSun(); ctx.save(); ctx.translate(cx, cy); ctx.rotate(roll); ctx.translate(-cx, -cy);
    for (let j = i; j < items.length; j++) eclipse(items[j].x, items[j].y, items[j].r);
    bodies.forEach((b) => orbitPaths(b, true)); beltPass(true);
    for (; i < items.length; i++) items[i].f();
    ctx.restore(); ctx.globalAlpha = 1;
  }

  function loop(now) {
    raf = 0; const dt = last ? min(0.05, (now - last) / 1000) : 0; last = now; draw(dt); go();
  }
  function go() { if (!raf && !reduced && vis && !document.hidden) raf = requestAnimationFrame(loop); else if (!vis || document.hidden) last = 0; }

  stage.classList.add("has-orbit");
  addEventListener("pointermove", (e) => { if (e.pointerType === "mouse") { input = 1; inX = (e.clientX / innerWidth - 0.5) * 2; inY = (e.clientY / innerHeight - 0.5) * 2; } }, { passive: true });
  addEventListener("deviceorientation", (e) => {
    if (e.gamma == null) return; input = 1; inX = max(-1, min(1, e.gamma / 30)); inY = max(-1, min(1, (e.beta - 50) / 35));
  }, { passive: true });
  new ResizeObserver(resize).observe(cv);
  new IntersectionObserver((en) => { vis = en[0].isIntersecting; last = 0; go(); }).observe(stage);
  document.addEventListener("visibilitychange", () => { last = 0; go(); });
  if (logo && !logo.complete) logo.addEventListener("load", () => { buildSun(); draw(0); });
  if (document.fonts) document.fonts.ready.then(() => draw(0));
  resize(); go();
})();
