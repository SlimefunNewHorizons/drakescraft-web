f='/tmp/claude-1000/w/web/scripts/store.js'; s=open(f,encoding='utf8').read()
old=s[s.index('function storeMoney'):s.index('function deliveryType')]
new='''// Precio base: USD (es lo que cobra Tebex). La conversion es solo una referencia
// con tasas del propio servidor (/fx-rates.json); sin tasas se muestra solo USD.
const FX_CURRENCIES = ["USD", "CLP", "ARS", "MXN", "COP", "PEN", "UYU", "BOB", "BRL", "EUR", "GBP", "CAD"];
const FX_NO_DECIMALS = new Set(["CLP", "ARS", "COP"]);
const FX_REGION = { CL: "CLP", AR: "ARS", MX: "MXN", CO: "COP", PE: "PEN", UY: "UYU", BO: "BOB", BR: "BRL", GB: "GBP", CA: "CAD",
    ES: "EUR", DE: "EUR", FR: "EUR", IT: "EUR", PT: "EUR", NL: "EUR", IE: "EUR", AT: "EUR", BE: "EUR", FI: "EUR", GR: "EUR" };
const FX_KEY = "drakes-fx-currency";
const storeIsEn = (document.documentElement.lang || "").toLowerCase().startsWith("en");
const fx = { rates: null, updated: null, cur: "USD" };

function fxStored() {
    try { const v = localStorage.getItem(FX_KEY); return FX_CURRENCIES.includes(v) ? v : null; } catch { return null; }
}
function fxSave(code) {
    try { localStorage.setItem(FX_KEY, code); } catch { /* sin almacenamiento: no pasa nada */ }
}
function fxGuess() {
    try {
        const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
        for (const tag of langs) {
            const region = String(tag || "").split("-")[1]?.toUpperCase();
            if (region && FX_REGION[region]) return FX_REGION[region];
        }
    } catch { /* ignorar */ }
    return "USD";
}
function usdText(value) {
    return `US$${value.toFixed(2)}`;
}
function fxApprox(usd) {
    const rate = fx.rates?.[fx.cur];
    if (fx.cur === "USD" || !Number.isFinite(rate) || !Number.isFinite(usd)) return "";
    const digits = FX_NO_DECIMALS.has(fx.cur) ? 0 : 2;
    const amount = (usd * rate).toLocaleString(storeIsEn ? "en-US" : "es-CL", { minimumFractionDigits: digits, maximumFractionDigits: digits });
    return `≈ ${fx.cur} ${amount}`;
}
function storeMoney(_value, product) {
    if (product?.coins) return `${product.coins.toLocaleString("es-CL")} ₯`;
    return Number.isFinite(product?.usd) ? usdText(product.usd) : (storeIsEn ? "Not available" : "No disponible");
}
function storeFxLine(usd) {
    const text = fxApprox(usd);
    return text ? `<small class="store-fx-approx">${text}</small>` : "";
}

'''
s=s.replace(old,new)
def rep(a,b):
    global s
    assert a in s,a
    s=s.replace(a,b,1)
rep('<strong class="store-product__price">${storeMoney(product.clp, product)}</strong>','<strong class="store-product__price">${storeMoney(product.clp, product)}${storeFxLine(product.usd)}</strong>')
rep('if (total) total.textContent = "$0 CLP";','if (total) total.innerHTML = usdText(0);')
rep('<p>${storeMoney(product.clp, product)} · ${deliveryLabel[deliveryType(product)]}</p>','<p>${storeMoney(product.clp, product)}${fxApprox(product.usd) ? ` (${fxApprox(product.usd)})` : ""} · ${deliveryLabel[deliveryType(product)]}</p>')
rep('total.textContent = storeMoney(products.reduce((sum, product) => sum + (Number.isFinite(product.clp) ? product.clp : 0), 0));','''const sumUsd = products.reduce((sum, product) => sum + (Number.isFinite(product.usd) ? product.usd : 0), 0);
            total.innerHTML = `${usdText(sumUsd)}${storeFxLine(sumUsd)}`;''')
rep('    loadCatalog();\n','''    // Selector de moneda de referencia
    const fxSelect = document.getElementById("fx-select");
    const fxBox = document.getElementById("fx-box");
    const fxStamp = document.getElementById("fx-updated");
    async function loadFx() {
        try {
            const response = await fetch("/fx-rates.json", { cache: "no-store" });
            const data = response.ok ? await response.json() : null;
            if (!data?.available || !data.rates) throw new Error("sin tasas");
            fx.rates = data.rates;
            fx.updated = data.updated || null;
        } catch {
            fx.rates = null;
        }
        if (!fxSelect) return;
        const usable = fx.rates ? FX_CURRENCIES.filter((code) => code === "USD" || Number.isFinite(fx.rates[code])) : ["USD"];
        const wanted = fxStored() || fxGuess();
        fx.cur = usable.includes(wanted) ? wanted : "USD";
        for (const option of [...fxSelect.options]) option.hidden = option.disabled = !usable.includes(option.value);
        fxSelect.value = fx.cur;
        if (fxBox) fxBox.classList.toggle("is-usd-only", usable.length < 2);
        if (fxStamp) fxStamp.textContent = fx.rates && fx.updated ? (storeIsEn ? "Rates: " : "Tasas: ") + fx.updated.slice(0, 10) : "";
        if (state.catalog) renderAll();
    }
    fxSelect?.addEventListener("change", () => {
        fx.cur = fxSelect.value;
        fxSave(fx.cur);
        renderAll();
    });
    loadFx();
    loadCatalog();
''')
open(f,'w',encoding='utf8').write(s)
