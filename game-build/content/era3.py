#!/usr/bin/env python3 -I
"""Builds content/era3.json, the 2026 build. Twelve operations, one per domain.
Every dimension appears at least once and every one of the thirty-six stratagems is the signature of exactly one operation.
The 2026 claims come from the supplied playbook and contest map (their own F markers). Each is listed in SOURCING_2026.md for checking."""
import json, pathlib
HERE = pathlib.Path(__file__).parent
base = json.load(open(HERE / 'era2.json', encoding='utf-8'))

# ---------------------------------------------------------------- factions, leaders, pacts
FACTIONS = {k: v for k, v in base['factions'].items() if k in ('USA_Allies', 'PRC_State', 'Russia_Proxies')}
FACTIONS['Iran_Axis'] = {
    'id': 'Iran_Axis', 'name': 'Iran and its proxies', 'short': 'IRN', 'legitimacy': 40,
    'blurb': 'Fights through agents and sells oil to the one buyer that will take it.',
    'start': {'shields': {'Kinetic': 2, 'Economic': 1}}, 'focus': ['Kinetic', 'Economic', 'Information'],
    'power': {'Kinetic': 1}, 'affinity': {'S3': 4, 'S21': 3, 'S13': 2, 'S5': 2}, 'signature': ['S3', 'S21', 'S13'],
    'hostility': {'USA_Allies': 3, 'PRC_State': 0.3},
}
def cad(id, name, role, faction, domain, mods, blurb):
    return {'id': id, 'name': name, 'role': role, 'faction': faction, 'domain': domain, 'mods': mods, 'blurb': blurb}
reuse = {k: v for k, v in base['cadres'].items() if k in ('treasury_office', 'frontier_lab', 'cyber_operators', 'health_security', 'data_bureau', 'influence_service')}
CADRES = dict(reuse)
for c in [
    cad('campus_office', 'The campus compliance office', 'University', 'USA_Allies', 'Cultural', {'shield': 1}, 'Counts every foreign dollar that reaches a campus.'),
    cad('language_office', 'The language education office', 'Education ministry', 'PRC_State', 'Cultural', {'cardPower': {'delta': 1, 'codes': ['S1', 'S25']}}, 'Supplies the teachers and the textbooks.'),
    cad('allied_coast_guards', 'The allied coast guards', 'Maritime', 'USA_Allies', 'Kinetic', {'ap': {'delta': 1, 'when': 1}}, 'Shadow every patrol and publish what they see.'),
    cad('china_coast_guard', 'The China Coast Guard', 'Maritime law enforcement', 'PRC_State', 'Kinetic', {'cardPower': {'delta': 1, 'codes': ['S13', 'S6']}}, 'Calls a patrol law enforcement.'),
    cad('trade_remedies', 'The trade remedies offices', 'Commerce', 'USA_Allies', 'Economic', {'shield': 1}, 'Open a case where a sector floods.'),
    cad('policy_banks', 'The policy banks', 'State lenders', 'PRC_State', 'Economic', {'cardPower': {'delta': 1, 'codes': ['S28', 'S17', 'S12']}}, 'Finance the factories that no market would.'),
    cad('comms_cell', 'The allied communications cell', 'Public diplomacy', 'USA_Allies', 'Information', {'disrupt': {'delta': -1, 'codes': ['S26', 'S29', 'S7']}}, 'Answers a claim in the language of the audience that hears it.'),
    cad('propaganda_dept', 'The propaganda department', 'Party', 'PRC_State', 'Information', {'cardPower': {'delta': 1, 'codes': ['S26', 'S29', 'S7']}, 'legitimacy': -1}, 'Sets the line that state media repeats.'),
    cad('legal_advisers', 'The allied legal advisers', 'Law offices', 'USA_Allies', 'Legal', {'disrupt': {'delta': -1, 'groups': ['Control']}}, 'Answer a claim of law with the text of the resolution.'),
    cad('taiwan_office', 'The Taiwan Affairs Office', 'Party office', 'PRC_State', 'Legal', {'cardPower': {'delta': 1, 'codes': ['S30', 'S22', 'S24']}}, 'Turns a claim into a statute and a statute into a warrant.'),
    cad('fact_checkers', 'The Taiwanese fact-checkers', 'Civil society', 'USA_Allies', 'Psychological', {'shield': 1}, 'Answer a rumor within hours.'),
    cad('narrative_network', 'The narrative network', 'Media and amplifiers', 'PRC_State', 'Psychological', {'cardPower': {'delta': 1, 'codes': ['S33', 'S35', 'S10']}}, 'Repeats one doubt in a hundred voices.'),
    cad('independent_refiners', 'The independent refiners', 'Shandong', 'PRC_State', 'Economic', {'shield': 1}, 'Buy the crude that the big firms will not touch.'),
    cad('shadow_fleet', 'The shadow fleet', 'Tankers', 'Iran_Axis', 'Economic', {'cardPower': {'delta': 1, 'codes': ['S21', 'S3']}}, 'Changes the ship name between the Gulf and the dock.'),
    cad('export_offices', 'The allied export-control offices', 'Commerce', 'USA_Allies', 'Legal', {'disrupt': {'delta': -1, 'groups': ['Attack']}}, 'Review what leaves, and who receives it.'),
    cad('survey_fleet', 'The survey fleet', 'Research vessels', 'PRC_State', 'Cyber', {'cardPower': {'delta': 1, 'codes': ['S8', 'S5']}}, 'Maps the sea floor in public.'),
    cad('cable_owners', 'The cable owners', 'Industry', 'USA_Allies', 'Cyber', {'shield': 1}, 'Keep repair ships on contract.'),
    cad('chip_fund', 'The semiconductor fund', 'State investor', 'PRC_State', 'AI and Cognitive', {'cardPower': {'delta': 1, 'codes': ['S36', 'S14', 'S32']}}, 'Pays for chips that no foreign firm sells.'),
    cad('summit_team', 'The summit team', 'Executive office', 'USA_Allies', 'Association', {'ap': {'delta': 1, 'when': 0}}, 'Plans the meeting and the readout together.'),
    cad('liaison_dept', 'The United Front Work Department', 'Party department', 'PRC_State', 'Association', {'cardPower': {'delta': 1, 'codes': ['S23', 'S2', 'S34']}}, 'Makes friends where it has no claim and pressure where it has.'),
    cad('health_commission', 'The health commission', 'State health body', 'PRC_State', 'Biological', {'cardPower': {'delta': 1, 'codes': ['S20', 'S16', 'S27']}}, 'Decides which records leave the country.'),
]:
    CADRES[c['id']] = c

