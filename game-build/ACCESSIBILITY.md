# Accessibility audit

This file logs each accessibility audit of the four builds, what it found and what changed. `workspace/e2e/a11y.js` runs the automated part in a browser. `workspace/test/a11y.test.js` runs with every check and keeps the fixes in place.

## Audit of 15 October 2026

### How it ran

- **Rules.** The axe-core checker tested WCAG 2.1 levels A and AA on twelve views. Five were the home page, the operations list, a briefing and two boards. Four were the campaign, the codex, the records and How to play. The last three were the glossary, the progress page and the forecast page. It ran in the light theme, in the dark theme and at 200 percent zoom.
- **Zoom.** Each view ran at 640 pixels wide, which matches a 1280 pixel screen at 200 percent zoom. The script looked for any sideways scroll.
- **Keyboard only.** The script reached the Start button with the Tab key and played a whole run with Tab and Enter alone. It checked that every control the Tab key reached showed a focus ring.
- **Screen reader structure.** The script checked for one main heading on each view, a main landmark, a skip link and the page language. It also checked that the board reads out each turn.

### What it found

| Finding | Where | Severity | Status |
|---|---|---|---|
| The small red label above each title had a contrast of about 1.9 to 1 on light pages. The standard asks for 4.5 to 1. | Briefing and board, all builds | Serious | Fixed |
| The watch label on the operations list fell just short of 4.5 to 1. | 2026 operations list | Serious | Fixed |
| White text on the red primary buttons reached only about 3.6 to 1 in the dark theme. | Every page with a primary button | Serious | Fixed |
| The gate badge on a board tile failed in the dark theme. | Board | Serious | Fixed |
| The board drew a fresh live region each turn, so a screen reader could miss what happened. | Board | Serious | Fixed |
| The warning about unspent actions changed the button label only, which a screen reader may not read. | Board | Moderate | Fixed |
| No sideways scroll at 200 percent zoom. | All views | None | Pass |
| Every Tab stop on the board showed a focus ring. A whole run played by keyboard alone. | Board | None | Pass |
| Each view has one main heading, a main landmark, a skip link and its language set. | All views | None | Pass |

### What changed

- The label colour now comes from a theme token. It reads dark red on light pages and keeps its pale red on the dark home banner and in the dark theme.
- The primary buttons and the lever badge use a darker red in the dark theme. The warning colour is a little darker in the light theme.
- The board keeps one live region on the page from its first draw. After each turn it reads out the turn number and what happened, or that nothing landed. It also reads the warning about unspent actions.
- The four new announcements live in `src/help.json`, where the style lint reads them.

After the fixes the audit reports no WCAG 2.1 A or AA violation in either theme or at 200 percent zoom.

### What still needs a person

- **A real screen reader.** The audit checks structure and the live region, not the experience. A person should play one run with NVDA on Windows or VoiceOver on a Mac or phone. They should note anything read twice, read out of order or never read. PLAYTEST.md asks for one such session.
- **The four second window.** A second press of End turn must come within four seconds when actions remain. A screen reader user may need longer. The playtest should note whether it causes trouble.
- **Colour alone.** The action meter states its count in text. A person should confirm that nothing else on the board relies on colour alone, such as the red pressure bars.
- **Phones.** The audit ran in a desktop browser at phone width. A session on a real phone with large text set in its system settings would confirm the layout.
