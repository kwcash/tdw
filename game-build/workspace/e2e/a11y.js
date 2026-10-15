'use strict';
// Accessibility audit of the built packages. Run after python3 mkpkg.py:
//   AXE=/tmp/pw/node_modules/axe-core/axe.min.js node e2e/a11y.js [out.json]
// 1. axe-core rules for WCAG 2.1 A and AA on each main page, at 1280 pixels and at 640 (1280 at 200 percent zoom).
// 2. No sideways scroll at 200 percent zoom.
// 3. Keyboard only. Every control the Tab key reaches shows a focus ring, and a whole run plays without the mouse.
// 4. Screen reader structure. One h1 a page, a main landmark and a skip link. The board keeps one live region that
//    stays on the page and reads out each turn's results.
// It runs the rules in the light and the dark theme, and it ends with ALL ACCESSIBILITY CHECKS PASS or exits with 1.
// axe-core is a test tool here and never ships in the game.
const path = require('node:path'); const fs = require('node:fs'); const http = require('node:http');
const { chromium } = require(process.env.PW_MODULE || '/tmp/pw/node_modules/playwright');
const AXE = process.env.AXE || '/tmp/pw/node_modules/axe-core/axe.min.js';
const ROOT = path.join(__dirname, '../out/pkg');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.txt': 'text/plain' };
const server = http.createServer((q, s) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f)) { s.writeHead(404); return s.end(); }
  s.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(s);
}).listen(10077);
const base = 'http://localhost:10077';
const PAGES = [
  ['2026', '#/', 'Home'], ['2026', '#/ops', 'Operations'], ['2026', '#/op/W017', 'Briefing'], ['2026', 'board:W017', 'Board'],
  ['2026', '#/arcs', 'Campaign'], ['2026', '#/codex', 'Codex'], ['2026', '#/records', 'Records'], ['2026', '#/how', 'How to play'],
  ['2026', '#/glossary', 'Glossary'], ['2026', '#/progress', 'Progress'], ['2026', '#/forecast', 'Forecast'], ['1931', 'board:E011', 'Board with holdings'],
];
const out = { pages: [], keyboard: {}, zoom: [] };
const settle = (pg) => pg.waitForTimeout(700);

async function open(pg, build, where) {
  if (where.startsWith('board:')) {
    await pg.goto(`${base}/${build}/#/op/${where.slice(6)}`); await pg.waitForSelector('#start'); await pg.click('#start'); await pg.waitForSelector('#end');
  } else { await pg.goto(`${base}/${build}/${where}`); await pg.waitForSelector('main h1, main h2'); }
  await settle(pg);
}

async function axe(pg) {
  await pg.addScriptTag({ path: AXE });
  return pg.evaluate(async () => {
    const r = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } });
    return r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, count: v.nodes.length, sample: v.nodes.slice(0, 3).map((n) => n.target.join(' ')) }));
  });
}

async function structure(pg) {
  return pg.evaluate(() => ({
    h1: document.querySelectorAll('h1').length,
    main: !!document.querySelector('main'),
    skip: !!document.querySelector('a[href="#main"], a.skip'),
    live: document.querySelectorAll('[aria-live]').length,
    lang: document.documentElement.lang || '',
  }));
}

