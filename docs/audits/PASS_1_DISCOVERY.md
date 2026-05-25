# Central-Query Audit — Pass 1: Discover

**Repository:** central-query (Express + TypeScript REST API)
**Branch at time of audit:** `main`
**Audit date:** 2026-05-25
**Auditor:** Claude (Claude Code)
**Framework:** TrustTech 3 Pass Audit — Pass 1 of 3 (Discover)

This document is a factual map of the repository as it exists today. It does not recommend, rank, or prescribe. Where the codebase disagrees with its own documentation, the disagreement is recorded without resolution.

---

## 1. Repository inventory

### 1.1 Top-level layout (2 levels)

```
.
├── .claude/
│   └── settings.local.json
├── .dockerignore
├── .eslintignore
├── .eslintrc.json
├── .github/
│   └── workflows/
│       └── deploy-cloudrun.yml
├── .gitignore
├── .prettierrc
├── CLAUDE.md
├── Dockerfile
├── LICENSE
├── README.md
├── cypress/
│   ├── e2e/          (7 .cy.ts spec files)
│   ├── fixtures/     (4 .json files)
│   ├── support/      (commands.ts, e2e.ts)
│   └── tsconfig.json
├── cypress.config.ts
├── dist/             (build output; gitignored, present locally)
├── globalConfig.json
├── jest.config.ts
├── logs/             (gitignored, present locally — all.log, error.log)
├── node_modules/     (gitignored)
├── package-lock.json
├── package.json
├── src/
│   ├── common/       (custom_errors/, error_mappers/, types.ts, logger.ts, http-status-codes.ts, ErrorProblemMappingStrategy.ts)
│   ├── storage/      (5 source files + 4 .spec files)
│   ├── utils/        (5 source files + 8 .spec files)
│   ├── endpoint-options.types.ts
│   ├── endpoints.types.ts
│   ├── events.controller.ts
│   ├── events.route.ts
│   ├── events.service.ts
│   ├── index.ts
│   ├── meetings.controller.ts
│   ├── meetings.route.ts
│   ├── meetings.service.ts
│   ├── meetings.service.getBySlug.spec.ts
│   ├── meetings.service.getFacets.spec.ts
│   ├── meetings.service.getMeetings.spec.ts
│   ├── meetings.service.getRelatedGroupInfo.spec.ts
│   └── server.ts
├── testEnv/
│   ├── dbConfig.ts
│   ├── setup.ts
│   └── teardown.ts
└── tsconfig.json
```

### 1.2 File count by extension (excluding `node_modules/`, `.git/`, `dist/`)

| Extension       | Count |
|-----------------|-------|
| `.ts`           | 62    |
| `.json`         | 11    |
| `.md`           | 2     |
| `.log`          | 2     |
| `.yml`          | 1     |
| `.prettierrc`   | 1     |
| `.gitignore`    | 1     |
| `.eslintignore` | 1     |
| `.dockerignore` | 1     |

Of the 62 `.ts` files: 16 are `*.spec.ts` (Jest), 7 are `*.cy.ts` (Cypress), 39 are non-test `.ts` (source, config, support).

### 1.3 Lines of code by area (`wc -l` totals)

| Area              | Lines |
|-------------------|-------|
| `src/` (non-spec) | 1,603 |
| `src/` (`*.spec.ts` only) | 1,913 |
| `cypress/` (`.ts`)| 775   |
| `testEnv/` (`.ts`)| 43    |

Test code (Jest specs + Cypress + testEnv) totals 2,731 lines; production source in `src/` totals 1,603 lines.

### 1.4 Presence/absence of standard files

| File | Present? |
|------|----------|
| `README.md` | Yes (286 lines) |
| `CHANGELOG.md` | No |
| `LICENSE` | Yes (MIT, 21 lines) |
| `.env.example` / `.env.sample` | No |
| `CONTRIBUTING.md` | No |
| `SECURITY.md` | No |
| `.editorconfig` | No |
| `.nvmrc` | No |
| `Dockerfile` | Yes |
| CI workflows | Yes (1 file: `.github/workflows/deploy-cloudrun.yml`) |
| `CLAUDE.md` | Yes (74 lines) — uncommitted in the working tree at the time of this audit |

---

## 2. Runtime and build configuration

### 2.1 Node version sources

| Source | Declared Node version |
|--------|-----------------------|
| `.nvmrc` | File does not exist |
| `package.json` `engines` field | Not declared |
| `Dockerfile` build stage | `FROM node:latest` (`Dockerfile:2`) |
| `Dockerfile` final stage | `FROM node:20.5.1-bookworm-slim` (`Dockerfile:13`) |
| `.github/workflows/deploy-cloudrun.yml` | Does not configure Node directly; uses the Dockerfile via `docker build` |
| Local machine running audit | `node v22.12.0`, `npm 10.9.0` |

### 2.2 Module system

| Setting | Value | Source |
|---------|-------|--------|
| `"type"` | `"module"` | `package.json:46` |
| `"module"` | `"ES2022"` | `tsconfig.json:5` |
| `"moduleResolution"` | `"Node"` | `tsconfig.json:6` |
| `"target"` | `"ES2022"` | `tsconfig.json:4` |
| `"esModuleInterop"` | `true` | `tsconfig.json:8` |
| `"allowSyntheticDefaultImports"` | `true` | `tsconfig.json:7` |

### 2.3 Scripts (`package.json:scripts`, verbatim)

| Script | Command |
|--------|---------|
| `start` | `node dist/index.js` |
| `start-dev` | `tsx --watch -- src/index.ts` |
| `test` | `NODE_OPTIONS=--experimental-vm-modules npx jest` |
| `test-dev` | `NODE_OPTIONS=--experimental-vm-modules npx jest --watch` |
| `build:clean` | `rm -rf dist/*` |
| `build` | `npm run build:clean && tsc --project tsconfig.json` |

No `lint`, `format`, `typecheck`, or `cypress` scripts are declared. ESLint, Prettier, and Cypress are installed but invoked directly via `npx` if used.

### 2.4 `tsconfig.json` strictness settings (actual values)

Only the keys explicitly set in `tsconfig.json` are listed. Strictness flags not listed below are absent from the file and therefore use TypeScript's defaults (`false` for all `strict*` flags).

| Flag | Value |
|------|-------|
| `strict` | **not set** |
| `noImplicitAny` | **not set** |
| `strictNullChecks` | **not set** |
| `strictFunctionTypes` | **not set** |
| `strictBindCallApply` | **not set** |
| `strictPropertyInitialization` | **not set** |
| `noImplicitThis` | **not set** |
| `alwaysStrict` | **not set** |
| `noUncheckedIndexedAccess` | **not set** |
| `noImplicitReturns` | **not set** |
| `noFallthroughCasesInSwitch` | **not set** |
| `exactOptionalPropertyTypes` | **not set** |

The file as-committed:

```json
{
  "compilerOptions": {
    "outDir": "./dist",
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "Node",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "types": ["jest", "node"]
  },
  "include": ["src/**/*.ts", "migrate/migrateData.ts"],
  "exclude": ["node_modules", "./dist/**/*"]
}
```

`include` references `migrate/migrateData.ts`; no `migrate/` directory exists in the repo.

### 2.5 Build output

- `outDir`: `./dist`
- `include`: `src/**/*.ts`, `migrate/migrateData.ts` (the latter does not exist on disk)
- `exclude`: `node_modules`, `./dist/**/*`
- `build:clean` removes `dist/*` before each build (`package.json:11`)
- `package.json:main` → `./dist/index.js`; `package.json:exports["."]` → `./dist/index.js`; `package.json:types` → `./dist/index.d.ts` (note: TS config does not set `declaration: true`, so `.d.ts` files are not currently emitted)

---

## 3. Dependencies

### 3.1 Declared vs latest (from `npm view <pkg> version`, run 2026-05-25)

`installed` = the version installed in `node_modules` (from `npm ls --depth=0`).
`declared` = the semver range in `package.json`.
`latest` = the latest version published to the npm registry.

#### `dependencies`

| Name | Declared | Installed | Latest | Major behind? |
|------|----------|-----------|--------|---------------|
| `@code4recovery/spec` | `^1.1.4` | `1.1.4` | `1.1.9` | No (patch) |
| `cookie-parser` | `^1.4.6` | `1.4.6` | `1.4.7` | No (patch) |
| `cors` | `^2.8.5` | `2.8.5` | `2.8.6` | No (patch) |
| `dotenv` | `^16.3.1` | `16.3.1` | `17.4.2` | **Yes — 1 major** |
| `express-http-problem-details` | `^0.2.1` | `0.2.1` | `0.2.1` | No |
| `express-validator` | `^7.0.1` | `7.0.1` | `7.3.2` | No (minor) |
| `helmet` | `^7.0.0` | `7.0.0` | `8.2.0` | **Yes — 1 major** |
| `http-problem-details-mapper` | `^0.1.7` | `0.1.7` | `0.1.7` | No |
| `luxon` | `^3.4.2` | `3.4.2` | `3.7.2` | No (minor) |
| `mongodb` | `^6.3.0` | `6.3.0` | `7.2.0` | **Yes — 1 major** |
| `morgan` | `^1.10.0` | `1.10.0` | `1.10.1` | No (patch) |
| `ts-results-es` | `^3.6.1` | `3.6.1` | `7.0.0` | **Yes — 4 majors** |
| `winston` | `^3.10.0` | `3.10.0` | `3.19.0` | No (minor) |

