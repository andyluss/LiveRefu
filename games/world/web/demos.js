(function () {
  const buttons = Array.from(document.querySelectorAll("[data-filter]"));
  const cards = Array.from(document.querySelectorAll(".demo-card"));
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.dataset.filter;
      buttons.forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
      for (const card of cards) {
        const view = card.dataset.view;
        const tags = (card.dataset.tags || "").split(/\s+/);
        const show = filter === "all" || view === filter || tags.includes(filter);
        card.classList.toggle("is-hidden", !show);
      }
    });
  });
})();