PACTS = {
    'partnership': base['pacts']['partnership'],
    'oil_shield': {
        'id': 'oil_shield', 'name': 'The oil shield', 'members': ['PRC_State', 'Iran_Axis'], 'against': 'USA_Allies', 'truce': True, 'active': True,
        'breakWhen': {'legitimacy': {'faction': 'Iran_Axis', 'lt': 25}},
        'onBreak': [{'type': 'tempo', 'faction': 'Iran_Axis', 'n': -1}, {'type': 'tempo', 'faction': 'PRC_State', 'n': -1}],
        'breakText': 'The buyer walks away. Tehran has become a cost to the Party.',
    },
}

# ---------------------------------------------------------------- operations
def op(n, title, year, tier, dim, stage, strat, theater, spine, opponent, start, end, label, brief, record, reading, gap, gapText, fix, arc, cadres, script, factions=('USA_Allies', 'PRC_State'), pacts=()):
    return {
        'id': f'W{n:03d}', 'kind': 'catalog', 'num': n, 'title': title, 'fullTitle': f'{title} ({year})', 'tier': tier, 'dimension': dim, 'stage': stage,
        'stratagems': strat, 'theater': theater, 'spine': spine, 'opponent': opponent, 'world': None, 'arc': arc,
        'when': {'start': start, 'end': end}, 'label': label, 'brief': brief, 'record': record, 'reading': reading,
        'gap': gap, 'gapText': gapText, 'fix': fix, 'factions': list(factions), 'player': 'USA_Allies', 'cadres': cadres, 'pacts': list(pacts), 'script': script,
    }
def P(f, d, n, by): return {'type': 'pressure', 'faction': f, 'domain': d, 'n': n, 'by': by}
def SL(f, d, n, by): return {'type': 'slope', 'faction': f, 'domain': d, 'n': n, 'by': by}
def SH(f, d, n): return {'type': 'shield', 'faction': f, 'domain': d, 'n': n}
def DROP(f, d): return {'type': 'dropShields', 'faction': f, 'domain': d}
def S(turn, text, *eff): return {'turn': turn, 'text': text, 'effects': list(eff)}
U, C = 'USA_Allies', 'PRC_State'

