/* Tema estacional + efectos (cumple 1-29 nov con confeti, Navidad 1-31 dic) para las paginas SIN site.js.
   Replica la logica de site.js: tema por calendario de Chile, apagado manual, ?theme= para previsualizar. */
(function () {
    if (window.drakesApplySeasonalTheme) return; // site.js ya lo hace
    var THEMES = ['birthday', 'christmas', 'default'];
    function chileDate() {
        try {
            var p = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
            return { month: Number(p.filter(function (x) { return x.type === 'month'; })[0].value) - 1, day: Number(p.filter(function (x) { return x.type === 'day'; })[0].value) };
        } catch (e) { var n = new Date(); return { month: n.getMonth(), day: n.getDate() }; }
    }
    function calendarTheme() {
        var d = chileDate();
        if (d.month === 10 && d.day >= 1 && d.day <= 29) return 'birthday';
        if (d.month === 11) return 'christmas';
        return 'default';
    }
    function flag(k) { try { return localStorage.getItem(k) === '1'; } catch (e) { return false; } }
    function detect() {
        var q = new URLSearchParams(window.location.search).get('theme');
        if (q && THEMES.indexOf(q.toLowerCase()) >= 0) {
            try { sessionStorage.setItem('drakes_seasonal_preview', q.toLowerCase()); } catch (e) {}
            return q.toLowerCase();
        }
        try {
            var pv = sessionStorage.getItem('drakes_seasonal_preview');
            if (pv && THEMES.indexOf(pv) >= 0) return pv;
        } catch (e) {}
        var cal = calendarTheme();
        if (cal === 'birthday' && flag('drakes_birthday_disabled')) return 'default';
        if (cal === 'christmas' && flag('drakes_christmas_disabled')) return 'default';
        return cal;
    }
    function ensureCss() {
        if (!document.querySelector('link[href*="seasonal-themes.css"]')) {
            var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'styles/seasonal-themes.css?v=20261110-v10'; document.head.appendChild(l);
        }
    }
    function ensureScript(id, src) {
        if (document.getElementById(id)) return;
        var s = document.createElement('script'); s.id = id; s.src = src; document.head.appendChild(s);
    }
    function apply(forced) {
        ensureCss();
        var theme = forced || detect();
        var b = document.body;
        b.classList.remove('theme-birthday', 'theme-christmas', 'theme-valentines');
        if (theme === 'birthday') { b.classList.add('theme-birthday'); ensureScript('drakes-birthday-fx-script', 'scripts/birthday-fx.js?v=20261105-t2'); }
        else if (calendarTheme() === 'birthday') { ensureScript('drakes-birthday-fx-script', 'scripts/birthday-fx.js?v=20261105-t2'); }
        if (theme === 'christmas') { b.classList.add('theme-christmas'); ensureScript('drakes-christmas-fx-script', 'scripts/christmas-fx.js?v=20261102'); }
        else if (calendarTheme() === 'christmas') { ensureScript('drakes-christmas-fx-script', 'scripts/christmas-fx.js?v=20261102'); }
        window.drakesCurrentTheme = theme;
        window.dispatchEvent(new CustomEvent('drakesThemeChanged', { detail: { theme: theme } }));
        return theme;
    }
    function setDisabled(key, themeOn) {
        return function (disabled) {
            try { if (disabled) localStorage.setItem(key, '1'); else localStorage.removeItem(key); sessionStorage.removeItem('drakes_seasonal_preview'); } catch (e) {}
            return apply(disabled ? 'default' : themeOn);
        };
    }
    window.drakesDetectSeasonalTheme = detect;
    window.drakesCalendarTheme = calendarTheme;
    window.drakesApplySeasonalTheme = apply;
    window.drakesSetSeasonalTheme = function (t) { try { sessionStorage.setItem('drakes_seasonal_preview', t); } catch (e) {} return apply(t); };
    window.drakesSetBirthdayDisabled = setDisabled('drakes_birthday_disabled', 'birthday');
    window.drakesSetChristmasDisabled = setDisabled('drakes_christmas_disabled', 'christmas');
    function start() { apply(); }
    if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
