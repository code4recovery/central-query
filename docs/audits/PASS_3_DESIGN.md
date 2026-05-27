# Central-Query Audit — Pass 3: Design

**Repository:** central-query
**Audit framework:** TrustTech 3 Pass Audit (Discover → Explore → Design)
**Predecessors:**
- [`docs/audits/PASS_1_DISCOVERY.md`](./PASS_1_DISCOVERY.md) — the factual map
- [`docs/audits/PASS_2_EXPLORE.md`](./PASS_2_EXPLORE.md) — the evidenced findings

---

## A note before the briefs

Tim,

Matt asked me to run the 3 Pass Audit on central-query because you're getting ready to point real OIAA traffic at it and you wanted a second set of eyes on the system before that happens. You said yes to the audit, which is the hard part — most people don't ask for this kind of look before launch, and most systems are worse for it.

A few things I want to say up front, before any of the recommendations land.

**Central-query is a real piece of software that already works.** It serves real OIAA data over real HTTP today. The time-window logic with cross-day and weekly wrapping is thoughtful work that handles edge cases most APIs get wrong. The `rtc` abstraction is genuinely clever — collapsing weekday-plus-time into a single sortable string lets MongoDB do range queries against it cheaply, which is the kind of design choice that pays off at scale. The categorization taxonomy in `common/types.ts` is well-structured and the way it flows through both `pipelineFromQuery` and `categorizeMeeting` shows you thought carefully about the data flow. The ts-results-es pattern through services and controllers is a clean way to handle the success/failure split without exception-throwing chaos. These aren't faint praise — they're load-bearing parts of a working system and they earned their place.

**The system was built for one purpose and is being asked to do another.** You built central-query as a proof of concept, by your own description. The audit is calibrated for the system it's about to become — a public-facing API serving 25-30k people a day, replacing a JSON-file architecture that's hit its scaling limit. Those are different requirements, and the gap between "what was built for" and "what is now being asked of it" is where most of the audit's findings live. None of those findings are *failures*; they're *the natural shape of a transition* between purposes.

**This is volunteer-built infrastructure with one professional developer in the org.** Pass 3 will not recommend rewriting anything, will not recommend tooling that requires a paid SaaS subscription, will not recommend processes that need a full-time SRE to maintain. Every brief is sized to evening-and-weekend volunteer time, with the smallest set of changes that achieve the goal. Where the brief includes "nice to have eventually" items, they're labelled as such.

**Pass 1 and Pass 2 deliberately did not propose solutions.** That discipline is what makes the recommendations in Pass 3 trustworthy — every recommendation is anchored in two passes of evidence, not in priors about how things "should" work. If something didn't show up in Pass 1 or Pass 2, it's not in Pass 3. You should be able to trace every "do this" back to a specific finding with file:line references.

**How to read this document.** The briefs are organised by *when*, not by *how serious*. Pre-launch briefs are the ones that change the answer to "is the system ready for 25-30k/day?" Early-ops briefs are the ones that change the answer to "will we know if something goes wrong?" Long-term briefs are direction-setting — they make the next person who inherits the codebase not have to do the same archaeology.

Each brief follows the same shape: situation → what changes if we do nothing → the proposed work, sized → cost (effort, complexity) → how we'd know it worked.

Take what's useful. Push back on what isn't. Matt and I are both volunteers in this too — we want the launch to succeed, and we want OIAA-Direct to be the win that finally retires the JSON-file architecture. None of this is a graded paper.

— Claude (with Matt)

---

## Summary of briefs

### Pre-launch (do before pointing OIAA-Direct traffic at this)

1. **Stop the crash-on-malformed-input class of bug.** The `?limit=abc → NaN → MongoServerError → process exit` path needs a guard. So do the other unhandled-rejection paths Pass 2 surfaced. Single highest-impact pre-launch brief.
2. **Make the test runner honest.** `MONGO_DB_NAME` belongs in `testEnv/setup.ts`, and CI should actually run the tests before a deploy happens. One-line code fix, plus a small workflow addition.
3. **Add input validation at the boundary.** A thin layer of coercion-with-bounds in front of the controllers prevents most of the Thread 4 findings at once. Doesn't require introducing zod or a new dependency.
4. **Add rate limiting in front of the API.** With auth out of scope for now (see Brief 11), nginx-level rate limiting is the proportionate control. Configured on the Vultr host, not in the code.
5. **Unblock the failing Cloud Run deploys.** Tim is currently debugging why Cloud Run revisions never go healthy; Pass 1 §11.4's port mismatch (app binds 5001, Cloud Run probes 8080, no `PORT` env var, no `--port` flag) is almost certainly the cause. Two small changes make the deploys land.

### Early operations (first 30-60 days of live traffic)

6. **Trim the logging noise and the PII-in-logs path.** The volume isn't the problem; the content is. Stop JSON-stringifying full document objects into `info`-level logs. Keep the debug logs but make them safe.
7. **Add a health endpoint and basic observability.** A `GET /api/v1/health` route plus a few process-level signals (uptime, last DB ping, restart count) make it possible to *know* when the system is degraded.
8. **Capture the Mongo view definitions in the repo.** Either as a documented JSON file checked in, or as a migration script. The current state — definitions only in Compass on your laptop — is the single biggest "what if Tim got hit by a bus" risk in the system.
9. **Wire up graceful shutdown.** A SIGTERM handler that closes the Mongo connection and lets in-flight requests finish. Small code change, large behavioural improvement.
10. **Catch up the dependencies that matter.** Not all of them — the ones with security advisories that actually reach the request path. Pass 2's audit list filters down to a manageable set.

