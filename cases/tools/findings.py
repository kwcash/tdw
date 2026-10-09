#!/usr/bin/env python3
"""Write a sourcing-findings report from review/decisions-log.jsonl and the case files.

    python3 -I tools/findings.py [--kind futures|catalog] [--out PATH]

--kind futures (default) writes review/futures-sourcing-findings.md for F001..F100.
--kind catalog writes review/catalog-sourcing-findings.md for C001..C120.

The log is append-only; the latest decision for each sentence wins. The report lists what is
sourced, what a link only partly supports, what was checked and not settled, what contradicts
the text, and which checkable sentences nobody has tried yet. It never changes a case.
"""
import collections, datetime, json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # -I drops the script dir
from tdwcases import DATA, load_json, case_files, LINK
import claims

REVIEW = DATA.parent / 'review'
SECONDARY = re.compile(r"secondary|think tank|trade body|company'?s own|company statement|NGO|non-profit|nonprofit|news agency|\(CNA\)|law firm|university research|preprint|media only|encyclop", re.I)

KINDS = {
    'futures': dict(prefix='F', title='Futures', file='futures-sourcing-findings.md'),
    'catalog': dict(prefix='C', title='Historical cases', file='catalog-sourcing-findings.md'),
}


def load_log(prefix):
    last = {}
    for ln in open(REVIEW / 'decisions-log.jsonl', encoding='utf-8'):
        if not ln.strip():
            continue
        d = json.loads(ln)
        if d['id'].startswith(prefix):
            last[(d['id'], int(d['idx']))] = d
    return last


def short(s, n=170):
    s = LINK.sub(lambda m: m.group(1), s)
    return s if len(s) <= n else s[:n - 1] + '…'


