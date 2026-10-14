# Changelog, 14 October 2026 (second update), all four builds

Two changes. Tier 7 reaches the other three builds, and a second batch of evidence comes through the importer into a third band operation. Saved progress and result codes from the earlier builds stay valid. No storage key changed.

## Tier 7 on the other builds

- The base game, the 1931 build and the 2030 build take the v8 bundle. Every operation offers T1 to T7 in free play, the operations list filters by Tier 7, and result codes and challenge links accept Tier 7.
- Tiers 1 to 6 play exactly as before, checked game by game against the earlier engine in all four content sets.
- The campaign arcs still climb from Tier 1 to Tier 6, and the daily stays at Tier 3.
- Cache keys moved to `?v=4` for the base game, `?v=5` for 1931 and `?v=4` for 2030. `NOTICE.txt` names the change.
- The root `index.html` says seven tiers on the base game card.
- The 1931 build keeps E011 and the holdings rule. The 2030 and base game builds show no Reach, Holdings or Forecast panel, because their content lists none.

## New operation in the 2026 build

- **W019 The Lab.** Lever Cultural. Dimension Gradient. Tier 7, asymmetry band. Signature S17, S14 and S10. Three closed moves, two priced moves and five lawful moves. `handScale` 0.70, and the best scripted line wins 1.6 percent.
- W017 and W018 are unchanged. A test compares them with the shipped file.
- Cache keys moved from `?v=8` to `?v=9`. `NOTICE.txt` names the change. The `copy` text and the root `index.html` say nineteen operations.

## Evidence pipeline

- `promote_drafts.py` is new. It promotes clean drafts into cards with the next free id, refuses a draft with problems and changes no earlier card.
- `import_notes.py` now carries five more fields. They record the side and the act. They also record the actor, the source of the claim and a check flag. `build_evidence.py` checks that each source of a claim is an existing candidate.
- The second batch is 12 cards, EV-021 to EV-032, from `band/batches/batch2_notes.md`. EVIDENCE_INDEX.md lists all 31 cards.
- SOURCING_2026.md has 21 new rows for W019. One row records the sixteen-year mismatch.

## What did not change

- Every earlier operation, the arcs and the daily.
- W017 and W018, and so every result code made on them.

## Checks run

- 3 new tests in `test/reach.test.js` and every earlier test. 320 earlier result codes verify, and so do 148 original-engine codes.
- Browser run on all four builds at 1280 and 390 pixels with no console errors and no horizontal overflow.
