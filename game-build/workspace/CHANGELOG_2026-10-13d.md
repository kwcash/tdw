# Changelog, 13 October 2026 (fourth update), 2026 build

Update to the 2026 build and its landing card. It adds the asymmetry band, two operations in which the rival may take acts that the player's side may not. Saved progress and result codes from the earlier build stay valid. The storage key `tdw-2026-1` is unchanged.

## New operations

- **W017 The Reach.** Lever Legal. Dimension Agency. Tier 6, asymmetry band. Signature S3, S8 and S35. Eight reach moves.
- **W018 The Wallet.** Lever Financial. Dimension Asymmetry. Tier 6, asymmetry band. Signature S22, S33 and S16. Six reach moves.
- **Balance.** Tuned with `handScale` only, 0.86 and 0.97. The best scripted line wins 1.6 and 1.4 percent. See BALANCE_W017_W018.md.
- **Placement.** Neither is in an arc or the daily. The tier selector shows Tier 6 only.

## New rules in the engine

- **Reach moves and permits.** An operation may list reach moves. Each faction holds a permit for each one, free, priced or barred. A barred move is listed but cannot be used. A priced move works, costs legitimacy and counts as an act against the actor's own position.
- **Mirror tags.** A scripted act may name the move it mirrors, and the report counts how often the rival used each closed act.
- **Two new effects.** `ease` and `unslope` remove pressure and slope.
- **Result codes.** A reach move is written `r<move>` in the action list. Codes of operations without reach moves are byte for byte what they were.
- **Interface.** A Reach panel appears only in an operation that lists reach moves, with the evidence behind each permit. The report adds "What your rules closed". The operations list and the operation page carry an asymmetry band chip and a note.

## Evidence pipeline

- `evidence/extract_candidates.py`, `import_notes.py`, `build_evidence.py` and `cards.json`. 129 candidates, 19 reviewed cards. See ASYMMETRY_NOTES.md.
- `band/build_band.py` builds the operations and refuses a move whose cards do not fit its permit.

## Content file

- `content.json` gains two operations. The `copy` text says eighteen operations. Nothing else changed. `test/freeze.js` passes against the earlier build with no changed field.
- `SOURCING_2026.md` has 24 new rows and two new table rows. Its rule about the ledger text now says the text appears on the Forecast page.

## Pages and notes

- 2026 `index.html`: cache keys moved from `?v=6` to `?v=7`. `NOTICE.txt` names the change.
- Root `index.html`: the 2026 card says eighteen operations. Nothing else on the page changed.

## What did not change

- Every earlier operation, the arcs and the daily.
- The 1931, 2030 and base game builds. They hold no reach moves, so they show nothing new.

## Checks run

- 15 new tests in `test/reach.test.js` and every earlier test.
- 320 earlier result codes verify, and so do 148 original-engine codes.
- Browser run at 1280 and 390 pixels with no console errors and no horizontal overflow.
