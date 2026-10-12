import os, shutil, re, json, sys
root = os.path.dirname(os.path.abspath(__file__))
orig = open(f'{root}/orig/index.html').read()
V = {
 'game': dict(json='base', title='TDW Strategic Game', desc=None, foot1=None),
 '1931': dict(json='era1', title='Total Domain War 1931 to 1949',
   desc='Three factions, one occupation, and a civil war that stopped for the Japanese. A turn-based strategy game built on the documented record from 1931 to 1949.',
   foot1='The actors are a party and two governments. The Chinese and Japanese peoples are not them. Ancestry is not loyalty.'),
 '2026': dict(json='era3', title='Total Domain War 2026',
   desc='Twelve operations, one for each domain, from the record of the contest as it stands in autumn 2026. A turn-based strategy game that applies ten dimensions, twelve domains and thirty-six stratagems.',
   foot1='The actors are states and the parties that run them. Their peoples are not the adversary. The Chinese people are the Party\'s first victims. Ancestry is not loyalty.'),
 '2030': dict(json='era2', title='Total Domain War 2030',
   desc='Three blocs, twelve domains, and a contest fought through finance, data and cables. A turn-based strategy game built on the documented record and the open reading to 2051.',
   foot1='The actors are states and the parties that run them. Their peoples are not the adversary. The Chinese people are the Party\'s first victims. Ancestry is not loyalty.'),
}
NOTICE = {
 'game': 'TDW game, version 3. Upload and replace everything in /game/ (index.html, css/, js/, assets/).\nThe engine now supports several factions per operation, legitimacy and leaders. The 1784 to 2051 catalog plays as before.\nResult codes and replay verification (js/record.js) are kept. Codes made by the earlier build still verify.\nSaved games from the earlier build continue.\n',
 '1931': 'TDW 1931 to 1949. Upload everything to its own folder, for example /1931/ (index.html, css/, js/, assets/).\nIt keeps its own saved progress, separate from /game/.\n',
 '2026': 'TDW 2026. Upload everything to its own folder, for example /2026/ (index.html, css/, js/, assets/).\nIt keeps its own saved progress, separate from the other builds.\nTwelve operations, one for each domain. Every dimension and every one of the thirty-six stratagems appears. See SOURCING_2026.md for the claim list to check.\n',
 '2030': 'TDW 2030. Upload everything to its own folder, for example /2030/ (index.html, css/, js/, assets/).\nIt keeps its own saved progress, separate from /game/.\n',
}
for name, v in V.items():
    d = f'{root}/out/pkg/{name}'
    shutil.rmtree(d, ignore_errors=True)
    for s in ('js','css','assets'): os.makedirs(f'{d}/{s}')
    h = orig
    if v['desc']:
        h = h.replace('<title>TDW Strategic Game</title>', f'<title>{v["title"]}</title>', 1)
        h = re.sub(r'(<meta name="description" content=")[^"]*', lambda m: m.group(1)+v['desc'], h, 1)
        h = h.replace('<p>The actor is the Party. The Chinese people are its first victims. Ancestry is not loyalty.</p>', f'<p>{v["foot1"]}</p>', 1)
    h = h.replace('href="css/style.css"', 'href="css/style.css?v=3"').replace("'assets/content.json'", "'assets/content.json?v=3'").replace("g.src='js/record.js'", "g.src='js/record.js?v=3'").replace("h.src='js/game.js'", "h.src='js/game.js?v=3'")
    assert h.count('?v=3') == 4, h.count('?v=3')
    open(f'{d}/index.html','w').write(h)
    shutil.copy(f'{root}/out/game.js', f'{d}/js/game.js')
    shutil.copy(f'{root}/out/record.js', f'{d}/js/record.js')
    open(f'{d}/NOTICE.txt','w').write(NOTICE[name])
    shutil.copy(f'{root}/parts/style.css', f'{d}/css/style.css')
    shutil.copy(f'{root}/content/{v["json"]}.json', f'{d}/assets/content.json')
print('ok')
