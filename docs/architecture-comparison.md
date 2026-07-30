# Fanlisting Revival — Architecture Comparison

Context: fanlistings are small fan-run sites for a single subject (person, ship,
show, object). Visitors submit a join form (name, URL, country, optional custom
fields); the owner approves/rejects; approved members render on a public,
themeable list page. Owners often run many fanlistings from one "collective."
The existing open-source options (Enthusiast, Enthusiast Lite, BellaBuffs) are
all PHP 4/5 + MySQL, unmaintained, and assume 2005-era shared hosting.

Goal for v1: a single fanlisting (not a full collective yet), but with a data
model that doesn't block adding collective support later. Self-hosted via an
npm-installable kit (or equivalent), not a hosted SaaS.

Three candidate architectures below, sketched to the same depth so they're
comparable.

---

## Option A — SvelteKit (full-stack JS)

**Shape:** One framework handles both the public pages and the admin panel.
Public pages (join form, member list) are server-rendered with minimal client
JS; the admin panel uses the same framework's form actions and load functions.

**Data model** (Prisma or Drizzle, SQLite by default, Postgres as a swap-in):

- `Listing` — subject name, slug, description, custom field definitions (JSON), theme/template override path. Present now even though v1 only ever creates one row, so a collective is "just more rows" later.
- `Member` — listing_id, name, url, country, email, custom field values (JSON), status (pending/approved/rejected), joined_at, approved_at.
- `AdminUser` — single owner account (or a few, for collectives), password hash or magic-link token.

**Admin approach:** hand-built. A `/admin` route group with a pending-members table, bulk approve/reject actions (`+page.server.js` form actions), search/filter, and a mass-email tool. None of this comes for free — it's the main labor cost of this option.

**Theming:** public routes render from a `templates/` directory of Svelte components or raw HTML+placeholder syntax; swapping the look is closer to editing a template file than fighting a component library, which matches how fanlisting owners are used to working.

**Deploy story:** `npm install`, point `DATABASE_URL` at a SQLite file or Postgres, `npm run build && node build`. Works on any Node host (a VPS, Railway, Fly, a $5/mo box) — same "download and run" feel as the old zips, minus FTP.

**Pros:** smallest JS payload to visitors, one language/framework for the whole app, form actions map naturally onto join/approve flows, easy to keep public templates plain-HTML-ish for themers.

**Cons:** admin UI (bulk actions, search, mass mail) is fully custom-built — no shortcut. Smaller ecosystem/contributor pool than Next or Django. Emails, uploads, and auth are all "assemble it yourself" (Resend/nodemailer, etc.).

**Rough effort distribution:** ~30% public pages, ~50% admin panel, ~20% infra (email, auth, deploy tooling).

---

## Option B — Node/Express + server-rendered templates

**Shape:** Closest structural relative to the original PHP scripts. One Express process, views rendered server-side with EJS or Nunjucks, `better-sqlite3` (or `pg`) for storage, little to no client JS beyond progressive enhancement on the join form.

**Data model:** identical to Option A conceptually (`listings`, `members`, `admin_users` tables), but as plain SQL/migrations (e.g. `node-pg-migrate` or a hand-rolled migration runner) rather than a schema-first ORM. This is more manual but also more transparent — arguably closer to what the PHP scripts' audience is used to inspecting/editing directly.

**Admin approach:** also fully hand-built, same as Option A — routes for `/admin/pending`, `/admin/members`, bulk-action form posts, a basic session-based login. No framework shortcut here either; Express gives you routing and middleware, nothing domain-specific.

**Theming:** templates are plain EJS/Nunjucks files with `<%= %>` placeholders — arguably the most direct conceptual translation of the old PHP "edit the include file" workflow.

**Deploy story:** `npm install && npm start`, SQLite file sits next to the app. Runs anywhere Node runs, including bare-bones VPS setups. No build step required, which is a slight edge over SvelteKit for absolute simplicity.

**Pros:** simplest mental model of the three — no framework magic, no build pipeline, most legible to someone coming from the PHP-script world who wants to peek at the source. Smallest dependency footprint.

**Cons:** everything is hand-rolled: routing conventions, session handling, CSRF protection, validation — all things SvelteKit/Django give you more scaffolding for. More boilerplate to write and maintain long-term, and easier to introduce security gaps (this is exactly how the original PHP scripts accumulated CVEs over the years) if care isn't taken.

