# Handoff for a new session, 15 October 2026

Read this first. It is enough to continue the work without any other file.

## What this is

Total Domain War (TDW) is a static single-page strategy game, with four builds hosted by the owner. Each build is a folder of `index.html`, `css/`, `js/` and `assets/content.json`.

| Build | Content file | Folder name |
|---|---|---|
| Base game, 220 operations | `content/base.json` | `/game/` |
| 1931 to 1949 | `content/era1.json` | `/1931/` |
| 2030 | `content/era2.json` | `/2030/` |
| 2026 (the live frontier) | `content/era3.json` | `/2026/` |

The engine is deterministic and turn based. It has 12 domains, 10 dimensions and 36 stratagems. Result codes (`TDW1~op~tier~seed~...`) replay and verify in the browser. All four builds share one bundle. Only 2026 has Forecast mode and the asymmetry band (W017 to W019). 1931 has holdings (E011). All builds offer Tier 1 to 7.

## Layout

All work happens in `game-build/workspace/`. It is the working tree, and the files at the top of `game-build/` are older mirrors, release notes and `dist/`.

- `out/` holds the current bundle (`game.js`, `engine.js`, `record.js`) and the previous versions (`*.v4.js` to `*.v8.js`). `parts/style.css` holds the CSS. `parts/help.json` holds the help text that the bundle embeds.
- `patch-v4.py` to `patch-v9.py` each turn the previous bundle into the next. Do not rerun the chain. A new step adds the next patch that reads the current bundle, as `patch-v9.py` does. `mkpkg.py` builds the four packages into `out/pkg/`. `release.py TAG NOTES...` runs every check and builds the packages. It writes `dist/` and the upload zip and refreshes the mirrors.
- `content/` holds the four content files and their `.before` copies. `content/era3.shipped-1014.json` is the 14 October copy that a test compares W017 and W018 against.
- `band/` holds `band_ops.py` (all three band operations), `build_band.py`, `cards.json` (31 reviewed evidence cards), the importer tools and `batches/`.
- `forecast/` holds `build_forecasts.py` and the ledger snapshot. `settle_watch.py` settles a watch.
- `content/guides.json` holds the guided runs and `content/add_guides.py` copies them into the content files.
- `test/` holds the tests and `e2e/` holds the Playwright runs. `test/shim-harness.js` runs the in-browser save logic under Node. `baselines/` holds 320 old result codes for regression.

## First commands

```
cd game-build/workspace
bash run_checks.sh          # about a minute, must end with ALL CHECKS PASS
python3 mkpkg.py            # builds out/pkg/game, 1931, 2030, 2026
```

Browser runs need Playwright. If `/tmp/pw/node_modules/playwright` is missing, run `mkdir -p /tmp/pw && cd /tmp/pw && npm init -y && npm i playwright@1.56.1`. Chromium is at `/opt/pw-browsers/chromium`. The e2e scripts expect `T` to be a folder that holds `v3`, so run `mkdir -p /tmp/t && ln -s $PWD /tmp/t/v3` from the workspace. Then run `T=/tmp/t OLD=<folder of the previous build> SHOTS=<dir> OUT=<dir> node e2e/v8.js`. For `OLD`, unzip the current `dist/*.zip` before you change anything.

## Standing rules (they bind every change)

- The actor is the Party, the Party-state or a named agency, never the Chinese people. Ancestry is not loyalty.
- The twelve domains are fixed and in this order: Kinetic, Economic, Financial, Information, Psychological, Legal, Association, Cyber, Cultural, AI and Cognitive, Biological, Data and Surveillance.
- Contested numbers stay conservative. No Xinjiang or detention figures.
- No private individuals. No Taiwanese candidates, party lists or parties, and no polls. Biology appears as governance only. Scenario CW-3 stays excluded.
- Nothing after 12 October 2026 counts as record. Exceptions need the owner's decision. Settling W013 after the 28 November vote is one, and `SETTLE_WATCH.md` describes it.
- The game has no runtime dependency and makes no network call. The `daily` pools do not change.
- Saved progress and every old result code stay valid. New engine rules are opt-in per operation. Shipped operations change only by a deliberate, tested step. W017 and W018 are byte for byte frozen.
- House style for any text the player reads. Active voice and no em dashes. No sentence opens with "It is" or "There are". No more than two commas in a sentence. No colons or semicolons in prose. No filler. `python3 test/lint-strict.py FILE` enforces it.
- The game is a test of whether a rule can be written down and played. It is not evidence. Designer scores are readings, and the notes say so.

## Working conventions

- Branch `claude/tdw-coding-project-0zkx4h` in `kwcash/tdw`. Commit and push with `git push -u origin claude/tdw-coding-project-0zkx4h`. Do not open a pull request unless the owner asks.
- End each commit message with the two trailers in the session's attribution reminder.
- The owner uploads by file manager. Never give shell, SSH or command-line upload steps. Deliver a zip with `SendUserFile` and say which folders to replace.
- Give a plain-language report after each step. Say what changed, what did not, the test results and the caveats. Never paste secrets.
- Every release gets a changelog, a balance note when balance changed, a sourcing update and all checks passing.

## State at handoff

Done: multi-faction engine, result codes and replay, the 2026 build to W019, forecast mode, holdings and acts against one's own position (E011), the asymmetry band, evidence pipeline (31 cards), Tier 7 on all four builds. On 15 October: How to play sections, first-use hints and two guided runs (player experience item 1). See the `CHANGELOG_*` files in order.

## Open items

1. **R6 decision.** The forecast page leaves R6 out because it names a Taiwanese party. The owner has not said whether to include it.
2. **Settle W013** after 29 November 2026. Follow `SETTLE_WATCH.md`. Get source links from the owner first. Enter forecast results at `#/forecast/desk` as the project's scoring log records them. TC1 falls due on 11 November.
3. **Source checks.** Many claims are marked Check in `SOURCING_2026.md` and in `band/cards.json`. The book's "sixteen years" for Thousand Talents does not match its 2019 citation, and the number is left out of the game.
4. **Lynceus credit line** has not been checked against the written terms and carries no date. It is the `forecast.credit` field in `content/era3.json`.
5. **More evidence.** Send notes in the template at the head of `band/import_notes.py`. Then run `import_notes.py`, `promote_drafts.py` and `build_evidence.py`.

## Planned work, in order

The owner asked for the process and the player experience to move up one maturity level each.

**Process, Level 2 to 3**
1. Make `run_checks.sh` run in CI (GitHub Actions workflow file). Replace the `patch-vN` chain with maintained source files and generate the bundle from them.
2. Write short standards for a change and for a release, with a definition of done and templates.
3. Number the standing rules in a register and map each to the test or lint that enforces it.
4. Add a risk and issue log, with a backup policy.
5. An independent reviewer verifies sources. The owner must supply that person.

**Player experience, Level 2 to 3**
1. Done on 15 October (CHANGELOG_2026-10-15.md). How to play covers Holdings, Reach and permits, Tiers and Forecast. Each board panel has a first-use hint. Two guided runs teach holdings and reach.
2. Show an approximate difficulty on each operation and tier. The owner decided on 15 October to keep Tier 7 open, with no unlock.
3. Add a glossary of terms, linked from each panel.
4. Add progress export and import as a file download, and a `mailto:` feedback link. The owner has not given a feedback address, so the link stays hidden until one is set.
5. Write a playtest script for 5 to 8 sessions. The owner finds the players. Then audit accessibility with a screen reader, keyboard only and 200% zoom, and log the results.
