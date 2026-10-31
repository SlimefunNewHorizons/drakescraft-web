// Buscador y filtros de la guia con soporte para acordeones desplegables
(() => {
    const input = document.getElementById("guide-q");
    const count = document.getElementById("guide-count");
    const empty = document.getElementById("guide-empty");
    const filters = [...document.querySelectorAll(".guide-filters button, .guide-chips button")];
    const accordions = [...document.querySelectorAll(".guide-accordion")];
    const sections = [...document.querySelectorAll(".guide-section")];
    const rows = [...document.querySelectorAll(".guide-row")];
    const btnExpandAll = document.getElementById("btn-expand-all");
    const btnCollapseAll = document.getElementById("btn-collapse-all");

    if (!input || !rows.length) return;

    const modalitySelector = document.getElementById("modality-selector");
    const modalityCard = document.getElementById("modality-card");
    const modalityBtns = modalitySelector ? [...modalitySelector.querySelectorAll(".modality-btn")] : [];

    // Definición canónica de las 6 modalidades de DrakesCraft
    const modalityDetails = {
        slimefun: {
            icon: "⚡",
            name: "Slimefun Survival (Polis / Principal)",
            command: "/survival",
            alias: "/slimefun, /principal, /polis",
            gradient: "linear-gradient(90deg, #10b981, #06b6d4)",
            summary: "La modalidad central técnica de DrakesCraft. Combina la supervivencia pura con automatización industrial de Slimefun, magia oscura y botánica, más de 26 dioses panteónicos, economía algorítmica y jefes adaptativos con auras 3D.",
            available: [
                "60+ expansiones activas de Slimefun (Networks, Infinity, DynaTech, AlchimiaVitae, Crystamae, etc.).",
                "Protección de terrenos con ProtectionStones (/ps get).",
                "Economía mixta: subastas locales (/ah), mercado de ítems SF (/sfmercado) y banco (/sbank).",
                "Panteones de Dioses (/dioses) y 26 Jefes adaptativos (/bosses).",
                "Destilería de bebidas BreweryX (/brew) y aldeanos dinámicos con diálogo.",
                "100 Rangos anime con DrakesRankup (/rankup) y habilidades de Ki (/transform)."
            ],
            locked: [
                "Los inventarios, niveles y avances no viajan a otras modalidades (aislamiento por InvSwitcher-Drake).",
                "Modo creativo y comandos de trampa bloqueados (/sf cheat no permitido aquí)."
            ],
            mechanics: [
                "Borde de mundo expandido y generación enriquecida con estructuras.",
                "Tumbas inteligentes con AxGraves (7 días de retención de inventario y XP al morir).",
                "Límite de menas de protección ampliables en tienda (/tiendaprot)."
            ]
        },
        clasico: {
            icon: "🌲",
            name: "Survival Clásico (Vanilla Puro)",
            command: "/clasico",
            alias: "/clasico",
            gradient: "linear-gradient(90deg, #3b82f6, #6366f1)",
            summary: "Minecraft tradicional en su máxima pureza. Sin Slimefun, sin máquinas industriales, sin transformaciones de Ki ni mobs alterados. Terreno generado con Terralith, biomas únicos y una experiencia de exploración y construcción clásica.",
            available: [
                "Supervivencia vanilla pura 1.21.11 con generación de terreno Terralith.",
                "Hogares personales (/sethome) y teletransporte mutuo (/tpa).",
                "Protección de terreno mediante piedras ProtectionStones (/ps) con límites propios independientes.",
                "Bóvedas personales aisladas (/pv) y banco (/sbank).",
                "Casa de subastas exclusiva entre jugadores vanilla (/ah).",
                "Resguardo de inventario en tumbas al morir (/graves)."
            ],
            locked: [
                "❌ Sin Slimefun ni maquinaria tecnológica.",
                "❌ Sin rangos anime con kits OP ni transformaciones de Ki (balance clásico).",
                "❌ Sin jefes ni habilidades de dioses.",
                "❌ Sin warps públicos (/warps bloqueado; muévete explorando o con /rtp)."
            ],
            mechanics: [
                "Borde de mundo de 200.000 bloques.",
                "Economía de Dragmas compartida, pero inventarios e ítems estrictamente aislados del Survival técnico."
            ]
        },
        skyblock: {
            icon: "☁️",
            name: "SkyBlock (Islas en el Vacío)",
            command: "/skyblock",
            alias: "/is, /island, /sb",
            gradient: "linear-gradient(90deg, #38bdf8, #0284c7)",
            summary: "Empieza con recursos mínimos en una isla flotante en el vacío. Puedes progresar con tecnología de Slimefun o jugar en estilo skyblock tradicional. El radio de tu territorio se expande automáticamente al subir de rango en /rankup.",
            available: [
                "Gestión integral de isla con BentoBox (/is, /is go, /is team, /is settings).",
                "Slimefun y máquinas habilitadas (o juego clásico sin máquinas a elección del jugador).",
                "Recálculo de nivel de isla (/is level) según bloques colocados en el mundo.",
                "Generadores de piedra personalizables (/is generator) y cambio de biomas (/is biome).",
                "Asaltos (Raids) de aldea funcionales (requiere plataforma sólida de aparición a la misma altura).",
                "Protección y auto-expansión de radio de isla por cada nivel de /rankup."
            ],
            locked: [
                "❌ No usa piedras de protección ProtectionStones (el terreno lo protege BentoBox).",
                "❌ No hay spawn general: apareces directamente en tu isla.",
                "❌ Lo guardado en cofres, shulkers o islas del Nether/End no suma al nivel de isla."
            ],
            mechanics: [
                "Salvaguarda de caída al vacío: si caes, el motor te rescata evitando la muerte instantánea.",
                "Morir resta 1 nivel completo de isla (100 puntos)."
            ]
        },
        oneblock: {
            icon: "🌀",
            name: "OneBlock (El Bloque Infinito)",
            command: "/oneblock",
            alias: "/ob, /oneblock",
            gradient: "linear-gradient(90deg, #a855f7, #7c3aed)",
            summary: "Un solo bloque bajo tus pies que nunca se agota. Al picarlo, evoluciona a lo largo de 21 fases progresivas liberando nuevos bloques, cofres con botín raro y criaturas de todas las dimensiones.",
            available: [
                "Bloque mágico infinito central (/ob) con 21 fases evolutivas.",
                "Comprobador de bloques rotos y fase actual (/ob count, /ob phases).",
                "Herramienta de rescate del bloque central si se pierde accidentalmente (/ob respawnblock).",
                "Contador visual de fase en pantalla (/ob bossbar, /ob actionbar).",
                "Soporte completo de Slimefun, magia y equipos (/ob team).",
                "Expansión automática del radio de protección de tu isla al ascender con /rankup."
            ],
            locked: [
                "❌ Sin islas externas iniciales: todo el mundo se genera a partir de tu bloque único.",
                "❌ No se usan piedras de protección externas.",
                "❌ Inventario aislado del Survival y de SkyBlock."
            ],
            mechanics: [
                "Al completar las 21 fases, el ciclo reinicia en un bucle infinito de alta dificultad con recompensas superiores.",
                "Protección contra el vacío de Odysseia activa."
            ]
        },
        onechunk: {
            icon: "🧱",
            name: "OneChunk (minar a través de un chunk)",
            command: "/onechunk",
            alias: "/oc, /onechunk",
            gradient: "linear-gradient(90deg, #ea580c, #f97316)",
            summary: "Mina a través de un chunk de 16x16 generado para ti (el primero es un bosque con árboles, hierro, carbón y piedra). Al agotarlo aparece el siguiente y cada 3 chunks cambia el bioma, con mobs cada vez más peligrosos.",
            available: [
                "Primer chunk con recursos garantizados: árboles, hierro, carbón, piedra y tierra.",
                "Lo que picas no se regenera: se mina a través del chunk; al agotarlo aparece el siguiente.",
                "Cinco biomas que rotan cada 3 chunks: bosque, desierto, tundra nevada, jungla y cavernas profundas.",
                "Menas más ricas con el progreso (redstone, oro, lapislázuli y diamante en chunks avanzados).",
                "Slimefun habilitado."
            ],
            locked: [
                "❌ No hay piedras de protección: tu isla está protegida por el propio sistema de islas.",
                "❌ Los mobs hostiles de cada chunk aumentan en número y peligro con el progreso."
            ],
            mechanics: [
                "Si el chunk se agota mientras estás dentro, el siguiente aparece encima de ti: te llevan a la superficie con seguridad.",
                "Economía de Dragmas y rangos VIP compartidos; inventario propio."
            ]
        },
        laboratorio: {
            icon: "🧪",
            name: "Laboratorio Creativo (Zona de Sandbox)",
            command: "/laboratorio",
            alias: "/warp laboratorio",
            gradient: "linear-gradient(90deg, #f43f5e, #e11d48)",
            summary: "Un mundo plano pacífico, sin mobs y en modo creativo permanente. Pensado para que los jugadores puedan diseñar, cablear y probar circuitos complejos, reactores nucleares y redes de Slimefun sin arriesgar sus materiales en Survival.",
            available: [
                "Modo Creativo permanente para diseñar planos y probar multibloques.",
                "Cheat Sheet completo de Slimefun (/sf cheat o Shift + Clic con la guía) para retirar cualquier ítem gratis.",
                "Todas las investigaciones de Slimefun desbloqueadas virtualmente dentro del mundo.",
                "Pruebas de maquinaria sin explosiones destructivas reales en el mapa."
            ],
            locked: [
                "❌ CERO traspaso de objetos al exterior: /pv, /ah, /trade y /enderchest estrictamente bloqueados.",
                "❌ No se permite crear tiendas, subastas ni depósitos bancarios.",
                "❌ No se guardan hogares ni teletransportes cruzados.",
                "❌ El mapa se regenera periódicamente cada semana (no construyas bases permanentes aquí)."
            ],
            mechanics: [
                "Aislamiento hermético de seguridad de Star Engine: lo que entra o se genera en Laboratorio, se queda en Laboratorio."
            ]
        }
    };

    let activeModality = "all";

    function renderModalityCard(modKey) {
        if (!modalityCard) return;
        if (modKey === "all" || !modalityDetails[modKey]) {
            modalityCard.classList.add("is-hidden");
            modalityCard.innerHTML = "";
            return;
        }

        const data = modalityDetails[modKey];
        modalityCard.style.setProperty("--mod-accent-gradient", data.gradient);
        modalityCard.innerHTML = `
            <div class="modality-overview-card__header">
                <div class="modality-overview-card__title">
                    <span style="font-size: 2rem;">${data.icon}</span>
                    <div>
                        <h3>${data.name}</h3>
                        <span style="font-size: 0.85rem; opacity: 0.7;">Comando de entrada: </span>
                        <code class="modality-badge-code">${data.command}</code>
                    </div>
                </div>
                <div style="font-size: 0.82rem; opacity: 0.65;">Alias: ${data.alias}</div>
            </div>
            <p class="modality-overview-card__summary">${data.summary}</p>
            <div class="modality-matrix-grid">
                <div class="modality-matrix-box modality-matrix-box--active">
                    <h4><span>✅</span> Disponible en este Mundo</h4>
                    <ul>
                        ${data.available.map(item => `<li>${item}</li>`).join("")}
                    </ul>
                </div>
                <div class="modality-matrix-box modality-matrix-box--locked">
                    <h4><span>❌</span> Restricciones & Bloqueos</h4>
                    <ul>
                        ${data.locked.map(item => `<li>${item}</li>`).join("")}
                    </ul>
                </div>
                <div class="modality-matrix-box modality-matrix-box--mechanics">
                    <h4><span>⚙️</span> Mecánicas Especiales</h4>
                    <ul>
                        ${data.mechanics.map(item => `<li>${item}</li>`).join("")}
                    </ul>
                </div>
            </div>
        `;
        modalityCard.classList.remove("is-hidden");
    }

    // Indexar texto y contexto de modalidad de cada fila
    const index = rows.map((row) => {
        const text = row.textContent.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
        const tagText = row.querySelector(".guide-tag")?.textContent.toLowerCase() || "";
        const rowCode = row.querySelector("code")?.textContent.toLowerCase() || "";
        
        // Mapeo determinista vía data-mod si existe
        let mods = [];
        if (row.dataset.mod) {
            mods = row.dataset.mod.split(",").map(m => m.trim().toLowerCase());
        } else {
            mods = ["all"];
            if (rowCode.startsWith("/is") || tagText.includes("skyblock")) mods.push("skyblock");
            if (rowCode.startsWith("/ob") || tagText.includes("oneblock")) mods.push("oneblock");
            if (rowCode.startsWith("/oc") || rowCode.startsWith("/onechunk") || tagText.includes("onechunk")) mods.push("onechunk");
            if (tagText.includes("clásico") || text.includes("clásico")) mods.push("clasico");
            if (rowCode.startsWith("/sf") || tagText.includes("slimefun") || text.includes("slimefun")) mods.push("slimefun", "skyblock", "oneblock", "onechunk", "laboratorio");
            if (rowCode.includes("laboratorio") || tagText.includes("laboratorio") || rowCode.includes("/sf cheat")) mods.push("laboratorio");
            if (tagText.includes("todos") || row.closest("#basicos") || row.closest("#social") || row.closest("#drakescraft") || row.closest("#traductor") || row.closest("#comodidad")) {
                mods.push("slimefun", "clasico", "skyblock", "oneblock", "onechunk", "laboratorio");
            }
        }

        return {
            row,
            accordion: row.closest(".guide-accordion"),
            section: row.closest(".guide-section"),
            text,
            mods
        };
    });

    let category = "all";

    const normalize = (value) => value.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").trim();

    function apply() {
        const query = normalize(input.value);
        const terms = query.split(/\s+/).filter(Boolean);
        let visible = 0;
        const matchingAccordions = new Set();

        for (const entry of index) {
            const accCat = entry.accordion?.dataset.cat || entry.section?.dataset.cat || "all";
            const matchesCategory = category === "all" || accCat === category;
            const matchesModality = activeModality === "all" || entry.mods.includes(activeModality);
            const matchesText = terms.every((term) => entry.text.includes(term));
            const show = matchesCategory && matchesModality && matchesText;
            
            entry.row.classList.toggle("is-hidden", !show);
            if (show) {
                visible++;
                if (entry.accordion) {
                    matchingAccordions.add(entry.accordion);
                }
            }
        }

        // Gestionar visibilidad y auto-apertura de acordeones
        accordions.forEach((acc) => {
            const accCat = acc.dataset.cat || "all";
            const matchesCategory = category === "all" || accCat === category;
            const hasVisibleRows = matchingAccordions.has(acc);
            const isMatch = matchesCategory && (terms.length === 0 || hasVisibleRows);

            acc.classList.toggle("is-hidden", !isMatch);

            if (terms.length > 0 && hasVisibleRows) {
                acc.open = true;
            }
        });

        // Secciones simples sin acordeón
        sections.forEach((section) => {
            if (!section.classList.contains("guide-accordion")) {
                const anyVisible = section.querySelector(".guide-row:not(.is-hidden)");
                section.classList.toggle("is-hidden", !anyVisible);
            }
        });

        empty?.classList.toggle("is-hidden", visible > 0);
        if (count) {
            const isEn = document.documentElement.lang === "en";
            count.textContent = terms.length || category !== "all" || activeModality !== "all"
                ? (isEn ? `${visible} of ${index.length} entries found` : `${visible} de ${index.length} entradas encontradas`)
                : (isEn ? `${index.length} commands and mechanics cataloged` : `${index.length} mecánicas y recetas catalogadas`);
        }
    }

    input.addEventListener("input", apply);

    // Eventos de botones de modalidad
    modalityBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
            activeModality = btn.dataset.mod || "all";
            modalityBtns.forEach((other) => {
                const isSelected = other === btn;
                other.setAttribute("aria-pressed", String(isSelected));
                other.classList.toggle("is-active", isSelected);
            });
            renderModalityCard(activeModality);
            apply();
        });
    });

    try {
        const q = new URLSearchParams(window.location.search).get("q");
        if (q) { input.value = q; }
        const modParam = new URLSearchParams(window.location.search).get("mod");
        if (modParam && modalityDetails[modParam]) {
            const targetBtn = modalityBtns.find(b => b.dataset.mod === modParam);
            if (targetBtn) {
                targetBtn.click();
            }
        }
    } catch (_) { /* sin query */ }

    filters.forEach((button) => {
        button.addEventListener("click", () => {
            category = button.dataset.filter || "all";
            filters.forEach((other) => {
                const isSelected = other === button;
                other.setAttribute("aria-pressed", String(isSelected));
                other.classList.toggle("is-active", isSelected);
            });
            apply();
        });
    });

    if (btnExpandAll) {
        btnExpandAll.addEventListener("click", () => {
            accordions.forEach(acc => {
                if (!acc.classList.contains("is-hidden")) acc.open = true;
            });
        });
    }

    if (btnCollapseAll) {
        btnCollapseAll.addEventListener("click", () => {
            accordions.forEach(acc => acc.open = false);
        });
    }

    apply();
})();

