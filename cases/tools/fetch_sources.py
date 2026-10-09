#!/usr/bin/env python3
"""Fetch web pages and report what they say. Built to run on a GitHub Actions
runner, which has the open internet that a locked-down sandbox does not.

    python3 -I tools/fetch_sources.py REQUESTS.json [--out report.json]

REQUESTS.json:
  {"from_cases": true,                      # also check every [label](url) in data/*.json
   "requests": [{"id": "F001", "url": "https://...", "terms": ["69 percent", "August 2026"], "note": "...",
                 "grep": ["Trump", "$14"],   # optional: up to 3 wide snippets per term, found anywhere on the page
                 "excerpt": 800,             # optional: first N characters of the page text
                 "grep_width": 130, "grep_limit": 3,   # optional: snippet size and count
                 "ua": "browser"}]}          # optional: a browser-style User-Agent, for public pages that refuse bots

For each URL the report gives the HTTP status, final URL, page title, and for each
term whether the page text contains it, with a snippet. "terms_found" is a coverage
signal, not a verdict: a human or a reviewer decides whether the page supports the claim.
Pages are treated as untrusted data; nothing in them is executed or followed.

To reuse in another project: copy this file and fetch-sources.yml, and write a
REQUESTS.json. The `from_cases` part is optional and imports this repo's helpers lazily.
"""
import html, ipaddress, json, os, re, socket, sys, time, urllib.error, urllib.parse, urllib.request

UA = 'Mozilla/5.0 (compatible; source-check/1.0; +https://github.com)'
BROWSER_UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
MAX_BYTES = 3_000_000
MAX_PDF_BYTES = 30_000_000
MAX_PDF_PAGES = 120
SKIP_TERMS = {'The', 'This', 'That', 'These', 'Its', 'Their', 'Party', 'Chinese', 'American', 'United', 'States', 'Taiwan', 'China'}


def safe_host(url):
    u = urllib.parse.urlparse(url)
    if u.scheme != 'https' or not u.hostname:
        return 'not an https URL'
    try:
        for fam, _, _, _, addr in socket.getaddrinfo(u.hostname, 443):
            ip = ipaddress.ip_address(addr[0])
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
                return 'resolves to a private address'
    except socket.gaierror:
        return 'DNS failure'
    return None


def pdf_text(raw):
    """(text, error) for the first pages of a PDF. Error is '' on success."""
    try:
        import io
        from pypdf import PdfReader
        r = PdfReader(io.BytesIO(raw))
        if r.is_encrypted:
            r.decrypt('')
        pages = r.pages[:MAX_PDF_PAGES]
        t = re.sub(r'\s+', ' ', ' '.join((p.extract_text() or '') for p in pages)).strip()[:900_000]
        return t, ('' if t else f'no text layer in first {len(pages)} pages (scanned?)')
    except Exception as e:
        return '', f'{type(e).__name__}: {e}'[:200]


def text_of(raw, ctype):
    if 'pdf' in ctype:
        text, err = pdf_text(raw)
        text_of.pdf_error = err
        return text
    if 'html' not in ctype and 'xml' not in ctype and 'text' not in ctype and 'json' not in ctype:
        return ''
    s = raw.decode('utf-8', 'replace')
    s = re.sub(r'(?is)<(script|style|noscript|svg)\b.*?</\1>', ' ', s)
    s = re.sub(r'(?s)<[^>]+>', ' ', s)
    return re.sub(r'\s+', ' ', html.unescape(s)).strip()


def variants(term):
    t = term.lower()
    out = {t, t.replace(',', ''), t.replace(' percent', '%'), t.replace('%', ' percent')}
    return out


def check_terms(text, terms):
    low = text.lower()
    flat = re.sub(r'(?<=\d),(?=\d)', '', low)          # 277,398 matches 277398 and the reverse
    res = {}
    for term in terms:
        hit = next((v for v in variants(term) if v and (v in low or v in flat)), None)
        if hit:
            src = low if hit in low else flat
            i = src.index(hit)
            res[term] = text[max(0, i - 90): i + len(hit) + 90] if src is low else '(found after removing digit commas)'
        else:
            res[term] = None
    return res


def grep_snippets(text, term, width=130, limit=3):
    """Up to `limit` snippets around `term`. Numbers match with or without digit commas."""
    out = []
    for src, plain in ((text, True), (re.sub(r'(?<=\d),(?=\d)', '', text), False)):
        low = src.lower()
        for v in variants(term):
            i = low.find(v)
            while i != -1 and len(out) < limit:
                out.append(src[max(0, i - width): i + len(v) + width])
                i = low.find(v, i + len(v) + width)
        if out:
            break
    return out[:limit]


