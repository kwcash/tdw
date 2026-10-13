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
