#!/usr/bin/env python3
"""Exporta los grafos REALES de código (graphify-out/graph.json) de Star a binarios compactos para
/saori.html (SAORI · Laboratorio de grafos). Ver docs/GRAFOS_SAORI.md.

Uso (en Star, con numpy):  ~/.venvs/grafos/bin/python tools/gen_grafos.py
  GRAFOS_ROOT=<carpeta base de los repos> (por defecto $HOME)

Por grafo: layout 3D precalculado OFFLINE (comunidades como cúmulos sobre una esfera, relajadas con
fuerzas a nivel de comunidad + dispersión local suavizada por las aristas), posiciones int16, tipo
genérico + grado + comunidad como índices, aristas como pares de índices (bosque generador primero,
luego las más cortas y algunas puentes largas). Todo gzip; el navegador lo abre con DecompressionStream.

PRIVACIDAD: la visibilidad se consulta en cada ejecución con `gh repo view --json isPrivate`.
Si el repo es privado, no tiene remoto de GitHub o gh falla -> se trata como PRIVADO y solo se
exporta estructura anónima (posición, tipo genérico, comunidad numerada, grado). Solo los repos
PÚBLICOS llevan etiquetas de símbolo (clase/método, sin rutas) para el tooltip. Nunca se exportan
rutas, mensajes, community_name, source_file ni ids.
"""
import gzip, json, os, re, struct, subprocess, sys, time
from pathlib import Path
import numpy as np

R = Path(__file__).resolve().parent.parent
OUT = R / "assets" / "grafos"
BASE = Path(os.environ.get("GRAFOS_ROOT", Path.home()))
EDGES_TAB = 150_000      # aristas máx. por grafo (desktop; el cliente recorta en móvil)
EDGES_GALAXY = 330_000   # aristas máx. en la Galaxia total
TYPES = [["Archivo", "File"], ["Clase", "Class"], ["Función", "Function"], ["Documento", "Document"], ["Símbolo", "Symbol"]]

# (id, título, carpeta relativa a GRAFOS_ROOT, pestaña propia)
SOURCES = [
    ("labs", "drakes-slimefun-labs", "workspace/drakescraft/drakes-slimefun-labs", True),
    ("aihub", "SAORI · ai-hub", "ai-hub", True),
    ("tinkers", "TinkersConstruct", "workspace/drakescraft/TinkersConstruct", True),
    ("denizen", "Denizen", "workspace/drakescraft/Denizen-Drake", True),
    ("bentobox", "BentoBox", "workspace/drakescraft/BentoBox-Drake", True),
    ("elitemobs", "EliteMobs", "workspace/drakescraft/EliteMobs", True),
    ("villagers", "RealisticVillagers", "workspace/drakescraft/RealisticVillagers", True),
    ("slimefun4", "Slimefun4", "workspace/drakescraft/Slimefun4-Drake", True),
    ("essentials", "EssentialsX", "workspace/drakescraft/EssentialsX-Drake", True),
    ("backup", "star-server-backup", "star-server-backup", True),
    ("icdsrv", "InteractiveChat-DiscordSRV", "workspace/drakescraft/InteractiveChat-DiscordSRV-Addon", True),
    ("mvcreatures", "MultiverseCreatures", "workspace/drakescraft/MultiverseCreatures", True),
    ("grim", "GrimAC", "workspace/drakescraft/GrimAC-upstream-qa", True),
    # solo en la Galaxia total (sin etiquetas)
    ("mantle", "Mantle", "workspace/drakescraft/Mantle-Unofficial", False),
    ("networksx", "NetworksExpansion", "workspace/drakescraft/NetworksExpansion", False),
    ("rebar", "Rebar", "workspace/drakescraft/Rebar-Drake", False),
    ("stb", "SensibleToolbox", "workspace/drakescraft/SensibleToolbox-drake", False),
    ("suites", "Drakes-Suites", "workspace/drakescraft/Drakes-Suites", False),
    ("odysseia", "Odysseia", "workspace/drakescraft/Odysseia", False),
    ("crystamae", "CrystamaeHistoria", "workspace/drakescraft/CrystamaeHistoria-drake", False),
    ("pylon", "Pylon", "workspace/drakescraft/Pylon-Drake", False),
    ("mvgambling", "MultiverseGambling", "workspace/drakescraft/MultiverseGambling", False),
    ("coreprotect", "CoreProtect", "workspace/drakescraft/CoreProtect", False),
    ("wwchat", "WorldwideChat", "workspace/drakescraft/WorldwideChat-Drake", False),
    ("imageframe", "ImageFrame", "workspace/drakescraft/ImageFrame", False),
    ("networks6", "NetworksV6", "workspace/drakescraft/NetworksV6-drake", False),
    ("mvnets", "MultiverseNets", "workspace/drakescraft/MultiverseNets", False),
    ("mvtinker", "MultiverseTinker", "workspace/drakescraft/MultiverseTinker", False),
    ("enchants", "ExcellentEnchants", "workspace/drakescraft/ExcellentEnchants-Drake", False),
    ("brewery", "BreweryX", "workspace/drakescraft/BreweryX-Drake", False),
    ("levelled", "LevelledMobs", "workspace/drakescraft/LevelledMobs-Drake", False),
    ("onechunk", "OneChunk", "workspace/drakescraft/OneChunk-drake", False),
    ("quaptics", "Quaptics", "workspace/drakescraft/Quaptics-drake", False),
    ("purpur", "DrakesPurpur", "workspace/_lineas/DrakesPurpur@monolito", False),
    ("web", "drakescraft-web", "workspace/drakescraft/drakescraft-web", False),
]

