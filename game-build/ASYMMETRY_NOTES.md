# Notes, the asymmetry band and the evidence pipeline, 13 October 2026

The game tests whether a rule can be written down and played. It proves nothing about the world. This file says what the new band does, what each permit rests on and where the numbers come from.

## What the band is

Two operations in the 2026 build, W017 The Reach and W018 The Wallet, form an asymmetry band. They play at Tier 6 and are tuned much harder than any other operation. The best scripted line wins about 1.6 percent of W017 and 1.4 percent of W018.

**Tier 7 was not built.** The engine, the result codes and the challenge links all carry a tier from 1 to 6, and a seventh tier would touch every one of them. The band reaches the same result with a flag on the operation. A tier 7 can follow later if you want the number to show.

## How the permits work

An operation in the band lists reach moves. A reach move is an act with a strong effect, such as ordering a firm to hand over its data. Each faction holds a permit for each move.

| Permit | What it means for the player | What the game does |
|---|---|---|
| Barred | The law closes the act to the player's side. | The board lists it as closed, with its evidence. A player cannot use it. |
| Priced | The act works, and it costs legitimacy. | The act works at once. It costs legitimacy, feeds the rival and counts as an act against the player's own position in the report. |
| Free | A lawful substitute. | It works, with a weaker effect, and costs nothing beyond its actions. |

The rival's scripted acts carry a tag naming the move they mirror. The report then says how many times the rival used each act that was closed to the player.

The player's side is always the United States and its allies in these two operations. The permits are written for the United States, which is where the constraint evidence comes from. Allies differ in detail, so the permits are a simplification and the page says they are the game's reading.

## What the two operations teach

- A scripted player that uses only the free, lawful moves does best.
- A player that takes the priced shortcut does worse. The ancestry move relieves pressure at once, and it costs 8 legitimacy, adds a slope to Association and gives the rival leverage. This is the book's own argument. Suspicion by ancestry is the outcome the Party wants.
- The same holds for freezing accounts without a court in W018. Democracies have done it, and the cards record what followed.

Both results come from the rules and the numbers. Neither is scripted.

## The evidence pipeline

The pipeline lives in `evidence/` and has four parts.

1. `extract_candidates.py` reads the sourced case and part files and writes one candidate per cited sentence. It found 129 candidates in 10 files, with the footnote text joined to each. The act class it suggests is a guess and needs review. 110 of the 129 had no match.
2. `cards.json` holds the 19 cards a reviewer accepted. Each card states one thing in the game's words and names the book sentence it rests on. Status reviewed means the claim matches its source line. It does not mean anyone has checked the source independently. A card marked Check needs that before anyone relies on it.
3. `build_evidence.py` validates the cards and refuses any that break a rule.
   - The actor is the Party-state, a named agency, a named government or a free society. A people is never the actor.
   - No card names an individual or states a Xinjiang or detention figure.
   - An F card cites a document, a statute or a record. An I card says whose argument it is.
4. `import_notes.py` turns raw notes into drafts. A draft is not a card. It lists its own problems so a reviewer sees them first.

`band/build_band.py` then builds the operations. It copies each evidence line from the card, so no line in the game is retyped. It refuses a move whose cards do not fit its permit.
- A barred move needs a constraint or guardrail card and a card on the Party's side.
- A priced move needs a democracy record or a guardrail.
- A free move needs a lawful tool or a constraint.

The corpus is small. The repo files hold 129 footnoted sentences, and 19 became cards. To ingest more, send notes in the template at the head of `import_notes.py`. The same checks apply.

## Where the evidence is thin

- **EV-004** is the book's argument that the statute puts relatives within reach. The book states it as inference, and so does the card.
- **EV-019 and EV-020** are primary US texts and not from the book files. They are marked Check.
- Nine cards rest on book footnotes that I could not read at the source from here. Each is marked Check. They are EV-003, EV-005 to EV-008, EV-011 to EV-013 and EV-016.
- The record text of W017 and W018 states only what these cards state. The script beats and the reading are labeled as scenario.

## What I left out

- The scenario in which a leader's family member is taken hostage. It names a private individual, and it stays out as before. The move named "Press the relatives of a person abroad" names nobody and describes an institutional act.
- Any Xinjiang or detention figure, under the repo rule on contested numbers.
- Any claim that treats a people as the actor. The cards say the Party-state, and the ancestry card says the Party wants suspicion by ancestry.

## On the 99 percent

The number is the best scripted line, not a person. A player who reads the board may do better. Nor is it a claim about the real world. A tuned game fixes the odds that the designer chose, and the designer chose them to match a reading of the evidence.

## Checks run

- 15 new tests in `test/reach.test.js`.
  - The engine rules and the code round trip.
  - The validator and the importer.
  - The evidence cited by every move.
- All earlier tests pass. The 320 earlier result codes and the 148 original-engine codes verify. The earlier operations are byte for byte unchanged.
- Browser run at 1280 and 390 pixels with no console errors and no horizontal overflow.