def fetch(url, terms, grep=(), excerpt=0, ua=None, grep_width=130, grep_limit=3):
    if url.startswith('http://'):
        url = 'https://' + url[len('http://'):]            # we only fetch over https
    out = {'url': url, 'status': None, 'final_url': None, 'title': None, 'bytes': 0, 'error': None}
    bad = safe_host(url)
    if bad:
        out['error'] = bad
        return out
    for attempt in (1, 2):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': BROWSER_UA if ua == 'browser' else UA, 'Accept': 'text/html,application/xhtml+xml,*/*;q=0.5'})
            with urllib.request.urlopen(req, timeout=20) as r:
                ctype = r.headers.get('Content-Type', '')
                cap = MAX_PDF_BYTES if ('pdf' in ctype or url.lower().endswith('.pdf')) else MAX_BYTES
                deadline, chunks, got = time.time() + 45, [], 0     # a slow trickle must not hold the job
                while got < cap and time.time() < deadline:
                    chunk = r.read(65536)
                    if not chunk:
                        break
                    chunks.append(chunk)
                    got += len(chunk)
                raw = b''.join(chunks)
                out.update(status=r.status, final_url=r.geturl(), bytes=len(raw), content_type=ctype)
                if time.time() >= deadline and got < cap:
                    out['note'] = 'read stopped at the 45 second limit; page may be cut short'
            text_of.pdf_error = ''
            text = text_of(raw, ctype)
            if text_of.pdf_error:
                out['pdf_error'] = text_of.pdf_error
            m = re.search(r'(?is)<title[^>]*>(.*?)</title>', raw.decode('utf-8', 'replace'))
            out['title'] = re.sub(r'\s+', ' ', html.unescape(m.group(1))).strip()[:160] if m else None
            if terms:
                out['terms'] = check_terms(text, terms)
                out['terms_found'] = f"{sum(1 for v in out['terms'].values() if v)}/{len(terms)}"
            if grep:
                out['grep'] = {g: grep_snippets(text, g, grep_width, grep_limit) for g in grep}
            if excerpt:
                out['excerpt'] = text[:min(int(excerpt), 3000)]
            if not text:
                out['note'] = 'no extractable text (PDF, image or empty); only the status is checked'
            return out
        except urllib.error.HTTPError as e:
            out.update(status=e.code, error=f'HTTP {e.code}')
            if e.code < 500:
                return out
        except Exception as e:  # timeouts, TLS, resets
            out['error'] = f'{type(e).__name__}: {e}'[:200]
        time.sleep(2)
    return out


def terms_for(sentence, label):
    s = re.sub(r'\[([^\]]+)\]\([^)]*\)', ' ', sentence)
    nums = re.findall(r'\$?\d[\d,\.]*(?: (?:percent|billion|million|trillion))?', s)
    names = [w for w in re.findall(r"\b[A-Z][A-Za-z\-]{3,}\b", s) if w not in SKIP_TERMS]
    seen, out = set(), []
    for t in nums + names:
        t = t.strip(' .,')
        if t and t.lower() not in seen and len(t) > 2:
            seen.add(t.lower())
            out.append(t)
    return out[:8]


def requests_from_cases():
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from tdwcases import case_files, load_json, LINK
    from claims import sentences
    reqs = []
    for p in case_files():
        c = load_json(p)
        for s in sentences(c['text']['record'])[::2]:
            for m in LINK.finditer(s):
                reqs.append({'id': c['id'], 'url': m.group(2), 'terms': terms_for(s, m.group(1)),
                             'note': s[:200]})
    return reqs


def main():
    args = sys.argv[1:]
    spec = json.load(open(args[0], encoding='utf-8'))
    reqs = list(spec.get('requests', []))
    if spec.get('from_cases'):
        reqs += requests_from_cases()
    out_path = args[args.index('--out') + 1] if '--out' in args else 'fetch-report.json'
    report = []
    print('=== FETCH REPORT BEGIN ===', flush=True)
    for i, r in enumerate(reqs):
        res = fetch(r['url'], r.get('terms', []), r.get('grep', ()), r.get('excerpt', 0), r.get('ua'), r.get('grep_width', 130), r.get('grep_limit', 3))
        res.update(id=r.get('id'), claim=r.get('note'))
        report.append(res)
        print('FETCH ' + json.dumps(res, ensure_ascii=False), flush=True)
        time.sleep(1)
    ok = sum(1 for r in report if r['status'] == 200)
    print(f'=== FETCH REPORT END: {len(report)} urls, {ok} returned 200, {sum(1 for r in report if r["error"])} errors ===', flush=True)
    json.dump(report, open(out_path, 'w'), indent=1, ensure_ascii=False)


if __name__ == '__main__':
    main()