#### `devDependencies`

| Name | Declared | Installed | Latest | Major behind? |
|------|----------|-----------|--------|---------------|
| `@types/cookie-parser` | `^1.4.3` | `1.4.3` | `1.4.10` | No |
| `@types/cors` | `^2.8.13` | `2.8.13` | `2.8.19` | No |
| `@types/jest` | `^29.5.4` | `29.5.4` | `30.0.0` | **Yes — 1 major** |
| `@types/luxon` | `^3.3.1` | `3.3.1` | `3.7.1` | No |
| `@types/morgan` | `^1.9.5` | `1.9.5` | `1.9.10` | No |
| `@types/node` | `^20.5.6` | `20.5.6` | `25.9.1` | **Yes — 5 majors** |
| `@typescript-eslint/eslint-plugin` | `^6.4.1` | `6.4.1` | `8.59.4` | **Yes — 2 majors** |
| `@typescript-eslint/parser` | `^6.4.1` | `6.4.1` | `8.59.4` | **Yes — 2 majors** |
| `cypress` | `^14.0.1` | `14.0.1` | `15.15.0` | **Yes — 1 major** |
| `eslint` | `^8.48.0` | `8.48.0` | `10.4.0` | **Yes — 2 majors** |
| `eslint-config-prettier` | `^8.8.0` | `8.8.0` | `10.1.8` | **Yes — 2 majors** |
| `eslint-plugin-cypress` | `^2.14.0` | `2.14.0` | `6.4.1` | **Yes — 4 majors** |
| `eslint-plugin-import` | `^2.28.1` | `2.28.1` | `2.32.0` | No |
| `eslint-plugin-jest` | `^27.2.3` | `27.2.3` | `29.15.2` | **Yes — 2 majors** |
| `eslint-plugin-node` | `^11.1.0` | `11.1.0` | `11.1.0` | No |
| `eslint-plugin-prettier` | `^5.0.0` | `5.0.0` | `5.5.5` | No |
| `jest` | `^29.6.4` | `29.6.4` | `30.4.2` | **Yes — 1 major** |
| `mongodb-memory-server` | `^10.1.4` | `9.1.3` *(invalid — see §3.4)* | `11.1.0` | **Yes — installed is 2 majors behind latest, and 1 major behind declared** |
| `prettier` | `^3.0.2` | `3.0.2` | `3.8.3` | No |
| `ts-jest` | `^29.1.1` | `29.1.1` | `29.4.11` | No |
| `ts-node` | `^10.9.2` | `10.9.1` *(invalid — see §3.4)* | `10.9.2` | No (the installed `10.9.1` is older than the declared `^10.9.2`) |
| `tsx` | `^3.12.8` | `3.12.8` | `4.22.3` | **Yes — 1 major** |
| `typescript` | `^5.2.2` | `5.2.2` | `6.0.3` | **Yes — 1 major** |

### 3.2 Deprecation notices

`npm view <pkg> deprecated` returned no deprecation strings for any of the 35 direct dependencies checked. `npm audit` notes deprecation of transitive packages indirectly (e.g. `@esbuild-kit/cjs-loader`, `@esbuild-kit/esm-loader` flagged via vulnerability records); none of the *direct* dependencies appears as deprecated on npm at the time of audit.

### 3.3 `npm audit` summary

Full JSON output was generated and is available at the source — what follows is the metadata block plus per-package severity, verbatim.

```json
"metadata": {
  "vulnerabilities": {
    "info": 0,
    "low": 8,
    "moderate": 16,
    "high": 10,
    "critical": 1,
    "total": 35
  },
  "dependencies": {
    "prod": 90,
    "dev": 831,
    "optional": 25,
    "peer": 46,
    "peerOptional": 0,
    "total": 966
  }
}
```

Vulnerable packages reported (severity in brackets, `isDirect` flag noted):

- `@babel/helpers` (moderate, transitive)
- `@cypress/request` (moderate, transitive of cypress)
- `@esbuild-kit/cjs-loader` (moderate, transitive of tsx)
- `@esbuild-kit/core-utils` (moderate, transitive of tsx)
- `@esbuild-kit/esm-loader` (moderate, transitive of tsx)
- `ajv` (moderate, transitive)
- `body-parser` (high, transitive of express)
- `brace-expansion` (moderate, transitive)
- `braces` (high, transitive)
- `cookie` (low, transitive of cookie-parser and express)
- `cookie-parser` (low, **direct**)
- `cross-spawn` (high, transitive)
- `cypress` (moderate, **direct**) — fix advertised as `cypress@13.14.2` and flagged `isSemVerMajor: true`
- `diff` (low, transitive)
- `esbuild` (moderate, transitive of tsx)
- `express` (high, transitive)
- `flatted` (high, transitive)
- `follow-redirects` (moderate, transitive)
- `form-data` (**critical**, transitive)
- `js-yaml` (moderate, transitive)
- `lodash` (high, transitive)
- `micromatch` (moderate, transitive)
- `minimatch` (high, transitive)
- `morgan` (low, **direct**)
- `on-headers` (low, transitive of morgan)
- `path-to-regexp` (high, transitive of express)
- `picomatch` (high, transitive)
- `qs` (moderate, transitive of express, body-parser, @cypress/request)
- `send` (low, transitive)
- `serve-static` (low, transitive)
- `tmp` (low, transitive)
- `tsx` (moderate, **direct**)
- `uuid` (moderate, transitive of @cypress/request)
- `validator` (high, transitive)
- `yauzl` (moderate, transitive of mongodb-memory-server)

Direct dependencies appearing in this list: `cookie-parser`, `cypress`, `morgan`, `tsx`. The single `critical` finding is `form-data` (CVE: unsafe random for boundary; range `>=4.0.0 <4.0.4`).

### 3.4 Lockfile / install drift (`npm ls --depth=0`)

`npm ls` reports `ELSPROBLEMS` with two invalid installations:

```
npm error invalid: mongodb-memory-server@9.1.3 /Users/.../node_modules/mongodb-memory-server
npm error invalid: ts-node@10.9.1 /Users/.../node_modules/ts-node
```

| Package | `package.json` requires | Installed | Note |
|---------|------------------------|-----------|------|
| `mongodb-memory-server` | `^10.1.4` | `9.1.3` | Installed version does not satisfy declared range |
| `ts-node` | `^10.9.2` | `10.9.1` | Installed version does not satisfy declared range |

`package-lock.json` is present (~435 KB).

---

## 4. Endpoint surface

### 4.1 Mount points (`src/server.ts:49-50`)

- `/api/v1/meetings` → `meetings.route.ts`
- `/api/v1/events` → `events.route.ts`

A catch-all 404 handler is registered at `src/server.ts:52-54`:
```ts
app.use("*", (req, res) => res.status(404).send("Sorry, can't find that!"))
```

No `/health`, `/healthz`, `/ping`, `/status`, or readiness/liveness endpoints exist. Grep of `src/` for those strings returned no matches.

### 4.2 Routes

#### `GET /api/v1/meetings`
- **Route declaration:** `src/meetings.route.ts:11-17`
- **Controller:** `meetingsController.meetings` (`src/meetings.controller.ts:49-111`)
- **Service:** `meetingsService.getMeetings` (`src/meetings.service.ts:35-62`)
- **Reads from request:** `req.query` (entire object cast to `Record<string, string>`), `req.query.limit` separately as raw string. Parsed keys: `scheduled` (boolean), `type` (string), `formats` (array), `features` (array), `communities` (array), `hours` (number), `start` (string), `languages` (array), `nameQuery` (string).
- **Response on success:** `res.status(200).json(val)` where `val` is `Meeting[]` (interface in `src/endpoints.types.ts:24-34`).
- **Error path:** if service returns `Err`, controller calls `next(val)`. The service signature is currently `Promise<Ok<Meeting[]>>` (`meetings.service.ts:37`) — the `Err` branch in the controller (`meetings.controller.ts:107-110`) is unreachable as typed.
- **Middleware applied:** none active. Commented-out middleware (`meetings.route.ts:12-15`):
  - `// TokenMiddleWare.extractAPIToken,`
  - `// query("apiToken").isString().isLength({ min: 64, max: 64 }),`
  - `// verifyFieldsErrors,`
  - `// AuthorizationMiddleware.isTokenAuthorized,`
- **Documented:** Yes — `README.md:42-65` and `CLAUDE.md` "Architecture" section.

#### `GET /api/v1/meetings/facets`
- **Route:** `src/meetings.route.ts:19`
- **Controller:** `meetingsController.meetingsFacets` (`src/meetings.controller.ts:149-163`)
- **Service:** `meetingsService.getFacets` (`src/meetings.service.ts:64-123`)
- **Reads from request:** nothing
- **Response on success:** `MeetingsFacetsResponse` (`src/endpoints.types.ts:46-49`) — `{ scheduled: { categories, languages }, unscheduled: { categories, languages } }`
- **Error path:** `next(val)` on `!ok`. Service returns `Promise<Ok<...>>` only — `Err` branch is unreachable as typed.
- **Middleware:** none.
- **Documented:** Yes — `README.md:67-73`.

