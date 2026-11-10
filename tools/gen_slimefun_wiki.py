#!/usr/bin/env python3
"""Genera la wiki estatica de Slimefun (assets/sfwiki/) para la web de DrakesCraft.

Fuentes (todas reales, nada inventado):
  * MultiverseGambling item-values-addons.yml + item-values.yml (Dallas): lista VIVA de items
    registrados (id, nombre, maquina/receta, addon). Se regenera en cada arranque del servidor.
  * slimefun_lake.db (ai-hub/knowledge): receta 3x3, lore, categoria e investigacion por id
    (solo existe para los items del ultimo dump; el resto muestra solo lo que dice la lista viva).
NO se publican los valores en monedas.

Uso:  python3 tools/gen_slimefun_wiki.py --fetch          # baja los yml de Dallas (control_drakescraft.py)
      python3 tools/gen_slimefun_wiki.py --addons X.yml --core Y.yml --lake Z.db
"""
import argparse, json, os, re, shutil, sqlite3, subprocess, sys, unicodedata, tempfile
from collections import Counter, defaultdict
from datetime import datetime, timezone

HOME = os.path.expanduser("~")
CTRL = os.path.join(HOME, "ai-hub/scripts/control_drakescraft.py")
SHARD = 500
ROW = re.compile(r"^  ([A-Za-z0-9_\-]+): ([0-9.eE+\-]+)\s+# (.*)$")


def norm(s):
    return unicodedata.normalize("NFKD", s.lower()).encode("ascii", "ignore").decode()


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", norm(s)).strip("-") or "addon"


def pretty(s):
    s = s.split(":")[-1]
    return " ".join(w.capitalize() for w in re.split(r"[_\-\s]+", s) if w)


def split_comment(c):
    if ", " in c:
        n, m = c.rsplit(", ", 1)
        return n.strip(), m.strip()
    return c.strip(), "no recipe"


def parse_values(path, core):
    """core=True: seccion 'slimefun:' de item-values.yml; False: addons agrupados por etiqueta."""
    out, cur, on = [], None, not core
    for ln in open(path, encoding="utf-8"):
        ln = ln.rstrip("\n")
        if core:
            if re.match(r"^[a-z\-]+:", ln):
                on = ln.startswith("slimefun:")
                cur = "Slimefun"
                continue
        elif re.match(r"^'.*':\s*$", ln):
            cur = ln.strip()[1:-2].replace("''", "'")
            continue
        m = ROW.match(ln)
        if on and cur and m:
            n, mach = split_comment(m.group(3))
            out.append((cur, m.group(1), n, mach))
    return out


