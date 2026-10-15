# Changelog, 15 October 2026 (fourth update), all four builds

The fourth step of the player experience plan. A player can save their progress to a file and load it back, in this browser or another. A feedback link is ready and stays hidden until the owner gives an address. Saved progress and result codes from the earlier builds stay valid. No storage key changed. No operation changed, and the engine is byte for byte the engine of 14 October.

## Your progress

- A new page at `#/progress` shows what this browser holds. That covers the level, the runs played and won and the codex. It also covers the result codes, the forecasts and the campaign arcs.
- **Save my progress to a file** downloads the save as a small JSON file named for the build and the day, such as `tdw-progress-tdw-2026-1-2026-10-15.json`.
- **Load progress from a file** reads a file and first shows what it holds. Nothing changes until the player taps **Replace my progress with this file** twice.
- The game refuses a file from another build and names the build it came from. It refuses a file from a newer version and anything that is not a progress file.
- The game checks every field of a loaded file and keeps only what this build knows. Each run must fit the rules of its mode, as the daily, a campaign arc or a guided run sets them.
- The game never takes a board from the file. A run in progress is built again from its seed and its moves, as a result code is, and a run whose moves do not replay goes. A finished run keeps its result code. So an edited file cannot carry script into a page or break the board.
- A save that holds more than 5000 runs keeps its runs in progress and its newest runs. Today's minutes for the break prompt stay with this browser.
- If the browser keeps no storage, the page says so and asks the player to save a file before leaving.
- A load in one tab now reaches any other open tab of the same build before it writes, so a second tab cannot undo a load or a clear.
- **Clear my progress** moves here as well and still asks twice. Home, How to play and Records link the page.

## Feedback

- A **Send feedback by email** link opens the player's own mail app with the subject and the build filled in. The game sends nothing itself.
- The link shows only when `parts/help.json` names an address under `ui.feedback.email`. The owner has not given one, so the link stays hidden. Setting the address and rebuilding turns it on, on the progress page and on How to play.

## Independent review

Two reviewers read the change before release, one for security and one for correctness and the player. They found 13 problems, and all 13 are fixed.

- An edited file could carry a doctored board for a run in progress. That board reached the page, so it could run script, freeze the tab or break every move. The game now builds each such run again from its seed and its moves.
- A far-future forecast time broke the Forecast page. A campaign run for an arc the build lacks broke the winning move. Doubled arc steps made an arc look cleared twice. Each is now refused.
- A second tab could write its old copy over a load or a clear. Each tab now reads the save again when another tab changes it.
- The newest runs of a very large save could be lost. The size limit could refuse a player's own file. Blocked storage gave no warning. All three are fixed.
- The save message promised more than the page knows, an odd build name printed code, and one row label overstated what it counts. The break timer reset on a load. All are fixed.

## What did not change

- The engine and every operation. The arcs, the daily pools and every registry entry.
- The save format. A file holds the save exactly as the browser keeps it, so every earlier save saves to a file and loads back whole.
- Balance. This release has no balance note.

## Files

- `patch-v12.py` turns the v11 bundle into the v12 bundle. `out/*.v11.js` and `parts/style.v11.css` keep the previous version.
- Cache keys moved to `?v=8` for the base game, `?v=9` for 1931, `?v=8` for 2030 and `?v=13` for 2026. Each `NOTICE.txt` names the change.

## Checks run

- 11 new tests in `test/progress.test.js` and every earlier test. They save and load a busy save and compare every page that reads it. They load hostile files, including a doctored board, and check that nothing in them survives that the build does not know. `test/shim-harness.js` can now block storage and deliver a storage event from another tab.
- Browser run `e2e/v12.js` on all four builds at 1280 and 390 pixels. It saves a real file and loads it in a fresh browser after two taps. It checks that the records verify and that a junk file and another build's file are refused. It shows the feedback link once an address is set and hides it without one.
