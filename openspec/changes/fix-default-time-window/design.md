# Design

## Context

See proposal.md for motivation. Facts about the current code that shape this design (read from `main` at `5b2c231`; behavior was derived by reading the code, not by running it):

- `validateTemporalParams` in `src/meetings.controller.ts` already implements most of the rules. For a scheduled query it always sets `start` (to the request time when absent) and sets `hours` to 1 only for an empty query or a start-only query.
- When `start` is set and `hours` is not, `lowerUpperLimits` in `src/utils/dates.ts` falls back to 168 hours, so "no time window" is implemented today as "one full week from `start`".
- Meetings recur weekly. The `scheduled-meetings` view computes each meeting's next occurrence relative to the current time (`nextEventUTC`), derives a weekday-and-time key from it (`rtc`), and sorts by `nextEventUTC` ascending. Time windows are matched against `rtc`.
- `limit` is applied after that sort. Results are therefore ordered by next occurrence from **now**, never from `start`.
- `validateTemporalParams` is not exported, so it has no unit test.
- An unmerged branch on the upstream repository, `fix/42-45-meetings-query-validation-temporal-defaults`, already contains work on this issue: validation for #42 and the default rules for #45 in one module, with unit and Cypress tests. The conformance columns in the matrix describe `main`, not that branch.
- The rules on `main` are deployed to the staging site only. They are not live in production, so production clients have not yet seen the change in behavior.

## Goals / Non-Goals

**Goals:**

- Make the scenario matrix a checked-in, tested artifact.
- Bring the rows that diverge on `main` in line with the specification.

**Non-Goals:**

