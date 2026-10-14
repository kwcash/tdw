const { chromium } = require('/tmp/pw/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const NEW = process.env.NEW, OLDD = process.env.OLDD; const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
function serve(dir, port) { http.createServer((q, r) => { let f = path.join(dir, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'text/plain' }); r.end(d); } }); }).listen(port); }
const BUILDS = [['game', 'C002', 'tdw-demo-1'], ['1931', 'E011', 'tdw-1931-1'], ['2030', 'N005', 'tdw-2030-1']];
BUILDS.forEach(([n], i) => { serve(`${NEW}/${n}`, 9950 + i); serve(`${OLDD}/${n}`, 9960 + i); });
const out = (...a) => console.log(...a);
async function finish(pg) { let t = 0; while (!(await pg.$('.result')) && t++ < 40) { const end = await pg.$('#end'); if (!end) break; await end.click(); await pg.waitForTimeout(60); const e2 = await pg.$('#end'); if (e2 && /Tap again/.test(await e2.textContent())) await e2.click(); await pg.waitForTimeout(120); } await pg.waitForSelector('.result'); }
(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  for (const [i, [name, opId]] of BUILDS.entries()) {
    const nu = `http://localhost:${9950 + i}/`; const old = `http://localhost:${9960 + i}/`;
    for (const [w, h] of [[1280, 900], [390, 800]]) {
      const ctx = await br.newContext({ viewport: { width: w, height: h } }); const pg = await ctx.newPage(); const errs = [];
      pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push(m.text()); });
      await pg.goto(`${nu}#/ops`); await pg.waitForSelector('.oplist .item'); const nav = await pg.$$eval('#nav a', (a) => a.map((x) => x.textContent));
      const tierOpts = await pg.$$eval('#tier option', (o) => o.map((x) => x.textContent).filter(Boolean));
      await pg.goto(`${nu}#/op/${opId}`); await pg.waitForSelector('#start');
      const btns = await pg.$$eval('[data-tier]', (b) => b.map((x) => x.textContent)); const band = await pg.$('.bandnote'); const fcast = nav.includes('Forecast');
      await pg.click('[data-tier="7"]'); await pg.click('#start'); await pg.waitForSelector('#end');
      const hud = await pg.$eval('.hud-sub', (e) => e.textContent); const holdings = !!(await pg.$('section.holdings'));
      await finish(pg); const code = await pg.$eval('#rcode', (e) => e.value);
      await pg.goto(`${nu}#/v/${code}`); await pg.waitForSelector('.verified, .notverified'); const ver = !!(await pg.$('.card.verified'));
      const ov = await pg.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      out(`${name} ${w}px: tier filter ${JSON.stringify(tierOpts)} | buttons ${JSON.stringify(btns)} | hud "${hud.slice(-8)}" | code ${code.slice(0, 22)} verifies ${ver} | holdings panel ${holdings} | band note ${!!band} | forecast nav ${fcast} | overflow ${ov} | errors ${JSON.stringify(errs)}`);
      await ctx.close();
    }
    // an old save and an old code, made by the earlier build, work in the new one
    const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } }); const pg = await ctx.newPage(); const errs = [];
    pg.on('pageerror', (e) => errs.push(e.message));
    await pg.goto(`${old}#/op/${opId}`); await pg.waitForSelector('#start'); await pg.click('#start'); await pg.waitForSelector('#end'); await finish(pg);
    const code = await pg.$eval('#rcode', (e) => e.value); const key = await pg.evaluate(() => Object.keys(localStorage)[0]); const dump = await pg.evaluate((k) => localStorage.getItem(k), key);
    const pg2 = await ctx.newPage(); pg2.on('pageerror', (e) => errs.push(e.message)); await pg2.goto(nu); await pg2.waitForSelector('main h1');
    await pg2.evaluate(([k, d]) => localStorage.setItem(k, d), [key, dump]); await pg2.reload(); await pg2.waitForSelector('main h1');
    await pg2.goto(`${nu}#/v/${code}`); await pg2.waitForSelector('.verified, .notverified'); const ver = !!(await pg2.$('.card.verified'));
    await pg2.goto(`${nu}#/records`); await pg2.waitForSelector('#paste'); const rows = await pg2.$$eval('table tr', (r) => r.length - 1);
    out(`${name} old save: key ${key} | old ${opId} code verifies in the new build ${ver} | records rows ${rows} | errors ${JSON.stringify(errs)}`);
    await ctx.close();
  }
  await br.close(); process.exit(0);
})();
