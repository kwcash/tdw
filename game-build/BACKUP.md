# Backup and restore

This policy keeps the game, its releases and the owner's data safe, and says how to put any of them back. RISKS.md lists the risks it answers.

## What is kept and where

| What | Main copy | Second copy | How often |
|---|---|---|---|
| Sources, content, tests and notes | The branch on GitHub | The owner's download of the branch | Claude pushes after every step. The owner downloads after every release. |
| Release zips | `dist/` in the repository | The owner's download of the branch | `dist/` keeps every `update-TAG.zip` for good. The four build zips hold only the latest release, and git history holds the older ones. |
| Forecast results entered at the desk | `assets/forecast-results.json` on the live site | `workspace/forecast/out/forecast-results.json` in the repository | The owner sends the file after each use of the desk. |
| The live site | The owner's host | The update zips in `dist/` | The owner restores it from a zip when needed. |
| A player's saved progress | That player's browser | The file the player saves at `#/progress` | Up to the player. |

## The owner's part

1. After each release, open the repository on GitHub. Pick the branch `claude/tdw-coding-project-0zkx4h` in the branch menu, then choose Code and Download ZIP. Keep that file somewhere other than GitHub, such as your computer and one other drive.
2. After you enter or correct a forecast result at the desk, send the downloaded `forecast-results.json` with your next message. Claude adds it to the repository, so the next upload carries your results and does not wipe them.
3. Before you replace a folder on the host, download the folder you are about to replace with your file manager. Keep it until the new build works.

## Claude's part

1. Commit and push after every step.
2. Build each release with `release.py`. It writes `dist/MANIFEST.json`, which records the hash and size of every zip. It refuses a tag it has already used, so no update zip is overwritten.
3. Never delete a zip from `dist/`. Never rewrite the history of the branch.
4. Commit each results file the owner sends to `workspace/forecast/out/` before the next release.
5. From the first forecast due date, 11 November 2026, ask the owner before each release whether the site holds results the repository lacks. Pass `--results-current` only after the owner confirms that the files match.

## Checks

`workspace/test/backup.py` runs with every check. It opens every zip in `dist/` and compares it with the manifest. It confirms that each build zip holds a whole build. It scans every text file in `game-build/`, `.github/` and `frontpage/` for tokens, keys and passwords. `release.py` refuses a release when a flag is unknown, when the tag was used before or when RISKS.md is out of date. From the first forecast due date it also refuses until the owner confirms the results file.

A release writes every zip under a temporary name and moves them all into place at the end. A run that stops early leaves `dist/` and the manifest as they were.

## How to restore

**The live site.** Find the last release that worked in the changelogs. Open the newest `update-TAG.zip` from that release or earlier that holds the folder you need. Every update zip from `update-2026-10-14b.zip` on holds all four folders. The older ones hold only one. With your file manager, replace the broken folder with the folder of the same name from the zip. The restore leaves each player's saved progress alone.

**The forecast results after a restore.** Every 2026 folder in an older zip carries an empty results file. After you restore the 2026 folder, upload your latest `forecast-results.json` to its `assets/` folder again.

**The forecast results alone.** Upload the latest results file you hold to the 2026 folder's `assets/` folder. The repository copy at `workspace/forecast/out/forecast-results.json` serves when yours is missing.

**The repository.** Send your downloaded copy to the next session, or say where it is. That session puts it back on GitHub. You need no command line.

**A player's progress.** The player opens `#/progress` in the build and loads the file they saved.

## Test of the restore

The checks open every release zip on each run, so a damaged zip shows at once. Once a quarter, the owner takes one build zip from the downloaded copy and unpacks it. Upload it with your file manager to a spare folder on the host, such as `/restore-test/`. Open that folder in a browser. The game should start and show its operations. Then delete the spare folder. A build opened straight from a computer's disk does not start, because the browser blocks it from reading its own content file.
