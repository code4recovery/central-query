# Central-Query Audit — Pass 2: Explore

**Brief for Claude Code**
**Repository:** central-query
**Audit framework:** TrustTech 3 Pass Audit (Discover → Explore → Design)
**Predecessor:** `audit/pass-1-discover.md` (must be read first)

---

## Your role in this pass

You are conducting **Pass 2 of 3: Explore**.

Pass 1 produced a factual map. Pass 2 walks the map and **interrogates the most active threads** to understand *what they mean*, *how they behave under real conditions*, and *what they imply for production readiness at 25,000–30,000 visitors/day*.

The discipline shift from Pass 1 is precise and easy to get wrong: Pass 1 said "X is configured as Y" and stopped there. Pass 2 says "X is configured as Y; here is what that produces when the system runs; here is what is exposed, observed, or broken as a result; here is what we don't yet know and would need to test or measure." You may now make causal connections, quantify behaviour, run the application, hit endpoints, and form evidenced findings.

**You may still not recommend fixes.** Pass 3 (Design) is for solutions. If you catch yourself writing "should", "needs to", "must", "recommend", "fix" — stop and reframe as observation or open question. "The deploy sets `NODE_ENV=development`, which causes the production pool options branch in `mongodb-storage-service.ts:9` to be unreachable in deployment; observed log level at runtime would therefore be `debug`" is Explore. "We should set `NODE_ENV=production`" is Design.

The boundary you are holding: **claims about cause and effect, severity-in-context, and observed vs. intended behaviour are in scope. Prescriptions are not.**

You may make changes to the working tree *temporarily for investigation* (e.g. add a log line, run the server, hit a URL) but **commit nothing**. Reset any working-tree changes before producing the report.

---

## What to produce

A single markdown report at `/audit/pass-2-explore.md` in the repo, organised as ten thread sections plus a synthesis section.

Each thread section follows the same internal structure:

1. **What Pass 1 surfaced** — one-paragraph summary of the relevant discovery findings, with file:line references back to `pass-1-discover.md`.
2. **What Explore investigated** — what you actually did: commands run, endpoints hit, files read in depth, branches traced, hypotheses tested. Show the evidence, not just the conclusion.
3. **What we now know** — the evidenced finding(s). Causal where you can demonstrate cause; correlational where you cannot. Quantify where possible (request counts, byte sizes, latencies, log volumes, query plans).
4. **What we still don't know** — open questions the investigation could not answer from inside the repo. Be specific about what would be required to answer them (Mongo Atlas access, GCP console access, production logs, a load test, etc.).
5. **Confidence** — `High` / `Medium` / `Low` on the central finding(s), with a one-line justification.

Use neutral language throughout. Never say "good" or "bad" — say "this produces X, which means Y is observable / unobservable / exposed / unexposed / reachable / unreachable."

---

## The ten threads

