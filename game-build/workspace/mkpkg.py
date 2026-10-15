import os, shutil, re, json, sys
root = os.path.dirname(os.path.abspath(__file__))
orig = open(f'{root}/orig/index.html').read()
V = {
 'game': dict(json='base', title='TDW Strategic Game', ver=9, desc=None, foot1=None),
 '1931': dict(json='era1', title='Total Domain War 1931 to 1949', ver=10,
   desc='Three factions, one occupation, and a civil war that stopped for the Japanese. A turn-based strategy game built on the documented record from 1931 to 1949.',
   foot1='The actors are a party and two governments. The Chinese and Japanese peoples are not them. Ancestry is not loyalty.'),
 '2026': dict(json='era3', title='Total Domain War 2026',
   ver=15, extra=['forecasts.json', 'forecast-results.json'], desc='Nineteen operations from the record of the contest as it stands in autumn 2026, with a watch on Taiwan\'s 28 November vote. A turn-based strategy game that applies ten dimensions, twelve domains and thirty-six stratagems.',
   foot1='The actors are states and the parties that run them. Their peoples are not the adversary. The Chinese people are the Party\'s first victims. Ancestry is not loyalty.'),
 '2030': dict(json='era2', title='Total Domain War 2030', ver=9,
   desc='Three blocs, twelve domains, and a contest fought through finance, data and cables. A turn-based strategy game built on the documented record and the open reading to 2051.',
   foot1='The actors are states and the parties that run them. Their peoples are not the adversary. The Chinese people are the Party\'s first victims. Ancestry is not loyalty.'),
}
NOTICE = {
 'game': 'TDW game, updated 15 October 2026, fifth set. Replace everything in /game/ (index.html, css/, js/, assets/).\nSaved progress and result codes stay valid. The storage key is unchanged.\nAccessibility fixes. Labels and buttons now meet the contrast standard in the light and dark themes. A screen reader now reads out each turn\'s results and the warning about unspent actions. No operation changed.\nSee CHANGELOG_2026-10-15j.md.\n',
 '1931': 'TDW 1931 to 1949, updated 15 October 2026, fifth set. Replace everything in /1931/ (index.html, css/, js/, assets/).\nSaved progress and result codes stay valid. The storage key is unchanged.\nAccessibility fixes. Labels and buttons now meet the contrast standard in the light and dark themes. A screen reader now reads out each turn\'s results and the warning about unspent actions. No operation changed.\nSee CHANGELOG_2026-10-15j.md.\n',
 '2026': 'TDW 2026, updated 15 October 2026, sixth set. Replace everything in /2026/ (index.html, css/, js/, assets/).\nBefore you replace it, check whether you entered any forecast result at the desk. If you did, upload your own assets/forecast-results.json again afterwards.\nSaved progress, result codes and locked forecasts stay valid. The storage key is unchanged.\nAccessibility fixes. Labels and buttons now meet the contrast standard in the light and dark themes. A screen reader now reads out each turn\'s results and the warning about unspent actions. No operation changed.\nSee CHANGELOG_2026-10-15j.md.\n',
 '2030': 'TDW 2030, updated 15 October 2026, fifth set. Replace everything in /2030/ (index.html, css/, js/, assets/).\nSaved progress and result codes stay valid. The storage key is unchanged.\nAccessibility fixes. Labels and buttons now meet the contrast standard in the light and dark themes. A screen reader now reads out each turn\'s results and the warning about unspent actions. No operation changed.\nSee CHANGELOG_2026-10-15j.md.\n',
}
for name, v in V.items():
    if len(sys.argv) > 1 and name not in sys.argv[1:]: continue
    d = f'{root}/out/pkg/{name}'
    shutil.rmtree(d, ignore_errors=True)
    for s in ('js','css','assets'): os.makedirs(f'{d}/{s}')
    ver = v.get('ver', 3)
    h = orig
    if v['desc']:
        h = h.replace('<title>TDW Strategic Game</title>', f'<title>{v["title"]}</title>', 1)
        h = re.sub(r'(<meta name="description" content=")[^"]*', lambda m: m.group(1)+v['desc'], h, 1)
        h = h.replace('<p>The actor is the Party. The Chinese people are its first victims. Ancestry is not loyalty.</p>', f'<p>{v["foot1"]}</p>', 1)
    h = h.replace('href="css/style.css"', f'href="css/style.css?v={ver}"').replace("'assets/content.json'", f"'assets/content.json?v={ver}'").replace("g.src='js/record.js'", f"g.src='js/record.js?v={ver}'").replace("h.src='js/game.js'", f"h.src='js/game.js?v={ver}'")
    assert h.count(f'?v={ver}') == 4, h.count(f'?v={ver}')
    open(f'{d}/index.html','w').write(h)
    shutil.copy(f'{root}/out/game.js', f'{d}/js/game.js')
    shutil.copy(f'{root}/out/record.js', f'{d}/js/record.js')
    open(f'{d}/NOTICE.txt','w').write(NOTICE[name])
    shutil.copy(f'{root}/parts/style.css', f'{d}/css/style.css')
    shutil.copy(f'{root}/content/{v["json"]}.json', f'{d}/assets/content.json')
    for x in v.get('extra', []): shutil.copy(f'{root}/forecast/out/{x}', f'{d}/assets/{x}')
print('ok')