OPS = [
 op(1, 'The Last Institute', 2023, 1, 'Time', 'Attract', ['S1', 'S25', 'S9'], ['Cultural', 'Association', 'Legal', 'Information'], 'Cultural', 'The Party\'s education office',
    [2004, 11], [2023, 10], 'November 2004 to 2023',
    'In 2004 a university in Seoul opened the first Confucius Institute. Fifteen years later about a hundred American campuses hosted one.',
    'An office of the education ministry in Beijing paid for the teachers and the textbooks. In 2018 Congress barred Defense Department language funds from universities that hosted an institute. Most American campuses closed theirs within a few years. In 2020 the Beijing office became the Center for Language Education and Cooperation, and a nominally independent foundation took over the institutes that remained. By January 2023 the American count had fallen to fewer than five.',
    'The lesson was ordinary and the access was the point. This is Stratagem 1, deceive the heavens to cross the sea. A familiar classroom hid a channel. Stratagem 25 swaps the beams one at a time, because each concession on a campus looks small. Stratagem 9 does the rest. Most universities watched from across the river until a funding law forced the choice.',
    'Governance', 'Governance Architecture. No campus office could see every foreign agreement, so each deal looked small on its own.',
    'Keep one public register of every foreign-funded program on a campus, and give one named officer the authority to review it.',
    'The Seams', ['campus_office', 'language_office'],
    [S(3, 'Congress bars Defense Department language funds from schools that host an institute.', SH(U, 'Cultural', 1)), S(6, 'The Beijing office renames itself and hands the institutes to a foundation.', P(U, 'Cultural', 1, C), SL(U, 'Cultural', 1, C))]),

 op(2, 'The Circling', 2026, 2, 'Phase', 'Control', ['S13', 'S6', 'S4'], ['Kinetic', 'Association', 'Legal', 'Psychological'], 'Kinetic', 'The Party\'s coast guard and army',
    [2025, 12], [2026, 10], 'December 2025 to October 2026',
    'In September 2026 China Coast Guard ships circled Pratas Island for more than a day. Taiwan administers the island and the Party claims it.',
    'The People\'s Liberation Army named an exercise around Taiwan Justice Mission-2025 in December 2025. In September 2026 China Coast Guard vessels entered the waters off Kinmen on the 8th, the 10th and the 11th. They circled Pratas on the 7th and the 8th for more than twenty-four hours. PLA aircraft entered Taiwan\'s air defense identification zone 181 times that month. On 9 October 2026 four China Coast Guard ships entered the restricted waters off Kinmen, and Taiwan\'s coast guard expelled them. China\'s Maritime Safety Administration issued no-sail notices for five sea areas for People\'s Liberation Army exercises from 12 to 17 October. Taiwan\'s defense minister assessed that the areas lie off China\'s coast and that the exercises involve artillery only.',
    'The Party does not need to land on an island to change who governs it. Each patrol sets a precedent, and each precedent becomes the baseline for the next. This is Stratagem 13, stomp the grass to scare the snake. The named exercises mark the bursts and the coast guard fills the quiet between them. Stratagem 6 shows force in one place while pressure builds in another. Stratagem 4 waits for the defender to tire.',
    'Governance', 'Governance Architecture. Each patrol stayed below the line that would trigger a response, so no one owned the decision to answer the sum.',
    'Write the answer to each rung of the ladder in advance, and name one body that can order it.',
    'The Strait', ['allied_coast_guards', 'china_coast_guard'],
    [S(3, 'China Coast Guard ships circle Pratas for more than a day.', P(U, 'Kinetic', 2, C)), S(6, 'The People\'s Liberation Army announces a named exercise around Taiwan.', P(U, 'Kinetic', 1, C), P(U, 'Psychological', 1, C))]),

 op(3, 'The Surplus', 2026, 2, 'Gradient', 'Control', ['S28', 'S17', 'S12'], ['Economic', 'Financial', 'Legal', 'Association'], 'Economic', 'The Party-state',
    [2024, 10], [2026, 10], 'October 2024 to October 2026',
    'In October 2024 the European Union put new duties on electric cars built on the mainland. The factories kept building.',
    'The European Union\'s definitive duties on battery electric vehicles from the mainland took effect on October 30, 2024. They ran from 7.8 percent for Tesla\'s Shanghai plant to 35.3 percent for SAIC. BYD paid 17.0 percent. The Party\'s own statistics bureau reported that factories used less than three quarters of their capacity in 2025 while exports rose. The United States ran a smaller bilateral deficit with the mainland in 2025 than in 2024. The surplus moved to other markets.',
    'A factory built far above domestic demand must sell abroad. The surplus is an enabling condition and not a transfer to any partner. It pays for an industrial base that sanctions lists do not reach. This is Stratagem 28, lure the enemy onto the roof and remove the ladder. Each buyer that reorganizes around cheap supply loses the way back. Stratagem 17 casts a low price to attract the contract. Stratagem 12 takes one sector at a time.',
    'Business', 'Business Architecture. Importers treated each cheap input as a bargain and not as a dependency.',
    'Cap the share any one source may supply of a critical input, and aim trade remedies at the condition and not only at the flow.',
    'The Seams', ['trade_remedies', 'policy_banks'],
    [S(3, 'Cheap exports reach a sector faster than its defenders can answer.', SL(U, 'Economic', 1, C), P(U, 'Economic', 1, C)), S(6, 'A new round of duties lands and the surplus moves to another market.', P(U, 'Economic', 1, C), P(U, 'Association', 1, C))]),

 op(4, 'The Hostility Campaign', 2025, 3, 'Resonance', 'Control', ['S26', 'S29', 'S7'], ['Information', 'Economic', 'Cultural', 'Association'], 'Information', 'The Party\'s propaganda apparatus',
    [2025, 11], [2026, 6], 'November 2025 to June 2026',
    'In November 2025 Japan\'s new prime minister said in parliament that an attack on Taiwan could threaten Japan\'s survival. Within days the Party\'s agencies were telling Chinese citizens to avoid Japan.',
    'Prime Minister Sanae Takaichi said in the Diet that a Taiwan contingency could threaten Japan\'s survival. The Party\'s agencies answered with a travel advisory and a halt to Japanese seafood imports. State media ran a sustained campaign against Japan and its prime minister.',
    'The campaign had two audiences. One was the Party\'s own public, which learns who the enemy is. The other was every government that watches what it costs to say Taiwan\'s name. This is Stratagem 26, point at the mulberry while cursing the locust. Stratagem 29 decks the tree with false blossoms, because a boycott looks like popular anger. Stratagem 7 builds a grievance from a sentence.',
    'Principles', 'Architecture Principles. Allies had no shared rule for who answers when one member is coerced for a statement of policy.',
    'Agree in advance that coercion of one ally for a stated policy draws a joint response, and publish the rule.',
    'The Seams', ['comms_cell', 'propaganda_dept'],
    [S(2, 'State media opens a campaign against Japan and its prime minister.', P(U, 'Information', 2, C)), S(5, 'A travel advisory and an import halt hit Japan\'s seafood and tourism trades.', P(U, 'Economic', 1, C), SL(U, 'Information', 1, C))]),

 op(5, 'Resolution 2758', 2026, 3, 'Agency', 'Accommodate', ['S30', 'S22', 'S24'], ['Legal', 'Association', 'Psychological', 'Information'], 'Legal', 'The Party\'s legal offices',
    [2024, 6], [2026, 9], 'June 2024 to September 2026',
    'In October 1971 the General Assembly voted to seat the People\'s Republic at the United Nations. The resolution never mentions Taiwan. The Party now reads it as if it did.',
    'Resolution 2758 of October 25, 1971 recognized the representatives of the People\'s Republic as the only legitimate representatives of China at the United Nations. It does not mention Taiwan and does not settle Taiwan\'s status. The Anti-Secession Law of 2005 set out the legal frame the Party uses for Taiwan. In June 2024 mainland courts, prosecutors and police issued guidelines that treat advocacy of Taiwan\'s independence as a crime. Police on the mainland have since posted bounties for named Taiwanese. In October 2025 the National People\'s Congress Standing Committee named 25 October Taiwan Restoration Day, the date of Resolution 2758.',
    'A claim repeated by every official becomes a fact in the room even when the text says otherwise. This is Stratagem 30, make the host and the guest exchange places. The Party plays the guest who claims the house. Stratagem 22 shuts the door on a person who travels, because domestic law now reaches anyone it names. Stratagem 24 borrows the road, because a United Nations vote supplies the legal bridge.',
    'Principles', 'Architecture Principles. Allied governments had no common published reading of Resolution 2758, so each answered alone.',
    'Publish one shared legal reading of the resolution, and answer each use of the claim with the text.',
    'The Strait', ['legal_advisers', 'taiwan_office'],
    [S(3, 'The Taiwan Affairs Office announces that advocacy of independence is a crime.', P(U, 'Legal', 2, C)), S(6, 'Police post a bounty for a named Taiwanese.', P(U, 'Psychological', 1, C), SL(U, 'Legal', 1, C))]),

 op(6, 'Doubt About America', 2026, 4, 'Entropy', 'Accommodate', ['S33', 'S35', 'S10'], ['Psychological', 'Information', 'Association', 'Cultural'], 'Psychological', 'The Party\'s narrative network',
    [2021, 1], [2026, 9], '2021 to 2026',
    'In 2022 a rumor spread across Taiwan\'s social media that Washington would abandon the island when a war began. By 2023 researchers had counted dozens of versions.',
    'A Taiwanese research group, IORG, coded 84 distinct narratives that cast doubt on American reliability between 2021 and June 2023. It tied them to twelve trigger events and sorted them into eight types. It traced the amplification to Party media and to accounts inside Taiwan. A national university survey found that most residents describe themselves as Taiwanese only.',
    'The goal is not a conversion. The goal is a habit of doubt. This is Stratagem 33, sow discord among the enemy, aimed at the bond between an island and its patron. Stratagem 35 chains many small rumors into one mood. Stratagem 10 wears a friendly face while it does so. The defense lies in the public\'s own sense of who it is.',
    'Data', 'Data Architecture. No one published which narratives were circulating, so each rumor met an audience that had never heard it named.',
    'Publish a weekly public list of the narratives in circulation, with the evidence of who amplifies each.',
    'The Strait', ['fact_checkers', 'narrative_network'],
    [S(2, 'A rumor says Washington will abandon Taiwan in a crisis.', P(U, 'Psychological', 2, C)), S(5, 'The rumor returns with a new trigger event.', SL(U, 'Psychological', 1, C), P(U, 'Information', 1, C))]),

 op(7, 'The Teapots', 2026, 4, 'Topology', 'Extract', ['S3', 'S21', 'S11'], ['Financial', 'Economic', 'Legal', 'Data and Surveillance'], 'Financial', 'The Party-state and Iran',
    [2025, 1], [2026, 6], '2025 to June 2026',
    'About one barrel in eight of the crude that refiners on the mainland bought in 2025 came from Iran.',
    'Iran sold about 1.4 million barrels a day to the mainland in 2025, at a discount of eight to ten dollars a barrel. That was between eighty and ninety percent of its exports. Independent refiners in Shandong province bought most of it. In April 2026 the United States Treasury designated Hengli Petrochemical, one of the large refiners, and said the revenue helped fund Iran\'s military.',
    'The Party buys the oil. It does not give Iran a grant. The purchase is the lifeline, and the independent refiners are the buffer that lets the state say it took no part. This is Stratagem 3, kill with a borrowed knife. Stratagem 21 sheds the golden shell, because cargoes change names between the Gulf and the dock. Stratagem 11 gives up one refiner to save the system.',
    'Technology', 'Technology Architecture. Sanctions list companies, but the trade moves through a network that rebuilds itself after each listing.',
    'Map the network as a graph and sanction its hubs together, and pair each designation with an offer to the buyer to switch suppliers.',
    'The Seams', ['treasury_office', 'independent_refiners', 'shadow_fleet'],
    [S(3, 'Cargoes change names and reach Shandong.', P(U, 'Financial', 1, 'Iran_Axis'), SL(U, 'Financial', 1, C)), S(6, 'The Treasury designates a large refiner.', SH(U, 'Financial', 1), {'type': 'legitimacy', 'faction': C, 'n': -1})],
    factions=('USA_Allies', 'PRC_State', 'Iran_Axis'), pacts=['oil_shield']),

 op(8, 'The Leaked Wall', 2026, 5, 'Topology', 'Control', ['S31', 'S15', 'S19'], ['Data and Surveillance', 'Information', 'Legal', 'Association'], 'Data and Surveillance', 'The Party\'s surveillance industry',
    [2025, 9], [2026, 6], 'September 2025 to June 2026',
    'In September 2025 hundreds of gigabytes of internal files from a company that builds the Great Firewall appeared online. The files showed that the wall had been packaged for sale.',
    'The files came from Geedge Networks and the MESA laboratory. They described the systems that filter and monitor traffic inside the mainland. They also showed that a version of those systems went to governments in several other countries. Researchers who study digital repression disagree about the cause. One leading study argues that the buyer\'s own policing priorities predict use better than the seller\'s intent.',
    'The Party built a wall for its own people first. It then learned that the wall is also a product. This is Stratagem 31, the beauty trap run on money, because a buyer receives a capability and accepts a dependency. Stratagem 15 lures the tiger down the mountain by selling the tools where the buyer\'s own appetite supplies the demand. Stratagem 19 removes the firewood, since a government that can see everything can starve a movement before it forms. The record also supports a plainer reading. Many buyers wanted the wall.',
    'Governance', 'Governance Architecture. Export controls cover chips and not the integration services that turn parts into a system.',
    'Extend export review to surveillance integration services, and publish the list of end users that are denied.',
    'The Seams', ['export_offices', 'data_bureau'],
    [S(3, 'Internal files from a firewall vendor appear online.', P(U, 'Information', 1, C), P(U, 'Data and Surveillance', 1, C)), S(6, 'A new customer government signs for a filtering system.', P(U, 'Data and Surveillance', 2, C))]),

 op(9, 'The Cable Survey', 2026, 5, 'Criticality', 'Control', ['S8', 'S18', 'S5'], ['Cyber', 'Kinetic', 'Economic', 'Data and Surveillance'], 'Cyber', 'The Party\'s survey and cyber services',
    [2023, 2], [2026, 10], 'February 2023 to October 2026',
    'In February 2023 both subsea cables that connect Taiwan\'s Matsu islands to the main island stopped carrying data.',
    'Both Matsu cables stopped working in February 2023. In February 2024 the American cyber agency and its Five Eyes partners reported that state-sponsored hackers working for the People\'s Republic had gained persistent access to American critical infrastructure and could use it to disrupt service in a major crisis. In September 2026 the Philippine Coast Guard assessed that Party survey ships had worked near subsea cables off the Batanes islands from September 9 to 15 and again from September 22 to October 1.',
    'A cable is a thin line that carries a whole domain. Survey work looks like science and maps exactly where a cut would hurt. This is Stratagem 8, openly repair the gallery roads and march secretly through Chencang. Stratagem 18 captures the ringleader, because one hub can silence many users. Stratagem 5 loots a burning house, because the first day of a crisis is the day the defender\'s attention is elsewhere.',
    'Technology', 'Technology Architecture. A small island depends on two cables and one microwave link, and no policy owns the repair ships.',
    'Pair redundancy with prosecution. Add landing points and pre-contracted repair vessels, and treat a deliberate cut as an act that earns a named response.',
    'The Strait', ['cyber_operators', 'cable_owners', 'survey_fleet'],
    [S(3, 'A survey ship works near a cable landing.', P(U, 'Cyber', 1, C)), S(6, 'A cable stops carrying data.', P(U, 'Cyber', 2, C), P(U, 'Economic', 1, C), DROP(U, 'Cyber'))]),

 op(10, 'The Refusal', 2026, 5, 'Asymmetry', 'Extract', ['S32', 'S14', 'S36'], ['AI and Cognitive', 'Economic', 'Legal', 'Data and Surveillance'], 'AI and Cognitive', 'The Party\'s technology planners',
    [2025, 10], [2026, 6], 'October 2025 to June 2026',
    'In 2025 Washington cleared an advanced American AI chip for sale to firms on the mainland. Beijing\'s regulators discouraged the firms from buying it.',
    'The American government loosened its controls on one advanced AI chip, the H200, in late 2025. Regulators in Beijing then discouraged domestic firms from buying it, in line with a policy of self-reliance in chips. American prosecutors have charged people with smuggling restricted chips to the mainland, and the cases remain allegations until proven. In October 2025 Beijing began issuing a K visa for young foreign science and technology talent.',
    'A buyer who refuses to buy is bargaining. The Party wants the capacity and the independence, and it will pay in time to get both. The Party uses Stratagem 36 on purpose. Its name is if all else fails, retreat. Stratagem 32 shows an empty fortress, because a state that appears to need nothing negotiates from strength. Stratagem 14 borrows a corpse to resurrect the soul, because restricted chips and open models return under new names.',
    'Application', 'Application Architecture. Export controls check the buyer\'s name and not the use the chip is put to.',
    'Pair know-your-customer checks with shared audits of large clusters, and publish the penalties.',
    'The Seams', ['frontier_lab', 'chip_fund'],
    [S(3, 'Regulators tell domestic firms to hold off on the American chip.', P(U, 'AI and Cognitive', 1, C)), S(6, 'A smuggling network is charged in an American court.', SH(U, 'AI and Cognitive', 1), SL(U, 'AI and Cognitive', 1, C))]),

 op(11, 'The Summit Season', 2026, 6, 'Coherence', 'Accommodate', ['S23', 'S2', 'S34'], ['Association', 'Kinetic', 'Legal', 'Psychological'], 'Association', 'The Party-state and the Kremlin',
    [2026, 4], [2026, 11], 'April to November 2026',
    'In April 2026 the chair of Taiwan\'s Nationalist Party sat down with Xi Jinping. A package of American arms for Taiwan was already on hold.',
    'The Nationalist Party chair met Xi Jinping in April 2026. A package of arms for Taiwan worth about fourteen billion dollars had not been formally notified to Congress. The Asia-Pacific Economic Cooperation summit is set for Shenzhen in November 2026, and Vladimir Putin is due to attend. After a Trump-Xi summit in Beijing in May, the United States paused a record package of arms for Taiwan. In late September Xi made a state visit to Washington, and the two sides extended their trade truce by a few months. Both leaders intend to attend the Shenzhen summit on 18 and 19 November.',
    'The Party trades at summits and keeps the strategy. This is Stratagem 23, befriend a distant state while attacking a neighbor. A warm meeting with Washington leaves Taipei, Tokyo and Manila to wonder what was traded. Stratagem 2 besieges Wei to rescue Zhao, so pressure on an ally relieves pressure elsewhere. Stratagem 34 rewards a self-inflicted wound, because a held arms package costs the holder and buys the other side a better meeting.',
    'Governance', 'Governance Architecture. No standing channel ensures that an ally hears the terms of a summit before it ends.',
    'Create a standing allied consultation that runs before and after every summit, and publish what was traded.',
    'The Strait', ['summit_team', 'liaison_dept', 'influence_service'],
    [S(3, 'A summit opens and a package of arms for Taiwan stays on hold.', P(U, 'Association', 2, C)), S(6, 'The two partners appear together at a second summit.', P(U, 'Association', 1, 'Russia_Proxies'), SL(U, 'Association', 1, C))],
    factions=('USA_Allies', 'PRC_State', 'Russia_Proxies'), pacts=['partnership']),

 op(12, 'The Unsupplied Data', 2025, 6, 'Entropy', 'Extract', ['S20', 'S16', 'S27'], ['Biological', 'Information', 'Legal', 'Association'], 'Biological', 'The Party\'s health authorities',
    [2020, 1], [2025, 6], '2020 to June 2025',
    'In June 2025 an advisory group of the World Health Organization published its assessment of how the COVID-19 virus began. It listed the data it had asked for and never received.',
    'The WHO Scientific Advisory Group for the Origins of Novel Pathogens published its assessment on June 27, 2025. It reported that data it requested from the authorities in Beijing were not supplied. It did not decide between a natural spillover and a laboratory accident. A majority staff report of a House subcommittee reached a laboratory conclusion in December 2024, and the minority dissented.',
    'The record shows what was withheld. It does not show why. This is Stratagem 20, muddy the waters to catch the fish, because a gap in the data becomes room for every theory. Stratagem 16 lets a little go to keep the inquiry cooperative while the key records stay shut. Stratagem 27 feigns confusion while holding the records. A reader should hold the withholding as fact and the origin as an open question.',
    'Data', 'Data Architecture. The international health rules have no means to compel a state to hand over what an inquiry requests.',
    'Make data-sharing terms a condition of funding and of seats on inquiry panels, and publish each request and each reply.',
    'The Seams', ['health_security', 'health_commission'],
    [S(3, 'A request for data goes unanswered.', P(U, 'Information', 2, C)), S(6, 'Two official reports reach opposite conclusions.', P(U, 'Biological', 1, C), SL(U, 'Information', 1, C))]),
 op(13, 'The Ballot', 2026, 4, 'Phase', 'Control', ['S7', 'S29', 'S20'], ['Information', 'Psychological', 'Data and Surveillance', 'Association'], 'Information', 'The Party\'s influence agencies',
    [2026, 4], [2026, 11], 'April to November 2026',
    'On 28 November 2026 Taiwan elects 22 mayors and magistrates and 11,051 local officials in all. By 8 September its Investigation Bureau had already opened 54 cases of suspected foreign interference and electoral fraud.',
    'Taiwan holds its local elections on 28 November 2026. By 8 September its Investigation Bureau had opened 54 cases of suspected foreign interference and electoral fraud, and prosecutors had tracked more than 200 suspicious financial transactions. The National Security Bureau warned in April 2026 that Beijing would interfere in the vote. The record ends here. The vote has not yet taken place.',
    'Scenario, not record. The Party gains most when voters doubt the count, whoever wins. This is Stratagem 20, muddy the waters to catch the fish. Stratagem 7 builds a scandal from nothing, and Stratagem 29 decks the tree with false blossoms. The contest is between Taiwan\'s own parties and the game takes no side. The threat is the campaign from outside.',
    'Data', 'Data Architecture. No public register tells voters which claims are circulating or who amplifies them.',
    'Publish a daily list of false claims in circulation during the campaign, with the evidence of who amplified each, and certify results on a fixed timetable.',
    None, ['fact_checkers', 'taiwan_office', 'narrative_network'],
    [S(3, 'Scenario. Foreign-linked accounts push a claim about the vote.', P(U, 'Information', 2, C)),
     S(6, 'Scenario. A rumor about the count spreads.', P(U, 'Psychological', 1, C), P(U, 'Data and Surveillance', 1, C)),
     S(8, 'Scenario. Election night brings a surge of doubt about the count.', P(U, 'Information', 3, C))]),

 op(14, 'The Special Budget', 2026, 6, 'Coherence', 'Accommodate', ['S33', 'S9', 'S4'], ['Financial', 'Association', 'Psychological', 'Legal'], 'Financial', 'The Party-state',
    [2026, 5], [2026, 10], 'May 2026 to October 2026',
    'In May 2026 Taiwan\'s legislature passed a special defense budget of NT$780 billion. The executive had asked for NT$1.25 trillion.',
    'Taiwan\'s legislature passed a special defense budget bill of NT$780 billion, about US$26 billion. The executive had proposed NT$1.25 trillion. The opposition had favored a framework of NT$380 billion plus additions. Analysts tied the final amount to American pressure before the Trump-Xi summit in Beijing. Taiwan\'s 2027 defense budget is set to exceed 3 percent of gross domestic product for the first time, and President Lai has pledged 5 percent by 2030.',
    'A divided government can fund deterrence when an outside deadline sets the price. The Party gains from every month the price stays in dispute. This is the shape of Stratagem 33, sow discord among the enemy, whether or not Beijing caused the dispute. Stratagem 9 watches the fire from across the river while Taipei argues. Stratagem 4 waits at ease for a weary opponent. The record shows the amount and not the motive.',
    'Governance', 'Governance Architecture. No standing rule let the executive and the legislature agree a defense price before an outside deadline set it.',
    'Agree a multiyear defense funding floor in advance of each summit season, and publish it.',
    'The Strait', ['summit_team', 'taiwan_office', 'narrative_network'],
    [S(3, 'The executive and the legislature split over the price of deterrence.', P(U, 'Financial', 2, C)),
     S(5, 'An outside deadline sets the price at a lower figure.', P(U, 'Association', 1, C), SL(U, 'Financial', 1, C)),
     S(7, 'The price stays in dispute for another month.', P(U, 'Psychological', 1, C))]),
]

