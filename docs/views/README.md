# Managed MongoDB Views

This directory is the source of truth for the managed MongoDB views used by the API.

Each JSON file in this folder is a full view definition with this structure:

```json
{
  "name": "scheduled-meetings",
  "viewOn": "meeting",
  "pipeline": [ ... ]
}
```

## View Catalog

| View                           | File                                | viewOn    | Purpose                                                                               |
| ------------------------------ | ----------------------------------- | --------- | ------------------------------------------------------------------------------------- |
| `scheduled-meetings`           | `scheduled-meetings.json`           | `meeting` | Scheduled meetings with computed `nextEventUTC` and `rtc`, sorted by next event.      |
| `unscheduled-meetings`         | `unscheduled-meetings.json`         | `meeting` | Meetings missing valid scheduling fields (`day`, `time`, `timezone`).                 |
| `combined-meetings`            | `combined-meetings.json`            | `meeting` | Combined meeting projection with related group details for general meeting queries.   |
| `group-view`                   | `group-view.json`                   | `group`   | Group record projection used by related-group-info lookups.                           |
| `unique-languages-view`        | `unique-languages-view.json`        | `meeting` | Unique active languages from scheduled meetings, enriched from `language` collection. |
| `unique-languages-scheduled`   | `unique-languages-scheduled.json`   | `meeting` | Unique languages scoped to scheduled meetings.                                        |
| `unique-languages-unscheduled` | `unique-languages-unscheduled.json` | `meeting` | Unique languages scoped to unscheduled meetings.                                      |
| `unique-types-view`            | `unique-types-view.json`            | `meeting` | Unique meeting types enriched from the `type` collection.                             |
| `unique-types-scheduled`       | `unique-types-scheduled.json`       | `meeting` | Unique meeting types scoped to scheduled meetings.                                    |
| `unique-types-unscheduled`     | `unique-types-unscheduled.json`     | `meeting` | Unique meeting types scoped to unscheduled meetings.                                  |

## Creating/Recreating Views

Use the managed bootstrap command from the repository root:

```sh
npm run migrate:views
```

Required environment variables:

- `MONGO_URI`
- `MONGO_DB_NAME`

Example:

```sh
MONGO_URI=mongodb://localhost:27017 MONGO_DB_NAME=central-query-dev npm run migrate:views
```

Behavior:

- The command drops managed views if they already exist.
- The command recreates all managed views from this directory.
- Re-running the command is expected and supported.

## How To Modify a View Definition

1. Edit the target JSON file in this directory.
2. Keep `name`, `viewOn`, and `pipeline` aligned with the intended view behavior.
3. Run `npm run migrate:views` against a test/development database.
4. Verify the affected endpoint behavior (and run e2e tests if relevant).
5. Commit the JSON change and any related docs/code updates.

## Adding or Removing a Managed View

If the managed set changes, update both:

- This directory (`docs/views/*.json`)
- `src/storage/managed-view-definitions.ts` (managed file list)

The bootstrap script only creates files listed in `managedViewFiles`.

## Notes

- Legacy `meeting-view` content in historical docs is not used by the current bootstrap flow.
