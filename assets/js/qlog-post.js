(function () {
  'use strict';
  var toc = document.getElementById('qlogToc');
  if (toc) {
    var list = document.createElement('ol');
    document.querySelectorAll('.post-content h2[id], .post-content h3[id]').forEach(function (heading) {
      var item = document.createElement('li');
      var link = document.createElement('a');
      link.href = '#' + encodeURIComponent(heading.id);
      link.textContent = heading.textContent.trim();
      if (heading.tagName === 'H3') item.className = 'toc-subheading';
      item.append(link); list.append(item);
    });
    if (list.children.length) { toc.querySelector('nav').append(list); toc.hidden = false; }
  }
  document.querySelectorAll('[data-copy-url]').forEach(function (button) {
    button.addEventListener('click', async function () {
      var status = button.parentElement.querySelector('[role="status"]');
      try {
        await navigator.clipboard.writeText(button.dataset.copyUrl);
        status.textContent = '链接已复制';
      } catch (_) { status.textContent = '复制失败，请复制浏览器地址栏中的链接。'; }
    });
  });
})();
