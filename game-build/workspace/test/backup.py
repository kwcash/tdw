#!/usr/bin/env python3 -I
"""Checks the backups and the risk log. Usage: python3 test/backup.py
1. dist/MANIFEST.json lists every zip in dist/ with its SHA-256, and each zip matches and opens.
2. Each build zip holds a whole build that can be restored as it stands.
3. The release guard keeps a 2026 upload from replacing forecast results the owner entered on the site.
4. No file in game-build carries a token, a key or a password.
5. RISKS.md stays numbered, uses the agreed levels and names only checks that exist and run."""
import datetime, hashlib, json, pathlib, re, sys, zipfile
ws = pathlib.Path(__file__).resolve().parent.parent
gb = ws.parent
sys.path.insert(0, str(ws))
import release_guard as G

tests = []
def ok(name):
    def wrap(fn): tests.append((name, fn)); return fn
    return wrap

@ok('the manifest lists every zip in dist with a matching hash, and every zip opens')
def _():
    man = json.loads((gb / 'dist/MANIFEST.json').read_text())
    on_disk = sorted(p.name for p in (gb / 'dist').glob('*.zip'))
    assert sorted(man['zips']) == on_disk, f'manifest and dist differ: {sorted(set(on_disk) ^ set(man["zips"]))}'
    for name, row in man['zips'].items():
        data = (gb / 'dist' / name).read_bytes()
        assert hashlib.sha256(data).hexdigest() == row['sha256'], f'{name} does not match its hash'
        assert len(data) == row['bytes'], name
        with zipfile.ZipFile(gb / 'dist' / name) as z: assert z.testzip() is None, f'{name} is damaged'

@ok('each build zip holds a whole build')
def _():
    for b in ['game', '1931', '2030', '2026']:
        with zipfile.ZipFile(gb / 'dist' / f'{b}.zip') as z:
            names = set(z.namelist())
            for need in ['index.html', 'NOTICE.txt', 'js/game.js', 'js/record.js', 'assets/content.json']: assert need in names, f'{b}.zip lacks {need}'
            assert any(n.startswith('css/') for n in names), b
            if b == '2026':
                for need in ['assets/forecasts.json', 'assets/forecast-results.json']: assert need in names, f'2026.zip lacks {need}'
            json.loads(z.read('assets/content.json'))

@ok('the release guard holds a 2026 release once a claim falls due, until the owner\'s results file is in')
def _():
    fc = {'items': [{'id': 'A', 'check_by': '2026-11-11'}, {'id': 'B', 'check_by': '2026-12-01'}]}
    empty = {'rows': {}}
    day = datetime.date.fromisoformat
    assert G.results_guard(day('2026-11-10'), fc, empty, False) is None
    assert 'forecast-results.json' in G.results_guard(day('2026-11-11'), fc, empty, False)
    assert G.results_guard(day('2026-11-11'), fc, empty, True) is None
    # A file with a row for every claim now due needs no flag.
    assert G.results_guard(day('2026-11-20'), fc, {'rows': {'A': {'result': 'yes'}}}, False) is None
    assert G.results_guard(day('2026-12-02'), fc, {'rows': {'A': {'result': 'yes'}}}, False) is not None
    # The real files pass today, so the check is live and not a stub.
    real = G.results_guard(datetime.date(2026, 10, 15), json.loads((ws / 'forecast/out/forecasts.json').read_text()), json.loads((ws / 'forecast/out/forecast-results.json').read_text()), False)
    assert real is None, real
    assert G.results_guard(datetime.date(2026, 11, 11), json.loads((ws / 'forecast/out/forecasts.json').read_text()), {'rows': {}}, False) is not None

@ok('the release guard holds a release when the risk log has gone more than 31 days without review')
def _():
    text = 'Reviewed on 15 October 2026.'
    assert G.review_guard(datetime.date(2026, 11, 15), text) is None
    assert 'RISKS.md' in G.review_guard(datetime.date(2026, 11, 16), text)
    assert 'RISKS.md' in G.review_guard(datetime.date(2026, 10, 15), 'no date here')
    assert G.review_guard(datetime.date(2026, 10, 15), (gb / 'RISKS.md').read_text()) is None

@ok('no file in game-build carries a token, a private key or a password')
def _():
    SECRET = re.compile(r'gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|sk-(ant-)?[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{35}|xox[abpr]-[A-Za-z0-9-]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|(password|passwd|api[_-]?key|secret)\s*[=:]\s*["\'][^"\'\s]{6,}')
    found = []
    for p in gb.rglob('*'):
        if not p.is_file() or p.suffix in {'.zip', '.png', '.jpg', '.webp', '.ico'} or 'node_modules' in p.parts or '__pycache__' in p.parts or 'pkg' in p.parts: continue
        try: text = p.read_text(encoding='utf-8')
        except (UnicodeDecodeError, OSError): continue
        found += [f'{p.relative_to(gb)}: {m.group(0)[:12]}...' for m in SECRET.finditer(text)]
    assert found == [], found

@ok('RISKS.md numbers its risks and issues with no gap, uses the agreed levels and names checks that run')
def _():
    text = (gb / 'RISKS.md').read_text()
    checks = (ws / 'run_checks.sh').read_text()
    risks = re.findall(r'^\| (K\d+) \| ([^|]+) \| (Low|Medium|High) \| (Low|Medium|High) \| ([^|]+) \| ([^|]+) \| (Open|Watching|Closed) \|$', text, re.M)
    rows = re.findall(r'^\| (K\d+) \|', text, re.M)
    assert len(risks) == len(rows) and rows == [f'K{i + 1}' for i in range(len(rows))], 'risk rows K1, K2 and so on, each with levels and a status'
    issues = re.findall(r'^\| (I\d+) \| ([^|]+) \| ([^|]+) \| (Owner|Claude|Reviewer) \| (Open|Waiting|Closed) \|$', text, re.M)
    irows = re.findall(r'^\| (I\d+) \|', text, re.M)
    assert len(issues) == len(irows) and irows == [f'I{i + 1}' for i in range(len(irows))], 'issue rows I1, I2 and so on, each with an owner and a status'
    for r in risks:
        for f in re.findall(r'`test/([\w.-]+)`', r[5]):
            assert (ws / 'test' / f).exists(), f'{r[0]} names test/{f}, which does not exist'
            assert f.replace('.js', '') in checks or f in checks, f'{r[0]} names test/{f}, which run_checks.sh does not run'
    assert len(risks) >= 8 and len(issues) >= 5

for name, fn in tests:
    try: fn()
    except AssertionError as e: print('FAIL', name); print(e); sys.exit(1)
print(f'OK: {len(tests)} backup and risk tests passed')
