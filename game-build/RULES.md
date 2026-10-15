# Standing rules

Every change to the game keeps these rules. Each rule has a number and names the check that enforces it. A rule marked review has no test, and the second reader in step 8 of STANDARDS.md checks it by hand. `workspace/test/rules.test.js` checks that the table below stays numbered and that each named test exists and runs.

To change a rule, get the owner's decision in writing first. Then change this table, the test and HANDOFF.md in one commit.

## The rules

| Rule | What it says | Check |
|---|---|---|
| R1 | The actor is the Party, the Party-state or a named agency, never the Chinese people. Ancestry is not loyalty. | `test/rules.test.js` looks for a hostile verb after a people or a diaspora as subject, and checks the footer of each build. Review for any wording the test misses. |
| R2 | The twelve domains are fixed and in this order. Kinetic, Economic, Financial, Information, Psychological, Legal, Association, Cyber, Cultural, AI and Cognitive, Biological, Data and Surveillance. | `test/rules.test.js` compares the engine's list and the domains of every operation. The validate step in `run_checks.sh` rejects an operation outside the list. |
| R3 | Contested numbers stay conservative. No Xinjiang or detention figures. | `test/rules.test.js` rejects a count of people in any sentence about Xinjiang or the camps. Review for other contested numbers. |
| R4 | No private individuals. | Review. A name joins only as a public office holder or a public figure with a source in SOURCING_2026.md. |
| R5 | No Taiwanese candidates, party lists or parties, and no polls. | `test/rules.test.js` scans every build but 1931 and the help text. Two older mentions stand as exceptions until the owner decides. |
| R6 | Biology appears as governance only. | Review. An operation in the Biological domain must act through rules, permits, data or institutions. |
| R7 | Scenario CW-3 stays excluded. | `test/rules.test.js` |
| R8 | Nothing after 12 October 2026 counts as record. Settling W013 after the 28 November vote is the one approved exception. | `test/rules.test.js` checks the calendar and the dates of each 2026 operation. SETTLE_WATCH.md describes the exception. |
| R9 | The game has no runtime dependency and makes no network call. | `test/rules.test.js` allows one fetch for the two forecast files in the 2026 folder and no other network interface. |
| R10 | The daily pools do not change. | `test/rules.test.js` pins each build's pool. |
| R11 | Saved progress and every old result code stay valid. | `test/replay-all.js` replays 320 old codes. `test/record-legacy.test.js` reads the old code forms. `test/progress.test.js` and `test/guide.test.js` load old saves. `test/rules.test.js` pins the save keys. |
| R12 | New engine rules are opt-in per operation. | `test/tier7.test.js` plays Tiers 1 to 6 as before Tier 7. `test/holdings.test.js` and `test/reach.test.js` check that an operation without the rule carries none of its state. `test/record-legacy.test.js` runs the older engines on the same codes. |
| R13 | Shipped operations change only by a deliberate and tested step. W017 and W018 are byte for byte frozen. | `test/rules.test.js` pins every operation in each build and compares W017 and W018 with the 14 October file. `test/freeze.js` and `test/reach.test.js` guard the band. |
| R14 | Player text keeps the house style. Active voice and no em dashes. No sentence opens with "It is" or "There are". No more than two commas in a sentence. No colons or semicolons in prose. No filler. | `test/lint-strict.py` runs on the 1931, 2030 and 2026 content, the evidence cards, the help text and the guided runs. Review covers active voice and filler. |
| R15 | The game is a test of whether a rule can be written down and played. It is not evidence. Designer scores and labels are readings, and the notes say so. | `test/rules.test.js` checks the difficulty note, the label text and the permit term. Review for new notes. |

## The two exceptions to R5

Both shipped before this register. Neither is changed until the owner decides.

- Base game F032, The Peace Framework. Its record says that Xi Jinping hosted the chair of the Kuomintang in Beijing in April 2026.
- 2026 build W011, The Summit Season. Its brief and record say that the chair of Taiwan's Nationalist Party met Xi Jinping in April 2026.

The 1931 build plays the Kuomintang of 1931 to 1949 as a historical faction. R5 does not reach it.

## Limits of the tests

The R1, R3 and R5 tests look for words. A careful reader can still write a sentence that breaks the rule and passes the test. The review in step 8 of STANDARDS.md stays the main guard for those three rules.

The style lint does not run on the base content file. Its three failures are large numbers such as 320,000, where the lint counts the digit commas. HANDOFF.md also holds seven older failures.

## Working conventions

These bind the way work is done. Each is checked at review or at release.

| Convention | Check |
|---|---|
| Work on branch `claude/tdw-coding-project-0zkx4h` and open no pull request unless the owner asks. | Review |
| End each commit with the two attribution trailers. | Review |
| Give no command-line steps for the upload. Send a zip and say which folders to replace. | Review |
| Report after each step with what changed, what did not, the tests and the caveats. | Review |
| Never paste secrets. | Review |
| A release carries a changelog that passes the lint. | `release.py` refuses otherwise. |
