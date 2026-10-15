# Changelog, 13 October 2026 (third update), 2026 build

Update to the 2026 build. It adds forecast mode. Saved progress and result codes from the earlier build stay valid. The storage key `tdw-2026-1` is unchanged.

## New

- **Forecast page** at `#/forecast`, with a nav link and a card on the home page. 49 dated claims from the prediction ledger, soonest first. A player enters a chance from 1 to 99 percent and locks it. The book's probability and the reference answer show after the lock.
- **Scoring.** The Brier score for each claim, with a summary that sets the player beside the book and the cheap reference on the same claims. A void claim is not scored.
- **Owner desk** at `#/forecast/desk`. It builds `forecast-results.json` from the project's scoring log, with a history for any correction. The owner uploads the file with a file manager.
- **Text check.** Each claim carries a SHA-256 value and the page warns if a text differs from it.

## Files

- `assets/forecasts.json` holds the registered claims and never changes after a build.
- `assets/forecast-results.json` holds the results and starts empty.
- `assets/content.json` gains a `forecast` block. Nothing else in it changed. `test/freeze.js` passes against the 13 October build.
- `forecast/build_forecasts.py` and `forecast/ledger_snapshot_2026-10-12.csv` rebuild the claims.
- `index.html`: cache keys moved from `?v=5` to `?v=6`. `NOTICE.txt` names the change.

## What did not change

- The engine, the record module and every rule.
- Every operation, the arcs and the daily.
- The 1931, 2030 and base game builds. They hold no forecast block, so they show no Forecast page.

## Left out of the game

18 ledger entries, with reasons in FORECAST_NOTES.md. Four name a Taiwanese party, an election result or a poll. Four concern a disease event. One turns on a named person's survival in office. One asks for a judgment about the model, and eight are phase reviews. R6 is among them, so the first claim due is TC1 on 11 November and not R6 on 29 November.

## Checks run

- 7 data tests in `test/forecast.test.js`, and every earlier test.
- 320 earlier result codes verify. The engine part of the bundle is byte for byte the same.
- Browser run at 1280 and 390 pixels with no console errors and no horizontal overflow.
