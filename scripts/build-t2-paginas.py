#!/usr/bin/env python3
"""Genera temporada-2(-en).html y guia-poderes(-en).html. Edita aquí, no en el HTML.
Datos: catalog/svm_powers.json (scripts/extraer-svm.py) y catalog/svm_powers_es.json.
Uso: python3 -I scripts/build-t2-paginas.py"""
import html, json, re
from pathlib import Path

R = Path(__file__).resolve().parents[1]
V = "20261106-olimpo"
GEYSER = "https://download.geysermc.org/v2/projects/geyser/versions/latest/builds/latest/downloads/spigot"
FLOODGATE = "https://download.geysermc.org/v2/projects/floodgate/versions/latest/builds/latest/downloads/spigot"
data = json.loads((R / "catalog/svm_powers.json").read_text("utf8"))["powers"]
es = json.loads((R / "catalog/svm_powers_es.json").read_text("utf8"))
e = html.escape


def chrome(lang):
    src = (R / ("guia-rangos.html" if lang == "es" else "guia-rangos-en.html")).read_text("utf8")
    nav = re.search(r'<nav class="site-nav".*?</nav>', src, re.S).group(0).replace(' class="active"', "")
    foot = re.search(r"<footer class=\"site-footer\">.*?</footer>", src, re.S).group(0)
    return nav, foot


def page(lang, slug, alt, section, title, desc, heading, glitch, eyebrow, lead, strip, body):
    nav, foot = chrome(lang)
    skip = "Saltar al contenido" if lang == "es" else "Skip to content"
    this_es, this_en = (slug, alt) if lang == "es" else (alt, slug)
    bar = (f'<a class="lang-btn{" is-active" if lang == "es" else ""}" href="{this_es}">ES</a>'
           f'<a class="lang-btn{" is-active" if lang == "en" else ""}" href="{this_en}">EN</a>')
    nav = re.sub(r'(<div class="lang-switcher">).*?(</div>)', lambda m: m[1] + bar + m[2], nav, flags=re.S)
    return f"""<!doctype html>
<html lang="{lang}">
<head>
  <!-- Generado por scripts/build-t2-paginas.py: no editar a mano. -->
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{e(title)}</title>
  <meta name="description" content="{e(desc)}">
  <link rel="canonical" href="https://web.drakescraft.cl/{slug}">
  <link rel="alternate" hreflang="es" href="https://web.drakescraft.cl/{this_es}">
  <link rel="alternate" hreflang="en" href="https://web.drakescraft.cl/{this_en}">
  <link rel="icon" type="image/png" href="assets/logo-drakescraft.webp">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800&family=DM+Mono:wght@400;500&family=Instrument+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles/base.css?v=20261102-t2">
  <link rel="stylesheet" href="styles/guia.css?v=20261102-t2">
  <link rel="stylesheet" href="styles/t2.css?v=20261102-t2">
  <link rel="stylesheet" href="styles/t2-olimpo.css?v={V}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="DrakesCraft">
  <meta property="og:title" content="{e(title)}">
  <meta property="og:description" content="{e(desc)}">
  <meta property="og:image" content="https://web.drakescraft.cl/assets/drakescraft-og-preview.png">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="manifest" href="/site.webmanifest">
  <link rel="stylesheet" href="styles/seasonal-themes.css?v=20261017-v7">
</head>
<body class="page-shell ol-page" data-page="guia" data-section="{section}">
  <a class="skip-link" href="#main-content">{skip}</a>
  {nav}
  <main id="main-content">
    <header class="guide-hero">
      <div class="guide-hero__backdrop" aria-hidden="true"></div>
      <div class="container guide-hero__grid">
        <p class="eyebrow">{eyebrow}</p>
        <h1 class="t2-glitch-title" data-glitch="{e(glitch)}">{heading}</h1>
        <p class="guide-hero__lead">{lead}</p>
        <div class="t2-hud-strip">{strip}</div>
      </div>
    </header>
{body}
  </main>
  {foot}
  <script src="scripts/site.js?v=20261017-v7"></script>
</body>
</html>
"""

# Láminas: assets/svg/t2/<clave>.svg (generadas con tools/gen_laminas_t2.py).


def plate(key, cap, aria, wide=False):
    cls = " ol-plate--wide" if wide else ""
    return (f'<figure class="ol-plate ol-plate--{key}{cls}" role="img" aria-label="{e(aria)}">'
            f'<img class="ol-plate__art" src="/assets/svg/t2/{key}.svg" alt="" width="800" height="500" loading="lazy" decoding="async">'
            f'<div class="ol-plate__photo"></div><figcaption>{cap}</figcaption></figure>')


def chapter(key, numeral, cap, aria, title, paras, fact):
    ps = "".join(f"<p>{p}</p>" for p in paras)
    return (f'<section class="ol-chapter" id="{key}">{plate(key, cap, aria)}<div><p class="ol-kicker">{numeral}</p>'
            f'<h2>{title}</h2>{ps}<p class="ol-chapter__fact">{fact}</p></div></section>')


