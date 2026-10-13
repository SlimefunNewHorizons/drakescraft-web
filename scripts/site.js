/* Shared storefront interactions. Public pages are intentionally store-only. */
(function () {
    /**
     * Construye una única navegación para todo el portal y evita que cada
     * página mantenga una copia distinta de enlaces, títulos y estados activos.
     */
    function renderPrimaryNavigation() {
        const navigation = document.querySelector(".site-nav");
        const menu = document.getElementById("nav-menu");
        const brandSubtitle = document.querySelector(".brand__meta span");
        if (!navigation || !menu) return;

        const path = window.location.pathname.split("/").pop() || "index.html";
        const activeKey = path === "index.html" ? "home"
            : path === "store.html" ? "store"
                : path === "guia.html" ? "server"
                    : path === "guia-comandos.html" ? "commands"
                        : path === "guia-rangos.html" ? "ranks"
                            : path === "guia-slimefun.html" ? "slimefun"
                                : path === "metricas.html" ? "metrics"
                                    : path === "apoya.html" ? "support"
                                        : path === "support.html" || path === "terms.html" ? "help"
                                            : "";
        const items = [
            ["home", "Inicio", "/"],
            ["server", "El servidor", "guia.html"],
            ["commands", "Comandos", "guia-comandos.html"],
            ["ranks", "Rangos", "guia-rangos.html"],
            ["slimefun", "Slimefun", "guia-slimefun.html"],
            ["store", "Tienda", "store.html"],
            ["metrics", "Métricas", "metricas.html"],
            ["support", "Apoyar", "apoya.html"],
            ["help", "Soporte", "support.html"]
        ];

        try {
            const fragment = document.createDocumentFragment();
            items.forEach(([key, label, href]) => {
                const listItem = document.createElement("li");
                const link = document.createElement("a");
                link.href = href;
                link.textContent = label;
                if (key === activeKey) {
                    link.classList.add("active");
                    link.setAttribute("aria-current", "page");
                }
                listItem.appendChild(link);
                fragment.appendChild(listItem);
            });

            const discordItem = document.createElement("li");
            const discordLink = document.createElement("a");
            discordLink.className = "nav-discord";
            discordLink.href = "https://discord.gg/rv3vtXZTk7";
            discordLink.target = "_blank";
            discordLink.rel = "noopener";
            discordLink.textContent = "Discord";
            discordItem.appendChild(discordLink);
            fragment.appendChild(discordItem);

            const isTranslated = document.cookie.includes('googtrans=/es/en');
            const langItem = document.createElement("li");
            const langBtn = document.createElement("button");
            langBtn.className = "nav-lang-btn";
            langBtn.type = "button";
            langBtn.id = "nav-lang-toggle";
            langBtn.innerHTML = `🌐 <span>${isTranslated ? 'ES' : 'EN'}</span>`;
            langBtn.title = isTranslated ? "Cambiar a Español" : "Translate to English";
            langBtn.addEventListener("click", () => {
                if (isTranslated) {
                    resetGoogleTranslate();
                } else {
                    applyGoogleTranslate('en');
                }
            });
            langItem.appendChild(langBtn);
            fragment.appendChild(langItem);

            menu.replaceChildren(fragment);
            navigation.classList.remove("home-nav");
            if (brandSubtitle) brandSubtitle.textContent = "Portal oficial";
        } catch (error) {
            console.error("No se pudo unificar la navegación principal", error);
        }
    }

    function showToast(message) {
        let toast = document.querySelector(".toast");
        if (!toast) {
            toast = document.createElement("div");
            toast.className = "toast";
            toast.setAttribute("role", "status");
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.classList.add("is-visible");
        window.clearTimeout(showToast.timer);
        showToast.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 2200);
    }

    function setupNavigation() {
        const toggle = document.getElementById("nav-toggle");
        const menu = document.getElementById("nav-menu");
        if (!toggle || !menu) return;

        toggle.addEventListener("click", () => {
            const open = menu.classList.toggle("is-open");
            toggle.setAttribute("aria-expanded", String(open));
        });
    }

    function setupProgress() {
        const bar = document.getElementById("scroll-progress");
        if (!bar) return;
        const update = () => {
            const total = document.documentElement.scrollHeight - window.innerHeight;
            bar.style.width = `${Math.max(0, Math.min(100, total > 0 ? (window.scrollY / total) * 100 : 0))}%`;
        };
        window.addEventListener("scroll", update, { passive: true });
        update();
    }

    function setupTilt() {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        document.querySelectorAll(".tilt-card").forEach((card) => {
            card.addEventListener("mousemove", (event) => {
                const rect = card.getBoundingClientRect();
                const x = (event.clientX - rect.left) / rect.width;
                const y = (event.clientY - rect.top) / rect.height;
                card.style.transform = `rotateX(${(0.5 - y) * 5}deg) rotateY(${(x - 0.5) * 7}deg) translateY(-2px)`;
            });
            card.addEventListener("mouseleave", () => { card.style.transform = ""; });
        });
    }

    function setupCrestStage() {
        const stage = document.getElementById("storeCrestStage");
        const container = stage?.closest(".store-visual");
        if (!stage || !container || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        container.addEventListener("mousemove", (event) => {
            const rect = container.getBoundingClientRect();
            const x = event.clientX - rect.left - rect.width / 2;
            const y = event.clientY - rect.top - rect.height / 2;
            stage.style.transform = `rotateX(${(-y / rect.height) * 20}deg) rotateY(${(x / rect.width) * 20}deg) scale3d(1.03, 1.03, 1.03)`;
        });
        container.addEventListener("mouseleave", () => { stage.style.transform = ""; });
    }

    function setGoogleTranslateCookie(lang) {
        const domain = window.location.hostname.includes('drakescraft.cl') ? '.drakescraft.cl' : window.location.hostname;
        document.cookie = `googtrans=/es/${lang}; path=/;`;
        document.cookie = `googtrans=/es/${lang}; path=/; domain=${domain};`;
    }

    function applyGoogleTranslate(lang) {
        localStorage.setItem('drakes_lang_choice', lang);
        setGoogleTranslateCookie(lang);
        window.location.reload();
    }

    function resetGoogleTranslate() {
        localStorage.removeItem('drakes_lang_choice');
        const domain = window.location.hostname.includes('drakescraft.cl') ? '.drakescraft.cl' : window.location.hostname;
        document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${domain};`;
        window.location.reload();
    }

    function showLanguageBanner() {
        if (document.getElementById('dk-lang-banner')) return;
        const banner = document.createElement('aside');
        banner.className = 'dk-lang-banner';
        banner.id = 'dk-lang-banner';
        banner.setAttribute('role', 'dialog');
        banner.setAttribute('aria-label', 'Language selection');
        banner.innerHTML = `
          <div class="dk-lang-banner__content">
            <span class="dk-lang-icon" aria-hidden="true">🌐</span>
            <div class="dk-lang-text">
              <strong>We noticed your browser is in English.</strong>
              <span>Would you like to translate DrakesCraft into English?</span>
            </div>
            <div class="dk-lang-actions">
              <button class="dk-lang-btn dk-lang-btn--primary" id="dk-lang-translate" type="button">🌐 Translate to English</button>
              <button class="dk-lang-btn dk-lang-btn--ghost" id="dk-lang-dismiss" type="button" aria-label="Dismiss">✕ Not now</button>
            </div>
          </div>
        `;
        document.body.appendChild(banner);

        document.getElementById('dk-lang-translate')?.addEventListener('click', () => {
            applyGoogleTranslate('en');
        });

        document.getElementById('dk-lang-dismiss')?.addEventListener('click', () => {
            localStorage.setItem('drakes_lang_dismissed', 'true');
            banner.classList.add('hidden');
            setTimeout(() => banner.remove(), 400);
        });
    }

    function initBilingualSystem() {
        if (!document.getElementById('google_translate_element')) {
            const gtDiv = document.createElement('div');
            gtDiv.id = 'google_translate_element';
            gtDiv.style.display = 'none';
            document.body.appendChild(gtDiv);
        }

        window.googleTranslateElementInit = function() {
            try {
                new google.translate.TranslateElement({
                    pageLanguage: 'es',
                    includedLanguages: 'en,es,pt,fr',
                    autoDisplay: false
                }, 'google_translate_element');
            } catch (ignored) {}
        };

        if (!document.querySelector('script[src*="translate.google.com"]')) {
            const s = document.createElement('script');
            s.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
            s.async = true;
            document.body.appendChild(s);
        }

        const isAlreadyEn = document.cookie.includes('googtrans=/es/en') || localStorage.getItem('drakes_lang_choice') === 'en';
        if (isAlreadyEn && !document.cookie.includes('googtrans=/es/en')) {
            setGoogleTranslateCookie('en');
        }

        const userLang = (navigator.language || (navigator.languages && navigator.languages[0]) || '').toLowerCase();
        const isNonSpanish = userLang && !userLang.startsWith('es');
        const dismissed = localStorage.getItem('drakes_lang_dismissed') === 'true';

        if (isNonSpanish && !isAlreadyEn && !dismissed) {
            showLanguageBanner();
        }
    }

    const SEASON_THEMES = ["halloween", "birthday", "christmas", "valentines", "default"];

    // Fecha segun America/Santiago (el servidor es chileno): asi el cambio de tema ocurre a medianoche de Chile
    // para todos los visitantes y no segun la zona horaria de cada uno.
    function chileDate() {
        try {
            const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit" })
                .formatToParts(new Date());
            const get = (type) => Number(parts.find((x) => x.type === type).value);
            return { month: get("month") - 1, day: get("day") };
        } catch (e) {
            const now = new Date();
            return { month: now.getMonth(), day: now.getDate() };
        }
    }

    // Tema por calendario:
    //   octubre ......... halloween   (se retira el 31 de octubre)
    //   noviembre ....... birthday    (cumpleanos del owner, 29 de noviembre)
    //   1 dic - 15 ene .. christmas   (se retira el 15 de enero)
    //   febrero ......... valentines
    function calendarTheme() {
        const { month, day } = chileDate();
        if (month === 9) return "halloween";
        if (month === 10) return "birthday";
        if (month === 11 || (month === 0 && day <= 15)) return "christmas";
        if (month === 1) return "valentines";
        return "default";
    }

    function detectSeasonalTheme() {
        // ?theme=... sirve para previsualizar y SOLO vale en esa pestana (sessionStorage). Antes se guardaba en
        // localStorage y el visitante se quedaba para siempre en Halloween aunque ya fuera diciembre.
        const queryTheme = new URLSearchParams(window.location.search).get("theme");
        if (queryTheme && SEASON_THEMES.includes(queryTheme.toLowerCase())) {
            const normalized = queryTheme.toLowerCase();
            try { sessionStorage.setItem("drakes_seasonal_preview", normalized); } catch (e) {}
            return normalized;
        }
        try {
            const preview = sessionStorage.getItem("drakes_seasonal_preview");
            if (preview && SEASON_THEMES.includes(preview)) return preview;
            localStorage.removeItem("drakes_seasonal_theme"); // valor viejo que fijaba el tema para siempre
        } catch (e) {}
        return calendarTheme();
    }

    function ensureSeasonalStylesheet() {
        if (!document.querySelector('link[href*="seasonal-themes.css"]')) {
            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.href = "styles/seasonal-themes.css?v=20261014-v6";
            document.head.appendChild(link);
        }
    }

    function ensureHalloweenFX() {
        if (!document.getElementById("drakes-halloween-fx-script")) {
            const script = document.createElement("script");
            script.id = "drakes-halloween-fx-script";
            script.src = "scripts/halloween-fx.js?v=20261014";
            document.head.appendChild(script);
        }
    }

    function ensureChristmasFX() {
        if (!document.getElementById("drakes-christmas-fx-script")) {
            const script = document.createElement("script");
            script.id = "drakes-christmas-fx-script";
            script.src = "scripts/christmas-fx.js?v=20261014";
            document.head.appendChild(script);
        }
    }

    function applySeasonalTheme(forcedTheme) {
        ensureSeasonalStylesheet();
        const theme = forcedTheme || detectSeasonalTheme();
        document.body.classList.remove("theme-halloween", "theme-birthday", "theme-christmas", "theme-valentines");
        if (theme !== "default") {
            document.body.classList.add("theme-" + theme);
            if (theme === "halloween") {
                ensureHalloweenFX();
            } else if (theme === "christmas") {
                ensureChristmasFX();
            }
        }
        window.drakesCurrentTheme = theme;
        window.dispatchEvent(new CustomEvent("drakesThemeChanged", { detail: { theme } }));
        return theme;
    }

    window.showToast = showToast;
    window.setupTilt = setupTilt;
    window.drakesDetectSeasonalTheme = detectSeasonalTheme;
    window.drakesCalendarTheme = calendarTheme;
    window.drakesApplySeasonalTheme = applySeasonalTheme;
    window.drakesSetSeasonalTheme = function(theme) {
        try { sessionStorage.setItem("drakes_seasonal_preview", theme); } catch (e) {}
        return applySeasonalTheme(theme);
    };

    document.addEventListener("DOMContentLoaded", () => {
        applySeasonalTheme();
        renderPrimaryNavigation();
        setupNavigation();
        setupProgress();
        setupCrestStage();
        initBilingualSystem();
        document.querySelectorAll("[data-year]").forEach((node) => { node.textContent = String(new Date().getFullYear()); });
    });
}());
