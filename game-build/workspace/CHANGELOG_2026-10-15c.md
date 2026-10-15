# Changelog, 15 October 2026 (third update), all four builds

The third step of the player experience plan. A glossary explains every term the board uses, and each panel links to its term. Saved progress and result codes from the earlier builds stay valid. No storage key changed. No operation changed, and the engine is byte for byte the engine of 14 October.

## The glossary

- A new page at `#/glossary` lists the terms in alphabetical order. Each term has a short definition and links to related terms. Where How to play covers a term, it links there too.
- A filter box narrows the list as the player types, and a count says how many terms match.
- A term shows only in a build that has the rule behind it. The base game shows 37 terms and the 2030 build 43. The 1931 build shows 47 and the 2026 build 52.
- A link of the form `#/glossary?t=lever` opens the page at that term and marks it.

## Links from the panels

- A small **?** beside each panel label on the board opens its term in a panel over the board, so the run never unloads. The panel links related terms and the full glossary. The top of the board links the lifecycle and the four meters. The doctrine card links its term. Each side panel links its own term, from Factions and Leaders to Holdings and Reach. So do Elsewhere, every faction's board and a watch. The cards in play and the board have one as well.
- Each **?** names its term for a screen reader, such as "Lever, in the glossary". Each is at least 24 pixels square. Each sits beside its heading and not inside it, so a heading keeps its own name.
- The turn box, Home and How to play link the glossary. The Records, Codex and Forecast pages link their own terms.
- The game opens no second tab for the glossary. Two open copies of the game would each write the whole save, and the last one would win.

## How to play

- Two cards from before this release stated a rule loosely. Coherence now says a Disrupt must hit a card you detected. Leaders now says each of yours may move once a turn.

## Independent review

Two reviewers read the change before release, one for accuracy and the house rules and one for accessibility. They found 16 problems, and all 16 are fixed.

- The board links were meant to open a new tab, but the game routes every in-page link itself. They now open the term over the board.
- Six definitions stated a rule wrongly or too strongly. The fixed terms are Coherence, Pact and Leader. Lens, Offer and the evidence terms are fixed too. The Evidence card and Permit terms now say that a permit is the game's reading and that some cards still wait for a check.
- A link inside a heading joined the heading's name. Every link now sits beside its heading.
- Every faction's board and the watch chip had no link, and the Codex page had none before a first game. Pact, Gated, Load and Lock had no way in from a nearby link. All now do.
- The glossary lacked World, Lock and Proxy, and its count read "1 terms". Both are fixed.

## What did not change

- The engine and every operation. The arcs, the daily pools and every registry entry.
- Saved progress, result codes and balance. This release has no balance note.

## Files

- `parts/help.json` holds the 55 terms under `glossary`. `patch-v11.py` turns the v10 bundle into the v11 bundle. `out/*.v10.js` and `parts/style.v10.css` keep the previous version.
- Cache keys moved to `?v=7` for the base game, `?v=8` for 1931, `?v=7` for 2030 and `?v=12` for 2026. Each `NOTICE.txt` names the change.

## Checks run

- 6 new tests in `test/glossary.test.js` and every earlier test. One checks that each definition agrees with the engine on the numbers it states. Another checks that every panel link names a term that exists and that no link sits inside a heading.
- Browser run `e2e/v11.js` on all four builds at 1280 and 390 pixels. It checks the terms each build shows against its content and that every link resolves. It opens a term over the board and follows a related term. It checks the filter, its count and the jump to a term. It loads an old save in each build. No console errors and no horizontal overflow.
