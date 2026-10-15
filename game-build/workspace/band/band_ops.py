"""Spec of the asymmetry-band operations. build_band.py turns it into operations and checks every evidence id against evidence.json.
Everything the player reads is in house style. A move's evidence line is the card's claim, copied by the builder and never retyped here."""

US, PRC = 'USA_Allies', 'PRC_State'
def eff(t, f, d=None, n=None, **k):
    e = {'type': t, 'faction': f}
    if d: e['domain'] = d
    if n is not None: e['n'] = n
    e.update(k); return e
def press(d, n, mirror=None, by=PRC):
    e = eff('pressure', US, d, n, by=by)
    if mirror: e['mirror'] = mirror
    return e
def move(id, name, domain, text, permit, effects, cards, priced=None, limit=1, ap=1, log=None):
    m = {'id': id, 'name': name, 'domain': domain, 'text': text, 'permit': {US: permit}, 'limit': limit, 'ap': ap, 'effects': effects, 'cards': cards}
    if priced: m['pricedEffects'] = priced
    if log: m['log'] = log
    return m

W017 = {
 'id': 'W017', 'kind': 'catalog', 'num': 17, 'title': 'The Reach', 'fullTitle': 'The Reach (2026)', 'tier': 7, 'band': 'asymmetry',
 'dimension': 'Agency', 'stage': 'Control', 'stratagems': ['S3', 'S8', 'S35'],
 'theater': ['Legal', 'Association', 'Data and Surveillance', 'Psychological'], 'spine': 'Legal',
 'opponent': 'The Party-state', 'world': None, 'arc': None, 'when': {'start': [2017, 6], 'end': [2026, 10]}, 'label': 'June 2017 to October 2026',
 'brief': 'A statute of 2017 obliges any organization or citizen to assist state intelligence work. A law of 2020 claims jurisdiction over offenses committed abroad by non-residents.',
 'record': 'The National Intelligence Law of 2017 states in Article 7 that any organization or citizen must support, assist and cooperate with state intelligence work. The Hong Kong national security law of 2020 claims jurisdiction under Article 38 over offenses committed outside Hong Kong by non-residents. Hong Kong police later posted bounties on named activists abroad. In 2023 the Justice Department brought complaints and arrests relating to overseas police service stations. The book argues that the statute puts the relatives of a person abroad within reach, and it states that as its own argument. The record ends on 12 October 2026.',
 'reading': 'Scenario, not record. The Party-state acts on its own population and its own firms under law that no court can refuse. The United States and its allies hold powers of the same kinds, and the law divides them, so each use needs a court or a warrant. The book argues for cutting the reach and never the people. Suspicion by ancestry is the outcome the Party wants. This is Stratagem 3, kill with a borrowed knife. Stratagem 35 chains the stratagems.',
 'gap': 'Governance', 'gapText': 'Governance Architecture. A free society has no standing rule that treats an act of a foreign state against a person on its soil as one offense, so each case arrives as a private dispute.',
 'fix': 'Treat transnational repression as a national-security offense, shut the overseas stations and protect the diaspora plainly.',
 'factions': [US, PRC], 'player': US, 'cadres': ['legal_advisers', 'liaison_dept', 'data_bureau'], 'pacts': [],
 'script': [
   {'turn': 2, 'text': 'A security organ asks a firm abroad for its customer records and cites the 2017 law.', 'effects': [press('Data and Surveillance', 2, 'handover')]},
   {'turn': 3, 'text': 'Agents press the relatives of an activist abroad.', 'effects': [press('Psychological', 1, 'family'), eff('slope', US, 'Psychological', 1, by=PRC)]},
   {'turn': 5, 'text': 'A bounty and a summons reach activists abroad under the 2020 law.', 'effects': [press('Legal', 2, 'jurisdiction')]},
   {'turn': 7, 'text': 'A station on foreign soil pressures a dissident.', 'effects': [press('Association', 2, 'station')]},
 ],
 'reach': [
   move('handover', 'Compel a firm to hand over its data', 'Data and Surveillance', 'Order any firm to give up its customer data on demand, with no court or warrant.', 'barred',
        [eff('ease', US, 'Data and Surveillance', 3), eff('shield', US, 'Data and Surveillance', 2)], ['EV-001', 'EV-020']),
   move('family', 'Press the relatives of a person abroad', 'Psychological', 'Use a person\'s family as a lever to silence them.', 'barred',
        [eff('unslope', US, 'Psychological', 2), eff('leverage', PRC, None, -2)], ['EV-004', 'EV-003', 'EV-010']),
   move('jurisdiction', 'Claim jurisdiction over speech abroad', 'Legal', 'Charge people abroad for what they say and post bounties on them.', 'barred',
        [eff('ease', US, 'Legal', 3), eff('leverage', PRC, None, -1)], ['EV-002', 'EV-019']),
   move('station', 'Run a station on foreign soil', 'Association', 'Pressure a dissident abroad through a station that no host government agreed to.', 'barred',
        [eff('ease', US, 'Association', 2), eff('leverage', PRC, None, -1)], ['EV-003', 'EV-010']),
   move('ancestry', 'Screen people by ancestry and family ties', 'Association', 'Treat origin and family as a sign of risk, which relieves pressure at once and gives the Party what it wants.', 'priced',
        [eff('ease', US, 'Association', 3), eff('ease', US, 'Data and Surveillance', 2), eff('leverage', PRC, None, -2)], ['EV-014'],
        priced=[eff('legitimacy', US, None, -8, why='ancestry screening', self='breach of own legitimating rule', selfWhy='ancestry screening'), eff('slope', US, 'Association', 2, by=PRC), eff('leverage', PRC, None, 1, why='ancestry screening')]),
   move('name_crime', 'Charge it as a national-security offense', 'Legal', 'Treat transnational repression as an act of a foreign state and not a private dispute.', 'free',
        [eff('shield', US, 'Legal', 1), eff('unslope', US, 'Psychological', 1), eff('leverage', PRC, None, -1)], ['EV-017']),
   move('protect', 'Protect the diaspora and open a reporting line', 'Association', 'Tell people who are threatened where to report it, and answer every report.', 'free',
        [eff('shield', US, 'Association', 2), eff('ease', US, 'Association', 1)], ['EV-017', 'EV-014']),
   move('designate', 'Designate the agencies and list the front organizations', 'Legal', 'Publish who acts for the state, in the register, with the date.', 'free',
        [eff('shield', US, 'Legal', 1), eff('leverage', PRC, None, -1)], ['EV-015']),
   move('pre_authorize', 'Stage the legal response before the trigger', 'Legal', 'Agree sanctions and legal measures in advance so the answer lands in hours.', 'free',
        [eff('shield', US, 'Legal', 2), eff('coherence', US, None, 1)], ['EV-018']),
 ],
 'rules': {'handScale': 1.0},
}

