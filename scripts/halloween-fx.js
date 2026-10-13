/* ==========================================================================
   DRAKESCRAFT HALLOWEEN ATMOSPHERIC ENGINE
   - Particulas de brasas del Tartaro (Canvas ultraliviano 60fps)
   - Murcielagos vectoriales flotantes en trayectoria sinusoidal
   - Widget interactivo Jack-o'-Lantern con particulas de chispa
   - Auto-desactivacion automatica al terminar octubre (1 de Noviembre 00:00)
   ========================================================================== */
(function () {
    'use strict';

    // Misma regla que site.js (calendario de Chile, ?theme= solo en la pestana). Si site.js no esta cargado, se
    // replica la parte necesaria.
    function isSeason() {
        if (typeof window.drakesDetectSeasonalTheme === 'function') return window.drakesDetectSeasonalTheme() === 'halloween';
        const q = new URLSearchParams(window.location.search).get('theme');
        if (q) return q.toLowerCase() === 'halloween';
        let month, day;
        try {
            const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
            month = Number(parts.find((x) => x.type === 'month').value) - 1;
            day = Number(parts.find((x) => x.type === 'day').value);
        } catch (e) { const n = new Date(); month = n.getMonth(); day = n.getDate(); }
        return month === 9;
    }

    if (!isSeason()) return;

    function initHalloweenFX() {
        if (document.getElementById('drakes-halloween-canvas')) return;

        // 1. Canvas para brasas flotantes
        const canvas = document.createElement('canvas');
        canvas.id = 'drakes-halloween-canvas';
        canvas.style.position = 'fixed';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100vw';
        canvas.style.height = '100vh';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = '99998';
        canvas.style.opacity = '0.75';
        document.body.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        let width = canvas.width = window.innerWidth;
        let height = canvas.height = window.innerHeight;

        window.addEventListener('resize', () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        });

        // 2. Brasas y chispas ascendentes
        const particles = [];
        const MAX_PARTICLES = window.innerWidth < 768 ? 18 : 36;

        for (let i = 0; i < MAX_PARTICLES; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                radius: Math.random() * 2.2 + 0.8,
                speedY: Math.random() * 0.8 + 0.3,
                speedX: (Math.random() - 0.5) * 0.6,
                opacity: Math.random() * 0.7 + 0.2,
                fadeSpeed: Math.random() * 0.008 + 0.002,
                color: Math.random() > 0.4 ? 'rgba(255, 119, 0, ' : (Math.random() > 0.5 ? 'rgba(168, 85, 247, ' : 'rgba(239, 68, 68, ')
            });
        }

        // 3. Murcielagos sutiles cruzando el fondo
        const bats = [
            { x: -50, y: height * 0.25, vx: 2.2, vy: 0.4, size: 22, flap: 0 },
            { x: -120, y: height * 0.45, vx: 1.8, vy: -0.3, size: 16, flap: Math.PI }
        ];

        function drawBat(ctx, bat) {
            ctx.save();
            ctx.translate(bat.x, bat.y);
            const flapAngle = Math.sin(bat.flap) * 0.4;
            ctx.fillStyle = 'rgba(20, 10, 28, 0.65)';
            ctx.strokeStyle = 'rgba(255, 119, 0, 0.25)';
            ctx.lineWidth = 1;

            ctx.beginPath();
            // Cuerpo central
            ctx.ellipse(0, 0, bat.size * 0.25, bat.size * 0.4, 0, 0, Math.PI * 2);
            // Ala izquierda
            ctx.moveTo(-bat.size * 0.1, 0);
            ctx.quadraticCurveTo(-bat.size * 0.6, -bat.size * (0.6 + flapAngle), -bat.size, -bat.size * (0.2 + flapAngle));
            ctx.quadraticCurveTo(-bat.size * 0.5, bat.size * 0.2, -bat.size * 0.1, 0);
            // Ala derecha
            ctx.moveTo(bat.size * 0.1, 0);
            ctx.quadraticCurveTo(bat.size * 0.6, -bat.size * (0.6 + flapAngle), bat.size, -bat.size * (0.2 + flapAngle));
            ctx.quadraticCurveTo(bat.size * 0.5, bat.size * 0.2, bat.size * 0.1, 0);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }

        let isRunning = true;
        document.addEventListener('visibilitychange', () => {
            isRunning = !document.hidden;
            if (isRunning) requestAnimationFrame(loop);
        });

        function loop() {
            if (!isRunning) return;
            ctx.clearRect(0, 0, width, height);

            // Animar y dibujar brasas
            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];
                p.y -= p.speedY;
                p.x += p.speedX;
                p.opacity -= p.fadeSpeed;

                if (p.opacity <= 0 || p.y < -10) {
                    p.x = Math.random() * width;
                    p.y = height + 10;
                    p.opacity = Math.random() * 0.7 + 0.3;
                    p.radius = Math.random() * 2.2 + 0.8;
                }

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = p.color + p.opacity + ')';
                ctx.shadowColor = '#ff7700';
                ctx.shadowBlur = 8;
                ctx.fill();
            }

            // Animar y dibujar murcielagos
            for (let b of bats) {
                b.x += b.vx;
                b.y += Math.sin(b.x * 0.015) * 1.2 + b.vy;
                b.flap += 0.22;
                if (b.x > width + 100) {
                    b.x = -80;
                    b.y = Math.random() * (height * 0.6) + 50;
                }
                drawBat(ctx, b);
            }

            requestAnimationFrame(loop);
        }

        requestAnimationFrame(loop);

        // 4. Widget Flotante Jack-o'-Lantern en esquina inferior
        const pumpkin = document.createElement('div');
        pumpkin.id = 'drakes-floating-pumpkin';
        pumpkin.title = 'Edicion Noche Perpetua del Tartaro - Octubre 2026';
        pumpkin.innerHTML = '&#127875;';
        pumpkin.style.position = 'fixed';
        pumpkin.style.bottom = '22px';
        pumpkin.style.right = '24px';
        pumpkin.style.fontSize = '2.4rem';
        pumpkin.style.cursor = 'pointer';
        pumpkin.style.zIndex = '99999';
        pumpkin.style.userSelect = 'none';
        pumpkin.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), filter 0.3s';
        pumpkin.style.filter = 'drop-shadow(0 0 14px rgba(255, 119, 0, 0.65))';

        pumpkin.addEventListener('mouseenter', () => {
            pumpkin.style.transform = 'scale(1.25) rotate(-8deg)';
            pumpkin.style.filter = 'drop-shadow(0 0 25px rgba(255, 119, 0, 0.95)) drop-shadow(0 0 35px rgba(168, 85, 247, 0.7))';
        });
        pumpkin.addEventListener('mouseleave', () => {
            pumpkin.style.transform = 'scale(1) rotate(0deg)';
            pumpkin.style.filter = 'drop-shadow(0 0 14px rgba(255, 119, 0, 0.65))';
        });

        // Click: pulso sonoro sintetizado Web Audio API
        pumpkin.addEventListener('click', () => {
            try {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (AudioCtx) {
                    const actx = new AudioCtx();
                    const osc = actx.createOscillator();
                    const gain = actx.createGain();
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(220, actx.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(110, actx.currentTime + 0.4);
                    gain.gain.setValueAtTime(0.15, actx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.4);
                    osc.connect(gain);
                    gain.connect(actx.destination);
                    osc.start();
                    osc.stop(actx.currentTime + 0.45);
                }
            } catch (e) {}

            // Animacion de salto
            pumpkin.style.transform = 'scale(1.4) rotate(15deg)';
            setTimeout(() => { pumpkin.style.transform = 'scale(1.2) rotate(0deg)'; }, 200);

            if (window.showToast) {
                window.showToast('Noche Perpetua del Tartaro activa en todo DrakesCraft');
            }
        });

        document.body.appendChild(pumpkin);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initHalloweenFX);
    } else {
        initHalloweenFX();
    }
})();
