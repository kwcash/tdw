# Notes, E011 The Manchurian Trap and acts against one's own position, 13 October 2026

This file belongs to the 1931 build. It lists what E011 asserts from the record, what the game assumes, and what the new rules do. The game is a test of whether a rule can be written down and played. The game proves nothing about the past.

## What the record gives (check before relying on it)

| Claim in the operation | Class | Note |
|---|---|---|
| The Nationalist government kept strong forces in the cities of Manchuria from 1946 | Check | General knowledge of the civil war. Confirm against a standard history of 1946 to 1948. |
| The garrisons in Changchun, Shenyang and Jinzhou depended on supply by rail and by air | Check | Changchun was supplied by air in 1948. Confirm the date and the other two cities. |
| The Party besieged Changchun from May 1948 and took it in October | Check | Confirm the start of the siege and the day of the surrender. |
| The Liaoshen campaign ran from September to November 1948 | Check | Dates as commonly given. |
| By its end the Party held all of Manchuria | Check | |
| The Nationalists lost several hundred thousand troops there and sources differ on the count | Check | No figure is given on purpose. |

## What the game assumes (readings, not facts)

- **Cost 2, denial 1 for Manchuria.** The Nationalist government's reading of the garrisons' value is not on record as a number. The game scores Manchuria as costing more each turn than it denies, so it is a consuming holding. This is a designer reading and the page says so.
- **Cost 1, denial 2 for the south.** The cities, the ports and the customs revenue. The same caveat applies.
- **Giving up Manchuria costs 2 legitimacy.** This is a price chosen so that a withdrawal is not free. The number measures nothing.
- **The start state.** The Nationalist government begins with more shields in the Kinetic, Economic and Financial domains than the base case, which is what the tier needs.

## What the rule does

A **holding** is ground an actor has chosen to keep. Each live holding costs its holder a fixed number of points every turn. Shields go first and pressure takes the rest. The holding also keeps some leverage from the rival, which is its denial. A holding is **consuming** when its cost is higher than its denial. The holder can give a holding up for one action. It stops costing and stops denying, and its give-up price lands once.

Only operations that list holdings carry any of this. Every other operation has no holdings panel, no extra option and no extra state.

An **act against one's own position** is a turn of play that cuts the actor's own capacity. Five types are recognized and each is typed by what the act was when it happened, never by how the operation ended.

| Type | Where the game sees it |
|---|---|
| Predation on own base | E009. The exchange order that took the savings of the people the state relied on, on turn 3. |
| Overextension | E011. Each turn a consuming holding costs more than it denies. |
| Breach of own legitimating rule | E001. The Kwantung Army staff acting against the orders that gave it standing. |
| Purge of own capacity | Not used by an operation yet. |
| Withdrawal of own commitment | Not used by an operation yet. |

The report lists these acts for both sides, with the turns. A side with none shows "None recorded." The report does not say whether an act was a mistake.

**Not flagged.** Giving up Manchuria is a choice the player makes with the price shown. The report does not count it as an act against the player's own position. This is a design choice and the owner may reverse it.

## Tags added to old content

Three tags were added to existing content and name acts in the report only.

- E009, the turn 3 effect on the Nationalist government's legitimacy, tagged predation on own base.
- The leader `ching_kuo`, tagged predation on own base.
- The leader `kwantung_staff`, tagged breach of own legitimating rule.

No mechanic changed. The 320 result codes made before this change, in all four content sets, verify to the same results.

## Verification

- 12 new tests in `test/holdings.test.js`.
- 320 earlier result codes verify identically.
- 148 codes made by the original engine still verify.
- 372 new games round-trip through result codes.
- All four content files validate. The freeze check passes, with the three tags above ignored as report-only.
- Browser run on the 1931 build at 1280 and 390 pixels with no console errors and no horizontal overflow. An old 1931 save and an old code load and verify in the new build.
