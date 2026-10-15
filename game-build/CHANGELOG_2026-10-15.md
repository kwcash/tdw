# Changelog, 15 October 2026, all four builds

The first step of the player experience plan. How to play covers the newer rules, each panel explains itself the first time it appears, and two guided runs teach holdings and reach. Saved progress and result codes from the earlier builds stay valid. No storage key changed. No operation changed, and the engine is byte for byte the engine of 14 October.

## How to play

- A row of links at the top jumps to each section.
- **Tiers** is new in every build. It covers Tiers 1 to 6, Tier 7 and where each tier applies.
- **Holdings** is new in the 1931 build. It covers cost and denial, a consuming holding and giving one up.
- **Reach and permits** is new in the 2026 build. It covers open, priced and closed acts and what the report counts.
- **Forecast** is new in the 2026 build. It covers locking a forecast, the Brier score and where results come from.
- A section shows only in a build that has its rule. A link of the form `#/how?s=tiers` opens the page at that section.

## First-use hints

- The board shows a short note the first time a panel appears. It covers Factions and Leaders. It also covers Holdings, Reach and the Tier 7 board.
- The Forecast page has no hint, because its own intro already says the same. It links to the Forecast section of How to play instead.
- One hint shows at a time. **Got it** dismisses it, and the next one follows. Where How to play has a matching section, the hint links to it.
- Each hint and coach step names its text for a screen reader. After a dismissal focus moves to the next note and scrolls it clear of the header and the end bar.
- The save keeps the hints a player has read, so they stay dismissed after a reload and return after **Clear my progress**. Boot camp and the guided runs show no hints, because their coach covers the same ground.

## Guided runs

- **Holdings in six turns** in the 1931 build. It plays E011 The Manchurian Trap at Tier 1 for six turns with seven coach steps.
- **Reach in six turns** in the 2026 build. It plays W017 The Reach at Tier 1 for six turns with seven coach steps.
- A player starts one from How to play, from the operation page of E011 or of a band operation, or from Home once boot camp is done.
- Each step shows when the board reaches it. For example, the step that says to give up Manchuria shows only while Manchuria is consuming. A player who gives up the south instead gets a step about that.
- The run keeps the steps a player has dismissed, so a reload resumes the coach and a new run starts it again. Steps count in the order the player sees them.
- A guided run grants no lens and opens nothing in a campaign. Finishing one marks it done in the save and hides its card on Home and on its operation pages.
- A guided run makes a result code with the new mode `guide`. The code verifies only at the guide's tier, seed and clock, with no lens and no doctrine card. Every earlier code verifies as before.
- `content/guides.json` holds the guides. `content/add_guides.py` copies each one into the content file of its build and touches nothing else.

## Independent review

Four reviewers read the change before release, each from one angle. One read for correctness and old saves. One read for the standing rules and house style. The other two read for accessibility and for security. They found 14 distinct problems, and all 14 are fixed.

- Tier 7 text said Tier 7 sits above the hardest tier on the record. The band operations set Tier 7 as their record tier, so the text now says Tier 7 sits above Tier 6.
- The reach guide said the rival made a firm hand over its records. The game's event says it asks, and the guide now matches.
- The Tiers text said every tier brings Consume closer. Tier 3 and Tier 4 share a clock, so the text now names what each step changes.
- The Holdings text mentioned coupled costs that no shipped holding has. The clause is gone.
- The holdings guide praised giving up Manchuria when a player gave up the south. Its steps now check each holding by name.
- Dismissed coach steps could carry over to a later run after Clear my progress. The run now keeps them.
- Focus could land under the sticky end bar, and a How to play heading could land under the header. Both now stay in view at 1280 and 390 pixels and at 200 percent zoom.
- A finished guided run stayed on offer on its operation pages, and the Home card label named no panel. Both are fixed.

## What did not change

- The engine. A test compares it with the engine of 14 October.
- Every operation, arc, daily pool and registry entry. A test compares both changed content files with their earlier copies, apart from the new `guides` key.
- W017 and W018, byte for byte, and so every result code made on them.
- Balance. No operation and no tier changed, so this release has no balance note.

## Files

- `parts/help.json` holds the help text for all four builds. `patch-v9.py` embeds it in the bundle.
- `patch-v9.py` turns the v8 bundle into the v9 bundle. `out/*.v8.js` and `parts/style.v8.css` keep the previous version.
- `release.py` builds the packages, the zips and the mirrors. It refuses to run unless every check passes.
- Cache keys moved to `?v=5` for the base game, `?v=6` for 1931, `?v=5` for 2030 and `?v=10` for 2026. Each `NOTICE.txt` names the change.

## Checks run

- 16 new tests in `test/guide.test.js` and every earlier test. 320 earlier result codes verify, and so do 148 original-engine codes.
- `test/shim-harness.js` is new. It runs the in-browser save logic under Node, so a test can play a guided run and load an old save.
- `parts/help.json` and `content/guides.json` pass the style lint and a check for colons and semicolons.
- Browser run `e2e/v9.js` on all four builds at 1280 and 390 pixels. It covers the new sections and every hint, each dismissed by keyboard with a check that focus stays in view. It plays both guided runs and checks their codes. It loads an old save in each build, and the old build reads a save the new one wrote. No console errors and no horizontal overflow.
