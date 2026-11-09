function storeEscape(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[character]));
}

// Precio base: USD (es lo que cobra Tebex). La conversion es solo una referencia
// con tasas del propio servidor (/fx-rates.json); sin tasas se muestra solo USD.
const FX_CURRENCIES = ["USD", "CLP", "ARS", "MXN", "COP", "PEN", "UYU", "BOB", "BRL", "EUR", "GBP", "CAD"];
const FX_NO_DECIMALS = new Set(["CLP", "ARS", "COP"]);
const FX_REGION = { CL: "CLP", AR: "ARS", MX: "MXN", CO: "COP", PE: "PEN", UY: "UYU", BO: "BOB", BR: "BRL", GB: "GBP", CA: "CAD",
    ES: "EUR", DE: "EUR", FR: "EUR", IT: "EUR", PT: "EUR", NL: "EUR", IE: "EUR", AT: "EUR", BE: "EUR", FI: "EUR", GR: "EUR" };
const FX_KEY = "drakes-fx-currency";
const storeIsEn = (document.documentElement.lang || "").toLowerCase().startsWith("en");
const storeText = (p, k) => (storeIsEn && p[k + "En"]) || p[k];
const storeIncludes = (p) => (storeIsEn && p.includesEn) || p.includes || [];
const fx = { rates: null, updated: null, cur: "USD" };

function fxStored() {
    try { const v = localStorage.getItem(FX_KEY); return FX_CURRENCIES.includes(v) ? v : null; } catch { return null; }
}
function fxSave(code) {
    try { localStorage.setItem(FX_KEY, code); } catch { /* sin almacenamiento: no pasa nada */ }
}
function fxGuess() {
    try {
        const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
        for (const tag of langs) {
            const region = String(tag || "").split("-")[1]?.toUpperCase();
            if (region && FX_REGION[region]) return FX_REGION[region];
        }
    } catch { /* ignorar */ }
    return "USD";
}
function usdText(value) {
    return `US$${value.toFixed(2)}`;
}
function fxApprox(usd) {
    const rate = fx.rates?.[fx.cur];
    if (fx.cur === "USD" || !Number.isFinite(rate) || !Number.isFinite(usd)) return "";
    const digits = FX_NO_DECIMALS.has(fx.cur) ? 0 : 2;
    const amount = (usd * rate).toLocaleString(storeIsEn ? "en-US" : "es-CL", { minimumFractionDigits: digits, maximumFractionDigits: digits });
    return `≈ ${fx.cur} ${amount}`;
}
// Precio efectivo (con oferta si la hay; el servidor lo calcula igual que Tebex).
function storeFinalUsd(product) {
    return Number.isFinite(product?.offerUsd) ? product.offerUsd : product?.usd;
}
function storeMoney(_value, product) {
    if (product?.coins) return `${product.coins.toLocaleString("es-CL")} ₯`;
    if (Number.isFinite(product?.offerUsd) && product.offerUsd < product.usd) {
        const now = product.offerUsd === 0 ? (storeIsEn ? "FREE" : "GRATIS") : usdText(product.offerUsd);
        return `<s style="opacity:.6;font-weight:400">${usdText(product.usd)}</s> <span>${now}</span>`;
    }
    return Number.isFinite(product?.usd) ? usdText(product.usd) : (storeIsEn ? "Not available" : "No disponible");
}
function storeFxLine(usd) {
    const text = fxApprox(usd);
    return text ? `<small class="store-fx-approx">${text}</small>` : "";
}

const TAB_EN = { monthly: "VIP Passes", titans: "Primordial Titans", protection: "Protections", utility: "Utilities", passes: "Passes & Commands", slimefun: "Slimefun Knowledge", roles: "Game Roles", kits: "Kits & Gear", crates: "Relics & Crates", boosters: "Global Boosters", christmas: "Christmas & Winter Solstice" };
function categoryLabel(category) {
    return plainLabel((storeIsEn && TAB_EN[category?.id]) || category?.label);
}
function plainLabel(text) {
    return String(text ?? "").replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\uFE0F]/gu, "").replace(/\s+/g, " ").trim();
}

