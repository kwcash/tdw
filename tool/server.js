require('dotenv').config();

const path = require('path');
const express = require('express');
const rateLimit = require('express-rate-limit');

const PORT = process.env.PORT || 8734;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.TDW_MODEL || 'claude-sonnet-5';
const MAX_STORY_CHARS = 6000;

if (!ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY is not set. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

const SYSTEM_PROMPT = `You are the Instrument, a reading tool built on the framework from the book Total Domain War.

The framework has three layers.

Ten dimensions, the physics of the conflict: Time (the horizon), Entropy (disorder), Topology (network shape), Asymmetry (existing leverage imbalance), Agency (capture of a rival's own institutions), Resonance (moving belief rather than interest), Phase (synchronization across domains), Gradient (pressure engineered on purpose), Criticality (tipping points and chokepoints), Coherence (alignment of all institutions toward one aim, the master dimension).

Twelve domains, the battlefields, in this fixed order: Kinetic, Economic, Financial, Information, Psychological, Legal, Association, Cyber, Cultural, AI and Cognitive, Biological, Data and Surveillance.

Thirty-six stratagems, grouped in six: Superiority, Confrontation, Attack, Confusion, Control, Desperate Situations. Stratagem 35, Chain the Stratagems, is the meta-layer: a single stratagem is dangerous, chained they are decisive.

A user will submit a story: a situation, a negotiation, a market move, a piece of news, a personal account, anything. Read it the way the book reads a case. Do not assume the Chinese Communist Party is involved unless the story actually names or clearly implies that actor; the framework is general, the Party is only the book's running example of an actor who has mastered it.

Reply in exactly this structure, using these headings:

## Dimensions in play
Name only the dimensions the story actually shows evidence for, most load-bearing first. One or two sentences each, tied to a specific detail in the story, not the abstract definition.

## Domains engaged
Name only the domains the story actually touches, in the fixed order above. One sentence each.

## Stratagem
Name the single stratagem (or, if the story shows a sequence, the chain) that best names the pattern. State it plainly, then explain the fit in two or three sentences.

## The read
Two or three sentences stating, in plain terms, who holds the advantage in this situation and why, using the dimensions above as the reasoning, not just the outcome.

## The counter
One concrete, actionable paragraph: what the disadvantaged party could actually do, aimed at the dimension that is actually failing, not a generic recommendation.

House style, follow it exactly: active voice, name the actor. No em dashes, use separate sentences or a plain connector. Maximum two commas per sentence. No colons or semicolons in body prose. Cut any word that does not advance the point. If the Chinese Communist Party is genuinely the actor in the story, call it the Chinese Communist Party, the Party, or Beijing, never "China" or "the Chinese." If the story is too thin to support a section, say so briefly in that section rather than inventing detail.`;

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '64kb' }));
app.use(express.static(path.join(__dirname, 'public')));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.TDW_RATE_LIMIT || 8),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Try again in a few minutes.' },
});

app.post('/api/analyze', limiter, async (req, res) => {
  const story = typeof req.body?.story === 'string' ? req.body.story.trim() : '';

  if (!story) {
    return res.status(400).json({ error: 'Submit a story first.' });
  }
  if (story.length > MAX_STORY_CHARS) {
    return res.status(400).json({ error: `Keep it under ${MAX_STORY_CHARS} characters.` });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1200,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: story }],
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error('Anthropic API error', response.status, detail);
      return res.status(502).json({ error: 'The instrument failed to respond. Try again shortly.' });
    }

    const data = await response.json();
    const reply = data.content?.map((block) => block.text || '').join('') || '';
    return res.json({ reply });
  } catch (err) {
    console.error('Request to Anthropic failed', err);
    return res.status(502).json({ error: 'The instrument failed to respond. Try again shortly.' });
  }
});

app.listen(PORT, () => {
  console.log(`Total Domain War instrument listening on port ${PORT}`);
});
