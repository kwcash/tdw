# Changelog, 15 October 2026 (eighth update), process

The fourth step of the process plan. A risk and issue log, a backup policy and checks that hold a release when either is at fault. Nothing a player sees changed, so this release has no upload.

## Risk and issue log

- RISKS.md logs twelve risks with their likelihood, impact, guard and check. It also logs nine issues, and each names who acts next.
- The log carries a review date. `release.py` refuses a release when that date is more than 31 days old.

## Backup policy

- BACKUP.md says what is kept, where the second copy lives and how often it is made. It also says how to restore the site, the forecast results, the repository and a player's progress.
- The owner keeps a download of the repository after each release. The owner also sends each forecast results file after using the desk.
- `dist/MANIFEST.json` records the hash and size of every release zip.

## A guard for the forecast results

- A 2026 upload replaces `assets/forecast-results.json` on the site. The results the owner enters at the desk live in that file. The first claim falls due on 11 November.
- Once a claim falls due, `release.py` now refuses until the repository holds the owner's result for it. The flag `--results-current` lets a release go ahead once the owner confirms that no result was entered.

## Checks

- `test/backup.py` adds six tests. It opens every release zip and compares it with the manifest. It checks that each build zip holds a whole build. It tests both release guards and scans every file for tokens, keys and passwords. It also checks that RISKS.md stays numbered.
- The style lint now skips the commas inside a number such as 320,000. The base content file passes, so the lint now reads all four content files.
- Every check passes. A planted token, a gap in the risk numbers and a release dated 12 November each made a check fail, as they should.
