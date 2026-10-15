// Browser run for version 10: difficulty labels on the operations list, the briefing, the arcs and the daily. Usage:
// NEW=<folder holding game, 1931, 2030, 2026 built by mkpkg.py> OLDD=<the same four from the previous release> SHOTS=<dir> node e2e/v10.js
const { chromium } = require(process.env.PW_MODULE || '/tmp/pw/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const NEW = process.env.NEW, OLDD = process.env.OLDD, SHOTS = process.env.SHOTS || '';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
function serve(dir, port) { http.createServer((q, r) => { let f = path.join(dir, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'text/plain' }); r.end(d); } }); }).listen(port); }
const BUILDS = [['game', 'C002', 'base'], ['1931', 'E011', 'era1'], ['2030', 'N005', 'era2'], ['2026', 'W017', 'era3']];
const WS = path.join(__dirname, '..');
const TABLE = JSON.parse(fs.readFileSync(path.join(WS, 'difficulty/difficulty.json'), 'utf8'));
const HELP = JSON.parse(fs.readFileSync(path.join(WS, 'src/help.json'), 'utf8'));
const label = (r) => HELP.ui.difficulty.bands.find((b) => r >= b.min).label;
BUILDS.forEach(([n], i) => { serve(`${NEW}/${n}`, 9990 + i); serve(`${OLDD}/${n}`, 10000 + i); });
const out = (...a) => console.log(...a);
let bad = 0; const check = (cond, what) => { if (!cond) { bad++; out('  FAIL', what); } };
async function finish(pg) { let t = 0; while (!(await pg.$('.result')) && t++ < 40) { const ok = await pg.$('#coachok'); if (ok) { await ok.click(); continue; } const end = await pg.$('#end'); if (!end) break; await end.click(); await pg.waitForTimeout(60); const e2 = await pg.$('#end'); if (e2 && /Tap again/.test(await e2.textContent())) await e2.click(); await pg.waitForTimeout(120); } await pg.waitForSelector('.result'); }
(async () => {
  const br = await chromium.launch({ ...(process.env.CHROMIUM === '' ? {} : { executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' }), args: ['--no-sandbox'] });
  for (const [i, [name, opId, b]] of BUILDS.entries()) {
    const nu = `http://localhost:${9990 + i}/`; const old = `http://localhost:${10000 + i}/`; const rates = TABLE.builds[b];
    for (const [w, h] of [[1280, 900], [390, 800]]) {
      const ctx = await br.newContext({ viewport: { width: w, height: h } }); const pg = await ctx.newPage(); const errs = [];
      pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push(m.text()); });
      await pg.goto(`${nu}#/ops`); await pg.waitForSelector('.oplist .item');
      const chips = await pg.$$eval('.oplist .item', (items) => items.map((a) => [a.getAttribute('href').split('/').pop(), a.querySelector('.chip2.diff').textContent]));
      const wrong = chips.filter(([id, t]) => !t.endsWith(' · ' + label(rates[id][Number(t.slice(1, 2)) - 1])));
      check(chips.length > 0 && !wrong.length, `${name} list chips ${JSON.stringify(wrong.slice(0, 3))}`);
      const tall = await pg.$$eval('.oplist .chip2.diff', (c) => c.filter((x) => x.getBoundingClientRect().height > 32).length);
      check(tall === 0, `${name} ${w}px ${tall} list chips wrap onto a second line`);
      if (w === 390 && SHOTS) await pg.screenshot({ path: `${SHOTS}/${name}-ops-390.png` });
      await pg.goto(`${nu}#/op/${opId}`); await pg.waitForSelector('#tierdiff');
      const first = await pg.$eval('#tierdiff', (e) => e.textContent);
      await pg.click('[data-tier="7"]'); const t7 = await pg.$eval('#tierdiff', (e) => e.textContent);
      await pg.click('[data-tier="1"]'); const t1 = await pg.$eval('#tierdiff', (e) => e.textContent);
      const aria = await pg.$eval('[data-tier="7"]', (e) => e.getAttribute('aria-label'));
      check(t7 === `Tier 7 · ${label(rates[opId][6])}. A scripted player won ${rates[opId][6]} percent of its games at this tier.` && t1.startsWith(`Tier 1 · ${label(rates[opId][0])}.`) && aria === `T7, ${label(rates[opId][6])}`, `${name} briefing "${first}" "${t7}" "${t1}" "${aria}"`);
      check(!!(await pg.$('.diffnote')), `${name} briefing says the label is a reading`);
      if (w === 390 && SHOTS) await pg.screenshot({ path: `${SHOTS}/${name}-op-390.png` });
      await pg.click('#start'); await pg.waitForSelector('#end'); const hud = await pg.$eval('.hud-sub', (e) => e.textContent); check(/Tier 1/.test(hud), `${name} the chosen tier plays: ${hud}`);
      await pg.goto(`${nu}#/arcs`); await pg.waitForSelector('a.card.feature'); const arcHref = await pg.$eval('a.card.feature', (a) => a.getAttribute('href'));
      await pg.goto(`${nu}${arcHref}`); await pg.waitForSelector('.arcnode');
      const node = await pg.$eval('.arcnode .muted', (e) => e.textContent);
      check(/Tier 1 · (Gentle|Fair|Hard|Very hard|Brutal) · /.test(node) && !!(await pg.$('.diffnote')), `${name} arc node "${node}" and its note`);
      await pg.goto(`${nu}#/daily`); await pg.waitForSelector('.hero .kicker'); const dk = await pg.$eval('.hero .kicker', (e) => e.textContent);
      check(/Tier 3 · (Gentle|Fair|Hard|Very hard|Brutal)$/.test(dk) && !!(await pg.$('.hero .diffnote')), `${name} daily "${dk}" and its note`);
      await pg.goto(`${nu}#/how?s=tiers`); await pg.waitForSelector('#how-tiers'); const how = await pg.$$eval('#how-tiers + p + .tiles2 .label', (l) => l.map((x) => x.textContent));
      check(how.includes('Difficulty labels'), `${name} how tiers ${JSON.stringify(how)}`);
      const ov = await pg.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(ov <= 0 && !errs.length, `${name} ${w}px overflow ${ov} errors ${JSON.stringify(errs)}`);
      out(`${name} ${w}px: ${chips.length} list chips right | briefing "${t7}" | arc "${node.trim()}" | daily "${dk}" | overflow ${ov} | errors ${errs.length}`);
      await ctx.close();
    }
    const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } }); const pg = await ctx.newPage(); const errs = [];
    pg.on('pageerror', (e) => errs.push(e.message));
    await pg.goto(`${old}#/op/${opId}`); await pg.waitForSelector('#start'); await pg.click('#start'); await pg.waitForSelector('#end'); await finish(pg);
    const code = await pg.$eval('#rcode', (e) => e.value); const key = await pg.evaluate(() => Object.keys(localStorage).find((k) => /^tdw-/.test(k) && !['tdw-coach', 'tdw-guide'].includes(k)));
    const dump = await pg.evaluate((k) => localStorage.getItem(k), key);
    const pg2 = await ctx.newPage(); pg2.on('pageerror', (e) => errs.push(e.message)); await pg2.goto(nu); await pg2.waitForSelector('main h1');
    await pg2.evaluate(([k, d]) => localStorage.setItem(k, d), [key, dump]); await pg2.reload(); await pg2.waitForSelector('main h1');
    await pg2.goto(`${nu}#/v/${code}`); await pg2.waitForSelector('.verified, .notverified'); const ver = !!(await pg2.$('.card.verified'));
    await pg2.goto(`${nu}#/records`); await pg2.waitForSelector('#paste'); const rows = await pg2.$$eval('table tr', (r) => r.length - 1);
    check(ver && rows >= 1 && !errs.length, `${name} old save`);
    out(`${name} old save: key ${key} | old ${opId} code verifies ${ver} | records rows ${rows} | errors ${JSON.stringify(errs)}`);
    await ctx.close();
  }
  await br.close();
  out(bad ? `${bad} BROWSER CHECKS FAILED` : 'ALL BROWSER CHECKS PASS');
  process.exit(bad ? 1 : 0);
})();