#### `GET /api/v1/meetings/:slug`
- **Route:** `src/meetings.route.ts:21`
- **Controller:** `meetingsController.bySlug` (`src/meetings.controller.ts:113-128`)
- **Service:** `meetingsService.getBySlug` (`src/meetings.service.ts:125-143`)
- **Reads from request:** `req.params.slug` (cast to string)
- **Response on success:** `Meeting` object
- **Error path:** if service returns `Err("Meeting not found")`, controller calls `next()` with **no argument** (`meetings.controller.ts:126`) — this delegates to Express default handler, not the problem-details mapper chain.
- **Middleware:** none.
- **Documented:** Yes — `README.md:75-77`.

#### `GET /api/v1/meetings/:slug/related-group-info`
- **Route:** `src/meetings.route.ts:23-25`
- **Controller:** `meetingsController.relatedGroupInfo` (`src/meetings.controller.ts:130-147`)
- **Service:** `meetingsService.getRelatedGroupInfo` (`src/meetings.service.ts:145-173`)
- **Reads from request:** `req.params.slug`
- **Response on success:** `GroupDetails` (`src/endpoints.types.ts:19-22`)
- **Error path:** same pattern — `next()` with no arg.
- **Middleware:** none.
- **Documented:** No. This route is not mentioned in `README.md` or `CLAUDE.md`.

#### `GET /api/v1/events`
- **Route:** `src/events.route.ts:11-17`
- **Controller:** `eventsController.eventsAll` (`src/events.controller.ts:8-26`)
- **Service:** `eventsService.getAll` (`src/events.service.ts:6-11`)
- **Reads from request:** `req.query.start` (string, defaulted to `new Date().toISOString()` if absent)
- **Response on success:** `res.status(200).json(val)` where `val` is the result of `eventView.find({}).toArray()` on the `events-view` Mongo view.
- **Error path:** `next(val)` on `!ok`. Service always returns `Ok(...)` (`events.service.ts:11`).
- **Middleware:** none active. Commented-out middleware (`events.route.ts:12-15`):
  - `// TokenMiddleWare.extractAPIToken,`
  - `// query("apiToken").isString().isLength({ min: 64, max: 64 }),`
  - `// verifyFieldsErrors,`
  - `// AuthorizationMiddleware.isTokenAuthorized,`
- Additional fully commented-out route blocks at `events.route.ts:19-41` reference `meetingsController.getNext`, `meetingsController.getByDay`, and `quickenController.recordQuickenImport` / `provideMostRecentQuickenImport` — none of these controllers exist in the repo.
- Commented-out controller handlers at `events.controller.ts:28-60`: `getNext` and `getByDay`.
- **Documented:** Mentioned in `README.md:90-93` with the note "Ignore, unless testing server-side proof of concept. These were added for testing, and will eventually be removed".

### 4.3 Express-level middleware chain (`src/server.ts:41-68`)

Applied in this order:
1. `app.use(helmet())` (default config, line 41)
2. `app.use(cors())` (default config, line 42)
3. `app.use(cookieParser())` (line 43)
4. `if (process.env.NODE_ENV !== "prod") app.use(morgan("dev"))` (line 44)
5. `app.use(express.json({ limit: "50mb" }))` (line 45)
6. `app.use(express.urlencoded({ extended: false }))` (line 46)
7. Routes (`meetings`, `events`)
8. `*` catch-all 404
9. `HttpProblemResponse({ strategy })` — built from `DefaultMappingStrategy` registering `ReqParamFormatErrorMapper`, `AuthorizationErrorMapper`, `DbOperationErrorMapper`
10. `errorHandler` — a no-op handler that only `next(err)`s if `res.headersSent`

---

## 5. Data layer

### 5.1 MongoDB collection / view names referenced in code

Collected by grepping `useCollection<...>("...")` calls.

| Name (string literal) | Used by | File:line |
|-----------------------|---------|-----------|
| `"meeting"` | `meetingCollection` (exported, **not used** by any code path within `src/`) | `src/storage/meeting.mongodb.service.ts:12` |
| `"scheduled-meetings"` | `query`, `byGroup` (via `collections.meetings.scheduled`) | `meeting.mongodb.service.ts:50` |
| `"unscheduled-meetings"` | same dispatch table | `meeting.mongodb.service.ts:53` |
| `"combined-meetings"` | `bySlug`, default view | `meeting.mongodb.service.ts:56` |
| `"unique-languages-view"` | `getActiveLanguages` (combined) | `meeting.mongodb.service.ts:60` |
| `"unique-languages-scheduled"` | `getActiveLanguages` (scheduled) | `meeting.mongodb.service.ts:63` |
| `"unique-languages-unscheduled"` | `getActiveLanguages` (unscheduled) | `meeting.mongodb.service.ts:66` |
| `"unique-types-view"` | `getActiveTypes` (combined) | `meeting.mongodb.service.ts:70` |
| `"unique-types-scheduled"` | `getActiveTypes` (scheduled) | `meeting.mongodb.service.ts:73` |
| `"unique-types-unscheduled"` | `getActiveTypes` (unscheduled) | `meeting.mongodb.service.ts:76` |
| `"group-view"` | `groupView`, `byId` | `src/storage/group.mongodb.service.ts:9` |
| `"events-view"` | `eventView`, `getAllEvents`, `query` | `src/storage/event.mongodb.service.ts:14` |
| `"group"` | test only (`group.mongodb.service.spec.ts:69`) | — |

### 5.2 Aggregation pipeline definitions

Of the 12 distinct view names referenced in production code (`scheduled-meetings`, `unscheduled-meetings`, `combined-meetings`, `unique-languages-{view,scheduled,unscheduled}`, `unique-types-{view,scheduled,unscheduled}`, `group-view`, `events-view`, and `meeting` collection):

| View / collection | Pipeline defined in repo? | Source |
|-------------------|---------------------------|--------|
| `meeting` (raw collection) | N/A (raw) | — |
| `meeting-view` (named in README) | Partial — a JSON aggregation pipeline is quoted in `README.md:130-278`. It references a `$lookup` to `from: "group"` and produces fields including `rtc`, `timeUTC`, `groupEmail`, `groupWebsite`, etc. The README block contains a syntax artefact at line 138: `"from": "group",https://code4recovery.slack.com/files/...png` — a Slack URL appears inside what would otherwise be a JSON value. | `README.md:130-278` |
| `scheduled-meetings`, `unscheduled-meetings`, `combined-meetings` | No | — |
| `unique-languages-view`, `unique-languages-scheduled`, `unique-languages-unscheduled` | No | — |
| `unique-types-view`, `unique-types-scheduled`, `unique-types-unscheduled` | No | — |
| `group-view` | No | — |
| `events-view` | No | — |

The `meeting-view` name from the README does not appear anywhere in `src/`; the code queries the per-state views (`scheduled-meetings`, etc.) instead.

### 5.3 Indexes

`createIndex`, `ensureIndex`, and `createIndexes` do not appear anywhere in `src/`. No index creation is performed by application code.

Patterns that imply an index might be desirable (without judgment):
- `bySlug` queries `combined.findOne({ slug })` (`meeting.mongodb.service.ts:22`)
- `byGroup` queries `find({ groupID: new ObjectId(groupID) })` (`meeting.mongodb.service.ts:30-31`)
- `pipelineFromQuery` produces `$match` clauses on `rtc` (with `$gte`/`$lte`), `types` (with `$all`), `languages` (with `$in`), and `name` (with `$regex`, case-insensitive). See `src/utils/pipelineFromQuery.ts:25-122`.

### 5.4 Connection pool settings (by `NODE_ENV`)

From `src/storage/mongodb-storage-service.ts:6-23`:

```ts
const env = process.env.NODE_ENV || "development"
const isDevelopment = env === "development" || env === "test"
let mongoClientOptions: MongoDB.MongoClientOptions = {}
if (!isDevelopment) {
  mongoClientOptions = {
    maxPoolSize: 50,
    w: "majority",
    wtimeoutMS: 2500,
  }
}
```

| `NODE_ENV` value | Options applied |
|------------------|-----------------|
| unset (defaults to `"development"`) | `{}` (mongo driver defaults) |
| `"development"` | `{}` |
| `"test"` | `{}` |
| anything else (e.g. `"prod"`, `"production"`, `"staging"`) | `{ maxPoolSize: 50, w: "majority", wtimeoutMS: 2500 }` |

Note: `package.json:scripts.test` does not set `NODE_ENV`. The deploy workflow sets `NODE_ENV=development` at runtime (`.github/workflows/deploy-cloudrun.yml:49`), which therefore takes the empty-options branch in production.

### 5.5 Connection string handling

- `MONGO_URI` is read at `src/storage/mongodb-storage-service.ts:17`. If `undefined`, the code throws `new Error("Undefined database URI.")` (line 18).
- `MONGO_DB_NAME` is read at `src/storage/mongodb-storage-service.ts:29`. If `undefined`, throws `new Error("Undefined database name.")` (line 30).
- Validation beyond `undefined`: none. No format check, no scheme check.
- Logging / redaction: `mongoClient` and `configuredMongoDatabase` are constructed at module-load time (top-level `await`). On successful boot, `src/index.ts:23-26` logs `Server v${version} listening on port ${port} with database connected to ${configuredMongoDatabase.namespace}.` — `namespace` is the database name, not the URI; the URI is never logged.
- In tests (`testEnv/setup.ts:13-15`), `MONGO_URI` is overridden to either the in-memory server URI or `mongodb://127.0.0.1:27017`. `MONGO_DB_NAME` is **not** set by `testEnv/setup.ts` — see §10 for the test-failure consequence.

