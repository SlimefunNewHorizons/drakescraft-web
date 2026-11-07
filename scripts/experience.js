/* Shared presentation behavior. Payment, catalog and game actions remain in
 * their original modules; this file owns only copy, status and navigation UX. */
(() => {
  "use strict";
  const ip = "mc.drakescraft.cl";

  /** Expose the existing toast contract required by store.js. */
  function showToast(message) {
    try {
      let toast = document.querySelector(".toast");
      if (!toast) {
        toast = document.createElement("div");
        toast.className = "toast";
        toast.setAttribute("role", "status");
        document.body.append(toast);
      }
      toast.textContent = message;
      toast.classList.add("is-visible");
      clearTimeout(showToast.timer);
      showToast.timer = setTimeout(
        () => toast.classList.remove("is-visible"),
        2600,
      );
    } catch (error) {
      console.warn("[portal] Aviso no disponible", error);
    }
  }
  window.showToast = showToast;

  /** Report copying only once the clipboard operation actually succeeds. */
  async function copyIp() {
    try {
      if (!navigator.clipboard) throw new Error("Portapapeles no disponible");
      await navigator.clipboard.writeText(ip);
      showToast(`IP copiada: ${ip}`);
    } catch {
      showToast(`Copia esta IP: ${ip}`);
    }
  }

  /** Fetch existing Spanish API fields; unknown availability is not downtime. */
  async function refreshStatus() {
    const targets = document.querySelectorAll(
      "[data-live-count], [data-live-label]",
    );
    if (!targets.length) return;
    try {
      const response = await fetch("/api/server-status", {
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const status = await response.json();
      const players = Number.isFinite(status.jugadores)
        ? status.jugadores
        : null;
      const label =
        status.enLinea === true
          ? players === null
            ? "Servidor en línea"
            : `${players} ${players === 1 ? "jugador conectado" : "jugadores conectados"}`
          : "Estado no disponible";
      targets.forEach((node) => {
        node.textContent = label;
      });
      document
        .querySelectorAll("[data-live-status]")
        .forEach((node) =>
          node.classList.toggle("is-online", status.enLinea === true),
        );
      document.querySelectorAll("[data-live-version]").forEach((node) => {
        node.textContent = status.version || "Java + Bedrock";
      });
    } catch {
      targets.forEach((node) => {
        node.textContent = "Estado no disponible";
      });
      document
        .querySelectorAll("[data-live-status]")
        .forEach((node) => node.classList.remove("is-online"));
    }
  }

  /** Keep motion limited to the requested hero; touch and reduced-motion stay still. */
  function setupDepth() {
    try {
      if (
        !matchMedia("(hover:hover) and (prefers-reduced-motion:no-preference)")
          .matches
      )
        return;
      document.querySelectorAll("[data-depth]").forEach((stage) => {
        stage.addEventListener(
          "pointermove",
          (event) => {
            const box = stage.getBoundingClientRect();
            stage.style.setProperty(
              "--tilt-x",
              `${4 - ((event.clientY - box.top) / box.height - 0.5) * 9}deg`,
            );
            stage.style.setProperty(
              "--tilt-y",
              `${-10 + ((event.clientX - box.left) / box.width - 0.5) * 13}deg`,
            );
          },
          { passive: true },
        );
        stage.addEventListener("pointerleave", () => {
          stage.style.removeProperty("--tilt-x");
          stage.style.removeProperty("--tilt-y");
        });
      });
    } catch (error) {
      console.warn("[portal] Profundidad estática", error);
    }
  }

  /** Highlight the local section without changing the guide's search behavior. */
  function setupReadingIndex() {
    try {
      const links = [...document.querySelectorAll('.op-sidebar a[href^="#"]')];
      if (!links.length || !("IntersectionObserver" in window)) return;
      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries.find((item) => item.isIntersecting);
          if (!entry) return;
          links.forEach((link) => {
            if (link.hash === `#${entry.target.id}`)
              link.setAttribute("aria-current", "location");
            else link.removeAttribute("aria-current");
          });
        },
        { rootMargin: "-15% 0px -65% 0px" },
      );
      links.forEach((link) => {
        const section = document.getElementById(
          decodeURIComponent(link.hash.slice(1)),
        );
        if (section) observer.observe(section);
      });
    } catch (error) {
      console.warn("[portal] Índice estático disponible", error);
    }
  }

  document
    .querySelectorAll("[data-copy-ip]")
    .forEach((button) => button.addEventListener("click", copyIp));
  setupDepth();
  setupReadingIndex();
  refreshStatus();
  if (document.querySelector("[data-live-count], [data-live-label]")) {
    setInterval(() => {
      if (!document.hidden) refreshStatus();
    }, 60000);
  }
})();