def temporada(lang):
    if lang == "es":
        pro = ["Nadie recuerda qué se rompió primero. Unos dicen que fue la luna. Otros, que el Olimpo llevaba siglos flotando sobre una mentira y solo faltaba que alguien mirara hacia abajo.",
               "Lo cierto es esto: la isla de los dioses sigue en el aire, pero ya no les pertenece. El End sube por sus heridas, el mármol se vuelve púrpura y, sobre la fuente donde los mortales eligen su destino, cuelga una máquina que nadie admite haber construido.",
               "Aquí empieza la Temporada 2. No en un mundo lejano: en el primer lugar que pisas."]
        caps = [
            ("grieta", "Canto I", "La Grieta", "Espacio para una foto de La Grieta abierta en el prado del sureste", "La Grieta",
             ["Partió el prado del sureste en tres ramas y siguió subiendo hasta el pie del templo mayor. La esquina del templo ya cedió: revienta hacia el abismo, y por el hueco se ve lo que hay debajo.",
              "De sus bordes brotan agujas del End. Alrededor, la tierra se corrompe. Las nubes lo cuentan mejor que nadie: oro divino al norte, púrpura al sur."],
             "En el lobby: sigue su borde desde el prado hasta el templo mayor."),
            ("atlas", "Canto II", "Atlas", "Espacio para una foto del titán Atlas sosteniendo la luna rota", "Atlas no suelta",
             ["Lo condenaron a sostener el cielo. Cuando el cielo se rompió, nadie vino a decirle que podía parar.",
              "Sigue ahí, sobre el prado sur, con la coraza dorada y la capa morada hecha jirones, cargando sobre los hombros una luna del End partida. Si cede, caerá sobre todo lo que queda."],
             "En el lobby: míralo desde el templo mayor, con la luna encima."),
            ("anticitera", "Canto III", "La Anticitera", "Espacio para una foto del mecanismo de la Anticitera sobre la fuente", "La Anticitera",
             ["Anillos de oro, dientes rotos, engranajes que ya no engranan. Predecía los eclipses y los juegos; ahora cuelga sobre la fuente como un reloj que se niega a admitir la hora.",
              "Justo debajo, los viajeros eligen modalidad sin mirar arriba. Quizá sea mejor así."],
             "En el lobby: cuelga sobre la fuente, por encima de los NPC."),
            ("duga", "Canto IV", "El radar", "Espacio para una foto del radar tipo Duga y las antenas parabólicas", "Algo está escuchando",
             ["Nada en el Olimpo debería tener antenas. Y sin embargo, sobre el prado del este se levanta un muro de celosía negra y oro, como el radar Duga, flanqueado por parábolas que apuntan a la nada.",
              "Por los caminos corre un circuito dorado sobre piedra negra, y unos pilones lo alimentan. Alguien convirtió la montaña sagrada en una estación de escucha. No sabemos qué oyó."],
             "En el lobby: el muro de antenas domina el prado este."),
            ("wither", "Canto V", "Wither Storm", "Espacio para una foto del Wither Storm", "Lo que respondió",
             ["Dicen que un mundo que grita acaba siendo oído. El Wither Storm no es una leyenda de esta temporada: es lo que devora al que se confía, y crece.",
              "Los dioses no lo mencionan. Los que han bajado a los mundos, sí."],
             "En la T2: el datapack Wither Storm está activo en el servidor."),
            ("coliseo", "Canto VI", "El Coliseo", "Espacio para una foto del coliseo PvP con su corona rota", "El Coliseo sigue abierto",
             ["Se les cae el cielo y siguen peleando. El coliseo perdió la corona, pero la arena y las gradas siguen intactas.",
              "Cuando los dioses ya no juzgan, solo queda el PvP para saber quién tenía razón."],
             "En el lobby: el coliseo PvP está al este, con su corona rota."),
            ("islas", "Canto VII", "Islas a la deriva", "Espacio para una foto de las islas de warps flotando", "Lo que se desprendió",
             ["Trozos de isla se alejan arrastrando ruinas y raíces. Los mortales, prácticos, se instalaron igual.",
              "Cuatro de ellas sirven de paso: <strong>Protecciones</strong>, <strong>Crates</strong>, <strong>Votar</strong> y <strong>Tienda</strong>. Bajo todas, y bajo el Olimpo mismo, cuelga la montaña invertida de la que fueron arrancadas."],
             "En el lobby: cada isla tiene su propio warp."),
        ]
        cta = '<a class="is-main" href="guia-poderes.html">Aprende a usar tu poder</a><a href="guia.html#temporada-2">Ficha técnica de la T2</a><a href="https://discord.gg/rv3vtXZTk7" target="_blank" rel="noopener">Sigue la reapertura en Discord</a>'
        hero = plate("olimpo", "El Olimpo", "Espacio para una panorámica del lobby Olimpo en colapso", True)
        return page("es", "temporada-2.html", "temporada-2-en.html", "olimpo", "Olimpo en colapso · Temporada 2 | DrakesCraft",
                    "La historia de la Temporada 2 de DrakesCraft: una isla griega flotante, La Grieta, el titán Atlas, la Anticitera, el radar, el Wither Storm y el coliseo.",
                    'El Olimpo ya<br>no se <em>sostiene</em>', "El Olimpo ya no se sostiene", "Temporada 2 · Olimpo en colapso",
                    "El cielo de los dioses se partió. Una isla griega flota sobre el vacío, La Grieta le abre el costado y el End sube por sus heridas.",
                    "<span><strong>ESTADO</strong> T2 en pruebas · Solo staff</span><span><b>REAPERTURA</b> Prevista el 18 de noviembre · por confirmar en Discord</span>",
                    f'    <div class="container">{hero}</div>\n    <div class="ol-prologue">{"".join(f"<p>{p}</p>" for p in pro)}</div>\n    <div class="container">\n'
                    + "\n".join(chapter(*c) for c in caps)
                    + f'\n      <div class="ol-cta">{cta}</div>\n    </div>')
    pro = ["No one remembers what broke first. Some say the moon. Others say Olympus had been floating on a lie for centuries, and it only took someone looking down.",
           "What is certain is this: the island of the gods is still in the air, but it no longer belongs to them. The End climbs through its wounds, marble turns purple, and above the fountain where mortals choose their fate hangs a machine no one admits to building.",
           "Season 2 starts here. Not in some distant world: in the first place you set foot."]
    caps = [
        ("grieta", "Canto I", "The Rift", "Space for a photo of the Rift opening across the southeast meadow", "The Rift",
         ["It split the southeast meadow into three branches and kept climbing to the foot of the great temple. The temple's corner has already given way, bursting toward the abyss, and through the gap you can see what lies below.",
          "End spires sprout from its edges. Around it, the ground rots. The clouds tell it best: divine gold to the north, purple to the south."],
         "In the lobby: follow its edge from the meadow up to the great temple."),
        ("atlas", "Canto II", "Atlas", "Space for a photo of the titan Atlas holding up the broken moon", "Atlas won't let go",
         ["They condemned him to hold up the sky. When the sky broke, no one came to tell him he could stop.",
          "He is still there above the south meadow, golden cuirass, purple cape in tatters, carrying a shattered End moon on his shoulders. If he gives way, it falls on everything that is left."],
         "In the lobby: see him from the great temple, moon overhead."),
        ("anticitera", "Canto III", "The Antikythera", "Space for a photo of the Antikythera mechanism above the fountain", "The Antikythera",
         ["Gold rings, broken teeth, gears that no longer mesh. It once predicted eclipses and games; now it hangs above the fountain like a clock refusing to admit the hour.",
          "Right below it, travelers pick their gamemode without looking up. Perhaps that is for the best."],
         "In the lobby: it hangs above the fountain, over the NPCs."),
        ("duga", "Canto IV", "The radar", "Space for a photo of the Duga-style radar and the dish antennas", "Something is listening",
         ["Nothing on Olympus should have antennas. And yet over the east meadow rises a wall of black and gold lattice, like the Duga radar, flanked by dishes aimed at nothing.",
          "A golden circuit runs along the paths over black stone, fed by pylons. Someone turned the sacred mountain into a listening post. We don't know what it heard."],
         "In the lobby: the antenna wall towers over the east meadow."),
        ("wither", "Canto V", "Wither Storm", "Space for a photo of the Wither Storm", "What answered",
         ["They say a world that screams ends up being heard. The Wither Storm is no legend this season: it devours the careless, and it grows.",
          "The gods don't mention it. Those who have gone down to the worlds do."],
         "In S2: the Wither Storm datapack is active on the server."),
        ("coliseo", "Canto VI", "The Colosseum", "Space for a photo of the PvP colosseum with its broken crown", "The Colosseum stays open",
         ["The sky is falling and they are still fighting. The colosseum lost its crown, but the arena and the stands remain intact.",
          "When the gods no longer judge, only PvP is left to settle who was right."],
         "In the lobby: the PvP colosseum lies to the east, crown broken."),
        ("islas", "Canto VII", "Drifting islands", "Space for a photo of the floating warp islands", "What broke away",
         ["Chunks of island drift off dragging ruins and roots. The mortals, practical as ever, moved in anyway.",
          "Four of them serve as stops: <strong>Protections</strong>, <strong>Crates</strong>, <strong>Vote</strong> and <strong>Store</strong>. Below them all, and below Olympus itself, hangs the inverted mountain they were torn from."],
         "In the lobby: each island has its own warp."),
    ]
    cta = '<a class="is-main" href="guia-poderes-en.html">Learn to use your power</a><a href="guide-en.html#season-2">Season 2 technical brief</a><a href="https://discord.gg/rv3vtXZTk7" target="_blank" rel="noopener">Follow the reopening on Discord</a>'
    hero = plate("olimpo", "Olympus", "Space for a panorama of the Olympus in Collapse lobby", True)
    return page("en", "temporada-2-en.html", "temporada-2.html", "olimpo", "Olympus in Collapse · Season 2 | DrakesCraft",
                "The story of DrakesCraft Season 2: a floating Greek island, the Rift, the titan Atlas, the Antikythera, the radar, the Wither Storm and the colosseum.",
                'Olympus can no<br>longer <em>hold</em>', "Olympus can no longer hold", "Season 2 · Olympus in Collapse",
                "The sky of the gods has split. A Greek island floats over the void, the Rift tears open its side, and the End climbs through its wounds.",
                "<span><strong>STATUS</strong> S2 in testing · Staff only</span><span><b>REOPENING</b> Planned for November 18 · to be confirmed on Discord</span>",
                f'    <div class="container">{hero}</div>\n    <div class="ol-prologue">{"".join(f"<p>{p}</p>" for p in pro)}</div>\n    <div class="container">\n'
                + "\n".join(chapter(*c) for c in caps)
                + f'\n      <div class="ol-cta">{cta}</div>\n    </div>')