---

## 6. Time / timezone handling

### 6.1 `Date`, `Date.now()`, `new Date()` usages in `src/`

Production code (non-spec):
- `src/meetings.controller.ts:23` — `const validatedStart = queryParams.start ?? new Date().toISOString()`
- `src/events.controller.ts:17` — `new Date().toISOString()` (default for `start` query param)
- `src/common/logger.ts:28` — `new Date().toLocaleString("en-US", { timeZone: "UTC", hour12: false })` (used as Winston timestamp formatter)

Spec files use `jest.setSystemTime(new Date(...))` extensively in `*.dates.spec.ts` and `meetings.service.getMeetings.spec.ts`.

`Date.now()` does not appear anywhere in `src/`.

### 6.2 `rtc` string handling

- **Generation:** `src/utils/dates.ts:51-52` (`rtcFromTimestamp`), composing as `${weekday}:${HH:mm}`. Called from `lowerUpperLimits` → `createSameDayRange` / `createWeeklyRange` / `createCrossDayRange` (lines 95-122). Also constructed by hand in `dayLimits` (lines 153-166).
- **Parsing:** No parser. `rtc` is treated as an opaque string compared via Mongo `$gte`/`$lte`.
- **Comparison:** `src/utils/pipelineFromQuery.ts:25-39` — builds `{ rtc: { $gte, $lte } }` `$match` clauses, single-range or `$or`-combined.
- **Storage type:** `rtc: string | null` in `MeetingView` (`src/storage/storage.types.ts:11`); optional `rtc?: string` in `OnlineMeeting` (`src/endpoints.types.ts:28`, with comment `// Technically optional and could be removed if found not to be useful`).
- **Sentinel values used in code:** `"7:24:00"` (end-of-week upper bound), `"1:00:00"` (start-of-week lower bound), `"<day>:24:00"` / `"<day>:00:00"` for cross-day splits (`utils/dates.ts:105-122`).

### 6.3 Timezone / UTC / DST / `tz` / `offset` references

- `src/utils/dates.ts:30-41` — `dstAware(time, tz)` function; uses Luxon `DateTime.fromObject(date, { zone: tz })` for DST-aware localization.
- `src/utils/dates.ts:127-166` — `dayFromOffset`, `hrsMinsFromOffset`, `startParts`, `dayLimits` — all accept a numeric `offset` (minutes) parameter.
- `src/common/logger.ts:27-32` — log timestamps formatted in UTC.
- `src/endpoints.types.ts:31` — `timezone: string` on `OnlineMeeting`.
- `src/storage/storage.types.ts:12` — `timezone: string` on `MeetingView`.
- `src/endpoint-options.types.ts:22` — `offset: number` on `DayOptions` (interface is declared but `DayOptions` is not referenced elsewhere in `src/`).

The string `"DST"` appears only in test files and comments, not in production code.

### 6.4 Test coverage of time logic

| Spec file | Function(s) exercised | Cross-day / weekly cases |
|-----------|------------------------|---------------------------|
| `src/utils/dates.spec.ts` (8 tests) | `lowerUpperLimits`, `dayLimits` | "multi-day starting Sunday", "multi-day starting Monday" — present |
| `src/utils/dstAware.dates.spec.ts` (4 tests) | `dstAware` only | LA in/out of DST; Adelaide in/out of DST |
| `src/utils/america.dates.spec.ts` (4 tests) | `nextOccurrence` with US timezones | No |
| `src/utils/australia.dates.spec.ts` (2 tests) | `nextOccurrence` with Australia/Adelaide | No |
| `src/utils/weekdays.dates.spec.ts` (2 tests) | `newWeekday` / `prevWeekday` | No |
| `src/utils/pipelineFromQuery.spec.ts` (12 tests) | `pipelineFromQuery` | "Sunday => Monday" wrap, `$or`-combined RTC ranges — present |
| `src/meetings.service.getMeetings.spec.ts` (8 tests) | service-level temporal filtering; uses `jest.setSystemTime("2026-01-06T09:00:00Z")` | Exercises the `scheduled=false` path that excludes `rtc` filters |

The `isWeeklyRange(hours)` branch (`utils/dates.ts:93`, which is true only when `hours === 168`) is reached indirectly through `lowerUpperLimits`. The `pipelineFromQuery.spec.ts` and `dates.spec.ts` together exercise both same-day and cross-day output shapes.

---

## 7. Authentication and authorisation

### 7.1 Inventory of auth-related symbols

| Symbol | State | Location |
|--------|-------|----------|
| `TokenMiddleWare` | **Commented out** | `src/meetings.route.ts:6,12`; `src/events.route.ts:6,12,25,36` |
| `AuthorizationMiddleware` | **Commented out** | `src/meetings.route.ts:4,15`; `src/events.route.ts:4,15,29,39` |
| `verifyFieldsErrors` | **Commented out** | `src/meetings.route.ts:5,14`; `src/events.route.ts:5,14,28` |
| `query("apiToken").isString().isLength(...)` (express-validator) | **Commented out** | `src/meetings.route.ts:3,13`; `src/events.route.ts:3,13,26,37` |
| `AuthorizationError` (custom error class) | **Defined**; thrown nowhere in `src/` | `src/common/custom_errors/AuthorizationError.ts` |
| `AuthorizationErrorMapper` | **Defined and registered** in `server.ts:59` | `src/common/error_mappers/AuthorizationErrorMapper.ts` |
| JWT / `jsonwebtoken` | Not present in source or `package.json` | — |
| Session / `express-session` | Not present | — |
| API-key handling | Referenced only in commented-out code | — |
| Rate limiting (`express-rate-limit`, etc.) | Not installed; not used | — |

`express-validator` is declared in `package.json` as a runtime dependency (`^7.0.1`), but is **not** imported anywhere in `src/` outside of comments.

The referenced paths `../common/middleware/TokenMiddleWare.js`, `../common/middleware/AuthorizationMiddleware.js`, and `../common/middleware/body-query-validation.middleware.js` do not exist on disk — there is no `src/common/middleware/` directory.

### 7.2 CORS configuration

`src/server.ts:42`:

```ts
app.use(cors())
```

No options object passed. Effective `cors` defaults:
- `origin: '*'`
- `methods: 'GET,HEAD,PUT,PATCH,POST,DELETE'`
- `preflightContinue: false`
- `optionsSuccessStatus: 204`
- `credentials` not set (i.e. no `Access-Control-Allow-Credentials` header emitted)

### 7.3 Request validation

No active request validation middleware is in the request path. `express-validator` is imported nowhere in active code; `zod`, `joi`, `yup`, `ajv` (as a direct dep) are not in `package.json`.

Hand-rolled type coercion lives in `src/utils/queryParser.ts` (15 lines, no validation — just coerces strings to declared types and silently falls back on JSON-parse errors). The controller (`meetings.controller.ts:11-47`) wraps this with `validateTemporalParams`, which also performs coercion rather than validation (e.g. `parseInt(rawLimit)` with no `isNaN` guard at line 41).

---

## 8. Error handling

### 8.1 Custom error classes (`src/common/custom_errors/`)

| Class | Extends | `httpCode` | Constructor fields | Thrown at | Caught at |
|-------|---------|------------|---------------------|-----------|-----------|
| `BaseError` (abstract) | `Error` | — | `(detail?: string)`, sets `name` and `stack` | — | — |
| `ValidationError` (abstract) | `BaseError` | `400 BAD_REQUEST` | `()` | — | — |
| `ReqParamFormatError` | `ValidationError` | inherits `400` | `(param: string, detail: string)`; sets `this.message = "Parameter ${param}: ${detail}."` | **Never thrown** in `src/` | — |
| `AuthorizationError` | `BaseError` | `403 FORBIDDEN` | `(detail?: string)` | **Never thrown** in `src/` | — |
| `DbOperationError` | `BaseError` | `500 INTERNAL_SERVER` | `(detail?: string)` | **Never thrown** in `src/` | — |

The three concrete custom error classes exist but `grep -rn "new \(ReqParamFormatError\|AuthorizationError\|DbOperationError\)" src/` returns no matches. The mapping infrastructure (§8.2) is wired up but receives no traffic.

### 8.2 Error mappers (`src/common/error_mappers/`)

| Mapper | Maps from | Maps to (`ProblemDocument` shape) | File |
|--------|-----------|-------------------------------------|------|
| `ReqParamFormatErrorMapper` | `ReqParamFormatError` | `{ status, type: "/errors/req-param-format-error", title: "Malformed or missing request parameters", detail }` | `ReqParamFormatErrorMapper.ts` |
| `AuthorizationErrorMapper` | `AuthorizationError` | `{ status, detail }` | `AuthorizationErrorMapper.ts` |
| `DbOperationErrorMapper` | `DbOperationError` | `{ status, detail }` | `DbOperationErrorMapper.ts` |

