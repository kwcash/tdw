s = open('SOURCING_2026.md').read()
def rep(a, b):
    global s
    assert s.count(a) == 1, (s.count(a), a[:70])
    s = s.replace(a, b)

rep("# Sourcing list for TDW 2026\n\nThe twelve operations in the 2026 build state a record and then a reading.",
    "# Sourcing list for TDW 2026\n\nUpdated 12 October 2026.\n\nThe fourteen operations in the 2026 build state a record and then a reading.")
rep("**GK** general knowledge.\n\nStatus keys.", "**GK** general knowledge. **F1 to F12** the facts of the 12 October 2026 Taiwan update, each with its own URL in the row.\n\nStatus keys.")
rep("| W001 | The American count had fallen to a handful by 2023 | PB 3.6 (GAO, Oct 2023) | Use |",
    "| W001 | The American count had fallen to fewer than five by January 2023 | https://www.gao.gov/products/gao-24-105981 (GAO-24-105981, 30 Oct 2023: about 100 in 2019 to fewer than five. The survey ran in January 2023) | Use |")
rep("| W002 | Coast guard entries off Kinmen on 8, 10 and 11 September 2026 | MAP event 1 (AEI China & Taiwan Update, 2 Oct 2026) | Use |",
    "| W002 | Coast guard entries off Kinmen on 8, 10 and 11 September 2026 | MAP event 1 (AEI China and Taiwan Update, 2 Oct 2026). One secondary source covers all four September 2026 events on this page (Kinmen, Pratas, 181 incursions, Batanes). To obtain: Taiwan's defense ministry daily reports and the Philippine Coast Guard statement | Use, secondary only |")
rep("| W002 | Pratas circled on 7 and 8 September 2026 for more than 24 hours | MAP event 2 (AEI, 2 Oct 2026) | Use |",
    "| W002 | Pratas circled on 7 and 8 September 2026 for more than 24 hours | MAP event 2 (AEI, 2 Oct 2026) | Use, secondary only |")
rep("| W002 | 181 PLA aircraft entered the air defense identification zone in September 2026 | MAP event 3 (AEI, 2 Oct 2026) | Use |",
    "| W002 | 181 incursions by PLA aircraft into the air defense identification zone in September 2026. The record text says the aircraft \"entered the zone 181 times that month\" | MAP event 3 (AEI, 2 Oct 2026). Primary source to obtain: Taiwan's defense ministry daily reports | Use, secondary only |\n"
    "| W002 | On 9 October 2026 four China Coast Guard ships entered the restricted waters off Kinmen and Taiwan's coast guard expelled them | F1: https://www.taiwanplus.com/news/taiwan-news/military/261010006/taiwan-expels-four-chinese-coast-guard-ships-near-kinmen-on-eve-of-national-day | Use |\n"
    "| W002 | China's Maritime Safety Administration issued no-sail notices for five sea areas for PLA exercises from 12 to 17 October 2026. Taiwan's defense minister assessed that the areas lie off China's coast and that the exercises involve artillery only | F2: https://www.taipeitimes.com/News/taiwan/archives/2026/10/12/2003865828. The record text gives the notices as fact and the assessment as the minister's | Use |")
rep("| W003 | EU definitive duties on battery electric vehicles took effect 30 October 2024, from 17.0 percent for BYD to 35.3 percent for SAIC | PB E-10 link 1c (European Commission; EUR-Lex) | Use |",
    "| W003 | EU definitive duties on battery electric vehicles took effect 30 October 2024. They ran from 7.8 percent for Tesla's Shanghai plant to 35.3 percent for SAIC. BYD paid 17.0 percent | https://trade.ec.europa.eu/access-to-markets/en/news/eu-commission-imposes-countervailing-duties-imports-battery-electric-vehicles-bevs-china (Tesla Shanghai 7.8, BYD 17.0, Geely 18.8, other cooperating firms 20.7, SAIC and non-cooperating firms 35.3). The playbook's link 1c named only BYD, Geely and SAIC | Use |")
