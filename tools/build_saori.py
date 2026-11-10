#!/usr/bin/env python3
"""Construye /saori.html, /saori-en.html y /grafos.html (alias) a partir de la plantilla de
votar.html / vote-en.html, e inserta el bloque del laboratorio en la portada ES/EN entre
<!-- saori-lab --> y <!-- /saori-lab -->. Idempotente. Uso: python3 tools/build_saori.py"""
import re
from pathlib import Path

R = Path(__file__).resolve().parent.parent
V = "20261110-g1"
U = lambda i: f'<svg class="{{c}}" aria-hidden="true"><use href="/assets/svg/griego.svg#{i}"/></svg>'

TX = {
    "es": dict(
        title="SAORI · Laboratorio de grafos | DrakesCraft",
        desc="Explora en 3D el catálogo de Slimefun, la arquitectura de plugins y el código de DrakesCraft como grafos interactivos, con telemetría pública del servidor.",
        num="LABORATORIO · I", h="SAORI · Laboratorio de grafos",
        lead="Cada punto es una pieza real de DrakesCraft y Star: 35 repositorios, más de 273.000 nodos y 960.000 aristas. Gira el universo, pasa el cursor por los símbolos y explora la arquitectura con las pestañas.",
        term="TERMINAL // <span>SAORI-NEURAL-DAEMON</span>", deck="SYSTEM // <span>ROOT DECK</span>",
        flux="TELEMETRY // <span>FLUX</span>", radar="NEURAL DATA TREE // <span>RADAR</span>",
        radar_t="Atenea vigila la red: el radar barre los grafos y el búho guarda el conocimiento.",
        cards=[("I", "Qué estás viendo", "Un árbol radial sobre una esfera: el centro es la raíz, cada anillo es un nivel y el color marca la comunidad. Las aristas lejanas se atenúan para dar profundidad."),
               ("II", "De dónde salen los datos", "Snapshots estáticos generados desde lo que la web ya publica: la wiki de Slimefun, la guía de plugins y el código del repositorio público. Se regeneran con tools/gen_grafos.py."),
               ("III", "Qué no verás", "Nada privado: ni rutas, ni IPs, ni registros reales. El grafo SAORI es ilustrativo y el terminal se sintetiza con métricas públicas del servidor.")],
        cta="Abrir el laboratorio completo", home_h="SAORI · El Olimpo también piensa",
        home_lead="La red que mantiene vivo DrakesCraft, convertida en una esfera de grafos que puedes girar. Datos públicos, telemetría en vivo y un búho que no duerme.",
        sets="labs,galaxia,aihub,tinkers,denizen,bentobox,elitemobs", home_sets="labs,galaxia,aihub", tpl="votar.html", out="saori.html", other="saori-en.html"),
    "en": dict(
        title="SAORI · Graph Lab | DrakesCraft",
        desc="Explore DrakesCraft's Slimefun catalogue, plugin architecture and website code as interactive 3D graphs, with public server telemetry.",
        num="LABORATORY · I", h="SAORI · Graph Lab",
        lead="Every point is a real piece of DrakesCraft and Star: 35 repositories, over 273,000 nodes and 960,000 edges. Spin the universe, inspect symbols on hover, and navigate the architecture through the tabs.",
        term="TERMINAL // <span>SAORI-NEURAL-DAEMON</span>", deck="SYSTEM // <span>ROOT DECK</span>",
        flux="TELEMETRY // <span>FLUX</span>", radar="NEURAL DATA TREE // <span>RADAR</span>",
        radar_t="Athena watches the network: the radar sweeps the graphs and the owl keeps the knowledge.",
        cards=[("I", "What you are seeing", "A radial tree on a sphere: the centre is the root, each ring is a level and colour marks the community. Distant edges fade to give depth."),
               ("II", "Where the data comes from", "Static snapshots built from what the site already publishes: the Slimefun wiki, the plugin guide and the public repository's code. Regenerated with tools/gen_grafos.py."),
               ("III", "What you will not see", "Nothing private: no paths, IPs or real logs. The SAORI graph is illustrative and the terminal is synthesised from public server metrics.")],
        cta="Open the full lab", home_h="SAORI · Olympus thinks too",
        home_lead="The network that keeps DrakesCraft alive, turned into a graph sphere you can spin. Public data, live telemetry and an owl that never sleeps.",
        sets="labs,galaxia,aihub,tinkers,denizen,bentobox,elitemobs", home_sets="labs,galaxia,aihub", tpl="vote-en.html", out="saori-en.html", other="saori.html"),
}