def main():
    kind = sys.argv[sys.argv.index('--kind') + 1] if '--kind' in sys.argv else 'futures'
    K = KINDS[kind]
    out = REVIEW / K['file']
    if '--out' in sys.argv:
        out = sys.argv[sys.argv.index('--out') + 1]
    last = load_log(K['prefix'])
    cases = {}
    for p in case_files():
        c = load_json(p)
        if c['id'].startswith(K['prefix']):
            cases[c['id']] = (c, claims.sentences(c['text']['record'])[0::2])
    total = sum(len(s) for _, s in cases.values())
    linked = sum(1 for _, ss in cases.values() for s in ss if LINK.search(s))
    with_link = sum(1 for _, ss in cases.values() if any(LINK.search(s) for s in ss))
    verified = [cid for cid, (c, _) in cases.items() if c['status'] == 'verified']
    by_v = collections.Counter(d['verdict'] for d in last.values())
    open_sent = [(cid, i, s) for cid, (c, ss) in cases.items() for i, s in enumerate(ss)
                 if not LINK.search(s) and claims.CHECKABLE.search(s)]
    tried = {k for k, d in last.items() if d['verdict'] in ('unresolved', 'contradicted')}
    vendor = sorted(f'{cid}[{i}]' for (cid, i), d in last.items() if 'anthropic' in (str(d.get('label', '')) + ' ' + str(d.get('url', ''))).lower())

    L = []
    w = L.append
    w(f'# {K["title"]} sourcing pass: findings')
    w('')
    w(f'Generated {datetime.date.today().isoformat()} by `tools/findings.py --kind {kind}` from `decisions-log.jsonl`. Do not edit by hand; rerun the script.')
    w('')
    w('## Read this first')
    w('')
    w('- **Nothing here is `verified`.** `sourced` means a link was attached after a fetch tool read the page text for the key terms. It does not mean a person read the page against the sentence. `verified` needs a named person and a date, and the count is **%d**.' % len(verified))
    w('- Government, court, statute, treaty, archive and official-body pages came first. Where only media, a think tank, a company, an NGO or a reference work had the fact, the link label says so and this file flags it. Primary sources have a perspective too: a PRC ministry page states PRC policy, a White House fact sheet states the US account, and a wartime document records what its author believed.')
    w('- Pages were read by a script on a GitHub Actions runner, which sees the text only. Scanned images, charts, tables rendered as images, and pages that block the runner were not read. Those cases are listed under "Checked, not settled".')
    if vendor:
        w('- Anthropic, the vendor of the assistant that did this pass, authored some of the sources (' + ', '.join(vendor) + '). Each is labeled as the company\'s own statement.')
    w('')
    w('## Counts')
    w('')
    w(f'- {K["title"]}: {len(cases)} cases, {total} record sentences, {linked} now carry a link; {with_link} cases have at least one link.')
    w('- Decisions logged (latest per sentence): ' + (', '.join(f'{v} {n}' for v, n in sorted(by_v.items())) or 'none yet') + '.')
    w(f'- Checkable sentences with no link and no decision on file: {len([1 for cid, i, s in open_sent if (cid, i) not in last])}.')
    w('')

    def section(title, verdicts, note=''):
        rows = sorted((k, d) for k, d in last.items() if d['verdict'] in verdicts)
        w(f'## {title} ({len(rows)})')
        w('')
        if note:
            w(note)
            w('')
        for (cid, i), d in rows:
            sent = d.get('sentence') or cases[cid][1][i]
            w(f'- **{cid}[{i}]** {short(sent)}  ')
            w(f'  {d.get("notes", "").strip()}')
        w('')

    section('Contradicted by the source', {'contradicted'},
            'The page says something different from the sentence. The text was left unchanged. The author decides.')
    section('Linked, but the link covers only part of the sentence', {'partial'},
            'The note says what the page supports and what is still open.')
    section('Checked, not settled', {'unresolved'},
            'A page was tried (blocked, empty, wrong content, or the figure is in a chart or a scan). No link was added. Hosts that refused the runner: ftc.gov, hhs.gov, usda.gov, gao.gov, pnas.org, cbo.gov, spaceforce.mil, war.gov, congress.gov, news.uscg.mil, aps.org, mac.gov.tw, swift.com, sec.gov, spacenews.com, and justice.gov pages that return empty text. TLS failures (not bypassed): npc.gov.cn, english.scio.gov.cn, kinmen.gov.tw, eng.mod.gov.cn. Archive.org copies were rate limited (HTTP 429).')

    sec = sorted((k, d) for k, d in last.items() if d['verdict'] in ('supported', 'partial') and SECONDARY.search(d.get('notes', '') + ' ' + str(d.get('label', ''))))
    w(f'## Links that are not government or court pages ({len(sec)})')
    w('')
    w('Each entry has at least one link that is not a government or court page: a company, NGO, think tank, news agency, preprint, translator, reference work or archive. Where a government page would be better, say so in review; the label on the link says what the source is.')
    w('')
    for (cid, i), d in sec:
        lab = d['label'] if isinstance(d['label'], str) else '; '.join(d['label'])
        w(f'- **{cid}[{i}]** {lab}')
    w('')

    untried = [(cid, i, s) for cid, i, s in open_sent if (cid, i) not in tried]
    if kind == 'futures':
        w('## Flags raised before the decision log started')
        w('')
        w('- `futures-link-check.md`: the 35 links the cases already carried, checked against their claims (7 supported, 8 partial, 2 not on the page, the rest unchecked or blocked). Includes F001 (the Trump-visit and September-APEC claims sit on links that cannot support them), F003 (the PLA 2027 goal is not in the communique) and F012 (the Open Doors link was a landing page; replaced with the fast-facts PDF).')
        w('- `book-vs-cases.md`: where a case and the book disagree. F005: Appendix H note 13 says "late February" and AP/NBC date the event January 29, 2026.')
        w('')
    w(f'## Checkable sentences nobody has tried yet ({len(untried)})')
    w('')
    w(f'{len(open_sent)} checkable sentences still have no link; {len(open_sent) - len(untried)} of them were tried and are listed above as unresolved. The rest carry a date, number or named act and have not been looked at.')
    w('')
    for cid, i, s in untried:
        w(f'- **{cid}[{i}]** {short(s, 200)}')
    w('')
    open(out, 'w', encoding='utf-8').write('\n'.join(L) + '\n')
    print(f'wrote {out}: {total} sentences, {linked} linked, {len(open_sent)} checkable unlinked')


main()
