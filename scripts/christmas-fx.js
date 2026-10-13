/* ==========================================================================
   DRAKESCRAFT CHRISTMAS & HIEMAL SOLSTICE ATMOSPHERIC ENGINE
   - Partículas de nieve y cristales de hielo (Canvas ultraliviano 60fps)
   - Resplandor auroral y copos con deriva sinusoidal
   - Banner interactivo de Solsticio Hiemal y Kit de Navidad
   - Auto-activación programada: Diciembre y hasta el 15 de Enero
   ========================================================================== */
(function () {
    'use strict';

    // Misma regla que site.js (calendario de Chile, ?theme= solo en la pestana). Si site.js no esta cargado, se
    // replica la parte necesaria.
    function isSeason() {
        if (typeof window.drakesDetectSeasonalTheme === 'function') return window.drakesDetectSeasonalTheme() === 'christmas';
        const q = new URLSearchParams(window.location.search).get('theme');
        if (q) return q.toLowerCase() === 'christmas';
        let month, day;
        try {
            const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
            month = Number(parts.find((x) => x.type === 'month').value) - 1;
            day = Number(parts.find((x) => x.type === 'day').value);
        } catch (e) { const n = new Date(); month = n.getMonth(); day = n.getDate(); }
        return month === 11 || (month === 0 && day <= 15);
    }

    if (!isSeason()) return;

    function initChristmasFX() {
        if (document.getElementById('drakes-christmas-canvas')) return;

        // 1. Canvas para copos de nieve y cristales de hielo
        const canvas = document.createElement('canvas');
        canvas.id = 'drakes-christmas-canvas';
        canvas.style.position = 'fixed';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100vw';
        canvas.style.height = '100vh';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = '99997';
        canvas.style.opacity = '0.85';
        document.body.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        let width = canvas.width = window.innerWidth;
        let height = canvas.height = window.innerHeight;

        window.addEventListener('resize', () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        });

        // 2. Copos de nieve y cristales
        const flakes = [];
        const MAX_FLAKES = window.innerWidth < 768 ? 24 : 50;

        for (let i = 0; i < MAX_FLAKES; i++) {
            flakes.push({
                x: Math.random() * width,
                y: Math.random() * height,
                radius: Math.random() * 2.5 + 1.0,
                speedY: Math.random() * 1.2 + 0.6,
                speedX: Math.random() * 0.5 - 0.25,
                opacity: Math.random() * 0.6 + 0.3,
                sway: Math.random() * 2.0,
                swaySpeed: Math.random() * 0.02 + 0.01,
                isCrystal: Math.random() > 0.75
            });
        }

        let animFrame;
        function renderSnow() {
            ctx.clearRect(0, 0, width, height);

            for (let i = 0; i < flakes.length; i++) {
                const f = flakes[i];
                f.sway += f.swaySpeed;
                f.y += f.speedY;
                f.x += f.speedX + Math.sin(f.sway) * 0.4;

                if (f.y > height + 5) {
                    f.y = -5;
                    f.x = Math.random() * width;
                }
                if (f.x > width + 5) f.x = -5;
                if (f.x < -5) f.x = width + 5;

                ctx.save();
                ctx.globalAlpha = f.opacity;
                if (f.isCrystal) {
                    ctx.fillStyle = '#bae6fd';
                    ctx.shadowColor = '#38bdf8';
                    ctx.shadowBlur = 6;
                    ctx.beginPath();
                    ctx.arc(f.x, f.y, f.radius * 1.2, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    ctx.fillStyle = '#f0f9ff';
                    ctx.shadowColor = '#e0f2fe';
                    ctx.shadowBlur = 3;
                    ctx.beginPath();
                    ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            }

            animFrame = requestAnimationFrame(renderSnow);
        }

        renderSnow();

        // 3. Widget interactivo del Kit de Navidad (Solsticio Hiemal)
        injectChristmasKitWidget();
    }

    function injectChristmasKitWidget() {
        if (document.getElementById('drakes-christmas-widget')) return;

        const widget = document.createElement('div');
        widget.id = 'drakes-christmas-widget';
        widget.innerHTML = `
            <div class="christmas-badge" title="Kit de Navidad & Solsticio Hiemal" role="button" tabindex="0">
                <span class="christmas-badge__icon">❄️</span>
                <span class="christmas-badge__label">Kit Navidad</span>
            </div>
            <div class="christmas-modal" id="drakes-christmas-modal" style="display:none;" aria-hidden="true">
                <div class="christmas-modal__card">
                    <button class="christmas-modal__close" id="drakes-christmas-close" aria-label="Cerrar">&times;</button>
                    <div class="christmas-modal__header">
                        <span class="christmas-modal__tag">🎄 SOLSTICIO HIEMAL 2026</span>
                        <h3 class="christmas-modal__title">Kit de Navidad Exclusivo</h3>
                        <p class="christmas-modal__desc">Celebración invernal en los 5 reinos de DrakesCraft con bendición de la Diosa Atenea.</p>
                    </div>
                    <div class="christmas-modal__content">
                        <ul class="christmas-kit-list">
                            <li><span class="kit-item-icon">⚔️</span> <strong>Hoja de Escarcha Arcana:</strong> Espada legendaria con filo helado e impacto criogénico.</li>
                            <li><span class="kit-item-icon">🛡️</span> <strong>Égida Glacial:</strong> Escudo tallado en hielo perenne de la Cima Olímpica.</li>
                            <li><span class="kit-item-icon">✨</span> <strong>100,000 Monedas & 5x Llaves Cósmicas:</strong> Para abrir cofres estelares en el Spawn.</li>
                            <li><span class="kit-item-icon">🎁</span> <strong>Caja de Regalo de Navidad:</strong> Mochila decorativa repleta de consumibles y néctar.</li>
                        </ul>
                    </div>
                    <div class="christmas-modal__footer">
                        <a href="store.html" class="christmas-modal__btn">Ver en la Tienda Oficial</a>
                    </div>
                </div>
            </div>
        `;

        const style = document.createElement('style');
        style.textContent = `
            #drakes-christmas-widget {
                position: fixed;
                bottom: 24px;
                left: 24px;
                z-index: 99999;
                font-family: inherit;
            }
            .christmas-badge {
                display: flex;
                align-items: center;
                gap: 8px;
                background: linear-gradient(135deg, rgba(12, 38, 64, 0.95), rgba(8, 25, 45, 0.95));
                border: 2px solid #38bdf8;
                border-radius: 999px;
                padding: 10px 18px;
                color: #e0f2fe;
                font-size: 0.92rem;
                font-weight: 600;
                cursor: pointer;
                box-shadow: 0 4px 20px rgba(56, 189, 248, 0.35);
                transition: transform 0.2s ease, box-shadow 0.2s ease;
                user-select: none;
            }
            .christmas-badge:hover {
                transform: translateY(-2px) scale(1.03);
                box-shadow: 0 6px 26px rgba(56, 189, 248, 0.55);
            }
            .christmas-badge__icon {
                font-size: 1.25rem;
                animation: drakes-spin-pulse 3s infinite ease-in-out;
            }
            @keyframes drakes-spin-pulse {
                0%, 100% { transform: rotate(0deg) scale(1); }
                50% { transform: rotate(180deg) scale(1.15); }
            }
            .christmas-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(3, 7, 18, 0.75);
                backdrop-filter: blur(8px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 100000;
                padding: 16px;
            }
            .christmas-modal__card {
                background: linear-gradient(135deg, #091a2e 0%, #0c2b42 100%);
                border: 2px solid #38bdf8;
                border-radius: 18px;
                padding: 28px;
                max-width: 480px;
                width: 100%;
                box-shadow: 0 16px 48px rgba(56, 189, 248, 0.3);
                position: relative;
                color: #f0f9ff;
            }
            .christmas-modal__close {
                position: absolute;
                top: 14px;
                right: 18px;
                background: none;
                border: none;
                color: #7dd3fc;
                font-size: 1.8rem;
                cursor: pointer;
                line-height: 1;
            }
            .christmas-modal__tag {
                display: inline-block;
                background: rgba(56, 189, 248, 0.15);
                border: 1px solid #38bdf8;
                border-radius: 999px;
                padding: 3px 12px;
                font-size: 0.72rem;
                font-weight: 700;
                color: #38bdf8;
                letter-spacing: 0.08em;
                margin-bottom: 8px;
            }
            .christmas-modal__title {
                margin: 0 0 6px 0;
                font-size: 1.4rem;
                color: #e0f2fe;
            }
            .christmas-modal__desc {
                margin: 0 0 16px 0;
                font-size: 0.88rem;
                color: #94a3b8;
                line-height: 1.45;
            }
            .christmas-kit-list {
                list-style: none;
                padding: 0;
                margin: 0 0 20px 0;
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            .christmas-kit-list li {
                background: rgba(15, 23, 42, 0.6);
                border: 1px solid rgba(56, 189, 248, 0.2);
                border-radius: 10px;
                padding: 10px 14px;
                font-size: 0.86rem;
                line-height: 1.4;
                color: #cbd5e1;
            }
            .kit-item-icon {
                margin-right: 6px;
                font-size: 1rem;
            }
            .christmas-modal__btn {
                display: block;
                text-align: center;
                background: linear-gradient(135deg, #0284c7, #0f766e);
                color: #fff !important;
                border: 1px solid #7dd3fc;
                border-radius: 10px;
                padding: 12px 20px;
                font-weight: 600;
                text-decoration: none;
                box-shadow: 0 4px 18px rgba(56, 189, 248, 0.4);
                transition: transform 0.2s ease, box-shadow 0.2s ease;
            }
            .christmas-modal__btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 24px rgba(56, 189, 248, 0.6);
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(widget);

        const badge = widget.querySelector('.christmas-badge');
        const modal = widget.querySelector('#drakes-christmas-modal');
        const closeBtn = widget.querySelector('#drakes-christmas-close');

        badge.addEventListener('click', () => {
            modal.style.display = 'flex';
            modal.setAttribute('aria-hidden', 'false');
        });
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            modal.setAttribute('aria-hidden', 'true');
        });
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
                modal.setAttribute('aria-hidden', 'true');
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initChristmasFX);
    } else {
        initChristmasFX();
    }
})();
