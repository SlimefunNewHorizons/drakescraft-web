/* Sober count-up and one-shot blur-in triggers driven by IntersectionObserver.
 * Respects prefers-reduced-motion: reduce by keeping static final values untouched. */
(() => {
  'use strict';

  const noMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (noMotion || !('IntersectionObserver' in window)) return;

  function formatValue(val, format, suffix) {
    const rounded = Math.round(val);
    let text;
    if (format === 'space') {
      text = String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    } else if (format === 'comma') {
      text = rounded.toLocaleString('en-US');
    } else {
      text = String(rounded);
    }
    return suffix ? `${text}${suffix}` : text;
  }

  function animateCount(el, target, format, suffix) {
    if (el.dataset.fxCounted === '1' || !Number.isFinite(target) || target <= 0) return;
    el.dataset.fxCounted = '1';

    const duration = target >= 1000 ? 800 : target >= 50 ? 680 : 500;
    const start = performance.now();

    function step(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = formatValue(target * eased, format, suffix);
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = formatValue(target, format, suffix);
      }
    }

    el.textContent = formatValue(0, format, suffix);
    requestAnimationFrame(step);
  }

  function parseDynamicTarget(el) {
    const raw = (el.textContent || '').trim();
    if (!/^\d+$/.test(raw)) return null;
    const num = Number.parseInt(raw, 10);
    return Number.isFinite(num) && num > 0 ? num : null;
  }

  function isNearViewport(el) {
    const rect = el.getBoundingClientRect();
    return rect.top < window.innerHeight && rect.bottom > 0;
  }

  const staticCounters = [...document.querySelectorAll('[data-countup]')];
  const dynamicCounters = [...document.querySelectorAll('[data-pt-count], [data-dev-count]')];
  const dynamicObservers = new WeakMap();
  const blurTargets = [...document.querySelectorAll('.fx-blur-in-scroll')];

  const counterObserver = new IntersectionObserver(
    (entries, observer) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target;

        if (el.hasAttribute('data-countup')) {
          const target = Number.parseInt(el.getAttribute('data-countup'), 10);
          const format = el.getAttribute('data-format') || '';
          const suffix = el.getAttribute('data-suffix') || '';
          animateCount(el, target, format, suffix);
          observer.unobserve(el);
          continue;
        }

        const dynTarget = parseDynamicTarget(el);
        if (dynTarget !== null) {
          dynamicObservers.get(el)?.disconnect();
          animateCount(el, dynTarget, '', '');
          observer.unobserve(el);
        }
      }
    },
    { threshold: 0.25, rootMargin: '0px 0px -32px 0px' }
  );

  staticCounters.forEach((el) => counterObserver.observe(el));

  dynamicCounters.forEach((el) => {
    counterObserver.observe(el);
    if ('MutationObserver' in window) {
      const mo = new MutationObserver(() => {
        if (el.dataset.fxCounted === '1') {
          mo.disconnect();
          return;
        }
        const dynTarget = parseDynamicTarget(el);
        if (dynTarget !== null && isNearViewport(el)) {
          mo.disconnect();
          counterObserver.unobserve(el);
          animateCount(el, dynTarget, '', '');
        }
      });
      dynamicObservers.set(el, mo);
      mo.observe(el, { childList: true, characterData: true, subtree: true });
    }
  });

  if (blurTargets.length) {
    const blurObserver = new IntersectionObserver(
      (entries, observer) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-fx-in');
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.25 }
    );
    blurTargets.forEach((el) => blurObserver.observe(el));
  }
})();