### Long-term direction (next 6-12 months, as time allows)

11. **The auth conversation.** Not "add auth" — *whether to add auth*, what it would protect, what it would cost in friction for OIAA-Direct. The audit doesn't decide this; it surfaces the question.
12. **Document the deployment topology.** A single `docs/DEPLOYMENT.md` that captures what runs where, who has access, and how to do a clean recovery. Pass 2 had to investigate this from outside; the next person shouldn't have to.
13. **Consider the events resource and the aspirational architecture.** Pass 1 found a lot of code that exists but does nothing. Some of it can come out; some of it can stay as scaffolding for future work. Worth deciding which.

---

## Pre-launch briefs

### Brief 1 — Stop the crash-on-malformed-input class of bug

**Situation.** Pass 2 Thread 4 reproduced this locally and confirmed the production symptom: `GET /api/v1/meetings?limit=abc` causes `parseInt("abc") → NaN`, which propagates through `getMeetings` into `{ $limit: NaN }` in the Mongo pipeline. The driver throws a `MongoServerError`, the throw becomes an unhandled rejection inside the `async` controller, and Node's default unhandled-rejection behaviour in Node 20 terminates the process. Production currently returns nginx 502 for this request, which means nginx sees the upstream Node connection close mid-response.

Some process supervisor on the Vultr host is restarting Node after each crash, so the service appears to keep working — but every crash drops all in-flight requests on that instance, and the symptom is observable only as occasional nginx 502s with no signal back to anyone watching.

There are at least two other paths in the same shape:
- `?start=garbage` doesn't crash (it produces a silent empty result, which is its own issue covered in Brief 3), but anything that flows malformed numbers into `$limit` or `$skip` (Mongo doesn't currently accept `$skip` but the pattern is the same) will.
- `meetings.controller.ts:84` casts `req.query.limit as string | undefined`, but Express returns `string | string[] | undefined` for repeated query keys. A request with `?limit=10&limit=20` makes the cast a lie and the same NaN propagation can happen via `parseInt(["10","20"])`.

**What changes if we do nothing.** At 25-30k visitors/day, with no auth and no rate limiting, this is trivially scriptable. Anyone curious enough to send `?limit=abc` 10 times a second can hold the service in a perpetual restart loop. Even without malicious intent, it'll happen — bots scanning the API will send malformed inputs; a buggy frontend deploy will send bad params; a debugging session by a volunteer will trip it. The system needs to not die when this happens.

**The proposed work, sized.**

Two changes, both small.

*(a) Add a top-level unhandled-rejection handler in `src/index.ts`.* This is a Node hygiene measure independent of the specific bugs. Something like:

```ts
process.on("unhandledRejection", (reason) => {
  Logger.error(`Unhandled rejection: ${reason instanceof Error ? reason.stack : reason}`)
  // do not exit — log and continue
})
```

Node's default behaviour of terminating on unhandled rejection was a deliberate change made to surface bugs. In a production service, surfacing the bug should be a log line, not a process death. This single handler stops the *crash* even before the underlying bug is fixed.

*(b) Coerce-with-bounds at the boundary.* In `meetings.controller.ts`, replace the implicit `parseInt(rawLimit)` with a guarded version:

```ts
const parseIntOrDefault = (raw: unknown, fallback: number, min: number, max: number): number => {
  const s = Array.isArray(raw) ? raw[0] : raw
  const n = typeof s === "string" ? Number.parseInt(s, 10) : NaN
  if (!Number.isInteger(n) || n < min || n > max) return fallback
  return n
}
```

