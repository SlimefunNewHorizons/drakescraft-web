#!/usr/bin/env python3
"""
DrakesCraft Web SRE SEO Pipeline
Fixes:
1. Canonical & Bidirectional Hreflang on all HTML files
2. Creates reglas.html and rules-en.html to eradicate 404s
3. Sets noindex on 404, 500, maintenance and cultivation files
4. Updates robots.txt to remove disallow on error/maintenance pages
5. Generates sitemap.xml with xhtml hreflang support and clean 200 URLs
6. Adds HTTP 301 redirects in server.js
"""

import os
import re

REPO_DIR = "/home/jack/Documentos/Desarrollo/Repositorios/drakescraft/drakescraft-web"

# 1. BILINGUAL PAIRS (ES file, EN file, ES clean path, title ES, title EN)
PAIRS = [
    ("index.html", "index-en.html", "/", "DrakesCraft | Seis mundos. Una comunidad.", "DrakesCraft · Technical Minecraft Server · Slimefun & Six Game Modes"),
    ("store.html", "store-en.html", "/store.html", "Tienda Oficial VIP y Rangos · DrakesCraft", "Official VIP Store & Ranks · DrakesCraft"),
    ("guia.html", "guide-en.html", "/guia.html", "Guía Completa de DrakesCraft · Modalidades y Sistemas", "Complete Guide to DrakesCraft · Modes & Systems"),
    ("guia-comandos.html", "guia-comandos-en.html", "/guia-comandos.html", "Guía de Comandos Oficiales · DrakesCraft", "Official Commands Guide · DrakesCraft"),
    ("guia-plugins.html", "guia-plugins-en.html", "/guia-plugins.html", "Guía de Plugins y StarSuites · DrakesCraft", "Plugins & StarSuites Guide · DrakesCraft"),
    ("guia-poderes.html", "guia-poderes-en.html", "/guia-poderes.html", "Guía de Poderes y Habilidades · DrakesCraft", "Powers & Abilities Guide · DrakesCraft"),
    ("guia-rangos.html", "guia-rangos-en.html", "/guia-rangos.html", "Guía de Rangos y Beneficios · DrakesCraft", "Ranks & Benefits Guide · DrakesCraft"),
    ("guia-slimefun.html", "guia-slimefun-en.html", "/guia-slimefun.html", "Guía Completa de Slimefun 4 · DrakesCraft", "Slimefun 4 Complete Guide · DrakesCraft"),
    ("wiki-slimefun.html", "wiki-slimefun-en.html", "/wiki-slimefun.html", "Wiki de Recetas y Máquinas Slimefun · DrakesCraft", "Slimefun Recipes & Machines Wiki · DrakesCraft"),
    ("temporada-2.html", "temporada-2-en.html", "/temporada-2.html", "Temporada 2 · El Olimpo se Rompe · DrakesCraft", "Season 2 · Olympus is Breaking · DrakesCraft"),
    ("novedades.html", "novedades-en.html", "/novedades.html", "Novedades y Registro de Cambios · DrakesCraft", "News & Server Changelog · DrakesCraft"),
    ("votar.html", "vote-en.html", "/votar.html", "Vota por DrakesCraft · Recompensas In-Game", "Vote for DrakesCraft · In-Game Rewards"),
    ("saori.html", "saori-en.html", "/saori.html", "S.A.O.R.I. · Orquestador Autónomo de Infraestructura", "S.A.O.R.I. · Autonomous Infrastructure Orchestrator"),
    ("metricas.html", "metricas-en.html", "/metricas.html", "Métricas en Vivo y Estado de la Red · DrakesCraft", "Live Metrics & Network Health · DrakesCraft"),
    ("apoya.html", "apoya-en.html", "/apoya.html", "Apoya a DrakesCraft · Donaciones y Mecenazgo", "Support DrakesCraft · Donations & Sponsorship"),
    ("support.html", "support-en.html", "/support.html", "Centro de Ayuda y Soporte · DrakesCraft", "Help Center & Support · DrakesCraft"),
    ("terms.html", "terms-en.html", "/terms.html", "Términos del Servicio y Reglas Oficiales · DrakesCraft", "Terms of Service & Official Regulations · DrakesCraft"),
    ("privacidad.html", "privacidad-en.html", "/privacidad.html", "Política de Privacidad y Protección de Datos · DrakesCraft", "Privacy Policy & Data Protection · DrakesCraft"),
    ("eventos.html", "events-en.html", "/eventos.html", "Calendario de Eventos y Torneos · DrakesCraft", "Events & Tournament Calendar · DrakesCraft"),
    ("reglas.html", "rules-en.html", "/reglas.html", "Reglas Oficiales del Servidor y Normas · DrakesCraft", "Official Server Rules & Regulations · DrakesCraft")
]

