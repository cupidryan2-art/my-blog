(function () {
  'use strict';
  var status = document.getElementById('commentStatus');
  var container = document.getElementById('tcomment');
  function failed() { status.textContent = '评论暂时无法载入，请稍后刷新重试。'; }
  if (!window.twikoo || !container.dataset.env) { failed(); return; }
  Promise.resolve().then(function () {
    return window.twikoo.init({ envId: container.dataset.env, el: '#tcomment', lang: 'zh-CN' });
  }).then(function () { status.textContent = ''; }).catch(failed);
})();
