# Changelog, 15 October 2026 (tenth update), accessibility and the playtest script

This update finishes the last player experience item. It fixes what an accessibility audit found and adds a script for playtests. All four folders changed, because they share one stylesheet and one script.

## Accessibility fixes

- The small red label above each title now meets the contrast standard on light pages. It had reached only about 1.9 to 1.
- The primary buttons now meet the standard in the dark theme. So do the gate badge and the watch label.
- The board keeps one live region from its first draw. After each turn a screen reader hears the turn number and what happened, or that nothing landed.
- A screen reader now also hears the warning about unspent actions, which before only changed the button label.
- Nothing changed in the rules, the operations or the saves.

## The audit

- ACCESSIBILITY.md logs the audit. It covered twelve views in the light theme, the dark theme and 200 percent zoom.
- After the fixes no WCAG 2.1 A or AA rule fails. No view scrolls sideways at 200 percent zoom. A whole run plays by keyboard alone, and every Tab stop shows a focus ring.
- A person still has to play with a real screen reader. ACCESSIBILITY.md lists that and three other checks for people.

## The playtest script

- PLAYTEST.md is a script for five to eight sessions of about 45 minutes. It says whom to invite and how to keep players anonymous. It also gives the words to say, eight timed tasks, an observation sheet and the closing questions.
- PLAYTEST_LOG.md records each session by player code. Its findings table needs a decision on any problem seen twice.

## Checks

- `e2e/a11y.js` runs the audit in a browser and passes or fails. The CI browser job now runs it too.
- `test/a11y.test.js` adds four tests that need no browser. It computes the contrast of the theme colours and checks the live region. It also checks that the four announcements live in `src/help.json`.
- `run_checks.sh` now also lints the process documents.
- Every check passes. The browser checks v9 to v12 pass on the new build.
