(function () {
  'use strict';
  // 友链头像加载失败时，隐藏 <img> 并显示紧随其后的首字母 fallback。
  function showFallback(img) {
    var fallback = img.nextElementSibling;
    img.hidden = true;
    if (fallback && fallback.classList.contains('link-avatar-fallback')) fallback.hidden = false;
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