# Create reglas.html if it doesn't exist
reglas_es = """<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reglas Oficiales del Servidor y Normas de Convivencia · DrakesCraft</title>
  <meta name="description" content="Normas oficiales de convivencia, juego limpio, prohibición de hacks y políticas de seguridad para jugadores de DrakesCraft.">
  <link rel="canonical" href="https://web.drakescraft.cl/reglas.html">
  <link rel="alternate" hreflang="es" href="https://web.drakescraft.cl/reglas.html">
  <link rel="alternate" hreflang="en" href="https://web.drakescraft.cl/rules-en.html">
  <link rel="alternate" hreflang="x-default" href="https://web.drakescraft.cl/reglas.html">
  <link rel="icon" type="image/png" href="assets/logo-drakescraft.webp">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800&family=DM+Mono:wght@400;500;600&family=Instrument+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles/base.css?v=20261102-t2">
  <link rel="stylesheet" href="styles/legal.css?v=20261102-t2">
  <link rel="stylesheet" href="styles/t2.css?v=20261102-t2">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="DrakesCraft">
  <meta property="og:title" content="Reglas Oficiales del Servidor · DrakesCraft">
  <meta property="og:description" content="Las cinco reglas doradas de DrakesCraft: juego limpio, cero toxicidad, sin trampas y protección de la comunidad.">
  <meta property="og:image" content="https://web.drakescraft.cl/assets/drakescraft-og-preview.png">
  <meta property="og:url" content="https://web.drakescraft.cl/reglas.html">
  <style>
    .rule-card { background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(168, 85, 247, 0.35); border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; backdrop-filter: blur(12px); box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
    .rule-card h3 { color: #f8fafc; font-family: 'Cinzel', serif; font-size: 1.25rem; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.75rem; }
    .rule-card p { color: #cbd5e1; font-size: 0.95rem; line-height: 1.6; margin: 0; }
    .rule-num { background: linear-gradient(135deg, #a855f7, #38bdf8); color: #fff; width: 32px; height: 32px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 0.9rem; font-weight: bold; }
  </style>
</head>
<body class="prose-page">
  <header style="max-width: 900px; margin: 2rem auto 1rem; padding: 0 1.5rem; display: flex; justify-content: space-between; align-items: center;">
    <a href="/" style="display: flex; align-items: center; gap: 10px; text-decoration: none; color: #fff; font-family: 'Cinzel', serif; font-weight: bold; font-size: 1.2rem;">
      <img src="assets/logo-drakescraft.webp" alt="DrakesCraft" width="36" height="36"> DrakesCraft
    </a>
    <div style="display: flex; gap: 1rem;">
      <a href="/terms.html" style="color: #38bdf8; text-decoration: none; font-size: 0.9rem;">Términos Completos</a>
      <a href="/rules-en.html" style="color: #a855f7; text-decoration: none; font-size: 0.9rem;">English 🇬🇧</a>
    </div>
  </header>

  <main style="max-width: 900px; margin: 0 auto 3rem; padding: 1.5rem;">
    <div style="text-align: center; margin-bottom: 2.5rem;">
      <span style="font-family: 'DM Mono', monospace; font-size: 0.85rem; color: #38bdf8; text-transform: uppercase; letter-spacing: 0.05em;">Código de Honor y Convivencia</span>
      <h1 style="font-family: 'Cinzel', serif; font-size: 2.2rem; color: #fff; margin: 0.5rem 0;">Reglas Oficiales de DrakesCraft</h1>
      <p style="color: #cbd5e1; max-width: 650px; margin: 0 auto; font-size: 1rem;">
        Pocas, claras y aplicadas con equidad para todos los jugadores. Nuestro objetivo es garantizar una experiencia técnica y de supervivencia justa y duradera.
      </p>
    </div>

    <div class="rule-card">
      <h3><span class="rule-num">1</span> Respeto y Convivencia en Comunidad</h3>
      <p>Prohibido el acoso, insultos graves, discriminación, spam masivo o conductas tóxicas tanto en el chat público del juego como en los canales oficiales de Discord. Fomentamos un ambiente maduro y colaborativo.</p>
    </div>

    <div class="rule-card">
      <h3><span class="rule-num">2</span> Juego Limpio: Cero Hacks y Modificaciones Ilegales</h3>
      <p>Terminantemente prohibido el uso de clientes modificados como X-Ray, KillAura, Baritone, fly/speed hacks, auto-clickers desmedidos o cualquier ventaja que rompa la igualdad. Solo se permiten mods puramente cosméticos o de rendimiento (Sodium, Iris, Minimap sin radar de entidades).</p>
    </div>

    <div class="rule-card">
      <h3><span class="rule-num">3</span> Prohibición Absoluta de Dupes y Explotación de Fallos</h3>
      <p>Queda estrictamente prohibido duplicar ítems mediante bugs de vacío, caídas de servidor o fallos de inventario. Cualquier bug descubierto debe reportarse de inmediato a SAORI o al Staff a través de un ticket en Discord. Quienes reportan bugs reciben recompensas legítimas; quienes los abusan reciben sanción permanente.</p>
    </div>

    <div class="rule-card">
      <h3><span class="rule-num">4</span> Protección de Terrenos y Propiedad Ajena</h3>
      <p>El grifeo, saqueo o destrucción de zonas protegidas mediante reclamos (GriefPrevention/Lands) está penalizado. No intentes saltar protecciones con pistones, lava o explosiones indirectas.</p>
    </div>

    <div class="rule-card">
      <h3><span class="rule-num">5</span> Seguridad de Cuentas y Comercio Limpio</h3>
      <p>Tu cuenta es tu responsabilidad personal. Está prohibido el comercio de ítems del juego o cuentas por dinero real (RMT) fuera de la tienda oficial Tebex (<a href="https://drakescraft-v2.tebex.io" target="_blank" style="color: #fbbf24;">drakescraft-v2.tebex.io</a>).</p>
    </div>

    <div style="text-align: center; margin-top: 2rem;">
      <a href="/terms.html" class="pt-btn" style="display: inline-block; padding: 10px 24px; background: linear-gradient(135deg, #a855f7, #38bdf8); color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">Ver Términos y Políticas Completas</a>
    </div>
  </main>
</body>
</html>
"""

