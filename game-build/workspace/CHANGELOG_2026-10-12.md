# Changelog, 12 October 2026

Update to the 2026 build and its landing page. Saved progress and result codes from the earlier build stay valid. The storage key `tdw-2026-1` is unchanged.

## Existing operations (text fields only)

- **W001** `record`. Old: "By 2023 the American count had fallen to a handful." New: "By January 2023 the American count had fallen to fewer than five." (GAO-24-105981)
- **W002** `record`. Added three sentences. 9 October: four China Coast Guard ships entered the restricted waters off Kinmen and Taiwan's coast guard expelled them. The Maritime Safety Administration issued no-sail notices for five sea areas for PLA exercises from 12 to 17 October. Taiwan's defense minister assessed that the areas lie off China's coast and that the exercises involve artillery only.
- **W003** `record`. The duty range now reads: "They ran from 7.8 percent for Tesla's Shanghai plant to 35.3 percent for SAIC. BYD paid 17.0 percent." (European Commission schedule)
- **W003** `reading`. The second and third sentences no longer open with "It is". The new text: "The surplus is an enabling condition and not a transfer to any partner. It pays for an industrial base that sanctions lists do not reach."
- **W005** `record`. Added: "In October 2025 the National People's Congress Standing Committee named 25 October Taiwan Restoration Day, the date of Resolution 2758."
- **W011** `record`. Kept every existing sentence. Added three: the May pause of the arms package after the Beijing summit, the late September state visit and the extended trade truce, and both leaders' intent to attend the Shenzhen summit on 18 and 19 November.
- **W007** No text change. The text keeps "In April 2026". The sourcing row now records 24 April 2026 per a copy of the Treasury release and asks for confirmation on treasury.gov.
- **W009** No text change. The text states the 2023 Matsu cuts and gives no cause.
- **Every other field of W001 to W012 and C001 is unchanged.** Every mechanic is frozen. The file `test/freeze.js` lists the frozen fields and checks them.

## New operations

- **W013 The Ballot** (watch, status open, settles 2026-11-29). Lever Information. Dimension Phase. Tier 4. Stage Control. Signature S7, S29 and S20. Not in an arc and not in the daily. The reading opens with "Scenario, not record." The script beats are labeled scenario and fall on turns 3, 6 and 8. A Phase game runs eight turns, so the larger burst sits on turn 8 and not on turn 9.
- **W014 The Special Budget** (record). Lever Financial. Dimension Coherence. Tier 6. Stage Accommodate. Signature S33, S9 and S4. Appended to the end of The Strait. Script beats on turns 3, 5 and 7. The record says "the opposition" and not the party name.
- **Balance.** Both operations are tuned with `handScale` (W013 0.81, W014 1.07). `consumeAdj` is not used. See BALANCE_2026-10-12.md.

## Content file

- New `calendar` array (five public entries) and `calendarNote`.
- `copy.hero` and `copy.opsNote` now say fourteen operations.
- `daily` is unchanged. W013 and W014 are not in it, so no past or future date maps to a different operation.
- The Strait now lists six nodes. The five old nodes keep their positions. A campaign tier depends on a node's position and on the arc's length. W006, W009 and W011 now play at tiers 3, 4 and 5 in campaign mode. W014 plays at tier 6. Free play still uses each operation's own tier.

## Game code

- `kind: "watch"` is valid. `validate()` requires `status` (open or settled) and `settleOn` (a date) on a watch operation and rejects an unknown kind.
- A watch carries the badge "Watch: not yet settled" in six places. The places are the operations list and the operation page. They also include the run header and the result page. Records and a verified record show it as well. When the owner sets `status` to `settled`, the badge reads "Settled" with the settle date.
- A watch is never drawn as the daily and never used by the tutorial. It can be played, and it earns a result code like any other run.
- New panel "Next 120 days" on the welcome screen, the home screen and the operations page. It shows entries that end on or after the viewer's local date and start within 120 days. It hides itself when none remain. Each entry links its source. The panel works by keyboard and fits 375 px.
- `js/record.js` skips a watch in the daily pool and adds the watch status to a verified record's summary. A result code does not read any content text, so no code changes.
- Cache keys moved from `?v=3` to `?v=4`.

## Pages and notes

- 2026 `index.html`: meta description now says fourteen operations and the watch.
- Root `index.html`: the 2026 card hook reads "Twelve domains. Fourteen operations." The body adds "Updated 12 October 2026 with a watch on Taiwan's 28 November vote." The chips read 14 operations, 12 domains and All 36 stratagems. A small line reads "Updated 12 October 2026." Nothing else on the page changed.
- `NOTICE.txt` carries the change date.
- `SOURCING_2026.md` is updated for every change above.
