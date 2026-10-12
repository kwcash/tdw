const { chromium } = require('/tmp/pw/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const S = process.env.SCR; const only = process.env.ONLY; const sites0 = { game: [`${S}/v2/out/pkg/game`, 'C002'], y1931: [`${S}/v2/out/pkg/1931`, 'E003'], y2030: [`${S}/v2/out/pkg/2030`, 'N004'], y2026: [`${S}/v2/out/pkg/2026`, 'W007'] };
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const sites = Object.fromEntries(Object.entries(sites0).filter(([k]) => !only || k === only));
let port = 9101; const ports = {};
for (const [k, [dir]] of Object.entries(sites)) { const p = port++; ports[k] = p; http.createServer((q, r) => { let f = path.join(dir, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'text/plain' }); r.end(d); } }); }).listen(p); }
async function play(pg, mover) {
  let turns = 0;
  while (!(await pg.$('.result')) && turns++ < 40) {
    if (mover && turns === 1) { const mv = await pg.$('[data-cadre]'); if (mv) { await mv.click(); const t = await pg.$('[data-ct]'); if (t) await t.click(); await pg.waitForTimeout(150); } }
    for (let rep = 0; rep < 3; rep++) {
      const doms = await pg.$$('button[data-d]'); let best = null, bp = -1;
      for (const d of doms) { const l = await d.getAttribute('aria-label'); const m = /pressure (\d)/.exec(l); const pr = m ? +m[1] : 0; if (pr > bp) { bp = pr; best = d; } }
      if (best) { await best.click(); await pg.waitForTimeout(60); const df = await pg.$('[data-do="defend"]'); if (df) { await df.click(); await pg.waitForTimeout(60); } else { const cl = await pg.$('[data-do="close"],.sheetclose'); if (cl) await cl.click(); } }
    }
    const end = await pg.$('#end'); if (end) { await end.click(); await pg.waitForTimeout(120); const e2 = await pg.$('#end'); if (e2 && /Tap again/.test(await e2.textContent())) await e2.click(); await pg.waitForTimeout(220); }
  }
}
(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  for (const [k, [dir, opId]] of Object.entries(sites)) {
    const ctx = await br.newContext({ viewport: { width: 390, height: 844 } }); const pg = await ctx.newPage();
    const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push(m.text()); });
    const base = `http://localhost:${ports[k]}/`;
    await pg.goto(`${base}#/op/${opId}`); await pg.waitForSelector('#start'); await pg.click('#start'); await pg.waitForSelector('#end');
    await play(pg, k !== 'game');
    await pg.waitForSelector('.result');
    const code = await pg.$eval('#rcode', (e) => e.value).catch(() => null);
    const hasReport = !!(await pg.$('.report'));
    console.log(k, 'result code:', code ? code.slice(0, 60) + '… (' + code.length + ' chars)' : 'NONE', '| report card:', hasReport, '| leader token in code:', code ? /~g[0-9ab]/.test(code) || /\.g[0-9ab]/.test(code) : '-');
    await pg.screenshot({ path: `${S}/v2/e2e/${k}-rec-result.png`, fullPage: true });
    // Replay page
    await pg.goto(`${base}#/records`); await pg.waitForSelector('#paste');
    const rows = await pg.$$eval('table tr', (r) => r.length);
    await pg.fill('#paste', code); await pg.click('#check'); await pg.waitForSelector('.verified, .notverified');
    console.log(k, 'records rows:', rows, '| paste verifies:', !!(await pg.$('#out .verified')));
    await pg.goto(`${base}#/v/${code}`); await pg.waitForSelector('#replay');
    const n = +(await pg.$eval('#rprange', (e) => e.max));
    for (let i = 0; i < Math.min(n, 12); i++) await pg.click('#rpnext');
    const lbl = await pg.$eval('#rpl', (e) => e.textContent); const evs = await pg.$$eval('#rpe li', (l) => l.map((x) => x.textContent).slice(0, 3));
    console.log(k, 'replay steps', n, '| step 12 label:', lbl, '| events:', JSON.stringify(evs));
    await pg.click('#rprange').catch(() => {}); await pg.evaluate(() => { const r = document.getElementById('rprange'); r.value = r.max; r.dispatchEvent(new Event('input', { bubbles: true })); });
    console.log(k, 'last step events:', JSON.stringify(await pg.$$eval('#rpe li', (l) => l.map((x) => x.textContent).slice(0, 4))));
    await pg.screenshot({ path: `${S}/v2/e2e/${k}-rec-replay.png`, fullPage: true });
    // tampered code
    await pg.goto(`${base}#/v/${code.replace(/.$/, (c) => (c === 'a' ? 'b' : 'a'))}`); await pg.waitForSelector('.notverified');
    console.log(k, 'tampered code rejected:', true);
    // challenge flow
    await pg.goto(`${base}#/ch/${opId}~2~abc123def`); await pg.waitForSelector('#accept'); await pg.click('#accept'); await pg.waitForSelector('#end');
    await play(pg, false); await pg.waitForSelector('.result');
    const ccode = await pg.$eval('#rcode', (e) => e.value).catch(() => null);
    console.log(k, 'challenge code:', ccode ? ccode.slice(0, 50) : 'NONE', '| send-result button:', !!(await pg.$('#sendres')));
    // challenge sheet from a normal result
    console.log(k, 'errors:', errs.length ? errs : 'none');
    await ctx.close();
  }
  await br.close(); process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
