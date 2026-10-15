const { chromium } = require('/tmp/pw/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const S = process.env.SCR; const sites = { orig: `${S}/game2`, game: `${S}/v2/out/pkg/game`, y1931: `${S}/v2/out/pkg/1931`, y2030: `${S}/v2/out/pkg/2030` };
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const servers = {}; let port = 8801;
for (const [k, dir] of Object.entries(sites)) {
  const p = port++; servers[k] = p;
  http.createServer((q, r) => { let f = path.join(dir, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'text/plain' }); r.end(d); } }); }).listen(p);
}
const out = (...a) => console.log(...a);
(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  for (const [k, p] of Object.entries(servers)) {
    for (const [w, h] of [[390, 800], [1280, 900]]) {
      const ctx = await br.newContext({ viewport: { width: w, height: h } }); const pg = await ctx.newPage();
      const errs = []; pg.on('pageerror', (e) => errs.push('PAGEERR ' + e.message)); pg.on('console', (m) => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
      await pg.goto(`http://localhost:${p}/`); await pg.waitForSelector('main h1', { timeout: 8000 });
      const home = await pg.$eval('main h1', (e) => e.textContent);
      await pg.goto(`http://localhost:${p}/#/ops`); await pg.waitForSelector('.oplist .item', { timeout: 5000 });
      const nOps = await pg.$$eval('.oplist .item', (e) => e.length);
      const ov = await pg.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      await pg.screenshot({ path: `${S}/v2/e2e/${k}-${w}-ops.png` });
      out(k, w, 'home h1:', home, '| ops listed:', nOps, '| h-overflow px:', ov, '| errs:', errs.length ? errs : 'none');
      await ctx.close();
    }
  }
  await br.close(); process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
