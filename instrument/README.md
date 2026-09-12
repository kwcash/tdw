# The Instrument (PHP build)

Submit a situation, get it read through the Total Domain War framework:
dimensions in play, domains engaged, the fitting stratagem, the read, and a
concrete counter.

This build runs on plain PHP, so it installs through the Hestia file manager
with no SSH, no Node, and no background process. The call to Claude happens
server-side, so the API key never reaches the browser.

## Files

| File | Goes where | Purpose |
|---|---|---|
| `index.html` | `public_html/instrument/` | The form and result page |
| `analyze.php` | `public_html/instrument/` | Server-side call to the Claude API |
| `check.php` | `public_html/instrument/` | One-time diagnostic, delete after use |
| `tdw-config.example.php` | rename, see below | Holds the API key |

## Install

You need an Anthropic API key first, from https://console.anthropic.com.
That is separate from a Claude subscription and is what per-analysis usage
bills against.

1. **Upload the tool.** In the Hestia file manager, open
   `/home/<user>/web/totaldomainwar.com/public_html/`, create a folder named
   `instrument`, and upload `index.html`, `analyze.php`, and `check.php` into it.

2. **Place the key outside the web root.** Rename
   `tdw-config.example.php` to `tdw-config.php`, put your real key in it, and
   upload it to `/home/<user>/web/totaldomainwar.com/` — one level ABOVE
   `public_html`. Nothing outside `public_html` is reachable from the web, so
   the key cannot be downloaded. Do not put this file in `public_html`.

3. **Verify.** Open `https://totaldomainwar.com/instrument/check.php`. All four
   lines must say OK. Then delete `check.php`.

4. **Use it.** Open `https://totaldomainwar.com/instrument/`.

## Configuration

Both settings live in `tdw-config.php`:

- `api_key` — required.
- `model` — optional, defaults to `claude-sonnet-5`.

Two limits are set at the top of `analyze.php`:

- `MAX_STORY_CHARS` — 6,000 character cap on submissions.
- `RATE_LIMIT_MAX` — 8 analyses per IP per 15 minutes. This is the only cost
  guard in front of a paid API on a public form. Raise or lower it to match
  expected traffic and budget.

## If something fails

`check.php` catches the common causes. Beyond that, `analyze.php` writes the
real upstream error to the PHP error log (viewable in Hestia under the
domain's logs) while showing visitors a generic message. The API key is never
written to the log.

A 502 in the browser with `API returned 401` in the log means the key is wrong.
`API returned 429` means the Anthropic account hit its own rate limit. A cURL
timeout means the host blocks outbound HTTPS, which `check.php` also catches.
