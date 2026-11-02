# DrakesCraft Web · Design System T2 (Cyberpunk + End Infection)

> **Ecosistema Soberano:** DrakesCraft · Star · SAORI  
> **Versión:** 2.0 (`Temporada 2 · Cyberpunk + End Infection`)  
> **Referencia Maestra:** `ai-hub/docs/DESIGN_SYSTEM.md`

---

## 1. Identidad Visual (Temporada 2)

El portal oficial `web.drakescraft.cl` fusiona la mitología épica de DrakesCraft con la estética **Cyberpunk + End Infection** de la Temporada 2 (Paper 26.2 + Stellarity + Slimefun Quantum):
- **Atmósfera:** Vacío abisal de obsidiana (`#06040E`), mallas técnicas HUD de 48×48 px, energía corrupta del End (violeta/magenta), telemetría cuántica cian y acentos imperiales en oro para jerarquías supremas y comercio oficial.
- **Movimiento responsable:** Micro-glitch sutil cada 7.5s en titulares `.t2-glitch-title` (`data-glitch`) y elevación controlada; se desactiva al 100% bajo `prefers-reduced-motion: reduce`.

---

## 2. Tokens Cromáticos (`styles/base.css` & `styles/t2.css`)

| Token CSS | HEX | Semántica |
|---|---|---|
| `--bg` / `--dk-fondo` | `#06040E` | Obsidiana Abisal (fondo base del Vacío) |
| `--bg-soft` / `--dk-panel` | `#0E0A1D` | Panel cristalizado End Infection |
| `--dk-panel-alto` | `#160F2D` | Superficie elevada / cabeceras de tabla |
| `--violet` / `--t2-v` | `#8B5CF6` | Púrpura Singularity (acento primario T2) |
| `--amethyst` | `#9B59B6` | Púrpura Amatista SAORI / SRE |
| `--rose` / `--t2-m` | `#E056FD` | Magenta End Infection (bordes activos, glitch, badges) |
| `--cyan` / `--t2-c` | `#00E5FF` | Cian Cuántico (telemetría, esquinas HUD, métricas) |
| `--gold` / `--dk-oro` | `#FFD700` | Oro Imperial (Olimpo, Dragmas `₯`, Tienda VIP) |
| `--emerald` | `#27AE60` | Verde Esmeralda Gaia (estados `ONLINE` / `HEALTHY`) |
| `--danger` | `#E74C3C` | Rojo Espartano Ares (alertas de combate / límites) |
| `--text` / `--dk-texto` | `#F8F9FA` | Blanco Marfil de alto contraste |
| `--muted` / `--dk-suave` | `#B0ACC9` | Lavanda grisácea para metadatos y notas |

---

## 3. Tipografía y Jerarquía

- **Display / Titulares (`--font-heading`):** `Cinzel` (600–800) para H1, H2 y rangos divinos.
- **Cuerpo / UI (`--font-body`):** `Instrument Sans` (400–700) para lectura fluida en escritorio y móvil.
- **Telemetría / Comandos (`--font-mono`):** `DM Mono` (400–500) para comandos (`/modalidades`, `/sf guide`), hashes, badges HUD y precios.

---

## 4. Componentes HUD Reutilizables (`styles/t2.css`)

- **`.t2-glitch-title` + `data-glitch`:** Degradado `#C084FC -> #E056FD -> #38BDF8` con capa pseudo-elemento sincronizada.
- **`.t2-hud-strip` / `.t2-status-bar`:** Cinta monoespaciada de telemetría rápida bajo el hero de cada página (motor en vivo, horizonte T2, modalidades, soporte multiplataforma).
- **`.t2-card` / `.guide-mode`:** Tarjetas con borde izquierdo energético, bisel HUD superior derecho en Cian Cuántico (`#00E5FF`) y resplandor amatista al pasar el cursor.
- **Galería `assets/screens/`:** 6 slots estandarizados (`slot-01` a `slot-06`) en WebP responsivo (`960w` y `1600w`, relación `16:9`) documentados en `assets/screens/MANIFEST.json` con atributos `alt` bilingües ES/EN listos para sustitución directa por capturas de Jack.

---

## 5. Ciclo Estacional Automático

- **Halloween:** Retirado definitivamente (código, CSS y referencias limpias).
- **Modo Navidad (`scripts/christmas-fx.js`):** Activación automática por calendario del **1 al 31 de diciembre** (`00:00`–`23:59:59`), con interruptor manual en barra de navegación (`localStorage`), copos ligeros en `<canvas>` adaptados a móvil, respeto estricto a `prefers-reduced-motion` y sonido de campanas **100% opt-in** mediante botón explícito (jamás autoplay).

---

## 6. Arquitectura de Páginas y Reglas Operativas

1. **Inicio (`index.html`, `index-en.html`):** Hero T2 End Infection, banda Horizonte Temporada 2, 6 modalidades, galería `assets/screens/`.
2. **Guía & Sub-guías (`guia.html`, `guide-en.html`, `guia-comandos*`, `guia-slimefun*`, `guia-plugins*`, `guia-rangos*`):** Buscador instantáneo, selector de las 6 modalidades, panteones, 26 bosses, progresión Slimefun New Horizons y suites propias.
3. **Comunidad & Telemetría (`apoya*`, `ojo-de-atenea*`, `metricas*`):** Sponsors transparentes, HUD Odysseia/SAORI y telemetría SRE en tiempo real.
4. **Soporte, Legal & Sistema (`support*`, `privacidad*`, `terms*`, `404*`, `500*`, `maintenance*`):** Marco legal Tebex Merchant of Record, protocolo anti-estafas y páginas de estado End Void.
5. **Invariante Sagrado de Tienda (`store.html`, `store-en.html`):** El flujo comercial Tebex, precios y pasarela de checkout jamás se alteran en rediseños editoriales; todo despliegue valida `npm run check` y `scripts/smoke-tests.js` (49+ productos y validaciones HTTP).
