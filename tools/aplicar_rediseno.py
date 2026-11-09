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
    s = re.sub(r'<footer class="op-footer">.*?</footer>', FOOT, s, count=1, flags=re.S)
    p.write_text(s)
    print("ok", stem)
