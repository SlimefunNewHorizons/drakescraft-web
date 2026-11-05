/* ==========================================================================
   DRAKESCRAFT OWNER BIRTHDAY & COMMUNITY EVENT ENGINE (NOVIEMBRE)
   - Auto-activación programada (America/Santiago):
     * 1 al 21 de Noviembre: Fase 1 (Cuenta atrás discreta en encabezado)
     * 22 al 28 de Noviembre: Fase 2 (Semana del Cumple · sube la intensidad)
     * 29 de Noviembre: Fase 3 (Día del Cumple de JackStar · confeti + mensaje cálido)
     * 30 de Noviembre: Vuelve al tema normal (default)
     * 1 de Diciembre: Entra Navidad automáticamente
   - Apagado manual persistente (localStorage: drakes_birthday_disabled)
   - Respeto estricto a prefers-reduced-motion: reduce
   - Soporte bilingüe ES / EN
   ========================================================================== */
(function () {
    'use strict';

    function detectEnglish() {
        const htmlLang = (document.documentElement.lang || '').toLowerCase();
        if (htmlLang.startsWith('en')) return true;
        try {
            if (document.cookie.includes('googtrans=/es/en')) return true;
            if (localStorage.getItem('drakes_lang_choice') === 'en') return true;
        } catch (e) {}
        return false;
    }

    const isEn = detectEnglish();

    function getSantiagoDateParts() {
        try {
            const parts = new Intl.DateTimeFormat('en-CA', {
                timeZone: 'America/Santiago',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            }).formatToParts(new Date());
            const get = (type) => Number(parts.find((x) => x.type === type)?.value || 0);
            return {
                year: get('year'),
                month: get('month') - 1,
                day: get('day'),
                hour: get('hour'),
                minute: get('minute')
            };
        } catch (e) {
            const n = new Date();
            return {
                year: n.getFullYear(),
                month: n.getMonth(),
                day: n.getDate(),
                hour: n.getHours(),
                minute: n.getMinutes()
            };
        }
    }

    function getPreviewDayOverride() {
        try {
            const qDay = Number(new URLSearchParams(window.location.search).get('bday_day'));
            if (qDay >= 1 && qDay <= 29) return qDay;
        } catch (e) {}
        return null;
    }

    function isPreviewBirthday() {
        try {
            const q = new URLSearchParams(window.location.search).get('theme');
            if (q && q.toLowerCase() === 'birthday') return true;
            return sessionStorage.getItem('drakes_seasonal_preview') === 'birthday';
        } catch (e) {
            return false;
        }
    }

    function getBirthdayState() {
        const now = getSantiagoDateParts();
        const overrideDay = getPreviewDayOverride();
        const preview = isPreviewBirthday();
        const inNovemberWindow = now.month === 10 && now.day >= 1 && now.day <= 29;
        const activeWindow = inNovemberWindow || preview;
        const effectiveDay = overrideDay || (inNovemberWindow ? now.day : 22);
        const daysLeft = Math.max(0, 29 - effectiveDay);
        const hoursLeft = daysLeft > 0 ? Math.max(0, 23 - now.hour) : 0;

        let phase = 1; // 1..21 nov: discreta
        if (effectiveDay === 29) {
            phase = 3; // 29 nov: dia del cumple + confeti
        } else if (effectiveDay >= 22 && effectiveDay <= 28) {
            phase = 2; // 22..28 nov: semana del cumple (sube intensidad)
        }

        return {
            activeWindow,
            effectiveDay,
            daysLeft,
            hoursLeft,
            phase,
            year: now.year
        };
    }

    function isManuallyDisabled() {
        if (isPreviewBirthday()) return false;
        try {
            return localStorage.getItem('drakes_birthday_disabled') === '1';
        } catch (e) {
            return false;
        }
    }

    const initialState = getBirthdayState();
    if (!initialState.activeWindow) return;

    const reducedMotionQuery = window.matchMedia
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : { matches: false };

    let fxCanvas = null;
    let animFrame = null;
    let fxRunning = false;
    let resizeHandler = null;
    let burstParticles = [];

    function applyPhaseClasses() {
        const st = getBirthdayState();
        document.body.classList.remove('bday-phase-1', 'bday-phase-2', 'bday-phase-3');
        if (!isManuallyDisabled()) {
            document.body.classList.add('theme-birthday', `bday-phase-${st.phase}`);
        } else {
            document.body.classList.remove('theme-birthday');
        }
    }

    function getEventHref() {
        const path = window.location.pathname.split('/').pop() || 'index.html';
        if (path === '' || path === 'index.html' || path === 'index-en.html') {
            return '#evento-cumple';
        }
        return isEn ? 'index-en.html#evento-cumple' : 'index.html#evento-cumple';
    }

    function buildRibbonContent(st) {
        const eventHref = getEventHref();
        let badge = '';
        let message = '';
        let cta = '';

        if (st.phase === 1) {
            badge = isEn ? '🎂 NOV 29 · FOUNDER BIRTHDAY' : '🎂 29 NOV · CUMPLE DEL FUNDADOR';
            message = isEn
                ? `${st.daysLeft} ${st.daysLeft === 1 ? 'day' : 'days'} left until JackStar's birthday — Community greetings on Discord; November game events are cancelled.`
                : `Faltan ${st.daysLeft} ${st.daysLeft === 1 ? 'día' : 'días'} para el cumple de JackStar — Saludos comunitarios en Discord; los eventos de noviembre están cancelados.`;
            cta = isEn ? 'Community Greetings →' : 'Saludos comunitarios →';
        } else if (st.phase === 2) {
            badge = isEn ? '✨ BIRTHDAY WEEK · NOV 22–29' : '✨ SEMANA DEL CUMPLE · 22–29 NOV';
            message = isEn
                ? `Only ${st.daysLeft} ${st.daysLeft === 1 ? 'day' : 'days'} left (${st.hoursLeft}h)! Another year of 3 AM code & coffee — Share your greetings on Discord; November game events are cancelled.`
                : `¡Solo faltan ${st.daysLeft} ${st.daysLeft === 1 ? 'día' : 'días'} (${st.hoursLeft}h)! Otro año compilando a las 3 AM a punta de café — Comparte tu saludo en Discord; los eventos de noviembre están cancelados.`;
            cta = isEn ? 'Join Celebration →' : 'Dejar un saludo →';
        } else {
            badge = isEn ? '🎉 NOV 29 · HAPPY BIRTHDAY JACKSTAR!' : '🎉 29 NOV · ¡FELIZ CUMPLE JACKSTAR!';
            message = isEn
                ? 'Today we celebrate on DrakesCraft! Thank you all for keeping these six worlds alive — Leave your greeting on Discord 💛'
                : '¡Hoy estamos de fiesta en DrakesCraft! Gracias a todos por darle vida a estos seis mundos — Deja tu saludo en Discord 💛';
            cta = isEn ? 'Celebrate Together →' : 'Celebrar con la comunidad →';
        }

        const disableTitle = isEn ? 'Hide birthday banner and theme' : 'Ocultar aviso y modo cumpleaños';
        return `
            <div class="container bday-ribbon__inner">
                <div class="bday-ribbon__main">
                    <span class="bday-ribbon__badge">${badge}</span>
                    <span class="bday-ribbon__text">${message}</span>
                </div>
                <div class="bday-ribbon__actions">
                    <a class="bday-ribbon__link" href="${eventHref}">${cta}</a>
                    <button type="button" class="bday-ribbon__close" id="drakes-bday-ribbon-close" aria-label="${disableTitle}" title="${disableTitle}">✕</button>
                </div>
            </div>
        `;
    }

    function renderHeaderRibbon() {
        const existing = document.getElementById('drakes-birthday-ribbon');
        if (isManuallyDisabled()) {
            if (existing) existing.remove();
            return;
        }
        const st = getBirthdayState();
        let ribbon = existing;
        if (!ribbon) {
            ribbon = document.createElement('div');
            ribbon.id = 'drakes-birthday-ribbon';
            ribbon.className = `bday-ribbon bday-ribbon--phase-${st.phase}`;
            ribbon.setAttribute('role', 'region');
            ribbon.setAttribute('aria-label', isEn ? 'Founder Birthday Countdown' : 'Cuenta atrás del cumpleaños del fundador');
            const nav = document.querySelector('.site-nav');
            if (nav && nav.parentNode) {
                nav.parentNode.insertBefore(ribbon, nav);
            } else {
                document.body.prepend(ribbon);
            }
        } else {
            ribbon.className = `bday-ribbon bday-ribbon--phase-${st.phase}`;
        }
        ribbon.innerHTML = buildRibbonContent(st);
        const closeBtn = ribbon.querySelector('#drakes-bday-ribbon-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                setDisabledState(true);
            });
        }
    }

    function updateEventSectionNodes() {
        const st = getBirthdayState();
        document.querySelectorAll('[data-bday-countdown]').forEach((node) => {
            if (st.phase === 3) {
                node.textContent = isEn
                    ? '🎉 TODAY IS NOVEMBER 29 · CELEBRATION LIVE!'
                    : '🎉 ¡HOY ES 29 DE NOVIEMBRE · DÍA DEL CUMPLE EN VIVO!';
            } else if (st.phase === 2) {
                node.textContent = isEn
                    ? `✨ BIRTHDAY WEEK · ${st.daysLeft} ${st.daysLeft === 1 ? 'DAY' : 'DAYS'} & ${st.hoursLeft}H LEFT (NOV 29)`
                    : `✨ SEMANA DEL CUMPLE · FALTAN ${st.daysLeft} ${st.daysLeft === 1 ? 'DÍA' : 'DÍAS'} Y ${st.hoursLeft}H (29 NOV)`;
            } else {
                node.textContent = isEn
                    ? `🎂 COUNTDOWN TO NOV 29 · ${st.daysLeft} DAYS LEFT`
                    : `🎂 CUENTA ATRÁS AL 29 DE NOVIEMBRE · FALTAN ${st.daysLeft} DÍAS`;
            }
        });

        document.querySelectorAll('[data-bday-phase-label]').forEach((node) => {
            if (st.phase === 3) {
                node.textContent = isEn ? 'Phase 3 · Nov 29 Finale (Confetti & Community Tribute)' : 'Fase 3 · Gran Día 29 Nov (Confeti y Saludo Comunitario)';
            } else if (st.phase === 2) {
                node.textContent = isEn ? 'Phase 2 · Nov 22–28 (High-Intensity Birthday Week)' : 'Fase 2 · 22 al 28 Nov (Semana del Cumple · Intensidad Alta)';
            } else {
                node.textContent = isEn ? 'Phase 1 · Nov 1–21 (Warm-up & Countdown)' : 'Fase 1 · 1 al 21 Nov (Preparativos y Cuenta Atrás)';
            }
        });
    }

    function stopParticlesCanvas() {
        fxRunning = false;
        burstParticles = [];
        if (animFrame) {
            cancelAnimationFrame(animFrame);
            animFrame = null;
        }
        if (resizeHandler) {
            window.removeEventListener('resize', resizeHandler);
            resizeHandler = null;
        }
        if (fxCanvas && fxCanvas.parentNode) {
            fxCanvas.parentNode.removeChild(fxCanvas);
        }
        fxCanvas = null;
    }

    function spawnConfettiBurst(count) {
        if (reducedMotionQuery.matches || isManuallyDisabled()) return;
        if (!fxCanvas) startParticlesCanvas(true);
        if (!fxCanvas) return;
        const w = fxCanvas.width || window.innerWidth;
        const h = fxCanvas.height || window.innerHeight;
        const palette = ['#fbbf24', '#f59e0b', '#c084fc', '#38bdf8', '#f472b6', '#34d399'];
        const n = count || 45;
        for (let i = 0; i < n; i++) {
            burstParticles.push({
                x: w * (0.2 + Math.random() * 0.6),
                y: h * (0.15 + Math.random() * 0.25),
                vx: (Math.random() - 0.5) * 6.5,
                vy: -(Math.random() * 4.5 + 1.5),
                gravity: 0.12 + Math.random() * 0.06,
                size: Math.random() * 6 + 4,
                color: palette[Math.floor(Math.random() * palette.length)],
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.16,
                opacity: 1
            });
        }
    }

    function startParticlesCanvas(forceForBurst) {
        const st = getBirthdayState();
        if (reducedMotionQuery.matches || isManuallyDisabled()) {
            stopParticlesCanvas();
            return;
        }
        // En fase 1 (1-21 nov) mantenemos el modo discreto sin canvas continuo salvo burst manual
        if (st.phase === 1 && !forceForBurst) {
            stopParticlesCanvas();
            return;
        }
        if (document.getElementById('drakes-birthday-canvas')) return;

        const isMobile = window.innerWidth < 768;
        const canvas = document.createElement('canvas');
        canvas.id = 'drakes-birthday-canvas';
        canvas.setAttribute('aria-hidden', 'true');
        canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:9998;opacity:0.86;';
        document.body.appendChild(canvas);
        fxCanvas = canvas;

        const ctx = canvas.getContext('2d', { alpha: true });
        let width = (canvas.width = window.innerWidth);
        let height = (canvas.height = window.innerHeight);

        resizeHandler = () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', resizeHandler, { passive: true });

        const palette = ['#fbbf24', '#f59e0b', '#c084fc', '#e879f9', '#38bdf8', '#fde047'];
        const ambientCount = st.phase === 3 ? (isMobile ? 22 : 52) : (st.phase === 2 ? (isMobile ? 10 : 22) : 0);
        const ambient = [];

        for (let i = 0; i < ambientCount; i++) {
            ambient.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: st.phase === 3 ? (Math.random() * 5 + 3.5) : (Math.random() * 2.4 + 1.2),
                speedY: st.phase === 3 ? (Math.random() * 1.35 + 0.65) : (Math.random() * 0.55 + 0.25),
                speedX: (Math.random() - 0.5) * 0.5,
                sway: Math.random() * Math.PI * 2,
                swaySpeed: Math.random() * 0.02 + 0.008,
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.06,
                opacity: st.phase === 3 ? (Math.random() * 0.55 + 0.35) : (Math.random() * 0.4 + 0.2),
                color: palette[Math.floor(Math.random() * palette.length)],
                isConfetti: st.phase === 3
            });
        }

        if (st.phase === 3) {
            spawnConfettiBurst(isMobile ? 28 : 55);
        }

        fxRunning = true;

        function renderFrame() {
            if (!fxRunning) return;
            if (document.hidden || reducedMotionQuery.matches) {
                animFrame = null;
                return;
            }
            ctx.clearRect(0, 0, width, height);

            for (let i = 0; i < ambient.length; i++) {
                const p = ambient[i];
                p.sway += p.swaySpeed;
                p.y += p.speedY;
                p.x += p.speedX + Math.sin(p.sway) * 0.45;
                p.rotation += p.rotSpeed;

                if (p.y > height + 10) {
                    p.y = -10;
                    p.x = Math.random() * width;
                }
                if (p.x > width + 10) p.x = -10;
                if (p.x < -10) p.x = width + 10;

                ctx.save();
                ctx.globalAlpha = p.opacity;
                ctx.fillStyle = p.color;
                ctx.translate(p.x, p.y);
                if (p.isConfetti) {
                    ctx.rotate(p.rotation);
                    ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
                } else {
                    ctx.beginPath();
                    ctx.arc(0, 0, p.size, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            }

            for (let j = burstParticles.length - 1; j >= 0; j--) {
                const b = burstParticles[j];
                b.x += b.vx;
                b.y += b.vy;
                b.vy += b.gravity;
                b.rotation += b.rotSpeed;
                b.opacity -= 0.008;

                if (b.opacity <= 0 || b.y > height + 20) {
                    burstParticles.splice(j, 1);
                    continue;
                }

                ctx.save();
                ctx.globalAlpha = Math.max(0, b.opacity);
                ctx.fillStyle = b.color;
                ctx.translate(b.x, b.y);
                ctx.rotate(b.rotation);
                ctx.fillRect(-b.size / 2, -b.size / 3, b.size, b.size * 0.66);
                ctx.restore();
            }

            if (ambient.length === 0 && burstParticles.length === 0) {
                stopParticlesCanvas();
                return;
            }

            animFrame = requestAnimationFrame(renderFrame);
        }

        renderFrame();

        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && fxRunning && !animFrame && !reducedMotionQuery.matches) {
                animFrame = requestAnimationFrame(renderFrame);
            }
        });
    }

    function updateControlsUI(widget) {
        if (!widget) return;
        const disabled = isManuallyDisabled();
        const st = getBirthdayState();
        const toggleBtn = widget.querySelector('#drakes-birthday-toggle');
        const confettiBtn = widget.querySelector('#drakes-birthday-confetti');

        if (toggleBtn) {
            toggleBtn.setAttribute('aria-pressed', String(!disabled));
            if (disabled) {
                toggleBtn.textContent = isEn ? '🎂 Enable Birthday Mode' : '🎂 Activar Modo Cumple';
                toggleBtn.title = isEn ? 'Turn November birthday countdown & theme back on' : 'Volver a activar cuenta atrás y tema de cumpleaños';
            } else {
                const labelEs = st.phase === 3 ? '🎂 Cumple: ¡HOY!' : `🎂 Cumple: -${st.daysLeft}d`;
                const labelEn = st.phase === 3 ? '🎂 B-Day: TODAY!' : `🎂 B-Day: -${st.daysLeft}d`;
                toggleBtn.textContent = isEn ? labelEn : labelEs;
                toggleBtn.title = isEn ? 'Turn off birthday mode manually' : 'Apagar modo cumpleaños manualmente';
            }
        }

        if (confettiBtn) {
            const showConfettiBtn = !disabled && !reducedMotionQuery.matches;
            confettiBtn.style.display = showConfettiBtn ? 'inline-flex' : 'none';
            confettiBtn.textContent = isEn ? '🎉 Confetti' : '🎉 Confeti';
        }
    }

    function setDisabledState(nextDisabled) {
        if (nextDisabled) {
            stopParticlesCanvas();
            if (typeof window.drakesSetBirthdayDisabled === 'function') {
                window.drakesSetBirthdayDisabled(true);
            } else {
                try { localStorage.setItem('drakes_birthday_disabled', '1'); } catch (e) {}
                document.body.classList.remove('theme-birthday', 'bday-phase-1', 'bday-phase-2', 'bday-phase-3');
            }
        } else {
            if (typeof window.drakesSetBirthdayDisabled === 'function') {
                window.drakesSetBirthdayDisabled(false);
            } else {
                try { localStorage.removeItem('drakes_birthday_disabled'); } catch (e) {}
                document.body.classList.add('theme-birthday');
            }
            applyPhaseClasses();
            startParticlesCanvas(false);
        }
        renderHeaderRibbon();
        updateControlsUI(document.getElementById('drakes-birthday-widget'));
    }

    function injectBirthdayControls() {
        if (document.getElementById('drakes-birthday-widget')) return;

        const widget = document.createElement('div');
        widget.id = 'drakes-birthday-widget';
        widget.setAttribute('role', 'region');
        widget.setAttribute('aria-label', isEn ? 'Birthday mode controls' : 'Controles del modo cumpleaños');
        widget.innerHTML = `
            <button type="button" class="bday-ctrl-btn" id="drakes-birthday-toggle"></button>
            <button type="button" class="bday-ctrl-btn bday-ctrl-btn--burst" id="drakes-birthday-confetti" title="${isEn ? 'Launch celebration confetti' : 'Lanzar confeti de celebración'}"></button>
        `;
        document.body.appendChild(widget);

        const toggleBtn = widget.querySelector('#drakes-birthday-toggle');
        const confettiBtn = widget.querySelector('#drakes-birthday-confetti');

        toggleBtn.addEventListener('click', () => {
            setDisabledState(!isManuallyDisabled());
        });

        confettiBtn.addEventListener('click', () => {
            spawnConfettiBurst(42);
        });

        updateControlsUI(widget);
    }

    function initBirthdayFX() {
        applyPhaseClasses();
        renderHeaderRibbon();
        updateEventSectionNodes();
        injectBirthdayControls();

        if (!isManuallyDisabled()) {
            startParticlesCanvas(false);
        }

        document.querySelectorAll('[data-bday-trigger-confetti]').forEach((btn) => {
            btn.addEventListener('click', () => {
                if (isManuallyDisabled()) setDisabledState(false);
                spawnConfettiBurst(50);
            });
        });

        if (reducedMotionQuery.addEventListener) {
            reducedMotionQuery.addEventListener('change', (ev) => {
                if (ev.matches) stopParticlesCanvas();
                else if (!isManuallyDisabled()) startParticlesCanvas(false);
                updateControlsUI(document.getElementById('drakes-birthday-widget'));
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBirthdayFX);
    } else {
        initBirthdayFX();
    }
})();
