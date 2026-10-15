# Changelog, 15 October 2026 (eighth update), process

This update takes the fourth step of the process plan. It adds a risk and issue log and a backup policy. It also adds checks that hold a release when either is at fault. Nothing a player sees changed, so this release has no upload.

## Risk and issue log

- RISKS.md logs twelve risks with their likelihood, impact, guard and check. It also logs ten issues, and each names who acts next.
- The log carries a review date. `release.py` refuses a release when that date is more than 31 days old, impossible or in the future.

## Backup policy

- BACKUP.md says what is kept, where the second copy lives and how often it is made. It also says how to restore the site, the forecast results, the repository and a player's progress. Each restore step needs only the file manager.
- The owner keeps a download of the branch after each release. The owner also sends each forecast results file after using the desk.
- `dist/MANIFEST.json` records the hash and size of every release zip.

## A guard for the forecast results

- Every upload replaces `assets/forecast-results.json` in the 2026 folder. The results the owner enters or corrects at the desk live in that file. The first claim falls due on 11 November.
- From that date `release.py` refuses every release until the owner confirms that the repository file matches the site. The flag `--results-current` records that answer.
- A restore from an older zip also brings back an empty results file. BACKUP.md tells the owner to upload the results again after a restore.

## Release script

- `release.py` refuses a flag it does not know and a tag it has already used.
- It writes each zip under a temporary name and moves them all into place at the end. A run that stops early leaves `dist/` and the manifest as they were.

## Checks

- `test/backup.py` adds six tests. It opens every release zip and compares it with the manifest. It checks that each build zip holds a whole build. It tests the release guards and checks that RISKS.md stays numbered.
- It also scans every text file in `game-build/`, `.github/` and `frontpage/` for tokens, keys and passwords.
- The style lint now skips the commas inside a number such as 320,000. The base content file passes, so the lint now reads all four content files.
- Every check passes. A planted token and a planted password each failed the scan. A gap in the risk numbers failed the log check. A mistyped flag and a used tag each stopped `release.py`. A release run on a copy of the repository built every zip and a matching manifest.

## Review

- A second reader found ten problems, and all are fixed. The worst was that a restore from an older zip would wipe the forecast results. The guard also missed early results and corrections. Other findings covered restore steps that needed a command line, claims that overstated what the checks do and some passive sentences.
- A scan of the whole repository matched an assignment in `instrument/analyze.php`, which sits outside the game. Claude did not open the file. RISKS.md logs it as issue I10 for the owner.
