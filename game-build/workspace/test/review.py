#!/usr/bin/env python3 -I
"""Checks the source review pack. Usage: python3 test/review.py
1. The worksheet is current. It lists every claim marked Check, secondary only or cut if unsupported in SOURCING_2026.md,
   and every evidence card marked for checking, once each and in a stable order.
2. The checker accepts a well filled worksheet and refuses each kind of bad row.
3. The brief and the log keep the house style and name no reviewer."""
import csv, io, json, pathlib, subprocess, sys
ws = pathlib.Path(__file__).resolve().parent.parent
gb = ws.parent
sys.path.insert(0, str(ws / 'review'))
import worksheet as W

tests = []
def ok(name):
    def wrap(fn): tests.append((name, fn)); return fn
    return wrap

def rows_of(text): return list(csv.DictReader(io.StringIO(text)))

@ok('the worksheet in the repository is what the builder makes from the sources now')
def _():
    now = W.build(gb / 'SOURCING_2026.md', ws / 'band/cards.json')
    assert (ws / 'review/worksheet.csv').read_text(encoding='utf-8') == now, 'run python3 review/worksheet.py build'

@ok('the worksheet lists every claim that waits for a check, once each, and nothing already settled')
def _():
    rows = rows_of((ws / 'review/worksheet.csv').read_text(encoding='utf-8'))
    ids = [r['item'] for r in rows]
    assert len(ids) == len(set(ids)), 'item ids are unique'
    src = (gb / 'SOURCING_2026.md').read_text(encoding='utf-8')
    waiting = [l for l in src.split('\n') if l.startswith('| ') and W.waits(l.rstrip(' |').split('|')[-1].strip())]
    cards = [c for c in json.loads((ws / 'band/cards.json').read_text())['cards'] if c.get('check')]
    assert len(rows) == len(waiting) + len(cards), (len(rows), len(waiting), len(cards))
    for c in cards: assert any(r['item'] == c['id'] for r in rows), c['id']
    for r in rows:
        assert r['verdict'] == '' and r['reviewer_source'] == '' and r['checked_on'] == '', 'the worksheet ships blank'
        assert r['claim'].strip() and r['now_rests_on'].strip(), r['item']
    assert W.COLUMNS == list(rows[0].keys())

@ok('the checker accepts a filled worksheet and refuses each kind of bad row')
def _():
    blank = rows_of((ws / 'review/worksheet.csv').read_text(encoding='utf-8'))[:6]
    good = [dict(r) for r in blank]
    good[0].update(verdict='Confirmed', reviewer_source='https://www.gao.gov/products/gao-24-105981', checked_on='2026-11-02')
    good[1].update(verdict='Confirmed with change', reviewer_source='https://example.org/a', reviewer_note='The year is 2019, not 2018.', checked_on='2026-11-02')
    good[2].update(verdict='Not supported', reviewer_note='No source says this.', checked_on='2026-11-02')
    good[3].update(verdict='Cannot check', reviewer_note='The page is behind a paywall.', checked_on='2026-11-02')
    # Rows left blank are allowed. A review can come back in parts.
    assert W.check(good, blank, today='2026-11-03') == []
    def bad(change, idx=0):
        rows = [dict(r) for r in good]; rows[idx].update(change); return W.check(rows, blank, today='2026-11-03')
    assert any('verdict' in e for e in bad({'verdict': 'Probably'}))
    assert any('source' in e for e in bad({'reviewer_source': ''}))
    assert any('https' in e for e in bad({'reviewer_source': 'http://example.org'}))
    assert any('note' in e for e in bad({'reviewer_note': ''}, 1))
    assert any('note' in e for e in bad({'reviewer_note': ''}, 2))
    assert any('date' in e for e in bad({'checked_on': '2026-13-40'}))
    assert any('future' in e for e in bad({'checked_on': '2026-12-01'}))
    assert any('claim' in e for e in bad({'claim': 'Something else.'}))
    rows = [dict(r) for r in good] + [dict(good[0])]
    assert any('twice' in e for e in W.check(rows, blank, today='2026-11-03'))
    rows = [dict(r) for r in good]; rows[0]['item'] = 'ZZ-999'
    assert any('ZZ-999' in e for e in W.check(rows, blank, today='2026-11-03'))

@ok('the summary counts each verdict and lists what needs a change in the game')
def _():
    blank = rows_of((ws / 'review/worksheet.csv').read_text(encoding='utf-8'))[:3]
    rows = [dict(r) for r in blank]
    rows[0].update(verdict='Confirmed', reviewer_source='https://example.org/x', checked_on='2026-11-02')
    rows[1].update(verdict='Not supported', reviewer_note='No source.', checked_on='2026-11-02')
    s = W.summary(rows)
    assert 'Confirmed 1' in s and 'Not supported 1' in s and 'not yet checked 1' in s
    assert rows[1]['item'] in s

@ok('the brief and the log keep the house style, and the log names no reviewer')
def _():
    for f in ['REVIEW_SOURCES.md', 'REVIEW_LOG.md']:
        r = subprocess.run([sys.executable, '-I', str(ws / 'test/lint-strict.py'), str(gb / f)], capture_output=True, text=True)
        assert r.stdout.strip().split('\n')[-1] == '0 style failures', r.stdout[-800:]
    log = (gb / 'REVIEW_LOG.md').read_text(encoding='utf-8')
    assert 'Reviewer A' in log and '@' not in log, 'the log calls the reviewer by a letter and carries no address'
    brief = (gb / 'REVIEW_SOURCES.md').read_text(encoding='utf-8')
    for v in W.VERDICTS: assert v in brief, v
    n = len(rows_of((ws / 'review/worksheet.csv').read_text(encoding='utf-8')))
    assert f'{n} claims' in brief, f'the brief gives the worksheet size, {n} claims'

for name, fn in tests:
    try: fn()
    except AssertionError as e: print('FAIL', name); print(e); sys.exit(1)
print(f'OK: {len(tests)} source review tests passed')