All three are registered in `src/server.ts:56-61`:

```ts
const strategy = new DefaultMappingStrategy(
  new MapperRegistry()
    .registerMapper(new ReqParamFormatErrorMapper())
    .registerMapper(new AuthorizationErrorMapper())
    .registerMapper(new DbOperationErrorMapper()),
)
```

`src/common/ErrorProblemMappingStrategy.ts` defines an alternative `ErrorProblemMappingStrategy` class that `throw new Error("Could not map error")` on a miss (line 18). It is **not** imported or used anywhere in `src/`; `server.ts` uses `DefaultMappingStrategy` from `http-problem-details-mapper` instead.

### 8.3 `try`/`catch` blocks in `src/`

| Location | Try contents | Catch behaviour |
|----------|--------------|-----------------|
| `src/index.ts:22-32` | `app.listen(port, ...)` | `console.error(error); mongoClient.close()` |
| `src/utils/pipelineFromQuery.ts:10-15` (inside `normalizeToArray`) | `JSON.parse(input)` | empty `catch` block with comment `// not JSON, fall through` |
| `src/utils/queryParser.ts:15-18` (inside the array branch) | `JSON.parse(value)` | `catch { acc[key] = [value] }` — silently coerces to a single-element array |

No `.catch()` chains on Promises appear anywhere in `src/`.

### 8.4 Error-forwarding via `next()`

| Location | Form | Notes |
|----------|------|-------|
| `src/meetings.controller.ts:109` | `next(val)` | `val` is an `Err` payload (`val.error` not unwrapped); reaches problem-details mapper chain |
| `src/meetings.controller.ts:126` | `next()` | **no argument** — falls through to Express default 404 path |
| `src/meetings.controller.ts:145` | `next()` | same — no argument |
| `src/meetings.controller.ts:161` | `next(val)` | facets handler |
| `src/events.controller.ts:24` | `next(val)` | events handler |
| `src/server.ts:37` | `next(err)` | the `errorHandler` is reached only after headers are already sent (`if (res.headersSent)`); otherwise it does nothing |

### 8.5 Logged on error

Each controller logs `Logger.error(\`${JSON.stringify(val)}\`)` before calling `next(...)`. Examples:
- `meetings.controller.ts:108` — `Logger.error(\`${JSON.stringify(val)}\`)` before `next(val)`
- `meetings.controller.ts:125` — `Logger.error(\`Meeting with slug ${slug} not found\`)` *(inside service, not controller)*
- `events.controller.ts:23` — `Logger.error(\`${JSON.stringify(val)}\`)`

`Logger.error` (Winston) writes to `logs/error.log` and console; stack traces are not explicitly attached (the `BaseError` class stores `this.stack`, but it is not selected into the log format defined in `src/common/logger.ts:38-41`, which prints `${info.timestamp} ${info.level}: ${info.message}` only). Request context (path, method, query, IP) is not attached to error logs; only the JSON-stringified `val`. The fixtures in `cypress/fixtures/meetings.json` show that meeting records can contain `conference_url_notes` fields holding raw passwords (see §12.7); logging an entire meeting object via `JSON.stringify(val)` would include those fields.

---

## 9. Logging and observability

### 9.1 Logging library

Winston (`winston: ^3.10.0`). Logger defined in `src/common/logger.ts`:

- **Levels** (custom, defined `logger.ts:3-9`): `error: 0`, `warn: 1`, `info: 2`, `http: 3`, `debug: 4`
- **Level switch** (`logger.ts:11-15`): `debug` if `NODE_ENV === "development"`, else `warn`. Default for unset `NODE_ENV` is `"development"` → `debug`.
- **Format**: timestamp (UTC, locale-formatted) + colorize + `${timestamp} ${level}: ${message}`. `winston.format.json()` is present but commented out.
- **Transports** (`logger.ts:43-50`):
  - `Console`
  - `File({ filename: "logs/error.log", level: "error" })`
  - `File({ filename: "logs/all.log" })`

The `logs/` directory is in `.gitignore` but two log files (`all.log`, `error.log`) are present in the working tree.

### 9.2 Log levels per environment

| `NODE_ENV` | Level | Source |
|------------|-------|--------|
| unset | `debug` | default `"development"` branch (`logger.ts:13`) |
| `"development"` | `debug` | same |
| `"test"` | `warn` | only `"development"` matches the `isDevelopment` check (line 14, equality not `||`) |
| `"prod"` | `warn` | non-development branch |
| `"production"` | `warn` | non-development branch |
| Deploy workflow sets `NODE_ENV=development` (`.github/workflows/deploy-cloudrun.yml:49`) | `debug` | as-deployed |

### 9.3 `console.*` calls in `src/`

- `src/index.ts:27` — `console.log(\`listening on port ${port} (v${version})\`)`
- `src/index.ts:30` — `console.error(error)` (catch block on `app.listen` failure)

These are the only two `console.*` calls in `src/`. Logger usage by level across `src/`: 37× `Logger.debug`, 9× `Logger.error`, 8× `Logger.info`. No `Logger.warn` or `Logger.http` calls.

### 9.4 Health check endpoints

None. Grep of `src/` for `health`, `healthz`, `/ping`, `/status`, `readiness`, `liveness` returned no matches.

### 9.5 Metrics / tracing / APM

No OpenTelemetry, Datadog, New Relic, Sentry, Prometheus, or any APM library is present in `package.json` or `src/`.

### 9.6 Request ID / correlation ID

No `req.id`, `x-request-id`, `x-correlation-id`, or middleware that generates such an ID is present in `src/`. Morgan in `"dev"` format does not emit a request ID.

---

## 10. Testing

### 10.1 Jest configuration (`jest.config.ts`)

```ts
{
  globalSetup: "../testEnv/setup.ts",
  globalTeardown: "../testEnv/teardown.ts",
  verbose: true,
  rootDir: "src",
  maxWorkers: 1,
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: { "^(\\.{1,2}/.*)\\.js$": "$1" },
  transform: { "^.+\\.tsx?$": ["ts-jest", { useESM: true }] },
  fakeTimers: { enableGlobally: true, doNotFake: ["nextTick", "setImmediate"] },
}
```

`setupFiles` and `setupFilesAfterEach` are not configured. No `coverageThreshold` is set.

### 10.2 Jest test inventory (`jest --listTests` + `grep -c '^\s*\(it\|test\)('`)

16 spec files, 82 `it(`/`test(` declarations:

| File | `it/test` count |
|------|-----------------|
| `src/meetings.service.getRelatedGroupInfo.spec.ts` | 5 |
| `src/meetings.service.getBySlug.spec.ts` | 3 |
| `src/meetings.service.getFacets.spec.ts` | 2 |
| `src/meetings.service.getMeetings.spec.ts` | 8 |
| `src/utils/categorizeMeeting.spec.ts` | 6 |
| `src/utils/pipelineFromQuery.spec.ts` | 12 |
| `src/utils/australia.dates.spec.ts` | 2 |
| `src/utils/america.dates.spec.ts` | 4 |
| `src/utils/weekdays.dates.spec.ts` | 2 |
| `src/utils/dates.spec.ts` | 8 |
| `src/utils/dstAware.dates.spec.ts` | 4 |
| `src/utils/stringUtils.spec.ts` | 12 |
| `src/storage/meeting.mongodb.service.query.spec.ts` | 3 |
| `src/storage/group.mongodb.service.spec.ts` | 5 |
| `src/storage/meeting.mongodb.service.bySlug.spec.ts` | 2 |
| `src/storage/meeting.mongodb.service.byGroup.spec.ts` | 4 |

`grep` for `xit(`, `xdescribe(`, `.skip(`, `describe.skip`, `it.skip` in `src/` and `cypress/`: **no matches**. No tests are explicitly skipped.

### 10.3 Cypress configuration (`cypress.config.ts`)

```ts
e2e: {
  setupNodeEvents(on, config) { /* empty */ },
  baseUrl: "http://localhost:5001/api/v1",
}
```

`specPattern` not set → uses Cypress default (`cypress/e2e/**/*.cy.{js,jsx,ts,tsx}`).
`retries`, `video`, `screenshotOnRunFailure`, `viewportWidth/Height`, `defaultCommandTimeout` not set → Cypress defaults apply.
`cypress/support/commands.ts` contains only template comments — no custom commands defined.

### 10.4 Cypress spec inventory

| File | `it(` count | Top-level `describe` |
|------|-------------|----------------------|
| `cypress/e2e/1-events-us-winter.cy.ts` | 1 | "Events queries" — "In the US winter, order should be Aus, E2, E1" |
| `cypress/e2e/2-events-us-summer.cy.ts` | 1 | "Events queries" — "In the US summer, order should be E1, E2, Aus" |
| `cypress/e2e/meeting-and-group-details.cy.ts` | 4 | "bySlug endpoint" — slug found/not-found and related-group-info coverage |
| `cypress/e2e/meetings-facets.cy.ts` | 2 | "Meetings Facets API" — scheduled + unscheduled facets |
| `cypress/e2e/meetings.cy.ts` | 11 | "Basic queries" — default behaviour and parameter combinations |
| `cypress/e2e/root-api.cy.ts` | 1 | "Root Level API" / "Requested route not found" — 404 path |
| `cypress/e2e/unscheduled-meetings.cy.ts` | 7 | "Unscheduled Meetings" — `scheduled=false` query path |