BAD = re.compile(r"(/|\\|\b\d{1,3}(\.\d{1,3}){3}\b|tailscale|\bssh\b|token|secret|passw|contraseñ|\.local\b|localhost|credencial|apikey|api_key|@)", re.I)

def limpiar(t):
    t = re.sub(r"\s+", " ", t or "").strip()
    return "" if not t or BAD.search(t) else t[:48]

def es_publico(d):
    """True solo si gh confirma isPrivate=false. Cualquier duda -> privado."""
    try:
        url = subprocess.run(["git", "-C", str(d), "remote", "get-url", "origin"], capture_output=True, text=True, timeout=10).stdout.strip()
        m = re.search(r"github\.com[:/]([\w.-]+/[\w.-]+?)(?:\.git)?$", url)
        if not m: return False
        r = subprocess.run(["gh", "repo", "view", m.group(1), "--json", "isPrivate", "-q", ".isPrivate"], capture_output=True, text=True, timeout=30)
        return r.returncode == 0 and r.stdout.strip() == "false"
    except Exception:
        return False

def tipo(n):
    ft, lab, sf = n.get("file_type"), n.get("label") or "", n.get("source_file") or ""
    if ft == "document": return 3
    if sf and lab == Path(sf).name: return 0
    if n.get("_callable_class"): return 1
    if lab.endswith(")"): return 2
    return 4

def fib(k):
    i = np.arange(k) + 0.5
    y = 1 - 2 * i / max(k, 1); r = np.sqrt(np.maximum(0, 1 - y * y)); th = i * 2.399963
    return np.stack([np.cos(th) * r, y, np.sin(th) * r], 1)

