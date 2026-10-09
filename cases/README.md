# TDW cases: the 120 historical cases and 100 future scenarios

One JSON file per case in `data/`. The game's `content.json` is a build
product of these files; do not edit it by hand.

| Path | Holds |
|---|---|
| `data/C001.json` to `C120.json` | Historical cases (`kind: catalog`) |
| `data/F001.json` to `F100.json` | Future scenarios (`kind: futures`) |
| `data/arcs.json` | The 14 story arcs, as ordered lists of case ids |
| `data/meta.json` | Daily-puzzle epoch and the import record |
| `schema/case.schema.json` | JSON Schema for a case (works with ajv or check-jsonschema) |
| `schema/taxonomy.json`, `stratagems.json` | The fixed lists: 12 domains, 10 dimensions, 36 stratagems, stages, gap layers, tiers |

## A case

```json
{
  "id": "C001", "kind": "catalog", "title": "The Gate at Canton",
  "tier": 1, "dimension": "Topology", "stage": "Defense",
  "stratagems": ["S22"], "theater": ["Economic", "Legal", "Association"], "spine": "Economic",
  "opponent": "The opium traders",
  "when": {"start": {"year": 1784, "month": null}, "end": {"year": 1784, "month": null}},
  "gap": "Business",
  "text": {"brief": "…", "record": "…", "reading": "…", "gapText": "…", "fix": "…"},
  "status": "unsourced"
}
```

Futures add `world`, `horizon` (1 to 3), `arc` and `text.coreEvent`, and the
schema rejects those fields on a catalog case. `label` and `fullTitle` are
derived from `title` and `when`; set them only to override.

**The four text fields keep the book's discipline.**
`record` is what is documented, with a `[label](https://…)` link on every
checkable claim, or a `[NEEDED: source]` tag. `reading` is what the book argues
and names the stratagem. Never write a claim in `record` that you cannot link.

## Status

| Status | Meaning | The validator requires |
|---|---|---|
| `unsourced` | No source link in the text | none |
| `sourced` | Links exist; nobody has read them against the claims | at least one link |
| `verified` | A named person checked each claim against its source | `verifiedBy`, `verifiedOn` |

Today: 198 cases are `unsourced`, 22 are `sourced`, none are `verified`. Moving
cases down that list is the work this structure exists to track.

## Commands (Python 3, standard library only)

```bash
python3 -I tools/validate.py --report   # schema + cross-checks + coverage report
python3 -I tools/validate.py --strict   # warnings fail too (use at launch)
python3 -I tools/build.py               # write build/content.json for the game
python3 -I tools/build.py --sources     # also write build/sources.json: every URL and the cases citing it
python3 -I tools/build.py --verify PATH # rebuild and compare to an existing content.json

```

`build.py --verify` against the original game `content.json` passes: the 220
files rebuild it exactly, so the game is unchanged by this move.

## Sourcing pass

```bash
python3 -I tools/claims.py export --kind futures --status unsourced > review/futures-unsourced.csv
# fill verdict (supported | partial | unsupported | contradicted), add_label, add_url
python3 -I tools/claims.py apply review/futures-unsourced.csv --dry-run
```

`review/futures-unsourced.csv` has one row per sentence of the 78 unsourced
future scenarios (239 sentences, 194 of them checkable). `apply` links supported
claims, tags unsupported ones `[NEEDED: source]`, never sets `verified`, and
refuses to run if a sentence changed since export.

## Adding or changing a case

1. Copy a neighbour in `data/`, give it the next id (`C121`, `F101`), edit it.
2. If it belongs to an arc, add its id to that arc's `nodes` in `arcs.json`.
   A future's `arc` field must name an arc that lists it.
3. Run `validate.py`. Then `build.py` and copy `build/content.json` to
   `game/assets/content.json`.

## Checks the validator makes beyond the schema

Spine inside the theater; stratagem codes exist; end not before start; futures
start in 2026 or later and catalog cases in 2026 or earlier; ids match file
names and run contiguously; every arc node exists; each future sits in its own
arc; `status` matches the evidence; the superseded phrases stay out; and a
warning when "China" is the grammatical actor, because the actor is the Party.
