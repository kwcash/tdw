# CLAUDE.md — totaldomainwar.com

Project instructions for Claude Code. Read this before changing anything in this repo.

---

## What this site is

A single-page launch site for the book *Total Domain War*, plus a reading page for the opening chapter. Static HTML, no build step, no framework, no dependencies. Two files do the whole job.

Audiences, in the order they matter: general educated readers, policy and defense professionals, press, publishers and agents.

---

## Hard constraints

These are not style preferences. Breaking any of them breaks the book's argument or its credibility.

### 1. The Party is not China

The site must never treat "China," "the Chinese," or "Chinese people" as the adversary. The actor is always **the Chinese Communist Party**, the Party, the regime, or Beijing.

The book's own position: the Chinese people are this method's first and longest-suffering victims, not its authors. The distinction is load-bearing analysis, not politeness. Any copy that blurs it must be rejected.

Write "the Chinese Communist Party," never "the China Communist Party."

### 2. The twelve domains are fixed and must match the book

In this exact order:

1. Kinetic
2. Economic
3. Financial
4. Information
5. Psychological
6. Legal
7. **Association**
8. Cyber
9. Cultural
10. AI and Cognitive
11. Biological
12. Data and Surveillance

An earlier version of this site listed **United Front** at 6 and **Asymmetric** at 7, with no Kinetic domain. That architecture is superseded and must not return.

Asymmetry is a **dimension**, not a domain. The book argues at length that treating it as a battlefield is a category error. Listing it as a domain would make the site commit the error the book corrects.

### 3. The title is *Total Domain War*

Not "Total Domain Warfare." The earlier site used the longer form; the book does not.

### 4. Contested numbers stay conservative

The book deliberately narrows twelve figures that circulate in stronger form. Site copy must not restore the stronger versions. In particular:

- American WWII production: **"out-produced the Axis powers combined in munitions."** Not "out-produced every other combatant," which does not survive specification.
- Do not add Xinjiang detention or birthrate figures to the site. The book scopes these carefully and the site has no room to do so responsibly.

If a proposed edit adds a striking statistic, check it against the book's Sourcing Status sections before publishing.

### 5. Accessibility floors

All text must meet WCAG AA against its background. Current measured ratios:

| Element | Ratio |
|---|---|
| Body text | 12.25:1 |
| Dimmed text | 4.83:1 |
| Bronze accent | 4.80:1 |
| Button | 13.75:1 |

**Verify with a computed-style check after any colour change, not by eye.** See the known bug below.

---

## Known bug, do not reintroduce

The call-to-action button once rendered as brass text on a brass background — invisible.

Cause: the button sat inside `<p class="m contact">`, and `.contact a{color:var(--signal)}` (specificity 0-1-1) outranked `.cta{color:var(--ink)}` (0-1-0).

Fix in place: the rule is `a.cta`, declared **after** `.contact a`, and the `contact` class was removed from that paragraph. Hover and focus states set `color` explicitly so neither can inherit.

**If you touch button or link styling, re-check the computed colour**, don't assume the cascade resolved as intended:

```js
getComputedStyle(document.querySelector('a.cta')).color
```

---

## Design system

Defined as CSS custom properties in `:root`. Change them there, never inline.

```css
--ink:      #D9E4EC   /* page background */
--ink-2:    #E9F0F5   /* raised panels */
--ink-3:    #C6D6E1
--rule:     #A9BECD   /* hairlines */
--bone:     #152430   /* body text */
--bone-dim: #4E6375   /* secondary text */
--signal:   #8A5514   /* bronze accent */
```

**Three rules assume the current light ground** and must be updated together with any palette change:

- `.box.empty` — warm sand fill `#F3E7D6` plus bronze inset rule
- `a.cta` — dark fill, light text
- `a.cta:hover` — explicit background and colour

A dark palette is preserved in git history. If reverting, change all seven variables plus those three rules. Changing `--ink` alone leaves panels and rules mismatched.

**Type:** Archivo for display and labels, Source Serif 4 for body. Loaded from Google Fonts with system fallbacks. Do not add a third family.

**The accent is spent in one place.** The empty box in the four-box grid is the only element permitted to shout. Adding more bronze emphasis dilutes the one thing the hero exists to do.

---

## The four-box hero

Three cells record a capability that was present; the fourth records its absence. It is the book's thesis delivered before the visitor reads a paragraph.

**Keep the 2×2 on mobile.** The matrix *is* the comparison. Collapsing it to one column destroys the argument. Below 400px the explanatory notes hide and it becomes a four-cell grid — that is intentional, not a fallback.

---

## Deployment

Static files. No build. `index.html` and `prologue.html` at the site root.

### Unresolved: www vs apex

`www.totaldomainwar.com` and `totaldomainwar.com` have served **different content**. During the rewrite, the apex served the new page while www served a cached or separate deployment of the superseded version.

Before sending the site to anyone, verify both hostnames return the current build. The footer carries a build stamp for exactly this purpose.

Fix, depending on host: set a permanent redirect from one hostname to the other so a single canonical origin serves both, and purge the CDN cache after each deploy.

### Verification after every deploy

```bash
for h in "https://totaldomainwar.com" "https://www.totaldomainwar.com"; do
  echo "== $h"
  curl -s "$h/?cb=$(date +%s)" | grep -o "build [0-9-]*"      # build stamp
  curl -s "$h/?cb=$(date +%s)" | grep -c "United Front"        # must be 0
  curl -s "$h/?cb=$(date +%s)" | grep -c "Total Domain Warfare" # must be 0
  curl -s -o /dev/null -w "prologue: %{http_code}\n" "$h/prologue.html"
done
```

The two `grep -c` checks must both return `0`. A non-zero result means a stale version is being served.

**Bump the build stamp in both footers on every deploy.** It is the only reliable way to tell a fresh load from a cached one.

---

## Adding chapters

`prologue.html` is the template. Copy it and replace the prose.

Each chapter page must carry its **Sourcing Status** section. It is not optional matter. For policy readers, press, and agents it is the most persuasive thing on the page, because it shows the book separating documented fact from argued inference and correcting its own errors in public.

Pages circulated privately before launch should carry:

```html
<meta name="robots" content="noindex">
```

Remove that line when the page goes public. `prologue.html` currently has it.

---

## House style

The book's editorial rules apply to site copy:

- Active voice. Name the actor.
- No em-dashes. Use separate sentences or a plain connector.
- Maximum two commas per sentence; split rather than extend.
- No colons or semicolons in body prose.
- One strong verb beats a weak verb plus an adverb.
- Cut any word that does not advance the argument.
- No meta-commentary about the text itself.

---

## Before you commit

1. Domain list matches the twelve above, in order.
2. No occurrence of "United Front," "Asymmetric" as a domain, or "Total Domain Warfare."
3. No occurrence of "China Communist Party."
4. Contrast verified by computed style, not by eye.
5. Build stamp bumped in both footers.
6. Rendered and checked at 1280px and 390px.
