# Changelog, 14 October 2026, 2026 build

Update to the 2026 build. It adds a real Tier 7 and moves the asymmetry band onto it. Saved progress and result codes from the earlier build stay valid. The storage key `tdw-2026-1` is unchanged.

## New

- **Tier 7.** A difficulty tier above the record's Tier 6. A shorter clock, a larger hand from turn 3 and every domain in play opening at 2 pressure. See TIER7_NOTES.md.
- **Tier selector.** Every operation offers T1 to T7 in free play. The operations list filters by Tier 7.
- **Result codes and challenge links.** Both accept Tier 7. A Tier 8 code is refused.

## Changed

- **W017 and W018** are set to Tier 7 and retuned. `handScale` is 0.68 and 0.82. The best scripted line wins 1.1 and 2.2 percent. The tier selector no longer locks them. See BALANCE_W017_W018.md.
- The band note on the operation page says a scripted player wins rarely at Tier 7.
- The report line that suggests raising the tier says the line held at the top tier when the run was already at Tier 7.

## What did not change

- Tiers 1 to 6. A test replays sampled operations in all four content sets at four tiers against the earlier engine, and every final state matches.
- Every earlier operation, the arcs and the daily.
- The 1931, 2030 and base game builds.

## Pages and notes

- 2026 `index.html`: cache keys moved from `?v=7` to `?v=8`. `NOTICE.txt` names the change.
- ASYMMETRY_NOTES.md no longer says Tier 7 was not built.

## Checks run

- 7 new tests in `test/tier7.test.js` and every earlier test.
- 320 earlier result codes verify, and so do 148 original-engine codes.
- Browser run at 1280 and 390 pixels with no console errors and no horizontal overflow.
