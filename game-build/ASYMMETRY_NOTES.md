# Notes, the asymmetry band and the evidence pipeline, 13 October 2026

The game tests whether a rule can be written down and played. It proves nothing about the world. This file says what the new band does, what each permit rests on and where the numbers come from.

## What the band is

Three operations in the 2026 build form an asymmetry band. They are W017 The Reach and W018 The Wallet, with W019 The Lab added later. They play at Tier 7, the new top tier. The best scripted line wins about 1.1 percent of W017 and 2.2 percent of W018. It wins 1.6 percent of W019.

**Tier 7 is a real tier.** See TIER7_NOTES.md. The permits work at any tier, and the band operations are set to Tier 7 by the record.

## How the permits work

An operation in the band lists reach moves. A reach move is an act with a strong effect, such as ordering a firm to hand over its data. Each faction holds a permit for each move.

| Permit | What it means for the player | What the game does |
|---|---|---|
| Barred | The law closes the act to the player's side. | The board lists it as closed, with its evidence. A player cannot use it. |
| Priced | The act works, and it costs legitimacy. | The act works at once. It costs legitimacy, feeds the rival and counts as an act against the player's own position in the report. |
| Free | A lawful substitute. | It works, with a weaker effect, and costs nothing beyond its actions. |

The rival's scripted acts carry a tag naming the move they mirror. The report then says how many times the rival used each act that was closed to the player.

The player's side is always the United States and its allies in these two operations. The permits are written for the United States, which is where the constraint evidence comes from. Allies differ in detail, so the permits are a simplification and the page says they are the game's reading.

## What the operations teach

- A scripted player that uses only the free, lawful moves does best.
- A player that takes the priced shortcut does worse. The ancestry move relieves pressure at once, and it costs 8 legitimacy, adds a slope to Association and gives the rival leverage. This is the book's own argument. Suspicion by ancestry is the outcome the Party wants.
- The same holds for freezing accounts without a court in W018 and for a broad criminal initiative in W019. Democracies have done both, and the cards record what followed.

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

## The second batch

The second batch came through the importer.

1. `band/batches/batch2_notes.md` holds 12 notes in the template. Each names the book sentence it rests on in a `from` field. Two lines are primary texts and not from the book files.
2. `import_notes.py` turned them into 12 drafts and found no problems.
3. `promote_drafts.py` promoted the 12 drafts into cards EV-021 to EV-032. A draft with problems is refused, and no earlier card changes.
4. `build_evidence.py` validated all 31 cards, and checked that each `from` names a candidate that exists.
5. `band/build_band.py` built W019 from the cards. Its moves cite 21 distinct cards.

The cards cover four things.
- The Party-state's side. The cards cover the Thousand Talents program and the Hong Kong law kept secret until it took effect.
- The records of democracies. The cards cover the Justice Department's China Initiative and the exclusion of Japanese Americans in 1942, with the 1988 redress.
- Lawful tools. The cards cover the Higher Education Act disclosure rule and the Foreign Agents Registration Act.
- Limits in law. The cards cover the Entity List and a court's verdict for Fujian Jinhua.

W017 and W018 are byte for byte what shipped on 14 October. Their `handScale` and moves are unchanged, so every result code made on them stays valid. A test checks this against the shipped file. New material goes into new operations.

The corpus is still small. The repo files hold 129 footnoted sentences, and 31 are now cards. The review package's evidence log is mostly commentary and 2026 intelligence items. Four items there would qualify as cards, and each is already used in W015 or W016 or names a private individual, so I left them out. To ingest more, send notes in the template at the head of `import_notes.py`. The same checks apply.

## Where the evidence is thin

- **EV-004** is the book's argument that the statute puts relatives within reach. The book states it as inference, and so does the card.
- **EV-019 and EV-020** are primary US texts and not from the book files. They are marked Check.
- The book says the Thousand Talents program ran for sixteen years before Western agencies treated it as one campaign. The cited Senate report is from November 2019, and the program began in 2008. I left the number out of the game and listed the mismatch in the sourcing list.
- Nine cards rest on book footnotes that I could not read at the source from here. Each is marked Check. They are EV-003, EV-005 to EV-008, EV-011 to EV-013 and EV-016.
- The record text of W017 and W018 states only what these cards state. The script beats and the reading are labeled as scenario.

## What I left out

- The scenario in which a leader's family member is taken hostage. It names a private individual, and it stays out as before. The move named "Press the relatives of a person abroad" names nobody and describes an institutional act.
- Any Xinjiang or detention figure, under the repo rule on contested numbers.
- Any claim that treats a people as the actor. The cards say the Party-state, and the ancestry card says the Party wants suspicion by ancestry.

## On the 99 percent

The number is the best scripted line, not a person. A player who reads the board may do better. Nor is it a claim about the real world. A tuned game fixes the odds that the designer chose, and the designer chose them to match a reading of the evidence.

## Checks run

- 18 tests in `test/reach.test.js`.
  - The engine rules and the code round trip.
  - The validator and the importer.
  - The evidence cited by every move.
  - The importer, the promoter and the file of shipped operations.
- All earlier tests pass. The 320 earlier result codes and the 148 original-engine codes verify. The earlier operations are byte for byte unchanged.
- Browser run at 1280 and 390 pixels with no console errors and no horizontal overflow.
