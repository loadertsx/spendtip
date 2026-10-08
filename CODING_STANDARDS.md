# Coding standards

Project-specific standards for new and changed code. Review changed behavior and
its callers; do not turn a feature review into unrelated cleanup.

## 1. Authority and review

- **Required** rules describe contracts a change must preserve. Cite the section
  and the affected code when reporting a violation.
- **Design guidance** requires judgment. Explain the concrete complexity or risk
  for callers; do not report a heuristic as an automatic violation.
- This document governs coding standards. [README.md](README.md) documents domain
  contracts and operational workflows; [docs/design-guide.md](docs/design-guide.md)
  governs visual design, copy, and accessibility. Generic agent skills are
  guidance and must not override explicit project standards. If project documents
  conflict, flag the conflict rather than silently inventing a rule.
- Biome and TypeScript own automated formatting, import organization, linting,
  and type checks. Run the checks; do not duplicate their findings in a manual
  standards review. Fowler code smells remain judgment calls, not hard rules.

## 2. Deep modules and small interfaces

Following John Ousterhout's *A Philosophy of Software Design*, design **deep
modules with small, simple interfaces**: hide meaningful complexity behind an
interface that is easier to understand and use than its implementation.

A module can be a function, a feature package, or another coherent unit of code;
this does not require classes. Its interface includes everything callers must
know: parameters, invariants, ordering constraints, configuration, errors, and
observable behavior—not just its TypeScript signature.

**Design guidance:**

- Hide implementation decisions inside the module that owns them. Callers should
  express intent, not reproduce internal algorithms or coordinate a fragile
  sequence of steps the module could perform itself.
- Keep related knowledge together. A change to one domain rule should not require
  callers to update duplicated validation, normalization, or orchestration.
- Expose only operations and configuration needed by real callers. Avoid generic
  hooks, flags, and abstractions for hypothetical requirements.
- Avoid wrappers that only pass arguments onward without hiding complexity or
  enforcing a meaningful contract. Framework adapters and wrappers that enforce
  authorization or translate errors can be valuable even when small.
- Prefer simplifying the interface to exporting more internal helpers. Test
  observable behavior through the module's interface; avoid coupling tests to
  private implementation details.
- For a substantial new module or redesign, consider a second interface design
  before choosing. Prefer the one that reduces caller knowledge and concentrates
  changes, not the one with the most layers.

Depth is not a line-count ratio. Do not pad implementations, create giant
functions, force unrelated responsibilities together, or mandate dependency
injection everywhere to satisfy this principle. A small pure helper can be a
useful module. Review findings must show how the proposed design reduces actual
complexity.

## 3. Feature organization and runtime boundaries

**Required:**

- Organize feature-owned logic, UI, queries, and tables under
  `app/features/<feature>/`. Put genuinely shared infrastructure under
  `app/shared/`; do not move code there solely for hypothetical reuse.
- Define tables in the owning feature's `schema.ts` and import tables directly.
  Keep schemas declarative: no Worker bindings or `.server.ts` imports. Drizzle
  Kit discovers `app/features/**/schema.ts`; do not add a central schema aggregator.
- Keep database access and secrets in server-only code. Use `.server.ts` for
  server modules that could otherwise be imported by application/browser code.
  Shared validation and pure domain logic must remain safe to import in the browser.
- Obtain application database access from the current Worker's `DB` binding via
  `getDb()`. Application features must not select local/staging/production
  databases or require remote database tokens.
- Read application secrets from Worker bindings, not Node's `process.env`.
  Node-only tooling may use its own environment configuration. Never expose
  server secrets through `VITE_` variables, client data, committed files, or logs.

## 4. Authentication, ownership, and private responses

**Required:**

- Every protected loader/action independently resolves the authenticated Spendtip
  user with `requireSpendtipUser`. Do not rely on the root loader or a UI guard
  having run first. Resource handlers must choose an appropriate unauthenticated
  response, such as 401 rather than a page redirect.
- Scope reads and mutations to the authenticated owner's internal `users.id`.
  Being signed in is not permission to access another user's records. Include
  ownership in mutation predicates; Drizzle relations do not automatically scope
  queries. Foreign keys are not a replacement for handler authorization.