W018 = {
 'id': 'W018', 'kind': 'catalog', 'num': 18, 'title': 'The Wallet', 'fullTitle': 'The Wallet (2026)', 'tier': 7, 'band': 'asymmetry',
 'dimension': 'Asymmetry', 'stage': 'Extract', 'stratagems': ['S22', 'S33', 'S16'],
 'theater': ['Financial', 'Economic', 'Information', 'Data and Surveillance'], 'spine': 'Financial',
 'opponent': 'The Party-state', 'world': None, 'arc': None, 'when': {'start': [2020, 11], 'end': [2026, 10]}, 'label': 'November 2020 to October 2026',
 'brief': 'In November 2020 the authorities suspended a giant listing two days before it was to price. In 2022 a democracy froze the accounts of people who had funded a protest.',
 'record': 'In November 2020 authorities suspended the Ant Group listing two days before it was to price. The People\'s Bank of China designed its digital currency on a managed-anonymity principle, private for small purchases and traceable when the state decides it matters. The book states that full integration with the behavioral record is not yet operational at national scale. Democracies hold the same instruments. In February 2022 Canada invoked its Emergencies Act and froze the accounts of people who had funded a protest. A Federal Court ruling in 2024 found the invocation unreasonable. From 2013 to 2017 a Justice Department initiative pressured banks to cut off legal but disfavored businesses. In 2023 a British bank debanked a political figure over his views, and an apology and a regulatory review followed. The record ends on 12 October 2026.',
 'reading': 'Scenario, not record. A single party holds the power over money with no court, no vote and no press to answer to. A democracy holds the same instruments and the law divides them, so each use of one costs it something. The book warns that each use without due process wears that restraint away. This is Stratagem 22, shut the door to catch the thief. Stratagem 16 lets the enemy off in order to catch them.',
 'gap': 'Governance', 'gapText': 'Governance Architecture. No standing rule requires a court before a person is cut off from the financial system, so each freeze is decided case by case.',
 'fix': 'Require due process before any person is cut off from the financial system and keep the instruments visible, divided and contestable.',
 'factions': [US, PRC], 'player': US, 'cadres': ['treasury_office', 'policy_banks', 'trade_remedies'], 'pacts': [],
 'script': [
   {'turn': 2, 'text': 'A payment channel the state can trace pulls a trade off the dollar rails.', 'effects': [press('Financial', 2, 'trace')]},
   {'turn': 4, 'text': 'Coverage of a foreign investor\'s loss disappears from the domestic press.', 'effects': [press('Information', 2, 'silence')]},
   {'turn': 6, 'text': 'A listing is halted and foreign holders cannot sell.', 'effects': [press('Economic', 2), eff('slope', US, 'Financial', 1, by=PRC)]},
 ],
 'reach': [
   move('trace', 'Trace every payment the state chooses', 'Financial', 'Read any payment at will, with no court between the state and the ledger.', 'barred',
        [eff('ease', US, 'Financial', 2), eff('leverage', PRC, None, -1)], ['EV-005', 'EV-020']),
   move('silence', 'Order the press to stop covering a firm', 'Information', 'Stop the coverage of a firm or a loss.', 'barred',
        [eff('ease', US, 'Information', 3), eff('leverage', PRC, None, -1)], ['EV-007', 'EV-008', 'EV-019']),
   move('freeze', 'Freeze accounts without a court', 'Financial', 'Cut a person off from the financial system on an executive order.', 'priced',
        [eff('ease', US, 'Financial', 3), eff('shield', US, 'Financial', 2), eff('leverage', PRC, None, -2)], ['EV-011', 'EV-012', 'EV-013', 'EV-010'],
        priced=[eff('legitimacy', US, None, -6, why='freeze without due process', self='breach of own legitimating rule', selfWhy='freeze without due process'), eff('slope', US, 'Financial', 1, by=PRC)]),
   move('designate_firms', 'Designate the firms and publish the list', 'Economic', 'List the companies in the register, with the date and the reason.', 'free',
        [eff('shield', US, 'Economic', 1), eff('leverage', PRC, None, -1)], ['EV-015']),
   move('inspection', 'Make a listing depend on an inspection agreement', 'Financial', 'Tie access to the exchange to a statute and an inspection agreement.', 'free',
        [eff('shield', US, 'Financial', 1), eff('ease', US, 'Financial', 1), eff('coherence', US, None, 1)], ['EV-016']),
   move('due_process', 'Publish the rule that a court comes first', 'Financial', 'No person is cut off from the financial system without a court.', 'free',
        [eff('shield', US, 'Financial', 2), eff('legitimacy', US, None, 3, why='due process')], ['EV-010']),
 ],
 'rules': {'handScale': 1.0},
}