def lab(t, sets, heading, lead, tag, extra=""):
    u = lambda i, c: U(i).replace("{c}", c)
    cards = "".join(f'<article class="ft-card"><span class="sg-num">{n}</span><h3>{a}</h3><p>{b}</p></article>' for n, a, b in t["cards"])
    return f"""<section class="sg-sec" id="saori-lab" aria-labelledby="sg-title"><div class="sg-wrap">
<header class="sg-head">{u("laurel", "sg-laurel")}<span class="sg-num">{t["num"]}</span><{tag} id="sg-title">{heading}</{tag}><p>{lead}</p></header>
<div class="sg-grid" data-hud-box>{u("columna", "sg-col sg-col--l")}{u("columna", "sg-col sg-col--r")}
 <div class="sg-frame"><span class="greca greca--cian" aria-hidden="true"></span>
  <div data-grafos data-sets="{sets}"></div><span class="greca greca--b" aria-hidden="true"></span></div>
 <aside class="sg-hud">
  <div class="sg-panel"><h3>{t["term"]}</h3><div data-hud="term" aria-live="off"></div></div>
  <div class="sg-panel"><h3>{t["deck"]}</h3><div data-hud="deck"></div></div>
  <div class="sg-panel"><h3>{t["flux"]}</h3><div data-hud="flux"></div></div>
  <div class="sg-panel"><h3>{t["radar"]}</h3><div class="sg-radar"><div class="sg-radar__dial" aria-hidden="true"></div><p style="margin:0">{t["radar_t"]}</p></div></div>
 </aside>
</div>{extra}
</div></section>"""

def page(lang):
    t = TX[lang]
    s = (R / t["tpl"]).read_text("utf8")
    head, _, rest = s.partition("<main")
    _, _, tail = rest.partition("</main>")
    tail = re.sub(r"^\s*<script>.*?</script>", "", tail, count=1, flags=re.S)
    head = re.sub(r"<title>.*?</title>", f"<title>{t['title']}</title>", head, flags=re.S)
    head = re.sub(r'<meta\s+content="[^"]*"\s+name="description"\s*/>', f'<meta content="{t["desc"]}" name="description" />', head, flags=re.S)
    head = head.replace("</head>", f'  <link rel="stylesheet" href="/styles/grafos.css?v={V}">\n  <link rel="alternate" hreflang="{"en" if lang == "es" else "es"}" href="/{t["other"]}">\n</head>')
    head = head.replace('data-hero="sponsor"', 'data-hero="saori"')
    motifs = '<div class="sg-motifs" aria-hidden="true">' + "".join(U(i).replace('class="{c}" ', "") for i in ("anfora", "buho", "roseta", "columna", "laurel")) + "</div>"
    extra = '<div class="sg-explica">' + "".join(f'<article class="ft-card ft-card--top"><span class="sg-num">{n}</span><h3>{a}</h3><p>{b}</p></article>' for n, a, b in t["cards"]) + "</div>" + motifs
    main = f'<main id="main" class="sg-page">{lab(t, t["sets"], t["h"], t["lead"], "h1", extra)}</main>'
    tail = tail.replace("</body>", f'    <script src="/scripts/grafos.js?v={V}" defer></script>\n  </body>')
    (R / t["out"]).write_text(head + main + tail, "utf8")

def portada(lang, fn):
    t = TX[lang]
    p = R / fn; s = p.read_text("utf8")
    extra = f'<div class="sg-foot"><a class="pt-btn pt-btn--gold" href="/{t["out"]}">{t["cta"]}</a></div>'
    blk = f'<!-- saori-lab -->{lab(t, t["home_sets"], t["home_h"], t["home_lead"], "h2", extra)}<!-- /saori-lab -->'
    if "<!-- saori-lab -->" in s:
        s = re.sub(r"<!-- saori-lab -->.*?<!-- /saori-lab -->", lambda m: blk, s, flags=re.S)
    else:
        i = s.find('id="laboratorio"')
        j = s.find("</section>", i) + len("</section>") if i > 0 else s.find("</main>")
        s = s[:j] + "\n" + blk + s[j:]
    for tag in (f'<link rel="stylesheet" href="/styles/grafos.css?v={V}">', ):
        if "grafos.css" not in s: s = s.replace("</head>", f"  {tag}\n</head>", 1)
    s = re.sub(r"/styles/grafos\.css\?v=[\w-]+", f"/styles/grafos.css?v={V}", s)
    if "grafos.js" not in s: s = s.replace("</body>", f'<script src="/scripts/grafos.js?v={V}" defer></script>\n</body>', 1)
    s = re.sub(r"/scripts/grafos\.js\?v=[\w-]+", f"/scripts/grafos.js?v={V}", s)
    p.write_text(s, "utf8")

if __name__ == "__main__":
    page("es"); page("en")
    (R / "grafos.html").write_text('<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Laboratorio de grafos | DrakesCraft</title>'
                                   '<link rel="canonical" href="/saori.html"><meta http-equiv="refresh" content="0; url=/saori.html#saori-lab"></head>'
                                   '<body><a href="/saori.html#saori-lab">Laboratorio de grafos</a></body></html>', "utf8")
    portada("es", "index.html"); portada("en", "index-en.html")
    print("ok")
