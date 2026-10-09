# Futures: link check of the 35 existing source links

Run on GitHub Actions (`fetch-sources`), because this session cannot open the web. First pass: all 35 URLs, 
status and key-term coverage. Second pass: the 17 claims where terms were missing, with the text around each term.
A "supports" verdict means the page says what the sentence says. It does **not** mean a person has verified the case, and no case is marked `verified`.

## Result

- 35 links checked, 28 loaded (HTTP 200), 7 refused the runner (6 returned 403, 1 returned 402).
- Of the 17 claims read closely: 8 supported, 7 partly supported, 2 not on the page.

## The 17 claims read closely

| Case | Source | Verdict | Evidence |
|---|---|---|---|
| F001 | tsm.schar.gmu.edu | partly supports | "69% below August 2025's 555" is on the page. Nothing about President Trump or a Beijing visit, so the "no flights during the May visit" half is not supported by this link. |
| F001 | aljazeera.com | partly supports | Title: "US pausing $14bn arms sale to Taiwan due to Iran war, navy chief says"; Acting Navy Secretary Hung Cao. The May 22 article cannot support "September reports" about APEC in Shenzhen; the page has no APEC, Shenzhen or September. |
| F003 | english.gov.cn | not on the page | The communique speaks of "the Second Centenary Goal of building China into a great modern socialist country". The page has no "2027" and no PLA centenary goal. |
| F003 | aljazeera.com | partly supports | Published 21 Sep 2026: Zhang Youxia (CMC Vice Chairman) and Liu Zhenli (CMC member) expelled from the Party. Nothing on the page says the commission now holds only Xi and one vice chairman, or lists two vice chairmen. |
| F005 | nbcnews.com | partly supports | AP via NBC, dated Jan. 30, 2026: the Supreme Court "ruled late Thursday" (January 29, 2026) that the concession is unconstitutional. This supports the case date. Maersk, MSC and "interim" are not on the page. |
| F006 | focustaiwan.tw | partly supports | Dated 04/01/2026: a Chinese-flagged work barge is suspected of damaging a subsea cable off Dongyin (Matsu). The name "Hai Hong Gong 66", "March", "No. 3" and prosecutors are not on the page. |
| F017 | scotusblog.com | not on the page | The case page returned none of: February 20, IEEPA, fentanyl, struck, ruled. It may be a stub or rendered by script. Needs another source for the date and the holding. |
| F017 | whitehouse.gov | supports | Fact sheet dated November 1, 2025: Chinese commitments to "halt the flow of precursors used to make fentanyl". It places the deal "in the Republic of Korea" and does not name Busan. |
| F028 | armscontrol.org | supports | "New START ... expired Feb. 5". China's ambassador: "China will not take part in nuclear disarmament negotiations at this stage." |
| F007 | scmp.com | supports | Dated 5 Aug 2026: Ministry of Commerce tightened export controls on the drone supply chain and added six US entities to its countermeasures list, with a seventh named, Compliance Testing LLC. Check the count of seven against the primary notice. |
| F002 | taipeitimes.com | supports | "11,051 local public officials chosen across 8,906 electoral districts", elections Nov. 28. |
| F002 | focustaiwan.tw | supports | "The nuclear policy referendum will be held alongside Taiwan's nine-in-one local elections on Nov. 28." |
| F004 | taipeitimes.com | partly supports | Supports "three air force officers sentenced" (page dated Jul 16, 2026). Nothing about six service members in April 2026. |
| F004 | thedefensepost.com | supports | March 28, 2025: four soldiers sentenced; "three members of a military unit in charge of security for the Presidential Office" plus one defense-ministry soldier. |
| F029 | cov.com | partly supports | Supports the January 13, 2026 BIS rule and case-by-case review for H200 chips, and Trump's December 8, 2025 announcement. A 25 percent import duty is on the page; a revenue share of 25 percent and "capped volumes" are not clearly shown in what was read. |
| F010 | engadget.com | supports | Dec. 17, 2025, a Reuters exclusive: a prototype EUV machine by ex-ASML staff that generates the light but is "not yet making chips". |
| F014 | nbcnews.com | partly supports | Microsoft says a Chinese influence operation targets US down-ballot races. The page text read has no month, and does not show that the targets were chosen for criticizing the Party. |

## What this changes

- **F005, the Panama ruling date.** The AP report on NBC is dated Jan. 30, 2026 and says the court ruled "late Thursday", which is January 29. The case is right on the date. Appendix H note 13 ("reported from late February 2026") looks wrong and should be checked.
- **F001, the Trump-visit claim and the September APEC reports** are attached to links that cannot support them (one has no mention, one predates the reports). They need their own sources.
- **F003, the PLA 2027 goal.** The Fourth Plenum communique does not state it. Another source is needed, for example the 2025 Pentagon China report, which the F028 link already points to.
- **F017, the Supreme Court ruling.** The SCOTUSblog case page did not show the holding. Use the opinion or a news report.
- **F004, six service members in April 2026** has no source on the page it is attached to.

## Loaded, with every key term found (not read closely, so not claimed as supporting)

F003 (aljazeera.com), F011 (nbcnews.com), F011 (state.gov), F016 (davispolk.com), F016 (wilmerhale.com), F026 (cisa.gov), F026 (cyberscoop.com), F028 (fas.org), F029 (cov.com), F032 (english.gov.cn), F047 (newsroom.tiktok.com).

## Refused the runner (open these by hand)

- F005: https://www.iisd.org/itn/2026/04/21/panama-faces-usd-2-billion-claim-after-supreme-court-annuls-strategic-port-concessions/ (HTTP 403)
- F006: https://www.globalsecurity.org/wmd/library/news/taiwan/2025/taiwan-250612-cna05.htm (HTTP 402)
- F014: https://openai.com/index/prc-linked-influence-operations-ai-debates/ (HTTP 403)
- F025: https://www.supplychaindive.com/news/us-china-to-extend-trade-war-truce-by-2-months/831251/ (HTTP 403)
- F031: https://topics.amcham.com.tw/2026/04/energy-security-returns-to-the-forefront/ (HTTP 403)
- F034: https://www.aei.org/commentary/china-taiwan-update-august-28-2026/ (HTTP 403)
- F049: https://openai.com/index/prc-linked-influence-operations-ai-debates/ (HTTP 403)

## Loaded but too thin to judge

- F012: `opendoorsdata.org/` is the site landing page. It has none of the figures. Link a specific Open Doors page for 277,398.
- F007: the FCC link is a PDF; only its status was checked.
