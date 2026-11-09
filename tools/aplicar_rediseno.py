#!/usr/bin/env python3
"""Aplica el rediseno a las paginas ES (idempotente): CSS, data-hero, pie."""
import re, sys, pathlib
V = sys.argv[1] if len(sys.argv) > 1 else "20261109-r1"
HERO = {"store":"store","guia-rangos":"ranks","guia-slimefun":"slimefun","guia-comandos":"commands","guia-poderes":"powers","temporada-2":"season","eventos":"events","metricas":"metrics","support":"support","terms":"legal","privacidad":"legal","apoya":"sponsor","discord":"discord","guia":"commands","guia-plugins":"slimefun","cultivation":"slimefun","index":"home"}
FONT = '<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@1,500;1,600&amp;display=swap" rel="stylesheet" />'
FOOT = '''<footer class="op-footer">
      <div class="container">
        <div class="f-join">
          <div>
            <h2>Entra con la misma IP en Java y Bedrock</h2>
            <p>La Temporada 2 sigue en pruebas con el staff. La apertura está prevista para el 18 de noviembre de 2026 y se confirma en Discord.</p>
          </div>
          <div class="f-btns">
            <code class="f-join__ip">mc.drakescraft.cl</code>
            <a class="f-btn f-btn--gold" href="/discord.html">Unirme al Discord</a>
            <a class="f-btn" href="/store.html">Ver la tienda</a>
          </div>
        </div>
        <div class="row g-4">
          <div class="col-lg-4">
            <a class="op-brand" href="/"><img src="/assets/logo-drakescraft.png" alt="" width="43" height="48" /><span><strong>DrakesCraft</strong><small>JAVA + BEDROCK</small></span></a>
            <p>Seis modalidades, una sola cuenta y una comunidad que construye junta. Servidor chileno de supervivencia técnica con Slimefun.</p>
          </div>
          <div class="col-6 col-lg-2">
            <h2>Aprender</h2>
            <a href="/guia.html">El servidor</a><a href="/guia-comandos.html">Comandos</a><a href="/guia-rangos.html">Rangos</a><a href="/guia-poderes.html">Poderes</a><a href="/guia-slimefun.html">Slimefun</a><a href="/cultivation.html">Cultivation</a>
          </div>
          <div class="col-6 col-lg-2">
            <h2>Comunidad</h2>
            <a href="/temporada-2.html">Temporada 2</a><a href="/eventos.html">Eventos</a><a href="/metricas.html">Métricas</a><a href="/discord.html">Discord</a><a href="/apoya.html">Apoyar el proyecto</a>
          </div>
          <div class="col-6 col-lg-2">
            <h2>Tienda y ayuda</h2>
            <a href="/store.html">Tienda</a><a href="/support.html">Soporte de compras</a><a href="/terms.html">Términos</a><a href="/privacidad.html">Privacidad</a>
          </div>
          <div class="col-6 col-lg-2">
            <h2>English</h2>
            <a href="/index-en.html">Home</a><a href="/store-en.html">Store</a><a href="/guia-rangos-en.html">Ranks</a><a href="/support-en.html">Support</a>
          </div>
        </div>
        <p class="f-legal">DrakesCraft no es un producto oficial de Minecraft ni está aprobado o asociado a Mojang o Microsoft. Los pagos los procesa Tebex Limited. Los productos son digitales y se explican en los términos.</p>
        <div class="op-footer-bottom">
          <span>DrakesCraft · Portal oficial</span><span>Java + Bedrock · mc.drakescraft.cl</span>
        </div>
      </div>
    </footer>'''
root = pathlib.Path(__file__).resolve().parent.parent
for stem, hero in HERO.items():
    p = root / f"{stem}.html"
    if not p.exists(): continue
    s = p.read_text()
    if "olympus.css" not in s: continue
    link = f'<link href="/styles/rediseno.css?v={V}" rel="stylesheet" />'
    s = re.sub(r'<link href="/styles/rediseno\.css[^>]*>\s*', '', s)
    if "Cormorant+Garamond" not in s:
        s = s.replace("</head>", f"  {FONT}\n  </head>", 1)
    s = s.replace("</head>", f"  {link}\n  </head>", 1) if "rediseno.css" not in s else s
    if "data-hero=" not in s:
        s = re.sub(r"<body ", f'<body data-hero="{hero}" ', s, 1)
    if "/scripts/portal.js" not in s:
        s = s.replace("</body>", '  <script src="/scripts/portal.js?v=%s" defer></script>\n  </body>' % V, 1)
    s = re.sub(r'<footer class="op-footer">.*?</footer>', FOOT, s, count=1, flags=re.S)
    p.write_text(s)
    print("ok", stem)

