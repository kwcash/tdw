# Historical cases sourcing pass: findings

Generated 2026-10-09 by `tools/findings.py --kind catalog` from `decisions-log.jsonl`. Do not edit by hand; rerun the script.

## Read this first

- **Nothing here is `verified`.** `sourced` means a link was attached after a fetch tool read the page text for the key terms. It does not mean a person read the page against the sentence. `verified` needs a named person and a date, and the count is **0**.
- Government, court, statute, treaty, archive and official-body pages came first. Where only media, a think tank, a company, an NGO or a reference work had the fact, the link label says so and this file flags it. Primary sources have a perspective too: a PRC ministry page states PRC policy, a White House fact sheet states the US account, and a wartime document records what its author believed.
- Pages were read by a script on a GitHub Actions runner, which sees the text only. Scanned images, charts, tables rendered as images, and pages that block the runner were not read. Those cases are listed under "Checked, not settled".

## Counts

- Historical cases: 120 cases, 436 record sentences, 190 now carry a link; 97 cases have at least one link.
- Decisions logged (latest per sentence): contradicted 4, partial 106, supported 84, unresolved 48.
- Checkable sentences with no link and no decision on file: 22.

## Contradicted by the source (4)

The page says something different from the sentence. The text was left unchanged. The author decides.

- **C059[4]** The memo stayed classified until 2020.  
  CRS (October 8, 2020): 'The Trump Administration in 2019 declassified an internal presidential memorandum Reagan issued on the day of the third communique's release.' So the memorandum was declassified in 2019, not 2020. The Six Assurances cables were a separate release (the AIT page 'Declassified Cables' is undated in the text read); the case may conflate the two. Text left unchanged for the author.
- **C080[0]** The ban followed on July 20, 1999.  
  Amnesty: 'On 22 July 1999, the Ministry of Civil Affairs issued a Decision banning' the Falun Dafa research society. The House resolution: 'on July 20, 1999, Chinese police began arresting leading Falun Gong practitioners; on July 22, 1999, Chinese state media began a major propaganda campaign' to ban it. So July 20 dates the start of the crackdown and arrests, and July 22 the formal ban. Text left unchanged for the author.
- **C093[3]** The court rejected the claim, and Taishan agreed in 2019 to pay $248 million.  
  The court's MDL page lists, for March 10, 2016: 'The Court issued an Order and Reasons granting Defendant CNBM Group's Motion to Dismiss under the Foreign Sovereign Immunities Act.' That is the opposite of 'the court rejected the claim' for the state-owned parent, unless a later ruling or appeal reversed it; later rulings and the 2019 settlement ($248 million) were not read. A helper agent flagged the same point. Text left unchanged for the author.
- **C118[4]** The city's statistics bureau fined Mintz about $1.5 million in August.  
  Two news reports (media only) say the Beijing Municipal Bureau of Statistics ruling is dated July 5 and its website statement July 14, with a fine of 10.69 million yuan (about $1.49 million) for 'foreign-related statistical investigations'; the news broke in August (Al Jazeera, August 22, 2023). The amount matches; 'in August' matches when the fine became public, not the dates on the ruling.

## Linked, but the link covers only part of the sentence (106)

The note says what the page supports and what is still open.

- **C001[0]** The Qing court confined Western trade to Canton from 1757.  
  Official: US-Chinese relations were 'private and largely commercial' and Sino-American trade grew 'under the Chinese system that limited foreign traders' access to a single port' (Guangzhou/Canton). The year 1757 is not on the page.
- **C001[2]** The Empress of China had sailed from New York in February 1784 and traded ginseng for tea and silk under those rules.  
  US government essay: about a year after the Treaty of Paris (1783) the Empress of China 'slipped out of New York's harbor for Canton' in 1784, carrying ginseng. The February date and the exchange for tea and silk were not in the snippets read. The Founders Online page for Jay's papers returned no text.
- **C003[0]** American houses carried Turkish opium and held a minority share of the trade, and Russell and Company made fortunes for partners such as Warren Delano Jr. Lin confined t…  
  LOC finding aid: Russell & Company, a trading house founded in 1819 in Canton, with the opium trade among its business. The college essay (secondary) says Warren Delano II made his fortune with Russell & Co. in the opium trade. 'Turkish opium', the minority share and Lin's confinement of the foreign community in spring 1839 were not in the text read; the Delano page names Warren Delano II, so check the sentence's 'Jr.'
- **C003[1]** The Americans kept trading as neutral carriers after the British withdrew, and the war that followed opened five ports under the Treaty of Nanjing in 1842.  
  Official: the Treaty of Nanjing (1842) was the Anglo-Chinese treaty that the 1844 US treaty 'replicated'. 'Five ports' and the Americans' neutral-carrier trade were not in the text read.
- **C005[1]** American diplomats in China reported kidnapping, deaths and mutinies in the traffic.  
  The 1860 House document is the President's message transmitting information on the coolie trade; the govinfo link is a details page, so its text was not read. The National Archives article describes a coolie ship's 174-day voyage with a death of its captain and a mutiny, and recruitment by deception. That American diplomats reported kidnapping, deaths and mutinies is the likely content of the House document but was not confirmed from its text.
- **C008[0]** Yung Wing, Yale's first Chinese graduate, had persuaded the court to send 120 boys to New England between 1872 and 1875.  
  University and state-humanities pages (secondary): Yung Wing graduated from Yale College in 1854, the first Chinese student to graduate from an American university; the mission brought 120 Chinese students, starting in 1872. The 1875 end of the shipments and Yung Wing 'persuading the court' were not in the text read; the Yale archives finding aid returned no text.
- **C008[1]** The mission's conservative commissioner warned that the boys were becoming American, and the United States refused to admit any of them to West Point or Annapolis in 187…  
  Primary and partisan: Yung Wing's own memoir says his application to the State Department for admission to West Point and Annapolis was answered 'There is no room provided for Chinese students.' The 1878 date and the commissioner's warning are not in the snippets; the Connecticut page says the students 'became more and more Americanized', which prompted the recall.
- **C008[2]** The court ordered the mission home in 1881, and Zhan later built the Beijing to Zhangjiakou railway without foreign engineers.  
  Secondary: the Chinese government recalled the students in 1881. Zhan Tianyou building the Beijing-Zhangjiakou railway without foreign engineers was not on any page read (the Library of Congress items returned HTTP 403).
- **C009[2]** The Supreme Court upheld the certificate in Fong Yue Ting v. United States in 1893, and Congress repealed exclusion only in December 1943.  
  US Reports: the decision in the Fong Yue Ting cases (argued with Wong Quan and Lee Joe) is dated May 15, 1893 and upholds the act's certificate requirement. State Department: 'The Chinese Exclusion Acts were not repealed until 1943'. The month, December, was not on either page; the USCIS page on Edward Bing Kan did not contain 'December 1943' either.
- **C010[2]** The Supreme Court ruled on May 10, 1886, that the Fourteenth Amendment protects every person within the jurisdiction and that a law applied with an evil eye and an unequ…  
  US Reports text: the Fourteenth Amendment guarantees reach 'all persons within the territorial jurisdiction' and the Court condemns discrimination founded on race 'if it makes arbitrary and unjust discriminations'. The exact phrase 'evil eye and an unequal hand' and the date May 10, 1886 were not found in the OCR text read (OCR may have broken the phrase); search the opinion.
- **C012[0]** Shanghai merchants called a boycott of American goods in May 1905 unless Washington eased the exclusion laws, and the boycott began that July.  
  FRUS documents the boycott of American goods in July 1905 (a dispatch of July 26, 1905) and a chapter on the Chinese boycott. That Shanghai merchants' guilds called it in May is not in the text read. A helper's lead, unverified: Minister Rockhill's dispatch says the boycott was set for about August 1, which would contradict 'began that July'; check the dispatch.
- **C012[2]** The Qing court banned the boycott at the end of August under American pressure, and it faded in the south during 1906.  
  FRUS: Rockhill's dispatch of September 27, 1905 refers to the imperial edict, and quotes the Shanghai taotai declaring the boycott will continue 'notwithstanding' it. The Roosevelt Center (university-run archive) lists the Imperial edict of August 31, 1905. American pressure as the cause and the fading in 1906 are not on these pages.
