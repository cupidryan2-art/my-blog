const assert = require('node:assert/strict');
const { WORLD, ASIA, zoom, constrain } = require('../assets/js/qlog-map-geometry.js');
let box = { ...WORLD };
for (let i = 0; i < 100; i++) box = zoom(box, 1.35);
assert.deepEqual(box, WORLD, 'World boundary must not drift');
box = { ...ASIA };
for (let i = 0; i < 100; i++) box = zoom(box, 0.7);
assert.equal(box.w, 100);
const smallest = { ...box };
assert.deepEqual(zoom(box, 0.5), smallest, 'Minimum boundary must not drift');
for (let i = 0; i < 100; i++) {
  box = zoom(box, 1.3, { x: 800, y: 210 });
  assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.w <= 960 && box.y + box.h <= 500);
}
const anchor = { x: 780, y: 200 };
const closer = zoom(ASIA, 0.8, anchor);
assert.ok(Math.abs((anchor.x-ASIA.x)/ASIA.w - (anchor.x-closer.x)/closer.w) < 1e-12, 'Cursor anchor must remain stationary');
assert.deepEqual(constrain({ x: -300, y: 800, w: 280, h: 145 }), { x: 0, y: 355, w: 280, h: 145 });
assert.deepEqual(constrain(ASIA), ASIA);
console.log('Map bounds, repeated zoom, pointer anchor and initial view passed.');
