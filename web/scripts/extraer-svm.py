#!/usr/bin/env python3
"""Extrae poderes y habilidades del datapack SVM Powers a catalog/svm_powers.json.
Uso: python3 -I scripts/extraer-svm.py <datapack_descomprimido> catalog/svm_powers.json"""
import json, os, re, sys

raiz, salida = sys.argv[1], sys.argv[2]
F = f"{raiz}/data/svm_ep/function"
load = open(f"{F}/load.mcfunction", encoding="utf8").read()
poderes = {}
for pid, nombre, obt in re.findall(r'register_power \{data:\{"power":"(\w+)",name:"([^"]+)".*?obtainable:(true|false)', load):
    ruta = f"{F}/menu/moves/setup/{pid}.mcfunction"
    t = open(ruta, encoding="utf8").read() if os.path.exists(ruta) else ""
    desc = (re.search(r'power\.temp\.description set value "(.*)"', t) or [None, ""])[1]
    habs = []
    for linea in t.splitlines():
        if linea.startswith("#") or "add_ability/main_new" not in linea:
            continue
        s = lambda k: (re.search(rf'"?{k}"?:"([^"]*)"', linea) or [None, None])[1]
        n = lambda k: (re.search(rf'"?{k}"?:"?(\d+)', linea) or [None, None])[1]
        i = n("id_number")
        cds = []
        for c in (f"{F}/power/{pid}/ability/use/{i}.mcfunction", f"{F}/power/{pid}/ability/use/{int(i):02d}.mcfunction"):
            if os.path.exists(c):
                cds = sorted({int(x) for x in re.findall(r"COOLDOWN_NEW svm_ep\.numbers (\d+)", open(c, encoding="utf8").read())})
                break
        habs.append({"id": i, "name": s("name"), "use": s("use_requirement"), "desc": s("description"),
                     "unlock": int(n("unlock_cost") or 0), "req": s("unlock_requirement"), "cooldown_ticks": cds})
    poderes[pid] = {"name": nombre, "obtainable": obt == "true", "desc": desc, "abilities": habs}
json.dump({"source": "SVM Powers data+resources 1.86.1", "powers": poderes}, open(salida, "w", encoding="utf8"), ensure_ascii=False, indent=1)