The threads below were selected because Pass 1 raised them most actively. Investigate each in the order given — earlier threads sometimes inform later ones (e.g. Thread 1's answer affects how Thread 2 should be measured).

---

### Thread 1 — The port mismatch

**Pass 1 finding:** App binds to port `5001` (`src/index.ts:20`). Cloud Run probes port `8080` by default. No `PORT` environment variable handling. The deploy step does not set `--port`. Dockerfile has no `EXPOSE`. (Pass 1 §11.4, §14.)

**Explore:**
- Trace every line of `src/index.ts` that decides which port to bind. Is `process.env.PORT` read anywhere? Is the binding constant truly `5001` or is there a fallback?
- Inspect `cypress.config.ts` — `baseUrl: "http://localhost:5001/api/v1"`. This confirms local intent. What does the Cloud Run service config (visible in the deploy workflow or Dockerfile) actually expose?
- Determine empirically whether the deployed service is reachable. Ask Matt for the production URL if it is not in the repo. If reachable, the port resolution is happening somewhere — find it (Cloud Run buildpack auto-detection? An older Dockerfile? A manually-edited service revision?).
- If not reachable, document that the deployed service may be in a perpetual failed-health-check state.

**Specifically answer:**
- Is the central-query API currently serving traffic in production?
- If yes, by what mechanism does port `5001` reach a Cloud Run probe expecting `8080`?
- If no, what evidence supports that conclusion?

---

### Thread 2 — `NODE_ENV=development` in production cascade

**Pass 1 finding:** Deploy workflow line 49 sets `NODE_ENV=development`, overriding Dockerfile's `production`. (Pass 1 §11.3, §11.5.)

**Explore:**
- Enumerate every code path that branches on `NODE_ENV`. Pass 1 found at least: `mongodb-storage-service.ts:7`, `logger.ts:12`, `server.ts:44` (morgan). Re-grep to be sure none are missed (`grep -rn "NODE_ENV" src/`).
- For each branch, document what executes when `NODE_ENV=development` vs. what executes when `NODE_ENV=production`, and which branch runs in the deployed service.
- Quantify the deltas where possible:
  - Mongo pool: configured `maxPoolSize: 50` vs. driver default (currently 100 in driver v6). Document.
  - Log level: `debug` vs. `warn`. Count `Logger.debug` invocations per request path (Pass 1 §14 says ~6 per `getMeetings` call — verify and itemise).
  - Morgan: active vs. not. Format used.
- For the Mongo pool branch specifically: trace what `w: "majority"` and `wtimeoutMS: 2500` would change vs. driver defaults. Document the observable difference in write durability and timeout behaviour. (Note: this is a read-only API, so the write-concern setting may have limited effect — confirm.)
- Estimate log volume at 25–30K visitors/day:
  - Assume an average request fires the `getMeetings` controller path (most expensive).
  - Multiply Pass 1's observed debug calls per request by daily traffic.
  - Multiply by average log line size (measure on a sample of `logs/all.log` if present).
  - Express as MB/day and as Cloud Logging ingestion volume.

**Specifically answer:**
- Which exact code branches differ between the intended production config and the actual deployed config?
- What is the estimated daily log volume in MB and in Cloud Logging cost terms?
- Is `morgan("dev")` writing to stdout in Cloud Run, and if so what does Cloud Logging do with that?

---

### Thread 3 — Auth posture and exposure surface

**Pass 1 finding:** All authentication middleware is commented out (`meetings.route.ts:4-15`, `events.route.ts:4-15,25-41`); referenced files (`TokenMiddleWare`, `AuthorizationMiddleware`, `verifyFieldsErrors`) do not exist on disk. `cors()` uses wildcard origin. No rate limiting. `--allow-unauthenticated` on Cloud Run. Body parser limit is `50mb`. (Pass 1 §7, §11.2, §12.4–12.6.)

**Explore:**
- Use `git log -p src/meetings.route.ts src/events.route.ts -- '*Middleware*'` (or equivalent) to determine whether the middleware files ever existed in the repo's history. If they did, capture the most recent version. Document the commit SHA, date, and author.
- If the middleware never existed in repo history, document that. The commented imports are then aspirational rather than removed.
- Determine the full exposure surface as deployed:
  - Public Cloud Run URL with `--allow-unauthenticated`.
  - All endpoints from Pass 1 §4, callable by any client.
  - Request body limit 50 MB despite no POST/PUT routes — document what happens if a client sends a 50 MB body to a GET (Express behaviour with body on a GET method).
  - `cors()` wildcard — any browser-origin can call the API.
  - No rate limiting — quantify what one client can do (concurrent requests per Cloud Run instance, Cloud Run defaults max 100 instances × 80 concurrency = 8,000 concurrent in-flight before hard limit).
- Inventory the data exposed by each endpoint. From `cypress/fixtures/meetings.json`, sample what fields a `bySlug` response contains. Identify any fields that could be considered sensitive (`conference_url_notes` containing passwords; `email`; `phone`).
- Compare to the source data steward (Code for Recovery / OIAA): is this data already publicly available elsewhere, or does central-query expose it more broadly than its origin?

**Specifically answer:**
- What can an unauthenticated caller currently do against the deployed API?
- What sensitive fields, if any, are returned in responses?
- Has the auth middleware ever existed in this repo, or was it always a placeholder?

---

### Thread 4 — Error path correctness

**Pass 1 finding:** Custom error classes defined but never thrown (§8.1). `next()` is called with no argument on bySlug not-found and relatedGroupInfo not-found (§8.4 lines 126, 145). `next(val)` is called with the `Err` object itself, not `val.error` (lines 109, 161). The alternative `ErrorProblemMappingStrategy` exists but is unused (§8.2). (Pass 1 §8.)

**Explore:**
- Run `npm run start-dev` locally with a minimal Mongo setup (or in-memory equivalent if practical). Hit each endpoint with inputs designed to trigger each error path:
  - `GET /api/v1/meetings/does-not-exist` (slug not found)
  - `GET /api/v1/meetings/does-not-exist/related-group-info` (slug not found)
  - `GET /api/v1/meetings?start=garbage` (malformed temporal param)
  - `GET /api/v1/meetings?hours=999` (out-of-range, if any range check exists)
  - `GET /api/v1/meetings?limit=abc` (non-numeric)
  - `GET /api/v1/meetings` with no Mongo connection (simulate by stopping Mongo mid-request, if feasible)
  - `GET /api/v1/nonexistent` (404 catch-all)
- For each, capture the **actual** HTTP status, response body, and `Content-Type` header. Quote them verbatim.
- Map each observed response back to the code path: which mapper (if any) ran, which controller branch produced it, did it pass through `DefaultMappingStrategy` or fall through to Express default.
- Compare observed responses to what the registered mappers in `server.ts:56-61` claim to produce (RFC 7807 problem documents). Document mismatches.
- Specifically test the `next(val)` vs `next(val.error)` distinction: when the value passed to `next()` is an `Err` wrapper object, what does `http-problem-details` do with it? Read the library source if needed.

**Specifically answer:**
- For each error path, what does the API actually return today?
- Does any custom error class ever reach the mapper chain?
- If a request triggers a not-found, what status and body does the client receive?

---

### Thread 5 — The view-definition gap

**Pass 1 finding:** 12 distinct Mongo view names referenced in code. Zero aggregation pipelines defined in the repo. The one pipeline in `README.md:130-278` references a different view name (`meeting-view`) than the code uses, and contains a Slack URL embedded inside its JSON at line 138. (Pass 1 §5.2.)

**Explore:**
- Quote each view name in code (Pass 1 §5.1 already has this) and document the queries run against each — i.e. what *shape* each view must return to satisfy the code.
- For each view, derive the minimum field set the code reads from the view's output. (E.g. `combined.findOne({ slug })` followed by `.types`, `.languages`, etc. — so the view must yield those fields.)
- Inspect the README's `meeting-view` pipeline despite the JSON corruption. Document:
  - Source collection
  - `$lookup`s performed
  - Computed fields produced (`rtc`, `timeUTC`, etc.)
  - How a name discrepancy might be reconciled (is `meeting-view` an older name for `combined-meetings`? Does the README predate a code refactor?)
- Search git history for any commit that mentions view creation, aggregation, or Compass. Capture the most informative commit message.
- Document the recovery story: if the Mongo views were dropped tomorrow, what would it take to recreate them from this repo alone? Be specific about what is and is not recoverable.

**Specifically answer:**
- What is the minimal contract each view must satisfy for the code to function?
- Is the README pipeline a recoverable definition, or is it too corrupted / out-of-date?
- Where do the actual view definitions live, and who can access them?

---

### Thread 6 — Query performance and index posture

**Pass 1 finding:** No `createIndex` calls in `src/`. `pipelineFromQuery` builds `$match` on `rtc` (range), `types` (`$all`), `languages` (`$in`), and `name` (case-insensitive `$regex`). (Pass 1 §5.3.)

**Explore:**
- For each endpoint, enumerate the Mongo operations performed:
  - `getMeetings`: `aggregate(pipeline)` on `scheduled-meetings` / `unscheduled-meetings` / `combined-meetings`
  - `bySlug`: `findOne({ slug })` on `combined-meetings`
  - `getRelatedGroupInfo`: `findOne({ slug })` then `findOne({ _id })` on `group-view` then `find({ groupID })` on `scheduled-meetings`/etc.
  - `getFacets`: full scan of `unique-types-*` and `unique-languages-*`
- Read `pipelineFromQuery` end to end. Document the maximum complexity of the `$match` it can produce (number of `$or` branches, regex anchoring, case sensitivity).
- For the `name` regex specifically: is it anchored (`^`)? Case-sensitive? What does `makeQuoteFlexibleRegex` produce for a typical search like `"Big Book Study"`?
- Note that views in MongoDB do not support indexes directly — they inherit from the underlying collection. Document this constraint. The implication is that any indexing must be on the source collection(s), and the views' aggregation must be index-aware (`$match` early, before `$lookup` etc.).
- Estimate request volume per endpoint at 25–30K visitors/day:
  - Assume the homepage of OIAA (or whatever frontend consumes this) calls `getMeetings` on every page load.
  - Estimate other endpoint distribution.
  - Convert to queries-per-second peak (assume 4× average for daily peak).
- Without Mongo Atlas access, identify what cannot be answered from inside the repo and what would need to be measured against the real database.

**Specifically answer:**
- For a typical `GET /api/v1/meetings?start=...&hours=24&name=big%20book` query, what does the resulting Mongo pipeline look like in full?
- Without indexes on the source collection, what is the expected collection scan size on a database of N meeting documents?
- What is the queries-per-second peak this API should be designed to absorb?

---

### Thread 7 — The test deception

**Pass 1 finding:** 4 of 16 Jest suites fail at suite-load due to missing `MONGO_DB_NAME` in `testEnv/setup.ts`. `npm test` reports "68 passed, 68 total" but exits with failure status. CI does not run tests — the deploy workflow only builds and deploys. (Pass 1 §10.5, §14.)

**Explore:**
- Run `npm test` and capture the full output, including exit code (`echo $?`). Document whether the "68 passed" headline is accompanied by a failure indicator that a reader would notice.
- Inspect `testEnv/setup.ts` to confirm `MONGO_DB_NAME` handling. Determine the minimum change required for the 4 failing suites to pass (do not make the change — just identify it).
- Trace why those 4 suites fail at suite-load while the other 12 do not. The discovery hypothesises it's because the 4 import `mongodb-storage-service.js` which triggers top-level `await`. Verify this by reading each spec's imports.
- Confirm Pass 1's claim that the CI workflow runs no tests. Re-read `.github/workflows/deploy-cloudrun.yml` end to end. Check for any pre-deploy validation step.
- Identify any other places where a test-like signal might be misleading:
  - Cypress: `cypress/support/commands.ts` template comments — is anything in `support/e2e.ts` doing anything?
  - Coverage report claim in README (100%) vs. measured (89.79% functions, 77.94% branches).
- Examine the `Logger.error` calls in error paths. Are any of those error paths reachable from the passing 68 tests, or do the tests only exercise happy paths?

**Specifically answer:**
- What is the real test pass/fail status, surfaced unambiguously?
- What stops CI from catching test failures today?
- How much of the actual production code path is covered by tests that pass?

---

### Thread 8 — Logging and PII exposure

**Pass 1 finding:** `Logger.info` JSON-stringifies the full meeting object on `bySlug` returns (`meetings.controller.ts:122`). Fixture meeting records contain `conference_url_notes` fields holding raw passwords. Log level is `debug` in deployed Cloud Run. Logs land in stdout (Cloud Logging) and on the container filesystem (`logs/all.log`, `logs/error.log`). (Pass 1 §8.5, §9.1, §9.2, §12.7, §14.)

**Explore:**
- Read `src/common/logger.ts` end to end. Document the format string and confirm whether request context (path, method, IP, user agent) is ever added.
- Inventory every `Logger.info`, `Logger.debug`, `Logger.error`, `Logger.warn` call in `src/`. For each, document:
  - What is logged (literal string? interpolated value? full object via `JSON.stringify`?)
  - Whether the logged content can include data sourced from a Mongo document
  - Whether that document type can contain sensitive fields per the fixture sample
- Quantify potential PII surface:
  - Fixture has 16 documents with `conference_url_notes` containing passwords (Pass 1 §12.7).
  - Frequency of `bySlug` calls in expected traffic (assume some fraction).
  - Volume of log lines per day that include full meeting objects.
- Document log destination behaviour:
  - `logs/error.log` and `logs/all.log` on the container filesystem — these are ephemeral in Cloud Run (lost on instance teardown). Note this.
  - Cloud Logging — stdout/stderr is captured by GCP Cloud Logging. Note default retention and access controls (these may require GCP console access to verify exactly; document what is and is not knowable from the repo).
- Search for any redaction logic. Confirm none is present.

**Specifically answer:**
- What sensitive fields, sourced from production-shaped data, would be written to logs under normal operation?
- Where do those logs end up, and for how long are they retained?
- Is there any code path that redacts or transforms log output before it is emitted?

---

### Thread 9 — Dependency drift

**Pass 1 finding:** Several major-version-behind dependencies, notably `ts-results-es` (4 majors), `@types/node` (5 majors), MongoDB driver (1 major), Helmet (1 major), Cypress (1 major), ESLint (2 majors), `@typescript-eslint/*` (2 majors), `dotenv` (1 major). (Pass 1 §3.1.)

**Explore:**
- Run `npm audit` (capture full output, including JSON form via `npm audit --json` if needed) and document every vulnerability by severity and package.
- For each major-version-behind dependency, document the breaking changes between installed and latest:
  - Read the package's CHANGELOG or release notes (web fetch if needed).
  - Identify which breaking changes the codebase actually uses.
  - Note any deprecation warnings emitted when running `npm test` or `npm run build`.
- For `ts-results-es` 3.6.1 → 7.0.0 specifically: this is the deepest drift. Document what the API surface changes look like across those four majors, and how heavily the codebase uses the affected APIs.
- For the MongoDB driver 6 → 7: read the migration guide. Identify any compatibility issues with current Mongo Atlas server versions.
- For Helmet 7 → 8: identify any default-header changes (especially CSP).
- For Node `@types` 20 → 25: identify any Node runtime version dependencies this implies (the deployed runtime is Node 20.5.1 per Dockerfile).
- Document the working tree's `package-lock.json` vs. `npm install` consistency: run `npm install --dry-run` and document any diff.

**Specifically answer:**
- Are there any active CVEs in current dependencies? Quote `npm audit` output verbatim.
- What is the realistic blast radius of catching up each major-version-behind dependency?
- Are any deprecation warnings emitted at runtime today?

---

### Thread 10 — Graceful shutdown and request lifecycle

**Pass 1 finding:** `mongoClient.close()` only on `app.listen` failure (`src/index.ts:31`). No SIGTERM / SIGINT handler. (Pass 1 §14.)

**Explore:**
- Read `src/index.ts` end to end. Document the full process lifecycle: startup sequence, listen, ongoing handling, shutdown behaviour.
- Document Cloud Run's instance lifecycle: how SIGTERM is sent on scale-down or revision rollover, the grace period (default 10 seconds), what happens to in-flight requests.
- Simulate locally if practical: start the dev server, fire a long-running aggregation, send SIGTERM. Observe behaviour. Document.
- Trace what happens to an in-flight `getMeetings` aggregation when the process is killed mid-flight:
  - Express request handler is interrupted
  - Mongo driver connection is not closed cleanly
  - Client sees connection reset
  - Mongo `aggregate` cursor may persist briefly server-side
- Document the absence of `dumb-init`'s signal-forwarding role: Dockerfile uses `dumb-init` (`Dockerfile:24`), which *does* forward SIGTERM correctly to the Node process — but the Node process has no handler for it. Confirm.
- Identify any related lifecycle concerns:
  - Is there a max instance startup time concern? (Top-level `await` for Mongo connection means cold start blocks on Mongo connect.)
  - Connection pool warm-up on cold start.

**Specifically answer:**
- What happens to an in-flight request when Cloud Run terminates the instance?
- What is the expected cold-start latency, given the top-level `await` Mongo connection?
- Does `dumb-init` provide any meaningful behaviour given the lack of a Node-side signal handler?

---

## Synthesis section

After all ten thread sections, add a final synthesis section titled **"Patterns across threads"**. This is short (1–2 pages maximum) and does **not** introduce new findings. It identifies cross-cutting patterns the ten threads have surfaced together — for example:

- The "aspirational architecture" pattern: machinery that exists but receives no traffic (custom errors, mappers, commented middleware).
- The "production isn't production" pattern: every signal that the deployment is configured as development.
- The "out-of-band state" pattern: Mongo views, GCP Secret Manager secrets, prior commit history — things essential to running the system but not represented in the repo.
- The "load profile vs. configured surface" pattern: every place expected traffic exceeds the configured headroom.

Identify 3–6 such patterns. For each, list which threads contributed evidence. **No recommendations** — Pass 3 will derive briefs from these patterns.

---

## How to work

1. Read `audit/pass-1-discover.md` end to end before starting any thread.
2. Work threads in numerical order. Thread 1 first (because it asks "is this thing actually running?", which conditions all other threads).
3. Each thread gets its own section with the five sub-headings above. Do not skip "What we still don't know" — gaps in evidence are themselves findings.
4. Quote file paths, line numbers, command output, HTTP responses verbatim. Where you ran the application, capture the literal terminal/server output.
5. If a thread requires resources you don't have (Mongo Atlas access, GCP console, production logs, a live load test), document precisely what would be needed under "What we still don't know". Do not invent data.
6. Do not commit anything. Reset any working-tree changes before saving the report.
7. Save the report to `/audit/pass-2-explore.md` and stop. Do not begin Pass 3. Do not write recommendations.

---

## The discipline reminder

If at any point in writing this report you find yourself reaching for "should", "needs", "must", "recommend", "fix", "the right way is" — that's Pass 3 leaking in. Reframe as observation:

- ❌ "We should set `NODE_ENV=production`."
- ✅ "Setting `NODE_ENV=production` would make the production pool options branch reachable; the deployed value of `development` makes that branch unreachable today."

- ❌ "The bySlug endpoint needs to redact passwords from logs."
- ✅ "When a `bySlug` response is JSON-stringified into the info log line and the meeting record contains a `conference_url_notes` field with a password, the password is written to `logs/all.log` and Cloud Logging stdout."

Observation describes the world; prescription proposes change. Pass 2 stays in observation. Pass 3 — only Pass 3 — proposes change.

---

*Pass 3 (Design) will begin when Matt has reviewed this report and is ready.*
