const { chromium } = require('/tmp/pw/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const S = process.env.SCR; const sites = { y1931: [`${S}/v2/out/pkg/1931`, 'E003'], y2030: [`${S}/v2/out/pkg/2030`, 'P003'], game: [`${S}/v2/out/pkg/game`, 'A001'] };
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
let port = 8901; const ports = {};
for (const [k, [dir]] of Object.entries(sites)) { const p = port++; ports[k] = p; http.createServer((q, r) => { let f = path.join(dir, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'text/plain' }); r.end(d); } }); }).listen(p); }
(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  for (const [k, [dir, opId0]] of Object.entries(sites)) {
    const c = JSON.parse(fs.readFileSync(dir + '/assets/content.json'));
    const opId = k === 'game' ? c.ops.find((o) => !o.hidden).id : (c.ops.find((o) => o.id === opId0) || c.ops.find((o) => !o.hidden && o.factions)).id;
    for (const [w, h] of [[390, 844], [1280, 900]]) {
      const ctx = await br.newContext({ viewport: { width: w, height: h } }); const pg = await ctx.newPage();
      const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push(m.text()); });
      await pg.goto(`http://localhost:${ports[k]}/#/op/${opId}`); await pg.waitForSelector('#start');
      await pg.click('#start'); await pg.waitForSelector('#end');
      const info = await pg.evaluate(() => ({ fx: document.querySelectorAll('.fx').length, lg: document.querySelectorAll('.lg').length, cadres: document.querySelectorAll('.cadre').length, els: !!document.querySelector('.elsewhere'), fb: document.querySelectorAll('.fboard,.fboards > *').length, doms: document.querySelectorAll('button[data-d]').length }));
      await pg.screenshot({ path: `${S}/v2/e2e/${k}-${w}-board.png`, fullPage: true });
      const ov = await pg.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      // Move a leader if available, then play: defend the most pressured domain, end turn.
      let moved = false; const mv = await pg.$('[data-cadre]');
      if (mv) { await mv.click(); const t = await pg.$('[data-ct]'); if (t) { await t.click(); moved = true; } await pg.waitForTimeout(200); }
      let turns = 0;
      while (!(await pg.$('.result')) && turns++ < 40) {
        for (let i = 0; i < 3; i++) {
          const b = await pg.$('.icard [data-act="detect"]:not([disabled])'); if (b) { await b.click().catch(() => {}); await pg.waitForTimeout(80); }
        }
        for (let rep = 0; rep < 3; rep++) { const doms = await pg.$$('button[data-d]'); let best = null, bp = -1;
        for (const d of doms) { const l = await d.getAttribute('aria-label'); const m = /pressure (\d)/.exec(l); const pr = m ? +m[1] : 0; if (pr > bp) { bp = pr; best = d; } }
        if (best) { await best.click(); await pg.waitForTimeout(80); const df = await pg.$('[data-do="defend"]'); if (df) { await df.click(); await pg.waitForTimeout(80); } else { const cl = await pg.$('[data-do="close"],.sheetclose'); if (cl) await cl.click(); } } }
        const end = await pg.$('#end'); if (end) { await end.click(); await pg.waitForTimeout(120); const e2 = await pg.$('#end'); if (e2 && /Tap again/.test(await e2.textContent())) await e2.click(); await pg.waitForTimeout(250); }
      }
      const res = await pg.$('.result');
      const txt = res ? (await pg.$eval('.result', (e) => e.textContent.replace(/\s+/g, ' ').slice(0, 140))) : 'NO RESULT';
      if (res) await pg.screenshot({ path: `${S}/v2/e2e/${k}-${w}-result.png`, fullPage: true });
      console.log(k, w, opId, JSON.stringify(info), 'overflow', ov, 'moved', moved, 'turns', turns, '|', txt, '| errs', errs.length ? errs : 'none');
      await ctx.close();
    }
  }
  await br.close(); process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