- Keep Spendtip user resolution request-scoped. Do not cache a user's identity or
  resolution promise globally across requests. Preserve conflict-safe provisioning
  by Clerk ID; email is not an identity-matching key.
- Apply `Cache-Control: private, no-store` to session-dependent responses,
  including protected redirects and relevant action/resource error responses.
  Do not assume root response headers protect an independent resource handler.

## 5. Domain data and migrations

**Required:**

- Preserve the domain contracts in the README: money is a positive safe integer
  in minor units; persisted timestamps are UTC integer milliseconds; currencies
  use three uppercase letters. Do not use floating-point major units for storage
  or silently change the meaning of these fields.
- Categories are user-owned and user-authored, not a shared translated catalog.
  Write names and normalized keys together using `categoryNameFields`. Archive
  categories instead of deleting their history. A null expense category means
  pending classification; do not introduce a synthetic Other category.
- When assigning an expense category, verify it belongs to the current user and
  is active. Preserve same-owner foreign keys and active-name uniqueness.
- Generate, review, and commit SQL migrations and snapshots for schema changes.
  Never edit an applied migration; create another migration instead. Account for
  existing data when adding constraints or required fields.
- Remote migrations are explicit, reviewed operations—not startup/build side
  effects. Do not use `drizzle-kit push` against production. Follow the README's
  backup and environment safeguards before destructive changes.

## 6. Input validation and errors

**Required:**

- Validate untrusted input on the server before using it in domain operations.
  Client-side validation improves feedback but does not replace server validation.
- Distinguish expected failures (invalid input, unavailable owned records,
  conflicts) from unexpected failures. Return appropriate HTTP status codes and
  actionable, plain-language messages. Do not disguise a failure as success or
  silently swallow an unexpected exception.
- Do not expose secrets, private records, stack traces, or internal exception
  details in production responses. Keep diagnostic logs free of credentials and
  unnecessary personal data.

**Design guidance:** reuse validation and error translation when they encode the
same rule. Choose a result or exception contract that makes callers simpler;
there is no mandatory repository-wide error abstraction or validation library.

## 7. UI and accessibility

**Required:**

- Follow [docs/design-guide.md](docs/design-guide.md) for tokens, shared utilities,
  English interface copy, themes, Clerk appearance, and accessibility. Do not
  import conflicting styling conventions from generic skills.
- Make interactive controls keyboard usable with visible focus and accessible
  names. Associate form fields with labels and make validation feedback accessible.
  Use semantic controls rather than clickable non-interactive elements.
- Provide relevant loading/pending, empty, success, and error feedback. Pending
  state must not imply a mutation has already persisted. If a mutation is
  optimistic, reconcile success and roll back failure without duplicate records.
- Verify changed screens at mobile width and in both themes. Server-rendered
  timestamps must use a fixed time zone to avoid server/client disagreement.

## 8. Tests and verification

**Required:**

- Add or update tests for changed behavior and meaningful failure paths. Test
  observable contracts, not private helper names or incidental component structure.
- For ownership-sensitive data changes, cover cross-user rejection. For changes
  to persistence constraints or migrations, test against SQLite with foreign keys
  enabled and the committed migration history, rather than a hand-built schema
  that bypasses migrations.
- Keep tests repeatable and isolated from production data and real credentials.
  Do not introduce an arbitrary coverage percentage as a substitute for relevant
  behavioral coverage.

**Design guidance:** existing tests are colocated `*.test.ts` files using
`node:test` and `node:assert/strict`, run with Bun. Prefer real pure logic and
SQLite integration over broad mocks. Add route or browser coverage where that is
needed to demonstrate user-facing behavior; no particular E2E framework is
mandated.

For code changes, run the relevant tests and the project checks:

```sh
bun run test
bun run check:types
bun run check:quality
bun run build
```

Report checks that were not run or failed, including any pre-existing failures.
Documentation-only changes need link, consistency, and diff checks rather than
an application build. Never run remote migrations or deploy as a review check.
