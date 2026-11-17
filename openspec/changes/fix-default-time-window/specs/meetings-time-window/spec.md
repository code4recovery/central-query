# Spec Delta

## Purpose

Defines how `GET /api/v1/meetings` chooses the time window of a query: when a default start time and a default duration apply, and when a query has no time window at all.

Terms used below: the *temporal parameters* are `start` and `hours`. The *other parameters* are `limit`, `formats`, `features`, `communities`, `languages`, `type` and `nameQuery`. Scenario titles carry the row number of the scenario matrix in design.md.

## ADDED Requirements

### Requirement: Default window for a query without parameters

When a request carries no query parameters, the system SHALL return meetings in a 1-hour window that starts at the time the request is received.

#### Scenario: Row 1 - empty query

- **WHEN** a client requests `/api/v1/meetings` with no query parameters
- **THEN** the response status is 200
- **AND** every returned meeting occurs within 1 hour after the time of the request

### Requirement: Default duration when only start is given

When `start` is the only parameter in the request, the system SHALL apply a duration of 1 hour beginning at `start`.

#### Scenario: Row 2 - start only

- **WHEN** a client requests `/api/v1/meetings?start=X`
- **THEN** every returned meeting occurs within 1 hour after X

### Requirement: Default start when hours is given without start

When `hours` is present and `start` is absent, the system SHALL use the time the request is received as the start, whatever other parameters are present.

#### Scenario: Row 3 - hours only

- **WHEN** a client requests `/api/v1/meetings?hours=24`
- **THEN** every returned meeting occurs within 24 hours after the time of the request

#### Scenario: Row 10 - hours with limit

- **WHEN** a client requests `/api/v1/meetings?hours=24&limit=25`
- **THEN** at most 25 meetings are returned
- **AND** every returned meeting occurs within 24 hours after the time of the request

### Requirement: Explicit start and hours are honored

When both `start` and `hours` are present, the system SHALL use exactly those values for the time window, whatever other parameters are present.

#### Scenario: Row 4 - start and hours

- **WHEN** a client requests `/api/v1/meetings?start=X&hours=24`
- **THEN** every returned meeting occurs within 24 hours after X

#### Scenario: Row 9 - start, hours and limit

- **WHEN** a client requests `/api/v1/meetings?start=X&hours=24&limit=25`
- **THEN** at most 25 meetings are returned
- **AND** every returned meeting occurs within 24 hours after X

### Requirement: No implicit duration when other parameters are present

When a request carries at least one of the other parameters and no `hours`, the system SHALL NOT apply a default duration. A `start` in such a request sets only the lower bound of the results.

#### Scenario: Row 5 - limit only

- **WHEN** a client requests `/api/v1/meetings?limit=25` and at least 25 scheduled meetings exist
- **THEN** exactly 25 meetings are returned
- **AND** the results are not restricted to the hour after the request

#### Scenario: Row 7 - filter only

- **WHEN** a client requests `/api/v1/meetings?formats=D`
- **THEN** every returned meeting has format D
- **AND** D-format meetings that occur more than 1 hour after the request are included

#### Scenario: Row 6 - start and limit

- **WHEN** a client requests `/api/v1/meetings?start=X&limit=25`
- **THEN** at most 25 meetings are returned
- **AND** no returned meeting occurs before X
- **AND** meetings that occur more than 1 hour after X are eligible

#### Scenario: Row 8 - start and filter

- **WHEN** a client requests `/api/v1/meetings?start=X&formats=D`
- **THEN** every returned meeting has format D
- **AND** no returned meeting occurs before X
- **AND** D-format meetings that occur more than 1 hour after X are included
