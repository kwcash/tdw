# Settling a watch, W013 The Ballot

W013 is a watch with status open and a settle date of 29 November 2026. Taiwan votes on 28 November. Nothing can be settled before the vote has happened and a source reports on it, so this step waits for that day. What is ready now is the procedure and a script that carries it out and refuses anything outside the standing rules. Nothing in the live build has changed.

## What settling does

It changes these and nothing else.

- The status of W013 goes from open to settled. The chip on the operation reads "Settled 29 November 2026" and the note says the watch has settled.
- The closing sentences of the record, "The record ends here. The vote has not yet taken place.", give way to your outcome sentences followed by "The record ends here."
- The opening of the record and of the brief move from the present tense to the past ("holds" becomes "held" and "elects" becomes "elected").
- A row for the outcome goes into `SOURCING_2026.md`, marked Check, with the link and the date it was read.

The reading, the script beats and the balance stay as they are. So do the tier and every result code. A run played before or after settling gives the same score and the same code.

## What the outcome may say

The outcome is one to three sentences and states only what a named source reports. The script refuses a text that breaks a standing rule.

- It names no Taiwanese party and no candidate, takes no side between Taiwan's parties, and carries no poll.
- It names no winner and uses no word of winning or losing, and it gives no count of posts by party.
- It may state the date the Central Election Commission certified the results.
- It may state the turnout the Commission reports.
- It may state what Taiwan's Investigation Bureau or National Security Bureau reported about interference during the campaign.
- It follows the house style.
  - No colons, semicolons or dashes.
  - No sentence opens with "It is" or "There are".
  - No sentence has more than two commas.

The first sentence of the record already says the vote took place on 28 November, so the outcome need not repeat it.

## How to do it

1. After 29 November, send me the source links for what you want stated. I read them, draft the outcome and show it to you before anything is written.
2. I run the script with `--on` set to the date you choose, which must be 29 November or later and not in the future.

```
python3 -I settle_watch.py --content content/era3.json --op W013 --on 2026-11-30 --outcome-file outcome.txt --source https://... --sourcing SOURCING_2026.md
```

3. I run the checks.
   - The freeze test and validation of all four content files.
   - The replay of every earlier result code.
   - The style lint and a browser run on the rebuilt 2026 build.
4. I rebuild the package and give you an upload set. You replace the 2026 folder with your file manager. Saved progress and result codes stay valid, because settling changes no mechanic.

## Tested now

The script was run on a copy of the content with a dummy outcome, and the copy was never shipped. The dummy run showed these results.

- Each of these is refused.
  - A text that names a party, a candidate or a winner.
  - A text with a semicolon.
  - A date in the future or before 29 November.
  - A second settling.
- The content diff is exactly four lines. They are the brief, the record, the status and nothing else.
- The freeze test passes, which now allows a watch to go from open to settled and allows nothing else about its status.
- All 320 earlier result codes verify against the settled copy, and a W013 run gives the same result before and after.
- The operations list and the operation page show "Settled 29 November 2026" with no console errors.

## Still open and linked to this step

- **R6.** The forecast page carries claim R6 on the same vote, by the owner's decision of 15 October 2026. Its result goes in at the desk as the scoring log records it, apart from settling W013.
- **W014.** The Special Budget is not a watch and needs no settling.
