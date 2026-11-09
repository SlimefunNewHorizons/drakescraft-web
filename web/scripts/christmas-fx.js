/* ==========================================================================
   DRAKESCRAFT CHRISTMAS & HIEMAL SOLSTICE ATMOSPHERIC ENGINE (FASE 2)
   - Auto-activación programada: 1 al 31 de Diciembre (America/Santiago)
   - Apagado manual persistente (localStorage: drakes_christmas_disabled)
   - Nieve ligera en Canvas con pausa en pestaña oculta y bajo consumo móvil
   - Respeto estricto a prefers-reduced-motion
   - Sonido de campanas cristalinas 100% OPT-IN con botón (nunca autoplay)
   ========================================================================== */
(function () {
    'use strict';

    const isEn = (document.documentElement.lang || '').toLowerCase().startsWith('en');

    function isDecemberWindow() {
        if (typeof window.drakesCalendarTheme === 'function') {
            return window.drakesCalendarTheme() === 'christmas';
        }
        let month, day;
        try {
            const parts = new Intl.DateTimeFormat('en-CA', {
                timeZone: 'America/Santiago',
                month: '2-digit',
                day: '2-digit'
            }).formatToParts(new Date());
            month = Number(parts.find((x) => x.type === 'month').value) - 1;
            day = Number(parts.find((x) => x.type === 'day').value);
        } catch (e) {
            const n = new Date();
            month = n.getMonth();
            day = n.getDate();
        }
        return month === 11 && day >= 1 && day <= 31;
    }

    function isPreviewChristmas() {
        const q = new URLSearchParams(window.location.search).get('theme');
        if (q && q.toLowerCase() === 'christmas') return true;
        try {
            return sessionStorage.getItem('drakes_seasonal_preview') === 'christmas';
        } catch (e) {
            return false;
        }
    }

    function isManuallyDisabled() {
        if (isPreviewChristmas()) return false;
        try {
            return localStorage.getItem('drakes_christmas_disabled') === '1';
        } catch (e) {
            return false;
        }
    }

    if (!isDecemberWindow() && !isPreviewChristmas()) return;

    const reducedMotionQuery = window.matchMedia
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : { matches: false };

    let snowCanvas = null;
    let animFrame = null;
    let snowRunning = false;
    let resizeHandler = null;

    // Web Audio API opt-in bells (NUNCA autoplay; solo al pulsar el botón)
    let audioCtx = null;
    let bellsEnabled = false;
    let bellsTimer = null;

    function playChimeChord() {
        if (!bellsEnabled || document.hidden) return;
        const AudioCtor = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtor) return;
        if (!audioCtx) {
            audioCtx = new AudioCtor();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume().catch(() => {});
        }
        const now = audioCtx.currentTime;
        // Acorde cristalino invernal suave (E6, G#6, B6, E7)
        const notes = [1318.51, 1661.22, 1975.53, 2637.02];
        notes.forEach((freq, idx) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.14);
            gain.gain.setValueAtTime(0.0001, now + idx * 0.14);
            gain.gain.exponentialRampToValueAtTime(0.035, now + idx * 0.14 + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.14 + 1.45);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(now + idx * 0.14);
            osc.stop(now + idx * 0.14 + 1.5);
        });
    }

    function stopBells() {
        bellsEnabled = false;
        if (bellsTimer) {
            clearInterval(bellsTimer);
            bellsTimer = null;
        }
    }

    function toggleBells(btn) {
        if (bellsEnabled) {
            stopBells();
        } else {
            bellsEnabled = true;
            playChimeChord();
            bellsTimer = setInterval(playChimeChord, 11000);
        }
        updateControlsUI(btn?.closest('#drakes-christmas-widget'));
    }

    function stopSnowCanvas() {
        snowRunning = false;
        if (animFrame) {
            cancelAnimationFrame(animFrame);
            animFrame = null;
        }
        if (resizeHandler) {
            window.removeEventListener('resize', resizeHandler);
            resizeHandler = null;
        }
        if (snowCanvas && snowCanvas.parentNode) {
            snowCanvas.parentNode.removeChild(snowCanvas);
        }
        snowCanvas = null;
    }

    function startSnowCanvas() {
        if (reducedMotionQuery.matches || isManuallyDisabled()) {
            stopSnowCanvas();
            return;
        }
        if (document.getElementById('drakes-christmas-canvas')) return;

        const isMobile = window.innerWidth < 768;
        const canvas = document.createElement('canvas');
        canvas.id = 'drakes-christmas-canvas';
        canvas.setAttribute('aria-hidden', 'true');
        canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:9998;opacity:0.82;';
        document.body.appendChild(canvas);
        snowCanvas = canvas;

        const ctx = canvas.getContext('2d', { alpha: true });
        let width = (canvas.width = window.innerWidth);
        let height = (canvas.height = window.innerHeight);

        resizeHandler = () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', resizeHandler, { passive: true });

        // Bajo consumo en móvil: máximo 16 copos sin shadowBlur
        const maxFlakes = isMobile ? 16 : 42;
        const flakes = [];
        for (let i = 0; i < maxFlakes; i++) {
            flakes.push({
                x: Math.random() * width,
                y: Math.random() * height,
                radius: Math.random() * (isMobile ? 1.8 : 2.3) + 0.9,
                speedY: Math.random() * 0.95 + 0.45,
                speedX: Math.random() * 0.4 - 0.2,
                opacity: Math.random() * 0.5 + 0.28,
                sway: Math.random() * Math.PI * 2,
                swaySpeed: Math.random() * 0.018 + 0.008,
                isCrystal: Math.random() > 0.78
            });
        }

        snowRunning = true;

        function renderSnow() {
            if (!snowRunning) return;
            if (document.hidden || reducedMotionQuery.matches) {
                animFrame = null;
                return;
            }
            ctx.clearRect(0, 0, width, height);

            for (let i = 0; i < flakes.length; i++) {
                const f = flakes[i];
                f.sway += f.swaySpeed;
                f.y += f.speedY;
                f.x += f.speedX + Math.sin(f.sway) * 0.35;

                if (f.y > height + 6) {
                    f.y = -6;
                    f.x = Math.random() * width;
                }
                if (f.x > width + 6) f.x = -6;
                if (f.x < -6) f.x = width + 6;

                ctx.globalAlpha = f.opacity;
                ctx.fillStyle = f.isCrystal ? '#bae6fd' : '#f0f9ff';
                ctx.beginPath();
                ctx.arc(f.x, f.y, f.isCrystal ? f.radius * 1.15 : f.radius, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
            animFrame = requestAnimationFrame(renderSnow);
        }

        renderSnow();

        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && snowRunning && !animFrame && !reducedMotionQuery.matches) {
                animFrame = requestAnimationFrame(renderSnow);
            }
        });
    }

    function updateControlsUI(widget) {
        if (!widget) return;
        const disabled = isManuallyDisabled();
        const toggleBtn = widget.querySelector('#drakes-christmas-toggle');
        const bellsBtn = widget.querySelector('#drakes-christmas-bells');

        if (toggleBtn) {
            toggleBtn.setAttribute('aria-pressed', String(!disabled));
            toggleBtn.textContent = disabled
                ? (isEn ? '❄️ Enable Christmas' : '❄️ Activar Navidad')
                : (isEn ? '❄️ Snow: ON' : '❄️ Nieve: ON');
            toggleBtn.title = disabled
                ? (isEn ? 'Turn seasonal snow & theme back on' : 'Volver a activar tema y nieve de Navidad')
                : (isEn ? 'Turn off Christmas mode manually' : 'Apagar modo Navidad manualmente');
        }
        if (bellsBtn) {
            bellsBtn.style.display = disabled ? 'none' : 'inline-flex';
            bellsBtn.setAttribute('aria-pressed', String(bellsEnabled));
            bellsBtn.textContent = bellsEnabled
                ? (isEn ? '🔔 Bells: ON' : '🔔 Campanas: ON')
                : (isEn ? '🔕 Bells' : '🔕 Campanas');
        }
    }

    function injectChristmasControls() {
        if (document.getElementById('drakes-christmas-widget')) return;

        const style = document.createElement('style');
        style.textContent = `
            #drakes-christmas-widget {
                position: fixed;
                bottom: 18px;
                left: 18px;
                z-index: 9999;
                display: flex;
                align-items: center;
                gap: 6px;
                font-family: var(--font-mono, monospace);
            }
            .christmas-ctrl-btn {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                background: rgba(8, 20, 36, 0.9);
                border: 1px solid rgba(56, 189, 248, 0.45);
                border-radius: 999px;
                padding: 7px 13px;
                color: #e0f2fe;
                font-size: 0.75rem;
                font-weight: 600;
                cursor: pointer;
                backdrop-filter: blur(8px);
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
                transition: border-color 0.2s ease, background 0.2s ease;
            }
            .christmas-ctrl-btn:hover {
                border-color: #7dd3fc;
                background: rgba(12, 34, 58, 0.96);
            }
            .christmas-ctrl-btn[aria-pressed="true"] {
                border-color: #38bdf8;
                box-shadow: 0 0 14px rgba(56, 189, 248, 0.28);
            }
            @media (max-width: 760px) {
                #drakes-christmas-widget {
                    bottom: 82px;
                    left: 12px;
                }
                .christmas-ctrl-btn {
                    padding: 6px 10px;
                    font-size: 0.7rem;
                }
            }
        `;
        document.head.appendChild(style);

        const widget = document.createElement('div');
        widget.id = 'drakes-christmas-widget';
        widget.setAttribute('role', 'region');
        widget.setAttribute('aria-label', isEn ? 'Christmas seasonal controls' : 'Controles del modo Navidad');
        widget.innerHTML = `
            <button type="button" class="christmas-ctrl-btn" id="drakes-christmas-toggle"></button>
            <button type="button" class="christmas-ctrl-btn" id="drakes-christmas-bells" aria-pressed="false" title="${isEn ? 'Toggle soft winter chimes (opt-in sound)' : 'Alternar sonido suave de campanas (opt-in)'}"></button>
        `;
        document.body.appendChild(widget);

        const toggleBtn = widget.querySelector('#drakes-christmas-toggle');
        const bellsBtn = widget.querySelector('#drakes-christmas-bells');

        toggleBtn.addEventListener('click', () => {
            const nextDisabled = !isManuallyDisabled();
            if (nextDisabled) {
                stopBells();
                stopSnowCanvas();
                if (typeof window.drakesSetChristmasDisabled === 'function') {
                    window.drakesSetChristmasDisabled(true);
                } else {
                    try { localStorage.setItem('drakes_christmas_disabled', '1'); } catch (e) {}
                    document.body.classList.remove('theme-christmas');
                }
            } else {
                if (typeof window.drakesSetChristmasDisabled === 'function') {
                    window.drakesSetChristmasDisabled(false);
                } else {
                    try { localStorage.removeItem('drakes_christmas_disabled'); } catch (e) {}
                    document.body.classList.add('theme-christmas');
                }
                startSnowCanvas();
            }
            updateControlsUI(widget);
        });

        bellsBtn.addEventListener('click', () => toggleBells(bellsBtn));
        updateControlsUI(widget);
    }

    function initChristmasFX() {
        injectChristmasControls();
        if (!isManuallyDisabled()) {
            startSnowCanvas();
        }
        if (reducedMotionQuery.addEventListener) {
            reducedMotionQuery.addEventListener('change', (ev) => {
                if (ev.matches) stopSnowCanvas();
                else if (!isManuallyDisabled()) startSnowCanvas();
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initChristmasFX);
    } else {
        initChristmasFX();
    }
})();