Used as `parseIntOrDefault(req.query.limit, 1000, 1, 1000)`. Same pattern for `hours` (currently unbounded — `?hours=999` is what produced Thread 6's 65-second timeout). A sensible upper bound for `hours` is 168 (the existing weekly-range value).

**Cost.** Maybe 30 lines of code total, plus tests. 2-3 hours including writing the tests. No new dependencies, no architectural change.

**How we'd know it worked.** A Jest test that fires each of Pass 2 Thread 4's probe URLs against the service and verifies (a) Node doesn't exit, (b) the response is a sensible error code (400 with a problem-document body, ideally), not a crash. These tests then run in CI per Brief 2.

---

### Brief 2 — Surface the four storage-suite load failures and gate deploys on tests

**Situation.** Pass 2 Thread 7 confirmed Pass 1's finding: `npm test` reports "Tests: 68 passed, 68 total" while four test suites silently fail at suite-load because `testEnv/setup.ts` sets `MONGO_URI` but not `MONGO_DB_NAME`. Exit code is 1, but the green "68 passed" line is what catches the eye. The four failing suites are the storage layer specs — the ones that exercise the Mongo connection code, which is exactly where most of the production complexity lives.

Compounding this, the deploy workflow runs no tests at all. Code goes from `git push` to Docker build to Cloud Run deploy with no unit-test gate, no Cypress gate, no `tsc --noEmit` gate. The only thing that can fail the deploy is a TypeScript compile error (because that fails the Docker build).

**What changes if we do nothing.** The new tests added in Brief 1 don't catch regressions if nobody runs them. The existing 68 (really 82) passing tests don't catch regressions if nobody notices when they break. Bugs that the test suite *would* catch ship to production.

**The proposed work, sized.**

*(a) Fix `testEnv/setup.ts`.* One line added:

```ts
process.env.MONGO_DB_NAME = dbConfig.Database
```

before the storage module is first imported anywhere. Pass 2 traced the exact mechanism — the top-level `await` in `mongodb-storage-service.ts` reads the env var at module load time, which is why all four storage specs fail at suite-load and the others don't.

*(b) Add a test step to the deploy workflow.* In `.github/workflows/deploy-cloudrun.yml` (or in a new workflow that runs on PR), before the Docker build step:

```yaml
- name: Install dependencies
  run: npm ci
- name: Run tests
  run: npm test
- name: Type check
  run: npx tsc --noEmit
```

If tests fail, the deploy doesn't happen. This is the minimum CI gate.

*(c) Optional but cheap: add a coverage floor.* Jest's `coverageThreshold` can fail the test run if coverage drops below a set point. Setting it to current levels (around 95% statements, 78% branches per Pass 1 §10.5) prevents accidental regression without forcing anyone to chase a higher number.

**Cost.** Maybe 45 minutes including testing the workflow change. The `.env.example` file Pass 1 noted as missing could go in at the same time (10 minutes), documenting the variables that need to be set.

**How we'd know it worked.** `npm test` reports 16 passed suites, 82 passed tests, exit 0. CI fails a PR that includes a test regression. A `cat .env.example` shows new contributors what env vars to set.

---

### Brief 3 — Add input validation at the boundary

**Situation.** Pass 2 Thread 4 confirmed Pattern D from Pass 2: inputs arrive at the API boundary and flow inward without coercion checks. `?start=garbage` becomes a string "garbage" which becomes a Luxon `Invalid DateTime` which becomes the string `"NaN:Invalid DateTime"` which becomes a Mongo `$match` bound that quietly matches nothing — returning `200 []` to the client and giving them no signal that their request was malformed.

This is a *silent* failure mode, which is worse than a noisy one. A user (or frontend developer) sending `?start=garbage` should get a clear "this isn't a valid ISO date" response, not an empty list.

Similarly, `?hours=999` produces a 42-day temporal window, which (per Thread 6) the source collection can't service in less than 60 seconds. The client gets nginx 504. A bounded `hours` parameter (the existing weekly-range value of 168 is a sensible ceiling) prevents the abuse path *and* the accidental-user-typo path.

The `?formats=`, `?features=`, `?languages=`, `?communities=` parameters accept any string and pass it through. The const tuples in `common/types.ts` are the source of truth for valid values — but nothing checks against them at the boundary. Sending `?formats=XYZ` produces `{ types: { $all: ["XYZ"] } }` which matches nothing. Silent failure again.

**What changes if we do nothing.** The system continues to give wrong-shaped answers to wrong-shaped questions, with no signal back to the caller. Frontend bugs in OIAA-Direct get debugged by hand against the API. Anyone integrating against the API has to discover the valid value space by trial and error.

**The proposed work, sized.**

A small validation layer in a single new file, `src/utils/validateQuery.ts`, that produces typed-and-validated query params or a clear error. The shape is something like:

```ts
type ValidatedMeetingQuery = {
  start: DateTime
  hours: number   // bounded [1, 168]
  limit: number   // bounded [1, 1000]
  formats?: Format[]   // checked against FORMATS tuple
  features?: Feature[]
  communities?: Community[]
  type?: MeetingType
  languages?: string[]   // any 2-char ISO code
  nameQuery?: string     // bounded length
  scheduled: boolean
}

const validate = (q: Express.Query): Result<ValidatedMeetingQuery, ValidationError> => { ... }
```

When validation fails, the controller throws (or returns `Err`) `ReqParamFormatError` — the custom error class that already exists in `src/common/custom_errors/` and is currently never used. The error mapper chain that already exists in `server.ts:56-66` then turns it into the right RFC 7807 response.

This brief is doing two things at once: adding the validation, *and* finally connecting the unused error-class machinery to actual traffic. Pass 2's "aspirational architecture" pattern gets reduced by one item.

No new dependencies needed. The validation is hand-rolled — for a 4-parameter API it's not worth introducing zod, and the const tuples already provide the value enumeration. If the API surface grows significantly, that decision can be revisited.

**Cost.** Probably 4-6 hours. ~80 lines of validation code, ~80 lines of tests, controller refactor to use it. The most time-consuming part is writing the tests for the validation cases, which is also the part that matters most.

**How we'd know it worked.**
- `?start=garbage` returns 400 with a problem-document body explaining the parameter was malformed.
- `?hours=999` returns 400 saying the hours parameter is out of range.
- `?formats=XYZ` returns 400 listing the valid format codes.
- Pass 2's silent-empty-result probes all produce loud errors instead.
- `ReqParamFormatError` is now thrown in the codebase and the existing mapper fires for it.

---

### Brief 4 — Add rate limiting in front of the API

**Situation.** Pass 2 Thread 3 confirmed: no rate limiting anywhere in the stack the audit can see. With auth off the table for the immediate term (see Brief 11), and with the dataset being public-by-design, the proportionate control is rate limiting — preventing any single client from holding the service in a degraded state by sending requests faster than it can serve them.

Brief 1's crash fix and Brief 3's validation reduce the *cost* of an abusive request. But neither of them limits the *rate* of requests, and at 25-30k visitors/day on a single Vultr VM, the headroom isn't large.

**What changes if we do nothing.** A misbehaving frontend, an aggressive web scraper, or a single bad actor can saturate the service. Even after Briefs 1 and 3, a fast loop of valid-but-expensive requests (`?hours=168&nameQuery=a` for example, which is a substring match against every meeting in a weekly window) can occupy all of nginx's upstream slots.

**The proposed work, sized.**

Rate limit in nginx, not in the Node app. Reasons:
- nginx is already there, terminating TLS and forwarding to Node. Adding `limit_req` directives is configuration, not code.
- nginx rejecting requests at the front door is cheaper than Node accepting them and refusing.
- It works without redeploying the application.
- It doesn't require introducing a new dependency (`express-rate-limit` works, but adds a runtime dep and only protects per-instance — which on a single Vultr VM is the same, but the pattern doesn't generalise).

