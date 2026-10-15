# Standards for a change and for a release

These standards bind every change to the game build. The standing rules sit in RULES.md, and each rule there names the check that enforces it. HANDOFF.md says where everything lives.

## A change

A change is one piece of work with one purpose, such as a new operation, a fix or a new page.

1. **Name the purpose.** Write one sentence on what the change is for and what it must not touch. Use `templates/CHANGE.md`.
2. **Read the rules.** Check the change against every rule in RULES.md. A rule that the change bends needs the owner's decision first.
3. **Write the test first.** Where a test can be written, write it before the code and watch it fail. A test lives in `workspace/test/` and runs from `run_checks.sh`.
4. **Edit the sources.** Edit `workspace/src/` and the content scripts, never `out/` or a content file by hand. Run `python3 build.py`.
5. **Keep the past valid.** Old result codes must verify and old saves must load. A new engine rule is opt-in per operation. A shipped operation changes only by a deliberate step with its own test.
6. **Check the text.** Every string a player reads passes the house style. Put new text in `src/help.json` or a content file, where the lint reads it.
7. **Run every check.** `bash run_checks.sh` must end with ALL CHECKS PASS. A change to a page also runs the browser checks at 1280 and 390 pixels.
8. **Get a review.** A second reader checks the change against its purpose and the rules. For player text that reader checks each claim against the engine and the sources.
9. **Commit.** One commit for the change, with a message that says what changed and why, and the attribution trailers.

## A release

A release ships one or more changes to the owner.

1. **Changelog.** Write `CHANGELOG_<date>.md` from `templates/CHANGELOG.md`. It says what changed, what did not, the review and the checks run.
2. **Balance note.** When a win rate moves, write `BALANCE_<topic>.md` from `templates/BALANCE.md`. Otherwise the changelog says that balance did not change.
3. **Sourcing.** When a claim joins the record, add its row to `SOURCING_2026.md` with its status. Otherwise the changelog says that no claim was added.
4. **Cache keys and notices.** Raise the `ver` of each build that changed in `mkpkg.py`, and write its `NOTICE.txt` line.
5. **Build.** Run `python3 release.py <tag> CHANGELOG_<tag>.md` and any other notes. It refuses to run unless every check passes and the changelog passes the lint.
6. **Hand over.** Commit and push. Send the owner the upload zip and a plain report from `templates/REPORT.md`. Give no command-line steps for the upload.

## Definition of done

A change is done when every box holds.

- [ ] The purpose and the files it touches are written down.
- [ ] Every rule in RULES.md holds, or the owner decided otherwise in writing.
- [ ] A new test covers the change, and it failed before the change.
- [ ] `run_checks.sh` ends with ALL CHECKS PASS, and CI agrees.
- [ ] The browser checks pass where a page changed.
- [ ] Old result codes verify and an old save loads.
- [ ] A second reader reviewed it, and every finding is fixed or answered.
- [ ] The changelog, any balance note and any sourcing rows are written.
- [ ] The owner has the upload zip and the report, or the report says why no upload is needed.
