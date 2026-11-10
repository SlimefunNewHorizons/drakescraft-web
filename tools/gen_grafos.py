#!/usr/bin/env python3
"""Snapshots estáticos y saneados para el Laboratorio de grafos (SAORI · /saori.html).

Solo usa datos que la web YA publica:
  - slimefun.json : assets/sfwiki/meta.json (catálogo público de la wiki)
  - plugins.json  : guia-plugins.html / guia-plugins-en.html (texto público de la guía)
  - web.json      : grafo de código del repo PÚBLICO drakescraft-web (graphify-out/graph.json)
  - saori.json    : grafo ILUSTRATIVO del flujo de agentes (sintético, sin tickets ni logs reales)
No se conecta a Star ni lee nada privado. Cada etiqueta pasa por limpiar(): fuera rutas,
IPs, hosts internos y palabras de credenciales.

Formato: {"g": [[es, en], ...], "n": [[etiqueta_es, etiqueta_en, grupo, padre], ...]}
Los nodos van en orden BFS (el padre siempre antes que el hijo); el cliente recorta los
primeros N en móvil sin romper el árbol.
Uso: python3 tools/gen_grafos.py
"""
import json, re, html
from pathlib import Path

R = Path(__file__).resolve().parent.parent
OUT = R / "assets" / "grafos"
MAX = 1500
BAD = re.compile(r"(/|\\|\b\d{1,3}(\.\d{1,3}){3}\b|tailscale|\bssh\b|token|secret|password|contraseñ|\.local\b|localhost|credencial)", re.I)

def limpiar(t):
    t = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", t or ""))).strip(" :·-")
    return "" if not t or BAD.search(t) else t[:60]

def guardar(nombre, grupos, nodos):
    nodos = nodos[:MAX]
    data = {"g": grupos, "n": nodos}
    (OUT / f"{nombre}.json").write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), "utf8")
    print(nombre, len(nodos), "nodos")

