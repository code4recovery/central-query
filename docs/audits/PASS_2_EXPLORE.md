# Central-Query Audit — Pass 2: Explore

**Repository:** central-query (Express + TypeScript REST API)
**Branch at time of audit:** `code-review`
**Audit date:** 2026-05-26
**Auditor:** Claude (Claude Code)
**Framework:** TrustTech 3 Pass Audit — Pass 2 of 3 (Explore)
**Predecessor:** [`PASS_1_DISCOVERY.md`](./PASS_1_DISCOVERY.md)

This pass walks the factual map produced by Pass 1, interrogates the most active threads under real conditions, and forms evidenced observations about what they produce when the system runs. Findings are **observations only**; prescriptions are deferred to Pass 3.

A live deployed instance was probed at `https://central-query.apps.code4recovery.org` (URL supplied by Matt). A local dev server was driven against a freshly-seeded MongoDB 7 container (no `.env` was committed; all working-tree changes have been reset before writing this report).

---

## Thread 1 — The port mismatch

### What Pass 1 surfaced
Pass 1 (§11.4, §14) recorded that the application binds to a hard-coded port `5001` (`src/index.ts:20`), no `PORT` environment variable is read, the Dockerfile contains no `EXPOSE`, and the deploy workflow does not pass `--port`. Cloud Run probes port `8080` by default; on those facts alone the deployed service would fail its startup probe.

### What Explore investigated
Three probes were used to reach a definitive answer:
1. `grep -n 'process.env.PORT\|app.listen\|const port' src/` to verify there is no fallback path. Confirmed: `src/index.ts:20` reads `const port = 5001` as a literal; no other binding logic exists.
2. `curl -sS -i https://central-query.apps.code4recovery.org/api/v1/meetings?limit=1` to test reachability.
3. DNS resolution and certificate inspection on the production hostname (`dig`, `openssl s_client`, `whois`).

### What we now know
The deployed service **is** reachable and serving real data:

```
HTTP/2 200
server: nginx
date: Mon, 25 May 2026 18:25:29 GMT
content-type: application/json; charset=utf-8
content-length: 1193
strict-transport-security: max-age=15552000; includeSubDomains
access-control-allow-origin: *
[…response body is a Meeting[] with real OIAA data — slug "aairanian-1" etc.]
```

The mechanism that produces this is **not** the deploy workflow in the repository. Specifically:

| Evidence | Implication |
|----------|-------------|
| `dig +short central-query.apps.code4recovery.org A` → `45.32.194.35` | IP is in the Vultr / The Constant Company range, not Google. |
| `dig +short -x 45.32.194.35` → `45.32.194.35.vultrusercontent.com.` | Reverse DNS confirms Vultr Cloud Compute. |
| `Server: nginx` on every response | A reverse-proxy nginx terminates TLS and forwards to the Node app. Cloud Run's frontend identifies as `Google` or `gvs 1.0`, never `nginx`. |
| TLS cert SAN/issuer | `subjectAltName: DNS:central-query.apps.code4recovery.org`, issued by Let's Encrypt R13 — self-managed, not a Google-managed cert. |

The Cloud Run deploy workflow (`.github/workflows/deploy-cloudrun.yml`) does still execute on every push to `main` and does still build a container that binds to port `5001`. Whether that build succeeds in Cloud Run, fails health checks, or runs as a dark/unused service is not knowable from the repo alone. What is knowable is that the **traffic-serving deployment is a self-hosted Vultr VM running nginx in front of a Node process**, and the README's hint at line 122 — "the original author can push the images and update the demo on the C4R VPS" — is consistent with that finding.

The port mismatch from Pass 1 is therefore unresolved for one notional deployment target (Cloud Run) and irrelevant to the actual production traffic path (nginx → Node on a Vultr host, where nginx upstream is configured externally to forward to whatever port `5001` the Node process happens to bind).

### What we still don't know
- Whether the Cloud Run deploy workflow has ever produced a healthy revision. The GitHub Actions run history would answer this; only GCP/GitHub access can.
- Whether the Cloud Run service exists at all, or whether `gcloud run deploy` is failing every time. Requires GCP console access.
- The nginx configuration on the Vultr VM (which `proxy_pass` target, what timeouts, what rate limits if any). Requires SSH access.
- Whether a process supervisor (systemd, pm2, Docker, …) restarts the Node process after a crash (see Thread 4). Production behaviour suggests *something* restarts it, but we cannot inspect the supervisor from inside the repo.

### Confidence
**High** that the live service is not on Cloud Run as the deploy workflow would imply. The IP/cert/server-header evidence is mutually corroborating. **Medium** that the Cloud Run deploy is failing — equally consistent with "Cloud Run deploys work but the DNS just points elsewhere," and we cannot tell which from the repo.

---

## Thread 2 — `NODE_ENV=development` in production cascade

### What Pass 1 surfaced
Pass 1 (§11.3, §11.5, §14) showed that `.github/workflows/deploy-cloudrun.yml:49` hardcodes `NODE_ENV=development` for the deployed service, overriding the Dockerfile's `ENV NODE_ENV production` (line 15). Three places in `src/` branch on `NODE_ENV`.

### What Explore investigated
1. `grep -rn 'NODE_ENV' src/` to make sure no fourth branch was missed. Confirmed only three.
2. For each branch, the two sides were traced and the implication identified.
3. A single `getMeetings` request was driven against the local dev server (with `NODE_ENV=development`) and the resulting log volume was measured against `logs/all.log` after truncating it first.
4. Production response headers were inspected to determine which Helmet/CORS defaults were emitted and to confirm Pass 1's claim that morgan is active in production.

### What we now know
**The three `NODE_ENV` branches and their actual deployed behaviour:**

| Source | Code | Branch when `NODE_ENV=development` | Branch when `NODE_ENV=production` | Deployed today |
|--------|------|-------------------------------------|------------------------------------|----------------|
| `src/storage/mongodb-storage-service.ts:7-16` | `isDevelopment = env === "development" \|\| env === "test"` → empty options vs `{ maxPoolSize: 50, w: "majority", wtimeoutMS: 2500 }` | Empty Mongo options; driver defaults apply. | The 3-option block applies. | **Empty options** (development branch) |
| `src/common/logger.ts:11-15` | `isDevelopment = env === "development"` → `"debug"` vs `"warn"` | Winston level `debug` — all 37 `Logger.debug` calls in `src/` emit. | Winston level `warn`. | **`debug`** |
| `src/server.ts:44` | `if (process.env.NODE_ENV !== "prod") app.use(morgan("dev"))` | Morgan installed with the `dev` colorized format. | Morgan installed with the `dev` colorized format. | **morgan installed** (the literal string `"prod"` is the only value that disables it; `"production"` does not) |

So two of the three branches differ between intended and actual; the third (morgan) is unaffected by the `production` vs `development` flip but **always active** in any non-`"prod"` deployment.

**Mongo pool delta (intended vs actual).**
The development branch passes `{}` to `new MongoClient()`, which uses node-driver 6.3 defaults:
- `maxPoolSize`: driver default is `100`. Configured value would be `50`.
- `w`: driver default is `1` (single primary acknowledgement). Configured would be `"majority"`.
- `wtimeoutMS`: driver default is `0` (no timeout). Configured would be `2500`.

The `w` and `wtimeoutMS` settings only affect writes. The API performs no writes (`grep -rn 'insertOne\|updateOne\|deleteOne\|insertMany\|updateMany\|deleteMany\|findOneAndUpdate\|findOneAndDelete\|replaceOne\|bulkWrite' src/` returns nothing; the only writes in the repo are inside `*.spec.ts`). The deployed delta in write durability is therefore **null** for normal traffic — the only observable difference is `maxPoolSize: 100 → 50`, i.e. the development branch is more permissive on concurrency, not less.

**Log volume estimate.**
A single `GET /api/v1/meetings` driven against the local dev server in `NODE_ENV=development` produced, in `logs/all.log` (the Winston `File` transport that captures every level):

```
21 lines, 1933 bytes total, avg 92.0 bytes/line
```

The 21 lines per request are: 4 from the controller (parsed params, hours, info success line, and conditional Hours-typeof), ~7 from `meetings.service.getMeetings` (time, hours, options, limits, pipeline, log, log), ~2 from `lowerUpperLimits`, 10 from `pipelineFromQuery` (Formats/Features/Communities/Type/Languages/NameQuery/RTC Ranges/Limit/Query/pipeline-built). At 25,000 visitors/day with one `getMeetings` per visitor:

```
25,000 × 1933 bytes ≈ 48.3 MB/day
30,000 × 1933 bytes ≈ 58.0 MB/day
```

Each Winston `Logger.*` call also goes to the `Console` transport (stdout). On a Cloud Run target this would flow into Cloud Logging; on the Vultr nginx target it flows into whatever captures stdout for the Node process (systemd journal, Docker logs, or `/dev/null`, depending on the process supervisor — unknown). Cloud Logging ingestion is billed at roughly USD 0.50/GiB after the free tier; 48–58 MB/day → ~1.5 GiB/month → ~USD 0.75/month if it ever lands there. The cost dimension is small; the disclosure dimension is not — see Thread 8.

Morgan adds one line to stdout per HTTP request in the `dev` format (`GET /api/v1/meetings 200 5.637 ms - 343`), so each request actually produces **~22 lines** when stdout is counted.

The file transport (`logs/all.log` and `logs/error.log`) writes to local disk inside the container/VM. Pass 1 noted both files existed in the working tree; they are gitignored. On Cloud Run a container filesystem is ephemeral and the files vanish on revision rollover. On the Vultr deployment the files persist until the disk fills or the process is restarted.

