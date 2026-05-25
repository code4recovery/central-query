# Central-Query Audit — Pass 1: Discover

**Brief for Claude Code**
**Repository:** central-query (Express + TypeScript REST API)
**Status:** Pre-production, preparing for launch
**Expected load:** 25,000–30,000 visitors/day
**Audit framework:** TrustTech 3 Pass Audit (Discover → Explore → Design)

---

## Your role in this pass

You are conducting **Pass 1 of 3: Discover**.

The single most important rule: **Do not pre-decide anything.** Do not recommend fixes. Do not rank severity. Do not say "this is a problem" or "this is fine." Your job in this pass is to **map what exists**, factually and completely, so the codebase can reveal what needs attention on its own terms.

If you find something that feels obviously broken, urgent, or alarming, **note it as an observation in neutral language** ("X is configured as Y", "X is commented out", "X is documented but not present in repo") and keep mapping. Resist the urge to prescribe. Pass 2 (Explore) will interrogate; Pass 3 (Design) will recommend. This pass builds the foundation both other passes stand on — if it's biased, they will be too.

**Do not make any code changes.** This is analysis only.

---

## What to produce

A single markdown report at `/audit/pass-1-discover.md` in the repo, organised into the sections below. Use factual, neutral language throughout. Where a section has nothing to report, write "Nothing to report" rather than omitting the section — absence is itself a finding.

Treat the existing `CLAUDE.md` as orientation, not as ground truth. If the code disagrees with `CLAUDE.md`, document the disagreement; don't reconcile it.

---

## Sections required

### 1. Repository inventory

- Top-level file and directory structure (2 levels deep)
- Total file count by extension (`.ts`, `.spec.ts`, `.cy.ts`, `.json`, `.yml`, `.md`, etc.)
- Lines of code by area (`src/`, `cypress/`, `testEnv/`)
- Presence/absence of: `README.md`, `CHANGELOG.md`, `LICENSE`, `.env.example`, `CONTRIBUTING.md`, `SECURITY.md`, `.editorconfig`, `.nvmrc`, `Dockerfile`, CI workflow files

### 2. Runtime and build configuration

- Node version (from `.nvmrc`, `package.json` `engines`, Dockerfile, CI workflow — list each source separately)
- Module system declarations (`type` in `package.json`, `module` and `moduleResolution` in `tsconfig.json`)
- All scripts in `package.json` with exact command strings
- `tsconfig.json` strictness settings (`strict`, `noImplicitAny`, `strictNullChecks`, `noUncheckedIndexedAccess`, etc.) — report the actual values
- Build output location and what gets included/excluded

### 3. Dependencies

- Full list of `dependencies` and `devDependencies` with versions
- For each dependency: latest published version (use `npm view <pkg> version`) — report as a table: `name | installed | latest | major behind?`
- Any dependencies with known deprecation notices on npm
- `npm audit` output (raw, full — do not summarise or filter)
- Lockfile presence and consistency (`package-lock.json` vs `npm install` drift)

### 4. Endpoint surface

For every route registered in the app:
- HTTP method, path, controller function name, service function name
- Request parameter shape (query, params, body) — what the controller actually reads
- Response shape on success — what the controller actually returns
- Error paths — which custom errors are thrown, which mapper handles each
- Middleware applied (including commented-out middleware — list it explicitly as "commented out")
- Whether the route is documented in `README.md` or `CLAUDE.md`

### 5. Data layer

- All MongoDB collections referenced in code (`db.collection(...)` calls)
- All MongoDB views referenced in code, with the exact view name as a string literal
- For each view: is its aggregation pipeline defined anywhere in the repo? (yes/no/partial — quote the source if yes)
- Indexes created or assumed by code (`createIndex` calls, or `$match`/`$sort` patterns that imply an index)
- Connection pool settings actually applied at runtime, broken down by `NODE_ENV` branch
- Connection string handling — where `MONGO_URI` is read, validated, redacted in logs (if at all)

### 6. Time/timezone handling

- Every place `Date`, `Date.now()`, `new Date()`, or any date library is used (file:line)
- Every place the `rtc` string is parsed, generated, or compared
- Every place a timezone is referenced (string match on "UTC", "timezone", "tz", "DST", "offset")
- Test coverage for time logic — which spec files exercise `lowerUpperLimits`, `pipelineFromQuery`, and the cross-day / weekly-wrap branches specifically

