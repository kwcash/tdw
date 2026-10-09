## The Stack

---

Nothing in this framework is secret, and almost none of it is new.

Sun Tzu is public. The thirty-six stratagems are two thousand years old and sell in airport bookshops. Entropy, topology, resonance and criticality are undergraduate material in half a dozen fields. In 1999 two colonels of the People's Liberation Army, Qiao Liang and Wang Xiangsui, named most of the domains that follow in *Unrestricted Warfare*.

Securities law, economics and military studies each hold a piece, and each holds it well. No discipline owns the combination, so no one assembles it. A campaign runs through the seams between them.

The framework assembles the pieces the way an architect would. It borrows its structure from TOGAF, the enterprise architecture standard maintained by The Open Group. The Open Group built the first version in 1995 on TAFIM, the Defense Department's technical architecture framework.

TOGAF calls its four layers architecture domains. To keep one word for one thing, the framework reserves *domain* for the twelve arenas of the contest and says *layer* for TOGAF's four.

**The stack as an enterprise architecture**

| TOGAF element | What it holds in any enterprise | What it holds here |
|---|---|---|
| Business Architecture | The capabilities the enterprise performs | The twelve domains |
| Data Architecture | What the enterprise knows and stores | The Digital Twin |
| Application Architecture | The routines that execute the work | The thirty-six stratagems |
| Technology Architecture | The platforms every routine runs on | Cyber, compute and AI orchestration |
| Architecture Principles | The rules every design must obey | The ten dimensions |
| Architecture Governance | Authority over the whole | Coherence |

---

### Business Architecture. Twelve Domains

*The Terrain*

The twelve domains form the capability map, the arenas where advantage becomes concrete. The Pentagon counts five warfighting domains by place. This framework counts twelve by function, as a capability map should.

A capability map records what an enterprise does and ignores who does it. Lay it over the organization chart of the government that must defend these arenas, and the seams show.

| | Domain | What it is |
|---|---|---|
| 1 | **Kinetic** | Physical force, most of it employed without being used |
| 2 | **Economic** | Trade, supply and industrial dependency |
| 3 | **Financial** | Capital, credit and the rails that move money |
| 4 | **Information** | What a population sees, believes and trusts |
| 5 | **Psychological** | The will to resist |
| 6 | **Legal** | Law as an instrument rather than a referee |
| 7 | **Association** | Alliances, coalitions and who stands with whom |
| 8 | **Cyber** | The networks everything else runs on |
| 9 | **Cultural** | What a society admires and teaches |
| 10 | **AI and Cognitive** | The race to see, decide and act first |
| 11 | **Biological** | Health and human capital, degraded slowly |
| 12 | **Data and Surveillance** | The harvest that lets the other eleven aim |

Two domains appear again lower in the stack. Data and Surveillance is the capability that harvests, and the Digital Twin is the store the harvest builds. Cyber is an arena where the enterprise acts. It also forms part of the platform every other arena runs on.

---

### Architecture Principles. Ten Dimensions

*The Physics*

The dimensions are properties of a contest, not places within it. They decide whether an actor's advantages multiply or cancel before the first move.

TOGAF writes each principle as a name, a statement, a rationale and its implications. Each dimension's physics is its rationale, and *The Physics* sets out the implications. The statement is the rule that physics imposes on any design, attacker or defender.

| | Dimension | The question it asks | The principle it sets |
|---|---|---|---|
| 1 | **Time** | How long is your horizon? | Hold a longer horizon than the rival |
| 2 | **Entropy** | How much force is lost to friction? | Cut friction where force must pass |
| 3 | **Topology** | What shape does power flow through? | Wire fast paths and back up every hub |
| 4 | **Asymmetry** | Where is the ground already uneven? | Name every imbalance and price it |
| 5 | **Agency** | Who is permitted to decide anything? | Expose dependence before it becomes capture |
| 6 | **Resonance** | Do your actions point the same direction? | Point every domain the same way |
| 7 | **Phase** | Do they arrive at the same moment? | Decide before the event so the answer lands in hours |
| 8 | **Gradient** | Which way does the slope run? | Flatten hostile slopes and use your own |
| 9 | **Criticality** | Where does a small push cause a large fall? | Know every chokepoint on both sides |
| 10 | **Coherence** | Does the whole system pull one way? | Hold the whole to one aim |

