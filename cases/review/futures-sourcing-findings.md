# Futures sourcing pass: findings

Generated 2026-10-09 by `tools/findings.py --kind futures` from `decisions-log.jsonl`. Do not edit by hand; rerun the script.

## Read this first

- **Nothing here is `verified`.** `sourced` means a link was attached after a fetch tool read the page text for the key terms. It does not mean a person read the page against the sentence. `verified` needs a named person and a date, and the count is **0**.
- Government, court, statute, treaty, archive and official-body pages came first. Where only media, a think tank, a company, an NGO or a reference work had the fact, the link label says so and this file flags it. Primary sources have a perspective too: a PRC ministry page states PRC policy, a White House fact sheet states the US account, and a wartime document records what its author believed.
- Pages were read by a script on a GitHub Actions runner, which sees the text only. Scanned images, charts, tables rendered as images, and pages that block the runner were not read. Those cases are listed under "Checked, not settled".
- Anthropic, the vendor of the assistant that did this pass, authored some of the sources (F009[1], F009[2], F085[2]). Each is labeled as the company's own statement.

## Counts

- Futures: 100 cases, 307 record sentences, 176 now carry a link; 98 cases have at least one link.
- Decisions logged (latest per sentence): contradicted 1, partial 54, supported 87, unresolved 17.
- Checkable sentences with no link and no decision on file: 62.

## Contradicted by the source (1)

The page says something different from the sentence. The text was left unchanged. The author decides.

- **F036[1]** A February 2024 executive order funded American crane production.  
  The February 21, 2024 executive order (EO 14116) gave the Coast Guard cyber authority; it did not fund anything. The $20 billion port investment and the PACECO onshoring were announced the same day by the White House, separately (press call transcript, bidenwhitehouse.archives.gov). Suggested rewrite: "In February 2024 the White House announced more than $20 billion for port infrastructure and signed an executive order on port cybersecurity."

## Linked, but the link covers only part of the sentence (54)

The note says what the page supports and what is still open.

- **F013[0]** Authorities on the mainland barred a Wells Fargo executive who holds American citizenship from leaving the country in July 2025, and the bank suspended staff travel ther…  
  PRC MFA, July 21 2025: Mao Chenyue involved in a criminal case, subject to exit restrictions. Her U.S. citizenship and the bank's travel suspension are not on the page.
- **F015[1]** The Protecting Americans' Data from Foreign Adversaries Act of 2024 bars data brokers from selling Americans' sensitive data to entities controlled by a foreign adversar…  
  House-reported bill text: unlawful for a data broker to make sensitive data of a US individual available to a foreign adversary country or entity it controls. The enacted law is Division I of P.L. 118-50 (April 24, 2024) with slightly different wording ("personally identifiable sensitive data"). Replace with the enacted text.
- **F019[0]** The Justice Department charged two researchers from the People's Republic on June 3, 2025 with smuggling the crop fungus Fusarium graminearum into a University of Michig…  
  Docket: complaint sworn June 2, 2025 against Yunqing Jian and Zunyong Liu, orders to seal and unseal entered June 3, 2025, initial appearance June 3. The docket text does not name the fungus or the University of Michigan; the DOJ release (usao-edmi) was unreadable to the runner. 'Charged on June 3' is the unsealing date; the complaint is dated June 2.
- **F021[0]** The Party enacted the Anti-Foreign Sanctions Law in June 2021, and the Ministry of Commerce issued rules that let mainland parties sue firms that comply with foreign san…  
  MOFCOM Order No. 1 of 2021 (Jan 9 2021), Article 9: right to sue in people's court. The June 2021 Anti-Foreign Sanctions Law page failed on http; retry.
- **F021[2]** The Party has added American defense firms to its unreliable entity list many times since 2023.  
  MOFCOM announcement via the PRC embassy: six US firms (Shield AI, Sierra Nevada...) added to the unreliable entity list effective April 10, 2025 for Taiwan arms sales or military technology cooperation. Shows the practice; "many times since 2023" needs the earlier listings.
- **F029[0]** President Trump allowed H200 sales to mainland buyers on December 8, 2025 with 25 percent of revenue going to the United States.  
  BIS rule moves exports of the Nvidia H200 and equivalents to China and Macau from a presumption of denial to case-by-case review, with conditions. The 'December 8, 2025' announcement and the '25 percent of revenue' arrangement are not in the rule text; they come from the President's statements and need a White House or Commerce source.
- **F033[0]** Kinmen has drawn water from Fujian through an undersea pipeline since August 2018.  
  PRC state media; supports "since 2018", not the month. Replace with the Kinmen County Government page (certificate error from the runner) or a Taiwan government source.