def segs(cds):
    f = lambda t: f"{t / 20:g}".replace(".", ",")
    return "—" if not cds else (f"{f(cds[0])} s" if len(cds) == 1 else f"{f(cds[0])}–{f(cds[-1])} s")


def use_es(u):
    if not u or u == "None":
        return "—"
    if u in es["use"]:
        return es["use"][u]
    m = re.fullmatch(r"Requires (\d+) mana(?:, (charging drains(?: mana)?|holding drains|drains))?", u)
    if m:
        extra = {"charging drains": ", cargar drena", "charging drains mana": ", cargar drena", "holding drains": ", mantener drena", "drains": ", drena", None: ""}[m[2]]
        return f"{m[1]} de maná{extra}" if m[1] != "0" else "Sin maná"
    raise SystemExit(f"Falta traducir: {u}")


def unlock_txt(a, lang):
    req, cost = a["req"], a["unlock"]
    if req:
        m = re.search(r"and (\d+) Ability", req)
        if lang == "es":
            return "Comerciantes de Paradise" + (f" y {m[1]} puntos" if m else "")
        return req.replace("Unlock from ", "")
    m = re.search(r"Unlock by visiting (.+?) Climate", a["desc"] or "")
    if m:
        return f"Visit {m[1]} climate" if lang == "en" else f"Visitar clima {m[1]}"
    if a["desc"] and "Copy from" in a["desc"] or a["name"] in ("Poisonous Bite",):
        return "Copy it" if lang == "en" else "Copiándola"
    if cost == 0:
        return "Free" if lang == "en" else "Gratis"
    return f"{cost} pts"


