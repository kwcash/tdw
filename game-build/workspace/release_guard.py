"""Checks that release.py runs before it builds anything. test/backup.py tests both."""
import datetime, re

def results_guard(today, forecasts, results, confirmed):
    """A 2026 upload replaces assets/forecast-results.json on the site. Once a claim falls due the owner may have
    entered its result there, so the release waits until the repository holds the owner's file or the owner confirms."""
    due = [it['id'] for it in forecasts['items'] if it.get('check_by') and datetime.date.fromisoformat(it['check_by']) <= today]
    missing = [i for i in due if i not in results.get('rows', {})]
    if not missing or confirmed: return None
    return (f'REFUSED: {", ".join(missing)} fell due and forecast/out/forecast-results.json has no result for it. '
            'Ask the owner for the live forecast-results.json from the 2026 assets folder and commit it, '
            'or pass --results-current once the owner confirms no result was entered.')

MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

def review_guard(today, risks_text, days=31):
    """The risk log is reviewed at least once a month, and a release is the moment to do it."""
    m = re.search(r'Reviewed on (\d{1,2}) (' + '|'.join(MONTHS) + r') (\d{4})\.', risks_text)
    if not m: return 'REFUSED: RISKS.md has no "Reviewed on" date'
    on = datetime.date(int(m.group(3)), MONTHS.index(m.group(2)) + 1, int(m.group(1)))
    if (today - on).days > days: return f'REFUSED: RISKS.md was last reviewed on {on}. Review it and update the date.'
    return None

def write_manifest(dist):
    """Records the SHA-256 and size of every zip in dist/, so a backup copy can be checked against it."""
    import hashlib, json
    zips = {}
    for p in sorted(dist.glob('*.zip')):
        data = p.read_bytes()
        zips[p.name] = {'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data)}
    (dist / 'MANIFEST.json').write_text(json.dumps({'note': 'Written by release.py. test/backup.py checks every zip against it.', 'zips': zips}, indent=1) + '\n')