def layout(N, a, b, comm, seed):
    rng = np.random.default_rng(seed)
    _, cinv, csz = np.unique(comm, return_inverse=True, return_counts=True)
    order = np.argsort(-csz, kind="stable"); rank = np.empty_like(order); rank[order] = np.arange(len(order))
    c = rank[cinv]
    K = int(max(1, min(700, (csz >= 3).sum())))
    c = np.where(c < K, c, K)                      # K = halo de comunidades diminutas
    sizes = np.bincount(c, minlength=K + 1).astype(float)
    S = sizes[:K].sum()
    rad = (0.32 * sizes[:K] / S) ** (1 / 3)
    P = fib(K) * 0.9
    m = (c[a] < K) & (c[b] < K) & (c[a] != c[b])
    W = np.zeros((K, K)); np.add.at(W, (c[a][m], c[b][m]), 1.0); W = W + W.T
    W = np.log1p(W); W /= max(W.max(), 1e-9)
    T = rad[:, None] + rad[None, :]
    for it in range(160):
        D = P[:, None, :] - P[None, :, :]
        d = np.linalg.norm(D, axis=2) + 1e-4
        rep = np.where(d < T * 1.25, (T * 1.25 - d) / d, 0.0)
        att = W * (d - T) / d
        F = ((rep * 0.5 - att * 0.08)[:, :, None] * D).sum(1) - P * 0.03
        P += F * (0.6 * (1 - it / 160) + 0.05)
    P /= np.max(np.linalg.norm(P, axis=1) + rad) or 1
    rad = rad / (np.max(np.linalg.norm(P, axis=1) + rad) or 1)
    # nodos: dispersión local alrededor del centro de su comunidad
    pos = np.zeros((N, 3))
    main = c < K
    pos[main] = P[c[main]] + rng.normal(size=(main.sum(), 3)) * rad[c[main], None] * 0.45
    h = ~main
    if h.any():
        u = rng.normal(size=(h.sum(), 3)); u /= np.linalg.norm(u, axis=1)[:, None]
        pos[h] = u * rng.uniform(1.02, 1.25, h.sum())[:, None]
    deg = np.bincount(a, minlength=N) + np.bincount(b, minlength=N)
    has = deg > 0
    for _ in range(10):
        nb = np.zeros((N, 3))
        for k in range(3):
            nb[:, k] = np.bincount(a, pos[b, k], N) + np.bincount(b, pos[a, k], N)
        nb[has] /= deg[has, None]
        pos[has] = 0.55 * pos[has] + 0.45 * nb[has]
        # re-expandir cada comunidad a su radio (evita el colapso del suavizado)
        cnt = np.bincount(c, minlength=K + 1)[:, None].clip(1)
        cen = np.stack([np.bincount(c, pos[:, k], K + 1) for k in range(3)], 1) / cnt
        dev = pos - cen[c]
        sd = np.sqrt(np.bincount(c, (dev ** 2).sum(1), K + 1) / cnt[:, 0]) + 1e-9
        tgt = np.append(rad * 0.42, 0)
        f = np.where(main, tgt[c] / sd[c], 1.0)
        pos = np.where(main[:, None], P[np.minimum(c, K - 1)] + dev * f[:, None], pos)
        pos[h] = pos[h] / np.linalg.norm(pos[h], axis=1)[:, None].clip(1e-6) * np.clip(np.linalg.norm(pos[h], axis=1), 1.0, 1.3)[:, None]
    pos /= np.percentile(np.linalg.norm(pos, axis=1), 99.8) or 1
    return pos, c

def kruskal_order(N, a, b, L, budget, rng):
    """Bosque generador (estructura) + aristas cortas + 12 % de puentes largos. Devuelve (idx, n_tier1)."""
    o = np.argsort(L, kind="stable")
    par = list(range(N))
    def find(x):
        while par[x] != x:
            par[x] = par[par[x]]; x = par[x]
        return x
    tree, rest = [], []
    for e in o.tolist():
        ra, rb = find(int(a[e])), find(int(b[e]))
        if ra != rb: par[ra] = rb; tree.append(e)
        else: rest.append(e)
    tree = np.array(tree, dtype=np.int64); rest = np.array(rest, dtype=np.int64)
    if len(tree) >= budget:
        return tree[:budget], budget
    left = budget - len(tree)
    if len(rest) > left:
        nshort = int(left * 0.88)
        long_pool = rest[nshort:]
        extra = rng.choice(long_pool, left - nshort, replace=False) if len(long_pool) > left - nshort else long_pool
        rest = np.concatenate([rest[:nshort], extra])
    return np.concatenate([tree, rest]), len(tree)

