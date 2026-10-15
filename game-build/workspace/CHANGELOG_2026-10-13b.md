# Changelog, 13 October 2026 (second update), 1931 build

Update to the 1931 build and its landing card. It adds one operation and the first rule where holding ground has a cost. Saved progress and result codes from the earlier 1931 build stay valid. The storage key `tdw-1931-1` is unchanged.

## New operation

- **E011 The Manchurian Trap.** Lever Psychological (the operation's spine). Tier 4. Factions KMT and CCP. Signature S15, S11 and S36. Manchuria costs 2 and denies 1, so it is consuming. The south costs 1 and denies 2. Giving up Manchuria costs 2 legitimacy. The operation sits in free play, outside every arc and the daily.
- **Balance.** Tuned with `handScale` 0.82. See BALANCE_E011.md. A player who gives up Manchuria on turn 1 wins 40.0 percent over 3,000 games, and one who never gives it up wins 5.1 percent.

## New rules in the engine

- **Holdings.** An operation may list holdings. Each live holding costs its holder every turn, shields first and pressure after. It also denies the rival part of its gain from held ground. A holding is consuming when its cost is higher than its denial. A player can give one up for one action. Giving one up may raise the cost of another holding (`couples`) and a live one may raise the cost of another (`strains`). Neither is used by E011 yet.
- **Acts against one's own position.** Five types are typed by structure and never by outcome. The report lists them for both sides with the turns. Three existing items are tagged, the E009 turn 3 effect, the leader `ching_kuo` and the leader `kwantung_staff`. The tags change no mechanic.
- **Result codes.** A give-up is written `y<holding>` in the action list. Codes of operations without holdings are byte for byte what they were.
- **Interface.** A Holdings panel appears only in an operation that lists holdings, with a Give up sheet. The report shows an "Acts against its own position" block when any side has one, and "What to change" names a give-up and what holding it had cost.

## What did not change

- The daily pool, the arcs and the arc order did not change. Neither did any earlier operation's fields or win rates.
- Operations with no holdings carry no holding state, option or view field.
- The 2026 build, the 2030 build and the base game keep their earlier bundle and behave the same. Rebuild them with `mkpkg.py` to give them the v5 bundle. Their content does not use holdings.

## Pages and notes

- 1931 `index.html`: cache keys moved from `?v=3` to `?v=4`. `NOTICE.txt` names the change.
- Root `index.html`: the 1931 card chip reads 11 operations. Nothing else on the page changed.
- NOTES_E011.md lists the claims to check and the numbers that are the game's readings.
- `patch-v5.py` turns the v4 bundle into the current one. `content/era1_v5.py` adds E011 and the tags.

## Checks run

- 12 new tests in `test/holdings.test.js`.
- 320 earlier result codes verify identically, and 148 original-engine codes verify.
- All four content files validate. `test/freeze.js` passes, with report-only tags ignored.
- Browser run on the 1931 build at 1280 and 390 pixels with no console errors and no horizontal overflow, an old save loaded, and an old code verified.
