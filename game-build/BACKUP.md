# Backup and restore

This policy keeps the game, its releases and the owner's data safe, and says how to put any of them back. RISKS.md lists the risks it answers.

## What is kept and where

| What | Main copy | Second copy | How often |
|---|---|---|---|
| Sources, content, tests and notes | The branch on GitHub | The owner's download of the repository | Pushed after every step. The owner downloads after every release. |
| Every release zip | `dist/` in the repository | The owner's download of the repository | Kept for good. A release never deletes an older zip. |
| Forecast results entered at the desk | `assets/forecast-results.json` on the live site | `workspace/forecast/out/forecast-results.json` in the repository | The owner sends the file after each use of the desk. |
| The live site | The owner's host | The release zips in `dist/` | Restored from the zips when needed. |
| A player's saved progress | That player's browser | The file the player saves at `#/progress` | Up to the player. |

## The owner's part

1. After each release, open the repository on GitHub and choose Code, then Download ZIP. Keep that file somewhere other than GitHub, such as your computer and one other drive.
2. After you enter a forecast result at the desk, send the downloaded `forecast-results.json` with your next message. It joins the repository before the next 2026 upload, so the upload does not wipe it.
3. Before you replace a folder on the host, download the folder you are about to replace with your file manager. Keep it until the new build works.

## Claude's part

1. Commit and push after every step.
2. Build each release with `release.py`. It writes `dist/MANIFEST.json`, which records the hash and size of every zip.
3. Never delete a zip from `dist/`. Never rewrite the history of the branch.
4. Commit each results file the owner sends to `workspace/forecast/out/` before the next 2026 release.

## Checks

`workspace/test/backup.py` runs with every check. It opens every zip in `dist/` and compares it with the manifest. It confirms that each build zip holds a whole build. It scans every file for tokens, keys and passwords. `release.py` refuses a 2026 release once a forecast claim falls due, unless the repository holds the owner's result for it or the owner confirms that no result was entered.

## How to restore

**The live site.** Find the last release that worked in the changelogs. Open its `update-TAG.zip` from `dist/`, or from your downloaded copy of the repository. With your file manager, replace the broken folder with the folder of the same name from the zip. Saved progress stays in each player's browser and is not touched.

**The forecast results.** Upload the latest results file you hold to the 2026 folder's `assets/` folder. The repository copy at `workspace/forecast/out/forecast-results.json` serves when yours is missing.

**The repository.** Unpack your downloaded copy and push it to a new branch on GitHub. Then tell the next session the branch name.

**A player's progress.** The player opens `#/progress` in the build and loads the file they saved.

## Test of the restore

The checks open every release zip on each run, so a damaged zip shows at once. Once a quarter, the owner takes one build zip from the downloaded copy and unpacks it. Upload it with your file manager to a spare folder on the host, such as `/restore-test/`. Open that folder in a browser. The game should start and show its operations. Then delete the spare folder. A build opened straight from a computer's disk does not start, because the browser blocks it from reading its own content file.
