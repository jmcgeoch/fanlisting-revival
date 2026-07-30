# Fanlisting Revival — Express Build Plan

Decided stack: **Express + Handlebars (express-handlebars) + raw SQL via
better-sqlite3 + plain JavaScript**. No build step, no ORM, no TypeScript —
optimized for low barrier to entry and legibility, closest in spirit to the
old PHP scripts while using a current, actively maintained stack.

## Dependencies

- `express` — routing/server
- `express-handlebars` — view engine
- `better-sqlite3` — synchronous SQLite driver, no query builder layer
- `express-session` + a session store (`better-sqlite3-session-store` or
  `connect-sqlite3`) — admin login sessions
- `bcrypt` — password hashing for the admin account
- `dotenv` — config (port, session secret, mail credentials)
- `nodemailer` — outgoing email (join confirmation, approval notice, owner
  notification)
- `express-validator` — form validation on join/admin submissions (keeps
  validation declarative without pulling in a schema library)
- `connect-flash` or a small custom flash-message helper — for admin form
  feedback (approved/rejected/error banners)

Dev-only: `nodemon` for local reload.

## Folder structure

```
/
├── server.js                 entry point, wires everything together
├── config.js                 loads .env, exports config object
├── db/
│   ├── connection.js          opens the SQLite file, runs pragmas
│   ├── migrations/            numbered .sql files, applied in order at boot
│   │   ├── 001_init.sql
│   │   └── 002_custom_fields.sql
│   └── migrate.js             tiny runner: tracks applied migrations in a
│                               `_migrations` table, applies new ones on start
├── routes/
│   ├── public.js               "/" (listing home), "/join", "/members"
│   └── admin.js                 "/admin/login", "/admin", "/admin/members/:id"
├── lib/
│   ├── queries.js               all raw SQL as named functions (getPendingMembers,
│   │                             approveMember, insertMember, etc.) — the one
│   │                             file that touches SQL strings directly
│   ├── mailer.js                 wraps nodemailer, loads templates from
│   │                             emails/, does {{token}} substitution
│   └── auth.js                   session helpers, requireAdmin middleware
├── views/
│   ├── layouts/main.handlebars
│   ├── public/
│   │   ├── home.handlebars        member list / grid
│   │   └── join.handlebars        join form
│   └── admin/
│       ├── login.handlebars
│       ├── dashboard.handlebars    pending/approved counts, recent joins
│       └── members.handlebars      full member table w/ approve/reject/search
├── emails/
│   ├── welcome-pending.txt        sent on join
│   ├── approved.txt               sent on approval
│   └── new-member-owner.txt       sent to owner on new join
├── public/                        static assets (css, theme overrides)
│   └── themes/default/style.css
├── .env.example
└── package.json
```

Themers edit `views/public/*.handlebars` and `public/themes/<name>/style.css`
directly — no build step to run, matches the old "edit the include file"
workflow.

## Data model (SQL, `001_init.sql`)

```sql
CREATE TABLE listing (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  theme TEXT DEFAULT 'default',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
-- v1 will only ever have one row here, but the FK on member below means
-- adding a second listing later (collective mode) is additive, not a rewrite.

CREATE TABLE member (
  id INTEGER PRIMARY KEY,
  listing_id INTEGER NOT NULL REFERENCES listing(id),
  name TEXT NOT NULL,
  url TEXT,
  email TEXT NOT NULL,
  country TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  joined_at TEXT DEFAULT CURRENT_TIMESTAMP,
  approved_at TEXT
);

CREATE TABLE admin_user (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL
);
```

Custom fields deferred to `002_custom_fields.sql` once the base flow works:

```sql
CREATE TABLE custom_field (
  id INTEGER PRIMARY KEY,
  listing_id INTEGER NOT NULL REFERENCES listing(id),
  label TEXT NOT NULL,
  field_key TEXT NOT NULL,       -- used as the form field name
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE member_field_value (
  member_id INTEGER NOT NULL REFERENCES member(id),
  custom_field_id INTEGER NOT NULL REFERENCES custom_field(id),
  value TEXT,
  PRIMARY KEY (member_id, custom_field_id)
);
```

(A separate table, not a JSON blob — keeps fields sortable/searchable in
plain SQL, matching the "raw SQL, no abstraction" philosophy.)

## Routes

Public:
- `GET /` — approved member list for the (single, v1) listing
- `GET /join` — join form
- `POST /join` — validate, insert as `pending`, send confirmation + owner
  notification emails, redirect to a thank-you page

Admin (all behind `requireAdmin` session middleware):
- `GET /admin/login`, `POST /admin/login`, `POST /admin/logout`
- `GET /admin` — dashboard: pending count, recent joins
- `GET /admin/members` — full table, filter by status, search by name/email
- `POST /admin/members/:id/approve` — set status, send approval email
- `POST /admin/members/:id/reject`
- `POST /admin/members/bulk` — bulk approve/reject from checkboxes

## Migrations approach

No ORM migration tool — `db/migrate.js` reads `.sql` files from
`db/migrations/` in filename order, tracks which have run in a
`_migrations` table, and applies anything new on server boot. This mirrors
Django's "automatic migrations" convenience without adopting Django, and
avoids the manual "run this ALTER TABLE" instructions that plagued the old
PHP scripts' upgrade docs.

## Next steps

1. Scaffold the folder structure and `package.json` above.
2. Wire `db/migrate.js` + `001_init.sql`, confirm the SQLite file gets
   created and migrated on boot.
3. Build the public join flow end-to-end (form → validation → insert →
   emails) before touching the admin panel.
4. Build the admin login + pending-members approve/reject flow.
5. Add custom fields (`002_custom_fields.sql` + dynamic form rendering) once
   the fixed-field flow is solid.
6. Write a `.env.example` and a short `SELF-HOSTING.md` covering `npm
   install`, `.env` setup, and `npm start`.
