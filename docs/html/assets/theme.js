/* LiveBay design01 · 三态主题
 * 与每个 HTML 头部的预绘制脚本共用 localStorage['lrds-theme']。
 * 由 tools/build_design_html.py 复制到 html/assets/theme.js。
 */
(function () {
  'use strict';
  var KEY = 'lrds-theme';
  var root = document.documentElement;
  var mql = window.matchMedia('(prefers-color-scheme: dark)');
  var buttons = Array.prototype.slice.call(document.querySelectorAll('[data-theme-choice]'));

  function valid(value) {
    return value === 'system' || value === 'light' || value === 'dark';
  }

  function current() {
    var value = root.getAttribute('data-theme-choice');
    return valid(value) ? value : 'system';
  }

  function resolved(choice) {
    return choice === 'system' ? (mql.matches ? 'dark' : 'light') : choice;
  }

  function paint(choice, persist) {
    root.setAttribute('data-theme', resolved(choice));
    root.setAttribute('data-theme-choice', choice);
    buttons.forEach(function (button) {
      button.setAttribute('aria-pressed', button.getAttribute('data-theme-choice') === choice ? 'true' : 'false');
    });
    if (persist) {
      try { localStorage.setItem(KEY, choice); } catch (e) {}
    }
  }

  buttons.forEach(function (button) {
    button.addEventListener('click', function () {
      paint(button.getAttribute('data-theme-choice'), true);
    });
  });

  // 移动端默认收起目录，先看到正文；无 JS 时目录仍然展开可读。
  if (window.matchMedia('(max-width: 900px)').matches) {
    Array.prototype.forEach.call(document.querySelectorAll('.nav-fold'), function (fold) {
      fold.removeAttribute('open');
    });
  }

  mql.addEventListener('change', function () {
    if (current() === 'system') paint('system', false);
  });

  paint(current(), false);
})();
