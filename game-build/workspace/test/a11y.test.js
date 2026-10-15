'use strict';
// Accessibility guards that need no browser. Run: node test/a11y.test.js
// e2e/a11y.js runs the full audit in a browser. This file keeps its fixes from slipping back between browser runs.
const assert = require('node:assert'); const fs = require('node:fs'); const path = require('node:path');
const ROOT = path.join(__dirname, '..');
const css = fs.readFileSync(path.join(ROOT, 'src/style.css'), 'utf8');
const board = fs.readFileSync(path.join(ROOT, 'src/board.js'), 'utf8');
const HELP = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/help.json'), 'utf8'));
const tests = []; const ok = (name, fn) => tests.push([name, fn]);

// The three theme blocks: light, dark by system setting, dark by choice.
const blocks = [/:root \{([^}]*)\}/, /:root:not\(\[data-theme="light"\]\) \{([^}]*)\}/, /:root\[data-theme="dark"\] \{([^}]*)\}/].map((re) => re.exec(css)[1]);
const token = (block, name) => {
  const m = new RegExp(`--${name}:\\s*#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\\b`).exec(block); assert.ok(m, `--${name} is set in every theme`);
  return '#' + (m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1]);
};
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lum = (h) => { const [r, g, b] = rgb(h).map((c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const mix = (a, b, t) => '#' + rgb(a).map((c, i) => Math.round(c * t + rgb(b)[i] * (1 - t)).toString(16).padStart(2, '0')).join('');

ok('text colours meet 4.5 to 1 in the light and both dark themes', () => {
  blocks.forEach((b, i) => {
    const bg = token(b, 'bg'); const panel = token(b, 'panel'); const ink = token(b, 'accent-ink');
    const pairs = {
      'kicker on the page': [token(b, 'kicker'), bg],
      'button text on a primary button': [ink, token(b, 'btn')],
      'muted text on a panel': [token(b, 'muted'), panel],
      'warning text on its chip': [token(b, 'warn'), mix(token(b, 'warn'), panel, 0.12)],
      'gate badge text': [bg, i === 0 ? '#5f6b7a' : '#8b97a6'],
    };
    for (const [what, [fg, back]] of Object.entries(pairs)) assert.ok(ratio(fg, back) >= 4.5, `theme ${i}: ${what} is ${ratio(fg, back).toFixed(2)} to 1`);
  });
});

ok('primary buttons and the lever badge use the button token, and the hero keeps its own kicker colour', () => {
  assert.ok(/button\.primary, \.btn\.primary \{ background: var\(--btn\)/.test(css));
  assert.ok(/\.badge\.lever \{ background: var\(--btn\)/.test(css));
  assert.ok(/\.kicker \{[^}]*color: var\(--kicker\)/.test(css) && /\.hero \.kicker \{ color: #f0a39e; \}/.test(css));
  assert.ok(/\.tile \.badge\.gate \{[^}]*color: var\(--bg\)/.test(css));
});

ok('the board keeps one live region outside the redrawn area, and the feed is not a second one', () => {
  assert.ok(/\.sr-only \{[^}]*clip: rect\(0 0 0 0\)/.test(css));
  assert.ok(/live\.setAttribute\('aria-live', 'polite'\)/.test(board) && /document\.body\.appendChild\(live\)/.test(board));
  assert.ok(/function drawBoard\(\) \{\n\s+liveRegion\(\);/.test(board), 'the region exists before the first turn ends');
  assert.ok(!/class="feed" aria-live/.test(board));
});

ok('the announcements live in help.json, keep the house style and match the four second window', () => {
  const L = HELP.ui.live;
  for (const k of ['turn', 'over', 'quiet', 'unspent']) assert.ok(typeof L[k] === 'string' && !/[:;—]/.test(L[k]), k);
  assert.ok(L.turn.includes('{n}') && L.unspent.includes('{n}'));
  assert.ok(/four seconds/.test(L.unspent) && /btn\.classList\.remove\('armed'\); \} \}, 4000\)/.test(board), 'the text and the timer agree');
  for (const k of ['turn', 'over', 'quiet', 'unspent']) assert.ok(board.includes(`HELP.ui.live.${k}`), `board.js reads ${k}`);
});

let n = 0;
for (const [name, fn] of tests) { try { fn(); n++; } catch (e) { console.log('FAIL', name); console.log(e.message); process.exit(1); } }
console.log(`OK: ${n} accessibility tests passed`);
