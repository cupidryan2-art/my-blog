(function () {
  'use strict';
  // 友链头像加载失败时，隐藏头像并显示同一容器内的首字母 fallback。
  // Chirpy 的 refactor-content 会把 <img> 包进 <a class="img-link">，所以不能依赖 nextElementSibling。
  function showFallback(img) {
    var box = img.closest('.link-avatar');
    var fallback = box && box.querySelector('.link-avatar-fallback');
    (img.closest('a.img-link') || img).hidden = true;
    if (fallback) fallback.hidden = false;
  }
  function init() {
    var imgs = document.querySelectorAll('img[data-link-avatar]');
    Array.prototype.forEach.call(imgs, function (img) {
      // 脚本执行前 error 可能已触发：complete 且无尺寸即视为失败
      if (img.complete && img.naturalWidth === 0) showFallback(img);
      else img.addEventListener('error', function () { showFallback(img); }, { once: true });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