rep("| W005 | Police on the mainland have posted bounties for named Taiwanese | PB T3 (persons targeted under domestic law) | Check |",
    "| W005 | Police on the mainland have posted bounties for named Taiwanese | PB T3 (persons targeted under domestic law) | Check |\n"
    "| W005 | In October 2025 the National People's Congress Standing Committee named 25 October Taiwan Restoration Day, the date of Resolution 2758 | F12: https://subsites.chinadaily.com.cn/npc/2025-10/25/c_1135469.htm (headline only) | Check |")
rep("| W007 | The Treasury designated Hengli Petrochemical on 25 April 2026 and said the revenue helped fund Iran's military | PB E-10 link 4b | Check (a designation ground, not a finding of fact) |",
    "| W007 | The Treasury designated Hengli Petrochemical in April 2026 and said the revenue helped fund Iran's military. The record text says only \"In April 2026\" | PB E-10 link 4b says 25 April 2026. A copy of the Treasury release is dated 24 April 2026 (https://www.globalsecurity.org/wmd/library/news/iran/2026/04/iran-260424-treasury01.htm). That copy lists 19 designated persons and Hengli is not among them. Confirm the date and the legal basis on treasury.gov | Check (a designation ground, not a finding of fact) |")
rep("| W009 | Both Matsu cables stopped working in February 2023 | PB 1.6 (Matsu cables cut, F) | Use |",
    "| W009 | Both Matsu cables stopped working in February 2023. The text states the cuts and gives no cause. The playbook marks the cut F and cites no finding that the state ordered it, so any attribution is an inference | PB 1.6 (Matsu cables cut) | Use, for the cut only |")
rep("| W011 | The APEC summit is set for Shenzhen in November 2026 and Putin is due to attend | PB Russia theater | Use |",
    "| W011 | The APEC summit is set for Shenzhen in November 2026 and Putin is due to attend | PB Russia theater | Use |\n"
    "| W011 | After a Trump-Xi summit in Beijing in May 2026 the United States paused a record package of arms for Taiwan | F9: https://www.ajc.com/news/2026/09/taiwan-is-watching-closely-as-xi-and-trump-meet-and-hopes-us-will-keep-up-its-arms-sales/ ; https://www.bostonglobe.com/2026/09/28/nation/trump-asked-chinas-president-if-he-wants-to-buy-us-arms/ | Check |\n"
    "| W011 | In late September 2026 Xi made a state visit to Washington and the two sides extended their trade truce by a few months. The text does not say what the visit decided about Taiwan, because no source opened says | F8: https://www.csis.org/analysis/takeaways-trump-xi-white-house-summit ; the AJC link above. No source gives the end date of the truce | Check |\n"
    "| W011 | Both leaders intend to attend the Shenzhen summit on 18 and 19 November 2026 | F7: https://scmp.com/news/china/diplomacy/article/3357787/and-apec-makes-4-trump-pencils-another-big-china-trip-us-midterms-loom ; the CSIS link above. One SCMP report gives the dates | Check |")