def watch(o, settle='2026-11-29'):
    o['kind'] = 'watch'; o['status'] = 'open'; o['settleOn'] = settle
    return o
watch(OPS[12])

def tuned(ops):
    f = HERE / 'era3.tuning.json'
    if not f.exists(): return
    t = json.load(open(f, encoding='utf-8'))
    for o in ops:
        if o['id'] in t:
            o['rules'] = {'handScale': t[o['id']]['handScale']}
            if t[o['id']]['consumeAdj']: o['consumeAdj'] = t[o['id']]['consumeAdj']

COPY = {
    'hero': 'Every operation comes from the record of the contest as it stands in the autumn of 2026. Fourteen operations. Twelve cover the twelve domains, one covers Taiwan\'s defense budget, and a watch follows its 28 November vote.',
    'arcsLabel': '2004 to 2026', 'arcsTitle': 'Two campaign arcs',
    'arcsText': 'The Taiwan Strait and the seams where allies, trade, data and law meet.',
    'opsNote': 'Fourteen operations from the record to October 2026. Twelve cover the twelve domains. Tier sets the difficulty.',
    'arcsNote': 'Two arcs. Each runs through the record one operation at a time. Win an operation to open the next.',
}
ARCS = [
    {'id': 'the-strait', 'name': 'The Strait', 'span': '2023 to 2026', 'blurb': 'The Taiwan Strait, from the coast guard\'s circles to the summit table.',
     'nodes': [o['id'] for o in sorted((o for o in OPS if o['arc'] == 'The Strait' and o['id'] != 'W014'), key=lambda o: o['tier'])] + ['W014']},
    {'id': 'the-seams', 'name': 'The Seams', 'span': '2004 to 2026', 'blurb': 'The places where allies, trade, data and law meet. The method works through each of them.',
     'nodes': [o['id'] for o in sorted((o for o in OPS if o['arc'] == 'The Seams'), key=lambda o: o['tier'])]},
]

