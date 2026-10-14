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

## Update of 13 October 2026, fourth set

- The 2026 build adds the asymmetry band, W017 The Reach and W018 The Wallet, with permits and reach moves in the engine. `patch-v7.py` turns the v6 bundle into the current one. `band/band_ops.py` and `band/build_band.py` build the operations from reviewed evidence cards. `js/` now holds the v7 bundle. Engine changes are opt-in, and every earlier result code still verifies.
- `evidence/` holds the pipeline: `extract_candidates.py` (129 candidates from the sourced files, in `candidates/`), `import_notes.py`, `build_evidence.py`, `cards.json` (19 reviewed cards) and `EVIDENCE_INDEX.md`.
- `dist/2026.zip` is the current 2026 build. `dist/update-2026-10-13d.zip` is the upload set.
- `ASYMMETRY_NOTES.md`, `BALANCE_W017_W018.md` and `CHANGELOG_2026-10-13d.md` describe it. `test/reach.test.js` covers the new rules.
- The tests in `test/` were written against the working layout `out/`, `parts/`, `content/`, `band/`, `forecast/` that `mkpkg.py` reads. Run them from a tree with that layout.

## Update of 14 October 2026

- The 2026 build adds a real Tier 7. `patch-v8.py` turns the v7 bundle into the current one. `js/` now holds the v8 bundle. Tiers 1 to 6 are unchanged, and `test/tier7.test.js` checks that against `test/engine.v7.js`, the engine of the previous update.
- W017 and W018 are set to Tier 7 and retuned (`band/tuning.json`).
- `dist/2026.zip` is the current build. `dist/update-2026-10-14.zip` is the upload set.
- `TIER7_NOTES.md`, `BALANCE_W017_W018.md` and `CHANGELOG_2026-10-14.md` describe it.

## Update of 14 October 2026, second set

- Tier 7 reaches the base game, the 1931 build and the 2030 build. `js/` holds the v8 bundle, and `mkpkg.py` builds all four packages from it. `e2e/v8.js` runs the three older builds at Tier 7 and loads an old save in each.
- W019 The Lab joins the asymmetry band. `band/band_ops.py` holds all three band operations, and W017 and W018 are byte for byte unchanged (`content/era3.shipped-1014.json` is the shipped copy that a test compares against).
- The second evidence batch went through `band/import_notes.py`, `band/promote_drafts.py` and `band/build_evidence.py`. `band/batches/` holds its notes and drafts. `evidence/EVIDENCE_INDEX.md` lists all 31 cards.
- `dist/*.zip` are the four current builds. `dist/update-2026-10-14b.zip` is the upload set for all four folders and the root `index.html`.
- `CHANGELOG_2026-10-14b.md`, `TIER7_NOTES.md`, `ASYMMETRY_NOTES.md` and `BALANCE_W017_W018.md` describe it.