W019 = {
 'id': 'W019', 'kind': 'catalog', 'num': 19, 'title': 'The Lab', 'fullTitle': 'The Lab (2026)', 'tier': 7, 'band': 'asymmetry',
 'dimension': 'Gradient', 'stage': 'Accommodate', 'stratagems': ['S17', 'S14', 'S10'],
 'theater': ['Cultural', 'Association', 'Legal', 'Data and Surveillance'], 'spine': 'Cultural',
 'opponent': 'The Party-state', 'world': None, 'arc': None, 'when': {'start': [2018, 11], 'end': [2026, 10]}, 'label': 'November 2018 to October 2026',
 'brief': 'The Party-state draws researchers abroad toward its institutions with funding and prestige. In 2018 a democracy answered with a criminal initiative and ended it four years later.',
 'record': 'Talent-recruitment programs led by the Thousand Talents Plan draw established researchers toward Chinese institutions with funding and prestige. Recruitment on better pay is an ordinary economic fact and is no sign of disloyalty by anyone recruited. A Senate subcommittee report of November 2019 examined the plans as one campaign. The Justice Department announced a China Initiative in November 2018 against researchers who hid Beijing funding from their American grants, and it ended the initiative in February 2022. The book calls it too narrow and too slow and says many read it as proof that the effort was never about security. In 1942 the United States excluded Japanese Americans on the strength of ancestry alone, and a federal commission later found that military necessity never justified it. The record ends on 12 October 2026.',
 'reading': 'Scenario, not record. The Party-state can bind a lab, a scholar and a family by one rule and publish that rule on the day it takes effect. A free society must bring a case a court will hear and must keep the program apart from the person. The shortcut that screens people by origin relieves pressure at once and repeats a wrong the record already holds. This is Stratagem 17, cast a brick to attract jade. Stratagem 14 borrows a corpse to resurrect the soul, and Stratagem 10 hides a knife behind a smile.',
 'gap': 'Governance', 'gapText': 'Governance Architecture. No standing rule separates a program from the people it recruits, so a defense that begins with the program drifts to the person.',
 'fix': 'Name programs and not people, require public disclosure of foreign funding above a set line and bring only the case a court will hear.',
 'factions': [US, PRC], 'player': US, 'cadres': ['campus_office', 'legal_advisers', 'liaison_dept'], 'pacts': [],
 'script': [
   {'turn': 2, 'text': 'A security organ asks a university lab for the notes of a visiting scholar.', 'effects': [press('Data and Surveillance', 2, 'duty_to_inform')]},
   {'turn': 3, 'text': 'A scholar abroad stops publishing after a call from home.', 'effects': [press('Cultural', 1, 'fear'), eff('slope', US, 'Cultural', 1, by=PRC)]},
   {'turn': 5, 'text': 'A new rule binds a whole field of study, and its text appears on the day it takes effect.', 'effects': [press('Legal', 2, 'secret_rule')]},
   {'turn': 7, 'text': 'Funding offers reach a second laboratory.', 'effects': [press('Association', 2)]},
 ],
 'reach': [
   move('duty_to_inform', 'Oblige every lab to inform the security organs', 'Data and Surveillance', 'Order any university or researcher to report to the security organs on demand.', 'barred',
        [eff('ease', US, 'Data and Surveillance', 3), eff('shield', US, 'Data and Surveillance', 2)], ['EV-001', 'EV-020']),
   move('fear', 'Make scholars silent through fear for funding and family', 'Cultural', 'Keep scholars quiet by threats to their funding and their families.', 'barred',
        [eff('unslope', US, 'Cultural', 2), eff('ease', US, 'Cultural', 2), eff('leverage', PRC, None, -1)], ['EV-008', 'EV-004', 'EV-019']),
   move('secret_rule', 'Bind a field by a rule published when it takes effect', 'Legal', 'Pass a rule in secret and publish its text on the day it binds.', 'barred',
        [eff('ease', US, 'Legal', 3), eff('leverage', PRC, None, -1)], ['EV-032', 'EV-031']),
   move('initiative', 'Open a broad criminal initiative against researchers', 'Cultural', 'Prosecute researchers with foreign ties on a wide front, whatever the case.', 'priced',
        [eff('ease', US, 'Cultural', 3), eff('ease', US, 'Association', 1), eff('leverage', PRC, None, -2)], ['EV-023', 'EV-014'],
        priced=[eff('legitimacy', US, None, -7, why='the broad initiative', self='overextension', selfWhy='the broad initiative'), eff('slope', US, 'Cultural', 2, by=PRC), eff('leverage', PRC, None, 1, why='the broad initiative')]),
   move('screen_students', 'Screen students and scholars by origin', 'Association', 'Treat origin as a sign of risk, which relieves pressure now and repeats a wrong the record already holds.', 'priced',
        [eff('ease', US, 'Association', 3), eff('ease', US, 'Cultural', 2), eff('leverage', PRC, None, -2)], ['EV-024', 'EV-025', 'EV-014'],
        priced=[eff('legitimacy', US, None, -8, why='screening by origin', self='breach of own legitimating rule', selfWhy='screening by origin'), eff('slope', US, 'Association', 2, by=PRC), eff('leverage', PRC, None, 1, why='screening by origin')]),
   move('disclose', 'Require public disclosure of foreign funding', 'Legal', 'Publish foreign gifts and contracts above a set line, with the date.', 'free',
        [eff('shield', US, 'Legal', 1), eff('shield', US, 'Cultural', 1), eff('leverage', PRC, None, -1)], ['EV-026', 'EV-027', 'EV-028']),
   move('name_campaign', 'Name the recruitment program as one campaign', 'Cultural', 'Treat the program and not the person as the subject, and publish the record.', 'free',
        [eff('shield', US, 'Cultural', 1), eff('unslope', US, 'Cultural', 1), eff('leverage', PRC, None, -1)], ['EV-022']),
   move('protect_scholars', 'Protect scholars and open a reporting line', 'Association', 'Tell scholars who are pressured where to report it, and answer every report.', 'free',
        [eff('shield', US, 'Association', 2), eff('ease', US, 'Association', 1)], ['EV-017', 'EV-014']),
   move('designate_entities', 'List the entities that act for the state', 'Legal', 'Put the entities in the register, with the date and the reason.', 'free',
        [eff('shield', US, 'Legal', 1), eff('leverage', PRC, None, -1)], ['EV-015', 'EV-030']),
   move('prove_in_court', 'Bring only the case a court will hear', 'Legal', 'Charge only what the evidence will carry before a judge.', 'free',
        [eff('shield', US, 'Legal', 2), eff('coherence', US, None, 1)], ['EV-029', 'EV-031']),
 ],
 'rules': {'handScale': 1.0},
}
OPS = [W017, W018, W019]
