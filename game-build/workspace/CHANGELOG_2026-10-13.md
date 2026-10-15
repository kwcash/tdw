# Changelog, 13 October 2026

Update to the 2026 build and its landing page. Two new operations follow the two best-sourced items of the 12 October intake. Saved progress and result codes from the earlier build stay valid. The storage key `tdw-2026-1` is unchanged.

## New operations

- **W015 The Shadow Fleet.** Lever Economic. Dimension Entropy. Tier 4. Stage Extract. Signature S21, S12 and S36. Factions USA_Allies, PRC_State and Iran_Axis, with the oil shield pact. Leaders: the sanctions office, the independent refiners and the shadow fleet. The record gives Treasury's designations of 8 October 2026 and states its effect claim as a claim.
- **W016 The Seized Botnet.** Lever Cyber. Dimension Topology. Tier 5. Stage Control. Signature S13, S10 and S22. Factions USA_Allies and PRC_State. Leaders: the cyber operators, the Justice Department and the FBI, and the cyber contractors. The record gives the court-ordered seizure of 8 October 2026 and calls the attribution an allegation.
- **Balance.** Both operations are tuned with `handScale` only (W015 0.65, W016 1.06). See BALANCE_2026-10-13.md.
- **Placement.** Neither operation is in a campaign arc or in the daily. Adding a node to an arc changes the campaign tier of every node after it, so these two stay in free play until you choose to add them.

## Content file

- Two new leaders in the registry: `justice_fbi` and `cyber_contractors`. No existing leader changed.
- `copy.hero` and `copy.opsNote` now say sixteen operations.
- `daily` is unchanged and still lists W001 to W012.
- Every field of every existing operation is unchanged, including W013 and W014. The file `test/freeze.js` checks it against the 12 October build.

## Pages and notes

- 2026 `index.html`: the meta description says sixteen operations. Cache keys moved from `?v=4` to `?v=5`.
- Root `index.html`: the 2026 card hook reads "Twelve domains. Sixteen operations." The body and the small line carry the date 13 October 2026. The chips read 16 operations, 12 domains and All 36 stratagems. Nothing else on the page changed.
- `NOTICE.txt` carries the change date and names the two new operations.
- `SOURCING_2026.md` has nine new rows for W015 and W016, each marked Check. The primary sources are the Treasury release and the Justice Department release, both logged in the review package. I could not open either from this environment.
- The game code is unchanged from the 12 October build.