- **C013[0]** Congress authorized the return of about $11 million of the American Boxer indemnity in May 1908, and the Qing court agreed to spend it on students bound for the United S…  
  FRUS: the Department encloses 'an act of Congress authorizing the return to' China of part of the indemnity exacted for the Boxer disturbances (May 27, 1908). The House document is the President's message transmitting the executive order and correspondence on the remission. The amount was not found in the text read (a helper's lead: the official figure is $10,785,286, which rounds to about $11 million); the Qing court's agreement to spend it on students bound for the US is not confirmed in these snippets.
- **C013[1]** The first scholars sailed in 1909, and the preparatory school that opened in Beijing in 1911 became Tsinghua.  
  Tsinghua's own history: Tsinghua Xuetang was formally opened at Tsinghua Garden on the first day of the fourth lunar month of the third year of Xuantong (1911; April 29). The first scholars sailing in 1909 and the indemnity link were not in the text read.
- **C014[0]** Sun joined the Chee Kung Tong, a secret society with lodges in American Chinatowns, in Honolulu in 1904 and used its network to raise funds.  
  University handout: Sun's Honolulu visits and fundraising for the revolution, linked to the Chee Kong Society (Zhigongtang, a Hongmen secret society) that was established to overthrow the Qing. The 1904 initiation date is not pinned down in the text read. Secondary.
- **C015[0]** Woodrow Wilson agreed at the end of April 1919 to let Japan keep the German rights in Shandong.  
  FRUS minutes of the 30 April 1919 meeting with Wilson, Clemenceau, Lloyd George and the Japanese delegates on Shantung: Japan states it would hand back the peninsula in full sovereignty to China 'retaining only the economic privileges granted to Germany'. Wilson's assent is the meeting's outcome and was not in the snippet.
- **C015[1]** The Republic of China's delegates refused to sign the Treaty of Versailles that June.  
  FRUS: Clemenceau reports a letter from the Chinese Delegation saying they would sign the Treaty of Peace only with a reservation on Shantung; a Reinsch dispatch describes the popular indignation over the settlement. These show the dispute; the refusal to sign on June 28 is not in the text read.
- **C022[0]** Mao launched the Rectification Movement that spring, and Party meetings denounced Wang as a Trotskyite through May and June 1942.  
  NGO biography of Wang Shiwei (1906 to July 1, 1947): his Yan'an writings of 1942, the 'Trotskyite' label. The Rectification Movement launching that spring and meetings denouncing him through May and June 1942 are not in the text read; the Columbia University trial-transcript PDF failed TLS verification.