# ---------------- paginas EN (maqueta anterior: se superpone el sistema) ----------------
HERO_EN = {"store-en":"store","guia-rangos-en":"ranks","guia-slimefun-en":"slimefun","guia-comandos-en":"commands","guia-poderes-en":"powers","temporada-2-en":"season","events-en":"events","metricas-en":"metrics","support-en":"support","terms-en":"legal","privacidad-en":"legal","apoya-en":"sponsor","guide-en":"commands","guia-plugins-en":"slimefun","index-en":"home"}
FOOT_EN = '''<footer class="r-foot">
    <div class="container">
      <div class="f-join">
        <div>
          <h2>Same IP for Java and Bedrock</h2>
          <p>Season 2 is still in staff testing. The planned opening is November 18, 2026, to be confirmed on Discord.</p>
        </div>
        <div class="f-btns">
          <code class="f-join__ip">mc.drakescraft.cl</code>
          <a class="f-btn f-btn--gold" href="https://discord.gg/rv3vtXZTk7" target="_blank" rel="noopener">Join Discord</a>
          <a class="f-btn" href="/store-en.html">Open the store</a>
        </div>
      </div>
      <div class="r-foot__cols">
        <div class="r-foot__brand">
          <a class="r-foot__logo" href="/index-en.html"><img src="/assets/logo-drakescraft.png" alt="" width="43" height="48"><span><strong>DrakesCraft</strong><small>JAVA + BEDROCK</small></span></a>
          <p>Six game modes, one account and a community that builds together. A Chilean technical survival server built around Slimefun.</p>
        </div>
        <div><h2>Learn</h2><a href="/guide-en.html">The server</a><a href="/guia-comandos-en.html">Commands</a><a href="/guia-rangos-en.html">Ranks</a><a href="/guia-poderes-en.html">Powers</a><a href="/guia-slimefun-en.html">Slimefun</a></div>
        <div><h2>Community</h2><a href="/temporada-2-en.html">Season 2</a><a href="/events-en.html">Events</a><a href="/metricas-en.html">Metrics</a><a href="https://discord.gg/rv3vtXZTk7" target="_blank" rel="noopener">Discord</a><a href="/apoya-en.html">Support the project</a></div>
        <div><h2>Store and help</h2><a href="/store-en.html">Store</a><a href="/support-en.html">Purchase support</a><a href="/terms-en.html">Terms</a><a href="/privacidad-en.html">Privacy</a></div>
        <div><h2>Español</h2><a href="/">Inicio</a><a href="/store.html">Tienda</a><a href="/guia-rangos.html">Rangos</a><a href="/support.html">Soporte</a></div>
      </div>
      <p class="f-legal">DrakesCraft is not an official Minecraft product and is not approved by or associated with Mojang or Microsoft. Payments are processed by Tebex Limited. Products are digital and explained in the terms.</p>
      <div class="r-foot__bottom"><span>DrakesCraft · Official portal</span><span>Java + Bedrock · mc.drakescraft.cl</span></div>
    </div>
  </footer>'''
for stem, hero in HERO_EN.items():
    p = root / f"{stem}.html"
    if not p.exists(): continue
    s = p.read_text()
    s = re.sub(r'<link href="/styles/rediseno\.css[^>]*>\s*', '', s)
    s = re.sub(r'<link href="styles/rediseno\.css[^>]*>\s*', '', s)
    if "Cormorant+Garamond" not in s:
        s = s.replace("</head>", f"  {FONT}\n  </head>", 1)
    s = s.replace("</head>", f'  <link href="/styles/rediseno.css?v={V}" rel="stylesheet" />\n  </head>', 1)
    if "data-hero=" not in s:
        s = re.sub(r"<body ", f'<body data-hero="{hero}" ', s, count=1)
        if "data-hero=" not in s:
            s = s.replace("<body", f'<body data-hero="{hero}"', 1)
    s = re.sub(r'<footer class="(?:site-footer|r-foot)">.*?</footer>', FOOT_EN, s, count=1, flags=re.S)
    s = re.sub(r'<script src="/scripts/portal\.js[^>]*></script>\s*', '', s)
    s = s.replace("</body>", f'  <script src="/scripts/portal.js?v={V}" defer></script>\n  </body>', 1)
    p.write_text(s)
    print("ok-en", stem)
