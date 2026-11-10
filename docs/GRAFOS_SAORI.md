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
