# Contributing to Fanlisting Revival

Thanks for your interest in improving Fanlisting Revival! It's open source under
the [MIT License](LICENSE) — contributions, bug reports, and forks are all
welcome.

## Getting set up

You'll need **Node.js 22 or 24** (an LTS release — `better-sqlite3` only ships
prebuilt binaries for LTS ABIs; see the README's Requirements section).

```bash
git clone <your-fork-url> && cd fanlisting-revival
npm install
cp .env.example .env          # fill in SESSION_SECRET; leave SMTP blank for dev
npm run create-admin          # create a local admin login
npm run dev                   # auto-reloading server on http://localhost:3000
```

## Running the tests

```bash
npm test
```

Tests use Node's built-in runner (`node --test`) plus `supertest`. Each test
file runs against an isolated temporary database, so they never touch your local
`data/` file. **Please add or update tests for any behavior change** — the suite
under `test/` is integration-level and a good template to copy from.

## Formatting

Two formatters keep the codebase consistent (both at 4-space indent):

```bash
npm run format        # Prettier — JS, CSS, JSON, Markdown
npm run format:views  # js-beautify — Handlebars templates in views/
```

Prettier ignores `.handlebars` (its parser doesn't support server-side
partials), which is why templates are formatted by `format:views` instead.
Please run both before submitting. `npm run format:check` verifies formatting
without writing changes.

> **Note:** `views/public/buttons.handlebars` has an `@formatter:off` guard
> around a `<textarea>` — its contents are whitespace-sensitive (a reflow would
> corrupt the copy-paste embed code), so leave that block on one line.

## Project conventions

This project deliberately keeps a low barrier to entry, in the spirit of the old
fanlisting scripts. Please match the existing style:

- **Plain JavaScript, no build step, no TypeScript.**
- **Raw SQL, no ORM.** All database access lives in `lib/queries.js` as named,
  prepared statements — that's the one file that touches SQL strings. Add new
  queries there rather than scattering SQL across routes.
- **Server-rendered Handlebars.** Templates live in `views/`; shared pieces
  (header, footer, info panel) are partials in `views/partials/`.
- **Schema changes are migrations.** Add a new numbered `.sql` file in
  `db/migrations/` — never edit one that's already been applied.
- **Keep dependencies few.** Prefer the standard library or an existing
  dependency over adding a new package.

For the reasoning behind the stack, see [`docs/express-plan.md`](docs/express-plan.md)
and [`docs/architecture-comparison.md`](docs/architecture-comparison.md).

## Submitting changes

1. Fork the repo and create a branch for your change.
2. Make your change, keeping commits focused; add tests and run `npm test`,
   then `npm run format` and `npm run format:views`.
3. Update the README/docs if you've changed behavior or configuration.
4. Open a pull request describing what and why.

## Reporting security issues

Please **do not** open a public issue for security vulnerabilities — see
[`SECURITY.md`](SECURITY.md) for how to report them privately.
