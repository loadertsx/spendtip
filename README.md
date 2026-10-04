# Spendtip

React Router + Cloudflare Workers + D1, with Drizzle ORM and Drizzle Studio.
Use Bun and Node.js >= 22.22 (required by React Router).

## Local development

```sh
bun install
bun run db:init:local
bun run db:migrate:local
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
    relations.ts         # pure Drizzle relational-query metadata

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

## Categories and expenses

```text
users       1 ─── N categories
users       1 ─── N expenses
categories  1 ─── N expenses (same owner)

app/features/categories/  # user-owned category schema
app/features/expenses/    # expense schema and SQLite persistence tests
app/shared/db/relations.ts # Drizzle query metadata for all three tables
```

Every category belongs to a Spendtip user. New users start with no categories;
there is no shared catalog, predefined category, stable translation code, or
category translation file. Names and descriptions are stored exactly as authored,
in any language. The description provides guidance for future AI classification.

| Category column | Contract |
| --- | --- |
| `id` | Text UUID primary key |
| `user_id` | Required foreign key to the internal `users.id` |
| `name` | Required user-authored name |
| `description` | Required user-authored classification guidance |
| `archived_at` | Nullable UTC timestamp in integer milliseconds |

An index on `(user_id, archived_at)` supports active-category queries.
Archiving sets `archived_at` without deleting the category or its historical
expenses. Future creation handlers should only offer the user's active categories;
the foreign key itself does not prohibit assigning an archived category.

`expenses` belongs to a Spendtip user:

| Column | Contract |
| --- | --- |
| `id` | Text UUID primary key |
| `user_id` | Required foreign key to the internal `users.id` |
| `category_id` | Nullable; references a category with the same `user_id` |
| `original_text` | Required, preserves the user's original input |
| `amount_minor` | Required positive integer, at most `Number.MAX_SAFE_INTEGER` |
| `currency` | Required three uppercase letters, e.g. `ARS`, `USD`, `EUR` |
| `occurred_at` | Required UTC timestamp in integer milliseconds |
| `created_at` | Required UTC timestamp in integer milliseconds |

The composite foreign key `expenses(user_id, category_id)` references
`categories(user_id, id)`. It rejects another user's category on both inserts
and updates. A unique key on the parent columns supports this constraint.
Foreign keys also prevent orphaned data and deletion of referenced users/categories.
A null category means pending classification; there is no special Other category.
An index on `(user_id, occurred_at)` supports history queries.

Amounts use the currency's smallest unit (e.g. `1050` means USD 10.50).
The currency constraint validates the code's shape, not membership in an ISO
currency list. Zero, negative, fractional, and unsafe integer amounts are rejected.
Drizzle generates UUIDs and expense `created_at` at insertion; raw SQL inserts
must supply them. Drizzle exposes timestamps as `Date` values.

`getDb()` registers the pure `defineRelations` metadata in `relations.ts`.
This supports `db.query` and nested `with` queries; it does not create SQL
constraints or automatically scope root queries to the signed-in user.

```ts
// In an authenticated server handler, after resolving currentUser:
const records = await getDb().query.expenses.findMany({
  where: { userId: currentUser.id },
  with: { category: true }, // null for pending classification
});
```

**Development reset:** `20261004141423_keen_warbound/migration.sql` discards
all existing categories and expenses, preserving every user field unchanged.
It replaces the earlier shared-catalog design before staging/production use.
The old seed SQL remains only in migration history; applying the complete history
leaves categories and expenses empty. Do not apply this reset to any database
whose category/expense data must be preserved.

Apply the reviewed migration locally and inspect the tables with:

```sh
bun run db:migrate:local
bun run db:studio:local
```

This is the persistence foundation only: no category/expense endpoints, forms,
or AI classification are implemented. Future handlers must enforce ownership
using the authenticated Spendtip user, including category editing and archiving.

## Authentication: Clerk + Spendtip users

Clerk owns identities, credentials, and sessions. Spendtip owns its `users` table
in D1; "Spendtip user" does not mean a user that only exists on your computer.
The current Worker's `DB` binding determines which database is used.

```text
app/features/auth/   # Clerk integration, request context, auth UI and routes
app/features/users/  # users schema, Drizzle queries, account route
```

The only root middleware is Clerk's session verification. Spendtip user
resolution happens explicitly in loaders/actions, not in a second middleware.
The root loader calls `getSpendtipUser(args)` so the first authenticated page
access still provisions a user, even on the public homepage. Protected handlers
call `await requireSpendtipUser(args)` themselves: they do not depend on the root
loader having run first. A route guard may improve UX but must not replace these
handler-level checks. Resource/API handlers must also choose an appropriate
unauthenticated response (for example, 401 instead of a page redirect).

Anonymous requests do not create users. On the first authenticated access,
the server reads the Clerk profile and inserts the initial snapshot. A unique
`clerk_user_id` and conflict-safe insert prevent duplicate users across concurrent
requests. Within one request, parallel loaders share the same resolution promise,
including a null result or a failure; nothing is cached globally. Existing users
are reused without fetching the profile from Clerk or updating timestamps.

The root document and root/account data responses use `Cache-Control: private,
no-store` to protect session-dependent content. Protected redirects also disable
caching. Future resource handlers/actions must apply the appropriate private
cache policy to their own responses.

The table contains an internal UUID, a unique Clerk ID, nullable email/name/avatar,
and UTC `created_at`/`updated_at` timestamps stored as integer milliseconds.
Email is neither a matching key nor a unique constraint. Both timestamps start
with the same value. Drizzle refreshes `updated_at` on actual updates, not login.
Other features should reference the internal ID and enforce ownership in their
loaders/actions; being signed in is not authorization to access another user's
resources.

Email, name, and avatar are **copied only at creation**. A TODO in `schema.ts`
tracks future Clerk webhook support for synchronizing these fields. Deleting a
Clerk identity does not currently delete its Spendtip data. Signing out only
ends the Clerk session. Neither webhook synchronization nor account deletion
is implemented in this version.

Routes:

- `/`: public homepage with sign-in/sign-up controls or the user menu.
- `/sign-in/*` and `/sign-up/*`: Clerk's path-routed components.
- `/account`: protected page displaying the profile persisted in D1.

New pages and navigation do not add CSS, inline styles, or styling classes.
Clerk components retain their built-in appearance.

### Development keys and Worker bindings

`npx -y clerk@latest init` generated unclaimed development keys in `.env.local`,
which is ignored by Git. Do not print or commit keys. Cloudflare's development
plugin loads the local variables into Worker bindings. The server adapter reads
`CLERK_SECRET_KEY` and `VITE_CLERK_PUBLISHABLE_KEY` directly from those bindings,
using the types generated by Wrangler, not Node's `process.env`.
Only the publishable key and Clerk's public SSR state reach the browser.
Missing keys fail explicitly instead of provisioning another Clerk application.

`wrangler.jsonc` declares both binding names in `secrets.required` for local,
staging, and production. This list contains names only: Wrangler can generate
`Env` types on a clean checkout or CI without `.env.local` or real credentials.
Named environments repeat the list because Wrangler does not inherit it.
The publishable key remains public despite using this declaration mechanism;
the secret key must never reach the browser. Actual values are still required
when running or deploying the application.

After applying the local migration, start the app, select **Sign up**, and open
**My account**. The initial profile should appear with its Spendtip user ID.
Reloading or opening multiple tabs must preserve that ID and its timestamps.
Inspect the `users` table with `bun run db:studio:local` if needed. After signing
out, `/account` must redirect to `/sign-in`.

To claim the development application, run this yourself when ready:

```sh
npx -y clerk@latest auth login
```

Before production, claim the app and configure Clerk production with
`npx -y clerk@latest deploy`. Unclaimed apps and temporary keys are not
production-ready. Configure each deployed Worker's own publishable key and
server-only secret via Cloudflare bindings/secrets; local `.env.local` is not a
production configuration. Never prefix the secret key with `VITE_`. Apply the
reviewed D1 migrations separately for the selected remote environment.

To change email/phone/username and social sign-in options after claiming, use the
Clerk Dashboard, or `clerk config pull` and `clerk config patch --dry-run` before
applying a reviewed change. No sign-in strategy changes were made here.

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

The first migration creates the `users` table. Apply it locally before signing
in; a verified Clerk identity needs a persisted Spendtip user before accessing
protected data.

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
bun run test               # profile mapping, ownership, relational queries, and SQLite migrations
bun run check:types        # delegates to the complete typecheck pipeline
npx -y clerk@latest doctor
bun run build              # local build
bun run build:stg
bun run build:prod
bun run preview            # rebuild and preview locally

bun run deploy:stg
bun run deploy:prod
```

`check:types` delegates to `typecheck`: it generates Wrangler and React Router
types, checks referenced TypeScript projects in build mode, and checks tests.
It does not require Clerk credentials. Plain `tsc` against the root config would
not check its referenced projects.

Each deployment builds with `CLOUDFLARE_ENV` and deploys with `--env` targeting
the same environment. `bun run deploy` refuses to select an implicit environment.
Deployments require additional Cloudflare permissions beyond D1 access.
`worker-configuration.d.ts` is regenerated with `bun run cf-typegen` and is not
committed to version control.
