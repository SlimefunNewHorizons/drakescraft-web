/* Novedades autoactualizables (data/novedades.json, lo genera SAORI) + registro de desarrollo + jugadores en vivo.
   Contrato: [{id, fecha (ISO), tipo: red|servidor|github, titulo, cuerpo, fuente_url, resumen?, repo?, titulo_en?, cuerpo_en?}]
   El cuerpo trae markdown de Discord: se convierte a nodos (nunca innerHTML). */
(function () {
  "use strict";
  var EN = document.documentElement.lang === "en";
  var L = EN
    ? { all: "All", red: "Network", servidor: "Server", github: "GitHub", empty: "No news yet. Check Discord.", err: "News unavailable right now.", src: "Source", week: "Week of", to: "to", online: "players online", offline: "Status unavailable", on: "Server online", more: "Show more", less: "Show less", feat: "Latest from the server", copied: "Copied" }
    : { all: "Todo", red: "Red", servidor: "Servidor", github: "GitHub", empty: "Aún no hay novedades. Mira el Discord.", err: "Las novedades no están disponibles ahora.", src: "Fuente", week: "Semana del", to: "al", online: "jugadores conectados", offline: "Estado no disponible", on: "Servidor en línea", more: "Ver más", less: "Ver menos", feat: "Lo último del servidor", copied: "Copiado" };
  var TZ = "America/Santiago", LOC = EN ? "en-GB" : "es-CL";
  var TIPOS = ["servidor", "red", "github"];
  var NS = "http://www.w3.org/2000/svg";
  var ICO = { // trazos 24x24
    servidor: "M4 4h16v6H4zM4 14h16v6H4zM8 7h.01M8 17h.01",
    red: "M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18",
    github: "M6 3v12M18 9a3 3 0 1 0 0-6a3 3 0 1 0 0 6M6 21a3 3 0 1 0 0-6a3 3 0 1 0 0 6M18 9a9 9 0 0 1-9 9"
  };

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function getJSON(url) { return fetch(url, { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }
  function ymd(d) { return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d); }
  function monday(d) { var p = ymd(d).split("-").map(Number), u = Date.UTC(p[0], p[1] - 1, p[2]); return new Date(u - ((new Date(u).getUTCDay() + 6) % 7) * 864e5); }
  function fmt(d, o) { return new Intl.DateTimeFormat(LOC, Object.assign({ timeZone: "UTC" }, o)).format(d); }
  function icon(t) {
    var s = document.createElementNS(NS, "svg"), p = document.createElementNS(NS, "path");
    s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("aria-hidden", "true"); s.setAttribute("class", "pt-ico");
    p.setAttribute("d", ICO[t]); s.appendChild(p); return s;
  }
  var RTF = window.Intl && Intl.RelativeTimeFormat ? new Intl.RelativeTimeFormat(LOC, { numeric: "auto", style: "short" }) : null;
  function rel(d) {
    var s = (d - Date.now()) / 1000, a = Math.abs(s);
    if (!RTF) return "";
    if (a < 3600) return RTF.format(Math.round(s / 60) || -1, "minute");
    if (a < 86400) return RTF.format(Math.round(s / 3600), "hour");
    if (a < 86400 * 30) return RTF.format(Math.round(s / 86400), "day");
    return "";
  }

  /* Markdown seguro: **negrita**, __negrita__, `código`, [texto](https://…), viñetas • - * y párrafos. */
  var INL = /\*\*([^*\n]+)\*\*|__([^_\n]+)__|`([^`\n]+)`|\[([^\]\n]+)\]\((https:\/\/[^)\s]+)\)/g;
  function inline(parent, txt) {
    var i = 0, m; INL.lastIndex = 0;
    while ((m = INL.exec(txt))) {
      if (m.index > i) parent.appendChild(document.createTextNode(txt.slice(i, m.index)));
      if (m[1] || m[2]) parent.appendChild(el("strong", null, m[1] || m[2]));
      else if (m[3]) parent.appendChild(el("code", null, m[3]));
      else { var a = el("a", null, m[4]); a.href = m[5]; a.rel = "noopener"; a.target = "_blank"; parent.appendChild(a); }
      i = INL.lastIndex;
    }
    if (i < txt.length) parent.appendChild(document.createTextNode(txt.slice(i)));
  }
  function md(txt) {
    var f = document.createDocumentFragment(), p = null, ul = null;
    String(txt).replace(/\r/g, "").split("\n").forEach(function (raw) {
      var line = raw.trim(), b = /^([•*\-–]|\d+\.)\s+/.exec(line);
      if (!line) { p = ul = null; return; }
      line = line.replace(/^#{1,4}\s+|^>\s?/, "");
      if (b) { p = null; if (!ul) ul = f.appendChild(el("ul")); inline(ul.appendChild(el("li")), line.slice(b[0].length)); return; }
      ul = null;
      if (p) p.appendChild(el("br")); else p = f.appendChild(el("p"));
      inline(p, line);
    });
    return f;
  }
  // Títulos de commits antiguos ("repo: Web: algo") por si el feed aún no trae `repo`.
  function titulo(x) {
    var t = String((EN && x.titulo_en) || x.titulo).trim(), repo = x.repo || "";
    if (x.tipo === "github") {
      var m = /^([\w.-]{2,40}):\s+(.*)$/.exec(t);
      if (!repo && m) { repo = m[1]; t = m[2]; }
      t = t.replace(/^(?:[\w.-]{1,24}(?:\([^)]{0,30}\))?!?:\s+)+/, "") || t;
      t = t.charAt(0).toUpperCase() + t.slice(1);
    }
    return { t: t, repo: repo };
  }
  function clean(list) {
    if (!Array.isArray(list)) return [];
    return list.filter(function (x) { return x && x.titulo && !isNaN(new Date(x.fecha)); })
      .sort(function (a, b) { return new Date(b.fecha) - new Date(a.fecha); });
  }
  function card(x, feat) {
    var tipo = TIPOS.indexOf(x.tipo) < 0 ? "servidor" : x.tipo, d = new Date(x.fecha), tt = titulo(x);
    var li = el("li", "pt-item" + (feat ? " pt-item--feat" : "")); li.dataset.tipo = tipo;
    var m = el("div", "pt-item__meta");
    m.appendChild(icon(tipo));
    m.appendChild(el("span", "pt-item__type", feat ? L.feat : L[tipo]));
    if (tt.repo) m.appendChild(el("span", "pt-repo", tt.repo));
    var r = rel(d), tm = el("time", null, (r ? r + " · " : "") + new Intl.DateTimeFormat(LOC, { timeZone: TZ, day: "numeric", month: "short" }).format(d));
    tm.setAttribute("datetime", x.fecha); tm.title = new Intl.DateTimeFormat(LOC, { timeZone: TZ, dateStyle: "long", timeStyle: "short" }).format(d);
    m.appendChild(tm); li.appendChild(m);
    li.appendChild(el("h3", null, tt.t));
    var b = (EN && x.cuerpo_en) || x.cuerpo || x.resumen;
    var foot = el("div", "pt-item__foot");
    if (b) {
      var body = el("div", "pt-body"); body.appendChild(md(b)); li.appendChild(body);
      var btn = el("button", "pt-toggle", L.more); btn.type = "button"; btn.hidden = true; btn.setAttribute("aria-expanded", "false");
      btn.addEventListener("click", function () { var o = li.classList.toggle("is-open"); btn.setAttribute("aria-expanded", o); btn.textContent = o ? L.less : L.more; });
      foot.appendChild(btn); li._clamp = function () { btn.hidden = !(li.classList.contains("is-open") || body.scrollHeight > body.clientHeight + 4); };
    }
    if (typeof x.fuente_url === "string" && /^https:\/\//.test(x.fuente_url)) {
      var a = el("a", "pt-src", L.src + " ↗"); a.href = x.fuente_url; a.rel = "noopener"; a.target = "_blank"; foot.appendChild(a);
    }
    if (foot.firstChild) li.appendChild(foot);
    return li;
  }
  function clamps(root) { requestAnimationFrame(function () { root.querySelectorAll(".pt-item").forEach(function (n) { if (n._clamp) n._clamp(); }); }); }

  function initNews(root) {
    var home = root.dataset.mode === "home";
    var list = root.querySelector("[data-news-list]"), chips = root.querySelector("[data-news-filter]"), all = [], tipo = "";
    function render() {
      list.textContent = "";
      var rows = all.filter(function (x) { return !tipo || x.tipo === tipo; });
      if (!rows.length) { list.appendChild(el("li", "pt-empty", L.empty)); return; }
      if (home) {
        var f = (!tipo || tipo === "servidor") ? rows.filter(function (x) { return x.tipo === "servidor"; })[0] : null;
        if (f) list.appendChild(card(f, true));
        rows.filter(function (x) { return x !== f; }).slice(0, 4).forEach(function (x) { list.appendChild(card(x)); });
        list.classList.toggle("has-feat", !!f);
        return clamps(list);
      }
      var cur = null, ul = null;
      rows.forEach(function (x) {
        var mo = monday(new Date(x.fecha)), key = mo.getTime();
        if (key !== cur) {
          cur = key; var end = new Date(key + 6 * 864e5);
          var wrap = el("li", "pt-wk");
          wrap.appendChild(el("h2", "pt-week", L.week + " " + fmt(mo, { day: "numeric", month: "short" }) + " " + L.to + " " + fmt(end, { day: "numeric", month: "short", year: "numeric" })));
          ul = wrap.appendChild(el("ul", "pt-news pt-news--page")); list.appendChild(wrap);
        }
        ul.appendChild(card(x));
      });
      clamps(list);
    }
    if (chips) {
      [""].concat(TIPOS).forEach(function (t) {
        var b = el("button", "pt-chip", t ? L[t] : L.all); b.type = "button"; b.setAttribute("aria-pressed", t === "" ? "true" : "false");
        if (t) { b.dataset.tipo = t; b.insertBefore(icon(t), b.firstChild); }
        b.addEventListener("click", function () { tipo = t; chips.querySelectorAll("button").forEach(function (o) { o.setAttribute("aria-pressed", o === b ? "true" : "false"); }); render(); });
        chips.appendChild(b);
      });
    }
    var rt; window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { clamps(list); }, 150); });
    getJSON("/data/novedades.json").then(function (d) { all = clean(d); render(); })
      .catch(function () { list.textContent = ""; list.appendChild(el("li", "pt-empty", L.err)); });
  }

  function initDev(root) {
    getJSON("/data/desarrollo.json").then(function (d) {
      if (!Array.isArray(d)) return;
      ["cola", "curso", "hecho"].forEach(function (s) {
        var ul = root.querySelector('[data-dev="' + s + '"]'); if (!ul) return;
        var rows = d.filter(function (x) { return x && x.estado === s && x.titulo; });
        ul.textContent = ""; rows.forEach(function (x) { ul.appendChild(el("li", null, (EN && x.titulo_en) || x.titulo)); });
        var c = root.querySelector('[data-dev-count="' + s + '"]'); if (c) c.textContent = rows.length;
      });
    }).catch(function () {});
  }

  function initLive(root) {
    var n = root.querySelector("[data-pt-count]"), t = root.querySelector("[data-pt-text]");
    getJSON("/api/server-status").then(function (s) {
      var ok = s && s.enLinea === true, p = Number.isFinite(s && s.jugadores) ? s.jugadores : null;
      root.classList.toggle("is-online", ok);
      n.textContent = ok && p !== null ? p : "—"; t.textContent = ok ? (p !== null ? L.online : L.on) : L.offline;
    }).catch(function () { t.textContent = L.offline; });
  }

  // Botones copiar (dirección/puerto Bedrock): <button data-copy-text="valor">
  document.querySelectorAll("[data-copy-text]").forEach(function (b) {
    var orig = b.textContent;
    b.addEventListener("click", function () {
      var v = b.dataset.copyText, done = function () { b.textContent = L.copied + " ✓"; setTimeout(function () { b.textContent = orig; }, 1600); };
      if (navigator.clipboard) navigator.clipboard.writeText(v).then(done, done); else done();
    });
  });

  document.querySelectorAll("[data-news]").forEach(initNews);
  document.querySelectorAll("[data-devlog]").forEach(initDev);
  document.querySelectorAll("[data-pt-live]").forEach(initLive);
})();
