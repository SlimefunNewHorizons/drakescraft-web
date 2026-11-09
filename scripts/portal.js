/* Índice lateral fijo para las guías largas (rangos, slimefun, comandos, poderes). */
(function () {
  const main = document.querySelector("main");
  if (!main || main.querySelector(".op-sidebar, aside, [class*=\"toc\"]")) return;
  const targets = [...main.querySelectorAll("details.guide-accordion, section.guide-section, .pw-section")]
    .filter((el) => !el.closest("details.guide-accordion:not(:scope)") || el.matches("details.guide-accordion"));
  if (targets.length < 4) return;
  const titleOf = (el) => {
    const t = el.querySelector(".guide-accordion__header-left > span:nth-child(2), h2, h3");
    return t ? t.textContent.replace(/\s+/g, " ").trim() : "";
  };
  const items = targets.map((el, i) => ({ el, title: titleOf(el), id: el.id || "sec-" + (i + 1) })).filter((x) => x.title);
  if (items.length < 4) return;
  const host = items[0].el.closest(".container") || items[0].el.parentElement;
  if (!host || host === main) return;
  const aside = document.createElement("aside");
  aside.className = "r-toc";
  aside.setAttribute("aria-label", document.documentElement.lang === "en" ? "On this page" : "En esta página");
  const h = document.createElement("p");
  h.className = "r-toc__title";
  h.textContent = document.documentElement.lang === "en" ? "On this page" : "En esta página";
  const ul = document.createElement("ul");
  items.forEach((x) => {
    if (!x.el.id) x.el.id = x.id;
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = "#" + x.id;
    a.textContent = x.title;
    a.addEventListener("click", () => { if (x.el.tagName === "DETAILS") x.el.open = true; });
    li.appendChild(a);
    ul.appendChild(li);
    x.link = a;
  });
  aside.append(h, ul);
  host.classList.add("r-has-toc");
  host.insertBefore(aside, host.firstChild);
  if (!("IntersectionObserver" in window)) return;
  const seen = new Set();
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => (e.isIntersecting ? seen.add(e.target) : seen.delete(e.target)));
    const first = items.find((x) => seen.has(x.el));
    items.forEach((x) => x.link.classList.toggle("is-current", x === first));
  }, { rootMargin: "-90px 0px -60% 0px" });
  items.forEach((x) => io.observe(x.el));
})();