Two principles carry most of the weight in the cases. Phase explains Hong Kong. The National Security Law put every power it created into force at one moment, and the city's free institutions got no interval in which to answer.

Coherence is the master dimension, because it decides whether the other nine add or cancel. On the framework's own model, a nation with three times the resources can produce a quarter of the result. Coherence also serves as the test of governance. It asks whether any authority holds the other nine principles across the whole enterprise.

---

### Application Architecture. Thirty-Six Stratagems

*The Code*

The stratagems are a classical Chinese catalog of techniques, read here as application components. Each one takes an input, runs a routine and produces an effect. A defender reads them the way a security team reads MITRE ATT&CK, as a finite library of techniques a watch officer can name in play.

They sort into six groups, and the group an actor reaches for reveals how it rates its own position.

| Group | Used when | Character |
|---|---|---|
| **I. Superiority** | Holding the advantage | Win cheaply, by misdirection |
| **II. Confrontation** | Evenly matched | Manufacture false reality |
| **III. Attack** | Against a weaker foe | Degrade before engaging |
| **IV. Confusion** | Among many parties | Remove the foundations |
| **V. Control** | Inside a stronger host | Capture from within |
| **VI. Desperation** | Under pressure | Retreat in order, rebuild |

One stratagem governs the rest. Chain the Stratagems, number thirty-five, runs the others together so that the answer to the first becomes the trap that makes the second unavoidable. In architecture terms it forms the integration layer.

---

### Data and Technology Architecture

*The Foundation*

The Data Architecture holds the Digital Twin, a working model of the target assembled from the harvest. The twin lets every other layer aim.

The Technology Architecture holds the platforms. Networks, compute and cyber capability carry every routine. The orchestration layer sits on top, the machine speed that runs the catalog across domains faster than a human staff can answer.

Human friction always rationed the method. Coordinating one stratagem across three domains once took months, a bureaucracy that did not tire, and a network that did not leak. Artificial intelligence lifts that ceiling on every layer at once.

No public document shows any actor running an orchestration layer at national scale. The framework treats one as real for a reason of cost. A defense built for a slower enemy fails against a faster one. The worst a defense built for a faster enemy can do is arrive early.

---

### Architecture Governance. Coherence

*Who Holds the Whole*

Governance holds every layer to the principles. The Party's constitution assigns it leadership over every area of endeavor in the country, so one authority governs its enterprise by command. A republic's layers answer to separate authorities by design. *The Opening* argues for coherence built by agreed protocol among institutions nobody commands.

That protocol already has a name. NIST SP 800-207 calls it zero trust. No access is trusted permanently, and every request is verified, regardless of where it originates. No institution has to answer to another, and each still has to prove its case every time. The rule shows up under four names in the chapters ahead. A lifecycle gate tests trust at every stage of a relationship instead of granting it once at the start. Periodic re-review does the same across time. The crane acceptance test does it at the point where a supply chain crosses a border. *Cut the lever, shield the people* revokes access from the institution while leaving the person untouched, the same rule aimed at a workforce instead of a network.

---

### How Each Case Runs

Every case runs the same five views, in the order TOGAF's Architecture Development Method takes them.

| View | TOGAF source | What it records |
|---|---|---|
| **Architecture Vision** | Phase A | What the Party's enterprise set out to achieve |
| **Adversary baseline** | Phases B to D | What it fielded, layer by layer |
| **Defender baseline** | Phases B to D | The same layers on the side under attack, with owners named |
| **Gap analysis** | TOGAF's gap technique | Each seam the campaign used, located at its layer |
| **Target architecture** | Phases B to D, costed in E and F | What would close each gap and what it would cost |

TOGAF compares a baseline with a target inside one enterprise. These cases add a second baseline, the adversary's, because the threat defines what the defender's target must do. Every gap names an owner or records the absence of one.

---

### Three Rules for Reading

**The framework is an estimation.** So are the nine principles of war. So were the Army's seven Battlefield Operating Systems, which the Army replaced with six warfighting functions in 2008. A model earns its place by beating the map in use, not by being perfect.

**The components are public.** The contribution is the assembly and the question put to it. Where, layer by layer, does the defender's architecture fail?

**The Party's advantage is not knowledge.** The Party will work all twelve domains at once against civilians. It works them with no legal or ethical brake, under one authority that can order it and a population that cannot refuse. An ethical vacancy becomes an operational one, and no amount of study closes the gap it opens.