def clean_lore(t):
    return re.sub(r"[§&][0-9a-fk-or]", "", t or "").strip()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--addons"); ap.add_argument("--core")
    ap.add_argument("--lake", default=os.path.join(HOME, "ai-hub/knowledge/slimefun_lake.db"))
    ap.add_argument("--out", default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "sfwiki"))
    ap.add_argument("--fetch", action="store_true")
    a = ap.parse_args()
    if a.fetch:
        tmp = tempfile.mkdtemp()
        a.addons, a.core = tmp + "/iva.yml", tmp + "/iv.yml"
        for r, l in (("item-values-addons.yml", a.addons), ("item-values.yml", a.core)):
            subprocess.run([sys.executable, CTRL, "download", "/plugins/MultiverseGambling/" + r, l], check=True, stdout=subprocess.DEVNULL)
    live = parse_values(a.core, True) + parse_values(a.addons, False)
    db = sqlite3.connect("file:%s?mode=ro" % a.lake, uri=True)
    lake = {r[0]: r for r in db.execute(
        "select id,group_key,recipe_json,output_amount,research,research_cost,lore_text from items")}
    gname = {r[0]: r[1] for r in db.execute("select key,name from groups")}

    items, seen = {}, set()
    for label, iid, name, mach in live:
        if iid in seen:
            continue
        seen.add(iid)
        items[iid] = {"i": iid, "n": name, "addon": label, "m": mach}
    # addons ordenados por tamano
    cnt = Counter(v["addon"] for v in items.values())
    addons = [k for k, _ in sorted(cnt.items(), key=lambda x: (-x[1], x[0]))]
    slugs, used_slugs = {}, set()
    for k in addons:
        s = slug(k); b = s; n = 2
        while s in used_slugs:
            s = "%s-%d" % (b, n); n += 1
        used_slugs.add(s); slugs[k] = s
    aidx = {k: i for i, k in enumerate(addons)}

    cats, cidx = [], {}
    by_addon = defaultdict(list)
    for it in items.values():
        l = lake.get(it["i"])
        it["lk"] = l
        if l and l[1]:
            k = l[1]
            if k not in cidx:
                cidx[k] = len(cats); cats.append([k, gname.get(k) or pretty(k), aidx[it["addon"]]])
            it["c"] = cidx[k]
        by_addon[it["addon"]].append(it)

    # reverse "se usa en"
    used = defaultdict(set)
    for it in items.values():
        l = it["lk"]
        if not (l and l[2]):
            continue
        try:
            rec = json.loads(l[2])
        except Exception:
            continue
        it["rec"] = rec
        for s in rec:
            if s and s.get("sf") in items and s["sf"] != it["i"]:
                used[s["sf"]].add(it["i"])

    # shards
    for k in addons:
        lst = sorted(by_addon[k], key=lambda x: (cats[x["c"]][1] if "c" in x else "~", x["n"].lower(), x["i"]))
        by_addon[k] = lst
        for j, it in enumerate(lst):
            it["sh"] = j // SHARD

    out = os.path.abspath(a.out)
    shutil.rmtree(out, ignore_errors=True)
    os.makedirs(out + "/a"); os.makedirs(out + "/s")

    def ref(i):
        t = items[i]
        return [t["n"], slugs[t["addon"]], t["sh"]]

    with_rec = with_lore = 0
    meta_addons = []
    for k in addons:
        lst = by_addon[k]; s = slugs[k]
        nsh = (len(lst) + SHARD - 1) // SHARD
        for sh in range(nsh):
            chunk, refs, rows = lst[sh * SHARD:(sh + 1) * SHARD], {}, []
            for it in chunk:
                r = {"i": it["i"], "n": it["n"], "m": it["m"]}
                if "c" in it: r["c"] = it["c"]
                l = it["lk"]
                if l:
                    lore = clean_lore(l[6])
                    if lore: r["l"] = lore
                    if l[3] and l[3] > 1: r["o"] = l[3]
                    if l[4]: r["rs"] = pretty(l[4])
                    if l[5]: r["rc"] = l[5]
                if it.get("rec"):
                    slots = []
                    for sl in it["rec"]:
                        if not sl: slots.append(None); continue
                        e = {}
                        if "sf" in sl:
                            e["s"] = sl["sf"]
                            if sl["sf"] in items: refs[sl["sf"]] = ref(sl["sf"])
                        else:
                            e["m"] = sl.get("material", "?")
                        if sl.get("amount", 1) > 1: e["a"] = sl["amount"]
                        slots.append(e)
                    if any(slots): r["r"] = slots
                u = sorted(used.get(it["i"], ()), key=lambda x: items[x]["n"].lower())
                if u:
                    r["un"] = len(u)
                    r["u"] = u[:6]
                    for x in u[:6]: refs[x] = ref(x)
                if "l" in r: with_lore += 1
                if "r" in r: with_rec += 1
                rows.append(r)
            json.dump({"refs": refs, "items": rows}, open("%s/a/%s-%d.json" % (out, s, sh), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
        cc = Counter(it.get("c", -1) for it in lst)
        mc = Counter(it["m"] for it in lst if it["m"] not in ("no recipe",) and not it["m"].startswith("found"))
        feat = sorted(lst, key=lambda x: (-len(used.get(x["i"], ())), x["n"].lower()))
        pick = [x for x in feat if used.get(x["i"])] or [x for x in lst if x["lk"] and clean_lore(x["lk"][6])]
        feat, nm = [], set()
        for x in pick:
            if x["n"] not in nm and len(feat) < 5:
                nm.add(x["n"]); feat.append(x)
        meta_addons.append({"s": s, "n": k, "c": len(lst), "sh": nsh,
                            "cats": sorted([[c, n] for c, n in cc.items() if c >= 0], key=lambda x: -x[1]),
                            "nc": cc.get(-1, 0),
                            "tm": mc.most_common(4),
                            "f": [[x["i"], x["n"], x["sh"]] for x in feat],
                            "rc": sum(1 for x in lst if x.get("rec"))})

    # indices de busqueda por inicial de palabra
    buckets = defaultdict(dict)
    dup = Counter()
    for it in items.values():
        dup[(it["addon"], it["n"])] += 1
        if dup[(it["addon"], it["n"])] > 3:  # variantes identicas (p.ej. 8192 cofres de colores): solo 3 en la busqueda
            continue
        row = [it["i"], it["n"], aidx[it["addon"]], it.get("c", -1), it["sh"]]
        for tok in set(t for t in re.findall(r"[a-z0-9]+", norm(it["n"]) + " " + norm(it["i"])) if not t.isdigit()):
            ch = tok[0] if tok[0].isalnum() else "_"
            buckets[ch][it["i"]] = row
    for ch, d in buckets.items():
        json.dump(list(d.values()), open("%s/s/%s.json" % (out, ch), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))

    machines = Counter(it["m"] for it in items.values())
    meta = {"gen": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "items": len(items), "addons": len(addons), "cats": len(cats),
            "rec": with_rec, "lore": with_lore, "shard": SHARD,
            "A": meta_addons, "C": cats, "M": machines.most_common(60)}
    json.dump(meta, open(out + "/meta.json", "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    lost = sum(1 for k in lake if k not in items)
    tot = sum(os.path.getsize(os.path.join(dp, f)) for dp, _, fs in os.walk(out) for f in fs)
    print("items=%d addons=%d cats=%d con_receta=%d con_lore=%d lake_sin_vivo=%d tam=%.1fMB"
          % (len(items), len(addons), len(cats), with_rec, with_lore, lost, tot / 1e6))


if __name__ == "__main__":
    main()
