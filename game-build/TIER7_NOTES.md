# Notes, Tier 7, 14 October 2026

Tier 7 is a real difficulty tier. It sits above Tier 6, which is the hardest tier on the historical record. The game tests whether a rule can be written down and played. A tier proves nothing about the world.

## What Tier 7 changes

Tiers 1 to 6 play exactly as before. The test `test/tier7.test.js` runs every sampled operation in all four content sets at tiers 1, 3, 5 and 6 against the engine of the previous update. The final state matches game by game.

Tier 7 differs from Tier 6 in four ways.

- The clock is one point of leverage shorter. The operation is consumed at 17 and not 18.
- The opponent's base hand is three cards, as at Tier 6, but a fourth arrives from turn 3 and not from turn 4.
- The hand grows at lifecycle stage 1 as well as stage 2.
- Every domain in play opens at 2 pressure. At Tier 6 only the lever opens at 2 and the rest open at 1.

## Where it shows

- The tier selector on every operation offers T1 to T7. The record sets the default.
- The operations list can filter by Tier 7. The report and the result grid show Tier 7 as any other tier.
- A result code reads `TDW1~W006~7~...`. Codes with a tier from 1 to 6 are unchanged, and a code that names Tier 8 is refused. A challenge link accepts Tier 7.
- Score rises by 100 for each tier, so a Tier 7 win scores 100 more than a Tier 6 win of the same line.
- The campaign arcs still climb from Tier 1 to Tier 6. The daily stays at Tier 3. Quick play stays capped by level. Tier 7 is chosen in free play.

## What the tuner bot wins at Tier 7

The tuner bot is a simple scripted player. Each figure is the share of 400 games it won on the 2026 operations. The tier 6 column is the same bot at Tier 6 for comparison.

| Operation | Tier 6 | Tier 7 |
|---|---|---|
| W001 | 10% | 1% |
| W002 | 18% | 2% |
| W003 | 13% | 2% |
| W004 | 23% | 1% |
| W005 | 20% | 1% |
| W006 | 24% | 3% |
| W007 | 14% | 5% |
| W008 | 15% | 2% |
| W009 | 11% | 0% |
| W010 | 16% | 2% |
| W011 | 17% | 1% |
| W012 | 20% | 1% |
| W013 | 13% | 2% |
| W014 | 20% | 2% |
| W015 | 17% | 3% |
| W016 | 12% | 2% |

Tier 7 averages about 2 percent for this bot. The band operations W017 and W018 add permits on top of it and are tuned to about 1 to 3 percent for their best line. See BALANCE_W017_W018.md.

## Not changed

- The 1931, 2030 and base game builds keep the earlier bundle and offer six tiers.
- The tutorial, the daily and every earlier result code.
- The `tier` field of every operation on the record. Only W017 and W018 are set to 7.

## Checks run

- 7 new tests in `test/tier7.test.js`. They cover these points.
  - Tiers 1 to 6 play as before.
  - The new settings and the clamp at 7.
  - A result code and a challenge link at Tier 7.
  - The ordering of Tier 6 and Tier 7.
- All earlier tests pass. The 320 earlier result codes and the 148 original-engine codes verify.
- Browser run at 1280 and 390 pixels with no console errors and no horizontal overflow.
