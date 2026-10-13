/* Tema estacional minimo para paginas SIN site.js (404, 500, mantenimiento, ojo de atenea).
   Misma regla de calendario que site.js (America/Santiago): octubre halloween, noviembre birthday,
   1 dic - 15 ene christmas, febrero valentines. Solo pone la clase del tema; los efectos los carga site.js. */
(function () {
    var q = new URLSearchParams(window.location.search).get('theme');
    var month, day;
    try {
        var parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
        month = Number(parts.filter(function (x) { return x.type === 'month'; })[0].value) - 1;
        day = Number(parts.filter(function (x) { return x.type === 'day'; })[0].value);
    } catch (e) { var n = new Date(); month = n.getMonth(); day = n.getDate(); }
    var theme = 'default';
    if (month === 9) theme = 'halloween';
    else if (month === 10) theme = 'birthday';
    else if (month === 11 || (month === 0 && day <= 15)) theme = 'christmas';
    else if (month === 1) theme = 'valentines';
    if (q && ['halloween', 'birthday', 'christmas', 'valentines', 'default'].indexOf(q.toLowerCase()) >= 0) theme = q.toLowerCase();
    function apply() {
        document.body.classList.remove('theme-halloween', 'theme-birthday', 'theme-christmas', 'theme-valentines');
        if (theme !== 'default') document.body.classList.add('theme-' + theme);
    }
    if (document.body) apply(); else document.addEventListener('DOMContentLoaded', apply);
})();