The nginx config addition looks roughly like:

```nginx
http {
  limit_req_zone $binary_remote_addr zone=cqapi:10m rate=10r/s;

  server {
    location /api/ {
      limit_req zone=cqapi burst=20 nodelay;
      limit_req_status 429;
      proxy_pass http://localhost:5001;
      # ... existing config
    }
  }
}
```

The numbers above are starting points, not gospel. 10 requests/second per IP with a 20-request burst gives a typical user enormous headroom (a user fetching a page maybe makes 2-5 requests, well under the burst) while preventing a single client from sustaining hundreds of requests per second. The numbers can be tuned once we have real traffic data.

The brief depends on nginx config access on the Vultr host — Tim has SSH there per Matt's note.

**Cost.** Maybe an hour for the config change and testing it. Test by `ab` or `wrk`-ing the local nginx and confirming 429s appear at the threshold.

**How we'd know it worked.** A loop of `curl https://central-query.apps.code4recovery.org/api/v1/meetings` at 50 requests/second produces 429s after the initial burst. Legitimate frontend usage from OIAA-Direct doesn't see any 429s.

---

### Brief 5 — Unblock the failing Cloud Run deploys

**Situation.** Pass 2 Thread 1 established that production traffic doesn't currently go to Cloud Run — it goes to a Vultr VM through nginx. Pass 2 was honest about what it couldn't see from inside the repo: whether the Cloud Run workflow was producing healthy revisions or failing every time. Tim's Slack message after Pass 2 fills that gap — the Cloud Run deploys aren't sitting idle, they're failing, and he's currently working on a PR adding deploy-process debugging to find out why.

The repo evidence points to a likely cause. Pass 1 §11.4 surfaced four facts that, together, exactly explain a "deploy command succeeds but revision never goes healthy" pattern:

- The application binds to port 5001 (`src/index.ts:20`) as a hardcoded literal.
- Cloud Run health-checks probe port 8080 by default.
- The Dockerfile contains no `EXPOSE` directive.
- The deploy step does not set `--port`, and the code reads no `PORT` environment variable.

A Cloud Run deploy with those facts will pull the image, start the container, find no process listening on 8080 within the startup probe window, mark the revision unhealthy, and refuse to route traffic to it. The `gcloud run deploy` command itself returns success (the image pushes, the revision is created), but the service stays on whatever revision was last healthy — or has nothing serving at all. The symptom Tim describes — "deployment keeps failing because something isn't configured right" — is exactly that shape.

**What changes if we do nothing.** Tim's debugging PR will eventually surface this; the audit's contribution here is just shortening the path. Adding GitHub-Actions-side debugging won't reveal it on its own, because the workflow runs to completion every time — the failure is silently inside Cloud Run's health-check loop, visible only in the Cloud Run logs.

**The proposed work, sized.**

Two small changes should make Cloud Run accept the revision:

*(a) Make the listen port configurable.* In `src/index.ts:20`, replace:

```ts
const port = 5001
```

with:

```ts
const port = Number(process.env.PORT) || 5001
```

Cloud Run sets `PORT=8080` automatically when the container starts; this lets the same image bind correctly under Cloud Run while keeping the local dev default. Localdev still uses 5001 because no `PORT` is set there.

*(b) Add `EXPOSE 8080` to the Dockerfile* documenting the container's expected listen port. Not strictly required by Cloud Run but conventional, and surfaces the contract for anyone reading the image.

Optional companion: explicitly pass `--port=8080` in the `gcloud run deploy` step in `.github/workflows/deploy-cloudrun.yml:42-49` so the value lives in the workflow file rather than relying on Cloud Run's default.

**A separate question, once deploys are green.** Pass 2 Thread 1 established that the Vultr VM is currently serving production traffic. Once Cloud Run revisions are landing healthily, the question of what role Cloud Run plays going forward is worth picking up — possibilities the audit can't decide from inside the repo:

- Cloud Run becomes the new production target, eventually replacing Vultr.
- Cloud Run is a parallel test/staging environment.
- Cloud Run is the production target Tim has been working toward and Vultr is the current bridge.

Brief 12 (deployment topology) is the place to capture whichever answer is correct.

**Cost.** The port + Dockerfile change is 5-10 minutes including a local Docker test. Verifying the deploy succeeds is whatever round-trip Tim's existing PR is using.

