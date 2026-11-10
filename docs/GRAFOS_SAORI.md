# SAORI · Laboratorio de grafos

Página: `/saori.html` (ES), `/saori-en.html` (EN); `/grafos.html` redirige a la ES. Bloque reducido en la portada ES/EN.

## Piezas
- `scripts/grafos.js` — canvas 2D con proyección 3D propia (sin librerías). Carga diferida, pausa fuera de pantalla y con la pestaña oculta, ≤1500 nodos (≤400 bajo 760 px), estático con `prefers-reduced-motion`.
- `styles/grafos.css` — escenario, pestañas y paneles HUD. `styles/cosmos.css` — tokens de color, cielo, vidrio, grecas, centrado (todas las páginas).
- `assets/svg/griego.svg` — símbolos: columna, laurel, ánfora, búho, roseta, frontón.
- `assets/svg/t2/*.svg` — láminas de los cantos de la T2 (`tools/gen_laminas_t2.py`).

## Snapshots (`assets/grafos/*.json`)
Se regeneran con `python3 tools/gen_grafos.py` y luego `python3 tools/build_saori.py` si cambia el marcado.
Solo usan datos que la web ya publica:
- `slimefun.json` — addons → categorías → ítems, desde `assets/sfwiki/` (wiki pública).
- `plugins.json` — familias → suites → funciones, desde `guia-plugins(.html|-en.html)`.
- `web.json` — archivos de `scripts/` del repo público → funciones (`graphify-out/graph.json`; si falta, se conserva el anterior).
- `saori.json` — flujo **ilustrativo** agentes → etapas → eventos. Sintético: no hay tickets, logs ni nombres reales.

Cada etiqueta pasa por `limpiar()`: descarta rutas, IPs, hosts internos y palabras de credenciales.

## HUD
Solo lee `/api/server-status` y `/api/metricas` (públicos, sin nombres de jugadores en pantalla). No usa `/api/saori/*`
(son un puente al socket interno). Las líneas del terminal son decorativas, sintetizadas desde esas métricas.
Si las APIs fallan, el HUD muestra "SIN SEÑAL" y el grafo funciona igual.

## Grafos REALES (en curso, 2026-11-10)
Estado: **exportación lista y verificada; el renderer WebGL NO está hecho**. La web desplegada sigue con
`scripts/grafos.js` (canvas 2D) y los snapshots `.json` de arriba, que se conservan.

Regenerar (en Star, numpy en `~/.venvs/grafos`): `~/.venvs/grafos/bin/python tools/gen_grafos.py` (~1 min).
Lee `graphify-out/graph.json` de los repos listados en `SOURCES` (base `GRAFOS_ROOT`, por defecto `$HOME`) y escribe en
`assets/grafos/`: `<id>.bin.gz` (pestañas), `<id>.lbl.gz` (solo públicos), `galaxia.bin.gz` y `meta.json`.

Exportado (nodos/aristas reales · archivo): labs 50 145/185 647 · 0,72 MB (+0,19 etiquetas); ai-hub 26 984/44 851 · 0,26;
TinkersConstruct 22 385/113 426 · 0,46; Denizen 18 154/66 168 · 0,29; BentoBox 11 862/55 687 · 0,22; EliteMobs 11 735/39 917 · 0,19;
RealisticVillagers 9 608/36 227 · 0,15; star-server-backup 11 299/21 073 · 0,13; Slimefun4 7 916/34 106; EssentialsX 8 199/26 999;
InteractiveChat-DiscordSRV 7 669/29 034; MultiverseCreatures 7 330/29 813; GrimAC 7 388/25 428 (≤0,15 MB c/u).
Galaxia total: 35 repos, **273 484 nodos / 960 254 aristas reales**, 329 981 aristas exportadas, 2,61 MB.

Formato `.bin` (tras gunzip, little endian): `"DGR1"`, u32 N, u32 M, u32 T1 (aristas del bosque generador, van primero), u32 flags
(bit0 = aristas u32; si no, u16); Int16 N×3 posiciones (normalizadas ±32000, relleno a 4 bytes); Uint8 N×4 `[tipo, grado≤255,
comunidad lo, comunidad hi]` (en la galaxia: `hi` = índice del repo en `meta.galaxy.blocks`); aristas M×2. Nodos ordenados por
grado desc y cada tramo de aristas por su nodo mayor: un prefijo de nodos + prefijo de aristas es un subgrafo válido (móvil/FPS).
Tipos: Archivo, Clase, Función, Documento, Símbolo. Layout 3D offline: comunidades relajadas con fuerzas sobre esfera + dispersión local suavizada.
Se sirve como `application/gzip` sin Content-Encoding: el cliente debe usar `DecompressionStream(gzip)` (comprobar bytes 1f 8b).

Privacidad: `gh repo view --json isPrivate` en cada ejecución; sin remoto GitHub o con error = privado. Privados (ai-hub,
star-server-backup) y todos los de solo-galaxia: solo posición, tipo genérico, comunidad numerada y grado. Públicos: además
etiqueta de símbolo filtrada por `limpiar()` (sin rutas, IPs, @, palabras de credenciales; máx. 48 car.). Nunca se exportan
ids, `source_file`, `community_name` ni textos.

Falta: renderer WebGL en `scripts/grafos.js` (gl.POINTS aditivo por grado/comunidad, líneas alpha bajo, zoom/pinch, doble clic,
picking solo en públicos, LOD, FPS adaptativo, tope móvil ~40k nodos/30k aristas, fallback canvas), pestañas desde `meta.json`
(Galaxia solo al pulsar), HUD con totales reales, textos de `tools/build_saori.py` + `python3 tools/build_saori.py`, capturas
1600/375. Desplegar después: `cd /opt/stacks/drakescraft-web && docker tag drakescraft-web:portal2 rollback-grafos &&
docker compose build -q drakescraft-web && docker compose up -d --no-deps drakescraft-web`.
