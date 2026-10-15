# Source review log

Each round of the independent source review gets one entry here. REVIEW_SOURCES.md is the reviewer's brief. The worksheet lives at `workspace/review/worksheet.csv`.

The log calls the reviewer Reviewer A. The owner keeps the reviewer's name and contact. The project's files never carry them.

## Rounds

| Round | Sent | Returned | Reviewer | Confirmed | Confirmed with change | Not supported | Cannot check | Not yet checked |
|---|---|---|---|---|---|---|---|---|
| 1 | 15 October 2026 | 15 October 2026 | The owner | All 88 | | | | |

Round 1 was the owner's own check and not an independent one. The owner reported that every source holds. The owner also holds more sources for the next version of the game, and reports that those check out too. An independent round can still use the pack at any time.

## How to close a round

1. Run `python3 review/worksheet.py check FILE` from `workspace/` on the returned sheet. It must report a well formed worksheet.
2. Copy the counts from its summary into the table above.
3. Put each correction and each cut to the owner. Make only the ones the owner approves, each as its own change under STANDARDS.md.
4. Move each confirmed claim to Use in SOURCING_2026.md with the reviewer's link. Then rebuild the worksheet, so the next round lists only what still waits.
