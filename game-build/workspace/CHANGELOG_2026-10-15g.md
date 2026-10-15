# Changelog, 15 October 2026 (seventh update), process

The third step of the process plan. The standing rules now carry numbers in a register, and each names the check that enforces it. Nothing a player sees changed, so this release has no upload.

## Register

- RULES.md numbers the fifteen standing rules R1 to R15 and the working conventions. Each rule names its test, its lint or a review by hand.
- Thirteen rules have a test or the lint. Two rules rest on review alone. They are R4 on private individuals and R6 on biology as governance.
- RULES.md lists two older mentions of a Taiwanese party as exceptions to R5. They are base game F032 and 2026 operation W011. Neither changed, and the owner decides whether they stay.

## Tests

- `test/rules.test.js` adds eleven tests for eleven rules. Four cover the actor rule and the domains. They also cover counts of people in sentences about Xinjiang and Taiwanese parties or candidates. Two cover CW-3 and the record cutoff. Five cover the network rule and the daily pools. They also pin the save keys and every operation and check the reading notes.
- One more test checks that RULES.md stays numbered with no gap and that each test it names exists and runs.
- The style lint now also reads the 2030 content file, which passes.

## Checks run

- Every check passes, locally and in CI. A test sentence that broke one of R1, R3, R5 or R7 made the new test fail each time.
- The R1, R3 and R5 tests look for words. Review stays the main guard for those three rules.