- **F037[0]** The Commerce Department eased rules in 2019 and 2024 so American firms could keep working in standards bodies alongside listed mainland companies.  
  2024 interim final rule effective July 18, 2024; BIS lists a 08/19/19 general advisory opinion on standards with a listed entity. Whether 2019 "eased" rules is the case author's characterization; the opinion is a clarification.
- **F040[0]** The Defense Department's 2026 list of Chinese military companies grew by 65 names.  
  Federal Register notice of June 10, 2026 lists the entities (Alibaba, Baidu, BYD...). It does not say how many are new; the count of 65 comes from a law-firm client alert (secondary).
- **F040[2]** Federal research-security rules since 2021 require disclosure of foreign support and training.  
  NSPM-33 (Jan 14 2021) directs disclosure of potential conflicts of interest and commitment, including foreign ties. "Training" is not specifically shown.
- **F041[2]** American utilities added large amounts of battery storage in 2024 and 2025, much of it built with mainland cells.  
  EIA: utility battery capacity +66% in 2024; record 15 GW added in 2025. EIA does not say the cells came from the mainland; that half is unsourced.
- **F042[1]** RAND researchers warned in 2024 that frontier labs could not defend model weights against the best state attackers.  
  RAND report of May 30, 2024 on securing model weights against attackers up to nation-state operations. The exact "cannot defend against the best state attackers" is the case author's paraphrase; check the report text.
- **F043[1]** Wuhan courts issued anti-suit injunctions in 2020 that barred parties from litigating abroad.  
  WTO DS611 summary: anti-suit injunctions begin August 2020 with a decision of the Supreme People's Court. The Wuhan court order (Sept 2020, Xiaomi v InterDigital) is in Appendix H note 7/5 but is not on this page.
