// Lee /bedrock-link.json (lo publica el servidor desde ai-hub/state). Sin dato: queda el fallback a Discord.
(async () => {
  const btns = document.querySelectorAll('[data-bedrock-join]');
  const msgs = document.querySelectorAll('[data-bedrock-status]');
  if (!btns.length) return;
  const say = (t) => msgs.forEach((m) => { m.textContent = t; });
  try {
    const r = await fetch('/bedrock-link.json', { cache: 'no-store' });
    const j = r.ok ? await r.json() : null;
    const ok = j && j.available && typeof j.url === 'string' && /^https:\/\//.test(j.url) && !j.url.includes('/claim/');
    if (!ok) throw new Error('sin enlace');
    btns.forEach((b) => {
      b.href = j.url;
      b.removeAttribute('aria-disabled');
      b.target = '_blank';
      b.rel = 'noopener';
    });
    // Parseo robusto de fecha con soporte de timezone -0300 o -03:00
    let d = null;
    if (j.updated_at) {
      const iso = String(j.updated_at).replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
      const parsed = new Date(iso);
      if (!isNaN(parsed.getTime())) d = parsed;
    }
    const fresh = btns[0].dataset.fresh || "Actualizado";
    say(d ? `${fresh}: ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : `${fresh}`);
  } catch (err) {
    btns.forEach((b) => b.setAttribute('aria-disabled', 'true'));
    say(btns[0].dataset.fallback || '');
  }
})();
