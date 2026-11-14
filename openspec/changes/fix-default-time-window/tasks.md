# Tasks

## 1. Resolve blocking questions

- [ ] 1.1 Get answers to Q1 to Q5 in design.md from the maintainers and record them in design.md under Decisions; verify no blocking question remains under Open Questions
- [ ] 1.2 Update specs/meetings-time-window/spec.md for any answer that changes a scenario (rows 6 and 8 for Q1, `scheduled` for Q3) and verify `openspec validate fix-default-time-window --strict` passes

## 2. Default rules as a tested unit

- [ ] 2.1 Extract the start/hours default rules from `src/meetings.controller.ts` into an exported pure function that takes the parsed parameters and the request time; verify `npm run typecheck` and `npm run lint` pass
- [ ] 2.2 Add a table-driven Jest test with one case per row of the scenario matrix in design.md (rows 1 to 10), named by row number; verify `npm test` passes and the new function has full branch coverage
- [ ] 2.3 Remove or correct the unreachable 300 default-limit branch according to the answer to Q4; verify with a Jest case for the default limit of a query without a time window

## 3. End-to-end behavior per matrix row

- [ ] 3.1 Add Cypress tests in `cypress/e2e/meetings.cy.ts` for rows 2, 3, 4, 9 and 10 that assert every returned meeting falls inside the expected window; verify `npm run e2e:run` passes
- [ ] 3.2 Strengthen the existing row 5 test and add a row 7 test to assert that meetings more than 1 hour ahead are returned; verify `npm run e2e:run` passes
- [ ] 3.3 Implement the Q1 answer for rows 6 and 8 (ordering or handling of `start` without `hours`) and add Cypress tests for both rows; verify the tests fail before the change and pass after

## 4. Documentation

- [ ] 4.1 Update the `/api/v1/meetings` section of `README.md`: remove the "this is a bug" note, describe the default rules, and link to the specification; verify each documented example query returns what the text says against the e2e server

## 5. Integration check

- [ ] 5.1 Run `npm test`, `npm run lint`, `npm run typecheck` and `npm run e2e:run` together and verify all pass
- [ ] 5.2 Before deploying to production, have the OIAA-Direct maintainers run its queries against the staging site, where this behavior is already live, and verify they confirm the results are as expected

## Workflow follow-up

- Close issue #45 once the change is merged.
- Archive the change so the specification moves to `openspec/specs/meetings-time-window/`.
