# Risks and issues

Reviewed on 15 October 2026.

This log holds what could go wrong with the game and what is wrong now. A risk is something that may happen. An issue is something that has happened or waits on a decision. BACKUP.md sets how the work is kept safe and how to restore it.

Review the log at each release and at least once a month. `release.py` refuses a release when the date above is more than 31 days old. `workspace/test/backup.py` checks that the tables stay numbered and that each check they name exists and runs.

## Risks

Likelihood and impact are Low, Medium or High. Status is Open, Watching or Closed.

| Risk | What could happen | Likelihood | Impact | What reduces it | Check | Status |
|---|---|---|---|---|---|---|
| K1 | A new 2026 upload replaces `assets/forecast-results.json` and wipes the results the owner entered on the site. | Medium | High | Once a claim falls due, `release.py` refuses a release until the owner's file is in the repository or the owner confirms no result was entered. The owner sends each results file after using the desk. | `test/backup.py` | Open |
| K2 | The repository is lost, through a deleted branch or a lost account. | Low | High | Every step is pushed to GitHub. The owner keeps a copy of the repository away from GitHub after each release, as BACKUP.md says. | Review | Open |
| K3 | A release zip is damaged or changed after it was built. | Low | Medium | `dist/MANIFEST.json` holds the hash of every zip, and the checks open every zip. | `test/backup.py` | Watching |
| K4 | An upload goes wrong and breaks the live site. A folder could be replaced only in part or under the wrong name. | Medium | High | Each report names the folders to replace. Every earlier release stays in `dist/`, and BACKUP.md says how to restore one. | `test/backup.py` | Watching |
| K5 | A player loses saved progress when the browser clears its storage. | Medium | Medium | The page at `#/progress` saves progress to a file and loads it back. The save keys stay fixed. | `test/progress.test.js` | Watching |
| K6 | New content breaks a standing rule. | Medium | High | RULES.md names a check for each rule, and a second reader reviews each change. | `test/rules.test.js` | Watching |
| K7 | An engine change stops old result codes from verifying. | Low | High | Old codes replay on every check. New engine rules are opt-in per operation. | `test/replay-all.js` | Watching |
| K8 | A claim in the record proves wrong or lacks a source. | Medium | High | SOURCING_2026.md marks each claim with its status. An independent reviewer checks sources in process item 5. | Review | Open |
| K9 | A forecast claim is settled wrong or late. | Medium | Medium | Each claim carries its due date and its counting rules. The desk keeps the earlier entry when a result is corrected. HANDOFF.md lists the next dates. | `test/forecast.test.js` | Open |
| K10 | The person doing the work changes and context is lost. | Medium | Medium | HANDOFF.md, STANDARDS.md and RULES.md describe the work, and CI runs every check on each push. | Review | Watching |
| K11 | A page breaks in the browser while the Node checks still pass. | Medium | Medium | STANDARDS.md asks for the browser checks after any page change. CI runs them on request. | Review | Watching |
| K12 | A secret or a private address ends up in the repository. | Low | High | The working conventions forbid pasting secrets. The checks scan every file for tokens, keys and passwords. | `test/backup.py` | Watching |

## Issues

Each issue names who acts next. Status is Open, Waiting or Closed.

| Issue | What is wrong or undecided | Next step | Who acts | Status |
|---|---|---|---|---|
| I1 | Base game F032 and 2026 operation W011 name a Taiwanese party, against R5. | The owner keeps them or asks for neutral wording. | Owner | Waiting |
| I2 | The forecast page leaves out forecast claim R6, because it names a Taiwanese party. | The owner decides whether it goes in. | Owner | Waiting |
| I3 | Forecast claim TC1 falls due on 11 November 2026. | The owner enters its result at the desk and sends the results file. | Owner | Open |
| I4 | Watch W013 settles after the vote of 28 November 2026. | The owner sends source links, and the steps in SETTLE_WATCH.md follow. | Owner | Open |
| I5 | Many claims are still marked Check in SOURCING_2026.md and in the evidence cards. | The owner finds an independent reviewer for process item 5. | Owner | Open |
| I6 | The Lynceus credit line has not been checked against the written terms. | Check the terms and date the line. | Owner | Open |
| I7 | The feedback link stays hidden because no address is set. | The owner gives an address when ready. | Owner | Waiting |
| I8 | HANDOFF.md holds seven style failures. No check reads it, because it holds no player text. | Rewrite the seven sentences at the next handoff update. | Claude | Open |
| I9 | The style lint reads no colons or semicolons. | Teach the lint to skip links and times, then check prose for both. | Claude | Open |