CALENDAR = [
    {'date': '2026-10-12', 'end': '2026-10-17', 'label': 'People\'s Liberation Army exercises in five sea areas off the mainland coast. Taiwan\'s defense minister says they lie away from Taiwan.', 'kind': 'window', 'source': 'https://www.taipeitimes.com/News/taiwan/archives/2026/10/12/2003865828', 'ref': None},
    {'date': '2026-10-25', 'end': None, 'label': 'Taiwan Restoration Day observance in the People\'s Republic. The date is also the date of Resolution 2758.', 'kind': 'scheduled', 'source': 'https://subsites.chinadaily.com.cn/npc/2025-10/25/c_1135469.htm', 'ref': None},
    {'date': '2026-11-18', 'end': '2026-11-19', 'label': 'APEC leaders meet in Shenzhen. Trump and Xi both intend to attend.', 'kind': 'scheduled', 'source': 'https://www.csis.org/analysis/takeaways-trump-xi-white-house-summit', 'ref': None},
    {'date': '2026-11-28', 'end': None, 'label': 'Taiwan holds local elections for 22 mayor and magistrate posts.', 'kind': 'scheduled', 'source': 'https://en.wikipedia.org/wiki/2026_Taiwanese_local_elections', 'ref': None},
    {'date': '2026-12', 'end': None, 'label': 'The G20 leaders meet in Miami. Xi is expected to attend.', 'kind': 'scheduled', 'source': 'https://www.csis.org/analysis/takeaways-trump-xi-white-house-summit', 'ref': None},
]
CALENDAR_NOTE = 'Dates are scheduled or expected. Nothing here is a prediction.'

def build():
    tuned(OPS)
    boot = next(o for o in base['ops'] if o['id'] == 'C001')
    return {
        'schema': 2, 'storageKey': 'tdw-2026-1', 'era': 'contest-2026', 'ruleset': {'legitimacy': True},
        'copy': COPY, 'tutorial': 'C001', # The daily pool stays the twelve operations it had on 12 October. A longer pool would change which operation a past date maps to, and a verified daily record checks that mapping.
        'daily': [o['id'] for o in OPS if o['id'] not in ('W013', 'W014')],
        'factions': FACTIONS, 'cadres': CADRES, 'pacts': PACTS,
        'calendar': CALENDAR, 'calendarNote': CALENDAR_NOTE,
        'ops': [boot] + OPS, 'arcs': ARCS, 'taxonomy': base['taxonomy'], 'dailyEpoch': base['dailyEpoch'],
    }

if __name__ == '__main__':
    out = build()
    json.dump(out, open(HERE / 'era3.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('era3.json', len(out['ops']), 'ops')
