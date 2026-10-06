const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_EXECUTABLE ? { executablePath: process.env.CHROME_EXECUTABLE, args: ['--no-proxy-server'] } : {}) });
  const origin = process.env.SMOKE_URL || 'http://127.0.0.1:4173/my-blog';
  const output = process.env.SCREENSHOT_DIR || '/tmp/qlog-browser-screenshots';
  fs.mkdirSync(output, { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(origin + '/');
    await page.locator('#fsSlider').waitFor({ state: 'visible' });
    await page.locator('#fsSlider').focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('#fsSlider').inputValue(), '110');
    await page.reload();
    assert.equal(await page.locator('#fsSlider').inputValue(), '110');
    await page.locator('#fsSlider').focus(); await page.keyboard.press('ArrowLeft');
    await page.getByRole('searchbox').fill('nujabes');
    await page.locator('#search-results a[href$="/posts/nujabes/"]').waitFor();
    await page.goto(origin + '/');
    const first = await page.locator('.post-card-link').evaluateAll(nodes => nodes.map(n => n.href));
    await page.getByRole('link', { name: '下一页 →' }).click();
    const second = await page.locator('.post-card-link').evaluateAll(nodes => nodes.map(n => n.href));
    assert.equal(first.filter(url => second.includes(url)).length, 0);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(origin + '/');
    await page.getByRole('button', { name: 'Sidebar', exact: true }).click();
    await page.getByRole('link', { name: '足迹', exact: true }).click();
    await page.locator('#fpSvgMap').waitFor();
    const originalCount = await page.locator('.fp-place').count();
    assert.equal(originalCount, 30);
    const spots = ['hangzhou', 'kuala-lumpur', 'siem-reap', 'bangkok'];
    for (const id of spots) {
      const button = page.locator('.fp-place[data-id="' + id + '"]');
      await button.click();
      assert.ok(await page.locator('#fpDetail').isVisible());
      if (id === 'siem-reap') {
        await page.locator('#fpDetail img').scrollIntoViewIfNeeded();
        await page.waitForFunction(() => { const img = document.querySelector('#fpDetail img'); return img.complete && img.naturalWidth > 0; });
      }
      await page.getByRole('button', { name: '← 返回地图与年记' }).click();
      assert.equal(await button.evaluate(el => el === document.activeElement), true);
      const marker = page.locator('.fp-marker[data-id="' + id + '"]');
      await marker.focus(); await page.keyboard.press('Enter');
      assert.ok(await page.locator('#fpDetail').isVisible());
      await page.getByRole('button', { name: '← 返回地图与年记' }).click();
      assert.equal(await marker.evaluate(el => el === document.activeElement), true);
    }
    await page.getByRole('button', { name: '世界全图', exact: true }).click();
    assert.equal(await page.locator('#fpSvgMap').getAttribute('viewBox'), '0 0 960 500');
    assert.ok(await page.getByRole('button', { name: '缩小地图', exact: true }).isDisabled());
    await page.getByRole('button', { name: '聚焦亚洲', exact: true }).click();
    for (let i = 0; i < 12; i++) {
      const zoom = page.getByRole('button', { name: '放大地图', exact: true });
      if (await zoom.isDisabled()) break;
      await zoom.click();
    }
    assert.equal(Number((await page.locator('#fpSvgMap').getAttribute('viewBox')).split(' ')[2]), 100);
    await page.getByRole('button', { name: '重置地图', exact: true }).click();
    assert.equal(await page.locator('#fpSvgMap').getAttribute('viewBox'), '660 145 280 145');
    for (const width of [375, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      for (const mode of ['light', 'dark', 'auto']) {
        await page.emulateMedia({ colorScheme: mode === 'light' ? 'light' : 'dark', reducedMotion: 'reduce' });
        await page.evaluate(mode => { if (mode === 'auto') sessionStorage.removeItem('mode'); else sessionStorage.setItem('mode', mode); }, mode);
        await page.reload();
        await page.locator('#fpSvgMap').waitFor();
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width} ${mode}: overflow`);
        const bg = await page.locator('body').evaluate(el => getComputedStyle(el).backgroundColor);
        assert.equal(bg, mode === 'light' ? 'rgb(250, 250, 250)' : 'rgb(16, 17, 18)');
        await page.screenshot({ path: path.join(output, `footprint-${width}-${mode}.png`), fullPage: true });
      }
    }
    await page.goto(origin + '/posts/' + encodeURIComponent('数论') + '/');
    await page.locator('#qlogToc').waitFor({ state: 'visible' });
    assert.ok(await page.locator('#qlogToc a').count() > 3);
    assert.equal(await page.locator('script[src*=twikoo]').count(), 0);
    const a11yPages = ['/posts/' + encodeURIComponent('数论') + '/', '/', '/links/', '/about/'];
    for (const route of a11yPages) {
      await page.goto(origin + route);
      const report = await page.evaluate(() => {
        const name = el => (el.getAttribute('aria-label') || el.textContent || '').trim();
        return {
          unnamed: [...document.querySelectorAll('.share-btn, .sidebar-social-icon')].filter(el => !name(el)).map(el => el.outerHTML.slice(0, 80)),
          noAlt: [...document.querySelectorAll('img')].filter(img => !img.hasAttribute('alt')).map(img => img.getAttribute('src')),
          noNoopener: [...document.querySelectorAll('a[target="_blank"]')].filter(a => !/\bnoopener\b/.test(a.rel)).map(a => a.href)
        };
      });
      assert.deepEqual(report.unnamed, [], route + ': share/social controls need an accessible name');
      assert.deepEqual(report.noAlt, [], route + ': img without alt attribute');
      assert.deepEqual(report.noNoopener, [], route + ': target=_blank without noopener');
    }
    assert.deepEqual(errors, [], 'First-party production page errors');
    console.log('Browser smoke passed: navigation, search, font persistence, pagination, 30 places, details/images/focus, zoom, TOC and 9 visual variants.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