def cargar(gid, title, rel, tab, rng):
    gp = BASE / rel / "graphify-out" / "graph.json"
    if not gp.exists():
        print(f"  {gid}: falta {rel}/graphify-out/graph.json, se omite"); return None
    t0 = time.time()
    g = json.loads(gp.read_bytes())
    nodes, links = g["nodes"], g["links"]
    real_n, real_e = len(nodes), len(links)
    idx = {n["id"]: i for i, n in enumerate(nodes)}
    N = len(nodes)
    ea = np.fromiter((idx.get(l["source"], -1) for l in links), np.int64, len(links))
    eb = np.fromiter((idx.get(l["target"], -1) for l in links), np.int64, len(links))
    ok = (ea >= 0) & (eb >= 0) & (ea != eb)
    a, b = np.minimum(ea[ok], eb[ok]), np.maximum(ea[ok], eb[ok])
    key = np.unique(a * N + b); a, b = key // N, key % N
    cm = {}
    comm = np.array([cm.setdefault(n.get("community", -1), len(cm)) for n in nodes], np.int64)
    if len(cm) < max(8, N // 400):  # sin comunidades útiles: agrupa por carpeta del archivo (solo se exporta el índice)
        cm = {}
        comm = np.array([cm.setdefault(str(Path(n.get("source_file") or "").parent), len(cm)) for n in nodes], np.int64)
    typ = np.array([tipo(n) for n in nodes], np.uint8)
    pub = es_publico(BASE / rel) if tab else False
    labels = [limpiar(n.get("label")) for n in nodes] if pub else None
    del g, nodes, links
    pos, c = layout(N, a, b, comm, sum(map(ord, gid)))
    deg = np.bincount(a, minlength=N) + np.bincount(b, minlength=N)
    # orden de prioridad: grado desc (el cliente recorta los primeros N en móvil sin perder los hubs)
    perm = np.lexsort((c, -deg)); inv = np.empty(N, np.int64); inv[perm] = np.arange(N)
    pos, c, typ, deg = pos[perm], c[perm], typ[perm], deg[perm]
    a, b = np.minimum(inv[a], inv[b]), np.maximum(inv[a], inv[b])
    if labels: labels = [labels[i] for i in perm]
    print(f"  {gid}: {real_n} nodos / {real_e} aristas reales · {len(a)} únicas · {c.max() + 1} comunidades · "
          f"{'PÚBLICO' if pub else 'privado/anónimo'} · {time.time() - t0:.1f}s")
    return dict(id=gid, title=title, tab=tab, public=pub, nodes=real_n, edges=real_e, N=N, pos=pos, c=c, typ=typ,
                deg=deg, a=a, b=b, labels=labels, comms=int(c.max()) + 1)

def q16(p):
    return np.clip(np.round(p * 32000), -32767, 32767).astype("<i2")

def pack(pos, typ, deg, comm16, a, b, tier1, u32):
    N, M = len(pos), len(a)
    hdr = b"DGR1" + struct.pack("<IIII", N, M, tier1, 1 if u32 else 0)
    p = q16(pos).tobytes(); p += b"\0" * ((-len(p)) % 4)
    at = np.stack([typ, np.minimum(deg, 255), comm16 & 255, (comm16 >> 8) & 255], 1).astype(np.uint8).tobytes()
    e = np.stack([a, b], 1).astype("<u4" if u32 else "<u2").tobytes()
    return hdr + p + at + e

def escribir(name, raw):
    gz = gzip.compress(raw, 9, mtime=0)
    (OUT / name).write_bytes(gz)
    return len(gz), len(raw)

def tramos(G, budget, rng):
    L = np.linalg.norm(G["pos"][G["a"]] - G["pos"][G["b"]], axis=1)
    sel, t1 = kruskal_order(G["N"], G["a"], G["b"], L, min(budget, len(L)), rng)
    s1, s2 = sel[:t1], sel[t1:]
    # cada tramo ordenado por su nodo más tardío: un prefijo de aristas sirve a un prefijo de nodos (recorte móvil/FPS)
    s1 = s1[np.lexsort((G["a"][s1], G["b"][s1]))]; s2 = s2[np.lexsort((G["a"][s2], G["b"][s2]))]
    return np.concatenate([s1, s2]).astype(np.int64), t1

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for f in OUT.glob("*"):
        if f.suffix == ".gz" or f.name == "meta.json": f.unlink()  # los .json antiguos los usa aún scripts/grafos.js
    rng = np.random.default_rng(20261110)
    meta = {"v": time.strftime("%Y%m%d%H%M"), "types": TYPES, "graphs": []}
    Gs = []
    for gid, title, rel, tab in SOURCES:
        G = cargar(gid, title, rel, tab, rng)
        if not G: continue
        Gs.append(G)
        m = {k: G[k] for k in ("id", "title", "public", "nodes", "edges", "comms")}
        if tab:
            sel, t1 = tramos(G, EDGES_TAB, rng)
            comm16 = np.minimum(G["c"], 65535)
            gzb, rawb = escribir(f"{gid}.bin.gz", pack(G["pos"], G["typ"], G["deg"], comm16, G["a"][sel], G["b"][sel], t1, False))
            m.update(file=f"{gid}.bin.gz", bytes=gzb, raw=rawb, shown_nodes=G["N"], shown_edges=len(sel), tier1=t1)
            if G["public"]:
                lb, _ = escribir(f"{gid}.lbl.gz", "\n".join(G["labels"]).encode("utf8"))
                m.update(labels=f"{gid}.lbl.gz", labels_bytes=lb)
            print(f"    -> {gid}.bin.gz {gzb / 1e6:.2f} MB ({len(sel)} aristas){' + etiquetas %.2f MB' % (m['labels_bytes'] / 1e6) if G['public'] else ''}")
        meta["graphs"].append(m)
        G.pop("labels", None)
    # Galaxia total: cada repo es un cúmulo sobre un disco espiral; tamaño ~ N^(1/3)
    Gs.sort(key=lambda G: -G["N"])
    N0 = Gs[0]["N"]; tot = sum(G["N"] for G in Gs)
    P, T, D, C, A, B, blocks, off, t1s = [], [], [], [], [], [], [], 0, 0
    tier1_parts, tier2_parts = [], []
    for i, G in enumerate(Gs):
        s = (G["N"] / N0) ** (1 / 3)
        if i == 0: o = np.zeros(3)
        else:
            th = i * 2.399963 * 0.62 + (i % 2) * np.pi; r = 1.25 + 0.62 * np.sqrt(i) * 1.25
            o = np.array([np.cos(th) * r, (rng.random() - 0.5) * 0.5, np.sin(th) * r])
        P.append(G["pos"] * s + o)
        T.append(G["typ"]); D.append(G["deg"]); C.append((i << 8) | (G["c"] & 255))
        sel, t1 = tramos(G, max(500, int(EDGES_GALAXY * G["N"] / tot)), rng)
        tier1_parts.append((G["a"][sel[:t1]] + off, G["b"][sel[:t1]] + off))
        tier2_parts.append((G["a"][sel[t1:]] + off, G["b"][sel[t1:]] + off))
        blocks.append({"id": G["id"], "title": G["title"], "n": G["N"], "nodes": G["nodes"], "edges": G["edges"]})
        off += G["N"]
    pos = np.concatenate(P); pos /= np.abs(pos).max()
    T, D, C = np.concatenate(T), np.concatenate(D), np.concatenate(C)
    # orden global por grado: el prefijo (móvil / FPS bajo) mezcla todos los repos
    perm = np.argsort(-D, kind="stable"); inv = np.empty(len(perm), np.int64); inv[perm] = np.arange(len(perm))
    pos, T, D, C = pos[perm], T[perm], D[perm], C[perm]
    def tramo(parts):
        a = inv[np.concatenate([x[0] for x in parts])]; b = inv[np.concatenate([x[1] for x in parts])]
        a, b = np.minimum(a, b), np.maximum(a, b); o = np.lexsort((a, b)); return a[o], b[o]
    a1, b1 = tramo(tier1_parts); a2, b2 = tramo(tier2_parts)
    a, b, t1 = np.concatenate([a1, a2]), np.concatenate([b1, b2]), len(a1)
    gzb, rawb = escribir("galaxia.bin.gz", pack(pos, T, D, C, a, b, t1, True))
    meta["galaxy"] = {"file": "galaxia.bin.gz", "bytes": gzb, "raw": rawb, "shown_nodes": int(off), "shown_edges": int(len(a)), "tier1": t1,
                      "nodes": sum(G["nodes"] for G in Gs), "edges": sum(G["edges"] for G in Gs), "graphs": len(Gs), "blocks": blocks}
    print(f"galaxia: {off} nodos, {len(a)} aristas, {gzb / 1e6:.2f} MB · reales {meta['galaxy']['nodes']} / {meta['galaxy']['edges']}")
    (OUT / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, separators=(",", ":")), "utf8")

if __name__ == "__main__":
    main()
