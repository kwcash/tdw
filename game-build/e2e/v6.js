const { chromium } = require('/tmp/pw/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path'), assert = require('assert');
const T = process.env.T; const SHOTS = process.env.SHOTS; const OUT = process.env.OUT;
const NEU = `${T}/v3/out/pkg/2026`;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
// Each site can override single files, so one build serves a result set, a tampered claim, or a missing results file.
function serve(dir, port, over = {}) {
  http.createServer((q, r) => {
    const u = decodeURIComponent(q.url.split('?')[0]);
    if (over[u] !== undefined) { if (over[u] === null) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': 'application/json' }); r.end(over[u]); } return; }
    let f = path.join(dir, u); if (f.endsWith('/')) f += 'index.html';
    fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'text/plain' }); r.end(d); } });
  }).listen(port);
}
const F = JSON.parse(fs.readFileSync(`${NEU}/assets/forecasts.json`, 'utf8'));
const resultsWith = (rows) => JSON.stringify({ schema: 1, rows });
const tampered = JSON.parse(JSON.stringify(F)); tampered.items[0].text += ' (changed)';
serve(NEU, 9701);
serve(NEU, 9703, { '/assets/forecasts.json': JSON.stringify(tampered) });
serve(NEU, 9704, { '/assets/forecast-results.json': null });
serve(process.env.OLD, 9705);
const base = (p) => `http://localhost:${p}/`;
const out = (...a) => console.log(...a);
const errsOf = (pg, errs) => { pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push(m.text()); }); };
const lockNow = (clock) => `(() => { const R = Date; const off = ${clock} - R.now(); class D extends R { constructor(...a) { if (a.length) super(...a); else super(R.now() + off); } static now() { return R.now() + off; } } window.Date = D; })();`;

