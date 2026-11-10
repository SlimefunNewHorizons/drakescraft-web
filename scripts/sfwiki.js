// Wiki de Slimefun de DrakesCraft: datos estaticos en /assets/sfwiki/ (tools/gen_slimefun_wiki.py).
// Carga diferida: meta.json (~40 KB) + un indice por inicial (~100-250 KB) + un fragmento por addon.
(() => {
  const root = document.getElementById("sfw");
  if (!root) return;
  const EN = document.documentElement.lang === "en";
  const BASE = "/assets/sfwiki/";
  const PAGE = EN ? "wiki-slimefun-en.html" : "wiki-slimefun.html";
  const L = EN ? {
    items: "items", addons: "addons", cats: "categories", rec: "with recipe", upd: "Updated",
    ph: "Search an item, machine or material (e.g. Quantum, Solar, Reactor)...", all: "All addons",
    allc: "Category", pickA: "Pick an addon to filter by category", go: "Search",
    noRes: "No results. Try another word or remove the filters.", more: "Show more", loading: "Loading...",
    err: "Could not load the data. Try again later.", back: "All addons", addon: "Addon", cat: "Category",
    madeIn: "Made in", recipe: "Recipe", lore: "In-game description", research: "Research", cost: "levels",
    usedIn: "Used to craft", usedMore: "and %n more", noRecipe: "No recipe registered: it is obtained another way or is a world resource.",
    found: "Obtained, not crafted", featured: "Featured items", machines: "Mainly crafted in", catsT: "Categories",
    noCat: "No category in our data", yield: "Makes", unk: "Recipe and description are not available yet for this item; only what the server registers is shown.",
    results: "results", filterA: "Filter addons...", dtitle: "%n is a Slimefun addon loaded on DrakesCraft with %c items", dcats: " across %k categories", dmach: ". Its items are mostly crafted in: ", other: "Other",
    faqT: "Frequently asked", home: "Slimefun wiki", showing: "Showing %a of %b",
  } : {
    items: "ítems", addons: "addons", cats: "categorías", rec: "con receta", upd: "Actualizado",
    ph: "Busca un ítem, máquina o material (ej: Quantum, Solar, Reactor)...", all: "Todos los addons",
    allc: "Categoría", pickA: "Elige un addon para filtrar por categoría", go: "Buscar",
    noRes: "Sin resultados. Prueba otra palabra o quita los filtros.", more: "Mostrar más", loading: "Cargando...",
    err: "No se pudieron cargar los datos. Intenta más tarde.", back: "Todos los addons", addon: "Addon", cat: "Categoría",
    madeIn: "Se fabrica en", recipe: "Receta", lore: "Descripción en el juego", research: "Investigación", cost: "niveles",
    usedIn: "Sirve para fabricar", usedMore: "y %n más", noRecipe: "Sin receta registrada: se obtiene de otra forma o es un recurso del mundo.",
    found: "Se obtiene, no se fabrica", featured: "Ítems destacados", machines: "Se fabrican sobre todo en", catsT: "Categorías",
    noCat: "Sin categoría en nuestros datos", yield: "Produce", unk: "Aún no tenemos receta ni descripción de este ítem; solo se muestra lo que registra el servidor.",
    results: "resultados", filterA: "Filtrar addons...", dtitle: "%n es un addon de Slimefun cargado en DrakesCraft con %c ítems", dcats: " en %k categorías", dmach: ". Sus ítems se fabrican sobre todo en: ", other: "Otros",
    faqT: "Preguntas frecuentes", home: "Wiki de Slimefun", showing: "Mostrando %a de %b",
  };
  const MACH = EN ? {
    enhanced_crafting_table: "Enhanced Crafting Table", ancient_altar: "Ancient Altar", magic_workbench: "Magic Workbench",
    smeltery: "Smeltery", armor_forge: "Armor Forge", "no recipe": L.noRecipe,
  } : {
    enhanced_crafting_table: "Mesa de crafteo mejorada", ancient_altar: "Altar antiguo", magic_workbench: "Mesa de trabajo mágica",
    smeltery: "Fundición", armor_forge: "Forja de armaduras", "no recipe": L.noRecipe,
  };
  const pretty = (s) => s.replace(/^[a-z0-9_\-]*:\s?/i, (m) => (m.startsWith("found") ? "" : m)).split(/[_\-\s]+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
  const mach = (m) => {
    if (m.startsWith("found:")) return L.found + (m.slice(6).trim() && m.slice(6).trim() !== "null" ? " (" + pretty(m.slice(6).trim()) + ")" : "");
    return MACH[m] || pretty(m);
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const norm = (s) => s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  const fmt = (n) => n.toLocaleString(EN ? "en-US" : "es-CL");
  const cache = {};
  const J = (u) => cache[u] || (cache[u] = fetch(BASE + u).then((r) => { if (!r.ok) throw 0; return r.json(); }).catch((e) => { delete cache[u]; throw e; }));

  const $q = document.getElementById("sfw-q"), $a = document.getElementById("sfw-a"), $c = document.getElementById("sfw-c");
  const $view = document.getElementById("sfw-view"), $stat = document.getElementById("sfw-stat");
  let M, AS = {};
  const iLink = (slug, sh, id) => "#/i/" + slug + "/" + sh + "/" + encodeURIComponent(id);

  // ---------- busqueda ----------
  let seq = 0;
  async function search() {
    const my = ++seq, q = norm($q.value.trim()), terms = q.split(/\s+/).filter(Boolean);
    const a = $a.value, c = $c.value;
    if (!terms.length && !a) { route(); return; }
    $view.innerHTML = '<p class="sfw-muted">' + L.loading + "</p>";
    try {
      if (!terms.length) { await listAddon(AS[a], c === "" ? null : +c, my); return; }
      const ch = /[a-z0-9]/.test(terms[0][0]) ? terms[0][0] : null;
      const rows = ch ? await J("s/" + ch + ".json").catch(() => []) : [];
      if (my !== seq) return;
      const ai = a ? M.A.findIndex((x) => x.s === a) : -1;
      let res = rows.filter((r) => (ai < 0 || r[2] === ai) && (c === "" || r[3] === +c) && terms.every((t) => norm(r[1] + " " + r[0]).includes(t)));
      const rank = (r) => { const n = norm(r[1]); return n === q ? 0 : n.startsWith(q) ? 1 : n.split(/\W+/).some((w) => w.startsWith(terms[0])) ? 2 : 3; };
      res.sort((x, y) => rank(x) - rank(y) || x[1].localeCompare(y[1]));
      renderRows(res.map((r) => ({ n: r[1], i: r[0], a: M.A[r[2]], c: r[3], sh: r[4] })), res.length, my);
    } catch (e) { $view.innerHTML = '<p class="sfw-err">' + L.err + "</p>"; }
  }
  function renderRows(list, total, my, more) {
    if (my !== seq) return;
    let shown = 0;
    const draw = () => {
      const n = Math.min(list.length, shown + 48);
      const html = list.slice(shown, n).map(card).join("");
      shown = n;
      grid.insertAdjacentHTML("beforeend", html);
      btn.hidden = shown >= list.length && !more;
      stat.textContent = list.length ? L.showing.replace("%a", fmt(shown)).replace("%b", fmt(total)) : "";
    };
    $view.innerHTML = '<p class="sfw-muted sfw-stat"></p><div class="sfw-grid"></div><p class="sfw-more"><button type="button" class="sfw-btn"></button></p>';
    const stat = $view.querySelector(".sfw-stat"), grid = $view.querySelector(".sfw-grid"), btn = $view.querySelector("button");
    btn.textContent = L.more;
    if (!list.length) { stat.textContent = L.noRes; btn.hidden = true; return; }
    btn.onclick = async () => { if (more && shown >= list.length) { btn.disabled = true; const r = await more(); if (r) list.push(...r); btn.disabled = false; } draw(); };
    draw();
  }
  function card(x) {
    const cat = x.c >= 0 && M.C[x.c] ? M.C[x.c][1] : "";
    return '<a class="sfw-card" href="' + iLink(x.a.s, x.sh, x.i) + '"><strong>' + esc(x.n) + '</strong><span class="sfw-badge">' + esc(x.a.n) + "</span>" + (cat ? "<small>" + esc(cat) + "</small>" : "") + "</a>";
  }
  // lista de un addon por fragmentos (carga diferida)
  async function listAddon(ad, cat, my, head) {
    let sh = 0, out = [];
    const total = cat === null ? ad.c : (ad.cats.find((x) => x[0] === cat) || [0, 0])[1];
    const take = async () => {
      const got = [];
      while (sh < ad.sh && got.length < 48) {
        const d = await J("a/" + ad.s + "-" + sh + ".json");
        d.items.forEach((it) => { if (cat === null || it.c === cat) got.push({ n: it.n, i: it.i, a: ad, c: it.c === undefined ? -1 : it.c, sh }); });
        sh++;
      }
      return got;
    };
    out = await take();
    renderRows(out, total, my, () => (sh < ad.sh ? take() : null));
    if (head && my === seq) $view.insertAdjacentHTML("afterbegin", head);
  }

  // ---------- vistas ----------
  function home() {
    const tm = M.A.slice(), f = (document.getElementById("sfw-fa") || {}).value || "";
    $view.innerHTML = '<div class="sfw-stats">' +
      [[M.items, L.items], [M.addons, L.addons], [M.cats, L.cats], [M.rec, L.rec]].map((s) => '<div><b>' + fmt(s[0]) + "</b><span>" + s[1] + "</span></div>").join("") +
      '</div><p class="sfw-muted sfw-upd">' + L.upd + ": " + M.gen + '</p>' +
      '<div class="sfw-hd"><h2>' + L.addons[0].toUpperCase() + L.addons.slice(1) + '</h2><input type="search" id="sfw-fa" class="sfw-in" placeholder="' + L.filterA + '" value="' + esc(f) + '"></div>' +
      '<div class="sfw-grid sfw-grid--a" id="sfw-ag"></div>';
    const draw = () => {
      const t = norm(document.getElementById("sfw-fa").value);
      document.getElementById("sfw-ag").innerHTML = tm.filter((x) => norm(x.n).includes(t)).map((x) =>
        '<a class="sfw-card sfw-card--a" href="#/a/' + x.s + '"><strong>' + esc(x.n) + "</strong><span class='sfw-badge'>" + fmt(x.c) + " " + L.items + "</span><small>" + (x.f.length ? esc(x.f.slice(0, 3).map((y) => y[1]).join(" · ")) : "") + "</small></a>").join("");
    };
    document.getElementById("sfw-fa").oninput = draw; draw();
  }
  function desc(ad) {
    let s = L.dtitle.replace("%n", ad.n).replace("%c", fmt(ad.c));
    if (ad.cats.length) s += L.dcats.replace("%k", ad.cats.length);
    if (ad.tm.length) s += L.dmach + ad.tm.map((m) => mach(m[0]) + " (" + fmt(m[1]) + ")").join(", ");
    return s + ".";
  }
  async function addonView(slug, cat) {
    const ad = AS[slug];
    if (!ad) { home(); return; }
    const my = ++seq;
    $view.innerHTML = '<p><a href="#/">&larr; ' + L.back + '</a></p><h2 class="sfw-h">' + esc(ad.n) + '</h2><p class="sfw-lead">' + esc(desc(ad)) + "</p>" +
      '<div class="sfw-stats"><div><b>' + fmt(ad.c) + "</b><span>" + L.items + "</span></div><div><b>" + ad.cats.length + "</b><span>" + L.cats + "</span></div><div><b>" + fmt(ad.rc) + "</b><span>" + L.rec + "</span></div></div>" +
      (ad.f.length ? "<h3>" + L.featured + '</h3><div class="sfw-chips">' + ad.f.map((y) => '<a href="' + iLink(ad.s, y[2], y[0]) + '">' + esc(y[1]) + "</a>").join("") + "</div>" : "") +
      (ad.cats.length ? "<h3>" + L.catsT + '</h3><div class="sfw-chips">' + '<a href="#/a/' + ad.s + '"' + (cat === null ? ' class="on"' : "") + ">" + L.all.replace(L.addons, "") + fmt(ad.c) + "</a>" +
        ad.cats.map((k) => '<a href="#/a/' + ad.s + "/" + k[0] + '"' + (cat === k[0] ? ' class="on"' : "") + ">" + esc(M.C[k[0]][1]) + " (" + k[1] + ")</a>").join("") + "</div>" : "") +
      '<div id="sfw-list"></div>';
    const head = $view.innerHTML.replace('<div id="sfw-list"></div>', "");
    try {
      await listAddon(ad, cat, my, head);
    } catch (e) { $view.innerHTML = head + '<p class="sfw-err">' + L.err + "</p>"; }
  }
  async function itemView(slug, sh, id) {
    const ad = AS[slug], my = ++seq;
    if (!ad) { home(); return; }
    $view.innerHTML = '<p class="sfw-muted">' + L.loading + "</p>";
    try {
      const d = await J("a/" + slug + "-" + sh + ".json");
      if (my !== seq) return;
      const it = d.items.find((x) => x.i === id);
      if (!it) { home(); return; }
      const R = (e) => {
        if (!e) return '<div class="sfw-slot"></div>';
        const amt = e.a ? "<em>x" + e.a + "</em>" : "";
        if (e.s) { const r = d.refs[e.s]; return r ? '<a class="sfw-slot" href="' + iLink(r[1], r[2], e.s) + '">' + esc(r[0]) + amt + "</a>" : '<div class="sfw-slot">' + esc(pretty(e.s)) + amt + "</div>"; }
        return '<div class="sfw-slot sfw-slot--mc">' + esc(pretty(e.m)) + amt + "</div>";
      };
      const cat = it.c !== undefined && M.C[it.c] ? M.C[it.c][1] : "";
      let h = '<p><a href="#/a/' + slug + '">&larr; ' + esc(ad.n) + '</a></p><h2 class="sfw-h">' + esc(it.n) + '</h2><p class="sfw-meta"><code>' + esc(it.i) + '</code> <a class="sfw-badge" href="#/a/' + slug + '">' + esc(ad.n) + "</a>" + (cat ? ' <span class="sfw-badge sfw-badge--c">' + esc(cat) + "</span>" : "") + "</p>";
      h += '<div class="sfw-facts"><div><span>' + L.madeIn + "</span><b>" + esc(mach(it.m)) + "</b></div>" +
        (it.o ? "<div><span>" + L.yield + "</span><b>x" + it.o + "</b></div>" : "") +
        (it.rs ? "<div><span>" + L.research + "</span><b>" + esc(it.rs) + (it.rc ? " (" + it.rc + " " + L.cost + ")" : "") + "</b></div>" : "") + "</div>";
      if (it.r) h += "<h3>" + L.recipe + '</h3><div class="sfw-recipe' + (it.r.length === 9 ? "" : " sfw-recipe--l") + '">' + it.r.map(R).join("") + "</div>";
      else if (it.m === "no recipe" || it.m.startsWith("found")) h += '<p class="sfw-muted">' + L.noRecipe + "</p>";
      if (it.l) h += "<h3>" + L.lore + '</h3><blockquote class="sfw-lore">' + esc(it.l) + "</blockquote>";
      if (it.u) h += "<h3>" + L.usedIn + '</h3><div class="sfw-chips">' + it.u.map((x) => { const r = d.refs[x]; return r ? '<a href="' + iLink(r[1], r[2], x) + '">' + esc(r[0]) + "</a>" : ""; }).join("") +
        (it.un > it.u.length ? "<span>" + L.usedMore.replace("%n", it.un - it.u.length) + "</span>" : "") + "</div>";
      if (!it.r && !it.l && !it.u) h += '<p class="sfw-muted">' + L.unk + "</p>";
      $view.innerHTML = h;
      document.title = it.n + " · " + ad.n + " · DrakesCraft";
    } catch (e) { $view.innerHTML = '<p class="sfw-err">' + L.err + "</p>"; }
  }
  function route() {
    const p = decodeURIComponent(location.hash.replace(/^#\/?/, "")).split("/");
    document.title = L.home + " · DrakesCraft";
    if (p[0] === "a" || p[0] === "i") root.scrollIntoView();
    if (p[0] === "a" && p[1]) addonView(p[1], p[2] !== undefined && p[2] !== "" ? +p[2] : null);
    else if (p[0] === "i" && p.length >= 4) itemView(p[1], +p[2], p.slice(3).join("/"));
    else { seq++; home(); }
  }
  window.addEventListener("hashchange", () => { $q.value = ""; $a.value = ""; fillCats(); route(); });
  function fillCats() {
    const ad = AS[$a.value];
    $c.innerHTML = '<option value="">' + (ad ? L.allc : L.pickA) + "</option>" + (ad ? ad.cats.map((k) => '<option value="' + k[0] + '">' + esc(M.C[k[0]][1]) + " (" + k[1] + ")</option>").join("") : "");
    $c.disabled = !ad;
  }

  J("meta.json").then((m) => {
    M = m; M.A.forEach((x) => (AS[x.s] = x));
    const set = (id, v) => { const e = document.querySelectorAll("[data-sfw='" + id + "']"); e.forEach((n) => (n.textContent = v)); };
    set("items", fmt(M.items)); set("addons", fmt(M.addons)); set("cats", fmt(M.cats));
    $a.innerHTML = '<option value="">' + L.all + "</option>" + M.A.map((x) => '<option value="' + x.s + '">' + esc(x.n) + " (" + fmt(x.c) + ")</option>").join("");
    fillCats();
    const u = new URLSearchParams(location.search);
    if (u.get("q")) $q.value = u.get("q");
    let t;
    const go = () => { clearTimeout(t); t = setTimeout(search, 180); };
    $q.addEventListener("input", go);
    $a.addEventListener("change", () => { fillCats(); search(); });
    $c.addEventListener("change", search);
    document.getElementById("sfw-form").addEventListener("submit", (e) => { e.preventDefault(); search(); });
    if ($q.value) search(); else route();
  }).catch(() => { $view.innerHTML = '<p class="sfw-err">' + L.err + "</p>"; });
})();