Total Cypress `it`s: 27.

Fixtures in `cypress/fixtures/`: `example.json` (template), `groups.json`, `meetings.json`, `test-data.meeting-view-sorted-rtc.json`.

### 10.5 Coverage report

Run: `NODE_OPTIONS=--experimental-vm-modules npx jest --coverage --coverageReporters=text-summary`

Result of test run during this audit:

```
Test Suites: 4 failed, 12 passed, 16 total
Tests:       68 passed, 68 total
Snapshots:   0 total
Time:        1.265 s
```

The four failing suites are all in `src/storage/`:

- `meeting.mongodb.service.query.spec.ts`
- `meeting.mongodb.service.bySlug.spec.ts`
- `meeting.mongodb.service.byGroup.spec.ts`
- `group.mongodb.service.spec.ts`

Each fails identically at suite-load with:

```
Undefined database name.
  at useAppProvidedDatabaseNameWithMongoDB (storage/mongodb-storage-service.ts:30:35)
  at storage/mongodb-storage-service.ts:40:3
```

This is the `MONGO_DB_NAME` guard at `mongodb-storage-service.ts:30`. `testEnv/setup.ts` sets `MONGO_URI` but not `MONGO_DB_NAME`; the four storage specs import `mongodb-storage-service.js` (and so trigger module-load-time evaluation), the other 12 suites do not.

Coverage summary (from successful suites only):

```
Statements   : 94.85% ( 203/214 )
Branches     : 77.94% ( 53/68 )
Functions    : 89.79% ( 44/49 )
Lines        : 95.40% ( 187/196 )
```

Jest also reports: *"Jest did not exit one second after the test run has completed."* — open handle (likely the in-memory Mongo connection or Winston file transport).

### 10.6 Per-file coverage (sorted by statement % ascending, then alphabetically)

Run: `NODE_OPTIONS=--experimental-vm-modules npx jest --coverage --coverageReporters=text --silent`

| File | % Stmts | % Branch | % Funcs | % Lines | Uncovered lines |
|------|---------|----------|---------|---------|------------------|
| `src/utils/stringUtils.ts` | 66.66 | 0 | 25 | 75 | 2, 5 |
| `src/utils/pipelineFromQuery.ts` | 90.00 | 76.47 | 100 | 90.56 | 10–16, 99 |
| `src/meetings.service.ts` | 96.29 | 100 | 86.66 | 96.15 | 87, 93 |
| `src/utils/dates.ts` | 100 | 92.30 | 100 | 100 | 56 |
| `src/common/logger.ts` | 100 | 50 | 100 | 100 | 12–14 |
| `src/common/types.ts` | 100 | 100 | 100 | 100 | — |
| `src/utils/categorizeMeeting.ts` | 100 | 100 | 100 | 100 | — |
| **Aggregate `src/`** | 96.29 | 100 | 86.66 | 96.15 | — |
| **Aggregate `src/common`** | 100 | 50 | 100 | 100 | — |
| **Aggregate `src/utils`** | 93.70 | 76.36 | 90.32 | 94.48 | — |
| **All files (top of report)** | 94.85 | 77.94 | 89.79 | 95.40 | — |

The per-file table includes only modules that were *loaded* during the passing suites. The following source files have **no coverage data** in this run because either (a) the storage suites failed at suite-load due to missing `MONGO_DB_NAME` and never loaded them, or (b) no passing spec imports them:

- `src/index.ts`
- `src/server.ts`
- `src/meetings.controller.ts`
- `src/meetings.route.ts`
- `src/events.controller.ts`, `src/events.route.ts`, `src/events.service.ts`
- `src/utils/queryParser.ts`
- `src/storage/mongodb-storage-service.ts`
- `src/storage/meeting.mongodb.service.ts`
- `src/storage/group.mongodb.service.ts`
- `src/storage/event.mongodb.service.ts`
- `src/common/custom_errors/*` (5 files)
- `src/common/error_mappers/*` (3 files)
- `src/common/ErrorProblemMappingStrategy.ts`
- `src/common/http-status-codes.ts`
- `src/endpoint-options.types.ts`, `src/endpoints.types.ts`, `src/storage/storage.types.ts` (type-only)

---

## 11. Deployment and operations

### 11.1 Dockerfile (`Dockerfile`, 24 lines)

```dockerfile
# build stage
FROM node:latest AS build
RUN apt-get update && apt-get install -y --no-install-recommends dumb-init
WORKDIR /build
COPY . .
RUN npm ci
RUN npm run build
RUN npm ci --omit=dev

# production stage
FROM node:20.5.1-bookworm-slim
ENV NODE_ENV production
ENV MONGO_DB_NAME ${MONGO_DB_NAME}
ENV MONGO_URI ${MONGO_URI}
COPY --from=build /usr/bin/dumb-init /usr/bin/dumb-init
USER node
WORKDIR /app
COPY package*.json  ./
COPY --chown=node:node --from=build /build/node_modules ./node_modules
COPY --chown=node:node --from=build /build/dist/ ./dist/
CMD ["dumb-init", "node", "/app/dist/index.js"]
```

- Base images: build stage `node:latest` (floating tag); final stage `node:20.5.1-bookworm-slim` (pinned)
- User in final stage: `node` (non-root, declared at line 19)
- Exposed port: none (no `EXPOSE` directive). Application binds to port 5001 (`src/index.ts:20`).
- `ENV NODE_ENV production` is set in the Dockerfile (line 15), but the Cloud Run deploy step overrides it to `development` (see §11.3).
- No `HEALTHCHECK` directive.
- Final image size: not measured during this audit; the base `node:20.5.1-bookworm-slim` alone is ~240 MB uncompressed.

### 11.2 CI/CD workflow (`.github/workflows/deploy-cloudrun.yml`, 52 lines)

Trigger: `push` to `main`. Runner: `ubuntu-latest`.

Env (from GitHub Secrets): `PROJECT_ID`, `REGION`, `SERVICE_NAME`.

Steps:
1. `actions/checkout@v4`
2. `google-github-actions/setup-gcloud@v2` with `project_id`, `service_account_key` (`GCP_SA_KEY` secret), `export_default_credentials: true`
3. `gcloud auth configure-docker --quiet ${REGION}-docker.pkg.dev`
4. `docker build -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/cloud-run-source-deploy/${SERVICE_NAME}:${github.sha} .`
5. `docker push <same tag>`
6. `gcloud run deploy ${SERVICE_NAME}` with:
   - `--image` matching the tag above
   - `--region=${REGION}`
   - `--platform=managed`
   - `--set-env-vars=NODE_ENV=development`
   - `--set-secrets=MONGO_DB_NAME=MONGO_DB_NAME:latest,MONGO_URI=MONGO_URI:latest`
   - `--allow-unauthenticated`

### 11.3 Origins of each runtime variable

| Variable | Source |
|----------|--------|
| `PROJECT_ID` | GitHub Secret `GCP_PROJECT_ID` (workflow env, line 17) |
| `REGION` | GitHub Secret `GCP_REGION` (line 18) |
| `SERVICE_NAME` | GitHub Secret `CLOUD_RUN_SERVICE` (line 19) |
| `GCP_SA_KEY` | GitHub Secret, consumed by `setup-gcloud` |
| `NODE_ENV` | **Hardcoded** in workflow as `development` (line 49) |
| `MONGO_DB_NAME` | GCP Secret Manager (`MONGO_DB_NAME:latest`, line 50) |
| `MONGO_URI` | GCP Secret Manager (`MONGO_URI:latest`, line 50) |

### 11.4 Cloud Run service configuration as committed

The deploy step sets only `--region`, `--platform=managed`, `--set-env-vars`, `--set-secrets`, and `--allow-unauthenticated`. Not set in the workflow (using Cloud Run defaults / pre-existing service config):

- `--cpu` (default 1 vCPU on `--platform=managed`)
- `--memory` (default 512 MiB)
- `--concurrency` (default 80 concurrent requests per instance)
- `--min-instances` (default 0)
- `--max-instances` (default 100)
- `--timeout` (default 300 s)
- `--port` (Cloud Run probes port 8080 by default; the app binds to **5001** in `src/index.ts:20` and there is no `PORT` env handling — see §14)

### 11.5 `NODE_ENV` at each stage

| Stage | `NODE_ENV` value | Source |
|-------|------------------|--------|
| Local development | unset → defaults to `"development"` in code (`mongodb-storage-service.ts:7`, `logger.ts:12`) | — |
| `npm test` | unset (the script does not set it) | `package.json:9` |
| Jest globalSetup | unset; `testEnv/setup.ts` sets only `MONGO_URI` | `testEnv/setup.ts:13-16` |
| Docker build stage | unset | — |
| Docker production stage | `production` | `Dockerfile:15` |
| Cloud Run (overrides Dockerfile) | `development` | `.github/workflows/deploy-cloudrun.yml:49` |

---

## 12. Security surface

This is a neutral inventory.

### 12.1 Where user input enters

Every `req.query`, `req.params`, `req.body` read in `src/` (excluding commented-out code):

