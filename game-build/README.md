# Game build sources

What is here, so a reset of the working machine does not cost the game again.

- `dist/` the four ready-to-upload builds. Unzip each into its own folder: `/game/`, `/1931/`, `/2030/`, `/2026/`.
- `js/game.js` the bundle all four builds use (engine, shim, app and board). `js/engine.js` is its first part, for the Node tests. `js/record.js` is the result-code and replay module, adapted to the multi-faction engine by `patch-record.py` from `orig/record.js`.
- `style.css` the merged stylesheet. `orig/` holds the earlier engine, record module and index page the merge started from.
- `content/` one content file per build. `era3.py` writes the 2026 content, and `era3.tuning.json` holds its balance settings.
- `test/` the record round-trip and legacy-code tests, the balance bot, the win-rate report and the tuner. `e2e/` the browser checks (Playwright).
- `mkpkg.py` assembles the four packages from these parts. It expects the working layout it was written for (`out/`, `parts/`, `orig/`, `content/`).
- `SOURCING_2026.md` every factual claim in the 2026 build, with where it came from and what is left to check.

## Update of 12 October 2026

- `patch-v4.py` turns the earlier bundle into the current one (watch operations and the 120-day calendar). The current `js/game.js` includes both features.
- `dist/2026.zip` is built from the current bundle. The other three zips in `dist/` still hold the earlier bundle. They run the same content and behave the same, and they can be rebuilt with `mkpkg.py`.
- `CHANGELOG_2026-10-12.md` lists every field changed by operation id. `BALANCE_2026-10-12.md` holds the win rates. `test/freeze.js` and `test/replay-codes.js` check that existing mechanics and old result codes stay valid.

## Update of 13 October 2026

- Two operations added to the 2026 content, W015 The Shadow Fleet and W016 The Seized Botnet. The game code did not change. `CHANGELOG_2026-10-13.md` and `BALANCE_2026-10-13.md` describe it.
- `dist/2026.zip` is the current build. `dist/update-2026-10-13.zip` is the upload set.

## Update of 13 October 2026, second set

- The 1931 build adds E011 The Manchurian Trap and the holdings rule, with a report line for acts against one's own position. `patch-v5.py` turns the v4 bundle into the current one, and `content/era1_v5.py` adds the content. `js/` now holds the v5 bundle.
- `dist/1931.zip` is the current 1931 build. `dist/update-2026-10-13b.zip` is the upload set (root `index.html` plus the `1931/` folder and three notes).
- The 2026, 2030 and game zips keep the v4 bundle. They behave the same because none of their operations lists holdings.
- `CHANGELOG_2026-10-13b.md`, `BALANCE_E011.md` and `NOTES_E011.md` describe it. `test/holdings.test.js` covers the new rules.

## Update of 13 October 2026, third set

- The 2026 build adds forecast mode. `patch-v6.py` turns the v5 bundle into the current one, and `forecast/build_forecasts.py` writes `assets/forecasts.json` from the ledger snapshot. `js/game.js` now holds the v6 bundle. The engine part is unchanged.
- `dist/2026.zip` is the current 2026 build. `dist/update-2026-10-13c.zip` is the upload set for the `2026/` folder.
- `FORECAST_NOTES.md` lists what is in, what is left out and why, the score, and how the owner enters results. `CHANGELOG_2026-10-13c.md` lists the changes. `test/forecast.test.js` checks the data.

## Settling a watch (prepared, not yet used)

- `settle_watch.py` and `SETTLE_WATCH.md` carry out the settling of W013 after 29 November 2026. The live build has not changed. `test/freeze.js` now lets a watch go from open to settled and allows nothing else about its status.
