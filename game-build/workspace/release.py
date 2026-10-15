#!/usr/bin/env python3 -I
"""Builds a release. Usage: python3 release.py TAG [NOTE.md ...] [--root] [--results-current]
1. Runs mkpkg.py, which builds out/pkg/game, 1931, 2030 and 2026.
2. Writes ../dist/<build>.zip for each build, and ../dist/update-TAG.zip, the upload set for the owner's file manager.
   The upload set holds the four build folders and the notes named on the command line. --root adds the front page
   (../../frontpage/index.html) as index.html at the top of the zip.
3. Refreshes the mirrors at the top of game-build/: js/, style.css, content/ and the notes.
4. Writes ../dist/MANIFEST.json with the hash of every zip, for the backup check in test/backup.py.
It refuses to run unless run_checks.sh passes, the risk log was reviewed in the last 31 days and, once a forecast
claim falls due, the repository holds the owner's results file (or --results-current says no result was entered)."""
import datetime, json, os, shutil, subprocess, sys, zipfile, pathlib
ws = pathlib.Path(__file__).resolve().parent
gb = ws.parent
args = [a for a in sys.argv[1:] if not a.startswith('--')]
if not args: sys.exit(__doc__)
tag, notes = args[0], args[1:]
root_page = '--root' in sys.argv
sys.path.insert(0, str(ws))
import release_guard as G
today = datetime.date.today()
for stop in [G.review_guard(today, (gb / 'RISKS.md').read_text()),
             G.results_guard(today, json.loads((ws / 'forecast/out/forecasts.json').read_text()), json.loads((ws / 'forecast/out/forecast-results.json').read_text()), '--results-current' in sys.argv)]:
    if stop: sys.exit(stop)

# Each note must exist and pass the house-style lint. The release standard is in ../STANDARDS.md.
for n in notes:
    if not (ws / n).exists(): sys.exit(f'REFUSED: {n} does not exist')
    if n.endswith('.md') and n.startswith('CHANGELOG'):
        lint = subprocess.run([sys.executable, '-I', str(ws / 'test/lint-strict.py'), str(ws / n)], capture_output=True, text=True)
        if lint.returncode != 0: sys.exit('REFUSED: the changelog fails the style lint\n' + lint.stdout[-1500:])
if not any(n.startswith('CHANGELOG') for n in notes): sys.exit('REFUSED: a release needs its changelog among the notes')
r = subprocess.run(['bash', str(ws / 'run_checks.sh')], capture_output=True, text=True)
if r.returncode != 0 or 'ALL CHECKS PASS' not in r.stdout: sys.exit('REFUSED: run_checks.sh did not pass\n' + r.stdout[-2000:])
subprocess.run([sys.executable, '-I', str(ws / 'mkpkg.py')], check=True, cwd=ws)

def add_tree(z, src, arc):
    for p in sorted(pathlib.Path(src).rglob('*')):
        if p.is_file(): z.write(p, f'{arc}/{p.relative_to(src).as_posix()}' if arc else p.relative_to(src).as_posix())

BUILDS = ['game', '1931', '2030', '2026']
for b in BUILDS:
    with zipfile.ZipFile(gb / 'dist' / f'{b}.zip', 'w', zipfile.ZIP_DEFLATED) as z: add_tree(z, ws / 'out/pkg' / b, '')
up = gb / 'dist' / f'update-{tag}.zip'
with zipfile.ZipFile(up, 'w', zipfile.ZIP_DEFLATED) as z:
    if root_page: z.write(gb.parent / 'frontpage/index.html', 'index.html')
    for b in BUILDS: add_tree(z, ws / 'out/pkg' / b, b)
    for n in notes: z.write(ws / n, pathlib.Path(n).name)

for src, dst in [('out/game.js', 'js/game.js'), ('out/engine.js', 'js/engine.js'), ('out/record.js', 'js/record.js'), ('parts/style.css', 'style.css')]:
    shutil.copy(ws / src, gb / dst)
for f in ['base.json', 'era1.json', 'era2.json', 'era3.json']:
    shutil.copy(ws / 'content' / f, gb / 'content' / f)
for n in notes: shutil.copy(ws / n, gb / pathlib.Path(n).name)
G.write_manifest(gb / 'dist')
print(f'released {tag}: {up.relative_to(gb.parent)} ({up.stat().st_size // 1024} KB), {len(notes)} notes, front page {"included" if root_page else "not included"}')