(async () => {
  const exe = process.env.CHROMIUM === undefined ? '/opt/pw-browsers/chromium' : (process.env.CHROMIUM || undefined);
  const br = await chromium.launch({ executablePath: exe });
  for (const [w, h, label, scheme] of [[1280, 900, '100%', 'light'], [640, 450, '200%', 'light'], [1280, 900, 'dark', 'dark']]) {
    const ctx = await br.newContext({ viewport: { width: w, height: h }, colorScheme: scheme }); const pg = await ctx.newPage();
    const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
    for (const [build, where, name] of PAGES) {
      await open(pg, build, where);
      const v = await axe(pg); const st = await structure(pg);
      const wide = await pg.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      out.pages.push({ zoom: label, build, page: name, violations: v, structure: st });
      if (label === '200%') out.zoom.push({ build, page: name, overflow: wide });
    }
    if (errs.length) out.pages.push({ zoom: label, errors: errs });
    await ctx.close();
  }
  // Keyboard only. Tab through the board and check each stop shows a focus ring. Then play a whole run with Tab and Enter.
  {
    const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } }); const pg = await ctx.newPage();
    const kerrs = []; pg.on('pageerror', (e) => kerrs.push(e.message));
    await pg.goto(`${base}/2026/#/op/W017`); await pg.waitForSelector('#start'); await settle(pg);
    const tabTo = async (id, cap = 200) => { for (let i = 0; i < cap; i++) { await pg.keyboard.press('Tab'); if (await pg.evaluate((x) => document.activeElement && document.activeElement.id === x, id)) return i + 1; } return -1; };
    out.keyboard.tabsToStart = await tabTo('start');
    await pg.keyboard.press('Enter'); await pg.waitForSelector('#end'); await settle(pg);
    const stops = []; const seen = new Set();
    for (let i = 0; i < 150; i++) {
      await pg.keyboard.press('Tab');
      const s = await pg.evaluate(() => {
        const e = document.activeElement; if (!e || e === document.body) return null;
        const c = getComputedStyle(e);
        const ring = (c.outlineStyle !== 'none' && parseFloat(c.outlineWidth) > 0) || (c.boxShadow && c.boxShadow !== 'none');
        const r = e.getBoundingClientRect();
        return { tag: e.tagName.toLowerCase(), id: e.id, text: (e.getAttribute('aria-label') || e.innerText || e.value || '').trim().slice(0, 40), ring, onscreen: r.bottom > 0 && r.top < innerHeight };
      });
      if (!s) continue; const k = `${s.tag}#${s.id}:${s.text}`; if (seen.has(k)) break; seen.add(k); stops.push(s);
    }
    out.keyboard.boardStops = stops.length;
    out.keyboard.noRing = stops.filter((s) => !s.ring);
    out.keyboard.offscreen = stops.filter((s) => !s.onscreen);
    let turns = 0; const heard = [];
    await pg.evaluate(() => { const l = document.getElementById('sr-turn'); if (l) l.dataset.first = '1'; });
    while (!(await pg.$('#rcode')) && turns < 40) {
      const n = await tabTo('end'); if (n < 0) break;
      await pg.keyboard.press('Enter'); await pg.waitForTimeout(250); turns++;
      if (turns <= 4) heard.push(await pg.evaluate(() => { const l = document.getElementById('sr-turn'); return l ? { same: l.dataset.first === '1', live: l.getAttribute('aria-live'), text: l.textContent.trim() } : null; }));
    }
    out.keyboard.liveRegion = heard;
    out.keyboard.feedLive = await pg.evaluate(() => document.querySelectorAll('.feed[aria-live]').length);
    out.keyboard.turnsPlayed = turns; out.keyboard.runFinished = !!(await pg.$('#rcode'));
    out.keyboard.focusAfterEnd = await pg.evaluate(() => { const e = document.activeElement; return e ? `${e.tagName.toLowerCase()}#${e.id}` : 'none'; });
    // The result page and the replay of the same run, in the light theme and then the dark one.
    const code = out.keyboard.runFinished ? await pg.$eval('#rcode', (e) => e.value) : null;
    for (const scheme of ['light', 'dark']) {
      await pg.emulateMedia({ colorScheme: scheme });
      if (scheme === 'dark') { await pg.goto(`${base}/2026/#/op/W017`); await pg.waitForSelector('#start'); await pg.click('#start'); await pg.waitForSelector('#end');
        for (let i = 0; i < 80 && !(await pg.$('#rcode')); i++) { await pg.click('#end').catch(() => {}); await pg.waitForTimeout(120); } }
      await settle(pg); out.pages.push({ zoom: scheme, build: '2026', page: 'Result', violations: await axe(pg) });
      if (code) { await pg.goto(`${base}/2026/#/v/${code}`); await pg.waitForSelector('main h1, main h2'); await settle(pg); out.pages.push({ zoom: scheme, build: '2026', page: 'Replay', violations: await axe(pg) }); }
    }
    out.keyboard.left = await pg.evaluate(() => { const l = document.getElementById('sr-turn'); return l ? l.textContent : ''; });
    out.keyboard.errors = kerrs;
    await ctx.close();
  }
  await br.close(); server.close();
  const file = process.argv[2]; if (file) fs.writeFileSync(file, JSON.stringify(out, null, 1));
  const v = out.pages.filter((p) => p.violations).flatMap((p) => p.violations.map((x) => `${p.zoom} ${p.build} ${p.page}: ${x.id} (${x.impact}) x${x.count} ${x.sample.join(' | ')}`));
  console.log(v.length ? v.join('\n') : 'axe: no WCAG 2.1 A or AA violations');
  console.log('structure:', JSON.stringify(out.pages.filter((p) => p.structure && p.zoom === '100%').map((p) => `${p.page} h1=${p.structure.h1} main=${p.structure.main} skip=${p.structure.skip} live=${p.structure.live} lang=${p.structure.lang}`)));
  console.log('zoom overflow:', JSON.stringify(out.zoom.filter((z) => z.overflow > 0)));
  console.log('keyboard:', JSON.stringify({ ...out.keyboard, noRing: out.keyboard.noRing.map((s) => `${s.tag}#${s.id}:${s.text}`), offscreen: out.keyboard.offscreen.length }));
  const errs = out.pages.filter((p) => p.errors); if (errs.length) console.log('page errors:', JSON.stringify(errs));
  const k = out.keyboard; const fails = [];
  if (v.length) fails.push(`${v.length} rule violations`);
  if (out.zoom.some((z) => z.overflow > 0)) fails.push('sideways scroll at 200 percent');
  if (out.pages.some((p) => p.structure && (p.structure.h1 !== 1 || !p.structure.main || !p.structure.skip || p.structure.lang !== 'en'))) fails.push('page structure');
  if (k.tabsToStart < 0 || !k.runFinished || k.noRing.length || k.offscreen.length) fails.push('keyboard');
  const said = k.liveRegion.filter((h) => h && h.same && h.live === 'polite').map((h) => h.text);
  if (said.length !== k.liveRegion.length || !said.some((x) => /^You have \d+ actions unspent/.test(x)) || !said.some((x) => /Turn \d+/.test(x)) || k.feedLive) fails.push('live region on the board');
  if (k.left) fails.push('the live region keeps old text after the player leaves the board');
  if (k.errors.length) fails.push('page errors during keyboard play');
  if (errs.length) fails.push('page errors');
  console.log(fails.length ? 'ACCESSIBILITY CHECKS FAILED: ' + fails.join(', ') : 'ALL ACCESSIBILITY CHECKS PASS');
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); server.close(); process.exit(1); });
