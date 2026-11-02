(function () {
  var KEY = 'lrds-theme';
  var root = document.documentElement;
  var mql = window.matchMedia('(prefers-color-scheme: dark)');
  var buttons = Array.prototype.slice.call(document.querySelectorAll('[data-theme-choice]'));
  function choice() {
    var v = root.dataset.themeChoice || 'system';
    return v === 'system' || v === 'light' || v === 'dark' ? v : 'system';
  }
  function apply() {
    var c = choice();
    root.dataset.theme = c === 'system' ? (mql.matches ? 'dark' : 'light') : c;
    buttons.forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.themeChoice === c));
    });
    try { document.dispatchEvent(new CustomEvent('themechange', { detail: c })); } catch (e) {}
  }
  buttons.forEach(function (b) {
    b.addEventListener('click', function () {
      root.dataset.themeChoice = b.dataset.themeChoice;
      try { localStorage.setItem(KEY, b.dataset.themeChoice); } catch (e) {}
      apply();
    });
  });
  try {
    mql.addEventListener('change', function () { if (choice() === 'system') apply(); });
  } catch (e) {}
  apply();
})();
