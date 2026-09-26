(function () {
  'use strict';
  var sidebar = document.getElementById('sidebar');
  var social = document.getElementById('sidebarSocial');
  var sizer = document.getElementById('fontSizer');
  var slider = document.getElementById('fsSlider');
  if (sidebar && social) {
    var toggle = sidebar.querySelector('#mode-toggle');
    if (toggle) toggle.before(social);
    else sidebar.append(social);
    social.style.display = '';
  }
  if (!sizer || !slider) return;
  if (sidebar) sidebar.append(sizer);
  sizer.style.display = '';
  var value = 105;
  try {
    var saved = Number(localStorage.getItem('qlog-fs'));
    if (Number.isFinite(saved) && saved >= 90 && saved <= 140) value = Math.round(saved / 5) * 5;
  } catch (_) { /* Storage may be disabled; the control still works. */ }
  function apply(size) {
    document.documentElement.style.fontSize = size + '%';
    slider.value = size;
    slider.setAttribute('aria-valuetext', size + '%');
  }
  apply(value);
  slider.addEventListener('input', function () {
    value = Math.min(140, Math.max(90, Number(slider.value)));
    apply(value);
    try { localStorage.setItem('qlog-fs', value); } catch (_) { /* Optional persistence. */ }
  });
})();
