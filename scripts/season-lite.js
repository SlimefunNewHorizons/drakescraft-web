/* Tema estacional minimo para paginas SIN site.js (404, 500, mantenimiento, ojo de atenea).
   Regla de calendario (America/Santiago):
   - 1 al 29 de noviembre -> birthday (con apagado manual)
   - 30 de noviembre -> default
   - 1 al 31 de diciembre -> christmas (con apagado manual)
   - resto del ano -> default (tema estandar T2). */
(function () {
    var q = new URLSearchParams(window.location.search).get('theme');
    var month, day;
    try {
        var parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
        month = Number(parts.filter(function (x) { return x.type === 'month'; })[0].value) - 1;
        day = Number(parts.filter(function (x) { return x.type === 'day'; })[0].value);
    } catch (e) { var n = new Date(); month = n.getMonth(); day = n.getDate(); }
    var bdayDisabled = false, xmasDisabled = false;
    try {
        bdayDisabled = localStorage.getItem('drakes_birthday_disabled') === '1';
        xmasDisabled = localStorage.getItem('drakes_christmas_disabled') === '1';
    } catch (e) {}
    var theme = 'default';
    if (month === 10 && day >= 1 && day <= 29 && !bdayDisabled) theme = 'birthday';
    else if (month === 11 && day >= 1 && day <= 31 && !xmasDisabled) theme = 'christmas';
    if (q && ['birthday', 'christmas', 'default'].indexOf(q.toLowerCase()) >= 0) theme = q.toLowerCase();
    function apply() {
        document.body.classList.remove('theme-birthday', 'theme-christmas', 'theme-valentines');
        if (theme === 'birthday') document.body.classList.add('theme-birthday');
        if (theme === 'christmas') document.body.classList.add('theme-christmas');
    }
    if (document.body) apply(); else document.addEventListener('DOMContentLoaded', apply);
})();
