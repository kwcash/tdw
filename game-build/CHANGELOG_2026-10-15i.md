# Changelog, 15 October 2026 (ninth update), forecast claim R6 and the source review

This update carries two pieces of work. The 2026 forecast page gains claim R6, and the independent source review gets its pack. Only the 2026 folder changed.

## Forecast claim R6

- The owner decided to show claim R6 word for word. It says the Kuomintang wins the most of the 22 mayor and magistrate posts in Taiwan's local elections of 28 November 2026. The registered text cannot change, so the game shows it as the book's forecast and takes no side.
- R6 is the third exception to rule R5. RULES.md, FORECAST_NOTES.md and SOURCING_2026.md say so. The other Taiwanese party claims stay out.
- The forecast page now holds 50 claims. TC1 still falls due first on 11 November. R6 falls due on 29 November.
- The forecast file has a new cache key, so browsers load the new list. Forecasts players already locked stay as they were.
- The 2026 notice reminds the owner to upload their own results file again if they entered any result at the desk.

## Source review pack

- REVIEW_SOURCES.md briefs the independent reviewer. It covers who can review and what each verdict means. It also covers how to check a claim and how to send the work back.
- `workspace/review/worksheet.csv` lists the 88 claims that wait for a check. It holds 65 from the 2026 operations and 4 calendar dates. It also holds 19 evidence cards. The sheet opens in any spreadsheet program.
- `review/worksheet.py check FILE` checks a returned sheet and lists the claims that need a change.
- REVIEW_LOG.md records each round. It calls the reviewer Reviewer A, and the owner keeps the name.

## Checks

- `test/forecast.test.js` now expects R6 word for word, with its date and both probabilities. It still keeps every other party claim out.
- `test/rules.test.js` now also scans the forecast claims for R5, with R6 as the one exception there. Its poll pattern no longer mistakes polling day for a poll.
- `test/review.py` adds five tests. The worksheet must match the sources and list each waiting claim once. The checker must refuse each kind of bad row. The brief and the log must keep the house style and name no reviewer.
- Every check passes. The browser checks v9 to v12 pass on the new build, and the forecast page shows R6 with its text check intact.
