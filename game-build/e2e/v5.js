const { chromium } = require('/tmp/pw/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const T = process.env.T;
const sites = { old: process.env.OLD, neu: `${T}/v3/out/pkg/1931` };
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const ports = { old: 9601, neu: 9602 };
for (const [k, dir] of Object.entries(sites)) http.createServer((q, r) => { let f = path.join(dir, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'text/plain' }); r.end(d); } }); }).listen(ports[k]);
const base = (k) => `http://localhost:${ports[k]}/`;
const KEY = 'tdw-1931-1';
const out = (...a) => console.log(...a);
async function play(pg) {
  let turns = 0;
  while (!(await pg.$('.result')) && turns++ < 40) {
    for (let rep = 0; rep < 3; rep++) {
      const doms = await pg.$$('button[data-d]'); let best = null, bp = -1;
      for (const d of doms) { const l = await d.getAttribute('aria-label'); const m = /pressure (\d)/.exec(l); const pr = m ? +m[1] : 0; if (pr > bp) { bp = pr; best = d; } }
      if (best) { await best.click(); await pg.waitForTimeout(50); const df = await pg.$('[data-do="defend"]'); if (df) { await df.click(); await pg.waitForTimeout(50); } else { const cl = await pg.$('[data-do="close"],.sheetclose'); if (cl) await cl.click(); } }
    }
    const end = await pg.$('#end'); if (end) { await end.click(); await pg.waitForTimeout(100); const e2 = await pg.$('#end'); if (e2 && /Tap again/.test(await e2.textContent())) await e2.click(); await pg.waitForTimeout(200); }
  }
}
(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  for (const [w, h] of [[1280, 900], [390, 800]]) {
    const ctx = await br.newContext({ viewport: { width: w, height: h } }); const pg = await ctx.newPage(); const errs = [];
    pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push(m.text()); });
    await pg.goto(base('neu')); await pg.waitForSelector('main h1');
    await pg.goto(`${base('neu')}#/ops`); await pg.waitForSelector('.oplist .item'); const nOps = await pg.$$eval('.oplist .item', (e) => e.length);
    await pg.goto(`${base('neu')}#/op/E001`); await pg.waitForSelector('#start'); await pg.click('#start'); await pg.waitForSelector('#end');
    const plain = await pg.$('section.holdings');
    await pg.goto(`${base('neu')}#/op/E011`); await pg.waitForSelector('#start'); const title = await pg.$eval('main h1', (e) => e.textContent); await pg.click('#start'); await pg.waitForSelector('#end');
    const rows = await pg.$$eval('section.holdings li', (l) => l.map((x) => x.innerText.replace(/\s+/g, ' ')));
    await pg.screenshot({ path: `${process.env.SHOTS}/E011-play-${w}.png`, fullPage: true });
    const ov = await pg.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    await pg.click('[data-yield="manchuria"]'); await pg.waitForSelector('[data-yes]'); const sheet = await pg.$eval('.sheet', (e) => e.innerText.replace(/\s+/g, ' '));
    await pg.screenshot({ path: `${process.env.SHOTS}/E011-sheet-${w}.png` });
    await pg.click('[data-do="close"]'); const stillThere = await pg.$('[data-yield="manchuria"]');
    await pg.click('[data-yield="manchuria"]'); await pg.click('[data-yes]'); await pg.waitForTimeout(300);
    const after = await pg.$$eval('section.holdings li', (l) => l.map((x) => x.className + ' | ' + x.innerText.replace(/\s+/g, ' ')));
    await play(pg); await pg.waitForSelector('.result');
    const code = await pg.$eval('#rcode', (e) => e.value);
    const own = await pg.$$eval('ul.own li', (l) => l.map((x) => x.innerText.replace(/\s+/g, ' ')));
    await pg.screenshot({ path: `${process.env.SHOTS}/E011-result-${w}.png`, fullPage: true });
    await pg.goto(`${base('neu')}#/v/${code}`); await pg.waitForSelector('.verified, .notverified'); const verified = !!(await pg.$('.card.verified'));
    const rep = await pg.$$eval('ul.own li', (l) => l.length);
    out(`${w}px: ops ${nOps} | E001 holdings panel: ${!!plain} | ${title} | rows ${JSON.stringify(rows)} | h-overflow ${ov}`);
    out('  sheet:', sheet.slice(0, 220), '| keep-it leaves button:', !!stillThere);
    out('  after give up:', JSON.stringify(after));
    out('  code:', code.slice(0, 90), '| verified:', verified, '| own lines on replay page:', rep);
    out('  own section in result:', JSON.stringify(own));
    out('  console errors:', JSON.stringify(errs));
    await ctx.close();
  }
  {
    const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } }); const pg = await ctx.newPage();
    await pg.goto(`${base('neu')}#/op/E011`); await pg.waitForSelector('#start'); await pg.click('#start'); await pg.waitForSelector('#end'); await play(pg); await pg.waitForSelector('.result');
    const own = await pg.$$eval('ul.own li', (l) => l.map((x) => x.innerText.replace(/\s+/g, ' ')));
    out('holder run, own section:', JSON.stringify(own), '| result:', await pg.$eval('.result', (e) => e.innerText.replace(/\s+/g, ' ').slice(0, 80)));
    for (const id of ['E009', 'E001', 'E004']) { await pg.goto(`${base('neu')}#/op/${id}`); await pg.waitForSelector('#start'); await pg.click('#start'); await pg.waitForSelector('#end'); await play(pg); await pg.waitForSelector('.result'); const o = await pg.$$eval('ul.own li', (l) => l.map((x) => x.innerText.replace(/\s+/g, ' '))); out(id, 'own:', JSON.stringify(o)); }
    await ctx.close();
  }
  {
    const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } }); const pg = await ctx.newPage();
    await pg.goto(`${base('old')}#/op/E006`); await pg.waitForSelector('#start'); await pg.click('#start'); await pg.waitForSelector('#end'); await play(pg); await pg.waitForSelector('.result');
    const code = await pg.$eval('#rcode', (e) => e.value); const dump = await pg.evaluate((K) => localStorage.getItem(K), KEY);
    const pg2 = await ctx.newPage(); await pg2.goto(base('neu')); await pg2.waitForSelector('main h1');
    await pg2.evaluate(([K, d]) => localStorage.setItem(K, d), [KEY, dump]); await pg2.reload(); await pg2.waitForSelector('main h1');
    await pg2.goto(`${base('neu')}#/v/${code}`); await pg2.waitForSelector('.verified, .notverified');
    out('old E006 code verifies on new build:', !!(await pg2.$('.card.verified')));
    await pg2.goto(`${base('neu')}#/records`); await pg2.waitForSelector('#paste'); out('records rows after loading the old save:', await pg2.$$eval('table tr', (r) => r.length - 1));
    await ctx.close();
  }
  await br.close(); process.exit(0);
})();