def slimefun():
    m = json.loads((R / "assets/sfwiki/meta.json").read_text("utf8"))
    cats = m["C"]
    grupos = [["Núcleo", "Core"], ["Addon", "Addon"], ["Categoría", "Category"], ["Ítem destacado", "Featured item"]]
    nodos = [["Slimefun", "Slimefun", 0, -1]]
    addons = sorted(m["A"], key=lambda a: -a["c"])
    idx_addon, capa2, capa3 = {}, [], []
    for a in addons:
        n = limpiar(a["n"])
        if not n: continue
        idx_addon[a["s"]] = len(nodos)
        nodos.append([n, n, 1, 0])
    for a in addons:
        p = idx_addon.get(a["s"])
        if p is None: continue
        for ci, _cnt in a["cats"][:6]:
            nm = limpiar(cats[ci][1]) if ci < len(cats) else ""
            if nm: capa2.append([nm, nm, 2, p, a["s"]])
    for c in capa2:
        nodos.append(c[:4])
    first_cat = {}
    for i, c in enumerate(capa2):
        first_cat.setdefault(c[4], len(nodos) - len(capa2) + i)
    cat_nodes = {}
    for i, c in enumerate(capa2):
        cat_nodes.setdefault(c[4], []).append(len(nodos) - len(capa2) + i)
    # ítems: destacados + nombres de los shards públicos de la wiki, repartidos entre sus categorías
    cupo = max(1, (MAX - len(nodos)) // max(1, len(addons)))
    for a in addons:
        padres = cat_nodes.get(a["s"]) or [idx_addon.get(a["s"])]
        if padres[0] is None: continue
        vistos, nombres = set(), [it[1] for it in a.get("f", [])]
        for sh in sorted((R / "assets/sfwiki/a").glob(f'{a["s"]}-*.json'))[:1]:
            refs = json.loads(sh.read_text("utf8")).get("refs", {})
            nombres += [v[0] for v in refs.values() if v[1] == a["s"]]
        for nm in nombres:
            nm = limpiar(nm)
            if not nm or nm in vistos: continue
            vistos.add(nm)
            capa3.append([nm, nm, 3, padres[len(vistos) % len(padres)]])
            if len(vistos) >= cupo: break
    nodos += capa3
    guardar("slimefun", grupos, nodos)

def secciones(path):
    s = (R / path).read_text("utf8")
    out = []
    for blk in re.split(r"<h2[^>]*>", s)[1:]:
        tit, _, cuerpo = blk.partition("</h2>")
        suites = []
        for sub in re.split(r"<details", cuerpo)[1:]:
            m = re.search(r"<span><strong>(.*?)</strong>", sub, re.S)
            if not m: continue
            feats = [limpiar(x) for x in re.findall(r"<li><strong>(.*?)</strong>", sub, re.S)]
            suites.append((limpiar(m.group(1)), [f for f in feats if f]))
        if suites: out.append((limpiar(tit), suites))
    return out

def plugins():
    es, en = secciones("guia-plugins.html"), secciones("guia-plugins-en.html")
    if len(es) != len(en): en = es
    grupos = [["Servidor", "Server"], ["Familia", "Family"], ["Suite / plugin", "Suite / plugin"], ["Función", "Feature"]]
    nodos = [["DrakesCraft · 202 plugins", "DrakesCraft · 202 plugins", 0, -1]]
    pend = []
    for (te, se), (tn, sn) in zip(es, en):
        if not te: continue
        nodos.append([te, tn or te, 1, 0]); fi = len(nodos) - 1
        sn = sn if len(sn) == len(se) else se
        for (ne, fe), (nn, fn) in zip(se, sn):
            if not ne: continue
            pend.append(([ne, nn or ne, 2, fi], fe, fn if len(fn) == len(fe) else fe))
    hijos = []
    for nodo, fe, fn in pend:
        nodos.append(nodo); si = len(nodos) - 1
        hijos += [[a, b or a, 3, si] for a, b in zip(fe, fn)]
    nodos += hijos
    guardar("plugins", grupos, nodos)

def saori():
    """Ilustrativo: cómo fluye el trabajo entre agentes. Nada aquí es un ticket o log real."""
    grupos = [["Orquestador", "Orchestrator"], ["Agente", "Agent"], ["Etapa", "Stage"], ["Evento (ilustrativo)", "Event (illustrative)"]]
    nodos = [["SAORI", "SAORI", 0, -1]]
    agentes = ["Claude", "Codex", "Antigravity", "Saori-bot", "Vigía CVE", "Backups"]
    etapas = [("Tickets", "Tickets"), ("Registros", "Logs"), ("Arreglos", "Fixes"), ("Despliegue", "Deploy"), ("Memoria", "Memory")]
    ev = {"Tickets": ("ticket", "ticket"), "Registros": ("registro", "log"), "Arreglos": ("arreglo", "fix"),
          "Despliegue": ("versión", "release"), "Memoria": ("recuerdo", "memory")}
    for a in agentes: nodos.append([a, a, 1, 0])
    base_et = len(nodos)
    for ai in range(len(agentes)):
        for e, en in etapas: nodos.append([f"{agentes[ai]} · {e}", f"{agentes[ai]} · {en}", 2, 1 + ai])
    k = 0
    for j in range(len(agentes) * len(etapas)):
        e = etapas[j % len(etapas)][0]
        for t in range(7):
            k += 1
            es_, en_ = ev[e]
            nodos.append([f"{es_} {k:03d}", f"{en_} {k:03d}", 3, base_et + j])
    guardar("saori", grupos, nodos)

def web():
    """Código del repo público drakescraft-web (graphify-out/graph.json): página/script/estilo → símbolos."""
    gp = R / "graphify-out" / "graph.json"
    if not gp.exists():
        print("web: sin graphify-out/graph.json, se conserva el snapshot anterior"); return
    g = json.loads(gp.read_text("utf8"))
    tipos = {".html": 1, ".js": 2, ".css": 3}
    def publico(sf):
        return sf and "/" not in sf.replace("scripts/", "", 1).replace("styles/", "", 1) and Path(sf).suffix in tipos
    files, hijos = {}, {}
    for n in g["nodes"]:
        sf = n.get("source_file") or ""
        if not publico(sf): continue
        if n["label"] in (sf, Path(sf).name) and ".min." not in sf and sf not in ("server.js", "script-3-3.js"):
            files[n["id"]] = sf
    for l in g["links"]:
        if l.get("relation") == "contains" and l["source"] in files:
            hijos.setdefault(l["source"], []).append(l["target"])
    lab = {n["id"]: n["label"] for n in g["nodes"]}
    grupos = [["Repositorio", "Repository"], ["Página", "Page"], ["Script", "Script"], ["Estilo", "Stylesheet"], ["Símbolo", "Symbol"]]
    nodos = [["drakescraft-web", "drakescraft-web", 0, -1]]
    orden = sorted(files, key=lambda i: (-len(hijos.get(i, [])), files[i]))[:160]
    pos = {}
    for fid in orden:
        nm = limpiar(Path(files[fid]).name)
        if not nm: continue
        pos[fid] = len(nodos); nodos.append([nm, nm, tipos[Path(files[fid]).suffix], 0])
    cupo = max(4, (MAX - len(nodos)) // max(1, len(pos)))
    for fid, p in pos.items():
        for h in hijos.get(fid, [])[:cupo]:
            nm = limpiar(lab.get(h, ""))
            if len(nm) > 3: nodos.append([nm, nm, 4, p])
    guardar("web", grupos, nodos)

if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    slimefun(); plugins(); web(); saori()
