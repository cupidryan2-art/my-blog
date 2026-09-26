(function () {
  'use strict';
  var dataElement = document.getElementById('fpData');
  var status = document.getElementById('fpStatus');
  var svg = document.querySelector('#fpMapWrap svg');
  var geometry = window.QlogMapGeometry;
  var byId = new Map();
  function imageURL(src) {
    if (typeof src !== 'string' || !/^\/assets\/img\/[\w\u0080-\uFFFF./-]+$/.test(src) || src.includes('..')) throw new Error('Invalid image path');
    return dataElement.dataset.baseurl + src;
  }
  try {
    var places = JSON.parse(dataElement.dataset.places);
    if (!Array.isArray(places) || !places.length) throw new Error('No places');
    places.forEach(function (place) {
      if (!place || !/^[a-z0-9-]+$/.test(place.id) || byId.has(place.id) || typeof place.name !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(place.date) || !['lived', 'visited'].includes(place.type) || typeof place.description !== 'string' || !Array.isArray(place.content)) throw new Error('Invalid place');
      place.content.forEach(function (block) {
        if (block.type === 'text' && typeof block.value === 'string') return;
        if (block.type === 'image' && (!block.caption || typeof block.caption === 'string')) { imageURL(block.src); return; }
        throw new Error('Invalid content block');
      });
      byId.set(place.id, place);
    });
    var ids = Array.from(svg.querySelectorAll('.fp-pin'), function (pin) { return pin.dataset.id; });
    if (ids.length !== byId.size || new Set(ids).size !== ids.length || ids.some(function (id) { return !byId.has(id); })) throw new Error('Map/data mismatch');
  } catch (error) {
    status.hidden = false; status.textContent = '足迹暂时无法载入，请稍后刷新重试。';
    console.error('Qlog footprint data could not be loaded:', error.message); return;
  }
  svg.id = 'fpSvgMap';
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.setAttribute('width', '100%'); svg.setAttribute('height', '440');
  svg.setAttribute('role', 'group'); svg.setAttribute('aria-label', '足迹地图，可通过下方年记选择所有地点');
  var tooltip = document.getElementById('fpTooltip');
  var wrap = document.getElementById('fpMapWrap');
  var vb = Object.assign({}, geometry.ASIA);
  var mapView = document.getElementById('fpMapView');
  var detail = document.getElementById('fpDetail');
  var detailInner = document.getElementById('fpDetailInner');
  var placeList = document.getElementById('fpPlaces');
  var returnFocus = null, returnScroll = 0;
  function apply(box) {
    vb = geometry.constrain(box);
    svg.setAttribute('viewBox', [vb.x, vb.y, vb.w, vb.h].join(' '));
    document.getElementById('fpZoomIn').disabled = vb.w <= 100;
    document.getElementById('fpZoomOut').disabled = vb.w >= 960;
    tooltip.hidden = true;
  }
  function point(clientX, clientY, matrix) {
    var p = svg.createSVGPoint(); p.x = clientX; p.y = clientY;
    return p.matrixTransform(matrix || svg.getScreenCTM().inverse());
  }
  function text(tag, value, className) {
    var el = document.createElement(tag); el.textContent = value;
    if (className) el.className = className;
    return el;
  }
  function openDetail(id, trigger) {
    var place = byId.get(id); if (!place) return;
    returnFocus = trigger; returnScroll = window.scrollY;
    var heading = text('h2', place.name); heading.tabIndex = -1;
    var meta = text('p', place.date + ' · ' + (place.type === 'lived' ? '长居' : '到访'), 'fp-detail-meta');
    detailInner.replaceChildren(heading, meta, text('p', place.description, 'fp-detail-description'));
    place.content.forEach(function (block) {
      if (block.type === 'text') detailInner.append(text('p', block.value, 'fp-detail-text'));
      else {
        var figure = document.createElement('figure');
        var img = document.createElement('img');
        img.src = imageURL(block.src); img.alt = block.caption || place.name; img.loading = 'lazy';
        if (block.src.endsWith('2025-12-14-angkor-wat.jpeg')) { img.width = 3024; img.height = 4032; }
        figure.append(img);
        if (block.caption) figure.append(text('figcaption', block.caption));
        detailInner.append(figure);
      }
    });
    tooltip.hidden = true; mapView.hidden = true; placeList.hidden = true; detail.hidden = false;
    heading.focus({ preventScroll: true }); detail.scrollIntoView({ block: 'start', behavior: 'instant' });
  }
  document.getElementById('fpBack').addEventListener('click', function () {
    detail.hidden = true; mapView.hidden = false; placeList.hidden = false;
    if (returnFocus) returnFocus.focus({ preventScroll: true });
    window.scrollTo({ top: returnScroll, behavior: 'instant' });
  });
  document.querySelectorAll('.fp-place').forEach(function (button) {
    button.addEventListener('click', function () { openDetail(button.dataset.id, button); });
  });
  var moved = false;
  svg.querySelectorAll('circle:not(.fp-pin)').forEach(function (circle) { circle.remove(); });
  svg.querySelectorAll('.fp-pin').forEach(function (pin) {
    var place = byId.get(pin.dataset.id);
    var group = document.createElementNS(svg.namespaceURI, 'g');
    group.classList.add('fp-marker'); group.setAttribute('role', 'button'); group.setAttribute('tabindex', '0');
    group.setAttribute('aria-label', place.name + '，' + place.date + '，' + (place.type === 'lived' ? '长居' : '到访'));
    group.dataset.id = place.id;
    pin.setAttribute('r', place.type === 'lived' ? '6' : '5');
    var hit = document.createElementNS(svg.namespaceURI, 'circle');
    hit.setAttribute('cx', pin.getAttribute('cx')); hit.setAttribute('cy', pin.getAttribute('cy')); hit.setAttribute('r', '10'); hit.classList.add('fp-hit');
    pin.before(group); group.append(hit);
    if (place.type === 'lived') { var halo = hit.cloneNode(); halo.setAttribute('r', '8'); halo.setAttribute('class', 'fp-marker-halo'); group.append(halo); }
    group.append(pin);
    function showTooltip() {
      var p = svg.createSVGPoint(); p.x = Number(pin.getAttribute('cx')); p.y = Number(pin.getAttribute('cy'));
      var screen = p.matrixTransform(svg.getScreenCTM());
      /* Layout offsets convert screen coordinates to the positioned wrapper without a bounding rectangle. */
      var left = 0, top = 0;
      for (var el = wrap; el; el = el.offsetParent) { left += el.offsetLeft; top += el.offsetTop; }
      tooltip.textContent = place.name + ' · ' + place.date;
      tooltip.hidden = false;
      var x = screen.x + window.scrollX - left;
      tooltip.style.left = Math.max(tooltip.offsetWidth / 2 + 5, Math.min(wrap.clientWidth - tooltip.offsetWidth / 2 - 5, x)) + 'px';
      tooltip.style.top = (screen.y + window.scrollY - top) + 'px';
    }
    group.addEventListener('mouseenter', showTooltip); group.addEventListener('focus', showTooltip);
    group.addEventListener('mouseleave', function () { tooltip.hidden = true; });
    group.addEventListener('blur', function () { tooltip.hidden = true; });
    group.addEventListener('click', function () { if (!moved) openDetail(place.id, group); });
    group.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(place.id, group); } });
  });
  document.getElementById('fpZoomIn').addEventListener('click', function () { apply(geometry.zoom(vb, 1 / 1.35)); });
  document.getElementById('fpZoomOut').addEventListener('click', function () { apply(geometry.zoom(vb, 1.35)); });
  document.getElementById('fpViewAsia').addEventListener('click', function () { apply(geometry.ASIA); });
  document.getElementById('fpViewWorld').addEventListener('click', function () { apply(geometry.WORLD); });
  document.getElementById('fpReset').addEventListener('click', function () { apply(geometry.ASIA); });
  svg.addEventListener('wheel', function (e) {
    if (!e.deltaY) return;
    e.preventDefault(); apply(geometry.zoom(vb, e.deltaY > 0 ? 1.15 : 1 / 1.15, point(e.clientX, e.clientY)));
  }, { passive: false });
  var pointers = new Map(), gesture = null;
  function centroid(points) { return { x: points.reduce(function (s, p) { return s + p.x; }, 0) / points.length, y: points.reduce(function (s, p) { return s + p.y; }, 0) / points.length }; }
  function distance(points) { return points.length < 2 ? 0 : Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y); }
  function beginGesture() {
    var points = Array.from(pointers.values()), center = centroid(points);
    gesture = { box: Object.assign({}, vb), center: center, distance: distance(points), matrix: svg.getScreenCTM().inverse() };
  }
  svg.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (!pointers.size) moved = false;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size > 1) moved = true;
    beginGesture();
  });
  window.addEventListener('pointermove', function (e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    var points = Array.from(pointers.values()), center = centroid(points);
    if (!moved && Math.hypot(center.x - gesture.center.x, center.y - gesture.center.y) < 4) return;
    moved = true;
    var start = point(gesture.center.x, gesture.center.y, gesture.matrix);
    var current = point(center.x, center.y, gesture.matrix);
    var factor = points.length > 1 && gesture.distance > 1 ? gesture.distance / Math.max(distance(points), 1) : 1;
    var zoomed = geometry.zoom(gesture.box, factor, start);
    var actual = zoomed.w / gesture.box.w;
    zoomed.x -= (current.x - start.x) * actual; zoomed.y -= (current.y - start.y) * actual;
    apply(zoomed);
  });
  function endPointer(e) { pointers.delete(e.pointerId); if (pointers.size) beginGesture(); else gesture = null; }
  window.addEventListener('pointerup', endPointer); window.addEventListener('pointercancel', endPointer);
  window.addEventListener('blur', function () { pointers.clear(); gesture = null; });
  apply(vb);
})();