- `src/meetings.controller.ts:55` — `req.query as Record<string, string>` passed to `parsedQueryParams`
- `src/meetings.controller.ts:84` — `req.query.limit as string | undefined`
- `src/meetings.controller.ts:118` — `req.params.slug as string` (bySlug)
- `src/meetings.controller.ts:119` — `JSON.stringify(req.params)` into log message
- `src/meetings.controller.ts:135` — `req.params.slug as string` (relatedGroupInfo)
- `src/meetings.controller.ts:137` — `JSON.stringify(req.params)` into log message
- `src/events.controller.ts:13` — `JSON.stringify(req.query)` into log message
- `src/events.controller.ts:15-16` — `req.query.start as string`

No `req.body` reads occur in active code (the body parser is registered with a 50 MB limit but no POST/PUT route accepts a body).

### 12.2 Path from user input to database query

- `meetings GET /` → controller reads `req.query.*` → `parsedQueryParams` → `validateTemporalParams` → `meetingsService.getMeetings` → `pipelineFromQuery` → `meetingStore.query(pipeline, scheduleType)` → `db.collection(...).aggregate(pipeline).toArray()`
- `meetings GET /:slug` → `req.params.slug` → `meetingsService.getBySlug` → `combined.findOne({ slug })`
- `meetings GET /:slug/related-group-info` → `req.params.slug` → `getRelatedGroupInfo` → `combined.findOne({ slug })` then `groupView.findOne({ _id: new ObjectId(groupID) })` then `byGroup` collection `find({ groupID: new ObjectId(groupID) })`
- `events GET /` → `req.query.start` is read but only used as a string passed through to `eventsService.getAll`, which ignores it and calls `eventView.find({}).toArray()` (returns all events)

### 12.3 String interpolation into Mongo queries

Mongo filters are constructed as plain JS objects with operator keys (`$gte`, `$lte`, `$in`, `$all`, `$or`, `$and`). One regex construction occurs:

- `src/utils/pipelineFromQuery.ts:115-122` — `nameQuery` is passed through `makeQuoteFlexibleRegex` (`src/utils/stringUtils.ts:7-14`) which:
  - escapes regex special chars `[.*+?^${}()|[\]\\]`
  - replaces straight/curly single quotes with the character class `['‘’]`
  - replaces straight/curly double quotes with `["“”]`
  - then passes the result into `{ $regex: pattern, $options: "i" }`

No `$where`, JavaScript-in-query, or `eval`-style operators are used anywhere in `src/`.

ObjectId construction (`new MongoDB.ObjectId(groupID)` in `meeting.mongodb.service.ts:31` and `group.mongodb.service.ts:15`) is given a string sourced from a Mongo document `groupID` field, not directly from user input.

### 12.4 Headers set on responses

