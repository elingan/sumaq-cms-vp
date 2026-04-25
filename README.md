# Sumaq CMS

Sumaq CMS is a Nuxt 4 application backed by NuxtHub, Drizzle ORM and SQLite.

## Database setup

The project uses SQLite in local development and Turso in production.

- Local database file: `.data/db/sqlite.db`
- Production driver: libSQL via `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`
- NuxtHub manages schema generation and migration discovery automatically

## Install

Use the Vite+ wrapper defined by the project:

```bash
vp install
```

## Local development

1. Create your local environment file from `.env.example` and set `NUXT_SESSION_PASSWORD`.
2. Generate migrations after schema changes:

```bash
npx nuxt db generate
```

3. Apply migrations locally:

```bash
npx nuxt db migrate
```

4. Start the app:

```bash
vp run dev
```

The SQLite database will be created automatically at `.data/db/sqlite.db`.

## Production with Vercel + Turso

Configure these environment variables in Vercel:

```bash
NUXT_SESSION_PASSWORD=your-32-char-minimum-secret-key-here
TURSO_DATABASE_URL=libsql://your-database-name-your-org.turso.io
TURSO_AUTH_TOKEN=your-turso-auth-token
```

NuxtHub will detect the Turso credentials and use the libSQL driver automatically.

If your deployment pipeline does not run migrations during startup, execute them explicitly with:

```bash
npx nuxt db migrate
```

## Quality checks

```bash
vp run typecheck
vp lint
```

## Useful commands

```bash
npx nuxt db generate
npx nuxt db migrate
npx nuxt db drop-all
vp run build
vp preview
```
