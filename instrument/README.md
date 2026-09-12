# The Instrument

Two readings of a situation through the Total Domain War framework. Both
return the dimensions in play, the domains engaged, the stratagem that names
the pattern, and one concrete counter.

| Page | What it does | Cost |
|---|---|---|
| `index.html` | Visitor describes a situation in their own words. Calls the Claude API. | Per reading |
| `questions.html` | Visitor answers ten questions, one per dimension. Runs entirely in the browser. | Free, always |

The ten-question reading needs no key and keeps working if the API credit
runs out, so it is the safe fallback. The pages link to each other.

This build runs on plain PHP, so it installs through a control panel file
manager with no SSH, no Node, and no background process. The API call happens
server-side, so the key never reaches the browser.

## Files

| File | Goes where | Purpose |
|---|---|---|
| `index.html` | inside `public_html` | Open reading, the landing page |
| `questions.html` | inside `public_html` | Ten-question reading |
| `analyze.php` | inside `public_html` | Server-side call to the Claude API |
| `check.php` | inside `public_html` | One-time diagnostic, delete after use |
| `tdw-config.example.php` | rename, see below | Holds the API key |

**The folder name is yours to choose.** Every path in these files is
relative, so `public_html/instrument/`, `public_html/read/`, or anything else
works the same. The two rules are that the folder sits directly inside
`public_html` and that the files stay together in it. A short name reads
better when sharing the link out loud.

## Install

You need an Anthropic API key first, from https://console.anthropic.com. That
is separate from a Claude subscription, and credit is prepaid, so the account
cannot run up a bill it was not funded for.

1. **Upload the tool.** Create a folder inside `public_html` and upload
   `index.html`, `questions.html`, `analyze.php`, and `check.php` into it.

2. **Place the key in the `private` directory.** Rename
   `tdw-config.example.php` to `tdw-config.php`, put your real key in it, and
   upload it to `/home/<user>/web/<domain>/private/`.

   That directory sits outside the web root, so the key cannot be downloaded.
   Use it rather than the domain root, because Hestia and similar panels set
   `open_basedir` on the PHP pool and the domain root is not on the allowed
   list. A config placed there exists, is readable by the file manager, and is
   still invisible to PHP, which fails as "The instrument is not configured
   yet." The `private` directory is on the allowed list. Do not put this file
   in `public_html`.

3. **Verify.** Open `check.php` in a browser. Every line must say OK. Then
   delete `check.php`.

4. **Use it.** Open the folder in a browser.

## Configuration

All three settings live in `tdw-config.php`:

- `api_key` — required.
- `model` — optional, defaults to `claude-opus-5`.
- `effort` — optional, defaults to `medium`. The main cost control. Drop it to
  `low` to roughly halve the spend per reading.

Two limits are set at the top of `analyze.php`:

- `MAX_STORY_CHARS` — 6,000 character cap on submissions.
- `RATE_LIMIT_MAX` — 8 readings per IP per 15 minutes. This is the only cost
  guard in front of a paid API on a public form. Raise or lower it to match
  expected traffic and budget.

## If something fails

`check.php` catches the common causes, including the `open_basedir` trap
above. Beyond that, `analyze.php` writes the real upstream error to the PHP
error log while showing visitors a generic message. The API key is never
written to the log.

A 502 with `API returned 401` in the log means the key is wrong. `API returned
429` means the Anthropic account hit its own rate limit. A cURL timeout means
the host blocks outbound HTTPS, which `check.php` also catches.
