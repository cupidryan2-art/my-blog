(function (root) {
  'use strict';
  var WORLD = { x: 0, y: 0, w: 960, h: 500 };
  var ASIA = { x: 660, y: 145, w: 280, h: 145 };
  function constrain(box) {
    var w = Math.max(100, Math.min(960, box.w));
    var h = Math.min(500, box.h * w / box.w);
    return { x: Math.max(0, Math.min(960 - w, box.x)), y: Math.max(0, Math.min(500 - h, box.y)), w: w, h: h };
  }
  function zoom(box, factor, point) {
    var w = Math.max(100, Math.min(960, box.w * factor));
    var actual = w / box.w;
    var anchor = point || { x: box.x + box.w / 2, y: box.y + box.h / 2 };
    return constrain({ x: anchor.x - (anchor.x - box.x) * actual, y: anchor.y - (anchor.y - box.y) * actual, w: w, h: box.h * actual });
  }
  var api = { WORLD: WORLD, ASIA: ASIA, constrain: constrain, zoom: zoom };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.QlogMapGeometry = api;
})(typeof window === 'undefined' ? {} : window);
