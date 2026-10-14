# Balance report, W017 and W018, 14 October 2026

Both operations sit in the asymmetry band and are set to Tier 7. They are tuned with `handScale` only, 0.68 for W017 and 0.82 for W018. The target for the best scripted line is about 1 to 3 percent. The first tuning, at Tier 6 with 0.86 and 0.97, is replaced by this one.

Each figure is the share of 1,000 games won on each of three seed sets. The four policies differ only in which reach moves they take. Each takes at most one move a turn and leaves the rest to the tuner bot.

| Policy | W017 mean | W017 range | W018 mean | W018 range |
|---|---|---|---|---|
| Free moves only | 1.1% | 1.0% to 1.4% | 2.2% | 1.9% to 2.5% |
| No reach moves | 0.1% | 0.1% to 0.1% | 0.3% | 0.1% to 0.4% |
| Priced moves only | 0.1% | 0.0% to 0.1% | 0.0% | 0.0% to 0.1% |
| Free and priced moves | 0.2% | 0.1% to 0.3% | 0.2% | 0.1% to 0.3% |

## Reading

- The lawful path is the only path that wins, and it wins rarely. That is the designed result.
- Adding the priced shortcut lowers the win rate. The shortcut relieves pressure now and costs legitimacy and leverage later.
- The tuner bot alone wins about one game in a thousand. The free moves are what open a narrow line.
- The scripted player reads the board and picks moves by a fixed order. A person who reads the rival's cards may do better, so the figures say what the rules allow a simple line to do.
- At Tier 6 the same operations are easier. The `handScale` values above are for Tier 7 and the record sets Tier 7.
