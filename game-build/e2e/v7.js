const { chromium } = require('/tmp/pw/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const T = process.env.T; const SHOTS = process.env.SHOTS; const OUT = process.env.OUT;
const NEU = `${T}/v3/out/pkg/2026`;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
function serve(dir, port) { http.createServer((q, r) => { let f = path.join(dir, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'text/plain' }); r.end(d); } }); }).listen(port); }
serve(NEU, 9901); serve(process.env.OLD, 9902);
const base = (p) => `http://localhost:${p}/`; const out = (...a) => console.log(...a);
const errsOf = (pg, errs) => { pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push(m.text()); }); };
async function endTurn(pg) { const end = await pg.$('#end'); if (!end) return; await end.click(); await pg.waitForTimeout(80); const e2 = await pg.$('#end'); if (e2 && /Tap again/.test(await e2.textContent())) await e2.click(); await pg.waitForTimeout(150); }
async function defendHot(pg) {
  const doms = await pg.$$('button[data-d]'); let best = null, bp = -1;
  for (const d of doms) { const l = await d.getAttribute('aria-label'); const m = /pressure (\d)/.exec(l); const pr = m ? +m[1] : 0; if (pr > bp) { bp = pr; best = d; } }
  if (best) { await best.click(); await pg.waitForTimeout(50); const df = await pg.$('[data-do="defend"]'); if (df) { await df.click(); await pg.waitForTimeout(50); } else { const cl = await pg.$('[data-do="close"],.sheetclose'); if (cl) await cl.click(); } }
}
async function finish(pg) { let t = 0; while (!(await pg.$('.result')) && t++ < 40) { for (let i = 0; i < 2; i++) await defendHot(pg); await endTurn(pg); } await pg.waitForSelector('.result'); }
(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const texts = [];
  for (const [w, h] of [[1280, 900], [390, 800]]) {
    const ctx = await br.newContext({ viewport: { width: w, height: h } }); const pg = await ctx.newPage(); const errs = []; errsOf(pg, errs);
    await pg.goto(`${base(9901)}#/ops`); await pg.waitForSelector('.oplist .item');
    const chips = await pg.$$eval('.oplist .chip2.band', (e) => e.length); const nOps = await pg.$$eval('.oplist .item', (e) => e.length);
    await pg.goto(`${base(9901)}#/op/W017`); await pg.waitForSelector('#start');
    const note = await pg.$eval('.bandnote', (e) => e.innerText.replace(/\s+/g, ' ')); const tiers = await pg.$$eval('[data-tier]', (e) => e.map((x) => x.textContent));
    if (w === 1280) texts.push(note);
    await pg.screenshot({ path: `${SHOTS}/W017-op-${w}.png`, fullPage: true });
    await pg.click('#start'); await pg.waitForSelector('#end');
    const rows = await pg.$$eval('section.reachbox > ul > li', (l) => l.map((x) => x.className.replace(/\s+/g, ' ').trim() + ' | ' + x.querySelector('b').textContent + ' | ' + x.querySelector('.rstate').textContent + ' | button ' + !!x.querySelector('button')));
    const ev = await pg.$$eval('section.reachbox details.rv-ev', (d) => d.length);
    // the evidence behind a closed move
    await pg.click('section.reachbox > ul > li.barred summary'); const evText = await pg.$eval('section.reachbox > ul > li.barred ul', (u) => u.innerText.replace(/\s+/g, ' ').slice(0, 400));
    await pg.screenshot({ path: `${SHOTS}/W017-play-${w}.png`, fullPage: false });
    const ov = await pg.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    // a free move, then a priced one with its sheet
    await pg.click('[data-reach="designate"]'); await pg.waitForSelector('[data-yes]'); await pg.click('[data-yes]'); await pg.waitForTimeout(250);
    const used = await pg.$eval('section.reachbox', (e) => e.innerText.includes('Used'));
    await pg.click('[data-reach="ancestry"]'); await pg.waitForSelector('[data-yes]'); const sheet = await pg.$eval('.sheet', (e) => e.innerText.replace(/\s+/g, ' ')); if (w === 1280) texts.push(sheet);
    await pg.screenshot({ path: `${SHOTS}/W017-sheet-${w}.png` });
    await pg.click('[data-do="close"]');
    const legBefore = await pg.$eval('main', (m) => /Legitimacy (\d+)/.exec(m.innerText) && Number(/Legitimacy (\d+)/.exec(m.innerText)[1]));
    await pg.click('[data-reach="ancestry"]'); await pg.click('[data-yes]'); await pg.waitForTimeout(250);
    const legAfter = await pg.$eval('main', (m) => /Legitimacy (\d+)/.exec(m.innerText) && Number(/Legitimacy (\d+)/.exec(m.innerText)[1]));
    await finish(pg);
    const code = await pg.$eval('#rcode', (e) => e.value);
    const closed = await pg.$$eval('ul.own li', (l) => l.map((x) => x.innerText.replace(/\s+/g, ' ')));
    await pg.screenshot({ path: `${SHOTS}/W017-result-${w}.png`, fullPage: true });
    if (w === 1280) texts.push(await pg.$eval('main', (m) => { const c = m.cloneNode(true); ['.fc', '.rv-ev'].forEach((s) => c.querySelectorAll(s).forEach((x) => x.remove())); const u = [...c.querySelectorAll('h3')].filter((h) => /What your rules closed/.test(h.textContent))[0]; return u ? u.nextElementSibling.innerText + '\n' + u.nextElementSibling.nextElementSibling.innerText : ''; }));
    await pg.goto(`${base(9901)}#/v/${code}`); await pg.waitForSelector('.verified, .notverified'); const verified = !!(await pg.$('.card.verified'));
    out(`${w}px: ops listed ${nOps}, band chips ${chips} | tier buttons ${JSON.stringify(tiers)} | note: ${note.slice(0, 120)}...`);
    out('  reach rows:', JSON.stringify(rows)); out('  evidence folds', ev, '| first closed move evidence:', evText.slice(0, 260));
    out('  overflow', ov, '| used badge after free move:', used, '| legitimacy before/after the priced move:', legBefore, legAfter, '| sheet:', sheet.slice(0, 220));
    out('  code verifies:', verified, '| tokens:', (code.match(/~[^~]*~?$/) || [''])[0].slice(0, 60), '| report blocks:', JSON.stringify(closed).slice(0, 700));
    out('  console errors:', JSON.stringify(errs));
    await ctx.close();
  }
  // W018 plays through, and nothing else on the site broke
  {
    const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } }); const pg = await ctx.newPage(); const errs = []; errsOf(pg, errs);
    await pg.goto(`${base(9901)}#/op/W018`); await pg.waitForSelector('#start'); await pg.click('#start'); await pg.waitForSelector('#end');
    const rows = await pg.$$eval('section.reachbox > ul > li', (l) => l.map((x) => x.querySelector('b').textContent + ' [' + x.querySelector('.rstate').textContent + ']'));
    await pg.click('[data-reach="due_process"]'); await pg.click('[data-yes]'); await pg.waitForTimeout(200); await finish(pg);
    out('W018 rows:', JSON.stringify(rows), '| result', (await pg.$eval('.result', (e) => e.innerText.replace(/\s+/g, ' '))).slice(0, 90));
    // an ordinary operation has no Reach panel, and forecast mode and old operations still work
    await pg.goto(`${base(9901)}#/op/W001`); await pg.waitForSelector('#start'); const band1 = await pg.$('.bandnote'); await pg.click('#start'); await pg.waitForSelector('#end'); const panel = await pg.$('section.reachbox');
    await pg.goto(`${base(9901)}#/forecast`); await pg.waitForSelector('.fc'); const fc = await pg.$$eval('article.fc', (a) => a.length);
    out('W001 band note:', !!band1, '| reach panel on W001:', !!panel, '| forecast cards', fc, '| console errors', JSON.stringify(errs));
    await ctx.close();
  }
  // an old 2026 save and an old result code still verify and load
  {
    const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } }); const pg = await ctx.newPage(); const errs = []; errsOf(pg, errs);
    await pg.goto(`${base(9902)}#/op/W015`); await pg.waitForSelector('#start'); await pg.click('#start'); await pg.waitForSelector('#end'); await finish(pg);
    const code = await pg.$eval('#rcode', (e) => e.value); const dump = await pg.evaluate(() => localStorage.getItem('tdw-2026-1'));
    const pg2 = await ctx.newPage(); errsOf(pg2, errs); await pg2.goto(base(9901)); await pg2.waitForSelector('main h1');
    await pg2.evaluate((d) => localStorage.setItem('tdw-2026-1', d), dump); await pg2.reload(); await pg2.waitForSelector('main h1');
    await pg2.goto(`${base(9901)}#/v/${code}`); await pg2.waitForSelector('.verified, .notverified'); const ver = !!(await pg2.$('.card.verified'));
    await pg2.goto(`${base(9901)}#/records`); await pg2.waitForSelector('#paste'); const rows = await pg2.$$eval('table tr', (r) => r.length - 1);
    out('old save: W015 code verifies in the new build:', ver, '| records rows', rows, '| console errors', JSON.stringify(errs));
    await ctx.close();
  }
  fs.writeFileSync(`${OUT}/band-ui-text.txt`, texts.join('\n'));
  await br.close(); process.exit(0);
})();