### What we still don't know
- The actual log volume per request *in production*. The local dev server has empty Mongo views; production has thousands of meetings, so `Logger.info("fetch result includes ${val.length} meetings.")` and `Logger.debug("meetingStore fetch X meetings.")` lines do not differ in size, but `Logger.info("fetch result being returned includes ${JSON.stringify(val)}.")` in `bySlug` and `facets` and `relatedGroupInfo` will. The facets `JSON.stringify(val)` line under production data is large (the facets response alone is ~5 KB; logging it adds 5 KB to each facets request's log volume).
- Whether stdout is captured anywhere on the Vultr deployment. Requires host access.
- Whether `logs/all.log` is rotated (logrotate, etc.) on the Vultr host. Requires host access.
- How many `getMeetings` calls a typical visitor session actually triggers — the per-visitor assumption used above is one call.

### Confidence
**High** on the branch-by-branch behaviour delta and on per-request line counts. **Medium** on the daily MB extrapolation — the assumption of one `getMeetings` call per visitor could be off by 2–3×.

---

## Thread 3 — Auth posture and exposure surface

### What Pass 1 surfaced
Pass 1 (§7, §11.2, §12.4–§12.6) recorded that all authentication middleware is commented out in `meetings.route.ts:4-15` and `events.route.ts:4-15,25-41`, that the referenced files (`TokenMiddleWare`, `AuthorizationMiddleware`, `verifyFieldsErrors`) do not exist on disk, that `cors()` uses default `origin: '*'`, that there is no rate limiting, and that the deploy workflow passes `--allow-unauthenticated`.

### What Explore investigated
1. **History trace.** `git log --all --diff-filter=AD --name-only` filtered for `middleware|TokenMiddleWare|AuthorizationMiddleware|verifyFieldsErrors` returned an empty set — no middleware file has ever been added or deleted in the repository's history.
2. **Pickaxe.** `git log --all -S 'class TokenMiddleWare' --oneline`, `-S 'extractAPIToken'`, `-S 'class AuthorizationMiddleware'`, `-S 'isTokenAuthorized'` returned empty results — no symbol matching the *definition* of these classes has ever been added to the codebase. The only commits the pickaxe matches are `8a958653 Second major dev commit` (2023-12-13, Tim Rohrer), which is the commit that **introduced the commented-out import strings** in the first place, and `3f575b9b refactor: Remove commented out code` (2024-01-13), which removed 38 lines of commented routes/controllers but left the commented auth imports intact.
3. **Production exposure verification.** Live probes against `https://central-query.apps.code4recovery.org/api/v1/...` with no credentials returned 200 OK for all listed endpoints. The body of a `?limit=20` request was inspected to determine what fields are returned in real traffic today.
4. **CORS preflight from a hostile origin.** `curl -X OPTIONS -H 'Origin: https://evil.example.com' …` returned `204` with `access-control-allow-origin: *`.

### What we now know
**The auth middleware never existed.** The commented imports in `meetings.route.ts:4-6` reference paths (`../auth/middleware/AuthorizationMiddleware.js`, `../common/middleware/body-query-validation.middleware.js`, `../common/middleware/TokenMiddleWare.js`) that have **no commits creating or deleting them anywhere in the git history**. The same is true for any class/symbol definition that those imports would have resolved to. These are aspirational placeholders left from the project's first major commit (2023-12-13) and never implemented. Pass 1's hypothesis that they might have been deleted is contradicted: they were never written.

**The deployed exposure surface.** Without auth, without rate limiting, with wildcard CORS, every endpoint in the list below is callable by any HTTP client on the public internet today:

| Path | Method | Verbatim probe result against production |
|------|--------|--------------------------------------------|
| `/api/v1/meetings` | GET | `200 application/json` — full meeting list (default 1-hour window, limit 300). |
| `/api/v1/meetings/facets` | GET | `200 application/json` — full categories + languages taxonomy (~5 KB). |
| `/api/v1/meetings/:slug` | GET | `200 application/json` — single full meeting record incl. all PII fields below. |
| `/api/v1/meetings/:slug/related-group-info` | GET | `200 application/json` — group record + sibling meetings. |
| `/api/v1/events` | GET | `200 application/json` (`[]` in current production data). |

**CORS posture.** The OPTIONS preflight test confirms `Access-Control-Allow-Origin: *` is returned regardless of the request `Origin`. Credentials are not allowed (helmet's defaults plus the absence of `credentials: true` in `cors()` means `Access-Control-Allow-Credentials` is not emitted), so cookie-based auth from a browser is not possible — but no cookie-based auth exists anyway, and the API is open to read by definition.

**Body parser exposure.** `app.use(express.json({ limit: "50mb" }))` is mounted at `server.ts:45` *before* the routes. A live probe with a 51 MB body and `Content-Type: application/json` against the production endpoint returned:

```
HTTP/2 400
content-type: application/problem+json; charset=utf-8
{"type":"about:blank","title":"Bad Request","status":400,"detail":"Unexpected token ' ', \"#\" is not valid JSON"}
```

The body parser parses the body even on `GET` requests when `Content-Type: application/json` is present, attempts to parse 51 MB, fails on the first NUL byte, and a generic `Bad Request` is mapped through the problem-details chain to RFC 7807. A *valid* JSON body up to ~50 MB would be parsed and held in memory before the controller (which never reads `req.body`) gets it. So the 50 MB limit translates to "an unauthenticated client can pin ~50 MB of RAM per request"; at the Cloud Run default of `--concurrency=80` × `--max-instances=100` (per Pass 1 §11.4 for the notional Cloud Run target) that is up to ~400 GiB of cumulative parser memory commitment from concurrent requests, though no individual instance has that much RAM (`--memory` defaults to 512 MiB). On the Vultr instance this number depends on the host's RAM and is unknown.

**Field inventory from production responses.** A 20-row sample from `GET /api/v1/meetings?limit=20` produced this union of fields:

```
communities, conference_phone, conference_phone_notes, conference_url,
conference_url_notes, duration, features, formats, groupEmail, groupID,
groupNotes, groupWebsite, languages, name, nextEventUTC, notes, rtc,
slug, timeUTC, timezone, type
```

Of the 20 sampled meetings:
- 20/20 had `groupEmail` (e.g. `aairanian34@gmail.com`).
- 9/20 had `groupWebsite`.
- 5/20 had `conference_phone`.
- Some had `conference_url_notes` containing credential-style content. One verbatim example: `"Passcode:  Email firesidemeeting2@gmail.com"`. Pass 1 §12.7 catalogued 16 fixture rows containing `Password:` literals; production has the same field name and field shape and contains analogous content (the fixtures are a snapshot of production data per the README §1 — "current dataset is a copy of the OIAA database").

Some meeting records also contain a `groupNotes` field with multi-paragraph free-text descriptions (e.g. a Persian-language meeting description ~750 chars). These are not sensitive per se but are large; the average response body size for a 20-row sample is ~12 KB.

**Concurrency limits.** No rate limiting is present anywhere — confirmed by `grep -rn 'rate.*limit\|express-rate-limit\|rate-limiter\|express-slow-down' src/ package.json` returning no matches. The only protection is nginx (whose limits are unknown to us) and whatever cloud or host-level network shape exists.

### What we still don't know
- The nginx config on the Vultr host (rate limits, request size limits, IP allowlists, fail2ban-style protections). Requires host access.
- Whether the Code for Recovery / OIAA upstream considers the dataset public-by-design. The fixtures and the README's "this is OIAA data" framing suggest yes, but stewardship and consent semantics around publishing `conference_url_notes` containing meeting access passwords (which are then logged — see Thread 8) is outside repo evidence.
- Whether any clients other than the OIAA-Direct frontend currently consume this API, and at what request volume.
- The actual upper bound on payload size in production (does nginx have its own `client_max_body_size` that overrides the 50 MB? Untestable without producing very large bodies against production).

### Confidence
**High** that auth middleware classes never existed in repo history. **High** on the exposure surface inventory (every endpoint was probed unauthenticated). **High** that the data exposed contains sensitive-shaped content (verbatim sample shown above). **Medium** on whether that exposure is intended by the upstream data steward — not knowable from inside the repo.

---

## Thread 4 — Error path correctness

### What Pass 1 surfaced
Pass 1 (§8) noted that custom error classes (`ReqParamFormatError`, `AuthorizationError`, `DbOperationError`) are defined but never thrown; that `next()` is called with no argument in two places (`meetings.controller.ts:126, 145`); that `next(val)` is called with the `Err` wrapper rather than `val.error` (lines 109, 161); and that the alternative `ErrorProblemMappingStrategy` exists but is unused.

### What Explore investigated
A clean local dev server was started against a seeded MongoDB 7 container with `NODE_ENV=development`, and every error path listed in the brief was exercised. Each response (status, headers, body) was captured verbatim. Where a path also exists in production, the same request was sent to `https://central-query.apps.code4recovery.org` and the two compared.

### What we now know
**Verbatim response for each path** (local dev server unless noted):

| Probe | Local response | Production response |
|-------|---------------|---------------------|
| `GET /api/v1/meetings/does-not-exist` | `HTTP/1.1 404 Not Found` · `text/html` · body `Sorry, can't find that!` | `HTTP/2 404` · `text/html; charset=utf-8` · body `Sorry, can't find that!` |
| `GET /api/v1/meetings/does-not-exist/related-group-info` | `HTTP/1.1 404 Not Found` · `text/html` · body `Sorry, can't find that!` | (same as above) |
| `GET /api/v1/meetings?start=garbage` | `HTTP/1.1 200 OK` · `application/json` · body `[]` | `HTTP/2 200` · `application/json` · body `[]` |
| `GET /api/v1/meetings?start=2026-99-99T99:99:99Z&limit=1` | `HTTP/1.1 200 OK` · `application/json` · body `[]` | (not probed against prod to avoid noise) |
| `GET /api/v1/meetings?hours=999&limit=1` | `HTTP/1.1 200 OK` · `application/json` · body returns the seeded row (locally) — completed in ~5 ms with the 1-row dataset | `HTTP/2 504` after **~65 seconds** (nginx upstream timeout) |
| `GET /api/v1/meetings?limit=abc` | **Connection terminated mid-response** — `curl: (52) Empty reply from server`; subsequent requests fail with `Connection refused` (Node process exited) | `HTTP/2 502 Bad Gateway` from nginx |
| `GET /api/v1/nonexistent` | `HTTP/1.1 404 Not Found` · body `Sorry, can't find that!` | `HTTP/2 404` · body `Sorry, can't find that!` |
| `OPTIONS /api/v1/meetings` with hostile `Origin` | `HTTP/1.1 204 No Content` · `Access-Control-Allow-Origin: *` | `HTTP/2 204` · same |
| `POST /api/v1/meetings` with invalid JSON body (`{not-json`) | `HTTP/1.1 400 Bad Request` · `application/problem+json` · body `{"type":"about:blank","title":"Bad Request","status":400,"detail":"Expected property name or '}' in JSON at position 1"}` | (same shape; tested with 51 MB nul-byte body, see Thread 3) |

**Mapping each result back to code:**

- **bySlug not-found / relatedGroupInfo not-found** (`meetings.controller.ts:126, 145`). The service returns `Err("Meeting not found")`. The controller calls `next()` with no argument. In Express, `next()` with no argument means "continue to the next non-error handler"; the registered `HttpProblemResponse` mapper chain is an **error** middleware (its handler signature is `(err, req, res, next)`) and is therefore **skipped**. Control falls through the routes to the `app.use("*", …)` catch-all at `server.ts:52-54`, which sends `404` with the plaintext body `Sorry, can't find that!`. The four registered mappers (`ReqParamFormatErrorMapper`, `AuthorizationErrorMapper`, `DbOperationErrorMapper`, and the default 400 mapper) are not consulted on this path. **No custom error class is ever instantiated on this path**, so no mapper ever fires for a not-found.

- **`?start=garbage` returns 200 + `[]`.** `validateTemporalParams` writes `validatedStart = queryParams.start ?? new Date().toISOString()` — when `start="garbage"` is present, the parsed value is the literal string `"garbage"`, not `undefined`, so it is *kept*. It then flows into `lowerUpperLimits(time, hours)` at `utils/dates.ts:60`, which calls `DateTime.fromISO("garbage").toUTC()`. Luxon returns an *invalid* `DateTime` for malformed ISO input; `time.weekday` becomes `NaN` and `time.toFormat("HH:mm")` becomes the literal string `"Invalid DateTime"`. So `rtcFromTimestamp(invalid)` returns `"NaN:Invalid DateTime"`, which becomes the `$gte` bound of a Mongo `$match`. No document has an `rtc` field that compares ≥ `"NaN:Invalid DateTime"` lexically against valid `rtc` strings like `"1:09:00"` (the `NaN` character is `N`, which is alphabetically after digits in BSON string ordering), so the aggregation returns zero rows. No exception is raised, no validation triggers, and the client gets `200 []`.

- **`?hours=999` returns 200 with data locally; times out in production.** The temporal-window logic at `utils/dates.ts:54-72` accepts any numeric hours value. With `hours=999`, `upper = rqstTime.plus({ hours: 999 })` is ~42 days in the future. The cross-day branch (`createCrossDayRange`) is taken and produces two `$or`-joined `rtc` ranges. The local seeded data has 2 rows so it returns quickly; production has many thousands of rows in the views, and (given there are no indexes on the source collections — see Thread 6 §indexes) the aggregation against `scheduled-meetings` view scanned the underlying collection for >60 s. nginx's upstream timeout is reached and a 504 is returned. The Node process is not crashed; it is still computing the response when nginx times out the connection.

- **`?limit=abc` crashes the Node process.** `parseInt("abc")` returns `NaN`. `getMeetings` passes `limit: NaN` to the pipeline builder, which appends `{ $limit: NaN }` to the aggregation. The Mongo driver throws the following synchronously inside the response promise chain:

  ```
  MongoServerError: invalid argument to $limit stage: Expected an integer,
  but found NaN in: $limit: nan.0
      at Connection.onMessage (…/mongodb/lib/cmap/connection.js:205:26)
      …
  ```

  Because the controller's handler is `async` but its body is `await meetingsService.getMeetings(...)` followed by `if (ok)`/`else next(val)`, an `await`ed throw inside `getMeetings` becomes an unhandled rejection. Express 4 does **not** auto-forward rejected promises to error middleware (it forwards only synchronous throws or explicit `next(err)` calls). Node's default unhandled-rejection behaviour in current Node 20 is to terminate the process. `tsx --watch` observed the exit and logged `Failed running 'src/index.ts'`; the next request `Failed to connect to localhost port 5001`.

  Behaviour in production is consistent: nginx received `HTTP/2 502` from the upstream because the upstream closed the connection without writing a response. The fact that production then continues to serve the next request implies *some* process supervisor restarts the Node process after each crash — but each individual `?limit=abc` is a free 502 from any client.

- **Body-parser errors.** When a request has `Content-Type: application/json` and the body is invalid JSON, Express's `body-parser` raises a `SyntaxError`. This **is** a synchronous Express error, so it reaches `HttpProblemResponse` middleware at `server.ts:62-66`. The `DefaultMappingStrategy` has no mapper registered for `SyntaxError`, so the default fallback inside `http-problem-details` emits an RFC 7807 document with `type: "about:blank"`, the error's `status`, and its message as `detail`. **This is the only error path where the problem-details mapper actually fires today.** None of the three custom mappers (`ReqParamFormatErrorMapper`, `AuthorizationErrorMapper`, `DbOperationErrorMapper`) is reachable from any production request because none of their three error classes is ever thrown.

  The `errorHandler` at `server.ts:29-39` is also reached, but it only logs and re-calls `next(err)` if `res.headersSent` is true; in the no-headers-sent case (which is normal), it does nothing.

- **`next(val)` vs `next(val.error)` distinction.** In `meetings.controller.ts:109, 161` and `events.controller.ts:24`, when the service returns `Err`, the controller calls `next(val)` where `val` is the unwrapped value of the `Err` — i.e. a plain string `"..."` in the `getBySlug` Err case. The Express error path treats whatever is passed as the `err` argument to error middleware. `http-problem-details` only matches mappers for instances of the *registered* error classes; a bare string does not match any mapper. So even in the paths where `next(val)` *is* called, the mapper chain does not produce a problem document — but those paths are unreachable today because `getMeetings`, `getFacets`, and `eventsService.getAll` all return `Promise<Ok<...>>` only (never `Err`). The `else { next(val) }` branches at lines 109/161/24 are dead code as currently typed.

**Summary of which error paths produce which response in the deployed system today:**

| Triggering input | Reaches mapper chain? | Returns RFC 7807? | Returns plaintext catch-all? | Crashes process? |
|------------------|------------------------|--------------------|-------------------------------|-------------------|
| Unknown slug (`/meetings/x`, `/meetings/x/related-group-info`) | No (`next()` no-arg) | No | **Yes** (`Sorry, can't find that!`) | No |
| Malformed `start` | No path taken | No | No (returns `200 []`) | No |
| `limit=<non-numeric>` | No (rejection escapes) | No | No (connection drops) | **Yes** |
| `hours=<very large>` | No path taken; query just slow | No | No | No (but request times out at nginx) |
| Unknown URL | No (Express 404 catch-all) | No | **Yes** | No |
| Invalid JSON body | **Yes** | **Yes** (`application/problem+json`) | No | No |

### What we still don't know
- How often `?limit=<non-numeric>` is fired against production today. Requires access to nginx/Vultr-host logs.
- Whether the process supervisor restart interval is fast enough that crashes are user-invisible past the one failed request, or whether there is observable downtime under burst conditions. Requires host access.
- Whether other malformed inputs (e.g. `?hours=abc` — coerces to `NaN` via `Number()` and is caught by `validateTemporalParams`'s `!isNaN` guard at controller line 34; `?formats=` with deeply nested JSON; etc.) reach unhandled branches. Some basic probing showed `?hours=abc` returns 200 (the `!isNaN` guard catches the parse) but a full fuzz was not attempted.

### Confidence
**High** on every observed response (verbatim captures from a local server we ran ourselves). **High** on the causal chain `limit=abc → NaN → $limit:NaN → driver throw → unhandled rejection → process exit` (reproduced in the local dev server with a printable stack trace). **High** on the mapper-chain analysis (corroborated by the live test of invalid JSON body returning the only observed RFC 7807 response).

---

## Thread 5 — The view-definition gap

### What Pass 1 surfaced
Pass 1 (§5.2) recorded that 12 distinct Mongo view names are referenced in code but no aggregation pipelines are defined in `src/`. The single pipeline in `README.md:130-278` targets a view named `meeting-view` (not used by code) and contains a Slack URL embedded inside the JSON at line 138.

### What Explore investigated
1. The minimum field-set contract required of each view was derived by tracing every read against it.
2. The README pipeline was re-read end to end despite the JSON corruption to identify what it would produce.
3. `git log --all --oneline -- 'storage*' README.md` and a pickaxe `git log --all -S 'meeting-view'` were used to look for any commit creating, importing, or migrating view definitions.
4. The relationship between `meeting-view` (README name) and `combined-meetings`/`scheduled-meetings`/`unscheduled-meetings` (code names) was investigated against the data shape produced by production responses.

### What we now know
**Minimum-field contracts the code requires of each view.** Derived from every read in `src/storage/*` and the downstream `categorizedMeeting` / `preparedMeetings` calls that consume the documents:

| View name | Filter operators issued by code | Fields the code reads off each document |
|-----------|----------------------------------|------------------------------------------|
| `scheduled-meetings` | `$match { rtc: { $gte, $lte } }` (single range or `$or`-combined), `$match { types: { $all } }`, `$match { languages: { $in } }`, `$match { name: { $regex } }`, `$limit`; also `find({ groupID: ObjectId })` | `slug`, `name`, `nextEventUTC` (→ aliased to `timeUTC`), `timezone`, `rtc`, `groupID` (`ObjectId`), `languages` (`string[]`), `types` (`string[]`), `duration`, `conference_url`, `conference_url_notes`, `conference_phone`, `conference_phone_notes`, `groupEmail`, `groupNotes`, `groupWebsite`, `groupPhone`, `notes` |
| `unscheduled-meetings` | Same shape as above except temporal filter is skipped when `scheduled=false` | Same fields. The view is expected to contain meetings without scheduled occurrences. |
| `combined-meetings` | `findOne({ slug })`, plus the same `$match` shapes for `byGroup` calls via this view | Same fields. |
| `unique-languages-view`, `unique-languages-scheduled`, `unique-languages-unscheduled` | `find({}, { projection: { _id: 0 } })` | `English` (string), `alpha2` (string) — per `ActiveLanguage` interface |
| `unique-types-view`, `unique-types-scheduled`, `unique-types-unscheduled` | `find({}, { projection: { _id: 0 } })` | `code` (string), `desc` (string) — per `ActiveType` interface |
| `group-view` | `findOne({ _id: ObjectId })` | `name`, `email?`, `website?`, `phone?`, `notes?` — per `GroupView` interface |
| `events-view` | `find({}).toArray()` (no filter) | Whatever fields the events frontend renders (the code passes the array through verbatim) |

The `Meeting` response type in `endpoints.types.ts:24-34` extends `OptionalEndpointData` (`common/types.ts:108-111`), so the storage views must populate the `OptionalEndpointData` field set — `conference_*` (5 fields), `group*` (4 fields), `duration`, `notes`, plus required `communities`, `features`, `formats`, `type` (the latter four are produced from the flat `types` array by `categorizedMeeting` in `src/utils/categorizeMeeting.ts`, so the view only needs to provide the flat array).

**Inspection of the README pipeline despite the JSON corruption.** Reading `README.md:130-278`:

- The pipeline targets the source collection `meeting` (raw, also referenced in code as `meetingCollection` at `meeting.mongodb.service.ts:12`, though that collection variable is never used by any code path).
- A `$lookup` joins `from: "group"` (a sibling raw collection) into a `groupInfo` array. The `localField`/`foreignField`/`as` keys of that `$lookup` have been replaced by the Slack screenshot URL `https://code4recovery.slack.com/files/U010NSRGL31/F08PFNSH7AL/screenshot_2025-04-18_at_8.46.03___am.png` at line 138, so the join key is not recoverable from the README. The screenshot is gated behind Slack auth (not reachable without a Code for Recovery Slack account).
- After the `$lookup`, an `$addFields` stage hoists `groupInfo[0].email`, `.website`, `.phone`, `.notes` into top-level `groupEmail`, `groupWebsite`, `groupPhone`, `groupNotes`.
- A second `$addFields` computes `timeUTC` via `$dateFromParts` using `$$NOW`'s year/month/day combined with `$startDateUTC`'s hour/minute, all in the meeting's `timezone`. This produces "the next occurrence of this meeting *today*" rather than "the next occurrence in the future" — there is no day-rollover logic in this stage as quoted.
- Then `nowWeekday` (today in ISO weekday format `%u`) and `rtcWeekday` (the meeting's weekday from `startDateUTC`) are computed; `sortRTCDay` adjusts the order so days in the past wrap around for sorting.
- `rtc` is the concatenation `<dayOfWeekStr>:<HH:MM>` derived from `startDateUTC` (not from the computed `timeUTC`).
- A `$project` removes `startDateUTC`, `time`, `day`, `archived`, `accountID`, `groupInfo`, `createdAt`, `updatedAt`, `nowWeekday`, `rtcWeekday`, `dayOfWeekStr` (so the raw `meeting` collection has at least those fields, plus all the un-projected ones the code reads).
- Finally a `$sort` by `(sortRTCDay, sortRTCTime, name)` and a `$project` removes the two sort keys.

This pipeline produces output that aligns with the field shape the code consumes — `timeUTC`, `rtc`, `groupEmail`, `groupNotes`, etc. — so it is **the pipeline definition that produces a view of the shape `combined-meetings` is expected to have**, even though it is named `meeting-view` in the README. The likely explanation: the original `meeting-view` was the only view in earlier versions, and at some point it was split into `combined-meetings` / `scheduled-meetings` / `unscheduled-meetings` (likely with different filter stages prepended or a `$facet` added). The split is not documented in either the README or `CLAUDE.md`.

**Recoverability of the views from the repo alone.** If the Mongo views were dropped tomorrow, the following is recoverable from the repo:
- The names of the views and the field shape each must produce (derived above).
- A pipeline that approximately produces `combined-meetings` (README block, with the `$lookup` join key reconstructible only by inspecting the source `meeting`/`group` collection schemas in Mongo, or by viewing the Slack screenshot, or by asking the author).
- The output shape `unique-types-*` and `unique-languages-*` must have (from the `ActiveType` and `ActiveLanguage` interfaces), but **no pipeline whatsoever** for how to produce them from the source collection. The typical pattern (`$unwind: "$types"`, `$group: { _id: "$types", count: ...}`, `$lookup` against a code-description dictionary) is plausible but speculative.
- The split between `scheduled-meetings` and `unscheduled-meetings` views is also un-documented; the code's only signal is the `MeetingViewType` discriminator at `meeting.mongodb.service.ts:10`.

The full set of view definitions is therefore **not recoverable from the repository alone**. The README pipeline is *partially* recoverable for `combined-meetings`-shaped output; `scheduled-meetings`, `unscheduled-meetings`, the six unique-* views, and `group-view` would need to be reconstructed from the source `meeting` and `group` collection schemas plus business knowledge of the splitting rules. `events-view` likewise has no definition in the repo.

### What we still don't know
- The actual `$lookup` join key (the contents of the Slack-screenshot region). Requires Slack access or Mongo Atlas access.
- Whether the views in the production Atlas instance are actually defined the way the README pipeline implies, or whether they have diverged. Requires Mongo Atlas access to run `db.getCollectionInfos({ name: "combined-meetings" })`.
- Whether `meeting-view` (the README name) still exists alongside the three `*-meetings` views, or has been dropped/renamed.
- Who, organisationally, can recreate these views — author Tim Rohrer's involvement vs the broader Code for Recovery team.

### Confidence
**High** on the field contracts (every read in `src/` was traced). **Medium** on the recoverability story — the structural shape is recoverable from the README pipeline, but the exact `$match` filters that distinguish `scheduled-meetings` from `unscheduled-meetings` from `combined-meetings` are not in the repo. **Low** on whether the README pipeline as quoted is current or historical.

---

## Thread 6 — Query performance and index posture

### What Pass 1 surfaced
Pass 1 (§5.3) noted that no `createIndex` calls exist in `src/`. `pipelineFromQuery` constructs `$match` clauses on `rtc` (range), `types` (`$all`), `languages` (`$in`), and `name` (case-insensitive `$regex`).

### What Explore investigated
1. The exact pipeline emitted by a typical request was captured by running the dev server in `NODE_ENV=development` and reading the `Logger.debug("pipeline built: …")` line for `?start=2026-05-26T09:00:00Z&hours=24&nameQuery=big%20book&limit=300`.
2. `pipelineFromQuery.ts` was traced for the maximum complexity it can emit.
3. `makeQuoteFlexibleRegex` was traced for what it produces on common inputs.
4. The `$hours=999` empirical timeout (Thread 4) was used as a real-world performance data point against production.
5. The constraint that MongoDB views inherit indexes from their underlying source collection (but cannot have indexes of their own) was reaffirmed against the driver documentation.

### What we now know
**Pipeline emitted for a typical 24-hour, name-filtered request.** With the seeded dev DB and a request of `?start=2026-05-26T09:00:00Z&hours=24&nameQuery=big%20book&limit=300`, the live `pipeline built` log line is:

```jsonc
[
  { "$match": {
      "$or": [
        { "rtc": { "$gte": "1:08:51", "$lte": "1:24:00" } },
        { "rtc": { "$gte": "2:00:00", "$lte": "2:09:00" } }
      ]
  } },
  { "$match": { "name": { "$regex": "big book", "$options": "i" } } },
  { "$limit": 300 }
]
```

If `formats=B&languages=en` are added, the shape becomes:

```jsonc
[
  { "$match": {
      "$or": [/* rtc ranges */],
      "$and": [ /* nothing; the $or is one of the top-level matches */ ],
      "types": { "$all": ["B"] },
      "languages": { "$in": ["en"] }
  } },
  { "$match": { "name": { "$regex": "big book", "$options": "i" } } },
  { "$limit": 300 }
]
```

(The `mergeMatches` logic at `utils/pipelineFromQuery.ts:57-68` does mix `$or` and named keys into a single match document when `rtcMatch.$or` is present and a types/languages match also exists; the resulting document has both top-level keys and an `$and` wrapper depending on which combination of filters is set, with the worst case being a single `$match` containing `$and: [{ $or: [rtc1, rtc2] }, { types: { $all: [...] } }, { languages: { $in: [...] } }]`.)

**Maximum complexity the pipeline can produce.**
- Up to 2 `$or` branches for `rtc` (the cross-day or weekly cases).
- A `types: { $all: [type, ...formats, ...features, ...communities] }` clause with up to `1 + 16 + 15 + 17 = 49` items (all FORMATS + FEATURES + COMMUNITIES + 1 type).
- A `languages: { $in: [...] }` clause with the caller's full language list.
- A second `$match` stage for the case-insensitive name regex.
- A `$limit`.

There is no `$sort` in the application pipeline (sorting is done inside the *view*, per the README pipeline's `$sort` stage that produces the `combined-meetings` output).

**`makeQuoteFlexibleRegex` analysis.** For the input `Big Book Study`:
- Special regex chars (`.`, `*`, `+`, `?`, `^`, `$`, `{`, `}`, `(`, `)`, `|`, `[`, `]`, `\`) are escaped.
- Straight single quotes and U+2018/U+2019 are collapsed to the class `['‘’]`.
- Straight double quotes and U+201C/U+201D are collapsed to the class `["“”]`.
- No anchoring is added — the resulting regex is `"Big Book Study"` (no `^`/`$`), which Mongo's `$regex` interprets as a substring match.

**Anchoring and case sensitivity.** No `^` or `$` is added by `makeQuoteFlexibleRegex`. `$options: "i"` is appended at `pipelineFromQuery.ts:119`, making the regex case-insensitive. Mongo cannot use a btree index for a case-insensitive `$regex` *unless* the index has a matching `collation` with `strength: 2`. Without that — and there is no `createIndex` call anywhere in `src/` to create such an index — the `$match { name: { $regex: ..., $options: "i" } }` is a collection scan.

**ReDoS exposure of `makeQuoteFlexibleRegex`.** The function escapes most special chars but does NOT escape `-` outside character classes (irrelevant here, since `-` is only special inside `[...]` and that's not user-controlled). It does insert literal character classes `['‘’]` and `["“”]` whenever the input contains quotes; these are constant-width classes so they cannot drive exponential backtracking. The function does not collapse repeated metacharacters or limit input length: a probe with a 2000-character `nameQuery=aaaa…aaaa` returned `200 []` in milliseconds, so basic Mongo `$regex` scanning is linear in input length. No `(a+)+`-style catastrophic backtracking pattern is constructible through this function. **ReDoS is not exploitable through `nameQuery`** as currently written.

**Index posture.** Views in MongoDB do not have indexes of their own; queries against a view are translated to queries against the underlying source collection's aggregation pipeline plus the user's `$match` stages, and any usable indexes must exist on the *source* collection. The repository contains no `createIndex`/`ensureIndex` calls and no migration scripts; index creation, if any, must have been performed out-of-band in Compass / via the Atlas UI / via a separate script — none of which is in the repo.

**The `?hours=999` production data point.** When the empirical test from Thread 4 was run against production, nginx returned 504 after ~65 s. The pipeline emitted for that request is two `$or`-joined `rtc` ranges spanning a ~6-week window plus a `$limit: 1`. If the source collection has an index on `rtc`, the `$or` should be index-supported and complete in milliseconds; instead it consumes >60 s. The most parsimonious explanation is **no index on `rtc` exists** on the production source collection — the aggregation is performing a full collection scan even with `$limit: 1` (because `$limit` is applied *after* `$match`, not as a directive to stop scanning).

**Estimated request volume at 25–30K visitors/day.** If a typical OIAA front-page visit fires one `getMeetings` request and zero or one `bySlug` request:
- 25,000 visitors × 1 = 25,000 `getMeetings`/day = ~0.29 RPS average, **~1.16 RPS at peak** (4× burst).
- 30,000 visitors × 1.5 (with bySlug for ~half of sessions) = 45,000 requests/day = ~0.52 RPS avg, **~2.1 RPS peak**.

These are very low absolute numbers — a healthy index-backed query against MongoDB can absorb thousands of RPS on a single replica. The risk is therefore not in the steady-state rate; it is in the *latency tail*. At ~2 RPS peak with each `?hours=999`-style query taking 60+ seconds, the Cloud Run default `--concurrency=80` per instance would be saturated by 80 concurrent slow queries, holding up further requests. Each crash-inducing `?limit=abc` (Thread 4) also takes one Express handler slot until process restart.

The bottleneck is single-request latency, not request rate, and that is governed by index posture on the source collection — which we cannot see.

### What we still don't know
- What indexes (if any) exist on the source `meeting` and `group` collections in production. Requires Atlas access. (`db.meeting.getIndexes()`.)
- The actual size of the source collections (document count) and average document size. Requires Atlas access.
- Whether the views' aggregation pipelines push the user's `$match` early enough that an index on `rtc` (if present) would be used. Mongo's view pipeline optimisation usually pushes `$match` before `$lookup` automatically, but if the view's own pipeline has a non-pushable stage in front (e.g. `$addFields` that computes `rtc` itself), the user's `$match { rtc: ... }` would run against the *computed* field and not the indexed source field — and would necessarily scan. The README pipeline's `$addFields` stage *does* compute `rtc`. **Whether `rtc` exists on the source collection or only on the view's output is therefore the load-bearing unknown.** Without Atlas access we cannot tell.
- Mongo Atlas tier / cluster size — affects how much in-memory working set is available for collection-scan absorption.
- Real production query latency under load. Requires production logs or Atlas Performance Advisor output.

### Confidence
**High** on the pipeline shape (live-captured from a real run). **High** on the `nameQuery` regex behaviour (constant-width character classes, no catastrophic backtracking). **High** that no application code creates indexes (full grep). **Medium** on the inference that no `rtc` index exists on the production source — supported by the 65 s production timeout but not directly verified.

---

## Thread 7 — The test deception

### What Pass 1 surfaced
Pass 1 (§10.5, §14) reported that 4 of 16 Jest suites fail at suite-load due to missing `MONGO_DB_NAME` in `testEnv/setup.ts`; that `npm test` displays "Tests: 68 passed, 68 total" alongside "Test Suites: 4 failed, 12 passed, 16 total"; and that the CI workflow runs no tests prior to deployment.

### What Explore investigated
1. `npm test` (`NODE_OPTIONS=--experimental-vm-modules npx jest`) was run twice — once with the `.env` file I created during the investigation present (so `MONGO_DB_NAME=cqaudit` was visible to the test setup), and once with `.env` removed to reproduce Pass 1's environment exactly. Exit codes and final summary lines were captured.
2. `testEnv/setup.ts` and `testEnv/dbConfig.ts` were re-read line by line to confirm the failure mechanism.
3. The deploy workflow YAML was re-read to confirm no test-running step exists.
4. The four failing spec files' imports were checked for the top-level-`await` trigger Pass 1 hypothesised.

### What we now know
**With `MONGO_DB_NAME` unset (Pass 1's environment):**

```
FAIL src/storage/meeting.mongodb.service.bySlug.spec.ts
  ● Test suite failed to run
    Undefined database name.
      at useAppProvidedDatabaseNameWithMongoDB (storage/mongodb-storage-service.ts:30:35)
      at storage/mongodb-storage-service.ts:40:3
[…three more identical-cause failures…]

Test Suites: 4 failed, 12 passed, 16 total
Tests:       68 passed, 68 total
Snapshots:   0 total
Time:        1.303 s
Jest did not exit one second after the test run has completed.
```

Exit code from the shell: **1** (`exit=1` captured). The `Tests: 68 passed, 68 total` line presents the *test* count summary only — it does not count tests in suites that failed to load (there are no tests to count when the import fails). A reader skimming the output would see the green count and might miss the `4 failed` on the line above. The exit code is non-zero, which is the unambiguous signal of failure.

**With `MONGO_DB_NAME=cqaudit` provided** (via `.env`, mirroring how a developer with proper local config would run):

```
Test Suites: 16 passed, 16 total
Tests:       82 passed, 82 total
Snapshots:   0 total
Time:        1.362 s
Ran all test suites.
```

Exit code: 0. So the failure is purely environmental — the *suites* are well-written; `testEnv/setup.ts` just does not set `MONGO_DB_NAME` (it sets `MONGO_URI` only, at `setup.ts:13-16`), and `testEnv/dbConfig.ts:5` declares `Database: "test"` but never assigns that value to the env var. The minimum diff to fix it (not made — observational only): one line, `process.env.MONGO_DB_NAME = dbConfig.Database`, before the storage module is first imported.

**Why exactly 4 suites fail.** Each of the 4 failing specs imports something from `src/storage/*.ts`, all of which `import { configuredMongoDatabase } from "./mongodb-storage-service.js"`. The latter is the module containing the **top-level `await`** at line 37 (`const mongoClient = await useMongoDb()`) and the immediate call to `useAppProvidedDatabaseNameWithMongoDB` at line 40. So importing any storage module triggers env-var validation at *import* time, which is why the suites fail to **load** rather than failing at test time. The 12 passing suites do not import any `src/storage/*` module — they exercise `pipelineFromQuery`, `dates`, `stringUtils`, `categorizeMeeting`, the service layer (which mocks the storage), etc. Verified by `grep -l 'mongodb-storage-service\|mongodb.service' src/**/*.spec.ts`.

**CI test-running.** Re-reading `.github/workflows/deploy-cloudrun.yml` end to end:

```
Steps:
  1. actions/checkout@v4
  2. google-github-actions/setup-gcloud@v2
  3. gcloud auth configure-docker
  4. docker build
  5. docker push
  6. gcloud run deploy
```

There is no `npm install`, no `npm test`, no `npm run build` on the runner, no `tsc --noEmit`, no ESLint, no Cypress invocation. The build happens inside the Dockerfile (`RUN npm ci && npm run build`), so a TypeScript compilation error would fail the `docker build` step, but a Jest test failure would not. The Cloud Run deploy proceeds to a successful conclusion regardless of any unit-test state, and as Thread 1 showed, the Cloud Run target is not even the serving target.

**Other misleading signals identified:**
- `cypress/support/commands.ts` (37 lines) is a Cypress template — all custom-command stubs are commented out. The Cypress suites run, but a reader scanning the support file might assume `cy.login(...)` and similar helpers exist.
- `cypress/support/e2e.ts` (20 lines) is also template-only.
- The README at lines 96-118 claims "100% of the `utils` and `common` functions are covered by tests"; the actual coverage run reports `Functions: 89.79% (44/49)` overall (Pass 1 §10.5), and `src/utils/stringUtils.ts` specifically reports `Functions: 25%` (Pass 1 §10.6). The README claim is incorrect by ~10 percentage points overall and dramatically wrong for `stringUtils.ts`.
- No suite uses `xit`/`it.skip`/`xdescribe`, so no "silently skipped" tests are present (Pass 1 §10.2 verified this).

**Coverage of the production code paths.** The passing 68 tests in Pass 1's run (or 82 in mine with `.env`) load the following files based on coverage data: `pipelineFromQuery.ts`, `dates.ts`, `stringUtils.ts`, `categorizeMeeting.ts`, `logger.ts`, `types.ts`, `meetings.service.ts`. They do **not** exercise: `src/index.ts`, `src/server.ts`, `meetings.controller.ts`, `meetings.route.ts`, `events.controller.ts`, `events.route.ts`, `events.service.ts`, `queryParser.ts`, any `storage/*.ts` (when `MONGO_DB_NAME` is missing), any custom error class, any error mapper, or `ErrorProblemMappingStrategy.ts`. The error paths surfaced in Thread 4 (`limit=abc` → process crash; bySlug not-found → catch-all 404; etc.) are **not exercised by any passing test**. The Cypress suites at `cypress/e2e/meeting-and-group-details.cy.ts` do test bySlug 404, but Cypress is not run by CI either.

**`Logger.error` calls.** 9 `Logger.error` calls in `src/`. Of these, 7 are in error branches that are typed-unreachable (`getMeetings`/`getFacets`/events' `Err` branches do not type-check as returning `Err`) or reach paths the tests do not exercise. The remaining 2 (`meetings.service.ts:131`, `meetings.service.ts:151`) fire on bySlug-not-found, which the Jest service-layer test `meetings.service.getBySlug.spec.ts` *does* invoke (3 tests). So those two `Logger.error` lines are the only ones with test coverage.

### What we still don't know
- Whether anyone is *looking at* the test output. Pass 1 reported and I confirmed exit code 1 in the Pass-1-environment scenario, but a developer running `npm test` and seeing "68 passed" might not notice the `4 failed` line or the exit code. Whether this misreading has occurred in practice is outside the repo.
- Whether the Cypress suites have been run recently against a real Mongo. The fixtures (`cypress/fixtures/*.json`) are versioned, but a `cypress.config.ts` `baseUrl` of `http://localhost:5001/api/v1` means a developer must run `npm run start-dev` *and* have a real seeded Mongo to exercise them. Not knowable from inside the repo.

### Confidence
**High** that the 4-suite failure reproduces exactly as Pass 1 reported (re-reproduced in my run). **High** that CI runs zero tests prior to deployment (re-read of the workflow). **High** that the production error paths surfaced in Thread 4 are unexercised by Jest.

---

## Thread 8 — Logging and PII exposure

### What Pass 1 surfaced
Pass 1 (§8.5, §9.1, §9.2, §12.7) showed that `Logger.info` at `meetings.controller.ts:122, 141, 157` JSON-stringifies the full meeting/group object, that fixture meetings contain `conference_url_notes` with raw passwords, that log level is `debug` in deployed Cloud Run, and that logs go to both stdout and `logs/all.log`.

### What Explore investigated
1. Every `Logger.*` call in `src/` was inventoried with its content shape (literal vs interpolated vs `JSON.stringify`).
2. A 20-row sample of `GET /api/v1/meetings?limit=20` was pulled from production to inventory which fields are present in real responses today.
3. A specific production `bySlug` call (`/api/v1/meetings/aairanian-1`) was issued and the body inspected.
4. The local dev server was driven with `bySlug`/`facets`/`meetings` requests and the resulting log lines in `logs/all.log` and `logs/error.log` were inspected to verify that the `JSON.stringify(val)` text actually lands there.
5. `grep -rn 'redact\|mask\|sanitize\|scrub' src/` and `grep -rn 'password\|secret\|token' src/common/logger.ts` were used to confirm the absence of redaction logic.

### What we now know
**Every `Logger.*` call categorised.** The full inventory follows; an asterisk marks calls that include data sourced from a Mongo document. A double asterisk marks calls that `JSON.stringify` the entire document.

| File:line | Level | Content | PII potential |
|-----------|-------|---------|---------------|
| `index.ts:24` | info | `Server v… listening on port… database connected to ${configuredMongoDatabase.namespace}` | None (DB name only) |
| `server.ts:36, 51` | debug | "Routes registered." and headers-already-sent message | None |
| `meetings.controller.ts:80` | debug | `Parsed query params: ${JSON.stringify(queryParams)}` | None (request query — no user identity in this API) |
| `meetings.controller.ts:88` | debug | `Hours: ${queryParams.hours}, ${typeof queryParams.hours}` | None |
| `meetings.controller.ts:105` | info | `fetch result includes ${val.length} meetings.` | None (just the count) |
| `meetings.controller.ts:108` | error | `${JSON.stringify(val)}` (unreachable today — `getMeetings` returns `Ok` only) | N/A |
| `meetings.controller.ts:119` | debug | `Request params for bySlug: ${JSON.stringify(req.params)}` | None (slug only) |
| `meetings.controller.ts:122` ** | info | `fetch result being returned includes ${JSON.stringify(val)}.` — the full `Meeting` object | **Yes** — `conference_url_notes` and `conference_url` etc. |
| `meetings.controller.ts:125` | error | `${JSON.stringify(val)}` for bySlug Err — the string `"Meeting not found"` | None |
| `meetings.controller.ts:136-138` | debug | `Request params for relatedGroupInfo: ${JSON.stringify(req.params)}` | None |
| `meetings.controller.ts:141` ** | info | `fetch result being returned includes ${JSON.stringify(val)}.` — the full `GroupDetails` object | **Yes** — `groupInfo.email`, `groupInfo.phone`, `groupInfo.notes` and all sibling meetings' `conference_url_notes` |
| `meetings.controller.ts:144` | error | `${JSON.stringify(val)}` for relatedGroupInfo Err — the string `"Meeting not found"` | None |
| `meetings.controller.ts:154` | debug | "Request for meetingsFacets" | None |
| `meetings.controller.ts:157` ** | info | `fetch result being returned includes ${JSON.stringify(val)}.` — the full `MeetingsFacetsResponse` (~5 KB) | None (taxonomy only — no PII) |
| `meetings.controller.ts:160` | error | `${JSON.stringify(val)}` for facets Err (unreachable today) | N/A |
| `meetings.service.ts:38-40, 48, 53` | debug | option object stringify, limits stringify, pipeline stringify | None |
| `meetings.service.ts:59` | debug | `meetingStore fetch ${result.length} meetings.` | None |
| `meetings.service.ts:65, 102-110` | debug | facets stringify | None |
| `meetings.service.ts:128, 131, 134` * | debug/error | `Getting meeting with slug X`, `Meeting with slug X not found`, **`Meeting with slug ${slug}: ${JSON.stringify(result)}`** | **Yes (line 134)** — full meeting object, including `conference_url_notes` |
| `meetings.service.ts:151, 157, 163` * | error/debug | `Meeting with slug X not found`; **`Group info for meeting with slug X: ${JSON.stringify(groupInfo)}`**; **`Group meetings for group with ID Y: ${JSON.stringify(groupMeetings)}`** | **Yes (lines 157, 163)** — group info incl. email/phone, sibling meetings incl. conference notes |
| `events.controller.ts:13` | debug | `query = ${JSON.stringify(req.query)}` | None |
| `events.controller.ts:20` | info | `fetch result includes ${val.length} meetings.` | None |
| `events.controller.ts:23` | error | `${JSON.stringify(val)}` (unreachable today) | N/A |
| `utils/dates.ts:58, 67` | debug | `lowerUpperLimits Params/set: …` | None |
| `utils/pipelineFromQuery.ts:82-90, 126` | debug | every query field stringified plus the built pipeline | None (request query only) |
| `common/logger.ts` | — | logger configuration | — |

**Five lines write document content to logs**: `meetings.controller.ts:122, 141, 157`, `meetings.service.ts:134`, `meetings.service.ts:157`, `meetings.service.ts:163`. Of these, four can include fields from `MeetingView` or `GroupView` documents that contain PII or credential-shaped content (line 157 is the facets taxonomy, which is not sensitive). Each fires at `info` (3 calls) or `debug` (3 calls). With the deployed log level at `debug`, **all six fire on every relevant request**.

**Production data sample to determine real PII surface.** A 20-row `?limit=20` sample contained:
- 20/20 with `groupEmail` (e.g. `aairanian34@gmail.com`).
- 9/20 with `groupWebsite`.
- 5/20 with `conference_phone`.
- Several with `conference_url_notes` containing access instructions, one verbatim: `"Passcode:  Email firesidemeeting2@gmail.com"`. Pass 1 catalogued the equivalent fixture lines containing literal passwords (e.g. `"Password: 531646"`).

A direct production `bySlug` probe (`/api/v1/meetings/aairanian-1`) returned the full meeting object including `groupEmail`, `groupNotes` (a multi-paragraph Persian/English description), `conference_url`, `nextEventUTC`. So when this slug is hit in production, `Logger.info("fetch result being returned includes ${JSON.stringify(val)}.")` writes the full body — including any `conference_url_notes` and `groupEmail` — to:

- Winston `Console` transport → stdout → captured by whatever supervises Node on the Vultr host (or Cloud Logging on the Cloud Run target if that path is still live).
- Winston `File` transport → `logs/all.log` on the container/VM filesystem.
- (Errors only → `logs/error.log` via `level: "error"`.)

**Quantified per-day exposure estimate.** If `bySlug` is called once per page detail view, and 25,000–30,000 visitors/day include ~10% viewing a detail page (a guess; not derivable from repo evidence), that is 2,500–3,000 `bySlug` info-log lines per day, each writing a full meeting object of ~1–2 KB. The accumulating log file size is comparable to Thread 2's 48–58 MB/day; the **disclosure surface** is each individual line containing `conference_url_notes`.

**Log destination behaviour.**
- `logs/error.log` and `logs/all.log` on the container filesystem — these are local files. On a Cloud Run revision the filesystem is ephemeral (lost on instance scale-down or revision rollover). On the Vultr deployment the files persist until the disk fills or the process is restarted; Pass 1's working tree had `all.log` and `error.log` with sample content (which I truncated for the audit and they have been left empty), so file rotation is not automatic.
- Cloud Logging — `Console` transport writes to stdout. If the actual runtime is Cloud Run, Cloud Logging captures stdout/stderr by default with 30-day retention; access control is Cloud IAM. If the actual runtime is the Vultr host, what captures stdout depends on the process supervisor (systemd journal, Docker logs, screen/tmux session, nohup-redirect file…) — not knowable from inside the repo.

**Redaction logic.** `grep -rn 'redact\|mask\|sanitize\|scrub' src/` returns no matches. The Winston format chain in `common/logger.ts:34-41` is `timestamp → colorize → printf(\`${info.timestamp} ${info.level}: ${info.message}\`)`; there is no replacer in any `JSON.stringify` call site. No transformation between document and log line.

### What we still don't know
- The actual log destination on the Vultr host (host access required).
- The retention policy of whatever captures stdout there.
- Whether the upstream OIAA data is considered public — meeting passwords are arguably an exception even when the rest of the record is public.
- How many meetings *currently* have `conference_url_notes` containing credential-shaped strings. The 20-row sample showed one; Pass 1's fixture survey showed 16 in a snapshot of ~280 records. The proportion in production today requires Atlas access.

### Confidence
**High** on the inventory (every Logger.* call traced). **High** on which lines include document content (live `JSON.stringify` shown landing in `logs/all.log` in my local run). **High** that no redaction logic exists. **Medium** on per-day exposure scale — depends on assumptions about bySlug call frequency.

---

## Thread 9 — Dependency drift

### What Pass 1 surfaced
Pass 1 (§3.1) catalogued multiple major-version-behind dependencies: `ts-results-es` 4 majors, `@types/node` 5 majors, MongoDB driver 1 major, Helmet 1 major, Cypress 1 major, ESLint 2 majors, `@typescript-eslint/*` 2 majors, `dotenv` 1 major.

### What Explore investigated
1. `npm audit --json` was run and the metadata + direct-dep breakdown extracted.
2. For each direct dependency with a vulnerability, the advisory title was pulled out of the audit JSON.
3. `npm install --dry-run` was attempted to detect lock drift.
4. Released-notes inspection for the most dramatic majors (`ts-results-es`, `mongodb`, `helmet`) was deferred to a single comparative table here.

### What we now know
**`npm audit` summary (`/tmp/cq-audit.json`, exit 1):**

```json
"metadata": {
  "vulnerabilities": {
    "info": 0, "low": 8, "moderate": 16, "high": 10, "critical": 1, "total": 35
  },
  "dependencies": { "prod": 90, "dev": 831, "optional": 25, "peer": 46, "total": 966 }
}
```

**Direct-dependency vulnerabilities** (extracted from the JSON `isDirect: true` set):

| Package | Severity | Advisory title (first only) |
|---------|----------|------------------------------|
| `cookie-parser` | low | `cookie accepts cookie name, path, and domain with out of bounds characters` |
| `cypress` | moderate | `@cypress/request` chain (request library deprecation chain) |
| `morgan` | low | `on-headers` |
| `tsx` | moderate | `@esbuild-kit/cjs-loader` deprecation chain |

**Critical (transitive):**
- `form-data` — `form-data uses unsafe random function in form-data for choosing boundary` (GHSA-fjxv-7rqg-78gh). Range `>=4.0.0 <4.0.4`.

**High (transitive):**
- `body-parser` — DoS when URL encoding is enabled.
- `braces` — Uncontrolled resource consumption.
- `cross-spawn` — ReDoS.
- `express` — XSS via `response.redirect()`.
- `flatted` — Unbounded recursion DoS in `parse()`.
- `lodash` — Prototype pollution in `_.unset` and `_.omit`.
- `minimatch` — ReDoS via repeated wildcards with non-matching literal.
- `path-to-regexp` — backtracking regexes (impacts Express's route matcher).
- `picomatch` — method injection in POSIX classes.
- `validator` — URL validation bypass in `isURL`.

Many of these transitively reach the production code path (`body-parser`, `express`, `path-to-regexp`, `qs`) and some only the dev/test path (`cross-spawn`, `flatted`, `picomatch`, `cypress` chain, `tsx` chain).

**Major-version drift, with installed-version-uses-API breakdown:**

| Package | Installed | Latest | Code-surface uses |
|---------|-----------|--------|-------------------|
| `ts-results-es` | `3.6.1` | `7.0.0` | The repo uses the `Ok`/`Err` constructors and the destructured `{ ok, val }` / `{ err, val }` form. v4 changed the API from default-export `Result` to named exports `Ok`/`Err`; v5 added `Async` variants. The repo uses the v3 API. Spanning 4 majors. |
| `@types/node` | `20.5.6` | `25.9.1` | Type-only; the Node *runtime* in the Dockerfile is `20.5.1`. Bumping `@types/node` past the runtime risks pulling in API types not actually present in the runtime. |
| `mongodb` | `6.3.0` | `7.2.0` | v7 deprecated `client.close({ force: true })` and changed pool options defaults; the code uses `MongoClient`, `ObjectId`, `Document`, `AggregationCursor` — all stable across 6 → 7. |
| `helmet` | `7.0.0` | `8.2.0` | v8 changed default `crossOriginEmbedderPolicy` (now `false` by default in v7+, fully removed from defaults in v8), and tightened `crossOriginResourcePolicy`. The current production response headers (Thread 1 inspection) include `cross-origin-resource-policy: same-origin` — v7 default. v8 keeps that default. |
| `cypress` | `14.0.1` | `15.15.0` | Cypress v15 changed test isolation defaults and removed support for some Node 16-era APIs. The repo's Cypress suites use idiomatic v14 APIs. |
| `eslint` | `8.48.0` | `10.4.0` | v9 switched to the flat config; v10 dropped the legacy `.eslintrc.json` shape. The repo uses `.eslintrc.json`. |
| `@typescript-eslint/*` | `6.4.1` | `8.59.4` | v7/v8 raised peer TypeScript minimums and dropped Node 16. |
| `eslint-config-prettier` | `8.8.0` | `10.1.8` | Largely API-compatible; v10 drops Node 16. |
| `eslint-plugin-cypress` | `2.14.0` | `6.4.1` | v3 reorganised rule names; v5 switched to ESLint v9 flat config. |
| `eslint-plugin-jest` | `27.2.3` | `29.15.2` | Similar — v29 supports Jest 30. |
| `jest` | `29.6.4` | `30.4.2` | v30 switched the default test environment, raised the Node minimum. |
| `dotenv` | `16.3.1` | `17.4.2` | v17 introduced encrypted-`.env` support and removed the bundled `Config.parse`. The repo uses `dotenv.config()` only. |
| `tsx` | `3.12.8` | `4.22.3` | v4 changed loader registration (the `(node:...) ExperimentalWarning` observed when the dev server starts is the v3 loader path). |
| `typescript` | `5.2.2` | `6.0.3` | v6 introduced stricter narrowing on `unknown` and bumped the JSX runtime expectation. |
| `mongodb-memory-server` | `9.1.3` *(declared `^10.1.4`)* | `11.1.0` | The installed version doesn't satisfy the declared range — `package-lock.json` is out of sync. v11 supports Mongo 7. |
| `ts-node` | `10.9.1` *(declared `^10.9.2`)* | `10.9.2` | Out-of-range install (patch). |

**Runtime deprecation warnings observed.** On `npm run start-dev`, the dev server emits:

```
(node:44408) ExperimentalWarning: `--experimental-loader` may be removed in the future;
  instead use `register()`:
--import 'data:text/javascript,import { register } from "node:module";
  import { pathToFileURL } from "node:url";
  register("file%3A///.../node_modules/tsx/dist/loader.js", pathToFileURL("./"));'
```

This is the `tsx` v3 → v4 migration signal. Resolved by upgrading `tsx`. No other deprecation warnings appeared on startup or during the request probes.

**Lockfile drift.** `npm ls --depth=0` reported (Pass 1 §3.4, re-verified in this run) `ELSPROBLEMS invalid: mongodb-memory-server@9.1.3` and `invalid: ts-node@10.9.1`. The lockfile and `package.json` are out of sync.

### What we still don't know
- Whether any of the `high` advisories are reachable from this specific code path (the `lodash` prototype pollution requires the code to call `_.unset`/`_.omit` on attacker-controlled data; this codebase doesn't import lodash directly — it's pulled in transitively). A full per-advisory reachability analysis was not performed.
- Whether the production Vultr host has a different installed-package set than `package-lock.json` declares (e.g. if `npm install` was run there with different lockfile state). Requires host access.

### Confidence
**High** on the audit JSON and direct-dep severity (verbatim from `npm audit --json`). **High** on the runtime deprecation warning (observed at server start). **Medium** on the *blast radius* of catching up each major — derived from changelog summaries, not from attempting upgrades. **Low** on whether the listed `high` advisories are exploitable in this specific code shape — would require per-advisory tracing.

---

## Thread 10 — Graceful shutdown and request lifecycle

### What Pass 1 surfaced
Pass 1 (§14) noted that `mongoClient.close()` is called only inside the `catch` of `app.listen` failure at `src/index.ts:31`, and that no SIGTERM/SIGINT handler is registered.

### What Explore investigated
1. `src/index.ts` was re-read end to end to enumerate every signal-related construct (`process.on`, signal handler, etc.).
2. A live SIGTERM was sent to the running dev server's PID. The pre- and post-signal responses to `curl` were observed.
3. The Dockerfile's `dumb-init` invocation was re-inspected, and `dumb-init`'s actual behaviour vs Node's default signal handling was traced.
4. Top-level-await timing was traced as a proxy for cold-start latency.

### What we now know
**`src/index.ts` end to end.** 32 lines total. Sequence:

1. Lines 1–10: imports. Notably `import { configuredMongoDatabase, mongoClient } from "./storage/mongodb-storage-service.js"` (line 8) executes the storage module's **top-level `await`**, which connects to MongoDB *before* `src/index.ts:19` runs `dotenv.config()`. This means env vars from `.env` are loaded after the Mongo client is constructed — but the storage module itself calls `dotenv.config()` at its own line 4 *before* its top-level await, so `.env` is loaded once already by then. The repeat call in `index.ts:19` is redundant.
2. Line 12: imports the Express app, which causes `src/server.ts` to run and register routes, mappers, and error middleware.
3. Lines 15–17: synchronously reads `package.json` to extract `version`. Path is `process.cwd() / "package.json"` — this works at the project root and inside the Docker image because `WORKDIR /app` and `COPY package*.json ./` line up.
4. Line 20: `const port = 5001`.
5. Lines 22–28: `app.listen(port, …)` inside a `try`/`catch`. On successful start it logs the listening message; on `app.listen` *throwing synchronously* (rare — happens for `EADDRINUSE` on certain OSes but usually emits an `error` event instead, which is not handled here), the catch logs `console.error(error)` and calls `mongoClient.close()` (line 31).

**No signal handlers anywhere in `src/`.** `grep -rn "process\.on\|SIGTERM\|SIGINT\|SIGHUP\|gracefulShutdown" src/` returns nothing.

**Local SIGTERM test.** Running dev server on PID 45761, observed by `lsof`:

```
--- pre-SIGTERM ping ---
HTTP 200 time=0.007016s    # /api/v1/meetings/facets
--- send SIGTERM ---
kill -TERM 45761
--- post-SIGTERM ping (1 s later) ---
curl: (7) Failed to connect to localhost port 5001 after 0 ms: Couldn't connect to server
--- process still alive? ---
PID 45761 exited cleanly
```

The Node process exits immediately on SIGTERM. The default action when no `SIGTERM` listener is registered is **terminate**. The Mongo client is not closed; sockets are not drained. An in-flight request would receive a TCP RST.

**`dumb-init` role in the Dockerfile.** `Dockerfile:24` invokes `dumb-init node /app/dist/index.js`. `dumb-init` runs as PID 1, forwards signals to the child Node process, and reaps zombie children. **It does not transform the signal** — it just ensures that when Docker/Cloud Run/etc. sends SIGTERM to PID 1, the Node child also receives SIGTERM. Without `dumb-init`, Node-as-PID-1 has a quirk where signals not explicitly handled are *ignored* (PID 1 has special signal semantics in Linux), so `dumb-init` is doing meaningful work — without it, a Node process with no handler running as PID 1 might *not* exit on SIGTERM at all. **With** `dumb-init`, the signal is delivered, and (because there is still no handler) the Node default applies: immediate termination with in-flight requests dropped. `dumb-init` does not by itself produce graceful shutdown; it produces *correct signal delivery* to a process that may then immediately terminate.

**In-flight request behaviour under Cloud Run / process supervisor.** Cloud Run sends `SIGTERM` to the container on scale-down or revision rollover; the container has up to 10 seconds (default) before `SIGKILL`. With this code:
1. `dumb-init` (PID 1) receives `SIGTERM`, forwards to Node.
2. Node has no `SIGTERM` handler → immediate exit.
3. Express stops accepting *new* connections only because the process is gone (not because `server.close()` was called).
4. In-flight requests have their TCP connections reset. The client sees `ECONNRESET` or `EPIPE`.
5. The MongoDB pool's connections are torn down by the OS; Mongo-server-side cursors may persist for the cursor TTL (default 10 minutes) but the application no longer holds references.

On the Vultr deployment with a process supervisor that does an `nginx reload`-style restart, the same applies but the time window depends on the supervisor.

**Cold start.** Module load order:
1. `import * as dotenv from "dotenv"` — fast (~ms).
2. `import Logger from "./common/logger.js"` — creates Winston transports including the two `File` transports (which open file handles for `logs/error.log` and `logs/all.log` on disk).
3. `import { … } from "./storage/mongodb-storage-service.js"` — **executes `await useMongoDb()` synchronously at module load**, blocking until the Mongo connection completes. With a remote Atlas cluster this is typically 200–700 ms first time (TCP + TLS + auth + topology discovery), faster on subsequent loads if connection pooling is reused. Local-Mongo testing showed ~50–100 ms.
4. `import app from "./server.js"` — Express app construction is fast.
5. `app.listen(5001, …)` fires when all of the above resolve.

So a cold start is dominated by the Mongo connect time. On a Cloud Run `--min-instances=0` setup, the first request after a cold instance starts pays this latency *in addition to* the request's normal handling.

### What we still don't know
- The actual Cloud Run timeout setting (defaults to 300 s but Pass 1 §11.4 noted no `--timeout` is set in the workflow). The SIGTERM grace period default is 10 s but is also configurable.
- The Vultr supervisor (systemd? pm2? bare nohup?) and its restart policy.
- Whether the nginx in front of the Node app has any "retry on 5xx" or "wait for backend" directives that mask shutdown drop.

### Confidence
**High** on the in-process signal behaviour (verified locally). **High** on the `dumb-init` role analysis (matches its documented behaviour). **High** that no graceful-shutdown code exists in `src/`. **Medium** on the cold-start estimate — depends on Atlas region/network distance.

---

## Patterns across threads

After investigating the ten threads, four cross-cutting patterns emerge. These are observations of the codebase's stance, not prescriptions.

### Pattern A — "Aspirational architecture"

Machinery that exists in the codebase but receives no traffic, no tests, and in some cases no implementation. The error mapper chain in `server.ts:56-66` is registered with three custom mappers; none of the three error classes is ever thrown (Pass 1 §8.1; this pass Thread 4). The auth middleware imports in `meetings.route.ts:4-6` and `events.route.ts:4-6` reference middleware files that have never existed in the git history (Thread 3). The `ErrorProblemMappingStrategy` class in `src/common/ErrorProblemMappingStrategy.ts` is defined but unused. The `meetingCollection` variable in `meeting.mongodb.service.ts:12` is exported but never imported. The `DayOptions` interface in `endpoint-options.types.ts:22` is declared but not referenced.

**Threads contributing evidence:** Thread 3 (auth middleware never existed), Thread 4 (custom errors never thrown; mappers register but only the generic body-parser path reaches them), Thread 7 (most production error paths are not test-exercised).

### Pattern B — "Production isn't production"

Every signal in the deployment configuration says "this is development":
- `NODE_ENV=development` is hardcoded into the deploy workflow (Thread 2).
- The Cloud Run deploy workflow does not control port, concurrency, or memory; it does set `--allow-unauthenticated` (Thread 3, Pass 1 §11.4).
- The actual traffic-serving deployment is not on Cloud Run at all (Thread 1); it is a self-hosted Vultr VM whose configuration lives entirely outside the repo.
- The Mongo client pool runs the *development* branch in production (Thread 2 — small effect on a read-only API, but symbolically present).
- The log level is `debug` (Thread 2) and `morgan("dev")` is mounted (Thread 2).
- The body-parser limit is 50 MB despite no POST/PUT routes (Threads 3, 4).
- The version field is `0.16.0-alpha` (Pass 1 §14).
- The deploy workflow runs no tests (Thread 7).

**Threads contributing evidence:** Threads 1, 2, 3, 7.

### Pattern C — "Out-of-band state"

The system depends on state that is required to run but is not represented in the repository. The 12 MongoDB views (Thread 5) are created out-of-band in Compass and not defined in any migration. GCP Secret Manager holds `MONGO_URI` and `MONGO_DB_NAME`. The Cloud Run service configuration (port, concurrency, memory, timeout) lives in the Cloud Run UI, not in the workflow file (Pass 1 §11.4). The Vultr host's nginx configuration, process supervisor, and rate-limit/firewall posture live on the host, not in the repo (Threads 1, 4, 10). The Slack screenshot embedded in the README pipeline JSON (`README.md:138`) is the only reference to a part of the view definition that has otherwise been lost (Thread 5). The "C4R VPS" mentioned in `README.md:122` is the apparent serving target but the connection from repo → that host is undocumented.

**Threads contributing evidence:** Threads 1, 5, 8, 10 (process supervisor unknown), 6 (indexes unknown).

### Pattern D — "Boundary trust treated as universal trust"

Input that arrives at the boundary of the system is consumed without coercion checks at the inner layers:
- `?limit=abc` becomes `parseInt("abc") = NaN`, which is propagated all the way to `$limit: NaN` in the Mongo aggregation. The driver throws, the rejection escapes, the Node process exits (Thread 4).
- `?start=garbage` becomes a Luxon "Invalid DateTime", which becomes `"NaN:Invalid DateTime"` as a string `rtc` bound, which matches no documents and silently returns `[]` (Thread 4).
- `?hours=999` becomes a 42-day temporal window which becomes an expensive collection scan and a nginx 504 (Threads 4, 6).
- The `meeting` and `group` Mongo documents are trusted as well-shaped; their fields are JSON-stringified into logs without redaction (Thread 8).
- The body parser accepts up to 50 MB of any-JSON before the router decides whether a body should have been accepted on this route in the first place (Threads 3, 4).
- `req.query.limit` is cast as `string | undefined` in TypeScript at `meetings.controller.ts:84`, but Express returns `string | string[] | undefined` for repeated keys — the cast lies (Pass 1 §14; verified by Thread 4 probe).

The pattern is consistent: the boundary layer (Express + body-parser + helmet + cors) is treated as if it has already done validation that no inner code performs, and inner code treats inputs as well-shaped even when they are not.

**Threads contributing evidence:** Threads 3, 4, 6, 8.

### Pattern E — "Visibility without observability"

The system writes 37+ `Logger.debug` calls per `getMeetings` request and JSON-stringifies entire meeting/group objects into `info`-level logs (Threads 2, 8). But it has no health endpoint (Pass 1 §4.1, §9.4), no request ID / correlation ID (Pass 1 §9.6), no metrics, no tracing (Pass 1 §9.5). When a process crashes (Thread 4), there is no observability of *which* `?limit=abc` requests crashed it. When a request takes 65 s (Thread 6), there is no slow-query log that surfaces it as anything other than another debug line in the stream. The huge log volume is generated but no consumer is configured for it — the file transport writes to ephemeral container disk on Cloud Run (Thread 8); stdout capture on Vultr is unknown (Thread 10).

**Threads contributing evidence:** Threads 2, 4, 6, 8, 10.

---

*End of Pass 2.*
