# Fanlisting Revival

**Open source (MIT) · self-hosted · no build step**

Fork it, host it, theme it.

A modern, self-hosted **fanlisting** — the classic "sign up to show you're a
fan of X" site, rebuilt on a current, actively maintained stack instead of the
PHP 4 / MySQL 3 era tools (Enthusiast, BellaBuffs) it's inspired by.

> **New to fanlistings?** A fanlisting is a small site devoted to one subject
> (a character, show, ship, band…). Fans submit their name and country to
> "join"; the owner approves them; approved fans are shown together on a public
> list.

**Stack:** Express · Handlebars templates · SQLite via `better-sqlite3` (raw
SQL, no ORM) · plain JavaScript

---

## What it does

- **Public join flow** — visitors join at `/join`; submissions wait as
  _pending_ until you approve them.
- **Moderation** — approve/reject members one at a time or in bulk from the
  admin panel.
- **Member list** — approved members appear on `/members`, filterable by
  country and paginated.
- **Self-service edits, no passwords** — members update their own name,
  website, and country through a one-time emailed link (their email stays
  locked).
- **No SQL required to run it** — your listing name, description, and owner
  details are all edited in the browser at **Admin → Settings**.
- **Email or console** — join/approval/notification emails send over SMTP, or
  print to the console during development.
- **Themeable, no build step** — edit the templates and one CSS file directly.

---

## Requirements

**Node.js 22 or 24 (an LTS release).** `better-sqlite3` is a native module that
only ships prebuilt binaries for LTS Node versions. On a "Current" release (odd
major versions like 25) install or startup fails with a _"Could not locate the
bindings file"_ error. With `nvm`:

```bash
nvm install 22 && nvm use 22
```

---

## Quick start

```bash
npm install
cp .env.example .env
```

Open `.env` and set at least:

| Variable         | What it's for                                                                                                                                                                |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SESSION_SECRET` | A long random string — signs admin login cookies. **Change this.**                                                                                                           |
| `OWNER_EMAIL`    | Where "a new member joined" notifications are sent.                                                                                                                          |
| `SMTP_*`         | Your mail server, for sending real email. **Leave `SMTP_HOST` blank** to log emails to the console instead (ideal for local dev). Full setup in [Email (SMTP)](#email-smtp). |
| `PORT`           | Port to run on (default `3000`).                                                                                                                                             |
| `DB_PATH`        | SQLite file location (default `./data/fanlisting.db`).                                                                                                                       |

> Your **listing name and public details are _not_ set here** — you'll set them
> in the app after logging in (see step 4).

Create your admin account (interactive prompt for email + password):

```bash
npm run create-admin
```

Start the app:

```bash
npm run dev     # development: auto-reloads on changes
npm start       # production
```

Then:

1. Visit **http://localhost:3000** — the public site.
2. Visit **http://localhost:3000/admin** and log in.
3. Approve members from **Admin → Members**.
4. **First thing to do:** open **Admin → Settings** and set your listing name,
   description, and owner name/email/URL. Until you do, the site shows the
   seeded placeholder name ("My Fanlisting").

---

## How it works

The full lifecycle of a member:

1. A visitor fills out `/join`. Their submission is stored as **pending**.
2. Two emails go out (or print to the console if SMTP is unconfigured): a
   confirmation to the visitor, and a "new member joined" notice to
   `OWNER_EMAIL`.
3. You approve or reject them at **Admin → Members** — individually or in bulk.
4. Approved members appear on `/members` and receive an approval email.
5. Any approved member can later request a **magic link** at `/update` to edit
   their own name, website, and country. The link is one-time-use and expires
   after 24 hours; their email address can't be changed this way.

---

## Pages at a glance

**Public**

| Path       | What's there                                                                                    |
| ---------- | ----------------------------------------------------------------------------------------------- |
| `/`        | Home: intro text, an info panel (owner, dates, member counts), and a preview of recent members. |
| `/members` | Full approved-member list with a country filter and pagination.                                 |
| `/join`    | The join form.                                                                                  |
| `/update`  | Request a magic link to edit your own details (not in the nav).                                 |
| `/buttons` | Link-back button graphics + copy-paste embed code for fans' sites.                              |

**Admin** (all behind login at `/admin/login`)

| Path              | What's there                                               |
| ----------------- | ---------------------------------------------------------- |
| `/admin`          | Dashboard: pending/approved counts and recent joins.       |
| `/admin/members`  | Full member table; approve/reject individually or in bulk. |
| `/admin/settings` | Edit listing name, description, and owner name/email/URL.  |

---

## Owner & listing details

Everything that identifies your listing — its **name**, **description**, and the
**owner name / email / URL** — lives in the database and is edited entirely
through **Admin → Settings**, never by hand-editing SQL.

- The owner name appears in the site footer ("Run by …"), linked to the owner
  email when set.
- The owner details also populate the info panel on the home page.
- On a fresh install the listing starts with a placeholder name; Settings is
  where you make it yours.

---

## Email (SMTP)

Fanlisting Revival sends four kinds of email, all plain-text templates you can
edit in the `emails/` folder (`{{name}}`, `{{listingName}}`, the edit link, etc.
are substituted at send time):

| When                           | Sent to                   | Template                      |
| ------------------------------ | ------------------------- | ----------------------------- |
| Someone joins                  | the applicant             | `emails/welcome-pending.txt`  |
| Someone joins                  | the owner (`OWNER_EMAIL`) | `emails/new-member-owner.txt` |
| You approve a member           | the member                | `emails/approved.txt`         |
| A member requests an edit link | the member                | `emails/edit-link.txt`        |

### Development — nothing to configure

If `SMTP_HOST` is blank (the default), the app **doesn't send anything**; it
prints each email — subject and body — to the server console instead. That's
ideal locally: you can read the magic-link URL or approval notice straight from
your terminal without a mail server. Sending never blocks a request, and a
failed send is only logged, never shown to the visitor.

### Production — point it at an SMTP server

Set these in `.env` (or your host's environment):

| Variable      | Meaning                                                                                                                |
| ------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `SMTP_HOST`   | Mail server hostname. **Setting this is what turns real sending on.**                                                  |
| `SMTP_PORT`   | `587` (STARTTLS, the default) or `465` (implicit TLS). The app negotiates a secure connection automatically for `465`. |
| `SMTP_USER`   | Username — often your full email address or an API-key id. Leave blank for servers that need no auth.                  |
| `SMTP_PASS`   | Password / API key for that user.                                                                                      |
| `MAIL_FROM`   | The `From` header, e.g. `"My Fanlisting <no-reply@yourdomain.com>"`.                                                   |
| `OWNER_EMAIL` | Where the "new member joined" notice goes.                                                                             |

You almost never want to run your own mail server — use a transactional email
provider. Common settings:

| Provider   | `SMTP_HOST`                         | Port | `SMTP_USER` / `SMTP_PASS`                                                            |
| ---------- | ----------------------------------- | ---- | ------------------------------------------------------------------------------------ |
| Mailgun    | `smtp.mailgun.org`                  | 587  | SMTP username + password from the dashboard                                          |
| SendGrid   | `smtp.sendgrid.net`                 | 587  | the literal `apikey` / your API key                                                  |
| Postmark   | `smtp.postmarkapp.com`              | 587  | your Server API token (as both user and pass)                                        |
| Amazon SES | `email-smtp.<region>.amazonaws.com` | 587  | your SES SMTP credentials                                                            |
| Gmail      | `smtp.gmail.com`                    | 587  | your address / an **App Password** (needs 2FA; low limits, fine for a small listing) |

Example `.env` using Mailgun:

```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@mg.yourdomain.com
SMTP_PASS=your-mailgun-smtp-password
MAIL_FROM="My Fanlisting <no-reply@yourdomain.com>"
OWNER_EMAIL=you@yourdomain.com
```

### Deliverability

To land in inboxes instead of spam:

- Send from a `MAIL_FROM` address on **a domain you control**, and set up **SPF
  and DKIM** for it (your provider hands you the DNS records). A `From` address
  that isn't on an authenticated domain is the single biggest reason approval
  emails get filtered.
- If your provider offers a sending subdomain (e.g. `mg.yourdomain.com`), use it.

### Verifying it works

Restart the app after editing `.env`, then trigger an email — the quickest is
requesting an edit link at `/update` for an existing member, or approving a
pending one. On success it's delivered; on failure the SMTP error is logged to
the server console.

---

## Customizing the look

Public pages are Handlebars templates in `views/public/` sharing
`views/layouts/main.handlebars`, with reusable pieces (header, footer, info
panel) in `views/partials/`. All styling is in a single file:
`public/themes/default/style.css` — edit it directly.

To make a new theme, copy the folder under `public/themes/<name>/` and point the
`theme` column on the `listing` row at it. (The column already exists; wiring it
into the layout's stylesheet `<link>` is a small follow-up once you have a
second theme to switch to.) Dropping a `hero.jpg|png|svg` into a theme folder
shows it automatically under the site title.

---

## Deploying & hosting

This is a plain Node app with **no build step** and a **single SQLite file** for
storage. That makes it cheap and simple to host, with two things to keep in mind:

- It runs as **one long-lived Node process** — you need something to keep it
  running and restart it on crash/reboot (a process manager or your platform).
- The database is a **file on disk** (`./data/fanlisting.db`). Whatever you
  deploy on must give that file a **persistent location** that survives
  restarts and redeploys, and it means the app runs as a **single instance**
  (see [SQLite & scaling](#a-note-on-sqlite--scaling)).

You'll want a host running **Node 22 or 24 LTS** (see [Requirements](#requirements)).

### 1. Required configuration

Set `NODE_ENV=production`. In that mode the app **refuses to start** unless two
variables are set, because their insecure defaults are dangerous on a public
site:

- **`SESSION_SECRET`** — a long random string. Signs login cookies; a known
  value lets anyone forge an admin session. Generate one with:
    ```bash
    node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
    ```
- **`APP_URL`** — your public base URL (e.g. `https://fans.example.com`). Links
  in emails are built from this instead of the request's `Host` header, which
  an attacker could otherwise forge to hijack a member's edit link.

Also set the **`SMTP_*`** variables so real email goes out (see
[Configuration](#quick-start)) — with `SMTP_HOST` blank, emails only print to
the server log. Point **`DB_PATH`** at your persistent disk if it isn't the
default `./data/`.

Production mode also enables `Secure` cookies (so you must serve over HTTPS) and
suppresses stack traces in error responses. Always-on protections: CSRF tokens
on every form, `SameSite=Lax` + `HttpOnly` session cookies, Helmet security
headers (CSP + clickjacking protection), and rate limiting on the login and
email endpoints.

### 2a. On a VPS (your own server)

The most control, and the closest to the old "upload it to a box" workflow.

```bash
git clone <your-repo> /opt/fanlisting && cd /opt/fanlisting
nvm install 22 && nvm use 22        # or install Node 22/24 system-wide
npm ci --omit=dev
cp .env.example .env && $EDITOR .env  # set NODE_ENV, SESSION_SECRET, APP_URL, SMTP_*
npm run create-admin
```

Keep it running with **systemd** — create `/etc/systemd/system/fanlisting.service`:

```ini
[Unit]
Description=Fanlisting Revival
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/fanlisting
ExecStart=/usr/bin/node server.js
Restart=on-failure
EnvironmentFile=/opt/fanlisting/.env
User=www-data

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now fanlisting
```

Then put a **reverse proxy in front for HTTPS** — the app itself speaks plain
HTTP on `PORT` and trusts the proxy (`trust proxy` is set in production). Minimal
Nginx server block:

```nginx
server {
  server_name fans.example.com;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Get a free TLS certificate with `sudo certbot --nginx -d fans.example.com`.
(`certbot` rewrites the block above to listen on 443 and redirect HTTP → HTTPS.)

### 2b. On a managed platform (Railway / Fly.io / Render)

These handle the process, HTTPS, and restarts for you — usually just point them
at the repo. Two must-dos for this app:

- **Attach a persistent volume** and set `DB_PATH` to a path on it (e.g.
  `/data/fanlisting.db`). Without a volume, the SQLite file lives on ephemeral
  storage and **every member you approve is wiped on the next deploy.**
- Set the env vars from step 1 in the platform's dashboard. `PORT` is usually
  injected by the platform — the app already reads `process.env.PORT`.

Start command is `npm start`; there is no build command. Run
`npm run create-admin` once via the platform's shell/console to make your login.

### 3. Backups

The entire database is one file, so a backup is just a copy. The safe way to
copy a live SQLite DB (handles the WAL) is:

```bash
sqlite3 /opt/fanlisting/data/fanlisting.db ".backup '/backups/fanlisting-$(date +%F).db'"
```

Drop that in a cron job. To restore, stop the app and put the file back at
`DB_PATH`.

### A note on SQLite & scaling

SQLite is a great fit here — a fanlisting is low-traffic and single-owner — but
it means **run exactly one instance** of the app (no horizontal scaling / no
multiple replicas pointing at the same file). For a single fanlisting or a small
collective on one box, that's plenty. If you ever outgrow it, the raw-SQL layer
in `lib/queries.js` is where a move to Postgres would happen.

## Database & migrations

The SQLite file lives at `./data/fanlisting.db` by default (`DB_PATH` in
`.env`). Schema is defined by numbered `.sql` files in `db/migrations/`.
`db/migrate.js` runs on every startup, applying any migration not yet recorded
in the `_migrations` table — so there's no manual upgrade step. To change the
schema, add a new numbered file; don't edit an applied one.

To reset your local database to a clean slate:

```bash
rm data/fanlisting.db data/fanlisting.db-shm data/fanlisting.db-wal
npm run create-admin
```

---

## Tests

```bash
npm test
```

Runs the suite with Node's built-in test runner (`node --test`) plus
`supertest` — no extra framework. Coverage is integration-level: the public
join/members/update flows, CSRF enforcement, the magic-link edit lifecycle,
admin login/approval/settings, and the query layer. Each test file uses an
isolated temporary database, so runs don't touch your real `data/` file.

---

## Troubleshooting

**`Error: Could not locate the bindings file` (better-sqlite3)** — you're almost
certainly on a non-LTS Node version (see [Requirements](#requirements)). Switch
to Node 22 or 24, then reinstall:

```bash
rm -rf node_modules package-lock.json
npm install
```

**Emails aren't sending** — that's the default when `SMTP_HOST` is blank. Check
the console: unsent emails are logged there in full. Set the `SMTP_*` variables
in `.env` to send for real.

---

## Contributing

Bug reports, patches, and forks are welcome — see
[`CONTRIBUTING.md`](CONTRIBUTING.md) for setup and conventions, and
[`SECURITY.md`](SECURITY.md) for reporting vulnerabilities privately.

## License

Released under the [MIT License](LICENSE) — © 2026 Jessica Zemartis. You're free
to use, modify, host, and redistribute it; just keep the copyright notice.