- **F044[2]** The Tibetan Policy and Support Act of 2020 makes it American policy that Tibetan Buddhists alone choose the successor.  
  USCIRF: policy affirming the right of the Tibetan Buddhist community to select its leaders; sanctions on officials who interfere. "Alone" is stronger than the enacted wording (exclusively spiritual matter; the 14th Dalai Lama's wishes should play a key role); replace with the statute text.
- **F046[0]** Federal prosecutors charged two men in April 2023 with running an undeclared police station for the Ministry of Public Security in Manhattan, and one pleaded guilty in D…  
  Complaint: Lu and Chen 'operated an unofficial police station in New York City on behalf of the Fuzhou Municipal Public Security Bureau', a provincial branch of the Ministry of Public Security; docket: complaint entered 04/05/2023, order to unseal Apr 17, 2023. Docket also shows a plea hearing for Chen Jinping set for Dec 18, 2024 under a plea agreement to Count One; that he pleaded guilty that month rests on DOJ's release, which the runner could not read.
- **F047[0]** The TikTok USDS joint venture closed on January 22, 2026.  
  OLC (50 Op. O.L.C., July 16, 2026): 'In January 2026, the divestiture was finalized, and the TikTok USDS Joint Venture was established in the manner contemplated by the President's Executive Order.' The January 22 date is not in the text read. Executive Order 14352 was signed September 25, 2025.
- **F051[0]** Treasury and Commerce have designated hundreds of mainland firms since 2022 for supplying Russia's military industry.  
  USCC: BIS added 125 Chinese/HK entities to the Entity List Feb 2022 to Aug 2025 for aiding Russia. Treasury: Oct 2024 action across 17 jurisdictions including the PRC. "Hundreds" combined is not stated in either.
- **F052[2]** The Defense Department added 65 companies to its list in June 2026.  
  Federal Register API: published 2026-06-10; the Deputy Secretary of Defense determined the listed entities qualify as Chinese military companies. The count of 65 additions was not read; the list would need comparing with the January 2025 list.
- **F056[1]** The Justice Department's bulk data rule took effect on April 8, 2025 and bars transfers of Americans' genomic data to countries of concern.  
  Rule effective April 8, 2025 and covers human omic data per its definitions; the page text read mentions genomic data in the background only. Confirm the "human genomic data" definition in 28 CFR 202.
- **F058[0]** Mainland holdings of Treasury securities peaked at more than $1.3 trillion in 2013 and have fallen by nearly half since (Treasury TIC: major foreign holders of Treasury …  
  Batch 8 read the table: mainland China held $1,316.7 billion in November 2013 (the 2013 monthly row runs 1270.1 in December to 1316.7 in November and 1214.2 in January), so the 'more than $1.3 trillion in 2013' peak is on the table. The 'nearly half' decline rests on the most recent row (about $684 billion), whose year header was not in the snippet. Link unchanged.
- **F059[0]** The allies froze about half of Russia's central bank reserves in 2022.  
  Treasury (Feb 2023): REPO Task Force members 'immobilized about $300 billion worth of Russian Central Bank assets'. 'About half' of the reserves needs the pre-war total (about $630 billion) from the Bank of Russia, which this page does not give.
- **F059[1]** The People's Bank has reported gold purchases in most months since late 2022, and its reported reserves stood near 2,300 tonnes in 2025.  
  Secondary (trade body). April 2026: the PBoC's 18th consecutive monthly gold addition, official holdings 2,322t, 9% of reserves. 'Since late 2022' and 'near 2,300 tonnes in 2025' are not on this page; the figure is for April 2026. A primary source is the PBoC reserve assets table or SAFE data.
- **F061[2]** The State Department began reviewing the social media of every student visa applicant in June 2025, and agencies score travelers, applicants and employees with automated…  
  State (June 2025): expanded 'comprehensive and thorough vetting, including online presence, of all student and exchange visitor applicants in the F, M, and J' categories. The second half, agencies scoring travelers, applicants and employees with automated tools built on purchased data, is not on this page.
- **F062[3]** House appropriators wrote language to restore the initiative in September 2025 and dropped it in January 2026.  
  Committee release: the FY26 bill 'Directing the re-establishment of the DOJ China Initiative'. The release is dated July 14, 2025; the September 2025 timing in our sentence is not on it. The second link is the January 2026 CJS division text: the phrase 'China Initiative' does not occur in the text read, which supports 'dropped' but rests on an absence in machine-read text that has spacing errors. A person should search the PDF.
- **F064[1]** Its draft transition plan of November 2024 would deprecate RSA and elliptic-curve keys after 2030 and disallow them after 2035, and it remained a draft in August 2026.  
  Draft transition table: ECDSA and RSA at 112 bits of security strength 'deprecated after 2030, disallowed after 2035'; the draft cites 2035 as the NSM-10 target. Publication date of the draft (Nov 2024) and that it was still a draft in August 2026 are not on the page.
- **F064[2]** The University of Science and Technology of China ran a 105-qubit processor, Zuchongzhi 3.0, in 2025.  
  Preprint titled 'Establishing a New Benchmark in Quantum Computational Advantage with 105-qubit Zuchongzhi 3.0 Processor', submitted December 2024; the peer-reviewed version is Physical Review Letters 134, 090601 (2025). The USTC affiliation is on the paper, not in the abstract text read.
- **F065[1]** Congress barred brokers in 2024 from selling Americans' sensitive data to foreign adversaries, including location data and military status.  
  Page not fetched: the runner got HTTP 404. The fact is as a web-search result summarized the page, so open the link and read it before relying on it. FTC release on the Protecting Americans' Data from Foreign Adversaries Act of 2024 (effective June 24, 2024): bars data brokers from selling sensitive data, including geolocation, to foreign adversaries; the letters flag products involving status as a member of the Armed Forces.
- **F065[2]** The FTC sent warning letters under that law to 13 brokers in February 2026.  
  Page not fetched: the runner got HTTP 404. The fact is as a web-search result summarized the page, so open the link and read it before relying on it. FTC warning letters to 13 data brokers, dated February 9, 2026 for most (Factual Inc. shows March 4, 2026).
- **F066[1]** Shijian-25 docked with Shijian-21 in geostationary orbit in July 2025 for the first apparent refueling there.  
  Secondary (non-profit). Describes SJ-21 and SJ-25 among missions used to demonstrate 'inspection, surveillance, docking, maneuvering, and possible refueling'. The July 2025 GEO docking and the separation date are not on the page text read.
- **F068[0]** The President ordered a missile shield for the homeland in January 2025, and its program lead later put the cost at about $185 billion.  
  Signed January 27, 2025; directs a 'next-generation missile defense shield'. The $185 billion program-lead estimate is not on this page.
- **F068[1]** The Congressional Budget Office estimated in May 2026 that a system meeting the order could cost $1.2 trillion over 20 years, most of it for about 7,800 interceptors in …  
  Page not fetched: the runner got HTTP 403. The fact is as a web-search result summarized the page, so open the link and read it before relying on it. CBO: a system with capabilities broadly consistent with the executive order would cost about $1.2 trillion over 20 years; the space-based interceptor layer is about 70% of acquisition cost and 60% of total cost. The '7,800 interceptors' count was not in the summary.
- **F068[2]** The Pentagon reported in December 2025 that the mainland's stockpile stood in the low 600s and would exceed 1,000 by 2030.  
  Page not fetched: the runner got HTTP 403. The fact is as a web-search result summarized the page, so open the link and read it before relying on it. Report: stockpile 'remained in the low 600s through 2024'; the PLA 'remains on track to have over 1,000 warheads by 2030'. DoD estimates, not confirmed counts.
- **F069[0]** Data centers used 4.7 percent of American electricity in 2024, and a Lawrence Berkeley National Laboratory report of June 2026 projects 9.5 to 15.3 percent by 2030.  
  Lawrence Berkeley National Laboratory (DOE national lab), published 2026-06-18: scenarios 'between 9.5 and 15.3% of total U.S. electricity use by 2030'. The 4.7% share for 2024 was not read.
- **F069[2]** Washington allowed sales of Nvidia's H200 chips to the mainland in December 2025 in exchange for a 25 percent share of the revenue.  
  Same rule as F029[0]. It confirms the policy change for the H200; the December 2025 date and the 25 percent revenue share are not in it.
- **F070[2]** They set its next meeting for November 2026.  
  Fact sheet: 'The next exchange will occur by November 2026.' Our sentence says 'for November 2026'; the page says 'by'.
- **F073[1]** The China Coast Guard has patrolled the waters around Kinmen since February 2024, after two mainland fishermen died fleeing a Taiwanese patrol boat.  
  Taiwan's Coast Guard Administration (Feb 26, 2026) rebuts the China Coast Guard's 'regular patrol' claims near Kinmen. Confirms the patrols; 'since February 2024' and the two fishermen's deaths are not on the page. The Mainland Affairs Council page returned HTTP 403.
- **F076[0]** A Navy intelligence estimate in 2023 put mainland shipbuilding capacity at about 232 times America's.  
  Secondary (think tank). CSIS says the mainland's naval shipbuilding capacity is 'over 230 times larger than that of the United States'. The 232 figure and the attribution to a 2023 Navy intelligence briefing are not in the text read; the primary is the Office of Naval Intelligence slide.
- **F077[0]** A Federal Reserve note of September 25, 2026 found that new American greenfield projects in China fell sharply after 2020 and never recovered.  
  Fed note by Cody Kallen: 'broad-based declines in U.S.-to-China greenfield FDI' tracked through 2025. 'Fell sharply after 2020 and never recovered' is our compression; the note's own wording and charts should be checked.
- **F077[1]** The same note found that dividends from American subsidiaries there now exceed reinvestment.  
  Fed note: 'U.S. multinationals are reducing their existing footprints in China, with rising dividend payout rates (retaining less earnings)'. That dividends now exceed reinvestment is a compression of this; read the note's charts.
- **F077[2]** The IMF put the mainland's augmented government debt at 126.6 percent of GDP in 2025.  
  IMF staff report table: augmented debt (percent of GDP) 97.5, 98.7, 104.2, 111.3, 117.0, 126.6, 135.3, 141.5, 146.2, 150.0, 153.7 in an 11-year row. The year headers were not in the snippet; if the row runs 2020 to 2030, 126.6 is 2025 and 150.0 is 2029.
- **F080[2]** Leaked Xinjiang police files in 2022 showed registries that tracked families and travel in detail.  
  US congressional-executive commission statement on the release of the files. It confirms the release in May 2022; the 'registries that tracked families and travel' detail is not in the text read.
- **F084[1]** The State Department said in April 2025 that Chang Guang Satellite Technology supported Houthi attacks, and Treasury sanctioned three mainland firms among 32 targets in …  
  State: 'Chang Guang Satellite Technology Co., Ltd. is directly supporting Iran-backed Houthi terrorist attacks on U.S. [interests]'. Treasury: designates '32 individuals and entities' in its largest sanctions action to date targeting the Houthis. That three of the 32 are mainland firms is not in the text read.
- **F087[0]** The CIA judged in January 2025, with low confidence, that a lab origin for COVID-19 was more likely than a natural one.  
  ATA (March 2025): 'CIA [assesses] that a research-related hypothesis is more likely than a natural origin hypothesis'. The January 2025 date and 'low confidence' are in CIA's January 2025 statement, not in the text read.
- **F087[1]** The WHO's advisory group said in June 2025 that the evidence it had favored spillover from animals, and that it could not settle the question without data the mainland h…  
  WHO news item of June 27, 2025: Tedros says 'all hypotheses must remain on the table, including zoonotic spillover and lab leak' and appeals to China and others for information. Whether SAGO said the available evidence favored spillover needs the full SAGO report.
- **F089[0]** The IMF put the mainland's augmented government debt at 126.6 percent of GDP in 2025 and projected 150 percent by 2029.  
  Same IMF table as F077: 126.6 and 150.0 in the augmented debt row. Year headers were not in the snippet.
- **F090[1]** The Party imposed a national security law on the city on June 30, 2020, and Hong Kong passed its own security law in March 2024.  
  HKSAR government: the Safeguarding National Security Bill passed (March 19, 2024) fulfilling Article 23. The June 30, 2020 imposition of the NSL is not on this page.
- **F095[0]** The China Cables of 2019 and the Xinjiang Police Files of 2022 showed what leaked Party records can prove.  
  Same CECC statement as F080[2]: it confirms the May 2022 release of the Xinjiang Police Files. The 2019 China Cables are not covered, and 'showed what leaked Party records can prove' is the case's argument, not the statement's.
- **F096[0]** The Party expelled Zhang Youxia and Liu Zhenli on September 21, 2026, leaving Xi Jinping and Zhang Shengmin as the only members of the Central Military Commission.  
  Xinhua (PRC state media, a PRC statement of its own decision) dated 2026-09-21: Zhang Youxia and Liu Zhenli expelled for serious discipline and law violations. That only Xi Jinping and Zhang Shengmin remain on the Central Military Commission is not in the text read.
- **F096[1]** The Pentagon reported in December 2025 that the mainland's arsenal would exceed 1,000 warheads by 2030.  
  Page not fetched: the runner got HTTP 403. The fact is as a web-search result summarized the page, so open the link and read it before relying on it. Same report as F068[2]: 'the PLA remains on track to have over 1,000 warheads by 2030'.
- **F096[2]** New START expired on February 5, 2026, and the Party rejected American calls for trilateral nuclear talks.  
  State: 'As of yesterday, February 5th, New START and its central limits have expired.' The word 'trilateral' is not on the page, and the PRC's refusal is a PRC position that this US statement does not record.
- **F097[1]** It flew more than 90 orbital launches in 2025, a national record.  
  PRC state media quoting the China National Space Administration: 50 commercial launches in 2025, '54 percent of the country's total number of space missions', which implies about 92. The figure 92 and 'a national record' are not stated on the page; SpaceNews (secondary) reports 92, but spacenews.com returned HTTP 403 to the runner.
- **F098[1]** DeepSeek released a model in January 2025 that matched leading American systems at a fraction of the reported training cost.  
  Company's own preprints. V3: 'requires only 2.788M H800 GPU hours for its full training' and 'performance comparable to leading closed-source models'. R1 (January 2025): the abstract text read did not name OpenAI-o1. 'Matched leading American systems' is the company's own claim and the outside benchmark record is not linked.
- **F098[2]** The two governments opened a dialogue on superintelligence in September 2026, and the White House ruled out joint regulation of frontier models.  
  Same White House fact sheet as F070: the two countries 'established the U.S.-China Super Intelligence (SI) Dialogue'. The statement that the White House ruled out joint regulation of frontier models is not in the text read.
- **F099[0]** Researchers at Fudan University reported in December 2024 that two open models copied themselves when told to do so in experiments.  
  Preprint, not peer reviewed: systems driven by Llama31-70B-Instruct and Qwen25-72B-Instruct surpassed the self-replicating red line. The Fudan affiliation (on the paper) and the 'when told to do so' instruction were not in the abstract text read.

## Checked, not settled (17)

A page was tried (blocked, empty, wrong content, or the figure is in a chart or a scan). No link was added. Hosts that refused the runner: ftc.gov, hhs.gov, usda.gov, gao.gov, pnas.org, cbo.gov, spaceforce.mil, war.gov, congress.gov, news.uscg.mil, aps.org, mac.gov.tw, swift.com, sec.gov, spacenews.com, and justice.gov pages that return empty text. TLS failures (not bypassed): npc.gov.cn, english.scio.gov.cn, kinmen.gov.tw, eng.mod.gov.cn. Archive.org copies were rate limited (HTTP 429).

- **F035[0]** TSMC began volume production in Arizona in late 2024 and plans more advanced plants there.  
  sec.gov returned HTTP 403 to the runner (SEC wants a contact in the User-Agent). The TSMC filing saying the Arizona site has been in volume production since late 2024 is known only from a search summary. Commerce's April 2024 award terms expected high-volume production in the first half of 2025, so the sentence's 'late 2024' needs the filing itself.
- **F056[2]** Reporting in 2021 found that BGI developed its prenatal test with the PLA and sold it in more than fifty countries.  
  NCSC genomics fact sheet (2021) does not say BGI's prenatal test was developed with the PLA or sold in 50+ countries; it says BGI sold test kits to 180 countries by Aug 2020. The claim comes from 2021 Reuters reporting; look for the Reuters piece or a government document (DoD 1260H list entry for BGI Genomics, Commerce Entity List).
- **F062[0]** The Justice Department ended its China Initiative in February 2022.  
  The DOJ National Security Division page for the China Initiative returned an empty page to the runner. The date Feb 2022 remains unchecked.
- **F062[2]** A study in PNAS found that departures of scientists of Chinese descent from the United States rose from about 900 in 2010 to 2,621 in 2021.  
  Europe PMC record for the PNAS paper (DOI 10.1073/pnas.2216248120) did not contain 900, 2,621 or the word Chinese in the text read; the figures are likely in the full text, not the record. Needs a person or the PMC full text.
- **F066[3]** The Space Force's vice chief said in March 2025 that five mainland satellites had practiced dogfighting in low orbit.  
  CSIS panel transcript (secondary) mentions 'the refueling, the dogfighting' as headlines but not the Space Force vice chief or five satellites in March 2025. spaceforce.mil returned HTTP 403.
- **F067[1]** The Party aims to land astronauts by 2030 and postponed its Chang'e-7 south-pole probe to 2027 after a scrub on August 24, 2026.  
  Xinhua (Aug 19, 2026) reports Chang'e-7 being prepared at Wenchang; it does not mention a postponement to 2027 or a scrub on August 24. The 2030 crewed-landing goal is also not on that page.
- **F070[3]** The PLA declined a call from the Secretary of Defense during the balloon crisis of February 2023.  
  war.gov returned HTTP 403 on the runner; the Ryder briefing text has not been read.
- **F072[0]** In the Election Study Center's survey at National Chengchi University, 62.0 percent of Taiwan's people identified as Taiwanese only in December 2025.  
  The NCCU Election Study Center page loads but the December 2025 figure (62.0%) is in a chart or table that the text read did not capture. Needs a person to open the trend page.
- **F074[1]** The Coast Guard reported five mainland research vessels operating in the American Arctic in August 2025.  
  news.uscg.mil returned HTTP 403 on the runner; the Coast Guard's August 2025 release has not been read.
- **F074[2]** Russian and mainland coast guard ships patrolled together in the Bering Sea in October 2024.  
  news.uscg.mil returned HTTP 403 on the runner; the Coast Guard's October 2024 release has not been read.
- **F079[2]** Encounters with mainland nationals at the southern border rose sharply in 2023 and 2024.  
  congress.gov returned HTTP 403 on the runner.
- **F088[1]** SWIFT's July 2026 tracker put the yuan at 3.10 percent of international payments outside the eurozone, fifth among currencies.  
  swift.com returned HTTP 403 for the July and August 2026 Global Currency Tracker PDFs. The 3.10 percent and fifth-place figures are unchecked.
- **F088[2]** The dollar held about 50 percent.  
  Same SWIFT tracker; swift.com returned HTTP 403.
- **F094[1]** The breach of the Office of Personnel Management in 2015 exposed files on 21.5 million people.  
  The alternate OPM URL also returned HTTP 404. Look for the OPM breach figures on opm.gov by search, or use the OPM Inspector General.
- **F098[0]** The PLA's white paper of 2019 named intelligentized warfare as the direction of military change.  
  english.www.gov.cn loaded the 2019 white paper's introduction, but 'intelligent' and 'informationized' were not in the text captured, so the body was not read. The 2019 paper is usually cited for 'informationized warfare' and for intelligent warfare as an emerging form, not as 'the direction of change'; the wording of this sentence may overstate it. Needs a person to read Section I.
- **F100[1]** The directive, last updated in January 2023, requires appropriate human judgment over the use of force.  
  war.gov returned HTTP 403 on the runner; the DoDD 3000.09 (January 2023) wording has not been read.
- **F100[2]** The Pentagon awarded contracts worth up to $200 million each to four AI companies in July 2025.  
  ai.mil returned HTTP 403 on the runner; the CDAO award terms have not been read.

## Links that are not government or court pages (25)

Each entry has at least one link that is not a government or court page: a company, NGO, think tank, news agency, preprint, translator, reference work or archive. Where a government page would be better, say so in review; the label on the link says what the source is.

- **F008[0]** pv magazine, reporting Reuters
- **F009[1]** Anthropic
- **F009[2]** Anthropic
- **F023[2]** IIE Open Doors fast facts 2024
- **F040[0]** Federal Register (June 2026 list); WilmerHale
- **F045[0]** Indictment, United States v. Sun and Hu (E.D.N.Y. 24-cr-346); CourtListener docket, United States v. Sun
- **F056[0]** Senate Armed Services Committee; Davis Polk
- **F059[1]** World Gold Council (trade body): China gold market update, May 2026
- **F064[2]** arXiv:2412.11924, Zuchongzhi 3.0 (preprint)
- **F065[0]** Duke Sanford Tech Policy: data brokers and the sale of data on U.S. military personnel
- **F066[1]** Secure World Foundation: Chinese RPO fact sheet
- **F071[0]** Focus Taiwan (CNA), Cabinet approves 2027 budget
- **F071[1]** Ministry of National Defense (Taiwan) press release; Focus Taiwan (CNA), special act passed
- **F072[1]** Cyberspace Administration of China: Interim Measures for the Management of Generative AI Services (Chinese text); English translation (China Law Translate, secondary)
- **F075[0]** Huawei 2025 Annual Report (company statement)
- **F076[0]** CSIS: The Threat of China's Shipbuilding Empire
- **F078[0]** ASPI Critical Technology Tracker (think tank)
- **F079[1]** Freedom House: Ten Findings from Ten Years of Data on Transnational Repression
- **F080[0]** Freedom House: Ten Findings from Ten Years of Data on Transnational Repression
- **F083[1]** Cyberspace Administration of China: Interim Measures for the Management of Generative AI Services (Chinese text); English translation (China Law Translate, secondary)
- **F085[2]** Anthropic: disrupting an AI-orchestrated cyber espionage campaign (company statement)
- **F089[1]** HKEX announcement by China Evergrande Group (company filing)
- **F097[1]** Xinhua: China's commercial space sector logged 50 launches in 2025 (quoting CNSA)
- **F098[1]** DeepSeek-R1 paper (company preprint, January 2025); DeepSeek-V3 technical report (company preprint)
- **F099[0]** arXiv:2412.12140, Frontier AI systems have surpassed the self-replicating red line

## Flags raised before the decision log started

- `futures-link-check.md`: the 35 links the cases already carried, checked against their claims (7 supported, 8 partial, 2 not on the page, the rest unchecked or blocked). Includes F001 (the Trump-visit and September-APEC claims sit on links that cannot support them), F003 (the PLA 2027 goal is not in the communique) and F012 (the Open Doors link was a landing page; replaced with the fast-facts PDF).
- `book-vs-cases.md`: where a case and the book disagree. F005: Appendix H note 13 says "late February" and AP/NBC date the event January 29, 2026.

## Checkable sentences nobody has tried yet (62)

80 checkable sentences still have no link; 18 of them were tried and are listed above as unresolved. The rest carry a date, number or named act and have not been looked at.

- **F001[1]** Two New Zealand navy ships transited the Strait in late September.
- **F002[2]** Before the 2024 elections prosecutors investigated village wardens over subsidized mainland trips and gamblers over illegal betting on the results.
- **F003[1]** Between October 2025 and September 2026 the Party expelled two vice chairmen and two other members of its Central Military Commission.
- **F005[2]** The company's sale of its global port network had not closed by March 2026.
- **F006[2]** The PLA rehearsed a blockade of Keelung and Kaohsiung in its Justice Mission 2025 exercise in December 2025.
- **F009[0]** OpenAI said in January 2025 that it had evidence DeepSeek used its models' outputs to train a rival, a practice called distillation.
- **F010[1]** As of August 2026 the tool had not processed a wafer.
- **F011[1]** The first round of bounties came in July 2023.
- **F012[0]** Freedom House attributed 272 of 1,219 documented physical incidents of transnational repression from 2014 to 2024 to the People's Republic, more than any other state.
- **F012[2]** Secretary of State Rubio announced in May 2025 that the United States would revoke visas of mainland students with Party ties or in critical fields.
- **F015[0]** Mainland-owned companion apps ranked among the most downloaded AI apps in the United States in 2024.
- **F016[1]** The update named 65 new entities.
- **F018[2]** The People's Republic pledged $500 million to the organization over five years in May 2025.
- **F023[1]** President Trump said in August 2025 that he would welcome 600,000 mainland students.
- **F024[2]** The Agriculture Department launched a farm security action plan in July 2025.
- **F025[1]** The Party's April 2025 licensing rules on seven rare earths were never suspended.
- **F029[2]** The Party let ByteDance and Tencent take about 10,000 H200s each in August 2026, and the Justice Department had already broken up a $160 million smuggling network in December 2025.
- **F031[1]** The island shut its last nuclear reactor in May 2025, and its regulator cleared an initial restart plan for Maanshan in September 2026.
- **F031[2]** The PLA's Justice Mission 2025 exercise rehearsed a blockade of Keelung and Kaohsiung.
- **F032[0]** Taiwan elects a president in January 2028.
- **F032[2]** The Party's Anti-Secession Law of 2005 authorizes "non-peaceful means" if peaceful unification becomes impossible.
- **F034[0]** Taiwan's courts have convicted presidential guards of spying for the People's Republic.
- **F034[1]** The PLA fielded large numbers of drones and unmanned systems at its parade of September 3, 2025.
- **F037[1]** The Party's delegates entered bodies such as the ITU and 3GPP as newcomers and now draft much of the text.
- **F043[0]** A Chongqing court set global royalty rates in a patent dispute in December 2023.
- **F046[1]** Safeguard Defenders counted more than 100 such stations worldwide in 2022.
- **F049[1]** AI labs have reported and removed such operations since 2024.
- **F052[1]** The catalog's FARA gap shows that exemption at work from 2017 to 2024.
- **F053[1]** CFIUS reviews foreign investment but depends on filings and on its own search for deals no one filed.
- **F053[2]** In the Grand Forks case of 2022 and 2023, federal reviewers found they lacked jurisdiction over a land purchase near an Air Force base.
- **F054[1]** The Party delayed its reports on COVID-19 in December 2019 and January 2020, as the book's COVID chapter documents.
- **F054[2]** The WHO declared eight public health emergencies of international concern from 2009 through 2024.
- **F055[2]** The heparin contamination of 2008 showed the risk of long and opaque drug supply chains.
- **F057[0]** S&P rated the developer Vanke in selective default in December 2025.
- **F059[2]** Analysts estimate that the Party's real holdings exceed the reported figure.
- **F062[1]** MIT Technology Review found that 130 of the 148 people charged under it were of Chinese heritage.
- **F063[2]** The licensing of heavy rare earths never lapsed, and the general licenses issued from December 2025 exclude defense and aerospace buyers.
- **F066[0]** Shijian-21 towed a dead Beidou satellite to a graveyard orbit in January 2022.
- **F066[2]** The two separated on November 25, 2025.
- **F069[1]** The mainland's installed generating capacity reached about 3,960 gigawatts in March 2026, up 15.5 percent in a year.
- **F072[2]** Alibaba's Qwen models were the most downloaded model family on Hugging Face in 2025.
- **F073[0]** The mainland's youth unemployment rate reached 18.9 percent in August 2026.
- **F075[1]** The Party has financed digital networks across Asia, Africa and Latin America under its Digital Silk Road since 2015.
- **F078[1]** The mainland's largest academic database, CNKI, restricted foreign access to several collections in 2023.
- **F081[1]** OpenAI reported in 2025 that operations likely linked to the People's Republic had used ChatGPT to write social media posts and internal reports.
- **F081[2]** No federal law requires disclosure of AI-generated content in political ads, although about 30 states regulate election deepfakes.
- **F082[0]** Ne Zha 2 earned about $2.26 billion worldwide in 2025 and about $23 million in North America.
- **F082[1]** A Beijing-based publisher listed in Shenzhen owns 49 percent of the company behind ReelShort, a short-drama app that earned about $130 million worldwide in the first quarter of 2025.
- **F083[0]** Hugging Face reported in August 2026 that developers had built 151,448 derivative models on Alibaba's Qwen, 2.6 times the count built on Meta's models.
- **F084[0]** The Houthis attacked more than 100 merchant ships from November 2023 to mid-2025 and sank four.
- **F084[2]** The Houthis told Beijing and Moscow in 2024 that their ships would pass unharmed.
- **F085[1]** The ransomware attack on Change Healthcare in 2024 exposed data on 192.7 million people.
- **F086[0]** ChemChina bought the seed and crop chemical company Syngenta for $43 billion in 2017.
- **F089[2]** Property investment on the mainland fell 19.9 percent in the first eight months of 2026.
- **F091[0]** Mainland visitors bought HK$62.8 billion of new Hong Kong insurance policies in 2024, 28.6 percent of new individual business.
- **F091[1]** Hong Kong's Insurance Authority has published no separate figure for mainland visitors since early 2025.
- **F092[0]** Federal agencies reported more than 1,700 AI use cases in their 2024 inventories, about double the year before.
- **F093[0]** The Brennan Center counted 52 national emergencies in effect on September 16, 2026.
- **F095[1]** A hacker offered data on about one billion residents from a Shanghai police database for sale in 2022.
- **F095[2]** Wang Lijun's flight to the American consulate in Chengdu in 2012 exposed the crimes that brought down Bo Xilai.
- **F097[0]** The mainland plans two low-orbit constellations, Guowang with about 13,000 satellites and Qianfan with about 14,000.
- **F097[2]** Together the two constellations had only a few hundred satellites in orbit by 2026.