- Rejecting invalid values with 400 responses (issues #42 and #48). This change keeps today's tolerant handling.
- Changing the bounds of `hours` (1 to 168) or `limit` (1 to 1000).
- Randomized ordering (issue #2).
- Queries with `scheduled=false`, which ignore the temporal parameters today and continue to.

## Scenario matrix

Rows 1 to 9 are the matrix from issue #45, unchanged. Row 10 is derived from the issue's logic rules and is not in the issue's matrix. X is any valid timestamp. A dash means "not set".

| Row | Query | start | hours | Result | Rationale | On `main` | Tested today |
|-----|-------|-------|-------|--------|-----------|-----------|--------------|
| 1 | (empty) | now | 1 | Next hour | Default for casual queries | Conforms | Yes (Cypress) |
| 2 | `?start=X` | X | 1 | 1 hour from X | User specified time, assume window | Conforms | No |
| 3 | `?hours=24` | now | 24 | Next 24 hours | Auto-add start for time window | Conforms | Partly (bounds tests) |
| 4 | `?start=X&hours=24` | X | 24 | 24 hours from X | Both explicit | Conforms | No |
| 5 | `?limit=25` | - | - | First 25 meetings | No time filter | Conforms in effect (see note A) | Yes (count only) |
| 6 | `?start=X&limit=25` | X | - | 25 from X onward | No upper bound | **Diverges** (see note B) | No |
| 7 | `?formats=D` | - | - | All D-format | Filter only | Conforms in effect (see note A) | No |
| 8 | `?start=X&formats=D` | X | - | D-format from X onward | No upper bound | Unclear (see note B) | No |
| 9 | `?start=X&hours=24&limit=25` | X | 24 | Up to 25 in 24-hour window | All explicit | Conforms | No |
| 10 | `?hours=24&limit=25` (derived) | now | 24 | Up to 25 in next 24 hours | Rule 2: hours without start | Conforms | No |

**Note A.** The issue says no time filter is applied. `main` applies a one-week filter starting 9 minutes before now. Because every meeting recurs weekly, that returns the same set as no filter, except for meetings whose weekday-and-time falls in the one-minute gap between 10 and 9 minutes ago. The order is next occurrence from now, so `?limit=25` returns the 25 soonest meetings.

**Note B.** With `start=X` and no `hours`, `main` matches a full week from X, which is every meeting, and orders them by next occurrence from now. For row 6 that returns the 25 soonest meetings from **now**, not from X. For row 8 it returns every D-format meeting, so `start` has no visible effect. Whether that is wrong depends on Q1.

## Logic rules

Taken from issue #45:

```
IF no query params at all:
    start = now, hours = 1
ELSE IF hours provided AND start NOT provided:
    start = now, use provided hours
ELSE IF start provided AND no other params except hours:
    use provided start; IF hours NOT provided: hours = 1
ELSE (other params exist: limit, formats, languages, ...):
    do NOT apply default hours; use start/hours only if explicitly provided
```

## Decisions

1. **Extract the default rules into an exported pure function.** Move the logic out of the controller into a function that takes the parsed parameters and the request time and returns `{ start, hours }`. *Why:* the rules can then be covered by a table-driven Jest test with one case per matrix row, which makes the test file the executable matrix. *Alternative considered:* Cypress only. Rejected because time-dependent end-to-end assertions are slow and harder to make exact.
2. **Pass the request time in as an argument.** *Why:* deterministic tests without faking the clock.
3. **Keep one Cypress test per matrix row as well.** *Why:* the divergences in notes A and B come from the interaction between the controller, the range builder and the view's sort order, which a unit test of the rules cannot see.
4. **Leave invalid-value handling untouched.** *Why:* #42 and #48 replace it wholesale; changing it here would be thrown away.

## Risks / Trade-offs

- [Filter-only queries now return up to 1000 meetings instead of one hour's worth] → Confirm the default limit in Q4 before release; verify OIAA-Direct against staging before the production rollout.
- [Rows 6 and 8 cannot be implemented until Q1 is answered] → Tasks for them are gated on the answer; the other rows can proceed.
- [#48 will change the status code for some inputs covered by tests added here] → Keep invalid-value cases out of the new tests.

## Open Questions

Q1 to Q5 change the specification or the task breakdown and need an answer before implementation of the affected rows. Q6 to Q9 can be answered later. Each question carries a recommendation. A recommendation is a suggestion, not a decision, until a maintainer confirms it. "The upstream branch" below means `fix/42-45-meetings-query-validation-temporal-defaults`.

**Blocking**

- **Q1. What does "from X onward, no upper bound" mean for a weekly schedule?** Every meeting recurs weekly, so an unbounded window from X contains every meeting. Rows 6 and 8 only differ from rows 5 and 7 if results are ordered from X. Options: (a) order by next occurrence at or after X, so row 6 returns the 25 meetings soonest after X; (b) keep ordering from now, and accept that `start` without `hours` has no effect; (c) reject or ignore `start` without `hours` when other parameters are present. Option (a) needs a sort relative to X, which the view does not provide today.
  - *Recommendation:* Option (a). It is what the issue's wording ("25 from X onward") describes, and it is the only option in which `start` without `hours` does something. It can be done in the query pipeline, without changing the view, by sorting on the time from X to each meeting's next occurrence, wrapped to one week. If that is too much for this release, ship option (b) and reword the row 6 and row 8 scenarios to say that `start` without `hours` has no effect. The upstream branch does not implement (a).
- **Q2. "First 25 meetings overall" by what order?**
  - *Recommendation:* Next occurrence from the request time, which is the view's existing order. `?limit=25` is then equivalent to `?start=now&limit=25` under Q1 option (a).
- **Q3. Is `scheduled` one of the "other parameters"?** The issue's list omits it. On `main`, `?scheduled=true` alone returns the full week rather than the next hour, and `?start=X&scheduled=true` gets no default `hours`.
  - *Recommendation:* Yes, count it. The rule then reads "the defaults apply only to an empty query or a query with nothing but `start` and `hours`", which is easy to document. The upstream branch already does this. Consequence to accept: `?scheduled=true` alone returns the soonest meetings up to the default limit, not the next hour.
- **Q4. What is the default `limit` when no time window applies?** `main` uses 1000. The controller contains a 300 default for "neither start nor hours", but that branch is unreachable for scheduled queries because `start` is always set. Which value is intended?
  - *Recommendation:* 300 when the query has no time window, 1000 when it has one. The upstream branch implements this, and it bounds the response size of filter-only queries. Fix the unreachable branch on `main` so the 300 actually applies.
- **Q5. Does a parameter with an empty value count as provided?** For example `?limit=` or `?formats=`. The issue's sample code (truthiness checks) treats it as absent, so the 1-hour default applies. `main` treats `?formats=` as present, so no default applies.
  - *Recommendation:* Neither. Reject an empty value with a 400, as the upstream branch does for `limit`, `formats`, `features`, `communities`, `languages` and `nameQuery`. An empty value is almost always a client bug, and silently treating it as absent hides the bug.

**Deferrable**

- **Q6. Invalid temporal values until #48 lands.** `?hours=abc` currently counts as "not provided" and gets the 1-hour default; `?hours=999` becomes 24. Is that acceptable in the interim, and which of #45 and #48 lands first?
  - *Recommendation:* Do not define interim behavior. Land the default rules together with the validation from #42 and #48, as the upstream branch does, so invalid `start` and `hours` values return 400 from the first release of this change.
- **Q7. Lookback.** The code includes meetings that started up to 9 minutes before `start`; the README says 10. Which is intended, and should the lookback apply to an explicit `start` or only to the default one?
  - *Recommendation:* Keep the behavior in the code (9 minutes, applied to both a default and an explicit `start`) and correct the README. Changing the lookback is not needed for #45 and the date tests assert the current ranges.
- **Q8. Fractional hours.** The README to-do proposes fractional `hours` and a 45-minute default. `main` accepts `1.5` but turns `0.75` into 24. In or out of scope here?
  - *Recommendation:* Out of scope. Keep `hours` an integer from 1 to 168, which the upstream branch enforces with a 400, and open a separate issue for fractional hours and the 45-minute default.
- **Q9. Unknown parameters.** Is a request such as `?foo=1` an empty query? On `main` unknown parameters are ignored, so it gets the 1-hour default. On the upstream branch it does not count as empty, so it returns the soonest meetings with no time window.
  - *Recommendation:* Ignore unknown parameters when applying the default rules, so `?foo=1` behaves like an empty query. Cache-busting and tracking parameters should not change which meetings a client receives.
