"""Checks that release.py runs before it builds anything, and the manifest it writes after. test/backup.py tests them."""
import datetime, hashlib, json, os, re

KNOWN_FLAGS = {'--root', '--results-current'}

def flag_guard(argv):
    """A mistyped flag must stop the release, not pass in silence."""
    bad = [a for a in argv if a.startswith('--') and a not in KNOWN_FLAGS]
    return f'REFUSED: unknown flag {", ".join(bad)}. Known flags are {", ".join(sorted(KNOWN_FLAGS))}.' if bad else None

def results_guard(today, forecasts, confirmed):
    """Every release ships the 2026 folder, and with it assets/forecast-results.json. The owner enters results on the
    site, early or late, and corrects them there. Once any claim falls due, a release goes ahead only when the owner has
    confirmed that the repository file matches the live one, and --results-current records that."""
    due = [it['id'] for it in forecasts['items'] if it.get('check_by') and datetime.date.fromisoformat(it['check_by']) <= today]
    if not due or confirmed: return None
    return (f'REFUSED: {due[0]} and {len(due) - 1} more claims have fallen due, so the live forecast-results.json may hold results '
            'the repository lacks. Ask the owner for the file in the 2026 assets folder and commit it to forecast/out/. '
            'Then pass --results-current.')

MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

def review_guard(today, risks_text, days=31):
    """The risk log is reviewed at least once a month, and a release is the moment to do it."""
    found = re.findall(r'Reviewed on (\d{1,2}) (' + '|'.join(MONTHS) + r') (\d{4})\.', risks_text)
    if len(found) != 1: return 'REFUSED: RISKS.md must carry one "Reviewed on" date'
    d, m, y = found[0]
    try: on = datetime.date(int(y), MONTHS.index(m) + 1, int(d))
    except ValueError: return f'REFUSED: RISKS.md carries an impossible review date, {d} {m} {y}'
    if on > today: return f'REFUSED: RISKS.md carries a review date in the future, {on}'
    if (today - on).days > days: return f'REFUSED: RISKS.md was last reviewed on {on}. Review it and update the date.'
    return None

def write_manifest(dist):
    """Records the SHA-256 and size of every zip in dist/, so a backup copy can be checked against it.
    To repair it after a release that stopped part way, run python3 -I -c "import release_guard as G, pathlib; G.write_manifest(pathlib.Path('../dist'))"
    from workspace/, then check each zip that changed."""
    zips = {}
    for p in sorted(dist.glob('*.zip')):
        data = p.read_bytes()
        zips[p.name] = {'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data)}
    tmp = dist / 'MANIFEST.json.part'
    tmp.write_text(json.dumps({'note': 'Written by release.py. test/backup.py checks every zip against it.', 'zips': zips}, indent=1) + '\n')
    os.replace(tmp, dist / 'MANIFEST.json')
