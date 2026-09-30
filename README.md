# Spendtip

React Router + Cloudflare Workers + D1, with Drizzle ORM and Drizzle Studio.
Use Bun and Node.js >= 22.22 (required by React Router).

## Local development

```sh
bun install
bun run db:init:local
bun run dev
```

The app runs at `http://localhost:5173`. The local database persists in
`.wrangler/state/v3/d1/`; it requires no credentials and does not access remote D1.
`db:init:local` runs `SELECT 1`: it initializes the file without creating business tables.

## Organization: package by feature

```text
app/
  features/
    <feature>/
      schema.ts          # tables owned by this feature
      queries.server.ts  # queries and data access
      ...                # feature logic and UI
  shared/db/
    client.server.ts     # getDb(), uses the current Worker's DB binding

drizzle/                 # version-controlled SQL history and snapshots
```

There is no central schema aggregator or workspace setup. Create features as
needed; Drizzle Kit automatically discovers `app/features/**/schema.ts`.
Each feature imports its tables directly. Schemas must be declarative:
do not import Cloudflare bindings or `.server.ts` modules from them.

Example query **in server-side code**, once the schema is defined:

```ts
import { getDb } from "~/shared/db/client.server";
import { expenses } from "./schema";

export function listExpenses() {
  return getDb().select().from(expenses).all();
}
```

`getDb()` can only be used inside the Worker. It does not select environments or
use tokens: Cloudflare provides the corresponding `DB` binding. `.server.ts`
prevents accidental imports into browser code.

## Environments

| Environment | Worker | D1 | Location |
| --- | --- | --- | --- |
| local (default) | `spendtip-app-local` | `spendtip-local` | Local SQLite |
| stg | `spendtip-app-stg` | `spendtip-stg` | Cloudflare |
| prod | `spendtip-app-prod` | `spendtip-prod` | Cloudflare |

Remote database IDs live only in `wrangler.jsonc`. The default environment has
no remote ID. Local commands explicitly select the default environment.

## Migrations

After creating or modifying a feature's `schema.ts`:

```sh
bun run db:generate
# Review and commit drizzle/<timestamp_name>/migration.sql and snapshot.json.
bun run db:migrate:local
```

The installed version of Drizzle Kit generates a directory per migration;
Wrangler discovers them through `migrations_pattern: "drizzle/**/migration.sql"`.
Do not modify migrations that have already been applied; generate a new one.

**There are initially no tables or migrations.** Until the first schema is
created, `db:generate` exits with "No schema files found"; this is expected.
`db:migrate:local` reports that there are no migrations to apply.

To apply the same migration history remotely, after reviewing the SQL:

```sh
bun run db:migrate:stg
bun run db:migrate:prod
```

These commands **modify the remote database**. They require Cloudflare
authentication (`bunx wrangler login` or an API token with D1 write permissions).
They do not run automatically on startup, build, or deployment. Do not use
`drizzle-kit push` against production. Check backups/Time Travel before
destructive migrations and coordinate changes compatible with the deployed app.

## Drizzle Studio

```sh
bun run db:studio:local
bun run db:studio:stg
bun run db:studio:prod
```

Open `https://local.drizzle.studio` while the process is running. The service
listens only on `127.0.0.1:4983`; stop it with Ctrl+C before switching
environments. Studio can edit data when the credentials allow it.

### Local

Studio uses Wrangler's SQLite file, not a separate database. Run
`bun run db:init:local` first. The internal `metadata.sqlite` file is ignored.
If there is more than one candidate SQLite file, Studio refuses to choose:
back up `.wrangler/state`, move stale D1 files aside, and reinitialize. Do not
delete state without a backup. This setup uses Wrangler's default persistence
directory; if you change `persistTo`, update Studio's file detection as well.

### Staging and production

```sh
cp .env.example .env
# Fill in CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN.
```

Remote Studio uses the D1 HTTP API. Wrangler's OAuth login alone does not
replace these variables. The wrapper selects the database ID from
`wrangler.jsonc`; do not set `DB_ENV` or `DB_DATABASE_ID` manually.

Create a Cloudflare token scoped to the relevant account with minimal D1
permissions. **For production Studio, use D1 Read**: the token's permissions,
not Studio, prevent writes. Use a separate token with D1 Edit only when
authorized writes are needed. Variables exported in the terminal take
precedence over `.env`. Do not commit tokens or prefix them with `VITE_`.

## Build, deployment, and checks

```sh
bun run typecheck
bun run build              # local build
bun run build:stg
bun run build:prod
bun run preview            # rebuild and preview locally

bun run deploy:stg
bun run deploy:prod
```

Each deployment builds with `CLOUDFLARE_ENV` and deploys with `--env` targeting
the same environment. `bun run deploy` refuses to select an implicit environment.
Deployments require additional Cloudflare permissions beyond D1 access.
`worker-configuration.d.ts` is regenerated with `bun run cf-typegen` and is not
committed to version control.
