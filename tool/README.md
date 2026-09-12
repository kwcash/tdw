# The Instrument (Node build)

**Deploying on Hestia without SSH? Use `instrument/` instead**, which is the
same tool in PHP and installs through the file manager. This Node build needs
shell access to run as a service.

A small Node app: a visitor submits a situation and the Total Domain War
framework reads it back — dimensions in play, domains engaged, the fitting
stratagem, and one concrete counter. The call to Claude happens server-side,
so the API key never reaches the browser.

## Files

| File | Purpose |
|---|---|
| `server.js` | Express server. Serves `public/` and the `/api/analyze` endpoint. |
| `public/index.html` | The submission form and result page. |
| `.env.example` | Template for required environment variables. |

## Local run

```bash
cd tool
npm install
cp .env.example .env
# edit .env, set ANTHROPIC_API_KEY
npm start
# open http://localhost:8734
```

## Deploying on your VPS

1. Copy this `tool/` directory to the server (or `git clone` the repo and
   `cd` into `tool/`).
2. `npm install --omit=dev`
3. Create `.env` next to `server.js` with `ANTHROPIC_API_KEY` set. Restrict
   its permissions: `chmod 600 .env`.
4. Run it as a service instead of a foreground process. With systemd:

   ```ini
   # /etc/systemd/system/tdw-instrument.service
   [Unit]
   Description=Total Domain War instrument
   After=network.target

   [Service]
   Type=simple
   WorkingDirectory=/path/to/tool
   ExecStart=/usr/bin/node server.js
   EnvironmentFile=/path/to/tool/.env
   Restart=on-failure
   User=www-data

   [Install]
   WantedBy=multi-user.target
   ```

   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable --now tdw-instrument
   ```

5. Put it behind your existing web server as a reverse proxy, e.g. nginx,
   so it's served from a path on the same domain as the rest of the site:

   ```nginx
   location /tool/ {
       proxy_pass http://127.0.0.1:8734/;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
   }
   ```

   Reload nginx (`sudo nginx -t && sudo systemctl reload nginx`) and the
   form is live at `https://totaldomainwar.com/tool/`.

## Configuration

All via environment variables (see `.env.example`):

- `ANTHROPIC_API_KEY` — required.
- `PORT` — defaults to `8734`.
- `TDW_MODEL` — defaults to `claude-sonnet-5`.
- `TDW_RATE_LIMIT` — max requests per IP per 15 minutes, defaults to `8`.
  This is the only cost guard in front of a paid API from a public form;
  raise or lower it to match expected traffic and budget.

## Notes

- Input is capped at 6,000 characters server-side; the form also caps it
  client-side.
- The system prompt encodes the ten dimensions, twelve domains (in the
  fixed order from `docs/CLAUDE.md`), and the thirty-six stratagems in
  their six groups, and enforces the book's house style and the
  Party-is-not-China distinction in the reply.
