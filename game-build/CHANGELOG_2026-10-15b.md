# Changelog, 15 October 2026 (second update), all four builds

The second step of the player experience plan. Each operation and each tier shows an approximate difficulty. Saved progress and result codes from the earlier builds stay valid. No storage key changed. No operation changed, and the engine is byte for byte the engine of 14 October.

## Difficulty labels

- Each tier of each operation carries a label from Gentle to Brutal. The label reads the share of 400 games a simple scripted player won at that tier. People may do better or worse, and the game says so on every page that shows a label.
- The operations list shows the label for the record tier, for example **T4 · Hard**.
- The briefing shows the label and a sentence for the tier the player picks, such as "A scripted player won 47 percent of its games at this tier." The sentence follows each change of tier. A speech or screen reader user hears each tier button as its visible name and label, such as "T4, Hard".
- A campaign arc shows the label for the tier of each step. The daily shows the label for Tier 3.
- How to play explains the labels under Tiers.
- DIFFICULTY_NOTES.md describes the method, the bands and what the reading shows.

## Tier 7

- Tier 7 stays open in free play, as the owner decided on 15 October. No win unlocks it.

## Independent review

Two reviewers read the change before release, one for correctness and one for the player and the house rules. They found nine problems, and all nine are fixed.

- The daily, the arcs and the briefing showed a label with no word that it was a bot's reading. Each now carries the note.
- The sentence rounded to tenths, so Brutal and Very hard could share a sentence. The sentence now gives the share itself.
- At 390 pixels the list labels wrapped inside their chips. They now stay on one line.
- The tier buttons lost their visible name for speech input. The name now starts with it.
- The first table used 100 games, and its noise made a higher tier read easier on several operations. The table now uses 400 games, and a test checks that no label eases as the tier rises.
- The staleness test sampled a few operations. It now checks a fingerprint of every operation and of the engine and the bot.
- Two help sentences overstated or misworded the method, and the notes misstated one median. All three are fixed.

## What did not change

- The engine and every operation. The arcs, the daily pools and every registry entry. A test compares the content files with their earlier copies, apart from the new `difficulty` key.
- W017 and W018, byte for byte.
- Balance. The labels describe the game and change nothing in it, so this release has no balance note.

## Files

- `difficulty/build_difficulty.js` plays the games and writes `difficulty/difficulty.json`. `difficulty/add_difficulty.py` copies each build's table into its content file and keeps the file's layout.
- `patch-v10.py` turns the v9 bundle into the v10 bundle. `out/*.v9.js` and `parts/style.v9.css` keep the previous version.
- Cache keys moved to `?v=6` for the base game, `?v=7` for 1931, `?v=6` for 2030 and `?v=11` for 2026. Each `NOTICE.txt` names the change.

## Checks run

- 7 new tests in `test/difficulty.test.js` and every earlier test. One checks a fingerprint of every input to the table, so a stale table fails the checks. 320 earlier result codes verify, and so do 148 original-engine codes.
- Browser run `e2e/v10.js` on all four builds at 1280 and 390 pixels. It checks every list label against the table and that none wraps. It checks the briefing as the tier changes, an arc step and the daily, each with its note. It loads an old save in each build. No console errors and no horizontal overflow.
