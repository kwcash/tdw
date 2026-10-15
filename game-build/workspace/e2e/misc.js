const { chromium } = require('/tmp/pw/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const S = process.env.SCR; const sites = { orig: `${S}/gv2`, game: `${S}/v2/out/pkg/game`, y1931: `${S}/v2/out/pkg/1931` };
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
let port = 9001; const ports = {};
for (const [k, dir] of Object.entries(sites)) { const p = port++; ports[k] = p; http.createServer((q, r) => { let f = path.join(dir, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'text/plain' }); r.end(d); } }); }).listen(p); }
async function playOp(pg, port, opId, script) {
  await pg.goto(`http://localhost:${port}/#/op/${opId}`); await pg.waitForSelector('#start'); await pg.click('#start'); await pg.waitForSelector('#end');
  const snaps = [];
  for (let t = 0; t < 12 && !(await pg.$('.result')); t++) {
    snaps.push(await pg.$eval('main', (m) => m.innerText.replace(/\s+/g, ' ')));
    const doms = await pg.$$('button[data-d]'); const d = doms[(t * 5) % doms.length]; await d.click(); const df = await pg.$('[data-do="defend"]'); if (df) await df.click(); else { const cl = await pg.$('[data-do="close"],.sheetclose'); if (cl) await cl.click(); }
    await pg.click('#end'); await pg.waitForTimeout(100); const e2 = await pg.$('#end'); if (e2 && /Tap again/.test(await e2.textContent())) await e2.click(); await pg.waitForTimeout(150);
  }
  snaps.push(await pg.$eval('main', (m) => m.innerText.replace(/\s+/g, ' ')));
  return snaps;
}
(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  // 1. Legacy DOM equivalence: same op, same deterministic actions, compare rendered text turn by turn.
  const res = {};
  for (const k of ['orig', 'game']) {
    const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } }); const pg = await ctx.newPage();
    await pg.addInitScript(() => { let c = 7; crypto.getRandomValues = (a) => { for (let i = 0; i < a.length; i++) a[i] = (c = (c * 1103515245 + 12345) & 255); return a; }; Math.random = (() => { let s = 12345; return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296; })(); });
    res[k] = await playOp(pg, ports[k], 'C002', null).catch((e) => ['ERR ' + e.message]); await ctx.close();
  }
  const same = res.orig.length === res.game.length && res.orig.every((s, i) => s === res.game[i]);
  console.log('legacy snapshots', res.orig.length, res.game.length, 'identical:', same);
  if (!same) { for (let i = 0; i < Math.max(res.orig.length, res.game.length); i++) { const a = res.orig[i] || '', b = res.game[i] || ''; let j = 0; while (j < a.length && a[j] === b[j]) j++; console.log('snap', i, a === b ? 'same' : 'DIFF@' + j + ' orig«' + a.slice(Math.max(0, j - 40), j + 80) + '» new«' + b.slice(Math.max(0, j - 40), j + 80) + '»'); } const i = res.orig.findIndex((s, i) => s !== res.game[i]); console.log('first diff at', i, '\nORIG:', (res.orig[i] || '').slice(0, 400), '\nNEW :', (res.game[i] || '').slice(0, 400)); }
  // 2. Migration: v1 save from the original build continues in the new base build (same origin/key).
  { const ctx = await br.newContext(); const pg = await ctx.newPage();
    await pg.goto(`http://localhost:${ports.orig}/#/op/C002`); await pg.waitForSelector('#start'); await pg.click('#start'); await pg.waitForSelector('#end');
    const d = await pg.$$('button[data-d]'); await d[3].click(); const df = await pg.$('[data-do="defend"]'); if (df) await df.click();
    await pg.click('#end'); await pg.waitForTimeout(100); const e2 = await pg.$('#end'); if (e2 && /Tap again/.test(await e2.textContent())) await e2.click(); await pg.waitForTimeout(200);
    const dump = await pg.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) o[localStorage.key(i)] = localStorage.getItem(i === 0 ? localStorage.key(0) : localStorage.key(i)); return o; });
    const turnBefore = await pg.$eval('#end', (e) => e.textContent);
    console.log('orig keys', Object.keys(dump), 'at', turnBefore);
    // Load that saved state into the new base build (separate origin/port, so copy over).
    const pg2 = await ctx.newPage(); await pg2.goto(`http://localhost:${ports.game}/`); await pg2.waitForSelector('main h1');
    await pg2.evaluate((dump) => { for (const [k, v] of Object.entries(dump)) localStorage.setItem(k, v); }, dump);
    const errs = []; pg2.on('pageerror', (e) => errs.push(e.message));
    await pg2.goto(`http://localhost:${ports.game}/#/`); await pg2.reload(); await pg2.waitForSelector('main h1');
    const href = await pg2.$eval('main', (m) => [...m.querySelectorAll('a[href^="#/play/"]')].map((a) => a.getAttribute('href'))[0]);
    console.log('in-progress link in new build:', href);
    if (href) { await pg2.goto(`http://localhost:${ports.game}/${href}`); await pg2.waitForSelector('#end'); console.log('resumed at', await pg2.$eval('#end', (e) => e.textContent)); await pg2.click('#end'); await pg2.waitForTimeout(100); const e3 = await pg2.$('#end'); if (e3 && /Tap again/.test(await e3.textContent())) await e3.click(); await pg2.waitForTimeout(250); console.log('after ending a turn:', await pg2.evaluate(() => (document.querySelector('#end') || document.querySelector('.result')).textContent.slice(0, 60))); }
    console.log('migration errs', errs.length ? errs : 'none'); await ctx.close(); }
  // 3. Storage keys differ per build.
  for (const k of ['game', 'y1931']) { const ctx = await br.newContext(); const pg = await ctx.newPage(); await pg.goto(`http://localhost:${ports[k]}/#/op/${k === 'game' ? 'C002' : 'E001'}`); await pg.waitForSelector('#start'); await pg.click('#start'); await pg.waitForSelector('#end'); console.log(k, 'localStorage keys', await pg.evaluate(() => Object.keys(localStorage))); await ctx.close(); }
  await br.close(); process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