- `helmet()` (`server.ts:41`) with default config — sets `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, etc. per Helmet 7 defaults.
- `cors()` (`server.ts:42`) with default config — see §7.2.
- No custom `setHeader` / `header` calls in `src/`.

### 12.5 Body parser limits

`src/server.ts:45`:
```ts
app.use(express.json({ limit: "50mb" }))
```
`express.urlencoded({ extended: false })` is registered without a `limit` option (defaults to `100kb`).

### 12.6 Rate limiting

Not present. `express-rate-limit`, `rate-limiter-flexible`, `express-slow-down` are not in `package.json`. No application-level rate limiting code in `src/`. Cloud Run's default `--concurrency=80` and `--max-instances=100` (per §11.4) are the only protection in the deployed surface.

### 12.7 Secrets / credentials in the repo

Grep for `(api[_-]?key|secret|password|token|bearer|aws_access|private[_-]?key|jwt_secret)\s*[:=]` across `*.ts`, `*.json`, `*.yml` (excluding `node_modules`, `.git`, `dist`):

- 16 hits, all in fixture files: `cypress/fixtures/meetings.json` (lines 805, 839, 926, 1465, 1494, 1523, 1552, 1581, 1610) and `cypress/fixtures/test-data.meeting-view-sorted-rtc.json` (lines 295, 716, 1047, 1377, 1659, 1680, 2014, 2339).
- All occurrences are inside a `conference_url_notes` string field on meeting fixture records — e.g. `"ID: 812 7939 0644 Password: 531646"`, `"password: REFLECt"`, `"Password: email sundaysbestbuffalony@gmail.com"`.
- 1 hit in `cypress/support/commands.ts:31` — a Cypress template comment referencing `(email: string, password: string)`.

No `.env`, `.env.local`, `.env.production`, or similarly named files exist in the working tree (`find . -name '.env*'` returned no matches). `.gitignore` includes `.env*`.

### 12.8 `.gitignore` coverage

```
node_modules/
logs/
dist/
.env*
Makefile
src/coverage/*
```

`.gitignore` does **not** include a top-level `coverage/` entry (Jest's default coverage output directory) — only `src/coverage/*`. Jest's `coverageDirectory` is unset → defaults to `<rootDir>/coverage`, which with `rootDir: "src"` becomes `src/coverage/` — so the current rule matches by design.

`.dockerignore` (`Dockerfile:1-7`):
```
.dockerignore
node_modules
npm-debug.log
Dockerfile
.git
.gitignore
.npmrc
```
The `.dockerignore` does not exclude `logs/`, `cypress/`, `dist/`, `.env*`, `testEnv/`, or `*.spec.ts` — they will be copied in by the build-stage `COPY . .` (`Dockerfile:6`), though only `dist/` is propagated to the final stage.

---

## 13. Documentation state

### 13.1 Markdown files

| File | Lines | Last commit (`git log -1 --format='%aI'`) |
|------|-------|--------------------------------------------|
| `README.md` | 286 | 2026-02-10T12:36:34-08:00 |
| `CLAUDE.md` | 74 | **No commit** (created during a session immediately prior to this audit; uncommitted in the working tree) |
| `LICENSE` | 21 | 2023-07-26T21:13:23-08:00 |

No other markdown files exist in the repo (verified by `find . -name '*.md'` excluding `node_modules`, `.git`, `dist`).

### 13.2 README ↔ CLAUDE disagreements

- **Build/test commands list**: README documents `npm run build && npm start`, `npm run start-dev`, `npm run test`; CLAUDE.md lists the same commands plus targeted commands (`jest path/to/file.spec.ts`, `jest -t "name"`, `--coverage`). Both agree on the underlying commands; CLAUDE.md is a superset, not a contradiction.
- **Module system**: README (`README.md:32`) says "pure ES modules and not the older CommonJS"; CLAUDE.md elaborates on the `.js` import-extension requirement. No contradiction.
- **Semicolons**: README (line 128) says "I'm also in the camp that agrees semi-colons are unnecessary. All of these style choices can be discussed". CLAUDE.md states "Prettier's `semi: false` is the binding rule — don't add them". README frames the choice as discussable; CLAUDE.md frames it as binding. Both observe `.prettierrc:2` `"semi": false`.
- **Indentation**: README (line 128) says "my vscode settings enforce two spaces for indents as I find it more readable". `.prettierrc` does not set `tabWidth`, so Prettier defaults to 2. Code reads as 2-space. No contradiction with code, but the setting is not enforced via Prettier config.

### 13.3 Doc ↔ code disagreements

| Doc claim | Code reality |
|-----------|--------------|
| README:43-44: default fetch is "next hour of meetings"; README notes "this is a bug" linking issue #1 | Controller default for `hours` is `1` when only `start` is defined or nothing is defined (`meetings.controller.ts:34-38`). When *no* params at all, the `limit` defaults to `300` (line 43-44); when only `start`, default is `1000`. README only mentions the `hours: 1` default. |
| README:50: `hours` default is "1" | Confirmed (`meetings.controller.ts:37`). |
| README:52: `limit` defaults to `1000` if not included | Code defaults to `300` when no params present at all, `1000` when at least one temporal/filter param is set (`meetings.controller.ts:40-44`). README does not mention the 300 case. |
| README:54-56: `scheduled` defaults to `true`; `false` returns unscheduled without `nextEventUTC` | Confirmed (`meetings.controller.ts:15-21`). |
| README:58: example URL `/api/v1/meetings/next?limit=1&start=20240113T230000Z` | No route `/api/v1/meetings/next` exists. The active routes are `/`, `/facets`, `/:slug`, `/:slug/related-group-info` (`meetings.route.ts:11-25`). |
| README:59: "API adjusts the query to include meetings started within the past 10 minutes" | `lowerUpperLimits` subtracts 9 minutes from the lower bound (`utils/dates.ts:61`), not 10. |
| README:67-72: `/api/v1/meetings/facets` returns `MeetingFacets` | Controller returns `MeetingsFacetsResponse` which has `scheduled` and `unscheduled` sub-objects (`endpoints.types.ts:46-49`); README mentions `MeetingFacets` (the inner type). |
| README:75-77: `/api/v1/meetings/:slug` documented | Confirmed. |
| README is silent on `/api/v1/meetings/:slug/related-group-info` | Route exists (`meetings.route.ts:23-25`). |
| README:23: `MONGO_URI=mongodb+srv://<username>:<password>@<databaseURL>` example | Code reads `MONGO_URI` without scheme validation (`mongodb-storage-service.ts:17-22`). |
| README:32: "pure ES modules and not the older CommonJS" | Confirmed by `package.json` `"type": "module"`. |
| README:96-118: "Currently 100% of the `utils` and `common` functions are covered by tests" | Coverage run during this audit reports `Functions: 89.79% (44/49)` overall; per-file is in §10.5/§10.6. |
| README:120-122: Dockerfile and Makefile for image push | A Dockerfile exists; the Makefile path mentioned does not exist on disk (`Makefile` is also in `.gitignore`). |
| README:130-278: aggregation pipeline for view "meeting-view" | This view name (`meeting-view`) is never referenced in `src/`; the code queries `scheduled-meetings`, `unscheduled-meetings`, `combined-meetings` instead. The JSON pipeline block at `README.md:138` contains an inline artefact: `"from": "group",https://code4recovery.slack.com/files/U010NSRGL31/F08PFNSH7AL/screenshot_2025-04-18_at_8.46.03___am.png` — a Slack URL embedded in what would otherwise be JSON. |
| README:282-286 To-Do: "Add validation in the route file", "Discuss and implement API token requirements" | Both still apply: no validation middleware is active; commented-out auth middleware references files that do not exist. |
| CLAUDE.md: "`mongodb-storage-service.ts` only applies production pool options when `NODE_ENV !== 'development' && NODE_ENV !== 'test'`" | Confirmed (`mongodb-storage-service.ts:7-16`). |
| CLAUDE.md: "Pre-production… expected load: 25,000–30,000 visitors/day" | This is from the audit brief, not the codebase; included here only to note that no caching, CDN, or rate-limiting infrastructure is configured in the repo. |
| CLAUDE.md: "Adding a new category code requires updating the relevant const tuple in `common/types.ts`" | Confirmed by the structure of `categorizeMeeting.ts:13-47` and `pipelineFromQuery.ts:42-55`. |

### 13.4 Undocumented surface

Items present in code but not mentioned in either `README.md` or `CLAUDE.md`:

- Route `GET /api/v1/meetings/:slug/related-group-info`
- `MeetingViewType` parameter on `getRelatedGroupInfo` and the `byGroup` helper
- The five custom error classes (`AuthorizationError`, `BaseError`, `DbOperationError`, `ReqParamFormatError`, `ValidationError`)
- The three error mappers and the way they are registered in `server.ts`
- The 50 MB JSON body parser limit
- Default Helmet and CORS configuration (open `origin: '*'`)
- The Winston file transports (`logs/error.log`, `logs/all.log`) and the local `logs/` directory
- `globalConfig.json` (single-line file containing `{"mongoUri":"mongodb://127.0.0.1:61743/"}`)
- The `migrate/migrateData.ts` entry in `tsconfig.json:include` referencing a path that does not exist
- The events.controller / events.service / events.route stack (mentioned in README only as "ignore, will be removed")
- The fact that the deploy workflow sets `NODE_ENV=development` (overriding the Dockerfile's `production`)
- The fact that the deploy workflow does not set Cloud Run's port and the app binds to 5001 (Cloud Run probes 8080 by default)
- The `Cypress` fixtures (`groups.json`, `meetings.json`, `test-data.meeting-view-sorted-rtc.json`) and how they relate to the live database

---

## 14. Open observations

Neutral notes that did not fit cleanly above.

- `src/index.ts:15-17` reads `package.json` via `readFileSync(join(process.cwd(), "package.json"), "utf-8")` to extract the version. This relies on `process.cwd()` being the repo root at boot. In the Docker production image, `WORKDIR /app` and `package.json` is copied to `/app/` (`Dockerfile:21`), so this resolves at runtime — but the path is brittle if the working directory ever changes.
- `mongoClient` is created with **top-level `await`** at `src/storage/mongodb-storage-service.ts:37`. Importing the storage module triggers connection at module-load. This makes the four storage spec files fail at *import* time (not test time) when `MONGO_DB_NAME` is missing (see §10.5).
- `package.json:version` is `"0.16.0-alpha"`.
- `package.json:main` and `package.json:exports["."]` both point at `./dist/index.js`, and `package.json:types` points at `./dist/index.d.ts`. The TS config does not set `declaration: true`, so `.d.ts` is not currently emitted by `npm run build`. The package is not currently published.
- `globalConfig.json` contains a single line: `{"mongoUri":"mongodb://127.0.0.1:61743/"}`. It is not referenced anywhere in `src/`, `cypress/`, or `testEnv/`.
- `Dockerfile:2` uses `FROM node:latest` for the build stage. The final stage pins to `node:20.5.1-bookworm-slim`, but builds will be on whatever `node:latest` resolves to at build time.
- `Dockerfile:15` uses the legacy `ENV NODE_ENV production` form (no `=`); modern Docker recommends `ENV NODE_ENV=production`. Functionally equivalent.
- `.eslintignore` contains `src/tests/fixtures/*`. The path `src/tests/fixtures/` does not exist.
- `.eslintrc.json` does not declare a `parserOptions.project`, so type-aware lint rules are not enabled. The config extends `eslint:recommended` and `plugin:@typescript-eslint/recommended` only — none of the type-checking variants.
- No `lint`, `format`, or `typecheck` npm script exists. CI does not run ESLint, Prettier, `tsc --noEmit`, or Jest before deploying — `deploy-cloudrun.yml` only builds the Docker image and deploys.
- The `Err` branches in `meetings.controller.ts:107-110, 156-162` and `events.controller.ts:23-25` are typed-unreachable because the services they call return `Promise<Ok<...>>` rather than `Promise<Ok | Err>`. The exception is `meetingsService.getBySlug` (`meetings.service.ts:127`) and `meetingsService.getRelatedGroupInfo` (line 148) which do return `Ok | Err`, and the controllers for those routes call `next()` with no argument — so a not-found result reaches the Express default 404 handler rather than the registered problem-details mapper chain.
- `meetingsService.getMeetings` (`meetings.service.ts:35-62`) calls `Logger.debug` six times per request including stringifying the entire `options` object and the constructed pipeline. With log level at `debug` in deployed Cloud Run (NODE_ENV=development), this is a debug log per request multiplied by handler.
- The `bySlug` log line `Logger.info(\`fetch result being returned includes ${JSON.stringify(val)}.\`)` (`meetings.controller.ts:122`) JSON-stringifies the full meeting object, which can include `conference_url_notes` fields holding passwords (see §12.7) when those are present on production data.
- `morgan("dev")` is enabled when `NODE_ENV !== "prod"` (`server.ts:44`). Both `"development"` and `"production"` evaluate truthy here — only the literal string `"prod"` disables it. The deploy sets `NODE_ENV=development`, so morgan is active in production with the `dev` format (colored, no log file).
- `cors()` with no options uses wildcard origin; combined with `Access-Control-Allow-Credentials` not being sent, this is permissive but not credentialed.
- The `parsedQueryParams` boolean branch (`utils/queryParser.ts:11-12`) treats `value === "true"` as `true` and everything else as `false` — including the string `"True"` or any other casing.
- `validateTemporalParams` (`meetings.controller.ts:11-47`) uses `Object.keys(queryParams).filter((k) => queryParams[k] !== undefined).length === 1 && queryParams.start !== undefined` to detect "only `start` is defined". `queryParams.scheduled` parses to a boolean, so `scheduled=false` makes this condition false; `scheduled=true` (the default) does too because `queryParams.scheduled` is `true`, not `undefined`.
- `mongoClient.close()` is called in the `catch (error)` of `index.ts:31` only on `app.listen` failure. There is no `SIGTERM`/`SIGINT` handler that closes the connection on graceful shutdown.
- `Dockerfile` does not run `npm prune --production` or use multi-stage to exclude dev deps from `node_modules` — but it does `npm ci --omit=dev` after `npm run build` and then copies `node_modules` (`Dockerfile:22`), so dev dependencies are excluded from the final image.
- `cypress/fixtures/test-data.meeting-view-sorted-rtc.json` and `cypress/fixtures/meetings.json` appear to contain production-shaped data (group emails, phone numbers, conference URLs/passwords) — committed to the repository as test fixtures.
- The `.claude/settings.local.json` file is present and contains tool permission allowlist entries scoped to this directory.
- `package.json` has no `"engines"` field declaring a Node range, and no `.nvmrc` exists.
- The `meetings.service.ts` import `import { MeetingViewType } from "./storage/meeting.mongodb.service.js"` (line 21) is used only as a default-parameter type in `getRelatedGroupInfo` (line 147). No caller currently passes a non-default value.
- `index.ts:19` calls `dotenv.config()` *after* `mongodb-storage-service.js` has been imported (line 8). Because `mongodb-storage-service.ts:37` has top-level `await` that reads `process.env.MONGO_URI` at module-load time, environment variables from `.env` are loaded *after* the Mongo connection is established. This works because Node's ES-module side effects in `import` happen before the `dotenv.config()` line runs, so `.env`-sourced `MONGO_URI` and `MONGO_DB_NAME` would not be visible to the Mongo connection logic. Local `.env` users observe this working only if those variables are exported in their shell as well, or if `dotenv` is preloaded via `node -r dotenv/config` (which the scripts do not do).
- Total combined test surface across Jest and Cypress: 82 + 27 = 109 declarations.

---

*End of Pass 1.*
