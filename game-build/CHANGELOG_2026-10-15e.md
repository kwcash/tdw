# Changelog, 15 October 2026 (fifth update), process

The first step of the process plan. The checks run in CI, and the bundle is built from maintained source files. Nothing a player sees changed. The four packages are byte for byte the packages of the fourth update, so this release has no upload.

## Maintained sources

- `src/` holds the bundle as seven files. Four of them join into the bundle. The other three are the record module, the stylesheet and the help text. `src/README.md` says what each holds.
- `build.py` joins them into `out/game.js` and writes `out/engine.js`, `out/record.js` and `parts/style.css`. When the sources were made the output matched the v12 bundle byte for byte.
- `build.py --check` fails when `out/` is not what the sources make. `run_checks.sh` runs it first, so a hand edit to `out/` fails the checks.
- The patch chain from `patch-v4.py` to `patch-v12.py` moved to `history/` with the bundles it made. Nothing there runs. The four old bundles that tests read moved to `baselines/bundles/`.
- The help text moved from `parts/help.json` to `src/help.json`.

## CI

- `.github/workflows/tdw-checks.yml` runs `run_checks.sh` on every push to `main` or to a `claude/` branch, and on every pull request that touches `game-build/`.
- A second job runs the browser checks `e2e/v9.js` to `e2e/v12.js` when started by hand with **browser** ticked. It takes about twenty minutes.
- The browser checks read `PW_MODULE` and `CHROMIUM`, so they run in CI and in this workspace alike.

## Checks run

- Every check passes, and `build.py --check` reports that the outputs match the sources. A deliberate edit to `out/game.js` made it fail, as it should.
- The packages built from the sources match the fourth update's packages file for file.