def desc_en(a):
    d = (a["desc"] or "").replace("\\n\\n", " · ").replace("lenght", "length").strip(" ·")
    return re.sub(r"\s*·\s*Unlock by visiting .*$", "", d)


def powers(lang):
    h = {"es": ("Habilidad", "Coste según menú", "Cooldown base", "Desbloqueo", "Qué hace"), "en": ("Ability", "Cost per menu", "Base cooldown", "Unlock", "What it does")}[lang]
    out = []
    for pid, p in data.items():
        if not p["obtainable"]:
            continue
        name, flavor = es["powers"][pid] if lang == "es" else (p["name"], p["desc"])
        rows = []
        for a in p["abilities"]:
            d = es["abilities"][f"{pid}/{a['id']}"] if lang == "es" else desc_en(a)
            use = use_es(a["use"]) if lang == "es" else (a["use"] if a["use"] != "None" else "—")
            rows.append(f"<tr><td>{e(a['name'])}</td><td>{e(use)}</td><td>{segs(a['cooldown_ticks'])}</td><td>{e(unlock_txt(a, lang))}</td><td>{e(d)}</td></tr>")
        n = len(p["abilities"])
        sm = f"{p['name']} · {n} habilidades" if lang == "es" else f"{n} abilities"
        out.append(f'<details class="pw-power" id="poder-{pid}"><summary>{e(name)} <small>{e(sm)}</small></summary><p class="pw-power__desc">{e(flavor)}</p>'
                   f'<div class="pw-tablewrap"><table class="pw-table"><thead><tr>{"".join(f"<th>{x}</th>" for x in h)}</tr></thead><tbody>{"".join(rows)}</tbody></table></div></details>')
    return "\n".join(out)


def tbl(head, rows):
    return ('<div class="pw-tablewrap"><table class="pw-table"><thead><tr>' + "".join(f"<th>{x}</th>" for x in head) + "</tr></thead><tbody>"
            + "".join("<tr>" + "".join(f"<td>{c}</td>" for c in r) + "</tr>" for r in rows) + "</tbody></table></div>")


ING = {
 "es": [("Fuego","3 polvo de blaze, 5 lingotes de oro, 1 papel"),("Hielo","4 bloques de nieve, 2 lingotes de oro, 1 diamante, 1 cubo de agua, 1 papel"),("Agua","Con forma: 7 cubos de agua, papel al centro, corazón del mar abajo"),("Rayo","Herrería: plantilla bloque de oro, base papel, adición bloque de diamante"),("Slime","2 bloques de slime, 1 ojo de araña fermentado, 1 papel"),("Explosión","1 TNT, 2 cargas de fuego, 3 bloques de carbón, 2 bloques de magma, 1 papel"),("Gravedad","Cristales de prismarina, polvo de piedra luminosa, fragmento de amatista, bloque de redstone, de lapislázuli y de esmeralda, papel"),("Arpía","3 plumas, 2 membranas de phantom, 3 patas de conejo, 1 papel"),("Viajero Dimensional","Corazón del mar, fruta chorus reventada, fragmento de eco, ojo de ender, 4 fragmentos de amatista, papel"),("Vacío","1 lágrima de ghast, 2 perlas de ender, 1 obsidiana, 4 fragmentos de eco, 1 papel"),("Tiempo","Reloj, brújula de recuperación, perla de ender, disco 11, papel"),("Curación","4 manzanas doradas, 4 fragmentos de amatista, 1 papel"),("Muerte","4 redstone, rosa marchita, calavera de esqueleto, lingote de netherita, brújula, papel"),("Flora","Margarita, zanahoria, brote de roble, polvo de hueso, champiñón rojo, alga, bayas dulces, spore blossom, papel"),("Copia","Con forma: 7 diamantes, papel al centro, vidrio tintado abajo"),("Fase","No se craftea: se compra en las Clock Towers de Paradise")],
 "en": [("Fire","3 blaze powder, 5 gold ingots, 1 paper"),("Ice","4 snow blocks, 2 gold ingots, 1 diamond, 1 water bucket, 1 paper"),("Water","Shaped: 7 water buckets, paper in the center, heart of the sea at the bottom"),("Lightning","Smithing: gold block template, paper base, diamond block addition"),("Slime","2 slime blocks, 1 fermented spider eye, 1 paper"),("Explosion","1 TNT, 2 fire charges, 3 coal blocks, 2 magma blocks, 1 paper"),("Gravity","Prismarine crystals, glowstone dust, amethyst shard, redstone, lapis and emerald blocks, paper"),("Harpie","3 feathers, 2 phantom membranes, 3 rabbit feet, 1 paper"),("Dimension Traveler","Heart of the sea, popped chorus fruit, echo shard, eye of ender, 4 amethyst shards, paper"),("Void","1 ghast tear, 2 ender pearls, 1 obsidian, 4 echo shards, 1 paper"),("Time","Clock, recovery compass, ender pearl, music disc 11, paper"),("Healing","4 golden apples, 4 amethyst shards, 1 paper"),("Death","4 redstone, wither rose, skeleton skull, netherite ingot, compass, paper"),("Flora","Oxeye daisy, carrot, oak sapling, bone meal, red mushroom, kelp, sweet berries, spore blossom, paper"),("Copy","Shaped: 7 diamonds, paper in the center, tinted glass at the bottom"),("Phasing","Not craftable: bought in Paradise Clock Towers")],
}