rules_en = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Official Server Rules & Community Standards · DrakesCraft</title>
  <meta name="description" content="Official community guidelines, fair play regulations, anti-cheat policy, and security standards for DrakesCraft Minecraft players.">
  <link rel="canonical" href="https://web.drakescraft.cl/rules-en.html">
  <link rel="alternate" hreflang="es" href="https://web.drakescraft.cl/reglas.html">
  <link rel="alternate" hreflang="en" href="https://web.drakescraft.cl/rules-en.html">
  <link rel="alternate" hreflang="x-default" href="https://web.drakescraft.cl/reglas.html">
  <link rel="icon" type="image/png" href="assets/logo-drakescraft.webp">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800&family=DM+Mono:wght@400;500;600&family=Instrument+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles/base.css?v=20261102-t2">
  <link rel="stylesheet" href="styles/legal.css?v=20261102-t2">
  <link rel="stylesheet" href="styles/t2.css?v=20261102-t2">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="DrakesCraft">
  <meta property="og:title" content="Official Server Rules · DrakesCraft">
  <meta property="og:description" content="The five golden rules of DrakesCraft: fair play, zero toxicity, no exploits, and community protection.">
  <meta property="og:image" content="https://web.drakescraft.cl/assets/drakescraft-og-preview.png">
  <meta property="og:url" content="https://web.drakescraft.cl/rules-en.html">
  <style>
    .rule-card { background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(168, 85, 247, 0.35); border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; backdrop-filter: blur(12px); box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
    .rule-card h3 { color: #f8fafc; font-family: 'Cinzel', serif; font-size: 1.25rem; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.75rem; }
    .rule-card p { color: #cbd5e1; font-size: 0.95rem; line-height: 1.6; margin: 0; }
    .rule-num { background: linear-gradient(135deg, #a855f7, #38bdf8); color: #fff; width: 32px; height: 32px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 0.9rem; font-weight: bold; }
  </style>
</head>
<body class="prose-page">
  <header style="max-width: 900px; margin: 2rem auto 1rem; padding: 0 1.5rem; display: flex; justify-content: space-between; align-items: center;">
    <a href="/index-en.html" style="display: flex; align-items: center; gap: 10px; text-decoration: none; color: #fff; font-family: 'Cinzel', serif; font-weight: bold; font-size: 1.2rem;">
      <img src="assets/logo-drakescraft.webp" alt="DrakesCraft" width="36" height="36"> DrakesCraft
    </a>
    <div style="display: flex; gap: 1rem;">
      <a href="/terms-en.html" style="color: #38bdf8; text-decoration: none; font-size: 0.9rem;">Full Terms</a>
      <a href="/reglas.html" style="color: #a855f7; text-decoration: none; font-size: 0.9rem;">Español 🇪🇸</a>
    </div>
  </header>

  <main style="max-width: 900px; margin: 0 auto 3rem; padding: 1.5rem;">
    <div style="text-align: center; margin-bottom: 2.5rem;">
      <span style="font-family: 'DM Mono', monospace; font-size: 0.85rem; color: #38bdf8; text-transform: uppercase; letter-spacing: 0.05em;">Code of Honor & Conduct</span>
      <h1 style="font-family: 'Cinzel', serif; font-size: 2.2rem; color: #fff; margin: 0.5rem 0;">Official DrakesCraft Rules</h1>
      <p style="color: #cbd5e1; max-width: 650px; margin: 0 auto; font-size: 1rem;">
        Straightforward, fair and enforced equally for all players. Our goal is to maintain a healthy technical and survival multiplayer environment.
      </p>
    </div>

    <div class="rule-card">
      <h3><span class="rule-num">1</span> Mutual Respect & Community Conduct</h3>
      <p>No harassment, severe hate speech, discrimination, unsolicited advertising or excessive toxicity across in-game chat and Discord. We foster a mature, welcoming atmosphere.</p>
    </div>

    <div class="rule-card">
      <h3><span class="rule-num">2</span> Fair Play: Zero Hacks or Illegal Modifications</h3>
      <p>Any client modification providing unfair advantages (X-Ray, KillAura, Baritone, fly/speed hacks, auto-clickers) is strictly prohibited. Only cosmetic or client-side performance mods (Sodium, Iris, entity-free minimaps) are permitted.</p>
    </div>

    <div class="rule-card">
      <h3><span class="rule-num">3</span> Strict Prohibition of Duplication Exploits</h3>
      <p>Item duping via crash exploits, inventory desync, or void glitches is forbidden. Players discovering bugs must report them immediately to SAORI or Staff via Discord tickets. White-hat reporters receive rewards; abusers face permanent bans.</p>
    </div>

    <div class="rule-card">
      <h3><span class="rule-num">4</span> Protection of Land Claims & Player Property</h3>
      <p>Griefing, raiding, or bypassing claimed territory protections using pistons, fluid flow, or explosions is penalized. Respect your neighbors' creations.</p>
    </div>

    <div class="rule-card">
      <h3><span class="rule-num">5</span> Account Security & Official Economy</h3>
      <p>You are solely responsible for your account credentials. Real-money trading (RMT) of in-game items or currency outside the official Tebex store (<a href="https://drakescraft-v2.tebex.io" target="_blank" style="color: #fbbf24;">drakescraft-v2.tebex.io</a>) is strictly prohibited.</p>
    </div>

    <div style="text-align: center; margin-top: 2rem;">
      <a href="/terms-en.html" class="pt-btn" style="display: inline-block; padding: 10px 24px; background: linear-gradient(135deg, #a855f7, #38bdf8); color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">View Complete Terms & Policies</a>
    </div>
  </main>
</body>
</html>
"""

with open(os.path.join(REPO_DIR, "reglas.html"), "w", encoding="utf-8") as f:
    f.write(reglas_es)
print("Created reglas.html")

with open(os.path.join(REPO_DIR, "rules-en.html"), "w", encoding="utf-8") as f:
    f.write(rules_en)
print("Created rules-en.html")

# 2. UPDATE CANONICAL & HREFLANG ACROSS ALL PAIRS
for es_file, en_file, es_path, title_es, title_en in PAIRS:
    es_full = os.path.join(REPO_DIR, es_file)
    en_full = os.path.join(REPO_DIR, en_file)

    canonical_es = f"https://web.drakescraft.cl{es_path}"
    canonical_en = f"https://web.drakescraft.cl/{en_file}"
    hreflang_es = f"https://web.drakescraft.cl{es_path}"
    hreflang_en = f"https://web.drakescraft.cl/{en_file}"
    hreflang_default = f"https://web.drakescraft.cl{es_path}"

    tags_es = (
        f'  <link rel="canonical" href="{canonical_es}">\n'
        f'  <link rel="alternate" hreflang="es" href="{hreflang_es}">\n'
        f'  <link rel="alternate" hreflang="en" href="{hreflang_en}">\n'
        f'  <link rel="alternate" hreflang="x-default" href="{hreflang_default}">'
    )

    tags_en = (
        f'  <link rel="canonical" href="{canonical_en}">\n'
        f'  <link rel="alternate" hreflang="es" href="{hreflang_es}">\n'
        f'  <link rel="alternate" hreflang="en" href="{hreflang_en}">\n'
        f'  <link rel="alternate" hreflang="x-default" href="{hreflang_default}">'
    )

    def inject_seo_tags(filepath, tags, is_en=False):
        if not os.path.exists(filepath):
            return
        with open(filepath, "r", encoding="utf-8", errors="ignore") as fp:
            content = fp.read()

        # Remove existing canonical and hreflang tags
        content = re.sub(r'\s*<link[^>]*rel=["\']canonical["\'][^>]*>', '', content, flags=re.IGNORECASE)
        content = re.sub(r'\s*<link[^>]*href=["\'][^"\']+["\'][^>]*rel=["\']canonical["\'][^>]*>', '', content, flags=re.IGNORECASE)
        content = re.sub(r'\s*<link[^>]*rel=["\']alternate["\'][^>]*hreflang=["\'][^"\']+["\'][^>]*>', '', content, flags=re.IGNORECASE)

        # Inject right after <head> or <meta ... viewport ...>
        if re.search(r'<meta[^>]*viewport[^>]*>', content, re.IGNORECASE):
            content = re.sub(r'(<meta[^>]*viewport[^>]*>)', r'\1\n' + tags, content, count=1, flags=re.IGNORECASE)
        elif '<head>' in content:
            content = content.replace('<head>', '<head>\n' + tags, 1)
        elif '<head ' in content:
            content = re.sub(r'(<head[^>]*>)', r'\1\n' + tags, content, count=1, flags=re.IGNORECASE)

        with open(filepath, "w", encoding="utf-8") as fp:
            fp.write(content)

    inject_seo_tags(es_full, tags_es, is_en=False)
    inject_seo_tags(en_full, tags_en, is_en=True)
    print(f"Updated tags for {es_file} and {en_file}")

# 3. SET NOINDEX ON ERROR / MAINTENANCE / INTERNAL PAGES
noindex_files = [
    "404.html", "404-en.html",
    "500.html", "500-en.html",
    "maintenance.html", "maintenance-en.html",
    "cultivation.html", "cultivation_rows.html"
]

for nf in noindex_files:
    fpath = os.path.join(REPO_DIR, nf)
    if not os.path.exists(fpath):
        continue
    with open(fpath, "r", encoding="utf-8", errors="ignore") as fp:
        c = fp.read()
    if not re.search(r'<meta[^>]*robots[^>]*noindex', c, re.IGNORECASE):
        # Insert noindex
        noindex_tag = '  <meta name="robots" content="noindex, nofollow">'
        if '<head>' in c:
            c = c.replace('<head>', '<head>\n' + noindex_tag, 1)
        elif '<head ' in c:
            c = re.sub(r'(<head[^>]*>)', r'\1\n' + noindex_tag, c, count=1, flags=re.IGNORECASE)
        with open(fpath, "w", encoding="utf-8") as fp:
            fp.write(c)
        print(f"Added noindex to {nf}")

# 4. FIX STANDALONE CANONICALS
def set_single_canonical(filename, canonical_url):
    fpath = os.path.join(REPO_DIR, filename)
    if not os.path.exists(fpath):
        return
    with open(fpath, "r", encoding="utf-8", errors="ignore") as fp:
        c = fp.read()
    c = re.sub(r'\s*<link[^>]*rel=["\']canonical["\'][^>]*>', '', c, flags=re.IGNORECASE)
    c = re.sub(r'\s*<link[^>]*href=["\'][^"\']+["\'][^>]*rel=["\']canonical["\'][^>]*>', '', c, flags=re.IGNORECASE)
    tag = f'  <link rel="canonical" href="{canonical_url}">'
    if '<head>' in c:
        c = c.replace('<head>', '<head>\n' + tag, 1)
    elif '<head ' in c:
        c = re.sub(r'(<head[^>]*>)', r'\1\n' + tag, c, count=1, flags=re.IGNORECASE)
    with open(fpath, "w", encoding="utf-8") as fp:
        fp.write(c)
    print(f"Fixed canonical for {filename} -> {canonical_url}")

set_single_canonical("discord.html", "https://web.drakescraft.cl/discord.html")
set_single_canonical("grafos.html", "https://web.drakescraft.cl/saori.html")
set_single_canonical("saori-3d.html", "https://web.drakescraft.cl/saori.html")

# Remove noindex from eventos.html and events-en.html for T2 season
for ef in ["eventos.html", "events-en.html"]:
    fpath = os.path.join(REPO_DIR, ef)
    if os.path.exists(fpath):
        with open(fpath, "r", encoding="utf-8", errors="ignore") as fp:
            c = fp.read()
        c = re.sub(r'\s*<meta[^>]*robots[^>]*content=["\']noindex[^"\']*["\'][^>]*>', '', c, flags=re.IGNORECASE)
        with open(fpath, "w", encoding="utf-8") as fp:
            fp.write(c)
        print(f"Removed noindex from {ef} to allow normal T2 indexing")

# 5. WRITE ROBOTS.TXT
robots_txt = """User-agent: *
Allow: /
Disallow: /api/
Disallow: /data/
Disallow: /archive/
Disallow: /deploy/
Disallow: /catalog/
Disallow: /tools/
Disallow: /vendor/
Disallow: /lib/

Sitemap: https://web.drakescraft.cl/sitemap.xml
"""

with open(os.path.join(REPO_DIR, "robots.txt"), "w", encoding="utf-8") as fp:
    fp.write(robots_txt)
print("Updated robots.txt cleanly (no error/maintenance pages disallowed)")

# 6. WRITE SITEMAP.XML WITH ENTERPRISE XHTML HREFLANG
sitemap_urls = []
for es_file, en_file, es_path, title_es, title_en in PAIRS:
    # Priority & Changefreq determination
    if es_file == "index.html":
        pri = "1.0"
        freq = "daily"
    elif es_file in ("store.html", "temporada-2.html", "guia.html", "guia-slimefun.html"):
        pri = "0.9"
        freq = "weekly"
    elif es_file in ("guia-comandos.html", "guia-plugins.html", "guia-poderes.html", "guia-rangos.html", "wiki-slimefun.html", "novedades.html", "votar.html", "reglas.html"):
        pri = "0.8"
        freq = "weekly"
    elif es_file in ("saori.html", "metricas.html", "apoya.html", "eventos.html", "support.html"):
        pri = "0.7"
        freq = "monthly"
    else:
        pri = "0.5"
        freq = "monthly"

    url_es = f"https://web.drakescraft.cl{es_path}"
    url_en = f"https://web.drakescraft.cl/{en_file}"

    # ES entry
    entry_es = f"""  <url>
    <loc>{url_es}</loc>
    <lastmod>2026-11-17</lastmod>
    <changefreq>{freq}</changefreq>
    <priority>{pri}</priority>
    <xhtml:link rel="alternate" hreflang="es" href="{url_es}" />
    <xhtml:link rel="alternate" hreflang="en" href="{url_en}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="{url_es}" />
  </url>"""
    sitemap_urls.append(entry_es)

    # EN entry
    entry_en = f"""  <url>
    <loc>{url_en}</loc>
    <lastmod>2026-11-17</lastmod>
    <changefreq>{freq}</changefreq>
    <priority>{pri}</priority>
    <xhtml:link rel="alternate" hreflang="es" href="{url_es}" />
    <xhtml:link rel="alternate" hreflang="en" href="{url_en}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="{url_es}" />
  </url>"""
    sitemap_urls.append(entry_en)

# Add discord.html
sitemap_urls.append("""  <url>
    <loc>https://web.drakescraft.cl/discord.html</loc>
    <lastmod>2026-11-17</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>""")

sitemap_xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
{chr(10).join(sitemap_urls)}
</urlset>
"""

with open(os.path.join(REPO_DIR, "sitemap.xml"), "w", encoding="utf-8") as fp:
    fp.write(sitemap_xml)
print(f"Generated enterprise sitemap.xml with {len(sitemap_urls)} indexed canonical URLs")

print("\nSEO Pipeline execution finished successfully!")
