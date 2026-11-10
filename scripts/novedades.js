/* Novedades autoactualizables (data/novedades.json, lo genera SAORI) + registro de desarrollo + jugadores en vivo.
   Contrato: [{id, fecha (ISO), tipo: red|servidor|github, titulo, cuerpo, fuente_url, titulo_en?, cuerpo_en?}] */
(function () {
  "use strict";
  var EN = document.documentElement.lang === "en";
  var L = EN
    ? { all: "All", red: "Network", servidor: "Server", github: "GitHub", empty: "No news yet. Check Discord.", err: "News unavailable right now.", src: "Source", week: "Week of", to: "to", online: "players online", offline: "Status unavailable", on: "Server online" }
    : { all: "Todo", red: "Red", servidor: "Servidor", github: "GitHub", empty: "Aún no hay novedades. Mira el Discord.", err: "Las novedades no están disponibles ahora.", src: "Fuente", week: "Semana del", to: "al", online: "jugadores conectados", offline: "Estado no disponible", on: "Servidor en línea" };
  var TZ = "America/Santiago", LOC = EN ? "en-GB" : "es-CL";
  var TIPOS = ["red", "servidor", "github"];

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function getJSON(url) { return fetch(url, { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }
  function ymd(d) { return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d); }
  function monday(d) { var p = ymd(d).split("-").map(Number), u = Date.UTC(p[0], p[1] - 1, p[2]); return new Date(u - ((new Date(u).getUTCDay() + 6) % 7) * 864e5); }
  function fmt(d, o) { return new Intl.DateTimeFormat(LOC, Object.assign({ timeZone: "UTC" }, o)).format(d); }

  function clean(list) {
    if (!Array.isArray(list)) return [];
    return list.filter(function (x) { return x && x.titulo && !isNaN(new Date(x.fecha)); })
      .sort(function (a, b) { return new Date(b.fecha) - new Date(a.fecha); });
  }
  function card(x) {
    var li = el("li", "pt-item"); li.dataset.tipo = TIPOS.indexOf(x.tipo) < 0 ? "servidor" : x.tipo;
    var m = el("div", "pt-item__meta");
    m.appendChild(el("b", null, L[li.dataset.tipo]));
    m.appendChild(el("time", null, new Intl.DateTimeFormat(LOC, { timeZone: TZ, day: "numeric", month: "short", year: "numeric" }).format(new Date(x.fecha)))).setAttribute("datetime", x.fecha);
    li.appendChild(m);
    li.appendChild(el("h3", null, (EN && x.titulo_en) || x.titulo));
    var b = (EN && x.cuerpo_en) || x.cuerpo; if (b) li.appendChild(el("p", null, b));
    if (typeof x.fuente_url === "string" && /^https:\/\//.test(x.fuente_url)) {
      var p = el("p"), a = el("a", null, L.src + " ↗"); a.href = x.fuente_url; a.rel = "noopener"; a.target = "_blank"; p.appendChild(a); li.appendChild(p);
    }
    return li;
  }

  function initNews(root) {
    var home = root.dataset.mode === "home", limit = home ? 4 : 0;
    var list = root.querySelector("[data-news-list]"), chips = root.querySelector("[data-news-filter]"), all = [], tipo = "";
    function render() {
      list.textContent = "";
      var rows = all.filter(function (x) { return !tipo || x.tipo === tipo; });
      if (limit) rows = rows.slice(0, limit);
      if (!rows.length) { list.appendChild(el("li", "pt-empty", L.empty)); return; }
      if (home) { rows.forEach(function (x) { list.appendChild(card(x)); }); return; }
      var cur = null, ul = null;
      rows.forEach(function (x) {
        var mo = monday(new Date(x.fecha)), key = mo.getTime();
        if (key !== cur) {
          cur = key; var end = new Date(key + 6 * 864e5);
          var h = el("h2", "pt-week", L.week + " " + fmt(mo, { day: "numeric", month: "short" }) + " " + L.to + " " + fmt(end, { day: "numeric", month: "short", year: "numeric" }));
          var wrap = el("li"); wrap.style.listStyle = "none"; wrap.appendChild(h);
          ul = el("ul", "pt-news pt-news--page"); ul.style.cssText = "margin:0;padding:0;list-style:none";
          wrap.appendChild(ul); list.appendChild(wrap);
        }
        ul.appendChild(card(x));
      });
    }
    if (chips) {
      [""].concat(TIPOS).forEach(function (t) {
        var b = el("button", "pt-chip", t ? L[t] : L.all); b.type = "button"; b.setAttribute("aria-pressed", t === "" ? "true" : "false");
        b.addEventListener("click", function () { tipo = t; chips.querySelectorAll("button").forEach(function (o) { o.setAttribute("aria-pressed", o === b ? "true" : "false"); }); render(); });
        chips.appendChild(b);
      });
    }
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

  document.querySelectorAll("[data-news]").forEach(initNews);
  document.querySelectorAll("[data-devlog]").forEach(initDev);
  document.querySelectorAll("[data-pt-live]").forEach(initLive);
})();
