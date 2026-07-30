# fanlisting-js

A modern, self-hosted fanlisting script — the same idea as classic tools
like Enthusiast, rebuilt on a current, actively maintained stack instead of
PHP 4/MySQL 3. See `docs/architecture-comparison.md` and
`docs/express-plan.md` for the reasoning behind the stack choices.

Stack: Express, Handlebars templates, SQLite via `better-sqlite3` (raw SQL,
no ORM), plain JavaScript (no build step, no TypeScript).

## Setup

```bash
npm install
cp .env.example .env
```

Edit `.env`:

- `SESSION_SECRET` — set to a long random string.
- `LISTING_NAME` / `OWNER_EMAIL` — used in emails and the default listing name shown in the admin dashboard title.
- `SMTP_*` — optional. Leave blank during development; emails will be logged to the console instead of sent.

Create the first admin account:

```bash
npm run create-admin
```

Start the app:

```bash
npm start          # production
npm run dev         # auto-reload with nodemon
```

Visit `http://localhost:3000` for the public join/member-list pages, and
`http://localhost:3000/admin` to log in and moderate members.

## How it works

- A visitor fills out `/join`. The submission is stored as `pending`.
- The visitor gets a confirmation email; the owner (`OWNER_EMAIL`) gets a
  notification email — both via console log if SMTP isn't configured.
- The admin approves or rejects pending members at `/admin/members`
  (individually or in bulk). Approved members appear on the public `/` page
  and get an approval email.

## Customizing the look

Public pages live in `views/public/*.handlebars` and share
`views/layouts/main.handlebars`. Styling is in
`public/themes/default/style.css` — edit it directly, or add a new folder
under `public/themes/` and point `theme` on the `listing` row at it (the
`listing.theme` column exists for this; wiring it into the layout's
stylesheet `<link>` is a quick follow-up once you have a second theme to
switch to).

## Database

SQLite file lives at `./data/fanlisting.db` by default (`DB_PATH` in
`.env`). Schema changes go in `db/migrations/` as new numbered `.sql` files
— `db/migrate.js` applies anything not yet recorded in the `_migrations`
table automatically on startup, so there's no manual upgrade step.

## Known limitations in this scaffold

- Only one `listing` row is used (v1 scope) — the schema supports more,
  which is what "collective" mode would build on.
- Custom join-form fields aren't implemented yet (planned as a
  `custom_field` / `member_field_value` migration — see
  `docs/express-plan.md`).
- Sessions use the default in-memory store, so admin logins don't survive a
  server restart. Fine for a single-owner site; swap in a persistent store
  (e.g. `connect-sqlite3`) if that becomes annoying.
- This was scaffolded in a sandboxed environment without npm registry
  access, so `npm install` and a live server boot haven't been run yet —
  do that first thing after pulling this down. JS files were syntax-checked
  with `node --check`, but this hasn't been runtime-tested end to end.