rep("| W012 | A majority staff report of a House subcommittee reached a laboratory conclusion in December 2024, and the minority dissented | PB 3.9 | Use |\n",
    "| W012 | A majority staff report of a House subcommittee reached a laboratory conclusion in December 2024, and the minority dissented | PB 3.9 | Use |\n"
    "| W013 | Taiwan holds local elections on 28 November 2026 for 22 mayor and magistrate posts, and 11,051 officials in all | F4: https://en.wikipedia.org/wiki/2026_Taiwanese_local_elections (Central Election Commission data) | Check |\n"
    "| W013 | By 8 September 2026 Taiwan's Investigation Bureau had opened 54 cases of suspected foreign interference and electoral fraud, and prosecutors had tracked more than 200 suspicious financial transactions | F5: same Wikipedia page | Check |\n"
    "| W013 | The National Security Bureau warned in April 2026 that Beijing would interfere in the vote | F6: https://ianslive.in/china-set-to-interfere-in-november-elections-taiwans-national-security-bureau--20260407173121 (headline only) | Check |\n"
    "| W013 | The record ends on 12 October 2026 and the vote has not yet taken place. The reading and the script beats are a scenario and are labeled so. The operation is a watch with status open and settle date 29 November 2026 | Owner's rule: nothing after 12 October 2026 is record | Scenario |\n"
    "| W014 | Taiwan's legislature passed a special defense budget bill of NT$780 billion, about US$26 billion, after the executive proposed NT$1.25 trillion. The opposition had favored a framework of NT$380 billion plus additions. Analysts tied the final amount to American pressure before the Beijing summit. The passage date of 8 May 2026 is inferred from an article date, so the text says \"In May 2026\" | F10: https://scmp.com/news/china/politics/article/3353177/did-us-pressure-xi-trump-summit-force-kmt-hand-taiwans-defence-budget | Check |\n"
    "| W014 | Taiwan's 2027 defense budget is set to exceed 3 percent of GDP for the first time, and President Lai has pledged 5 percent by 2030 | F11: https://www.ajc.com/news/2026/09/taiwan-is-watching-closely-as-xi-and-trump-meet-and-hopes-us-will-keep-up-its-arms-sales/ | Check |\n"
    "| W014 | President Lai is named because the cited facts name the sitting head of state. He is not a candidate in the 28 November elections | Owner's rule | Rule |\n")
rep("\n## Rules applied\n", """
## Calendar

The "Next 120 days" panel lists public events only. It hides an entry once its date has passed. The note under it reads "Dates are scheduled or expected. Nothing here is a prediction."

| Date | Entry | Source | Status |
|---|---|---|---|
| 2026-10-12 to 2026-10-17 | PLA exercises in five sea areas off the mainland coast | F2, Taipei Times | Use |
| 2026-10-25 | Taiwan Restoration Day observance | F12, China Daily (headline only) | Check |
| 2026-11-18 to 2026-11-19 | APEC leaders meet in Shenzhen | F7, CSIS and SCMP | Check |
| 2026-11-28 | Taiwan local elections | F4, Wikipedia from CEC data | Check |
| 2026-12 | G20 leaders meet in Miami, Xi expected | F8, CSIS | Check |

## Rules applied
""")
rep("- Biology: no technical content. The op records governance and disclosure only.",
    "- Biology: no technical content. The op records governance and disclosure only.\n- No Taiwanese candidate is named and no candidate list. The game takes no side between Taiwan's parties. It shows no poll and no prediction of who wins. The text says \"the opposition\" and uses offices.\n- Nothing after 12 October 2026 is record. The vote and the December window appear only as a scenario or as a scheduled date.\n- The book's prediction ledger text does not appear in the game. Ledger ids may appear only as internal ref values, and none does.")
rep("- **Thirty-six stratagems.** Each stratagem is the signature of exactly one operation, three to an operation.",
    "- **Thirty-six stratagems.** W001 to W012 give each stratagem once, three to an operation. W013 and W014 repeat six of them (S7, S29, S20 and S33, S9, S4), so every stratagem still appears and six appear twice.")
rep("- **Twelve domains.** Each domain is the lever of exactly one operation.", "- **Twelve domains.** W001 to W012 make each domain the lever of one operation. W013 (Information) and W014 (Financial) add a second lever on those two.")
rep("| W012 The Unsupplied Data | Biological | Entropy | S20, S16, S27 |",
    "| W012 The Unsupplied Data | Biological | Entropy | S20, S16, S27 |\n| W013 The Ballot (watch) | Information | Phase | S7, S29, S20 |\n| W014 The Special Budget | Financial | Coherence | S33, S9, S4 |")
open('SOURCING_2026.md', 'w').write(s)
print('ok')