def guia(lang):
    pw = powers(lang)
    if lang == "es":
        body = f"""    <div class="container">
      <nav class="guide-tabs" aria-label="Secciones de la guia"><a href="guia-comandos.html">Comandos</a><a href="guia.html">El servidor</a><a href="guia-rangos.html">Rangos</a><a href="guia-slimefun.html">Slimefun &amp; Addons</a><a href="guia-plugins.html">Plugins &amp; Suites</a><a href="guia-poderes.html" class="is-active">Poderes</a></nav>
      <section class="pw-section" id="empieza"><h2>Empieza aquí</h2>
        <ol class="pw-steps">
          <li><strong>Consigue Carne Dorada.</strong> Mata zombis (o husks, drowned y otros) hasta que suelte <em>Golden Flesh</em>. No hace falta ser op.</li>
          <li><strong>Cómela.</strong> Te da un poder al azar y ves el aviso <em>Obtained a Power!</em> Si prefieres elegir, craftea un pergamino.</li>
          <li><strong>Abre el menú.</strong> Escribe <code>/trigger svm_ep.menu</code>, entra en <em>Power Info</em> y desbloquea habilidades. Empiezas con 10 puntos.</li>
          <li><strong>Pon <em>Use Ability</em> en la mano izquierda.</strong> Es invisible a propósito. Te aparece solo en el inventario.</li>
          <li><strong>Elige un slot y mantén clic derecho.</strong> El slot de tu barra (1 a 9) decide qué habilidad se usa. Mira la barra de acción: muestra maná, habilidad y cooldown.</li>
        </ol>
      </section>
      <section class="pw-section" id="obtener"><h2>Cómo conseguir un poder</h2>
        <p>Solo se tiene un poder a la vez. El comando <code>/loot give ... svm_ep:items/power_chooser</code> es de administrador; como jugador normal hay dos vías:</p>
        <h3>1. Carne Dorada (poder al azar)</h3>
        <p>Es comida: se come normal. Sin poder, te asigna uno al azar entre los 16 disponibles. Si ya tienes poder, da de 1 a 3 puntos de habilidad.</p>
        {tbl(["Mob","Probabilidad sin Botín"],[["Caballo zombi","8%"],["Aldeano zombi","7,5%"],["Zoglin","5%"],["Husk","3,5%"],["Zombi","2,5%"],["Drowned","2%"],["Piglin zombificado","1,5%"]])}
        <p>El encantamiento Botín (Looting) sube estas probabilidades. En la dimensión Paradise hay una tirada adicional de 10% sin Botín. Los mobs con poder la sueltan mucho más: tiradas de 15%, 30% y 60% según su fuerza, y también sueltan Golden Heart. En este servidor al menos un 5% de los zombis, husks, drowned, aldeanos zombi y piglins zombificados aparecen con poder.</p>
        <h3>2. Pergaminos (eliges el poder)</h3>
        <p>Craftea el pergamino y ponlo en la mano izquierda. Si ya tienes un poder, no hace nada. Las recetas también están en el menú, en <em>Items Info</em>.</p>
        {tbl(["Pergamino","Receta"],ING["es"])}
        <h3>Cambiar de poder</h3>
        <p>Craftea un <strong>Power Reseter</strong> (8 redstone + 1 perla de ender, sin forma) y ponlo en la mano izquierda. Te quita el poder y luego puedes obtener otro.</p>
      </section>
      <section class="pw-section" id="use-ability"><h2>El ítem «Use Ability»</h2>
        <div class="pw-why"><strong>¿Por qué no se ve en la mano?</strong> Porque su modelo tiene escala 0 en primera y tercera persona: es a propósito, para que no te tape la vista ni se vea en combate. Solo se ve en el inventario.</div>
        <ul>
          <li>Te lo da el servidor automáticamente: cada 7 segundos revisa si lo tienes. Si tu inventario está lleno, no te llega.</li>
          <li>Debe estar en alguna mano; sin él el poder queda silenciado. El ítem recomienda la mano izquierda (<code>/offhand</code> en Bedrock).</li>
          <li><strong>Clic derecho sostenido:</strong> por dentro es una comida que nunca termina de comerse, así el juego detecta que mantienes el botón. Las habilidades marcadas «mantener» o «cargar» siguen mientras no sueltes, y drenan maná.</li>
          <li><strong>Si no pasa nada:</strong> esa habilidad no está desbloqueada, ese slot está vacío, o estás en cooldown («On cooldown!») o sin maná («Not enough mana!»). Si en la mano principal llevas algo usable, como comida, Minecraft usa eso primero.</li>
        </ul>
        <h3>Asignar habilidades</h3>
        <p>Al recibir un poder ya vienen algunas en tu barra. Para cambiarlas: selecciona el slot, abre el menú, <em>Power Info</em>, la habilidad y <em>Bind</em>. También hay asignación con agacharse y correr, y dos juegos de barra.</p>
        <p>En <em>Settings</em> puedes cambiar la activación a <em>Sneak/Shift Click</em> o dejar de recibir el ítem. En <em>Settings → Ability Inputs</em> hay un ítem aparte (pide mano principal vacía) para asignar habilidades a clic derecho, F, Q, salto y correr, con y sin agacharte, sin cambiar de slot.</p>
        <h3>Comandos que puede usar cualquier jugador</h3>
        {tbl(["Comando","Qué hace"],[["<code>/trigger svm_ep.menu</code>","Menú principal"],["<code>/trigger svm_ep.menu set 3</code>","Preguntas frecuentes"],["<code>/trigger svm_ep.menu set 4</code>","Power Info: tus habilidades, desbloqueo y asignación"],["<code>/trigger svm_ep.menu set 5</code>","Items Info: ítems y recetas"],["<code>/trigger svm_ep.menu set 6</code>","Estadísticas y progreso de nivel"],["<code>/trigger svm_ep.menu set 10</code>","Ajustes"],["<code>/trigger svm_ep.toggle_power</code>","Apagar o encender tus poderes"],["<code>/trigger svm_ep.switch_hotbar</code>","Cambiar entre tus dos juegos de habilidades"]])}
        <p>El menú está en inglés porque es del datapack. Su botón de Discord lleva al servidor del autor de SVM Powers; para ayuda de DrakesCraft, usa nuestro Discord.</p>
      </section>
      <section class="pw-section" id="progreso"><h2>Maná, puntos y nivel</h2>
        {tbl(["Sistema","Cómo funciona"],[["Maná","Empiezas con 100 de máximo y el tope del servidor es 1.000. Sube comiendo Golden Eye (de arañas). No se regenera mientras usas una habilidad. Calculado del código a 20 TPS: unos 14,8 por segundo descansado, y baja hasta 0,2 si abusaste; ese desgaste se recupera con la barra de hambre en 5 muslos o más. Golden Bone acelera la regeneración."],["Puntos de habilidad","Empiezas con 10. Ganas 10 por cada logro de SVM Powers con recompensa, de 1 a 3 por Golden Flesh si ya tienes poder, y 3 cada vez que alcanzas un nivel nuevo. Sirven para desbloquear y mejorar."],["Nivel de poder","Sube regenerando maná, o sea, usándolo. Se evalúa cada 40 segundos. El siguiente nivel pide nivel × 6 + (nivel × 4 / 5)² + 100 de progreso: 100 al nivel 0, 224 al 10, 2.000 al 50. Se ve en <em>Player &amp; Stats</em>."],["Mejoras por habilidad","Cada habilidad tiene dos mejoras, reducción de cooldown y reducción de coste, de hasta 100 pasos. Según el datapack cuestan 1 punto por paso salvo que se indique otra cosa."]])}
        <p>Cooldown y coste bajan con el nivel. Fórmula del datapack: cooldown × 180 / (nivel + 180) y coste × 255 / (nivel + 255).</p>
        {tbl(["Nivel","Cooldown","Coste"],[["0","100%","100%"],["20","90%","92%"],["60","75%","80%"],["180","50%","58%"]])}
        <p>Morir no te quita maná máximo ni corazones extra con la configuración actual. Golden Heart sube la vida máxima, con un tope configurado de 20 en este servidor.</p>
      </section>
      <section class="pw-section" id="poderes"><h2>Los 16 poderes</h2>
        <p>Nombres de habilidad en inglés, como aparecen en el menú. Cooldown base a nivel 0; un rango significa que depende de cómo la uses. «—» significa que no tiene un valor fijo en su función de uso. Copia aprende sus habilidades copiándolas de mobs y jugadores con poder; Flora desbloquea las suyas visitando climas. Snow, Invisibility y Blood existen en el datapack pero están inacabados y no se pueden obtener.</p>
{pw}
      </section>
      <section class="pw-section" id="comida"><h2>Comida dorada y Paradise</h2>
        {tbl(["Ítem","Efecto","Sale de"],[["Golden Flesh","Saciedad y poder al azar (o puntos)","Zombis y parecidos"],["Golden Eye","Más maná máximo","Arañas"],["Golden Bone","Más regeneración de maná unos segundos","Esqueletos y parecidos"],["Golden Heart","Más vida máxima","Mobs de raid, brujas y zombis con poder"],["Golden Steak","Mucha regeneración y saciedad","Vacas"],["Golden Beetroot","Regeneración I, prisa I y cura veneno","Remolachas maduras"],["Golden Pearl","Abre un portal hacia o desde Paradise","Endermen"]])}
        <p>Paradise es una dimensión propia del datapack, con comerciantes, Clock Towers (donde se compra el pergamino de Fase) y estructuras con botín. Tres habilidades solo se aprenden con esos comerciantes: Fire Arrow, Re-Explode y Repel Zone.</p>
      </section>
      <section class="pw-section" id="sin-comprobar"><h2>Lo que aún no está comprobado</h2>
        <div class="pw-check"><p>Esta guía sale de leer el propio datapack (<code>SVM Powers 1.86.1</code>) y la configuración de la T2, no de una partida de prueba. La T2 sigue en pruebas, así que queda por confirmar en juego:</p>
        <ul>
          <li><strong>Bedrock:</strong> si el menú, el clic sostenido y Use Ability funcionan igual por Geyser.</li>
          <li><strong>Java antiguo:</strong> los menús usan diálogos, que llegaron a Minecraft en 1.21.6. Con clientes anteriores pueden no verse.</li>
          <li><strong>Resource pack:</strong> la invisibilidad depende del pack del servidor; sin él, Use Ability podría verse como textura faltante.</li>
          <li><strong>Costes:</strong> la tabla usa lo que dice el menú; en algunas habilidades el código cobra otra cifra. Manda lo que veas en juego.</li>
          <li><strong>Nivel:</strong> el código también permite que el nivel baje si regeneras poco maná; falta medir cuánto se nota.</li>
          <li><strong>Modalidades:</strong> el datapack no distingue mundos. Falta confirmar en cuáles se podrá usar cada poder en la T2.</li>
        </ul></div>
      </section>
    </div>"""
        return page("es", "guia-poderes.html", "guia-poderes-en.html", "poderes", "Guía de Poderes SVM · Temporada 2 | DrakesCraft",
                    "Cómo conseguir un poder en DrakesCraft sin ser op, por qué Use Ability es invisible, clic sostenido, los 16 poderes, cooldowns y progresión.",
                    "Guía de <em>Poderes</em>", "Guía de Poderes", "Temporada 2 · SVM Powers 1.86.1",
                    "Cómo conseguir un poder como jugador normal, usarlo y hacerlo crecer. Todos los datos salen del propio datapack.",
                    "<span><strong>PODERES</strong> 16 obtenibles</span><span><b>MENÚ</b> /trigger svm_ep.menu</span>", body)
    body = f"""    <div class="container">
      <nav class="guide-tabs" aria-label="Guide sections"><a href="guia-comandos-en.html">Commands</a><a href="guide-en.html">The Server</a><a href="guia-rangos-en.html">Ranks</a><a href="guia-slimefun-en.html">Slimefun &amp; Addons</a><a href="guia-plugins-en.html">Plugins &amp; Suites</a><a href="guia-poderes-en.html" class="is-active">Powers</a></nav>
      <section class="pw-section" id="start"><h2>Start here</h2>
        <ol class="pw-steps">
          <li><strong>Get Golden Flesh.</strong> Kill zombies (or husks, drowned and others) until one drops <em>Golden Flesh</em>. You don't need to be op.</li>
          <li><strong>Eat it.</strong> It grants a random power and shows <em>Obtained a Power!</em> If you'd rather choose, craft a scroll.</li>
          <li><strong>Open the menu.</strong> Type <code>/trigger svm_ep.menu</code>, go to <em>Power Info</em> and unlock abilities. You start with 10 points.</li>
          <li><strong>Put <em>Use Ability</em> in your offhand.</strong> It is invisible on purpose. It appears in your inventory by itself.</li>
          <li><strong>Pick a slot and hold right-click.</strong> Your hotbar slot (1 to 9) decides which ability fires. The action bar shows mana, ability and cooldown.</li>
        </ol>
      </section>
      <section class="pw-section" id="get"><h2>How to get a power</h2>
        <p>You only have one power at a time. The <code>/loot give ... svm_ep:items/power_chooser</code> command is admin-only; as a regular player there are two routes:</p>
        <h3>1. Golden Flesh (random power)</h3>
        <p>It's food, eaten normally. With no power, it assigns a random one of the 16 available. If you already have one, it gives 1 to 3 ability points.</p>
        {tbl(["Mob","Chance without Looting"],[["Zombie horse","8%"],["Zombie villager","7.5%"],["Zoglin","5%"],["Husk","3.5%"],["Zombie","2.5%"],["Drowned","2%"],["Zombified piglin","1.5%"]])}
        <p>Looting raises these chances. In the Paradise dimension there is an extra 10% roll without Looting. Power mobs drop far more often: rolls of 15%, 30% and 60% depending on their strength, plus Golden Hearts. On this server at least 5% of zombies, husks, drowned, zombie villagers and zombified piglins spawn with a power.</p>
        <h3>2. Scrolls (you choose)</h3>
        <p>Craft the scroll and put it in your offhand. It does nothing if you already have a power. Recipes are also in the menu, under <em>Items Info</em>.</p>
        {tbl(["Scroll","Recipe"],ING["en"])}
        <h3>Changing power</h3>
        <p>Craft a <strong>Power Reseter</strong> (8 redstone + 1 ender pearl, shapeless) and put it in your offhand. It removes your power so you can get another.</p>
      </section>
      <section class="pw-section" id="use-ability"><h2>The “Use Ability” item</h2>
        <div class="pw-why"><strong>Why can't I see it in my hand?</strong> Its model has scale 0 in first and third person. That is on purpose, so it doesn't block your view or show in combat. You only see it in the inventory.</div>
        <ul>
          <li>The server gives it automatically, checking every 7 seconds. If your inventory is full, it won't arrive.</li>
          <li>It must be in a hand; without it your power is silenced. The item itself recommends the offhand (<code>/offhand</code> on Bedrock).</li>
          <li><strong>Holding right-click:</strong> internally it's a food that never finishes being eaten, so the game can detect you holding the button. Abilities marked “holding” or “charging” continue until you release, draining mana.</li>
          <li><strong>If nothing happens:</strong> the ability isn't unlocked, the slot is empty, or you're on cooldown (“On cooldown!”) or out of mana (“Not enough mana!”). If your main hand holds something usable, like food, Minecraft uses that first.</li>
        </ul>
        <h3>Binding abilities</h3>
        <p>Some come bound to your hotbar when you get a power. To change them: select the slot, open the menu, <em>Power Info</em>, the ability, then <em>Bind</em>. There are also sneak and sprint binds, and two hotbar sets.</p>
        <p>In <em>Settings</em> you can switch activation to <em>Sneak/Shift Click</em> or stop receiving the item. <em>Settings → Ability Inputs</em> has a separate item (needs an empty main hand) to bind abilities to right-click, F, Q, jump and sprint, with or without sneaking, without switching slots.</p>
        <h3>Commands any player can use</h3>
        {tbl(["Command","What it does"],[["<code>/trigger svm_ep.menu</code>","Main menu"],["<code>/trigger svm_ep.menu set 3</code>","FAQ"],["<code>/trigger svm_ep.menu set 4</code>","Power Info: your abilities, unlocking and binding"],["<code>/trigger svm_ep.menu set 5</code>","Items Info: items and recipes"],["<code>/trigger svm_ep.menu set 6</code>","Stats and level progress"],["<code>/trigger svm_ep.menu set 10</code>","Settings"],["<code>/trigger svm_ep.toggle_power</code>","Turn your powers off or on"],["<code>/trigger svm_ep.switch_hotbar</code>","Switch between your two ability sets"]])}
        <p>The menu's Discord button leads to the SVM Powers author's server; for DrakesCraft help, use our Discord.</p>
      </section>
      <section class="pw-section" id="progress"><h2>Mana, points and level</h2>
        {tbl(["System","How it works"],[["Mana","You start with a 100 maximum and the server cap is 1,000. It rises by eating Golden Eyes (from spiders). It doesn't regenerate while using an ability. Calculated from the code at 20 TPS: about 14.8 per second when rested, down to 0.2 if you've overused it; that strain recovers with your hunger bar at 5 shanks or more. Golden Bone speeds up regeneration."],["Ability points","You start with 10. You earn 10 per rewarding SVM Powers advancement, 1 to 3 per Golden Flesh if you already have a power, and 3 each time you reach a new level. They unlock and upgrade abilities."],["Power level","Rises by regenerating mana, meaning by using it. Evaluated every 40 seconds. The next level needs level × 6 + (level × 4 / 5)² + 100 progress: 100 at level 0, 224 at 10, 2,000 at 50. See it in <em>Player &amp; Stats</em>."],["Per-ability upgrades","Each ability has two upgrades, cooldown reduction and cost reduction, up to 100 steps. Per the datapack they cost 1 point per step unless stated otherwise."]])}
        <p>Cooldown and cost fall with level. Datapack formula: cooldown × 180 / (level + 180) and cost × 255 / (level + 255).</p>
        {tbl(["Level","Cooldown","Cost"],[["0","100%","100%"],["20","90%","92%"],["60","75%","80%"],["180","50%","58%"]])}
        <p>Dying doesn't take max mana or extra hearts under the current configuration. Golden Heart raises max health, with a configured cap of 20 on this server.</p>
      </section>
      <section class="pw-section" id="powers"><h2>The 16 powers</h2>
        <p>Base cooldown at level 0; a range means it depends on how you use it. “—” means no fixed value in its use function. Copy learns abilities by copying them from mobs and power users; Flora unlocks its own by visiting climates. Snow, Invisibility and Blood exist in the datapack but are unfinished and can't be obtained.</p>
{pw}
      </section>
      <section class="pw-section" id="food"><h2>Golden food and Paradise</h2>
        {tbl(["Item","Effect","Drops from"],[["Golden Flesh","Saturation and a random power (or points)","Zombie-like mobs"],["Golden Eye","More max mana","Spiders"],["Golden Bone","More mana regeneration for a few seconds","Skeleton-like mobs"],["Golden Heart","More max health","Raid mobs, witches and power zombies"],["Golden Steak","Massive regeneration and saturation","Cows"],["Golden Beetroot","Regeneration I, Haste I and cures poison","Full-grown beetroots"],["Golden Pearl","Opens a portal to or from Paradise","Endermen"]])}
        <p>Paradise is the datapack's own dimension, with traders, Clock Towers (where the Phase scroll is sold) and loot structures. Three abilities are only learned through those traders: Fire Arrow, Re-Explode and Repel Zone.</p>
      </section>
      <section class="pw-section" id="unverified"><h2>Not verified yet</h2>
        <div class="pw-check"><p>This guide comes from reading the datapack itself (<code>SVM Powers 1.86.1</code>) and the Season 2 configuration, not from a test playthrough. Season 2 is still in testing, so these remain to be confirmed in-game:</p>
        <ul>
          <li><strong>Bedrock:</strong> whether the menu, hold-click and Use Ability work the same through Geyser.</li>
          <li><strong>Older Java:</strong> menus use dialogs, added to Minecraft in 1.21.6. Older clients may not show them.</li>
          <li><strong>Resource pack:</strong> the invisibility depends on the server pack; without it, Use Ability could show as a missing texture.</li>
          <li><strong>Costs:</strong> the table uses what the menu states; for some abilities the code charges a different number. Trust what you see in-game.</li>
          <li><strong>Level:</strong> the code also lets your level drop if you regenerate little mana; how noticeable that is remains to be measured.</li>
          <li><strong>Gamemodes:</strong> the datapack doesn't distinguish worlds. Which powers work in which gamemode in Season 2 is still to be confirmed.</li>
        </ul></div>
      </section>
    </div>"""
    return page("en", "guia-poderes-en.html", "guia-poderes.html", "poderes", "SVM Powers Guide · Season 2 | DrakesCraft",
                "How to get a power on DrakesCraft without op, why Use Ability is invisible, hold-click, the 16 powers, cooldowns and progression.",
                "<em>Powers</em> guide", "Powers guide", "Season 2 · SVM Powers 1.86.1",
                "How to get a power as a regular player, use it and grow it. All data comes from the datapack itself.",
                "<span><strong>POWERS</strong> 16 obtainable</span><span><b>MENU</b> /trigger svm_ep.menu</span>", body)


for nombre, contenido in (("temporada-2.html", temporada("es")), ("temporada-2-en.html", temporada("en")), ("guia-poderes.html", guia("es")), ("guia-poderes-en.html", guia("en"))):
    (R / nombre).write_text(contenido, "utf8")