**Rough effort distribution:** ~25% public pages, ~45% admin panel, ~30% infra/plumbing (auth, validation, migrations — things other options provide more structure for).

---

## Option C — Django (Python)

**Shape:** The biggest structural departure, but the domain (form → moderation queue → templated list → email) is close to a textbook Django app, so it changes the amount of code needed, not just the syntax.

**Data model:** same two core models —

- `Listing(name, slug, description, custom_fields_schema, template_override)`
- `Member(listing=FK, name, url, country, email, custom_field_values, status, joined_at, approved_at)`

defined as normal Django models. Migrations are generated automatically (`makemigrations`), which directly solves the problem the old scripts handled badly — Enthusiast's changelog and `upgrading.txt` are full of manual "run this SQL to fix your schema" steps.

**Admin approach:** largely free. Django's auto-generated admin (`admin.py`) gives you a working moderation queue, bulk actions (approve/reject as an admin action), search, and filtering with only a few dozen lines of configuration — no custom UI code required for v1. Mass-email can be added as a custom admin action calling Django's built-in email backend. This is the one option where "admin panel" stops being the majority of the build effort.

**Theming:** Django templates (`{{ member.name }}`) serve the public join/list pages; template inheritance makes it straightforward to expose a small set of overridable blocks for themers, though the templating language itself will be less familiar to a JS-oriented audience.

**Deploy story:** the least "drop and run" of the three for typical fanlisting hosting — Python/WSGI hosting is less common on cheap shared hosts than Node today, though it deploys cleanly to a VPS, Railway, Fly, or Fly/Render-style PaaS with `pip install` + `gunicorn`. SQLite works fine for a single fanlisting; Postgres for a collective at scale.

**Pros:** by far the least code for the full Enthusiast-equivalent feature set — admin panel, form validation, migrations, and auth (Django's built-in `User`/permissions) are all included rather than built. Fastest path to feature parity with the old scripts.

**Cons:** not a JS stack, which was the original premise of this project — a real pivot, not just a technical detail. Less natural fit for contributors expecting a JS/Node codebase. Slightly less common self-host target than Node for the kind of cheap hosting fanlisting owners have historically used.

**Rough effort distribution:** ~40% public pages/templates, ~10% admin (mostly configuration), ~15% infra (mostly configuration, since email/auth/migrations are built in), ~35% adapting to Django conventions if the builder is more JS-fluent than Python-fluent.

---

## Comparison at a glance

| | SvelteKit | Express + templates | Django |
|---|---|---|---|
| Language | JS | JS | Python |
| Admin panel | Hand-built | Hand-built | Mostly free (auto-admin) |
| Public page weight | Very light | Very light | Light-moderate |
| Migrations | ORM-managed | Manual | Automatic |
| Closest in spirit to old PHP scripts | Somewhat | Most | Least |
| Self-host simplicity today | High | Highest | Moderate |
| Total build effort for v1 | Medium-high | Medium-high | Low-medium |
| Stays true to "modern JS stack" brief | Yes | Yes | No |

## Recommendation

If staying JS matters more than minimizing build effort: **SvelteKit** — it keeps public pages light and skinnable while handling the admin panel in the same framework, avoiding Express's extra plumbing work for comparable effort.

If minimizing effort and getting the closest feature parity to Enthusiast fastest matters more than the language: **Django** is the clear efficiency winner — the free admin panel alone likely saves 40%+ of total build time, since moderation UI is historically the most labor-intensive part of these scripts.

**Express** is the right call mainly if the priority is "smallest possible dependency footprint, most legible to someone used to reading old PHP source" — but it doesn't out-perform SvelteKit on any axis for this project and asks for more boilerplate in exchange for a marginally simpler deploy step.

## Open questions for next step

- Custom fields: stored as JSON blobs (flexible, less queryable) or a separate `CustomField`/`MemberFieldValue` table pair (queryable/sortable, more schema)?
- Auth: password login, magic link, or both?
- Is a "theme" a single template file override, or a small set of named slots (header/list-item/footer) that themers fill in?
- Any interest in an import path from existing Enthusiast MySQL databases, so current fanlisting owners can migrate rather than starting fresh?
