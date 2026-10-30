/* 未来残片 HUB/GUIDE 三态主题（R-016）。首屏预绘制在各自 <head> 内联完成。 */
(function () {
  var KEY = 'lrds-theme';
  var root = document.documentElement;
  var mql = window.matchMedia('(prefers-color-scheme: dark)');
  var buttons = Array.prototype.slice.call(document.querySelectorAll('[data-theme-choice]'));
  function choice() {
    var v = root.dataset.themeChoice || 'system';
    return (v === 'system' || v === 'light' || v === 'dark') ? v : 'system';
  }
  function apply() {
    var c = choice();
    root.dataset.theme = c === 'system' ? (mql.matches ? 'dark' : 'light') : c;
    buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.themeChoice === c)); });
  }
  buttons.forEach(function (b) {
    b.addEventListener('click', function () {
      var c = b.dataset.themeChoice;
      root.dataset.themeChoice = c;
      try { localStorage.setItem(KEY, c); } catch (e) {}
      apply();
    });
  });
  try { mql.addEventListener('change', function () { if (choice() === 'system') apply(); }); }
  catch (e) { try { mql.addListener(function () { if (choice() === 'system') apply(); }); } catch (e2) {} }
  apply();
})();
