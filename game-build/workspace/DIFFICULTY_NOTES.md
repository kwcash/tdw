# Notes, approximate difficulty, 15 October 2026

Each operation and each tier now carries a label from Gentle to Brutal. The label reads how often a simple scripted player wins. It measures the bot and not people. A careful player beats the bot on most operations, and a hasty one may not.

## How the reading is made

- `difficulty/build_difficulty.js` plays every operation a player can pick, in all four builds, at each tier from 1 to 7. It plays 400 games on the fixed seeds `diff-0` to `diff-399`. A first table used 100 games, and its noise let a higher tier read easier on several operations. 400 games settled that.
- The player is the tuner bot from `test/bots.js`, the bot used when the builds were tuned. On an operation with holdings it gives up a consuming holding on turn 1. On an operation with reach moves it uses the open ones. Those are the plain lines a new player learns.
- The share of the 400 games it wins is the reading. `difficulty/difficulty.json` holds every share, and `difficulty/add_difficulty.py` copies each build's table into its content file.
- The same seeds give the same shares. The table records a fingerprint of the engine, the bot and the builder. It also records one for each build's registry and for every operation. `test/difficulty.test.js` recomputes all of them on every run of the checks. A change to any of them fails the checks until the table is rebuilt. The test also replays one operation per build.

## The labels

| Share the bot wins | Label |
|---|---|
| 85 to 100 | Gentle |
| 60 to 84 | Fair |
| 35 to 59 | Hard |
| 10 to 34 | Very hard |
| 0 to 9 | Brutal |

The sentence beside a label gives the share itself, such as "A scripted player won 47 percent of its games at this tier." So the sentence and the label can never disagree.

## Where the labels show

- The operations list shows the label for the record tier.
- The briefing shows the label and the sentence for the tier the player picks, and it follows each change of tier. A screen reader hears each tier button as its tier and label.
- A campaign arc shows the label for the tier of each step. The daily shows the label for Tier 3.
- How to play explains the labels under Tiers.

## What the reading says

The median share of the bot's wins at each tier, by build.

| Build | T1 | T2 | T3 | T4 | T5 | T6 | T7 |
|---|---|---|---|---|---|---|---|
| Base game | 100 | 89 | 62 | 35 | 16 | 8 | 1 |
| 1931 | 98 | 84 | 65 | 47 | 26 | 16 | 3 |
| 2030 | 100 | 94 | 78 | 53 | 35 | 21 | 3 |
| 2026 | 99 | 90 | 68 | 46 | 30 | 15 | 2 |

- The 2030 build has ten operations, so its median is the mean of the middle two, rounded.
- At the record tier the labels spread across all five bands. In the 2026 build three operations read Gentle and three read Brutal. The three Brutal ones are the band operations at Tier 7, which matches their own notes.
- A higher tier is harder for the bot everywhere but two places, both in 1931 and both from Tier 3 to Tier 4. E009 reads 65 then 67, and E010 reads 42 then 47. In both the label stays the same, and a test checks that no label ever eases as the tier rises. Tier 3 grows the opponent's hand from turn 3, while Tier 4 starts it larger and grows it only from turn 7. That may explain both, but the notes do not test it.

## Tier 7

The owner decided on 15 October to keep Tier 7 open in free play. No win unlocks it. The labels tell a player that Tier 7 reads Brutal on 254 of the 260 operations. The other six read Very hard, at 20 percent or less.

## Rebuilding the table

After any change to the engine or to an operation, run `node difficulty/build_difficulty.js` (about twelve minutes) and then `python3 difficulty/add_difficulty.py`. The checks fail until both have run.