- **C022[1]** The Party expelled Wang and held him under guard, and its security forces executed him in 1947.  
  NGO biography: Wang Shiwei was executed on July 1, 1947 (the Party's anniversary). His expulsion and detention under guard are not in the snippets.
- **C022[2]** The Ministry of Public Security concluded in 1991 that the Trotskyite charge had no basis.  
  Chinese-language essay: 44 years after his death (1991) the 'Trotskyite spy' label was lifted by a body, with the Ministry of Public Security among the departments named; the Party Organization Department rejected the 'five-man anti-Party clique' in 1982. It is a commentary, not the Ministry's document; the official 1991 finding was not located.
- **C024[1]** When the Hanford production reactor stalled in 1944, Enrico Fermi's team consulted her unpublished work on xenon, the fission product that was poisoning the reactor.  
  US government page on Wu's Manhattan Project work at Columbia; the text read mentions xenon and Hanford. Fermi's team consulting her unpublished work during the 1944 reactor stall was not in the snippets, and the second NPS page did not mention xenon.
- **C024[2]** She became a citizen in 1954, and her experiment of 1957 overturned the conservation of parity.  
  NIST history: experiments at the National Bureau of Standards in late 1956 (Wu's cobalt-60 experiment) demonstrated that parity is not conserved in weak interactions, with the news in January 1957. Her 1954 citizenship was not on the page; Britannica returned HTTP 403.
- **C028[2]** Marshall left China in January 1947 and blamed extremists on both sides for the failure.  
  FRUS: on January 5, 1947 Marshall's statement on the situation in China was released for publication on January 7; chapter XVII is titled 'Recall of General Marshall; reactions'. The statement's blame on extremists on both sides was not in the snippets.
- **C030[1]** In October 1949 it arrested Ward on a charge of assaulting a Chinese employee, convicted him and expelled him that December.  
  FRUS file on Angus Ward at Mukden: spy charges against consulate personnel and the isolation of the consulate. The October arrest on a charge of assaulting a Chinese employee, the conviction and the December expulsion were not in the snippets; the Library of Congress newspaper page returned HTTP 403.
- **C031[0]** Joseph McCarthy's speech at Wheeling in February 1950 opened a campaign against the diplomats who had reported on the Party.  
  Senate Historical Office: McCarthy's Lincoln Day address in Wheeling, West Virginia, on February 9, 1950, blamed failures in American foreign policy on Communist infiltration of the government. That the speech opened a campaign against the diplomats who had reported on the Party is the case's reading; the pages say 'State Department' only in the speech context.
- **C031[1]** The department dismissed John Paton Davies in 1954, and John Carter Vincent and O. Edmund Clubb also left under charges of disloyalty that no one proved.  
  Truman Library (National Archives): Davies was dismissed by Dulles on a five-member security board's finding; the page gives the date November 5, 1954. ADST (a diplomatic oral-history project, secondary) places Vincent and Davies among the China Hands who were forced out. Clubb's departure and whether disloyalty was ever proved are not covered; FRUS 1952-54 Vol. I document 200 discusses the State Department's loyalty-security boards.
- **C031[2]** The Supreme Court restored Service's case in 1957, after the department had lost its China specialists.  
  Cornell Law School's reproduction of the US Reports opinion (secondary host): Service v. Dulles, decided June 17, 1957. The Court's holding for Service is the premise of 'restored'; 'after the department had lost its China specialists' is the author's characterization. The CourtListener copy returned no text.
- **C032[0]** The Agrarian Reform Law of June 30, 1950, carried the base-area practice across the mainland.  
  Scan of the official English edition of the law and its implementing decisions. The date June 30, 1950 was not found in the OCR text read, and 'carried the base-area practice across the mainland' is the case's reading. A private website hosts the scan.
- **C033[0]** Washington discounted the message, and American troops crossed the parallel in early October.  
  FRUS: a record of the Indian ambassador K. M. Panikkar's warnings relayed from Zhou Enlai about crossing the 38th parallel. That Washington discounted the message and when US troops crossed in early October are not in the snippets.
- **C033[1]** The Party's forces crossed the Yalu under the name Chinese People's Volunteers from October 19 and struck United Nations troops at Unsan and later at the Chosin Reservoi…  
  National Archives blog (agency, secondary): mentions the Chinese intervention, the Yalu and Chosin, and says the first Chinese were encountered by November 1, 1950. The name Chinese People's Volunteers and the October 19 date are not clear from the snippets; a helper's lead, unverified, is that an Army history gives October 14 to 20 for the crossings. The Army history page failed DNS.
- **C035[1]** Captured American airmen signed confessions under duress, and the International Scientific Commission endorsed the charge that September.  
  The working paper describes the International Scientific Commission (Joseph Needham and others) organized by the World Peace Council and the confessions of captured airmen. The September 1952 endorsement date was not in the snippets, and the CIA reading-room document did not contain 'International Scientific Commission'.
- **C036[0]** The Party announced their sentences in November 1954, life for Downey and twenty years for Fecteau.  
  CIA's own account (an agency telling its officers' story): a military tribunal convicted Downey, 'the Chief Culprit', and Fecteau, 'the Assistant Culprit', with life imprisonment and twenty years. The announcement date, November 1954, was not matched in the text read ('November 23, 1954' was not found).
- **C036[2]** Fecteau walked out in December 1971, and Downey went free in March 1973 after Richard Nixon publicly acknowledged his CIA employment.  
  CIA's account of the imprisonment and release of the two officers; the dates December 1971 and March 1973 and Nixon's acknowledgement were not matched in the text read. The Library of Congress item returned HTTP 403.
- **C037[0]** About two thirds of the roughly 21,000 Chinese prisoners in United Nations Command camps refused repatriation.  
  National Archives article discussing the dispute over non-repatriation of prisoners in the armistice talks. The figures (about 21,000 Chinese prisoners, about two thirds refusing) were not in the snippets; the Army history chapter returned HTTP 403.
- **C038[1]** The journalist Edward Hunter had popularized the word brainwashing in 1950.  
  FRUS document on Communist 'techniques for warping mental attitudes' names Edward Hunter's book on brain washing in Red China among two outstanding treatments. That Hunter popularized the word in 1950 is not stated in the snippet.
- **C039[0]** The shelling of Kinmen had begun the previous September, and the United States had signed a mutual defense treaty with the Republic of China in December 1954.  
  Official: the first Taiwan Strait crisis began with PRC shelling of Jinmen in September 1954, and the US signed the Mutual Defense Treaty with the ROC. The page text read did not give 'December 2, 1954'.
- **C040[0]** The government had revoked Qian's clearance that June on suspicion of Communist Party ties, a charge he denied.  
  Caltech exhibit (secondary): 'Political trouble began for Tsien in 1950 when his security clearance was revoked.' The month of June and the charge of Communist Party ties and his denial were not in the snippets; the Caltech aerospace page says he answered 'no' on an immigration questionnaire about organizations advocating overthrow of the US government.
- **C040[1]** Officials held him under restrictions close to house arrest for five years and let him sail for the mainland in September 1955, in a trade tied to the release of America…  
  Caltech (secondary): five years of secret diplomacy and negotiation; the travel ban was lifted on August 4 [1955]; American pilots appear in the account. The September 1955 sailing and the link to the release of American prisoners were not matched in the snippets.
- **C041[2]** About thirty thousand people confessed before the program ended in 1965.  
  US government essay mentions the Chinese Confession Program as a federal response to supposed infiltration by Chinese leftists. The figure of about thirty thousand confessions and the 1965 end were not found. A helper's lead, unverified: the National Archives' confession register covers 1957 to 1968.
- **C042[0]** Mao invited criticism of the Party in the spring of 1957, and intellectuals answered with posters and speeches.  
  FRUS memorandum on the recantation by 'rightists' in Communist China, referring to leaders of minority parties who had been encouraged to speak. The spring 1957 invitation and the posters and speeches are not in the snippets; Britannica returned HTTP 403.
- **C043[1]** The Seventh Fleet escorted Nationalist resupply convoys from early September, and Nationalist pilots scored the first combat kills with American Sidewinder missiles on S…  
  FRUS report on the 1958 crisis: the page contains the Seventh Fleet, convoy operations, 24 September and Sidewinder, in the Commander's account of operations. The snippets do not state that Nationalist pilots scored the first combat kills with Sidewinders on September 24.
- **C043[2]** In October the Party announced it would shell only on odd-numbered days, and the ritual lasted until January 1, 1979.  
  FRUS: discusses the Chinese Communists' bombardment pattern in October 1958 and the risks of the Quemoy dispute. The announcement to shell on odd-numbered days only and its ending on January 1, 1979 are not in the snippets; Britannica returned HTTP 403.
- **C045[1]** Two CIA-trained Tibetans radioed news of his flight, and the agency trained Tibetan fighters at Camp Hale in Colorado from 1958 to 1964.  
  CIA's own page: Tibetan freedom fighters were secretly trained by the CIA at Camp Hale, Colorado. The 1958 to 1964 span is in the page's text; the radio report of the Dalai Lama's flight by two CIA-trained Tibetans was not found (the CIA covert-action PDF returned no matches).
- **C046[0]** Famine and a loosened border sent tens of thousands of people from Guangdong into Hong Kong in April and May 1962, and Hong Kong's government returned most of them.  
  FRUS: the delegate of the Republic of China noted 'the recent large influx of Chinese refugees from the mainland into Hong Kong' in the 1962 session. April and May, tens of thousands, and Hong Kong's return of most of them are not in the snippets.
- **C047[1]** The Party detonated its first device on October 16, 1964, two days after Nikita Khrushchev lost power in Moscow.  
  FRUS summary and the Public Papers text (hosted by UC Santa Barbara's American Presidency Project) both date the first Chinese nuclear explosion to October 16, 1964; the FRUS summary also mentions Khrushchev. The two-day gap after Khrushchev's fall (October 14) is not stated in the text read.
- **C048[0]** The Party sent engineering, railway and anti-aircraft units to North Vietnam from June 1965 and withdrew them by 1969.  
  FRUS memorandum of a 1965 conversation referring to Chinese railroad and engineering personnel in North Vietnam and proposals about lines of communication. June 1965 as the start and 1969 as the withdrawal are not in the snippets.
- **C049[1]** The Party had already imprisoned him from 1949 to 1955 on a false spy charge, and it held him again from 1968 to 1977.  
  Biography: he was twice suddenly arrested on spy charges and put in solitary confinement. The years 1949 to 1955 and 1968 to 1977 are not in the text read; the Library of Congress authority page returned HTTP 403.
- **C049[2]** He left for the United States in 1980 and later advised American firms on business in China.  
  Biography mentions 1980 in the account of his later life. His advising of American firms was not in the snippets. A helper's lead, unverified: a Wilson Center snippet says he returned to the US in 1979, so the year needs checking in the full page.
- **C051[1]** Mao Zedong approved an invitation to the American team two days later, and the players crossed from Hong Kong on April 10.  
  Official milestone: in 1971 Nixon removed the last restrictions on American travel to the mainland, after the table tennis exchange. Mao's approval of the invitation and the players crossing from Hong Kong on April 10 are not in the text read; the National Archives press release on a Ping-Pong Diplomacy display did not contain April 10, Hong Kong or Mao.
- **C051[2]** Zhou Enlai received them in the Great Hall of the People on April 14.  
  National Archives press release about a State Department intelligence brief on Ping-Pong diplomacy; the name Chou appears in the text. Zhou receiving the team in the Great Hall on April 14 is not in the snippets; the Nixon Library's April 14, 1971 page lists a Q&A on table tennis.
- **C051[3]** Richard Nixon announced steps to ease the trade embargo on the same day.  
  Nixon Library's day page lists the April 14, 1971 statement announcing changes in policy on trade with China; the State milestone says Nixon removed the last restrictions on American travel to mainland China in 1971. The word 'embargo' was not found on either page.
- **C052[0]** The flight ran through the channel of Yahya Khan, Pakistan's military ruler, whose army had begun a crackdown in East Pakistan that March.  
  FRUS: the Beijing conversation with Zhou Enlai of July 9, 1971 refers to Yahya. The National Security Archive (George Washington University, an independent research institute) page reproduces the 'Blood telegram' from Dacca of March 28, 1971 on the army's actions in East Pakistan. The page text read does not itself state that the flight ran through Yahya's channel.
- **C053[4]** In 2024 the State Department and several legislatures rejected that reading.  
  CRS: a State Department spokesperson said in March 2025 that Resolution 2758 'puts no limits on any country's sovereign choice to engage substantively with Taiwan' and accused the PRC of 'intentional misuse and mischaracterization'; 'Since 2024, parliaments that have passed motions challenging the PRC's interpretation' include Australia, Belgium, Canada, the Czech Republic, the Netherlands, the UK and the European Parliament. So the legislatures' motions date from 2024, but this CRS text dates the State Department spokesperson's statement to March 2025; check the date of State's earlier statement that the resolution 'does not address the issue of representation of Taiwan'. The European Parliament page returned no text.
- **C056[0]** The photograph ran on front pages across the country during a visit that began with the signing of the Agreement on Cooperation in Science and Technology on January 31.  
  Official treaty record: the Agreement on Cooperation in Science and Technology of January 31, 1979, as amended and extended. Department history: Vice Premier Deng Xiaoping visited, met President Carter and attended a state dinner in 1979. That the photograph ran on front pages is media content not checked here.
- **C056[2]** It reached its renewal date in August 2023.  
  Official: the agreement was extended by exchange of notes on February 22 and 27, 2024, entering into force February 27, 2024. The August 2023 renewal date (a helper's lead: August 27, 2023) was not found in the text read.
- **C057[1]** The People's Liberation Army crossed the Vietnamese border on February 17, twelve days after Deng left the United States, and withdrew in March after heavy losses on bot…  
  Official milestone: Deng Xiaoping's visit in January 1979, and Carter 'unsuccessfully attempted to dissuade Deng' from military action against Vietnam. The February 17 crossing, the twelve-day gap and the March withdrawal are not in the text read; the Wilson Center digital archive failed DNS.
- **C058[0]** Recognition of the People's Republic on January 1, 1979 put the defense treaty with Taipei on a year's notice.  
  Official: the Joint Communique recognized the PRC as the sole legal government of China, effective January 1, 1979, with the US ending diplomatic relations with Taiwan. The one-year notice for the Mutual Defense Treaty was not in the text read (the treaty's Article X is the primary source).
- **C058[1]** The administration sent Congress a bill that said little about security, and Congress rewrote it.  
  FRUS: a House-Senate conference committee wrote the final version of the 'Taiwan omnibus legislation', and Carter's aides noted that 'Congress has obviously added its own touches'. That the administration's bill said little about security is not in the snippets; the milestone says the Taiwan Relations Act provides arms 'of a defensive character'.
- **C061[2]** The Reagan administration granted her asylum on April 4, 1983.  
  Media only: the Monitor reports Beijing cut off sports and cultural exchanges for the rest of 1983 over Washington's granting of asylum to Hu Na, and its April 5 digest says the Justice Department announced the asylum decision. The date April 4 and Reagan's role were not found in the text read; a Justice Department or White House record is the primary source.
- **C062[1]** In 1986 the two governments agreed on Peace Pearl, a program worth about $550 million to fit American radar and fire-control systems to 55 J-8II interceptors.  
  Both name the Peace Pearl program, the F-8 avionics modernization. The year 1986, the value of about $550 million and the 55 J-8II interceptors were not in the snippets.
- **C064[0]** State television rebroadcast his interview with a number for citizens to call, and two women reported him within hours.  
  NGO reports: Xiao Bin, a 42-year-old worker in Dalian, 'was arrested on 11 June after he was shown on Chinese national television'. The number to call and the two women who reported him within hours are not in the snippets.
- **C064[3]** On June 13 the Ministry of Public Security issued a wanted list of 21 student leaders, and state television showed their photographs for days.  
  NGO report covering the June 1989 repression: the page contains the date 13 June, the number 21, 'wanted', Wang Dan and the Ministry of Public Security, but the snippets do not show the wanted list of 21 student leaders directly.
- **C065[0]** George H. W. Bush had suspended military sales on June 5 and high-level exchanges on June 20.  
  State milestone: Bush denounced the crackdown and suspended military sales and high-level exchanges. GAO: 'the President announced sanctions on China' on June 5 and Congress codified the weapons prohibition in February 1990. The June 20 date for the suspension of high-level exchanges was not found.
- **C065[3]** The White House kept the trip hidden until December, when the same two men made a second and public visit and reporters traced the first.  
  Scowcroft (official conference transcript): he and Deputy Secretary Eagleburger flew to Beijing on a C-141 on a quiet mission after an exchange with Deng's side. ADST (secondary) describes the secret mission. The concealment until December and the reporters tracing the first visit were not in the snippets.
- **C066[3]** A 2004 revision changed the phrase to informatized conditions, and later defense white papers kept it.  
  The 2004 white paper (hosted by the Federation of American Scientists) discusses local wars and the revolution in military affairs; the 2015 white paper text says the 1993 guideline took 'winning local wars in conditions of modern technology, particularly high technology' as its basis and now stresses informationization. The word 'informatized' replacing 'high-technology' in the 2004 revision was not matched in the snippets.
- **C068[2]** A joint Saudi and American inspection at Dammam in early September found neither chemical in its 628 containers.  
  Secondary: the ship was inspected at Dammam with Saudi participation (Sha Zukang led the Chinese side) and 'carrying no such cargo'. The early-September date and the 628 containers were not found in the text read.
- **C069[1]** The Party rearrested Wei Jingsheng on April 1, 1994, weeks after he met Assistant Secretary of State John Shattuck.  
  NGO reports: HRW names Wei Jingsheng among those 'silenced' and mentions Shattuck; Amnesty says Wei Jingsheng was held in secret for 16 months as of August 1995, which counts back to spring 1994. The exact arrest date, April 1, 1994, and the link to the Shattuck meeting are not in the snippets.
- **C070[0]** Wu had spent nineteen years in the Party's labor camps before he left for the United States in 1985.  
  Senate resolution recitals: Peter H. Wu, known as Harry Wu, spent 19 years in Chinese labor camps and was arrested in 1995 on entering China. His departure for the United States in 1985 was not in the snippet; Britannica returned HTTP 403.
- **C071[2]** The company moved its lines to Tianjin and closed the Anderson plant in 2002.  
  A Labor Department notice lists a worker-adjustment petition by Magnequench workers in Indiana (petition dates in November 2001); the Commission statement discusses China's acquisition of the bonded-magnet maker. The move of lines to Tianjin and the 2002 closure of the Anderson plant were not in the text read. A helper's lead, unverified: sources give the closure between late 2001 and 2004 and do not name Tianjin.
- **C072[2]** In November it staged a lottery with a golden urn and installed its own candidate, Gyaincain Norbu.  
  US congressional commission analysis: the Chinese government dismissed as 'illegal and invalid' the Dalai Lama's May 1995 recognition of Gedun Choekyi Nyima and installed Gyaltsen Norbu in December 1995. The golden-urn lottery in November is not in the text read.
- **C073[1]** The Party answered with missile tests in the waters off Taiwan in July 1995 and again in March 1996, days before the island's first direct presidential election.  
  CRS: 'In response' to Lee's visit 'the PRC carried out missile launches, live-fire exercises'; tensions reached a zenith in March 1996 'when China began conducting ballistic missile tests'. The July 1995 tests and the timing days before Taiwan's first direct presidential election are not in the snippets.
- **C074[3]** The Democratic National Committee returned about $2.8 million in questionable donations and then called donors with Asian surnames to question their citizenship.  
  House committee report: the DNC prepared two questionnaires (one for individuals, one for corporate donors) for telephone interviews of donors, and the committee discusses the background of those involved in illegal contributions. The figure of about $2.8 million returned and the calls to donors with Asian surnames were not in the snippets.
- **C075[2]** Congress returned commercial satellites to the Munitions List in 1999.  
  CRS: the FY1999 National Defense Authorization Act (P.L. 105-261) was passed in 1998 and moved satellite export licensing back to the State Department's Munitions List; the effective date, March 15, 1999, is likely the source of '1999' in the sentence. The sentence's year should be checked against the Act's date (October 1998).
- **C076[0]** The freighter had run aground off Queens in June 1993, and ten of its passengers drowned.  
  BIA decision: the Golden Venture, with some 300 passengers and a crew of 13 Indonesian nationals, 'ran aground on a sandbar off the coast of New York' 100 to 200 yards off the Rockaway Peninsula on June 6, 1993. The passage read says the Coast Guard recovered the bodies of four passengers who drowned and three other passengers died later, which is seven, not ten; the commonly cited total of ten is not shown in the text read.
- **C079[0]** A B-2 bomber had struck the People's Republic's embassy in Belgrade with guided bombs during NATO's war over Kosovo, and the strike killed three Chinese journalists.  
  State Department: 'on 7 May 1999 one of the fleet of B-2 bombers from Whiteman AFB' dropped five 2,000-pound GPS-guided bombs on the building targeted, which proved to be the embassy. CRS: the payment was to the families of 'the 3 killed and to the 27 injured'. That the dead were journalists is not stated in the text read; a helper's lead, unverified: a CRS report calls them journalists, an earlier one embassy employees.
- **C083[1]** The Party held the twenty-four crew members for eleven days and released them after Washington delivered a letter that said sorry twice, once for his death and once for …  
  The letter says 'We are very sorry the entering of China's airspace and the landing did not have verbal clearance' and that the President and Secretary Powell 'have expressed their sincere regret over your missing pilot'. The crew size of 24 and the eleven days of detention are not in the letter; the Navy History page failed TLS verification.
- **C083[3]** The Party returned the aircraft in pieces aboard a Russian cargo plane that July.  
  CRS: on May 29 the US Embassy in Beijing announced an agreement under which the EP-3 'would be disassembled and transported back' by a Russian An-124 cargo plane. The July timing was not in the snippet read.
- **C084[0]** The Party had sought the listing since the September 11 attacks and used it to cast Uyghur dissent as terrorism.  
  CRS: the Bush Administration designated the PRC-targeted East Turkistan Islamic Movement (ETIM) as a terrorist organization in August 2002 (Armitage's announcement of August 26, 2002), after the PRC pressed Uighur separatism as terrorism since September 11. That the Party 'sought the listing since the September 11 attacks' is the CRS's framing of PRC efforts, not shown as a quotation here.
- **C085[0]** Minister Zhang Wenkang had told reporters on April 3 that the city had twelve cases.  
  Academic chapter (secondary) discusses Health Minister Zhang Wenkang's handling of the outbreak and Jiang Yanyong's disclosures. The April 3 press conference and the figure of twelve cases were not matched in the text read; the PMC copy of another article returned a CAPTCHA page.
- **C085[1]** Time magazine published Jiang's account, and on April 20 the Party fired Zhang and the mayor of Beijing as the city's reported count jumped from 37 to 339.  
  Academic chapter (secondary): on April 20 the Health Minister Zhang Wenkang and Beijing mayor Meng Xuenong were removed. The Time magazine article and the jump in the reported count from 37 to 339 were not matched; a helper's lead notes that 339 did not appear in any snippet.
- **C085[2]** The virus had spread from Guangdong since November 2002 while officials suppressed reports.  
  Two scholarly sources (secondary): SARS emerged in Guangdong in autumn 2002 with the earliest case in November 2002; the NAP chapter describes the delay in reporting and news conference. 'Officials suppressed reports' is the academic account, not a primary document.
- **C085[4]** In 2004 the army detained Jiang for seven weeks after he urged the Party to reassess June 4.  
  CECC: Jiang's 2004 letter called on the Party to reassess the verdict on the 1989 movement; he and his wife were detained from about June 1, 2004. HRW (NGO): Jiang told foreign media that security forces were dispatched in response to his letter and describes seven weeks of detention. Whether 'the army' detained him is not stated in the snippets; HRW says state security forces.
- **C087[1]** A court in Changsha sentenced him to ten years in April 2005 for leaking state secrets.  
  CECC: Shi Tao's sentence was ten years for disclosing 'state secrets'. Dui Hua (NGO): arrested in November 2004, he was sentenced in 2005 by a Hunan court. The April 2005 date and the Changsha court's name were not matched.
- **C087[2]** In November 2007 Representative Tom Lantos told Yahoo's leaders at a hearing that they were moral pygmies, and that month Yahoo settled a suit that the families of Shi a…  
  Media only: Yahoo settled with the families a week after a congressional hearing that scrutinized its role in Shi Tao's jailing; Lantos is named. The 'moral pygmies' quote was not in the snippets; the eWeek page returned HTTP 403.
- **C088[1]** The House voted 398 to 15 for a resolution that the sale would threaten national security, and Congress wrote a delay into the energy bill.  
  House resolution text: the sense of the House that 'a Chinese state-owned energy company exercising control of critical United States energy infrastructure' could threaten national security. The vote count 398 to 15 and the delay written into the energy bill were not found in the snippets (the CRS chronology lists H.Res. 344).
- **C095[3]** Liu died in custody of liver cancer on July 13, 2017.  
  Nobel Foundation: Liu Xiaobo, born 28 December 1955, died 13 July 2017 in Shenyang. The cause of death, liver cancer, and death in custody were not in the snippet read.
- **C099[1]** A court in Urumqi sentenced him to life in prison for separatism in September 2014, and seven of his students received prison terms.  
  State statement on the conviction and sentencing of Ilham Tohti; USCIRF lists the sentence as life imprisonment, with separatism as the reason, in 2014. The Urumqi court, the month, and the prison terms for seven students were not matched in the snippets.
- **C101[3]** Mo pleaded guilty on January 27, 2016, and received 36 months in October.  
  Court filing: the plea agreement of Mo Hailong (Robert Mo) with the United States describes the inbred seed of Pioneer and Monsanto as trade secrets. FBI story: Mo, 46, a legal permanent resident, was sentenced in Iowa the previous month. The plea date, January 27, 2016, and the 36-month term were not in the snippets.
- **C102[2]** Broidy pleaded guilty in 2020 to a related charge and received a pardon in January 2021.  
  Official statement: Trump granted a full pardon to Elliott Broidy among 73 pardons. Broidy's 2020 guilty plea (the OIG press release returned HTTP 403) was not read.
- **C103[2]** Belgium extradited Xu, and a jury convicted him of economic espionage and trade secret conspiracies in November 2021.  
  Sixth Circuit opinion: Yanjun Xu, a Chinese Ministry of State Security officer, was arrested by Belgian police in April 2018 and prosecuted for attempted theft of GE Aviation's composite fan-blade technology and economic espionage. The jury verdict month, November 2021, was not in the snippet; the DOJ release returned no text.
- **C103[3]** He received 20 years in November 2022.  
  Sixth Circuit opinion: Xu was sentenced to 240 months (20 years). The sentencing date, November 2022, was not in the snippet; the DOJ release returned no text.
- **C104[0]** Lee had left the agency in 2007, and in August 2012 FBI agents found notebooks in his Honolulu hotel room with the true names of CIA assets and their meeting places.  
  Court filing: the affidavit describes Lee's notebook with handwritten operational notes from asset meetings and his transit through Honolulu. The August 2012 date of the hotel-room search, the 2007 departure and 'true names' are not in the snippets; the DOJ press release returned no text.
- **C104[2]** The FBI arrested Lee in January 2018.  
  Court filing: complaint and arrest-warrant affidavit filed 01/13/18 in the Eastern District of Virginia. The arrest date, January 15, 2018 at JFK, was not matched.
- **C106[1]** The Party's retaliatory tariffs that July had hit soybeans and other farm goods, and analysts found them aimed at counties that had voted for the President in 2016.  
  Academic studies (secondary): the 2018 retaliatory tariffs fell on US exports from politically competitive counties and were aimed at Republican-leaning places (NBER 25638: tariffs 'favored sectors located in politically competitive counties, but retaliatory tariffs offset the benefits'; NBER 26434: Republican House candidates lost vote share). That the retaliation hit soybeans in July 2018 and targeted counties that voted for Trump in 2016 is the studies' general finding, not a quotation checked word by word.
- **C107[1]** The Party detained Michael Spavor the same week and held both men for 1,019 days.  
  State Department statement: the United States calls on the PRC to release 'Canadian citizens Michael Spavor and Michael Kovrig' and condemns 'these arbitrary detentions'. The Global Affairs Canada backgrounder timed out. The December 2018 start and the 1,019-day count are not on this page; a helper's own count from December 10, 2018 to September 24, 2021 gives 1,019 days, and Meng was arrested on December 1, so 'the same week' may be loose.
- **C107[2]** A court sentenced Spavor to eleven years for espionage in August 2021.  
  State Department statement: it condemns 'the sentence imposed against Mr. Spavor on August 10' (the page is titled for the sentencing). The eleven years and the espionage charge are not in the snippet; the Global Affairs Canada backgrounder timed out and the PRC foreign ministry page returned a maintenance notice.
- **C108[4]** In November 2023 the Party agreed to curb precursor exports.  
  ONDCP report: the 'landmark agreement between the two Presidents at the Woodside Summit in November 2023' restarted bilateral counternarcotics cooperation and created the Counternarcotics Working Group. The State page records PRC announcements on scheduling precursor chemicals. Neither snippet says in so many words that Beijing agreed in November 2023 to curb precursor exports. US government account.
- **C109[0]** Prosecutors said Jin and others fabricated evidence that the meetings broke the terms of service, created fake accounts in dissidents' names and passed users' names and …  
  Court filing: the affidavit says Jin, Huang and co-conspirators 'fabricated evidence of TOS violations to provide pretextual justification for terminating the meetings, as well as certain participants' accounts', and describes the meetings commemorating the Tiananmen Square massacre. The fake accounts and the passing of users' names and email addresses to PRC officials were not in the snippets; the DOJ press release returned no text. The filing does not name the company; it calls it Company-1.
- **C110[2]** On March 17 the Party expelled about a dozen American reporters from the New York Times, the Journal and the Washington Post and barred them from working in Hong Kong.  
  PRC foreign ministry statement (the PRC's own account): it requires the China-based branches of the New York Times, the Wall Street Journal and the Washington Post to hand back press cards within ten days and bars their staff from working as journalists in the PRC 'including its Hong Kong and Macao Special Administrative Regions'. The March 17 date and the 'about a dozen' count were not in the snippet; the page's URL carries a 2024 stamp, so the original 2020 date is unconfirmed. The State statement found (of February 19, 2020) is about the three Wall Street Journal correspondents and does not cover this sentence.
- **C113[2]** On December 1 the WTA's chief executive Steve Simon suspended all tournaments on the mainland, a decision that cost the tour its richest market.  
  WTA's own statement: Simon announced 'the immediate suspension of all WTA tournaments in China, including Hong Kong' on December 1, 2021. A hearing statement on the CECC site says the WTA's involvement in China was worth more than $1 billion and included a ten-year deal for the WTA Finals. 'Its richest market' is a characterization neither page states in those words.
- **C113[4]** The WTA returned in 2023 without the investigation it had demanded.  
  WTA's own statement of April 13, 2023: the tour will resume tournaments in China that fall. The word 'investigation' was not found on the page, so 'without the investigation it had demanded' is neither confirmed nor contradicted by this statement.
- **C115[0]** Evergrande had defaulted on its dollar bonds in December 2021 with liabilities of more than $300 billion.  
  CRS: 'In 2021, Evergrande was unable to repay $305 billion (2% of China's GDP) it owed to PRC and foreign creditors', not counting off-book liabilities. The page does not say the default was on dollar bonds or in December; a USCC chapter that was also read says many developers defaulted on dollar-denominated bonds without naming Evergrande's month.
- **C115[2]** In 2022 buyers in scores of cities stopped paying mortgages on unfinished apartments.  
  USCC: describes the presale system in which families took mortgages on yet-to-be-built flats and developers' defaults left presold units unfinished. A footnote cites Bloomberg News, 'Sweeping Mortgage Boycott Changes the Face of Dissent in China' (August 2, 2022). The body text read does not state the 2022 boycott or 'scores of cities'.
- **C117[0]** Fufeng Group of Shandong had bought about 370 acres twelve miles from the base, which hosts drone and space communications units.  
  Congressional hearing statement: 'the Fufeng Group's acquisition of 370 acres of land to build a wet corn mill plant near the Grand Forks Air Force Base in North Dakota'. Shandong, the twelve-mile distance and the drone and space-communications units were not in the snippets.
- **C117[1]** CFIUS had concluded in December 2022 that it lacked jurisdiction over the purchase.  
  Senate hearing transcript: a Chinese-linked company tried in 2022 to build a corn milling plant near Grand Forks Air Force Base and 'Treasury later determined that they did not have the proper jurisdiction to act in this case' (Treasury chairs CFIUS). This is a statement made at a hearing. December 2022 is not on the page.
- **C117[3]** Treasury later brought land near the base under review, and a rule of November 2024 added 59 more installations to the list.  
  Federal Register: the 2023 proposed rule's list includes Grand Forks Air Force Base among installations; the November 2024 final rule's background says the July 19, 2024 proposal would 'add 59 military installations to the appendix'. The page text read does not itself state the final count of 59 or that land near the base was 'brought under review'.

## Checked, not settled (48)

A page was tried (blocked, empty, wrong content, or the figure is in a chart or a scan). No link was added. Hosts that refused the runner: ftc.gov, hhs.gov, usda.gov, gao.gov, pnas.org, cbo.gov, spaceforce.mil, war.gov, congress.gov, news.uscg.mil, aps.org, mac.gov.tw, swift.com, sec.gov, spacenews.com, and justice.gov pages that return empty text. TLS failures (not bypassed): npc.gov.cn, english.scio.gov.cn, kinmen.gov.tw, eng.mod.gov.cn. Archive.org copies were rate limited (HTTP 429).

- **C002[2]** The merchants surrendered him, a Qing court convicted him, and officials executed him by strangulation in October 1821.  
  MIT Visualizing Cultures essay (university site) discusses the Terranova incident of 1821 but neither 'strangled' nor 'October' was in the text read; the USC US-China Exchange page failed TLS verification. The execution by strangulation in October 1821 is unchecked.
- **C015[2]** Soviet Russia's Karakhan Manifesto of July 1919 offered to give up Tsarist privileges in China, and the offer reached Chinese readers in March 1920.  
  Only a Britannica page was offered and it returned HTTP 403. The Karakhan Manifesto's July 1919 date and its reaching Chinese readers in March 1920 are unchecked.
- **C016[1]** The Party joined the Comintern as its Chinese section in 1922 and took its directives.  
  Britannica returned HTTP 403; the only readable page was Wikipedia's article on the Second CCP Congress, which is not used as a source here. It mentions a resolution on participation in the Comintern (1922). Needs a primary document (the Congress's resolutions) or a scholarly source.
- **C017[2]** Chiang Kai-shek struck in Shanghai on April 12, 1927, and the purge that followed killed thousands of Communists and labor activists.  
  The State Department milestone on the Chinese revolution covers the 1926-27 Northern Expedition and the Nationalist-Communist split but has no 'purge' or April 12 date; Britannica returned HTTP 403. The April 12, 1927 date and 'thousands killed' are unchecked.
- **C019[0]** The Party arranged Snow's passage into its base in the summer of 1936, and he stayed about four months.  
  The UMKC finding aid for Edgar Snow returned no text to the runner (HTTP 202) and Britannica returned HTTP 403. A helper agent's lead, unverified: UMKC says five months and Snow reached Bao'an on July 13, 1936, so 'about four months' needs checking against his own account.
- **C019[1]** Red Star Over China appeared in London in 1937 and in New York in January 1938, and a Chinese translation drew young volunteers to Yan'an.  
  The UMKC archival-object pages for the London (Gollancz) and New York (Random House) editions returned no text to the runner (HTTP 202). The 1937 and January 1938 publication dates are unchecked.
- **C026[2]** Soviet forces entered Manchuria on August 9, 1945, and the Party's troops moved in behind them as the Kwantung Army collapsed.  
  The Army Center of Military History page failed DNS on the runner and Britannica returned HTTP 403. The August 9, 1945 Soviet entry into Manchuria is unchecked here.
- **C027[2]** Jaffe paid a fine of $2,500, and no one went to prison.  
  The FBI history page on the Second World War and Cold War does not mention Amerasia, Jaffe or a fine. The $2,500 fine and the absence of prison terms are unchecked.
- **C034[2]** By 1956 the Party had brought private industry under joint state ownership, and Rong later founded CITIC in 1979 to court foreign capital.  
  Only a Britannica page was offered and it returned HTTP 403. The 1956 joint ownership and Rong Yiren's founding of CITIC in 1979 are unchecked.
- **C037[2]** The dispute over voluntary repatriation kept the war going for more than a year, and about 14,000 of the prisoners reached Taiwan in January 1954.  
  The Army Center of Military History pages returned HTTP 403 and a DNS failure. The length of the repatriation dispute and the January 1954 arrival of about 14,000 prisoners in Taiwan are unchecked.
- **C038[0]** Captors had subjected American prisoners to daily indoctrination and pressure to inform on one another, and some prisoners signed confessions.  
  The National Archives article did not contain indoctrination, brainwash or confess in the text read; the Army history page returned HTTP 403.
- **C042[1]** On June 8 the People's Daily turned on the critics, and the Anti-Rightist Campaign labeled more than 550,000 people rightists.  
  The Library of Congress authority page and Britannica both returned HTTP 403. The June 8 People's Daily editorial and the figure of more than 550,000 labeled rightists are unchecked.
- **C044[0]** Mao circulated the letter and attacked Peng on July 23, and the conference purged him as the leader of an anti-Party clique.  
  The CIA reading-room PDF of leader profiles did not contain Peng Te-huai, Lushan or 'anti-party clique' in the text read; Britannica returned HTTP 403. The July 23 date and the purge are unchecked.
- **C044[1]** The campaign against right opportunism that followed punished cadres who reported shortfalls, and grain procurement continued at inflated targets.  
  Both offered pages were Britannica and returned HTTP 403.
- **C044[2]** Scholarly estimates of deaths in the famine of 1959 to 1961 range from about fifteen million to forty-five million.  
  Both offered pages were Britannica and returned HTTP 403. The range of famine death estimates needs a scholarly source.
- **C045[0]** Tibetans had risen against Party rule in Lhasa on March 10, and Party artillery shelled the city after the Dalai Lama left.  
  The CIA reading-room document on covert action in the high altitudes returned no matches for Lhasa, Dalai Lama, March 1959 or artillery (it is probably a scanned image); Britannica returned HTTP 403.
- **C045[2]** Washington wound the program down as it moved toward the Party in the late 1960s and early 1970s.  
  The CIA covert-action PDF returned no matches for 1969, 1970, termination or phase; it is probably a scanned image the extractor could not read.
- **C050[0]** The Party had labeled Lin a rightist at Peking University in 1957 and arrested her in 1960.  
  The CECC hearing transcript offered for Lin Zhao did not mention Lin Zhao, Peking University, rightist, 1960 or 1968. Her 1957 labeling and 1960 arrest are unchecked.
- **C052[3]** The State Department recalled Blood that June.  
  The National Security Archive page does not contain 'recalled' or 'June 1971'; Blood's recall that June is unchecked.
- **C055[2]** In March 1979 Wei warned that Deng was becoming a new dictator, and police arrested him on March 29.  
  Britannica returned HTTP 403 and the CECC hearing transcript did not contain March 29, 1979. Wei Jingsheng's warning about Deng and his arrest date are unchecked.
- **C055[3]** A court sentenced him to fifteen years in October.  
  Both offered pages were Britannica and returned HTTP 403. Wei Jingsheng's fifteen-year sentence and its October date are unchecked.
- **C055[4]** In December the city moved the wall to a park and required every writer to register a name and workplace.  
  The FRUS document offered (1977-80 Vol. XIII, Document 279) mentions the Democracy Wall and Wei Jingsheng only in a footnote; the December move to a park and the registration rule were not in the text read; Britannica returned HTTP 403.
- **C055[5]** In 1980 the National People's Congress struck the right to write big-character posters from the constitution.  
  Both offered pages were Britannica and returned HTTP 403. The 1980 constitutional change on big-character posters is unchecked; the PRC constitution's text or a National People's Congress document is the primary source.
- **C060[0]** Chin was Chinese American, and witnesses said Ronald Ebens blamed him for auto jobs lost to Japanese imports.  
  The CourtListener opinion page returned no text (HTTP 202) and the DOJ blog page returned an empty page; neither mentioned Vincent Chin or Ebens in the text read.
- **C060[2]** A Wayne County judge gave Ebens and his stepson Michael Nitz three years' probation and fines of $3,000 each.  
  The CourtListener and DOJ pages returned no text. A helper's lead, unverified: the Sixth Circuit opinion gives the fine as $3,720, not $3,000.
- **C060[3]** A federal jury convicted Ebens of a civil rights crime in 1984, but an appeals court overturned the verdict, and a second jury acquitted him in 1987.  
  The CourtListener and DOJ pages returned no text. The 1984 conviction, the reversal and the 1987 acquittal are unchecked.
- **C062[3]** The Party withdrew from Peace Pearl in 1990 and bought Soviet Su-27 fighters instead.  
  The CRS and GAO documents name Peace Pearl and, separately, the Su-27, but the snippets do not connect China's 1990 withdrawal from Peace Pearl to buying Su-27s. Unchecked.
- **C070[1]** He went back several times under cover and filmed camps whose goods reached export markets, and CBS aired his footage on 60 Minutes in 1991.  
  Only Britannica was offered and it returned HTTP 403. Wu's covert filming and the 1991 60 Minutes broadcast are unchecked.
- **C081[3]** In 2006 the government and five news organizations paid him about $1.6 million to settle his privacy suit.  
  The CourtListener opinion page returned no text (HTTP 202). The 2006 settlement of about $1.6 million is unchecked.
- **C089[1]** The Party said nothing for twelve days.  
  The NASA newsletter did not contain '23 January' or Chinese government confirmation in the text read. The twelve days of silence is unchecked here.
- **C089[3]** The Party formed the Strategic Support Force in 2015 to fight in space and cyberspace, and in 2024 it split that force into separate aerospace, cyber and information arm…  
  The NDU Press and Defense Department report pages returned HTTP 403. The 2015 formation of the Strategic Support Force and its 2024 split are unchecked.
- **C094[2]** Former officials said in 2013 that the intruders had reached Google's records of American surveillance orders, which could reveal which of the Party's agents the FBI was…  
  The Washington Post article timed out on the runner. The 2013 claim that the intruders reached Google's records of surveillance orders is media-only and unchecked.
- **C098[0]** In April 2012 the Philippine navy had found mainland fishing boats inside Scarborough Shoal, and maritime surveillance ships of the People's Republic moved in to block a…  
  The CRS report on the South China Sea offered for the April 2012 Scarborough Shoal standoff did not contain the event in the snippets read.
- **C098[1]** American diplomats brokered what they described as a mutual withdrawal in June.  
  The CRS report snippets did not show the US-brokered mutual withdrawal in June 2012, and the congress.gov testimony page timed out. A State Department source was not found.
- **C099[2]** He won the Václav Havel Prize and the Sakharov Prize in 2019.  
  The European Parliament page returned no text and the Council of Europe page returned HTTP 403. The 2019 Vaclav Havel and Sakharov prizes are unchecked.
- **C100[2]** By 2018 the Party had placed antiship and antiaircraft missiles on Fiery Cross, Subi and Mischief reefs.  
  Both CRS In Focus PDFs on the South China Sea did not mention Fiery Cross, Subi, Mischief or missiles in the text read.
- **C100[3]** In December 2018 the Justice Department charged two hackers who worked with the Ministry of State Security in the APT10 campaign against American companies.  
  The DOJ press page returned an empty page to the runner. The December 2018 APT10 indictment is unchecked here; a court record or FBI page may serve.
- **C103[4]** Xu had also directed Ji Chaoqun, a student in Chicago who enlisted in the Army Reserve in 2016, and a jury convicted Ji in September 2022.  
  Both DOJ press-release pages returned no text to the runner. Ji Chaoqun's Army Reserve enlistment in 2016 and his September 2022 conviction are unchecked.
- **C104[3]** He pleaded guilty to conspiracy to deliver national defense information and received 19 years in November 2019.  
  Both DOJ press-release pages returned no text. The guilty plea (May 2019) and the 19-year sentence (November 2019) are unchecked.
- **C105[0]** ZTE had pleaded guilty in 2017 to shipping American technology to Iran and North Korea and had paid $1.19 billion.  
  The Commerce page returned HTTP 403 and the DOJ release returned no text. ZTE's 2017 guilty plea and $1.19 billion payment are unchecked.
- **C105[3]** In June the administration settled for a $1 billion fine, $400 million in escrow and new leadership, and a Senate attempt to restore the ban died in conference.  
  Both Commerce pages returned HTTP 403. The June 2018 settlement terms and the fate of the Senate amendment are unchecked.
- **C106[2]** Soybean exports to the mainland fell from about $12 billion in 2017 to about $3 billion in 2018.  
  The CRS report read (R45310) gives the $12 billion aid package and describes targeted export values but not the soybean figures of about $12 billion in 2017 and $3 billion in 2018 in the snippets; the other CRS page returned HTTP 403.
- **C107[3]** Meng reached a deferred prosecution agreement with the Justice Department on September 24, 2021.  
  Both Justice Department pages (the deferred prosecution agreement PDF and the press release) returned no text to the runner. Meng's September 24, 2021 agreement is unchecked.
- **C108[3]** Deaths from synthetic opioids in the United States passed 70,000 a year in 2021 and 2022.  
  Both CDC pages (the NCHS data brief PDFs) returned HTTP 403. The 70,000-a-year figure for 2021 and 2022 is unchecked.
- **C109[2]** The Justice Department charged Jin on December 18, 2020.  
  The Justice Department and FBI press-release pages returned no text, so the December 18, 2020 charging date is unchecked.
- **C112[1]** The Pentagon estimated that the Party's arsenal passed 600 operational warheads by mid-2024 and would exceed 1,000 by 2030.  
  Both Defense Department pages (the 2024 China Military Power Report and its fact sheet) returned HTTP 403 to the runner. The 600-warhead and 1,000-by-2030 figures are unchecked.
- **C115[3]** The company sought protection in a New York bankruptcy court in August 2023, and police detained its founder the next month.  
  Neither the CRS In Focus nor the USCC chapter mentions the Chapter 15 filing in New York in August 2023 or the September 2023 detention of Hui Ka Yan.
- **C118[2]** In May state television accused the expert network Capvision of helping foreign spies.  
  The House hearing transcript read says Chinese security forces raided and imprisoned local staff at Capvision, Bain and Mintz; it does not mention the May state television report or the foreign-spies accusation.

## Links that are not government or court pages (40)

Each entry has at least one link that is not a government or court page: a company, NGO, think tank, news agency, preprint, translator, reference work or archive. Where a government page would be better, say so in review; the label on the link says what the source is.

- **C003[0]** Library of Congress finding aid: Russell & Co., Guangzhou, records; Connecticut College exhibit essay: Delano's Dealings (secondary)
- **C008[0]** Yale News: first Chinese student to graduate from an American university; Connecticut Humanities: Yung Wing's Dream, the Chinese Educational Mission
- **C008[2]** Connecticut Humanities: Yung Wing's Dream
- **C014[0]** University of Hawaii at Manoa: Sun Yat-sen handout (Chinese Studies)
- **C022[0]** Independent Chinese PEN Center: Wang Shiwei (NGO, secondary)
- **C022[1]** Independent Chinese PEN Center: Wang Shiwei (NGO, secondary)
- **C022[2]** Aisixiang essay by Fu Guoyong, "Pursuing humanity: rereading Wang Shiwei" (Chinese essay site, secondary)
- **C031[1]** Truman Library: photograph of John Paton Davies after dismissal by Secretary Dulles; ADST oral history: The State Department Under the Red Scare (secondary)
- **C031[2]** Service v. Dulles, 354 U.S. 363 (1957), Cornell Legal Information Institute
- **C033[1]** National Archives blog: Blue Star Turned to Gold (the loss of Ens. Jesse L. Brown)
- **C035[0]** Wilson Center, CWIHP Working Paper 78: Leitenberg, China's False Allegations of the Use of Biological Weapons by the United States during the Korean War
- **C035[2]** Wilson Center, Cold War International History Project Bulletin 11 (1998): new evidence on the allegations; Wilson Center blog: Soviet, Chinese and North Korean false allegations of biological weapons use
- **C040[0]** Caltech Library exhibit: Remembering JPL co-founder Tsien
- **C040[1]** Caltech Aerospace: Qian Xuesen (Tsien Hsue-Shen)
- **C049[0]** Wilson Center: Sidney Rittenberg, expert biography
- **C061[2]** Christian Science Monitor, April 8, 1983 (media only); Christian Science Monitor, April 5, 1983 wire digest (media only)
- **C063[0]** ADST oral history: A Dissident for Dinner, George H. W. Bush's ill-fated banquet in China (secondary)
- **C064[0]** Amnesty International, China: Preliminary report on repression after 4 June 1989 (ASA 17/09/90); Human Rights Watch / Asia Watch: Detained in China and Tibet, update
- **C064[2]** Amnesty International, ASA 17/09/90
- **C064[3]** Amnesty International, ASA 17/09/90
- **C065[3]** State Department Office of the Historian: Brent Scowcroft remarks, China Conference 2006; ADST: Managing a Massacre, the ramifications of Tiananmen Square (secondary)
- **C066[2]** USCC testimony of Dean Cheng: PLA perspectives on network warfare in informationized local wars; Jamestown Foundation China Brief: China's new military strategy, winning informationized local wars (think tank)
- **C068[0]** ADST oral history: Spy vs. Spy, the Yin-he incident (secondary); Arms Control Wonk: The Yinhe Incident (Carnegie researcher's blog, secondary)
- **C068[2]** ADST oral history: Spy vs. Spy, the Yin-he incident (secondary); Arms Control Wonk: The Yinhe Incident (secondary)
- **C069[1]** Human Rights Watch/Asia: China, no progress on human rights (May 4, 1994); Amnesty International: Wei Jingsheng held in secret for 16 months (August 4, 1995)
- **C078[1]** State Department 1998 Country Report on Human Rights Practices: China; Human Rights Watch chronology: China, Hong Kong, Tibet (April-June 1998)
- **C078[3]** State Department 1998 Country Report on Human Rights Practices: China; Human Rights Watch: Nipped in the Bud, the suppression of the China Democracy Party (2000)
- **C082[3]** Acemoglu, Autor, Dorn, Hanson and Price, Import Competition and the Great US Employment Sag of the 2000s (MIT copy); NBER working paper 21906 (same study)
- **C085[0]** Yanzhong Huang, The SARS Epidemic and Its Aftermath in China: A Political Perspective (National Academies Press, via NCBI Bookshelf)
- **C085[1]** Yanzhong Huang, The SARS Epidemic and Its Aftermath in China (NAP via NCBI Bookshelf)
- **C085[2]** The chronology of the 2002-2003 SARS mini pandemic (PubMed Central); Yanzhong Huang, The SARS Epidemic and Its Aftermath in China (NAP via NCBI Bookshelf)
- **C085[4]** CECC: Chinese authorities free Dr. Jiang Yanyong from house arrest; Human Rights Watch: The Tiananmen Legacy, ongoing persecution of those seeking reassessment
- **C086[0]** Computerworld: Q&A, reverse hacker describes ordeal (media only); The Register: Employee fired for probing bad guys awarded $4.7m (media only)
- **C086[2]** The Register: Employee fired for probing bad guys awarded $4.7m (media only); Computerworld: Six months later, Sandia back-hacker still waits for his $4.7M (media only)
- **C087[1]** CECC: Chinese authorities release journalist and democracy advocate Shi Tao early; Dui Hua Foundation: April 2004, exposing Yahoo!'s role in the crackdown on journalist Shi Tao (NGO)
- **C087[2]** The Register: Yahoo settles with jailed Chinese journalists (media only)
- **C106[1]** Fajgelbaum, Goldberg, Kennedy and Khandelwal, The Return to Protectionism (NBER working paper 25638); Blanchard, Bown and Chor, Did Trump's trade war impact the 2018 election? (NBER working paper 26434)
- **C112[0]** Federation of American Scientists (NGO): the second nuclear missile silo field near Hami, July 26, 2021; Federation of American Scientists (NGO): A closer look at China's missile silo construction
- **C118[1]** CNN report on the Mintz Group fine, syndicated by KTVZ (media only)
- **C118[3]** Xinhua: China revises Counter-Espionage Law (NPC English-language site, April 27, 2023); A&O Shearman (law firm): the revised PRC Counter-Espionage law, what has really changed

## Checkable sentences nobody has tried yet (22)

74 checkable sentences still have no link; 52 of them were tried and are listed above as unresolved. The rest carry a date, number or named act and have not been looked at.

- **C016[2]** Chen Duxiu reported to Moscow in June 1922 that the Comintern had supplied almost all of the Party's spending since the previous October.
- **C048[1]** Chinese sources put the total who served at about 320,000, with a peak near 170,000 in 1967.
- **C054[2]** The Chinese text of the 1979 normalization communiqué used chengren, the word for diplomatic recognition.
- **C054[3]** When senators raised the change in 1979, the administration answered that the English text governed.
- **C066[0]** Coalition forces had broken Iraq's army in 1991 after six weeks of air war and a hundred hours on the ground.
- **C076[2]** Immigration judges split on such claims until Congress acted in 1996.
- **C076[3]** Section 601 of the Illegal Immigration Reform and Immigrant Responsibility Act defined forced abortion and sterilization as persecution on account of political opinion.
- **C077[0]** Martin Scorsese's film about the Dalai Lama's youth had drawn warnings from Party officials before its release in December 1997.
- **C080[3]** Falun Gong practitioners sued Cisco in 2011 and alleged that the company built features into Golden Shield to identify and track them.
- **C080[4]** The Ninth Circuit let most claims proceed on July 7, 2023, and Cisco asked the Supreme Court to review the ruling.
- **C090[0]** Sanlu, a dairy partly owned by New Zealand's Fonterra, had received complaints about sick infants since late 2007 and kept selling.
- **C090[2]** The formula sickened about 300,000 infants and killed six.
- **C090[3]** A year earlier melamine in wheat gluten and rice protein from two mainland suppliers had killed pets across the United States and forced the recall of more than 60 million packages of pet food.
- **C100[1]** Security firms reported fewer commercial intrusions from mainland groups in the months after.
- **C104[1]** Between 2010 and 2012 the Party's security services killed or imprisoned as many as twenty CIA sources on the mainland, according to reporting in 2017.
- **C116[2]** In November Apple limited AirDrop's open setting to ten minutes on phones sold in the People's Republic.
- **C116[3]** After a fire in Urumqi killed at least ten people on November 24, protests spread to more than a dozen cities, and demonstrators held up blank sheets of paper.
- **C117[2]** The city council voted in February 2023 to stop the project.
- **C119[0]** DeepSeek had released its R1 reasoning model on January 20, 2025, and its app soon topped the American download charts.
- **C119[1]** On January 27 Nvidia lost about $589 billion in market value, the largest one-day loss for any company in American market history.
- **C119[2]** DeepSeek's privacy policy stores user data on servers in the People's Republic, where the 2017 National Intelligence Law requires organizations to assist state intelligence work.
- **C120[3]** The defense policy law signed in December 2025 barred people from the People's Republic, Russia, Iran and North Korea from access to Pentagon cloud systems.

