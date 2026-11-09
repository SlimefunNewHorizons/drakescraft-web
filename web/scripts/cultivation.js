/* Loads the existing recipe fragment into the public Cultivation guide.
 * The fragment remains the single source of the recipe rows. */
(() => {
  const target = document.querySelector("#cultivation-recipes");
  if (!target) return;

  fetch("/cultivation_rows.html", { headers: { Accept: "text/html" } })
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.text();
    })
    .then((html) => {
      target.innerHTML = html;
    })
    .catch(() => {
      target.innerHTML =
        '<p class="dc-recipes__error">No se pudieron cargar las combinaciones. Intenta actualizar la página.</p>';
    });
})();