### 7. Authentication and authorisation

- Every authentication-related symbol in the codebase (active or commented): `TokenMiddleware`, `AuthorizationMiddleware`, JWT, session, API key, CORS config, rate limiting
- For each: active, commented out, or referenced but not implemented
- CORS configuration as actually applied (origins, methods, credentials)
- Any request validation middleware (`express-validator`, `zod`, `joi`, hand-rolled) — where applied, where not

### 8. Error handling

- Every custom error class in `src/common/custom_errors/` — name, fields, where thrown, where caught
- Every error mapper in `src/common/error_mappers/` — what it maps from, what it maps to
- Every `try/catch` block in `src/` — file:line, what's caught, what's done with it
- Every `.catch()` chain
- Every place `next(err)` is called vs places errors are swallowed or only logged
- What gets logged on error (stack? message? request context? PII?)

### 9. Logging and observability

- Logging library in use (if any)
- Log levels configured per environment
- Every `console.log`, `console.error`, `console.warn` in `src/` (file:line)
- Health check endpoints (presence, path, what they check)
- Metrics, tracing, or APM integration (presence or absence)
- Request ID / correlation ID handling

### 10. Testing

- Jest config: `rootDir`, `maxWorkers`, `fakeTimers`, `setupFiles`, coverage thresholds (if any)
- Test file count and total test count (run `jest --listTests` and count `it(`/`test(` occurrences)
- Cypress config: `baseUrl`, spec pattern, retries, video/screenshot settings
- Cypress test count and what they cover (one-line summary per spec file)
- Coverage report — generate `npm run test -- --coverage` and report the summary numbers (statements/branches/functions/lines) per file, sorted lowest first
- Any test files that are skipped (`describe.skip`, `it.skip`, `xit`, `xdescribe`)

### 11. Deployment and operations

- Dockerfile contents — base image, build steps, final image size estimate, user (root or non-root), exposed port
- CI/CD workflow — every step in `.github/workflows/deploy-cloudrun.yml`
- Where each runtime environment variable comes from (GitHub Secrets, GCP Secret Manager, hardcoded in workflow, `.env`)
- Cloud Run service configuration as committed (CPU, memory, concurrency, min/max instances) — note if these are defaults
- `NODE_ENV` value at each stage: local dev, test, CI, deployed production

### 12. Security surface

Neutral inventory, not judgment:
- Where user input enters the system (every `req.query`, `req.params`, `req.body` read)
- Where user input reaches a database query — trace each path
- Any string interpolation into Mongo queries vs parameterised filter objects
- Headers set on responses (helmet, CSP, HSTS, etc.) — present or absent
- Body parser limits (`express.json({ limit })`)
- Rate limiting (present or absent)
- Any secrets, tokens, keys, or credentials committed to the repo (grep for common patterns; report file:line if found)
- `.gitignore` coverage of `.env`, `dist/`, `node_modules/`, `coverage/`

### 13. Documentation state

- For each markdown file in the repo: path, line count, last commit date
- Disagreements between `CLAUDE.md` and `README.md` (list each one)
- Disagreements between either doc and the actual code (list each one)
- Undocumented surface: endpoints, env vars, scripts, or behaviours present in code but not mentioned in either doc

### 14. Open observations

A bullet list of anything you noticed that didn't fit cleanly into the sections above. Neutral phrasing — "X is configured as Y" rather than "X should be Z". This is the catch-all for things the codebase wants to tell us that the section structure didn't ask about.

---

## How to work

1. Read `CLAUDE.md` and `README.md` first to orient.
2. Work section by section, top to bottom. Do not skip ahead.
3. For each section, gather evidence before writing. Quote file paths and line numbers. Quote actual code or config where it matters.
4. If a section requires running a command (`npm audit`, `npm view`, `jest --listTests`), run it and paste the raw output.
5. If you're uncertain whether something belongs in a section, put it in Section 14 (Open observations) rather than forcing it.
6. When done, save the report to `/audit/pass-1-discover.md` and stop. Do not start Pass 2. Do not write a summary or recommendations section.

---

## What success looks like

A factual document that a stranger could read and accurately describe the current state of the system without ever having opened the codebase. No opinions. No fixes. No "should." The map, not the route.

Pass 2 (Explore) will begin when Matt has reviewed this report and is ready.
