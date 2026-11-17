# Proposal

Tracks GitHub issue [#45](https://github.com/code4recovery/central-query/issues/45) (milestone: Online Intergroup Release).

## Why

`GET /api/v1/meetings` applied a default 1-hour window whenever `hours` was missing, so `?limit=25` returned only the next hour of meetings instead of the first 25. Clients could not use `limit` or the filter parameters without also sending temporal parameters.

Most of the fix is already on `main`, but the rules exist only in the issue text. Nothing in the repository specifies them, the README still describes the old behavior as a bug, and only three of the nine matrix rows have a test.

## What Changes

- Specify when the endpoint applies a default `start` and a default `hours`, as a checked-in behavior contract with the scenario matrix from issue #45.
- **BREAKING** (relative to the pre-fix contract): a query with `limit` or any filter parameter, and no `hours`, is no longer limited to a 1-hour window.
- `hours` without `start` uses the current time as `start`.
- Close the gaps between the specification and `main` (see design.md, "Scenario matrix", rows marked as diverging). The exact fix depends on open questions Q1 and Q2.
- Add one automated test per matrix row.
- Update the README endpoint documentation to match.

## Capabilities

### New Capabilities

- `meetings-time-window`: how `GET /api/v1/meetings` decides the time window of a query, including the defaults for `start` and `hours` and when no time window applies.

### Modified Capabilities

None. `openspec/specs/` is empty; this is the first specification in the repository.

## Impact

- **Code:** `src/meetings.controller.ts` (`validateTemporalParams`), possibly `src/meetings.service.ts` and `src/utils/dates.ts` depending on Q1.
- **Tests:** new table-driven Jest test for the default rules; additions to `cypress/e2e/meetings.cy.ts`.
- **Docs:** `README.md`, section `/api/v1/meetings`.
- **API consumers:** OIAA-Direct and any client that sends filters without `hours` and relied on the implicit 1-hour window. Response sizes for filter-only queries grow from one hour of meetings to up to the `limit` cap.
- **Related issues:** #42 and #48 (validation and 400 responses) decide what happens to invalid `start`/`hours` values, which this change treats as out of scope. #2 (randomization) depends on the ordering answer to Q2.