(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const texts = [];
  // 1. the page, the nav, the home card, locking
  for (const [w, h] of [[1280, 900], [390, 800]]) {
    const ctx = await br.newContext({ viewport: { width: w, height: h } }); const pg = await ctx.newPage(); const errs = []; errsOf(pg, errs);
    await pg.goto(base(9701)); await pg.waitForSelector('main h1');
    const nav = await pg.$$eval('#nav a', (a) => a.map((x) => x.textContent));
    await pg.goto(`${base(9701)}#/`); await pg.waitForSelector('main h1');
    // the home page needs a session, so start one by opening the tutorial route first when the welcome page shows
    let homeCard = await pg.$$eval('.card.feature .label', (e) => e.map((x) => x.textContent));
    await pg.goto(`${base(9701)}#/forecast`); await pg.waitForSelector('.fc');
    const shown0 = await pg.$$eval('article.fc', (a) => a.length); await pg.click('#fcall'); await pg.waitForFunction(() => document.querySelectorAll('article.fc').length > 8);
    out(`  first view shows ${shown0} claims`);
    const total = await pg.$$eval('article.fc', (a) => a.length); const open = await pg.$$eval('article.fc-open', (a) => a.length);
    const first = await pg.$eval('article.fc', (e) => e.innerText.replace(/\s+/g, ' ').slice(0, 260));
    const hashes = await pg.$$eval('.fc-hash.ok', (e) => e.length); const bad = await pg.$$eval('.fc-hash.bad', (e) => e.length);
    const ov = await pg.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const hiddenBeforeLock = await pg.$$eval('article.fc-open .fc-ref', (e) => e.length);
    if (w === 1280) texts.push(await pg.$eval('main', (m) => { const c = m.cloneNode(true); c.querySelectorAll('article.fc').forEach((x) => x.remove()); return c.innerText; }));
    // rules and out of range input
    const tc1 = '#fc-TC1';
    await pg.fill(`${tc1} input`, ''); await pg.click(`${tc1} [data-lock]`); const m0 = await pg.$eval(`${tc1} [data-fmsg]`, (e) => e.textContent);
    await pg.fill(`${tc1} input`, '0'); await pg.click(`${tc1} [data-lock]`); const m1 = await pg.$eval(`${tc1} [data-fmsg]`, (e) => e.textContent);
    await pg.fill(`${tc1} input`, '100'); await pg.click(`${tc1} [data-lock]`); const m2 = await pg.$eval(`${tc1} [data-fmsg]`, (e) => e.textContent);
    await pg.fill(`${tc1} input`, '70'); await pg.click(`${tc1} [data-lock]`); const armed = await pg.$eval(`${tc1} [data-lock]`, (e) => e.textContent);
    await pg.screenshot({ path: `${SHOTS}/forecast-open-${w}.png`, fullPage: false });
    await pg.click(`${tc1} [data-lock]`); await pg.waitForSelector('#fc-TC1.fc-locked');
    const locked = await pg.$eval(tc1, (e) => e.innerText.replace(/\s+/g, ' '));
    const sum = await pg.$eval('#fcs', (e) => e.parentElement.innerText.replace(/\s+/g, ' '));
    await pg.reload(); await pg.waitForSelector('.fc'); const stays = await pg.$('#fc-TC1.fc-locked');
    const again = await pg.evaluate(async () => { const r = await window.TDW_FETCH('/api/forecast', { method: 'POST', body: JSON.stringify({ id: 'TC1', p: 10 }) }); return [r.status, (await r.json()).error]; });
    const badId = await pg.evaluate(async () => { const r = await window.TDW_FETCH('/api/forecast', { method: 'POST', body: JSON.stringify({ id: '../x', p: 10 }) }); return r.status; });
    const frac = await pg.evaluate(async () => { const r = await window.TDW_FETCH('/api/forecast', { method: 'POST', body: JSON.stringify({ id: 'R5', p: 5.5 }) }); return r.status; });
    await pg.screenshot({ path: `${SHOTS}/forecast-locked-${w}.png`, fullPage: true });
    out(`${w}px nav ${JSON.stringify(nav)} | home cards ${JSON.stringify(homeCard)} | cards ${total} open ${open} | text checks ${hashes} bad ${bad} | overflow ${ov} | refs hidden before lock ${hiddenBeforeLock}`);
    out('  first:', first);
    out('  messages:', JSON.stringify([m0, m1, m2]), '| armed button:', armed);
    out('  locked card:', locked.slice(0, 420));
    out('  summary:', sum, '| stays after reload:', !!stays, '| second lock:', JSON.stringify(again), '| bad id:', badId, '| fraction:', frac);
    out('  console errors:', JSON.stringify(errs));
    await ctx.close();
  }
  // 2. results: scores, void, and the summary arithmetic
  {
    const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } }); const pg = await ctx.newPage(); const errs = []; errsOf(pg, errs);
    await pg.goto(`${base(9701)}#/forecast`); await pg.waitForSelector('.fc');
    for (const [id, p] of [['TC1', '70'], ['R5', '95'], ['D1', '50']]) { await pg.fill(`#fc-${id} input`, p); await pg.click(`#fc-${id} [data-lock]`); await pg.click(`#fc-${id} [data-lock]`); await pg.waitForSelector(`#fc-${id}.fc-locked`); }
    // the owner uploads a results file, which the page reads on the next visit
    const body = fs.readFileSync(`${NEU}/assets/forecast-results.json`, 'utf8') && resultsWith({ TC1: { result: 'true', scored_on: '2026-11-11', evidence: 'https://example.org/e', note: 'From the scoring log.' }, R5: { result: 'false', scored_on: '2027-01-02' }, D1: { result: 'void', scored_on: '2027-03-31' } });
    await pg.route('**/assets/forecast-results.json', (r) => r.fulfill({ status: 200, contentType: 'application/json', body }));
    await pg.reload(); await pg.waitForSelector('.fc');
    const res = await pg.$$eval('article.fc-resolved', (a) => a.map((x) => x.id));
    const tc1 = await pg.$eval('#fc-TC1', (e) => e.innerText.replace(/\s+/g, ' '));
    const r5 = await pg.$eval('#fc-R5', (e) => e.innerText.replace(/\s+/g, ' '));
    const d1 = await pg.$eval('#fc-D1', (e) => e.innerText.replace(/\s+/g, ' '));
    const sum = await pg.$eval('#fcs', (e) => e.parentElement.innerText.replace(/\s+/g, ' '));
    const link = await pg.$eval('#fc-TC1 a[href^="https://example.org"]', (a) => [a.target, a.rel]);
    // arithmetic: TC1 true, you .70 -> .090, book .75 -> .0625, ref .60 -> .160. R5 false, you .95 -> .9025, book .92 -> .8464, ref .90 -> .81
    const exp = { you: (0.09 + 0.9025) / 2, book: (0.0625 + 0.8464) / 2, ref: (0.16 + 0.81) / 2 };
    out('results: resolved cards', JSON.stringify(res), '| TC1:', tc1.slice(0, 520));
    out('  R5:', r5.slice(0, 520)); out('  D1:', d1.slice(0, 300));
    out('  summary:', sum, '| expected means', JSON.stringify(Object.fromEntries(Object.entries(exp).map(([k, v]) => [k, v.toFixed(3)]))), '| evidence link', JSON.stringify(link));
    await pg.screenshot({ path: `${SHOTS}/forecast-resolved-1280.png`, fullPage: false });
    out('  console errors:', JSON.stringify(errs));
    await ctx.close();
  }
  // 3. a claim past its check date is closed, and a result file that is missing says so
  {
    const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } }); const pg = await ctx.newPage(); const errs = []; errsOf(pg, errs);
    await pg.addInitScript(lockNow(Date.parse('2026-11-12T10:00:00Z')));
    await pg.goto(`${base(9704)}#/forecast`); await pg.waitForSelector('.fc');
    const closed = await pg.$$eval('article.fc-closed', (a) => a.map((x) => x.id)); const msg = await pg.$$eval('.err', (e) => e.map((x) => x.textContent));
    const tc1 = await pg.$eval('#fc-TC1', (e) => e.innerText.replace(/\s+/g, ' ').slice(0, 400)); const input = await pg.$('#fc-TC1 input');
    out('closed after the date:', JSON.stringify(closed), '| TC1 has an input:', !!input, '| results missing message:', JSON.stringify(msg));
    out('  TC1 closed card:', tc1);
    await ctx.close();
  }
  // 4. a claim whose text does not match its registered check value is flagged
  {
    const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } }); const pg = await ctx.newPage();
    await pg.goto(`${base(9703)}#/forecast`); await pg.waitForSelector('.fc');
    out('tampered claim flagged:', JSON.stringify(await pg.$$eval('.fc-hash.bad', (e) => e.map((x) => x.textContent))));
    await ctx.close();
  }
  // 5. the owner desk
  {
    const ctx = await br.newContext({ viewport: { width: 390, height: 800 }, acceptDownloads: true }); const pg = await ctx.newPage(); const errs = []; errsOf(pg, errs);
    await pg.goto(`${base(9701)}#/forecast/desk`); await pg.waitForSelector('#dk-add');
    texts.push(await pg.$eval('main', (m) => m.innerText.split('\n').filter((l) => !/^[A-Z0-9-]+ · due/.test(l)).join('\n')));
    await pg.selectOption('#dk-id', 'TC1'); await pg.selectOption('#dk-res', 'true'); await pg.fill('#dk-on', '2026-10-13'); await pg.fill('#dk-ev', 'http://bad.example'); await pg.click('#dk-add');
    const m1 = await pg.$eval('#dk-msg', (e) => e.textContent);
    await pg.selectOption('#dk-id', 'TC1'); await pg.selectOption('#dk-res', 'true'); await pg.fill('#dk-on', '2026-10-13'); await pg.fill('#dk-ev', 'https://example.org/log'); await pg.click('#dk-add');
    const m2 = await pg.$eval('#dk-msg', (e) => e.textContent);
    // a second entry on the same claim needs a note
    await pg.selectOption('#dk-id', 'TC1'); await pg.selectOption('#dk-res', 'false'); await pg.click('#dk-add'); const m3 = await pg.$eval('#dk-msg', (e) => e.textContent);
    await pg.selectOption('#dk-id', 'TC1'); await pg.selectOption('#dk-res', 'false'); await pg.fill('#dk-note', 'Corrected after the log was amended.'); await pg.click('#dk-add');
    await pg.selectOption('#dk-id', 'R5'); await pg.selectOption('#dk-res', 'void'); await pg.click('#dk-add');
    const [dl] = await Promise.all([pg.waitForEvent('download'), pg.click('#dk-dl')]);
    const file = `${OUT}/forecast-results.desk.json`; await dl.saveAs(file);
    const got = JSON.parse(fs.readFileSync(file, 'utf8'));
    out('desk messages:', JSON.stringify([m1, m2, m3]), '| download name:', dl.suggestedFilename());
    out('  file rows:', JSON.stringify(got.rows));
    const ov = await pg.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    await pg.screenshot({ path: `${SHOTS}/forecast-desk-390.png`, fullPage: true });
    out('  overflow', ov, '| console errors:', JSON.stringify(errs));
    await ctx.close();
  }
  // 6. an old save and an old result code still work in the new build, and the other pages are untouched
  {
    const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } }); const pg = await ctx.newPage(); const errs = []; errsOf(pg, errs);
    await pg.goto(`${base(9705)}#/op/W015`); await pg.waitForSelector('#start'); await pg.click('#start'); await pg.waitForSelector('#end');
    let turns = 0; while (!(await pg.$('.result')) && turns++ < 40) { const end = await pg.$('#end'); if (end) { await end.click(); await pg.waitForTimeout(80); const e2 = await pg.$('#end'); if (e2 && /Tap again/.test(await e2.textContent())) await e2.click(); await pg.waitForTimeout(150); } }
    await pg.waitForSelector('.result'); const code = await pg.$eval('#rcode', (e) => e.value); const dump = await pg.evaluate(() => localStorage.getItem('tdw-2026-1'));
    const pg2 = await ctx.newPage(); errsOf(pg2, errs); await pg2.goto(base(9701)); await pg2.waitForSelector('main h1');
    await pg2.evaluate((d) => localStorage.setItem('tdw-2026-1', d), dump); await pg2.reload(); await pg2.waitForSelector('main h1');
    await pg2.goto(`${base(9701)}#/v/${code}`); await pg2.waitForSelector('.verified, .notverified');
    const ver = !!(await pg2.$('.card.verified'));
    await pg2.goto(`${base(9701)}#/records`); await pg2.waitForSelector('#paste'); const rows = await pg2.$$eval('table tr', (r) => r.length - 1);
    await pg2.goto(`${base(9701)}#/forecast`); await pg2.waitForSelector('.fc'); const fc = await pg2.$$eval('article.fc', (a) => a.length);
    await pg2.goto(`${base(9701)}#/`); await pg2.waitForSelector('main h1'); const card = await pg2.$$eval('.card.feature .label', (e) => e.map((x) => x.textContent));
    const calendar = await pg2.$$eval('.cal-item', (e) => e.length);
    await pg2.screenshot({ path: `${SHOTS}/home-after-1280.png`, fullPage: false });
    out('old save: W015 code verifies in new build:', ver, '| records rows', rows, '| forecast cards', fc, '| home feature cards', JSON.stringify(card), '| calendar items', calendar, '| console errors', JSON.stringify(errs));
    await ctx.close();
  }
  fs.writeFileSync(`${OUT}/forecast-ui-text.txt`, texts.join('\n'));
  await br.close(); process.exit(0);
})();