const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
const GLYPHS = {
    monthly: '<path d="M6 37V15l10 9 8-14 8 14 10-9v22z"/><path d="M6 42h36"/>',
    titans: '<circle cx="24" cy="24" r="8"/><path d="M24 3v9M24 36v9M3 24h9M36 24h9M9 9l6 6M33 33l6 6M39 9l-6 6M15 33l-6 6"/>',
    protection: '<path d="M24 4l16 6v12c0 10-7 17-16 22C15 39 8 32 8 22V10z"/><path d="M17 23l5 5 9-10"/>',
    utility: '<path d="M27 4L10 27h12l-3 17 19-25H26z"/>',
    passes: '<path d="M4 32c9 0 15-5 19-16 2 7 7 11 17 11-4 9-12 14-23 14z"/><path d="M12 36l14-12"/>',
    slimefun: '<ellipse cx="24" cy="24" rx="19" ry="7"/><ellipse cx="24" cy="24" rx="19" ry="7" transform="rotate(60 24 24)"/><ellipse cx="24" cy="24" rx="19" ry="7" transform="rotate(120 24 24)"/><circle cx="24" cy="24" r="3"/>',
    roles: '<path d="M8 28c0-12 6-20 16-20s16 8 16 20v6H8z"/><path d="M8 28h32M24 8v20M17 34v8M31 34v8"/>',
    kits: '<path d="M8 40l24-24 9-9-1 11-24 24z"/><path d="M6 34l8 8M30 18l6 6"/>',
    crates: '<path d="M6 20h36v22H6zM6 20l4-12h28l4 12"/><path d="M6 28h36M21 28v6h6v-6"/>',
    boosters: '<path d="M19 4h10M21 4v14L8 38a4 4 0 003 6h26a4 4 0 003-6L27 18V4"/><path d="M14 32h20"/>',
    christmas: '<path d="M6 20h36v8H6zM9 28h30v16H9z"/><path d="M24 20v24M24 20c-6 0-10-3-8-7s8 0 8 7c0-7 6-11 8-7s-2 7-8 7z"/>'
};
function productArt(product) {
    const glyph = GLYPHS[product.category] || GLYPHS.utility;
    const tier = Number.isInteger(product.tier) && product.category === "monthly" ? ROMAN[Math.min(product.tier, 10)] || "" : "";
    return `<div class="store-product__art" aria-hidden="true"><svg viewBox="0 0 48 48" width="96" height="96" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="square" stroke-linejoin="miter">${glyph}</svg>${tier ? `<span class="store-product__tier">${tier}</span>` : ""}</div>`;
}
function productTicks(product) {
    return storeIncludes(product).slice(0, 3).map((item) => `<li>${storeInlineMarkup(plainLabel(item))}</li>`).join("");
}

function deliveryType(product) {
    if (product.purchaseAvailable === false) return "unavailable";
    if (product.category === "economy-kits") return "in-game";
    return product.tebexEnabled ? "tebex" : "unavailable";
}

function storeInlineMarkup(value) {
    return storeEscape(value)
        .replaceAll("&lt;code&gt;", "<code>")
        .replaceAll("&lt;/code&gt;", "</code>");
}

const deliveryLabel = {
    tebex: "Checkout Tebex",
    "in-game": "Se compra dentro del juego",
    unavailable: "Temporalmente no disponible"
};

