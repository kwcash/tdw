# Notes, forecast mode, 13 October 2026

Forecast mode is a page in the 2026 build at `#/forecast`. A player enters a chance on a dated claim before its check date. The game scores the player when a result is entered, and sets the score beside the book's own probability and a cheap reference answer. The game tests whether a forecast can be written down and scored. It proves nothing about the world.

## Where the claims come from

The claims come from `T1 records/prediction_ledger.csv` in the collaboration package of 12 October 2026, with the author's written permission. The build script `forecast/build_forecasts.py` reads a snapshot of that file, `forecast/ledger_snapshot_2026-10-12.csv`, and writes `assets/forecasts.json`.

- The claim text is copied unchanged. It carries its registration stamp, its check date and a SHA-256 check value. The page recomputes the value in the browser and warns if a text does not match.
- The book's probability is the analyst probability in the ledger notes and in `v2_probabilities_T1_record.md`, with the stamp of the row that carries it. A failure criterion has no probability from the book, and the page says so.
- The reference answer is the cheap forecast the ledger captured at registration (Revision 34), with its source note. The sign ‡ means the item is still to verify.
- Counting rules appear in a fold-out on every claim whose registered record states them. They are copied unchanged and the page names the record.
- Where a claim has a later version, the game shows the first version's text and stamp and the later version's probability. A later version never changed a text.

## What is in and what is left out

50 claims are in. The first due date is 11 November 2026 (TC1), and the last is 1 January 2030. 17 ledger entries are left out.

| Left out | Why |
|---|---|
| TS2, TS4, TS7 | Each names a Taiwanese party, an election result or an opinion poll. The game takes no side between Taiwan's parties and carries no polls. |
| FW1, FW2, RW-P1, RW-P2 | Each concerns a disease event. The game covers biology as governance only. |
| IR4 | It turns on one named person staying alive and in office during a war. |
| C11-F2 | It asks for a judgment about the model, not an event. |
| The eight phase reviews | They make no probability claim. |

**Claim R6 is the one exception.** It names the Kuomintang and a local election result. On 15 October 2026 the owner decided to show it word for word, because the registered text cannot change. The game shows it as the book's forecast and takes no side. It falls due on 29 November, after TC1 on 11 November. RULES.md logs the exception.

## The score

The score is the Brier score for each claim, the square of the miss, so a lower number is better. The formula follows Revision 28 and the provisional formula of Revision 34.

- A claim that holds counts as 1 and one that does not counts as 0. A void claim is not scored.
- The summary shows the mean for the player, the mean for the book on the same claims where it gave a probability, and the mean for the cheap reference on the same claims. Each row shows its own count.
- Weights are not used. The ledger holds weights on only four rows and the author left the rest open.
- The game does not discount a late forecast. It shows how many days before the check date the player locked.
- The player's forecast is final once locked. Entry closes at 00:00 UTC on the check date. The player's device clock decides, so the rule is a convenience and not a safeguard.
- This is a mirror of the project's scoring log and not a second scoring. The log is the record.

## How results get in

Results are entered by hand. Nothing in the game contacts the web.

1. Read the project's scoring log. It names each claim that resolved, the result and the evidence.
2. Open the build and go to `#/forecast/desk` (the link sits at the foot of the Forecast page).
3. For each result choose the claim, the result (held, did not hold or void) and the date the log scored it. Add the evidence link (https only) and a note if you wish.
4. Press Download. The page saves `forecast-results.json`.
5. With your file manager, upload that file to the 2026 folder's `assets/` folder and replace the file there.

A claim that already has a result needs a note to change it. The earlier entry stays on file as history, and the page tells players that the result was corrected. The desk sends nothing anywhere. A person who opens the desk without the file manager can change nothing on the site.

## Where a player's forecasts live

A player's forecasts are stored in that browser's saved progress, under the existing key `tdw-2026-1`. They never leave the device. Saved progress and result codes from the earlier build load unchanged.

## Credit line

The page carries the line "The claims, the probabilities and the reference answers come from the prediction ledger of the Architecture of Strategy by Lynceus (a pen name), used with the author's written permission." It lives in the `forecast.credit` field of `content.json` and can be reworded without touching the code. It has not been checked against the written terms, and it carries no date of permission.

## Checks run

- 7 data tests in `test/forecast.test.js`. Every text matches its check value and appears unchanged in the ledger snapshot. No excluded claim is in, and no banned word.
- The engine and the record module are byte for byte what they were. 320 earlier result codes and 148 original-engine codes verify, and all earlier tests pass.
- Browser run at 1280 and 390 pixels with no console errors and no horizontal overflow.
  - Player flow: locking, bad input, a repeat lock and a reload.
  - Results: a void result, the Brier arithmetic and a closed claim.
  - Faults: a missing results file and a tampered text.
  - Owner flow: the desk with a correction.
  - Compatibility: an old save and an old result code in the new build.
