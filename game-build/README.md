# Game build sources

What is here, so a reset of the working machine does not cost the game again.

- `dist/` the four ready-to-upload builds. Unzip each into its own folder: `/game/`, `/1931/`, `/2030/`, `/2026/`.
- `js/game.js` the bundle all four builds use (engine, shim, app and board). `js/engine.js` is its first part, for the Node tests. `js/record.js` is the result-code and replay module, adapted to the multi-faction engine by `patch-record.py` from `orig/record.js`.
- `style.css` the merged stylesheet. `orig/` holds the earlier engine, record module and index page the merge started from.
- `content/` one content file per build. `era3.py` writes the 2026 content, and `era3.tuning.json` holds its balance settings.
- `test/` the record round-trip and legacy-code tests, the balance bot, the win-rate report and the tuner. `e2e/` the browser checks (Playwright).
- `mkpkg.py` assembles the four packages from these parts. It expects the working layout it was written for (`out/`, `parts/`, `orig/`, `content/`).
- `SOURCING_2026.md` every factual claim in the 2026 build, with where it came from and what is left to check.
