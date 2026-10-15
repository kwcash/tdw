# Changelog, 15 October 2026 (sixth update), process

The second step of the process plan. Short standards for a change and for a release, a definition of done and four templates. Nothing a player sees changed, so this release has no upload.

## Standards

- STANDARDS.md sets nine steps for a change and six for a release. A change names its purpose, reads the rules, writes its test first and keeps old codes and saves valid. A release writes its changelog and any balance note and sourcing rows, raises the cache keys and hands the owner a zip and a report.
- The definition of done is a checklist of nine boxes. A change is done when every box holds.
- `templates/` holds a change note, a changelog, a balance note and the owner's report.

## Tools

- `release.py` now refuses a release whose notes lack a changelog, and a changelog that fails the house-style lint.
- The CI workflow moves to the current versions of its three GitHub actions, after the first run warned that the old ones are retiring.

## Checks run

- Every check passes, locally and in CI. A test changelog with a four-item list made `release.py` refuse, as it should.
