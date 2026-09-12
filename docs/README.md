# totaldomainwar.com

Static launch site for the book *Total Domain War*. Two HTML files, no build step, no dependencies.

## Files

| File | Purpose |
|---|---|
| `index.html` | Single-page launch site |
| `prologue.html` | Opening chapter, reading layout |
| `CLAUDE.md` | Project constraints. Read before editing. |
| `check.sh` | Pre-deploy guard |

## Local preview

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Before every deploy

```bash
./check.sh
```

Verifies the twelve domains are present in the correct order, that superseded
architecture has not reappeared, and that the build stamp exists. Exits non-zero
on failure, so it can gate a deploy.

## Deploy

Upload both HTML files to the site root. Then bump the build stamp in both
footers and verify **both hostnames**:

```bash
for h in https://totaldomainwar.com https://www.totaldomainwar.com; do
  echo "== $h"
  curl -s "$h/?cb=$(date +%s)" | grep -o "build [0-9-]*"
  curl -s -o /dev/null -w "  prologue: %{http_code}\n" "$h/prologue.html"
done
```

Both must report the same build stamp. If they differ, see the www/apex note in
`CLAUDE.md` — the two hostnames have served different content before.

## Reverting to the dark palette

Seven variables in `:root` plus three rules that assume a light ground
(`.box.empty`, `a.cta`, `a.cta:hover`). Details in `CLAUDE.md`. Changing
`--ink` alone will leave panels and hairlines mismatched.