document.addEventListener("DOMContentLoaded", () => {
    const grid = document.getElementById("store-grid");
    const tabs = document.getElementById("store-tabs");
    const form = document.getElementById("quote-form");
    const cartCount = document.getElementById("store-cart-count");
    const cartJump = document.getElementById("store-cart-jump");
    const cartJumpCount = document.getElementById("store-cart-jump-count");
    const nickInput = document.getElementById("input-nick");
    const avatarImg = document.getElementById("player-avatar");
    const platformJava = document.getElementById("btn-platform-java");
    const platformBedrock = document.getElementById("btn-platform-bedrock");
    const nickHint = document.getElementById("nick-platform-hint");

    if (!grid || !tabs || !form) return;

    let selectedPlatform = "java";
    let avatarDebounceTimer = null;

    // Actualizador de Avatar y Validación de Plataforma
    function updateAvatar() {
        const rawNick = (nickInput?.value || "").trim();
        if (!rawNick || rawNick.length < 3) {
            if (avatarImg) avatarImg.src = "https://minotar.net/helm/Steve/48.png";
            return;
        }

        // Limpiar el nick para la llamada al CDN de skins (ignorar punto en bedrock para la skin)
        const skinLookup = rawNick.startsWith(".") ? rawNick.substring(1) : rawNick;
        if (avatarImg) {
            avatarImg.src = `https://minotar.net/helm/${encodeURIComponent(skinLookup)}/48.png`;
            avatarImg.onerror = () => {
                avatarImg.src = "https://minotar.net/helm/Steve/48.png";
            };
        }
    }

    function setPlatform(platform) {
        selectedPlatform = platform;
        if (platform === "bedrock") {
            platformBedrock?.classList.add("is-active");
            platformJava?.classList.remove("is-active");
            if (nickHint) {
                nickHint.innerHTML = "<strong>Bedrock detectado:</strong> Si juegas en móvil/consola/Win10, asegúrate de que tu nick incluya el punto inicial (ejemplo: <code>.TuNick</code>).";
            }
            if (nickInput && nickInput.value && !nickInput.value.startsWith(".")) {
                nickInput.value = "." + nickInput.value;
            }
        } else {
            platformJava?.classList.add("is-active");
            platformBedrock?.classList.remove("is-active");
            if (nickHint) {
                nickHint.innerHTML = "<strong>Java Edition:</strong> Escribe tu nick tal cual aparece en el juego (sin puntos al inicio).";
            }
            if (nickInput && nickInput.value.startsWith(".")) {
                nickInput.value = nickInput.value.substring(1);
            }
        }
        updateAvatar();
    }

    platformJava?.addEventListener("click", () => setPlatform("java"));
    platformBedrock?.addEventListener("click", () => setPlatform("bedrock"));

    nickInput?.addEventListener("input", () => {
        clearTimeout(avatarDebounceTimer);
        avatarDebounceTimer = setTimeout(updateAvatar, 400);
    });

    const urlParams = new URLSearchParams(window.location.search);
    const requestedCategory = urlParams.get("categoria") || urlParams.get("category");
    const state = { catalog: null, category: requestedCategory || "monthly", selected: new Set() };
    const productById = (id) => state.catalog.products.find((product) => product.id === id);
    const selectedProducts = () => [...state.selected].map(productById).filter(Boolean);
    const selectedMode = () => selectedProducts()[0] ? deliveryType(selectedProducts()[0]) : null;
    let lastFocusedElement = null;

    function renderTabs() {
        if (!state.catalog?.categories) return;
        const validCategories = state.catalog.categories.filter((cat) => state.catalog.products?.some((p) => p.category === cat.id && (p.purchaseAvailable !== false || p.storeClosed)));
        tabs.innerHTML = validCategories.map((category) => 
            `<button class="store-tab ${category.id === state.category ? "is-active" : ""}" type="button" data-category="${storeEscape(category.id)}">${storeEscape(categoryLabel(category))}</button>`
        ).join("");
        
        const category = (validCategories || state.catalog.categories).find((entry) => entry.id === state.category);
        const titleElem = document.getElementById("store-category-title");
        if (titleElem) titleElem.textContent = categoryLabel(category) || (storeIsEn ? "Catalog" : "Catálogo DrakesCraft");
    }

    function renderProducts() {
        if (!state.catalog?.products) return;
        const products = state.catalog.products.filter((product) => product.category === state.category);
        const currentMode = selectedMode();
        
        grid.innerHTML = products.map((product) => {
            const mode = deliveryType(product);
            const selected = state.selected.has(product.id);
            const incompatible = currentMode && currentMode !== mode;
            const purchasable = mode !== "in-game" && mode !== "unavailable";
            return `<article class="store-product${product.featured ? " is-featured" : ""}" data-accent="${storeEscape(product.accent || "emerald")}" data-product="${storeEscape(product.id)}">
                ${productArt(product)}
                <div class="store-product__body">
                    <span class="store-product__tag">${storeEscape(product.badge || deliveryLabel[mode])}</span>
                    <h3>${storeEscape(storeText(product, "name"))}</h3>
                    <p class="store-product__summary">${storeInlineMarkup(storeText(product, "summary"))}</p>
                    <ul class="r-ticks">${productTicks(product)}</ul>
                </div>
                <div class="store-product__buy">
                    <strong class="store-product__price">${storeMoney(product.clp, product)}${storeFxLine(storeFinalUsd(product))}</strong>
                    <span class="store-product__delivery">${product.storeClosed ? closedLabel() : deliveryLabel[mode]}${product.offerId ? ` · ${storeEscape(offerLabel(product.offerId))}` : ""}</span>
                </div>
                <div class="store-product__actions">
                    <button class="btn btn-secondary" type="button" data-detail="${storeEscape(product.id)}">${storeIsEn ? "Details" : "Ver detalle"}</button>
                    <button class="btn ${selected ? "btn-primary" : "btn-secondary"}" type="button" data-select="${storeEscape(product.id)}" aria-pressed="${selected}" ${!purchasable || incompatible ? "disabled" : ""}>
                        ${product.storeClosed ? closedButton() : mode === "unavailable" ? (storeIsEn ? "Unavailable" : "No disponible") : !purchasable ? "In-game" : selected ? (storeIsEn ? "In cart" : "En el carrito") : incompatible ? (storeIsEn ? "Other flow" : "Otro flujo") : (storeIsEn ? "Add" : "Agregar")}
                    </button>
                </div>
            </article>`;
        }).join("");
    }

    function renderSelection() {
        const target = document.getElementById("quote-items");
        const note = document.getElementById("store-selection-note");
        const total = document.getElementById("quote-total");
        const products = selectedProducts();
        const itemCount = products.length;

        const submitBtn = document.getElementById("btn-submit-checkout");
        if (submitBtn) submitBtn.disabled = storeIsClosed();
        if (cartCount) cartCount.textContent = String(itemCount);
        if (cartJumpCount) cartJumpCount.textContent = String(itemCount);
        cartJump?.classList.toggle("hidden", itemCount === 0);

        if (!products.length) {
            if (target) target.innerHTML = "";
            if (note) {
                note.textContent = "Selecciona un producto del catálogo para continuar.";
                note.classList.remove("hidden");
            }
            if (total) total.innerHTML = usdText(0);
            return;
        }

        if (note) note.classList.add("hidden");
        if (target) {
            target.innerHTML = products.map((product) => 
                `<div class="store-selection-item">
                    <div>
                        <strong>${storeEscape(storeText(product, "name"))}</strong>
                        <p>${storeMoney(product.clp, product)}${fxApprox(storeFinalUsd(product)) ? ` (${fxApprox(storeFinalUsd(product))})` : ""} · ${deliveryLabel[deliveryType(product)]}</p>
                    </div>
                    <button type="button" data-remove="${storeEscape(product.id)}">Quitar</button>
                </div>`
            ).join("");
        }

        if (total) {
            const sumUsd = products.reduce((sum, product) => sum + (Number.isFinite(storeFinalUsd(product)) ? storeFinalUsd(product) : 0), 0);
            total.innerHTML = `${usdText(sumUsd)}${storeFxLine(sumUsd)}`;
        }
    }

    const seasonalBanners = {
        christmas: {
            icon: "",
            badge: "Solsticio Hiemal & Fiesta Navideña · Diciembre",
            badgeStyle: "background: rgba(56, 189, 248, 0.2); border: 1px solid #38bdf8; color: #bae6fd;",
            dotColor: "#38bdf8",
            glowColor: "#38bdf8",
            containerBg: "linear-gradient(135deg, rgba(8, 25, 45, 0.95), rgba(10, 38, 30, 0.95))",
            containerBorder: "2px solid #38bdf8",
            containerShadow: "0 0 35px rgba(56, 189, 248, 0.28)",
            btnStyle: "background: linear-gradient(135deg, #0284c7, #0f766e); box-shadow: 0 4px 18px rgba(56, 189, 248, 0.4); border: 1px solid #7dd3fc;",
            btnTextColor: "#fff",
            title: "La Ventisca Eterna de Bóreas ha descendido",
            desc: "El invierno primordial recorre las seis modalidades durante diciembre. Explora los pases globales, reliquias y beneficios activos en toda la red de DrakesCraft.",
            btnText: "Ver Pases VIP",
            category: "monthly"
        }
    };

    function renderSeasonalBanner() {
        const container = document.getElementById("store-seasonal-banner-container") || document.querySelector(".seasonal-banner");
        if (!container) return;

        const currentTheme = window.drakesCurrentTheme || (window.drakesDetectSeasonalTheme ? window.drakesDetectSeasonalTheme() : "default");
        const bannerConfig = seasonalBanners[currentTheme];

        if (!bannerConfig || currentTheme === "default") {
            container.style.display = "none";
            return;
        }

        container.style.display = "flex";
        container.style.background = bannerConfig.containerBg;
        container.style.border = bannerConfig.containerBorder;
        container.style.borderRadius = "14px";
        container.style.padding = "22px 28px";
        container.style.marginBottom = "25px";
        container.style.boxShadow = bannerConfig.containerShadow;
        container.style.alignItems = "center";
        container.style.justifyContent = "space-between";
        container.style.gap = "20px";
        container.style.flexWrap = "wrap";
        container.className = `seasonal-banner seasonal-banner--${currentTheme}`;

        container.innerHTML = `
          <div style="display: flex; align-items: center; gap: 18px;">
            <span style="font-size: 2.8rem; filter: drop-shadow(0 0 10px ${bannerConfig.glowColor}); line-height: 1;">${bannerConfig.icon}</span>
            <div>
              <div style="display: inline-flex; align-items: center; gap: 8px; ${bannerConfig.badgeStyle} padding: 3px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">
                <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: ${bannerConfig.dotColor}; box-shadow: 0 0 8px ${bannerConfig.dotColor};"></span>
                ${bannerConfig.badge}
              </div>
              <h3 style="margin: 0; font-size: 1.45rem; color: #fff; font-family: 'Space Grotesk', sans-serif;">${bannerConfig.title}</h3>
              <p style="margin: 4px 0 0; color: #d0c0d8; font-size: 0.92rem; max-width: 650px; line-height: 1.5;">${bannerConfig.desc}</p>
            </div>
          </div>
          <a href="#catalogo" onclick="window.storeSelectCategory && window.storeSelectCategory('${bannerConfig.category}')" style="${bannerConfig.btnStyle} color: ${bannerConfig.btnTextColor || '#fff'}; font-weight: 700; padding: 12px 24px; border-radius: 10px; text-decoration: none; white-space: nowrap; transition: transform 0.2s, box-shadow 0.2s;">
            ${bannerConfig.btnText}
          </a>
        `;
    }

    // --- Estado de la tienda (cerrada hasta la apertura) y ofertas activas ---
    const storeLocale = storeIsEn ? "en-US" : "es-CL";
    const fmtDate = (iso) => new Intl.DateTimeFormat(storeLocale, { timeZone: "America/Santiago", day: "numeric", month: "long" }).format(new Date(iso));
    const storeIsClosed = () => state.catalog?.store?.open === false;
    function closedLabel() { return storeIsEn ? "Opens soon" : "Próximamente"; }
    function closedButton() { return storeIsEn ? `Opens ${fmtDate(state.catalog.store.opensAt)}` : `Abre el ${fmtDate(state.catalog.store.opensAt)}`; }
    function offerLabel(id) {
        const offer = (state.catalog?.offers || []).find((o) => o.id === id);
        return offer ? (offer.name?.[storeIsEn ? "en" : "es"] || offer.name?.es || "") : "";
    }
    function countdownText(untilIso) {
        let s = Math.max(0, Math.floor((Date.parse(untilIso) - Date.now()) / 1000));
        const d = Math.floor(s / 86400); s -= d * 86400;
        const h = Math.floor(s / 3600); s -= h * 3600;
        const m = Math.floor(s / 60); s -= m * 60;
        const pad = (n) => String(n).padStart(2, "0");
        return `${d}d ${pad(h)}h ${pad(m)}m ${pad(s)}s`;
    }
    function renderStatusBanner() {
        const anchor = document.getElementById("store-seasonal-banner-container") || document.getElementById("store-tabs");
        if (!anchor || !state.catalog) return;
        let box = document.getElementById("store-status-banner");
        if (!box) {
            box = document.createElement("div");
            box.id = "store-status-banner";
            box.setAttribute("aria-live", "polite");
            box.style.cssText = "margin:0 0 20px;display:grid;gap:10px";
            anchor.parentNode.insertBefore(box, anchor);
        }
        const card = (border, html) => `<div style="border:2px solid ${border};border-radius:12px;padding:14px 18px;background:rgba(10,12,24,.85);color:#fff">${html}</div>`;
        const parts = [];
        if (storeIsClosed()) {
            const when = fmtDate(state.catalog.store.opensAt);
            const title = storeIsEn ? `Store opens ${when} · to be confirmed on Discord` : `Tienda abre el ${when} · por confirmar en Discord`;
            parts.push(card("#f59e0b", `<strong>${storeEscape(title)}</strong><div style="margin-top:4px">${storeIsEn ? "Opens in" : "Abre en"} <b data-countdown="${storeEscape(state.catalog.store.opensAt)}">${countdownText(state.catalog.store.opensAt)}</b></div>`));
        } else {
            for (const offer of (state.catalog.offers || []).filter((o) => o.applied)) {
                const text = offer.banner?.[storeIsEn ? "en" : "es"] || offer.name?.es;
                const info = offer.description?.[storeIsEn ? "en" : "es"] || "";
                parts.push(card("#a78bfa", `<strong>${storeEscape(text)}</strong><div style="margin:4px 0">${storeEscape(info)}</div><div>${storeIsEn ? "Ends in" : "Termina en"} <b data-countdown="${storeEscape(offer.end)}">${countdownText(offer.end)}</b></div>`));
            }
        }
        box.innerHTML = parts.join("");
        box.style.display = parts.length ? "grid" : "none";
    }
    let countdownReloaded = false;
    setInterval(() => {
        document.querySelectorAll("[data-countdown]").forEach((el) => {
            el.textContent = countdownText(el.dataset.countdown);
            if (Date.parse(el.dataset.countdown) <= Date.now() && !countdownReloaded) {
                countdownReloaded = true;
                setTimeout(() => { countdownReloaded = false; loadCatalog(); }, 2000);
            }
        });
    }, 1000);

    function renderAll() {
        const validIds = new Set(
            (state.catalog?.categories || [])
                .filter((cat) => state.catalog?.products?.some((p) => p.category === cat.id && (p.purchaseAvailable !== false || p.storeClosed)))
                .map((cat) => cat.id)
        );
        if (validIds.size > 0 && !validIds.has(state.category)) {
            state.category = validIds.has("monthly") ? "monthly" : [...validIds][0];
        }

        renderSeasonalBanner();
        renderStatusBanner();
        renderTabs();
        renderProducts();
        renderSelection();
    }

    window.addEventListener("drakesThemeChanged", () => {
        renderSeasonalBanner();
    });

    function closeDetail() {
        const modal = document.getElementById("store-modal");
        if (!modal || modal.classList.contains("hidden")) return;
        modal.classList.add("hidden");
        lastFocusedElement?.focus?.();
    }

    function openDetail(product) {
        const modal = document.getElementById("store-modal");
        const body = document.getElementById("store-modal-body");
        if (!modal || !body || !product) return;
        lastFocusedElement = document.activeElement;
        body.innerHTML = `
            <span class="store-product__tag">${deliveryLabel[deliveryType(product)]}</span>
            <h2>${storeEscape(storeText(product, "name"))}</h2>
            <p>${storeInlineMarkup(storeText(product, "summary"))}</p>
            <ul>${storeIncludes(product).map((item) => `<li>${storeInlineMarkup(plainLabel(item))}</li>`).join("")}</ul>
        `;
        modal.classList.remove("hidden");
        document.getElementById("store-modal-close")?.focus();
    }

    tabs.addEventListener("click", (event) => {
        const button = event.target.closest("[data-category]");
        if (!button) return;
        state.category = button.dataset.category;
        const url = new URL(window.location.href);
        url.searchParams.set("categoria", state.category);
        url.searchParams.delete("category");
        window.history.replaceState({}, "", url);
        renderAll();
    });

    grid.addEventListener("click", (event) => {
        const detail = event.target.closest("[data-detail]");
        if (detail) return openDetail(productById(detail.dataset.detail));
        const select = event.target.closest("[data-select]");
        if (!select || select.disabled) return;
        const id = select.dataset.select;
        state.selected.has(id) ? state.selected.delete(id) : state.selected.add(id);
        renderAll();
    });

    document.getElementById("quote-items")?.addEventListener("click", (event) => {
        const remove = event.target.closest("[data-remove]");
        if (!remove) return;
        state.selected.delete(remove.dataset.remove);
        renderAll();
    });

    const modal = document.getElementById("store-modal");
    document.getElementById("store-modal-close")?.addEventListener("click", closeDetail);
    modal?.addEventListener("click", (event) => { if (event.target === modal) closeDetail(); });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeDetail();
    });

    cartJump?.addEventListener("click", () => {
        document.getElementById("carrito")?.scrollIntoView({ behavior: "smooth" });
    });

    // Carga inicial del Catálogo desde la API backend
    async function loadCatalog() {
        const healthBadge = document.getElementById("store-health");
        const countBadge = document.getElementById("store-product-count");
        try {
            const response = await fetch("/api/store");
            if (!response.ok) throw new Error("No se pudo cargar el catálogo.");
            state.catalog = await response.json();
            if (healthBadge) healthBadge.textContent = "Catálogo Online";
            if (countBadge) countBadge.textContent = `${state.catalog.products?.length || 0} productos`;
            renderAll();
        } catch (error) {
            if (healthBadge) healthBadge.textContent = "Error de conexión";
            console.error("Fallo cargando catálogo de la tienda:", error);
        }
    }

    // Manejador de Submit hacia Tebex Checkout (Backend API intacta)
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (storeIsClosed()) {
            alert(storeIsEn ? "The store is not open yet." : "La tienda aún no está abierta.");
            return;
        }
        const products = selectedProducts();
        if (!products.length) {
            alert("Por favor agrega al menos un producto al carrito antes de continuar.");
            return;
        }

        const fields = new FormData(form);
        const nickVal = (fields.get("nick") || "").trim();
        if (!nickVal) {
            alert("Por favor escribe tu nick exacto de Minecraft.");
            return;
        }

        const payload = {
            nick: nickVal,
            contact: fields.get("contact") || "",
            notes: fields.get("notes") || "",
            website: fields.get("website") || "",
            items: products.map((product) => product.id)
        };

        const endpoint = "/api/store/tebex/checkout";
        const result = document.getElementById("quote-result");
        const submit = document.getElementById("btn-submit-checkout");

        try {
            if (submit) {
                submit.disabled = true;
                submit.innerHTML = '<span>Conectando con Tebex...</span>';
            }
            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "No se pudo preparar la orden en Tebex.");
            if (!data.init_point) throw new Error("Tebex no devolvió una URL de pago válida.");

            if (result) {
                result.innerHTML = `<strong>Orden creada con éxito.</strong><p>Redirigiendo al checkout seguro de Tebex...</p><a class="btn btn-primary" href="${storeEscape(data.init_point)}" style="display:inline-block;margin-top:0.5rem;">Ir al Pago Seguro</a>`;
                result.classList.remove("hidden");
            }
            window.location.assign(data.init_point);
        } catch (error) {
            if (result) {
                result.innerHTML = `<strong>Error al procesar:</strong><p>${storeEscape(error.message)}</p>`;
                result.classList.remove("hidden");
            }
            if (submit) {
                submit.disabled = false;
                submit.innerHTML = '<span>Ir al Pago Seguro en Tebex</span>';
            }
        }
    });

    // Selector de moneda de referencia
    const fxSelect = document.getElementById("fx-select");
    const fxBox = document.getElementById("fx-box");
    const fxStamp = document.getElementById("fx-updated");
    async function loadFx() {
        try {
            const response = await fetch("/fx-rates.json", { cache: "no-store" });
            const data = response.ok ? await response.json() : null;
            if (!data?.available || !data.rates) throw new Error("sin tasas");
            fx.rates = data.rates;
            fx.updated = data.updated || null;
        } catch {
            fx.rates = null;
        }
        if (!fxSelect) return;
        const usable = fx.rates ? FX_CURRENCIES.filter((code) => code === "USD" || Number.isFinite(fx.rates[code])) : ["USD"];
        const wanted = fxStored() || fxGuess();
        fx.cur = usable.includes(wanted) ? wanted : "USD";
        for (const option of [...fxSelect.options]) option.hidden = option.disabled = !usable.includes(option.value);
        fxSelect.value = fx.cur;
        if (fxBox) fxBox.classList.toggle("is-usd-only", usable.length < 2);
        if (fxStamp) fxStamp.textContent = fx.rates && fx.updated ? (storeIsEn ? "Rates: " : "Tasas: ") + fx.updated.slice(0, 10) : "";
        if (state.catalog) renderAll();
    }
    fxSelect?.addEventListener("change", () => {
        fx.cur = fxSelect.value;
        fxSave(fx.cur);
        renderAll();
    });
    loadFx();
    loadCatalog();
});