**How we'd know it worked.** A `gcloud run deploy` produces a revision that passes its startup probe; `gcloud run services describe <SERVICE>` shows the new revision at 100% traffic; a `curl` against the Cloud Run URL returns 200 for `/api/v1/meetings?limit=1`.

---

## Early operations briefs

### Brief 6 — Trim the logging volume and shape what gets written

**Situation.** Pass 2 Thread 8 traced every `Logger.*` call in `src/` and identified six lines that JSON-stringify entire document objects into `info` or `debug` level logs. Of those, four can include `MeetingView` or `GroupView` document content. Production data sampling confirmed that meeting records routinely include `groupEmail` (20/20 in the sample), occasionally include `conference_phone`, and sometimes include `conference_url_notes` with text like `"Passcode: Email firesidemeeting2@gmail.com"`.

Matt confirmed the dataset is public by design — groups submit their meetings to be listed in the OIAA directory. So the *exposure* finding is reframed: the data being in *logs* isn't a privacy breach (the data is public anyway). The issues are:

- **Log volume.** Pass 2 measured ~21 lines per `getMeetings` request at debug level, ~48-58 MB/day at expected traffic. Most of that is debug-level noise that's useful during development and not in production.
- **Log readability.** A log line that's a 2KB JSON-stringified meeting object is hard to read, hard to search, and hard to alert on. Useful signals get drowned.
- **The "what if the dataset shape changes" risk.** If OIAA ever starts collecting a field that *is* private (say, a host's home address for hybrid meetings), it'll flow into these logs automatically because the logs stringify the whole object.

**What changes if we do nothing.** Logs accumulate. The Vultr disk fills eventually (no log rotation Pass 2 could verify). Alerting on errors gets harder because the error signal is buried in the volume. If the dataset ever does include sensitive fields, they're already in the logs by the time anyone realises.

**The proposed work, sized.**

Three changes.

*(a) Reduce production log level to `info`, not `debug`.* `src/common/logger.ts:11-15` currently does `level: NODE_ENV === "development" ? "debug" : "warn"`. Change to `"info"` in non-development. (Brief 5's decision about the Cloud Run workflow may also unblock setting `NODE_ENV=production` properly.) This single change drops the ~37 debug-level calls per request from the log stream entirely.

*(b) Replace the six `JSON.stringify(val)` log lines with shape-only equivalents.* Instead of:

```ts
Logger.info(`fetch result being returned includes ${JSON.stringify(val)}.`)
```

write:

```ts
Logger.info(`bySlug result: slug=${val.slug} groupID=${val.groupID}`)
```

Same diagnostic value — you can see which meeting was returned — without the full object dump. The fields chosen are identifiers, not content.

*(c) Set up log rotation on the Vultr host.* `logrotate` is standard on Ubuntu/Debian and ships out of the box. A `/etc/logrotate.d/central-query` entry that rotates `logs/all.log` and `logs/error.log` daily, keeps 14 days, and compresses old ones, prevents the disk from filling.

**Cost.** 2-3 hours total. The log line changes are quick; the logrotate setup is one config file plus testing.

**How we'd know it worked.**
- A `getMeetings` request produces 2-3 log lines, not 21.
- Log lines about `bySlug` results are one-line and readable.
- `logs/all.log` rotates on schedule with old files compressed.

---

### Brief 7 — Add a health endpoint and basic observability

**Situation.** Pass 2's Pattern E — "visibility without observability." The system writes thousands of log lines per day but has no way for an operator (or a monitoring tool, or a load balancer) to ask "are you healthy?" There's no `GET /api/v1/health`, no `/ping`, no `/status`. Cloud Run, nginx, and any external monitoring tool can't distinguish "alive and responding to traffic" from "process crashed five seconds ago, will be restarted in ten."

This is connected to Pass 2 Thread 4's crash finding. The system has been in a soft-failure loop, but nobody noticed because there's no signal that surfaces it.

**What changes if we do nothing.** When something goes wrong in production, the first signal is a user complaint to a volunteer. Diagnosis requires SSH access and grep-fu. The time-to-detect a problem is the time it takes for users to notice and complain.

**The proposed work, sized.**

Two pieces.

*(a) Add a `GET /api/v1/health` endpoint.* The response should be:

```json
{
  "status": "ok",
  "version": "0.16.0-alpha",
  "uptime_seconds": 12345,
  "db_connected": true,
  "db_last_ping_ms": 7
}
```

The `db_connected` field is determined by issuing a `mongoClient.db().admin().ping()` — a cheap round-trip to confirm Mongo is reachable. If the ping fails or times out (say, after 2 seconds), the status flips to `degraded` and the HTTP status code is 503. Otherwise 200.

The endpoint is not authenticated (it's a health check) and is excluded from any rate limiting (Brief 4).

*(b) Add a minimal in-process metrics struct.* Counter for total requests served, counter for errors logged, gauge for current in-flight requests, last-restart timestamp. Exposed at `GET /api/v1/metrics` (or merged into `/health` — either works). These can be read by a cron-driven script that pings the endpoint every minute and writes to a file, or by any external monitoring tool.

What this brief explicitly does NOT include:
- Prometheus / Datadog / OpenTelemetry. Those are real options but they want commitment and infrastructure that volunteer-time can't sustain. The cheap version above gets 80% of the value.
- Distributed tracing. Not needed for a single-VM monolith.
- Structured logging migration. Worth doing eventually but a separate brief.

**Cost.** 3-4 hours including tests.

**How we'd know it worked.** A cron job (or a free uptime monitoring service like UptimeRobot, which has a free tier sufficient for one endpoint check) pinging `/api/v1/health` every minute produces an alert when the response is non-200 or takes more than 2 seconds. The first crash that happens after this is in place is the first crash anyone knows about within 60 seconds.

---

### Brief 8 — Capture the Mongo view definitions in the repo

**Situation.** Pass 2 Thread 5 is the single most important finding in the entire audit and it has nothing to do with code quality. 12 Mongo views (`scheduled-meetings`, `unscheduled-meetings`, `combined-meetings`, the six `unique-*` views, `group-view`, `events-view`, and the README's mentioned-but-unused `meeting-view`) are the integration boundary between the source data and the API. None of them have their aggregation pipelines defined in the repository. The one pipeline in the README is for a name the code doesn't use, and contains a corrupted JSON block (the Slack URL embedded mid-pipeline).

These views exist in MongoDB Atlas, defined via Compass on your local machine, Tim. If your laptop goes missing, if the Atlas project gets accidentally deleted, if you ever step away from the project — there is no documented path to recreating them. The API doesn't work without them, and they aren't in source control.

This is the single-keystone risk in the system, and it's also the easiest one to fix.

**What changes if we do nothing.** The single point of failure stays in place. The next maintainer (potentially years from now) inherits a system with a missing keystone. The next time the database structure changes, the relationship between source schema and view contract has to be rediscovered by reading the application code.

**The proposed work, sized.**

Two options, in increasing order of formality.

*(a) Minimal: a `docs/views/` directory with one JSON file per view.* Export each view's pipeline from Compass (`db.getCollectionInfos({ name: "scheduled-meetings" })` returns the pipeline; or right-click in Compass → Export). Save as `docs/views/scheduled-meetings.json` etc. Commit. Add a paragraph to the README pointing at the directory. The README's existing pipeline block stays but gets a header noting "for reference; see `docs/views/` for current definitions."

*(b) Better: a `migrate/views/` directory with a script that recreates them.* Same JSON exports, but wrapped in a Node script that connects to a Mongo instance and runs `db.createCollection(name, { viewOn: ..., pipeline: [...] })` for each. The script becomes the source of truth: "this is how you spin up a fresh central-query database." Useful for setting up dev environments, useful for disaster recovery, useful for understanding what each view does.

Option (b) is more work but small-multiple — maybe 4 hours including testing the script can actually recreate the views from scratch against an empty Atlas database. Option (a) is more like 1 hour and captures 90% of the value.

What this brief explicitly does NOT include:
- Migrating to a different data store. The views work.
- Rewriting views as application code. The views are the right tool for the job.
- Versioning the views as proper migrations. That's a thing to consider eventually but not now.

**Cost.** 1-4 hours depending on which option.

**How we'd know it worked.** A new contributor with Atlas access can clone the repo, run a script (option b) or follow the README (option a), and have a working set of views against a fresh database. Tim's laptop is no longer the only place the view definitions live.

---

### Brief 9 — Wire up graceful shutdown

**Situation.** Pass 2 Thread 10 traced the shutdown behaviour: SIGTERM arrives at `dumb-init`, gets forwarded to the Node process, and because the Node process has no signal handler, it exits immediately. In-flight requests have their TCP connections reset, Mongo connections aren't closed cleanly, and any aggregation cursors on the Mongo side persist until their TTL (10 minutes default) before being cleaned up.

For Cloud Run-style deployments this happens on scale-down or revision rollover. For the Vultr deployment it happens on any process restart (which Brief 1 will make less frequent but won't eliminate — graceful shutdown is needed even for *intentional* restarts during deploys).

**What changes if we do nothing.** Every deploy drops in-flight requests. Every crash drops in-flight requests. Users occasionally see connection-reset errors that go away on refresh. Mongo accumulates orphaned cursors briefly.

The impact at current traffic is small. The impact grows with traffic and frequency of deploys.

**The proposed work, sized.**

A standard graceful-shutdown handler in `src/index.ts`:

```ts
const server = app.listen(port, () => { ... })

const shutdown = (signal: string) => {
  Logger.info(`Received ${signal}, beginning graceful shutdown`)
  server.close(async (err) => {
    if (err) Logger.error(`Error during server.close: ${err}`)
    try {
      await mongoClient.close()
      Logger.info("Mongo connection closed")
    } catch (e) {
      Logger.error(`Error closing Mongo: ${e}`)
    }
    process.exit(err ? 1 : 0)
  })

  // Force exit if shutdown takes too long
  setTimeout(() => {
    Logger.error("Graceful shutdown timeout, forcing exit")
    process.exit(1)
  }, 8000).unref()
}

process.on("SIGTERM", () => shutdown("SIGTERM"))
process.on("SIGINT", () => shutdown("SIGINT"))
```

`server.close()` stops accepting new connections but lets existing requests finish. The 8-second timeout is short of Cloud Run's 10-second default `SIGKILL` to leave room for the close to actually complete.

**Cost.** 1-2 hours including local SIGTERM testing.

**How we'd know it worked.** Running the dev server, hitting a slow endpoint, and sending SIGTERM: the request completes successfully before the process exits. The Mongo connection close shows up in logs.

---

### Brief 10 — Catch up the dependencies that matter

**Situation.** Pass 2 Thread 9 ran `npm audit` and traced the dependency drift: 35 vulnerabilities (1 critical, 10 high, 16 moderate, 8 low), several majors behind on direct dependencies, and a couple of lockfile-drift issues. Not all of these matter — many high-severity advisories are in dev-only dependencies (Cypress chain, tsx chain, eslint chain) and don't reach the request path.

The ones that *do* matter for the production code path:

- `body-parser` (transitive, high) — DoS via URL encoding. Reaches every request.
- `express` (transitive, high) — XSS via response.redirect. Doesn't reach this code path (no redirects), but Express version matters.
- `path-to-regexp` (transitive, high) — backtracking regexes in route matcher. Every request.
- `cookie-parser` (direct, low) — accepts cookies with out-of-bounds chars.
- `morgan` (direct, low) — `on-headers` chain.

**What changes if we do nothing.** Vulnerabilities stay open. `npm audit` keeps flagging them. New advisories layer on top. Catching up later is harder than catching up now.

**The proposed work, sized.**

Two phases.

*(a) Run `npm audit fix` and verify nothing breaks.* Many of these will be resolved by lockfile updates without touching `package.json` — npm can pick newer transitive versions automatically. Test the result. This catches the easy ones.

*(b) Bump the direct dependencies that need it.* In order of safety:
- `morgan` 1.10.0 → 1.10.1 (patch). Safe.
- `cookie-parser` 1.4.6 → 1.4.7 (patch). Safe.
- `cors` 2.8.5 → 2.8.6 (patch). Safe.
- `helmet` 7 → 8. Pass 2 traced this — the production response headers are already at v7 defaults that v8 keeps. Likely zero-impact bump.
- `mongodb` 6 → 7. Pass 2 confirmed the code uses stable APIs across this boundary. Worth doing but test carefully.
- `dotenv` 16 → 17. The repo only uses `dotenv.config()`. Safe.

What this brief explicitly does NOT include:
- `ts-results-es` 3 → 7 (4 majors). The API changed and the repo uses the v3 surface heavily. This is a larger refactor.
- `@types/node` 20 → 25. The Node *runtime* in the Dockerfile is 20.5.1. The types shouldn't get ahead of the runtime.
- ESLint / TypeScript / Cypress / Jest majors. These are dev-time only and worth doing as a batch later, not now.

**Cost.** 2-4 hours for phase (a) + (b) with testing.

**How we'd know it worked.** `npm audit` reports zero high or critical vulnerabilities. The test suite passes. Production smoke tests against the upgraded service pass.

---

## Long-term direction briefs

### Brief 11 — The auth conversation

**Situation.** Pass 2 Thread 3 established that the auth middleware referenced in `meetings.route.ts:4-6` never existed in the git history. The comments are aspirational from the first commit. Pass 2 also established that the dataset is public by design.

So the question isn't whether the absence of auth is a gap — the question is *whether central-query needs auth at all*. The audit's job is to surface the question, not answer it.

Arguments for adding auth at some point:
- Per-client rate limiting becomes possible (Brief 4 is per-IP, which is coarse).
- Per-client analytics becomes possible.
- Selective endpoint exposure becomes possible (e.g. if there are ever admin endpoints).
- Abuse attribution becomes possible.

Arguments against:
- Friction for OIAA-Direct and any other consumer.
- Key management overhead for volunteer-run infrastructure.
- The data is public anyway.

**What changes if we do nothing.** The system stays open. Public-by-design data stays public-by-design. Briefs 1, 3, and 4 plus monitoring (Brief 7) are likely sufficient protection.

**The proposed work, sized.**

This brief is a *decision* to revisit periodically, not a piece of work to do now. Suggested checkpoints:

- After 90 days of live OIAA-Direct traffic: review request patterns. Is there scraping? Are there abuse signals? Has rate limiting (Brief 4) caught anything?
- Before adding any non-read endpoint (e.g. if central-query ever gains a write surface).
- If a second consumer (beyond OIAA-Direct) wants to integrate.

If the decision is eventually "yes, add auth," the existing custom error class and mapper for `AuthorizationError` (Pass 1 §8.1, §8.2) is the right scaffold to build on. The commented imports in the route files are roughly the right shape for what would need to be written — just actually write it this time.

**Cost.** Zero now. ~1-2 days when the decision comes to add it.

**How we'd know it worked.** This brief succeeds if it gets reviewed at the suggested checkpoints rather than ignored.

---

### Brief 12 — Document the deployment topology

**Situation.** Pass 2 Thread 1 had to do real detective work — DNS lookups, certificate inspection, reverse DNS — to determine where production traffic actually goes. The repo points at Cloud Run; reality is a Vultr VM. The two databases (Central source, Shadow target), the migration script that lives somewhere, the Atlas account ownership by OIAA, the nginx config on the Vultr host — none of this is documented in the repo.

This isn't a code finding. It's a *missing documentation* finding. The codebase tells you what the application does. It doesn't tell you what runs it, who owns it, or how to operate it.

**What changes if we do nothing.** The next contributor has to do the same Pass 2 Thread 1 investigation. Operational knowledge stays in Tim's head. The Pass 2 "out-of-band state" pattern stays as-is.

**The proposed work, sized.**

A single new file: `docs/DEPLOYMENT.md`. Suggested sections:

```markdown
# Deployment topology

## Production
- API: Vultr VM at code4recovery.org account, IP 45.32.194.35
- Reverse proxy: nginx (config in /etc/nginx/sites-available/central-query)
- Process supervisor: <systemd / pm2 / docker — Tim to confirm>
- Domain: central-query.apps.code4recovery.org
- TLS: Let's Encrypt via certbot, auto-renewing

## Databases
- Source: MongoDB Atlas, OIAA-owned account, `<cluster name>`, database `<name>`
- Shadow (this API queries): same cluster, database `<name>`
- Migration: <script location and trigger — Tim to confirm>

## Access
- SSH to Vultr: Tim Rohrer
- Atlas: OIAA admins, Tim (read source / read+write shadow)
- DNS (code4recovery.org): <whoever>
- This GitHub repo: Code for Recovery org

## Deploy process
- Currently: <manual SSH + git pull + restart, or whatever it actually is>
- CI: none (the Cloud Run workflow is unused — see Brief 5)

## What to do if it's down
- Check `/api/v1/health` (after Brief 7)
- SSH to Vultr, check process supervisor status, check nginx logs
- Check Atlas dashboard for source/shadow database health
```

This file should be a living document. Anyone with operational responsibility for central-query should be able to read it and understand what they're responsible for and how to ask for help.

**Cost.** 2-3 hours for the initial write-up; ongoing maintenance is small.

**How we'd know it worked.** A new volunteer can read `docs/DEPLOYMENT.md` and understand the system without asking Tim a single question.

---

### Brief 13 — Consider the events resource and the aspirational architecture

**Situation.** Pass 2 Pattern A: "aspirational architecture." Code exists in the codebase that doesn't run, isn't tested, and in some cases is partially scaffolded:

- The entire `/api/v1/events` resource. The README says "ignore, will be removed."
- The five custom error classes — three of which are now used after Brief 3, but `AuthorizationError` still isn't (covered by Brief 11), and `BaseError`/`ValidationError` are abstract bases.
- The `ErrorProblemMappingStrategy` class — exists but unused; `DefaultMappingStrategy` is what's wired up.
- The `meetingCollection` export in `meeting.mongodb.service.ts:12` — exported, never imported.
- The `DayOptions` interface — declared, not referenced.
- The `migrate/migrateData.ts` entry in `tsconfig.json:include` — the path doesn't exist.

**What changes if we do nothing.** The codebase stays harder to read than it needs to be. Every new contributor wonders whether the events resource is important. Every code search for "AuthorizationError" returns the same dead-end.

**The proposed work, sized.**

This is a cleanup brief, not a fix-something-broken brief. It comes last because nothing about the system *misbehaves* due to the aspirational architecture — it just clutters.

Suggested sweep:

*(a) Remove the events resource.* Move `events.controller.ts`, `events.service.ts`, `events.route.ts`, the events Cypress tests, the `events-view` storage call into a single squash-removal commit. The README's "will be removed" promise is now delivered.

*(b) Remove `ErrorProblemMappingStrategy`.* It's an alternative to what `server.ts` actually uses; keeping both is confusing.

*(c) Remove dead exports.* `meetingCollection`, `DayOptions`, the `migrate/migrateData.ts` tsconfig include.

*(d) Decide on the abstract error bases.* `BaseError` and `ValidationError` are abstract — they exist to be extended. After Brief 3, `ReqParamFormatError` (which extends `ValidationError`) is in use. The hierarchy is justified. Leave them.

**Cost.** 2-3 hours; small chance of breaking something the audit didn't catch, so keep the commits granular and run the full test suite after each one.

**How we'd know it worked.** The codebase has fewer files, every export has a consumer, every type is referenced, every route serves traffic. The mental overhead of reading the codebase goes down.

---

## Closing notes

Tim, a few things to wrap on.

**You don't have to do all of these, and you don't have to do them in this order.** The structure is just to help triage. If you read the pre-launch briefs and decide one of them is wrong for your situation, push back. If you think the long-term briefs are higher priority than the early-ops ones, swap them. This is a design document, not a contract.

**Briefs 1, 2, 3 are the load-bearing pre-launch trio.** If nothing else gets done before launch, these three together resolve the largest concrete risks the audit surfaced: the process crashing on bad input, the test runner lying about pass status, and the silent-failure mode for malformed parameters. Together they're maybe 1-2 days of work.

**Brief 8 (view definitions in the repo) is the single most important brief in the entire document.** Not because it's urgent for launch — the views work today. Because it's the one thing that, if it doesn't get done, makes everything else fragile in a way that nobody will notice until the day they need to. Please consider it even if everything else gets deferred.

**The things this audit got right are largely things you got right.** The `rtc` abstraction, the categorisation taxonomy, the controller/service/storage separation, the ts-results-es pattern — these aren't being changed by any brief. They're the bones the rest of the work stands on.

**If any of this lands wrong, that's on Claude's framing, not your work.** Matt and I have been deliberate about staying in observation mode through Passes 1 and 2 and in design mode here in Pass 3, with no "you should haves" anywhere. If a brief reads as criticism rather than collaboration, that's a framing failure to correct.

Good luck with the launch. OIAA-Direct is going to be a significant improvement on the JSON-file architecture, and central-query is the right shape of thing to make that happen.

— Claude (with Matt)

---

*End of Pass 3.*

*Audit complete.*
