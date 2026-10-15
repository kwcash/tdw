# Playtest script

This script runs five to eight playtest sessions of Total Domain War. Each session lasts about 45 minutes with one player. The owner finds the players. PLAYTEST_LOG.md records each session.

## What the sessions should tell us

- Whether a new player can learn the game from the game alone.
- Which words and panels confuse people.
- Whether the guided runs, the difficulty labels, the glossary and the progress file work for real players.
- Whether a player who uses a keyboard only or a screen reader can play. ACCESSIBILITY.md lists what the automated audit could not check.

## Who to invite

| Kind of player | How many |
|---|---|
| New to strategy games | At least two |
| Plays strategy or board games often | At least two |
| Plays on a phone | At least one |
| Uses a keyboard only or a screen reader | One if you can find them |

Nobody who worked on the game or the book takes part. A player may fit two rows.

## Privacy and consent

- Each player gets a code, P1 to P8. The notes and the log use the code only. Keep names and contacts outside the project's files.
- Ask before you record the screen or the voice. Notes alone are enough. Keep any recording outside the project's files and delete it once the notes are written.
- Tell the player they can stop at any time and skip any task.
- Do not ask about the player's politics, origin or ancestry. Do not argue about the game's content. Write down what the player says and move on.
- In task 7, note only whether the player understood the forecast step. Never note the chance they entered or their view of the claim.
- After the session, delete the progress file that task 6 saved, and close the private window.

## Before each session

1. Open the build in a private browser window, so the first-use hints show and no earlier save gets in the way.
2. Use the 2026 build at `/2026/`. Task 3 uses the 1931 build at `/1931/` as well.
3. Have this script, a timer and the observation sheet below at hand.

## What to say at the start

Read this aloud. "Thank you for trying this game. We are testing the game, not you. Please say what you think as you go, even small things. I will mostly stay quiet. If you get stuck for a while I will give a small hint. You can stop at any time."

## The tasks

Give each task in the words shown. Do not help unless the player has been stuck for two minutes. Then give the smallest hint you can and note it.

| Task | What to say | Time | What to watch |
|---|---|---|---|
| 1 | "Open the game and tell me what you think it is." | 5 min | Do they find How to play? What do they think the game is about? |
| 2 | "Play the operation called The Last Institute, to the end." | 10 min | Where they pause. Which words they ask about. Whether they open the question mark buttons. Whether they read the hints. |
| 3 | "In the 1931 build, find the guided run on holdings and follow it." | 8 min | Whether they find it on How to play. Whether each step makes sense. |
| 4 | "Pick another operation and a tier you think you would win." | 3 min | Whether they notice the difficulty label. Ask what the label means to them. |
| 5 | "Find out what coherence means." | 3 min | Whether they find the glossary or the question mark button. |
| 6 | "Save your progress to a file, then load it back." | 4 min | Whether they find the progress page. Whether the file step is clear. |
| 7 | "Make a forecast on any claim and lock it." | 4 min | Whether they understand the chance and what the score compares. |
| 8 | The closing questions below | 8 min | |

For a player who uses a screen reader, task 2 matters most. Note anything read twice, read out of order or never read. Note whether the second press of End turn within four seconds causes trouble.

## Observation sheet

Copy one row for each task.

| Task | Finished | Hints given | Time taken | Where they got stuck | Words they misread | What they said |
|---|---|---|---|---|---|---|
| 1 | Yes, with a hint or no | | | | | |

## Closing questions

Ask the player to answer each of the first four on a scale of 1 to 5, where 5 means strongly agree.

1. The game was easy to learn.
2. Each turn, I knew what I could do.
3. The difficulty labels matched how hard the operations felt.
4. I would play again.

Then ask these in turn.

5. What was the most confusing moment?
6. What one thing would you change?
7. Did anything feel unfair or one-sided? What?

## After each session

1. Fill in the session's row in PLAYTEST_LOG.md within a day.
2. Remove names and any detail that could identify the player from the notes. Then send the observation sheet and the answers with your next message.
3. Claude adds each new problem to the findings table in PLAYTEST_LOG.md. A problem seen in two sessions or more gets a proposed fix. The fix follows STANDARDS.md and waits for the owner's approval.

## When the round is done

The round runs five sessions at least. After five it may stop before eight if three sessions in a row raise no new finding. The playtest has done its job when at least half the players finish task 2 without a hint, and the findings table holds a decision for every finding seen twice.
