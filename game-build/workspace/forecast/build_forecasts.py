#!/usr/bin/env python3 -I
"""Builds assets/forecasts.json from the registered ledger snapshot. Usage: build_forecasts.py ledger.csv out_dir
The registered text is copied byte for byte and never edited. A row is left out only for a stated reason (EXCLUDED)."""
import csv, hashlib, json, re, sys, pathlib

ledger, out = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])

# Rows the game does not carry, with the reason. The registered ledger itself is not changed.
EXCLUDED = {
    'R6': 'names a Taiwanese party and a local election result', 'TS2': 'names a Taiwanese party and a presidential election result',
    'TS4': 'rests on a Taiwanese opinion poll', 'TS7': 'conditional on a Taiwanese party winning', 'C11-F2': 'a judgment about the model, not an event',
    'FW1': 'a disease event; the game covers biology as governance only', 'FW2': 'a disease event; the game covers biology as governance only',
    'RW-P1': 'a disease event; the game covers biology as governance only', 'RW-P2': 'a disease event; the game covers biology as governance only',
    'IR4': 'turns on one named person staying alive and in office during a war',
}
# Phase reviews make no probability claim, so there is nothing to forecast.
PHASE = re.compile(r'^P-C')

RULES = {  # counting rules from the registered records, copied unchanged
    'TC1': ('T1 records/Rev30_technology_T1_record.md', "Counting rules: TC1 holds if, on 11 Nov 2026, the October 2025 measures (MOFCOM announcements Nos. 61 and 62 of 2025 and related‡) are not in force for exports to the US, by extension, replacement or withdrawal. It fails if they resume for US-bound exports on or after 10 Nov 2026. TC2 holds on the first credible report (US government statement, company filing or two major wire services) that such licenses were granted, even if shipments are later blocked by the PRC."),
    'TS8': ('T1 records/Ch11_TaiwanStrait_allies_T1_record.md', 'A transit event = one publicly reported passage of the Taiwan Strait by one or more navy surface ships of a state, confirmed by that state\'s government, Taiwan\'s MND, the PRC\'s MND or Eastern Theater Command, or a major wire service. A combined passage counts once for each state\'s camp tally (US / non-US). Aircraft flights and unreported ("silent") passages do not count.'),
    'RCH1': ('T1 records/Rev29_reach_T1_record.md', 'Counting rules: "daily news programming" = new news content published or broadcast on at least five days a week in the month of December 2027, by the service\'s own staff or contractors. "Funded by its federal grant" = the service\'s grant agreement with USAGM (or a successor agency) is in force in December 2027. OTF receipt is taken from OTF\'s own statements, court filings or USAGM reports; if no source states it by the check date, (c) is scored as holding.'),
    'BL-RU1': ('T1 records/Ch10_RussiaUkraine_baseline_T1_record.md', 'BL-RU1 counts a city captured when ISW or two major wire services report Russian control of its center.'),
    'BL-RU2': ('T1 records/Ch10_RussiaUkraine_baseline_T1_record.md', 'BL-RU2 counts disbursements reported by the European Commission or the Council.'),
    'BL-RU3': ('T1 records/Ch10_RussiaUkraine_baseline_T1_record.md', 'BL-RU3: "recognize de jure" means a signed US statement or instrument recognizing Russian sovereignty; a ceasefire line, a freeze, or de facto administration does not count.'),
    'BL-IR1': ('T1 records/Ch11_IranWar_baseline_T1_record.md', 'BL-IR1 uses EIA, IEA or Kpler monthly estimates (two of three where they differ).'),
    'BL-IR2': ('T1 records/Ch11_IranWar_baseline_T1_record.md', 'BL-IR2 counts acknowledged operations by US ground forces on the mainland (not islands, not special-operations raids reported only by others).'),
    'BL-IR3': ('T1 records/Ch11_IranWar_baseline_T1_record.md', "BL-IR3 counts VOA Persian's published schedule or a USAGM statement; 24-hour programming including repeats counts."),
    'BR1': ('T1 records/BRI_pushback_T1_record.md', "BR1: use the report's own figures for both years (its 2025 baseline as restated in the 2026 report); if the report gives no Latin America and Caribbean total, the item is void."),
    'BR2': ('T1 records/BRI_pushback_T1_record.md', 'BR2: series production as announced by BYD, the plant, or two trade outlets; pilot or trial production does not count.'),
    'BR3': ('T1 records/BRI_pushback_T1_record.md', 'BR3: an official government statement or the expiry of a memorandum confirmed by the government; reports of "freezing" without such a statement do not count.'),
}
RULES['TC2'] = RULES['TC1']
for k in ('TS9', 'TS10'): RULES[k] = RULES['TS8']

rows = list(csv.DictReader(open(ledger, encoding='utf-8')))
by = {}
for r in rows: by.setdefault(r['id'], {})[r['version']] = r
items, skipped = [], {}
for id_, vs in by.items():
    cur = vs[max(vs)]; first = vs[min(vs)]
    if PHASE.match(id_): skipped[id_] = 'phase review, no probability claim'; continue
    if id_ in EXCLUDED: skipped[id_] = EXCLUDED[id_]; continue
    m = re.search(r'analyst p=([01](?:\.\d+)?)', cur['notes'])
    if not m and cur['type'] != 'failure': skipped[id_] = 'no stated probability'; continue   # a failure criterion carries no probability from the book
    ref = re.match(r'p~([01](?:\.\d+)?) true', cur['reference_forecast'])
    if not ref: skipped[id_] = 'no stateable reference'; continue
    assert cur['prediction'] == first['prediction'], id_   # a later version never changes the text
    text = first['prediction']
    it = {
        'id': id_, 'type': cur['type'], 'chapter': cur['chapter'], 'text': text,
        'registered_utc': first['registered_utc'], 'check_by': cur['check_by'],
        'book_p': float(m.group(1)) if m else None, 'book_utc': cur['registered_utc'] if m else None,
        'reference_p': float(ref.group(1)), 'reference_source': cur['reference_source'],
        'sha256': hashlib.sha256(text.encode('utf-8')).hexdigest(),
    }
    if id_ in RULES: it['rules'] = RULES[id_][1]; it['rules_from'] = RULES[id_][0]
    items.append(it)
items.sort(key=lambda x: (x['check_by'], x['id']))
doc = {'schema': 1, 'source': 'T1 records/prediction_ledger.csv, snapshot of 12 October 2026', 'items': items}
out.mkdir(parents=True, exist_ok=True)
(out / 'forecasts.json').write_text(json.dumps(doc, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
res = out / 'forecast-results.json'
if not res.exists():
    res.write_text(json.dumps({'schema': 1, 'note': 'Results as written in the project scoring log. Edit with the owner desk in the game, never by hand.', 'rows': {}}, indent=1) + '\n')
print(len(items), 'forecasts;', len(skipped), 'left out')
for k, v in sorted(skipped.items()): print(' ', k, '-', v)
