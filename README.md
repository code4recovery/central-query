# Central Query

## Overview

Central Query provides a set of endpoints to query a MongoDB database containing meeting data. The current iteration uses a copy of the OIAA database as a demo of the capability.

## Motivation

This project serves as a proof-of-concept for Code for Recovery, demonstrating centralized management of meetings for entities around the globe.

## Contributing

### Installation for Development

1. Clone the repo and run `npm install`

2. For local development with a real database, create a `.env` file (see `.env.example`):

   ```sh
   MONGO_URI=mongodb://localhost:27017
   MONGO_DB_NAME=central-query-dev
   PORT=5001
   NODE_ENV=development
   ```

3. Run tests: `npm test` (uses MongoDB Memory Server - no setup needed)

4. Run the server:
   - `npm run start-dev` - Development mode with hot reload
   - `npm run build && npm run start` - Production build

### Bootstrap Mongo Views

The API depends on 10 managed MongoDB views. The source of truth for those
definitions is [docs/views](./docs/views).

For a fresh developer database or disaster recovery, set `MONGO_URI` and
`MONGO_DB_NAME` in the same `.env` file used for local development, or export
them in the shell before running the command. For example:

```sh
MONGO_URI=mongodb://localhost:27017
MONGO_DB_NAME=central-query-dev
```

Then run:

```sh
npm run migrate:views
```

This command drops and recreates the managed views, so it is safe to rerun for
setup and recovery. It is intended to be an explicit maintenance step rather
than something the API does automatically on startup.

**Note:** Unit and e2e tests use MongoDB Memory Server and don't require a `.env` file or external database.

Please note: This app uses "pure" ES modules and not the older CommonJS modules. Please stick with this approach.

### Issues

Bugs and feature requests are tracked using GitHub Issues for the repo.

## Endpoints

### Meetings

### `/api/v1/meetings`

Gets meetings, accepting several query parameter options. If the `start` option is not provided, the API defaults to **now** based on the UTC time when the request is received. If no other parameters are passed, the controller limits the fetch to the next hour of meetings. (Note: This is a bug. See [this issue](https://github.com/code4recovery/central-query/issues/1) for details.)

Options include:

- `communities`: An array element of communities
- `features`: An array element of features
- `formats`: An array element of formats
- `hours`: A number used to limit the range of meetings returned by the endpoint. The default is 1.
- `languages`: An Array element of alpha2 language codes based on ISO 639-1
- `limit`: A number representing how many meetings will be returned. Defaults to 1000 if not included. (Note: It is unclear if this option useful to a client, and it may be deprecated.)
- `nameQuery`: A case-insensitive string used to search for meetings by name. Partial matches are supported.
- `scheduled`: A boolean to filter meetings by schedule status. Defaults to `true` (scheduled meetings). Set to `false` to retrieve unscheduled meetings without `nextEventUTC`.
- `start`: A timestamp reflecting the start time for meetings to be returned. For example, to get the next meeting starting after 2300 UTC: `/api/v1/meetings/next?limit=1&start=20240113T230000Z`
- `type`: A string, either O (for Open) or C (for Closed)

Note: The API adjusts the query to include meetings started within the past 10 minutes.

To Do:

- [ ] If the fetched results are <10 meetings, re-fetch for the next two hours.
- [ ] Ensure API can handle fractional `hours` and then set default to 45 minutes.

### `api/v1/meetings/facets`

Provides an object containing the active categories and languages associated with scheduled and unscheduled meetings in the database. These are only those values associated with active meetings, and not a complete list of all languages or categories that might exist.

See the [specific interface](src/endpoints.types.ts) of the `MeetingFacets` object.

See the [specifics of the languages and categories interfaces](src/storage/storage.types.ts).

### `/api/v1/meetings/:slug`

Uses the slug to determine and provide details from a meeting and associated group. See `MeetingGroup` interface.

## Active interfaces

This API provides the `OnlineMeeting` interface (aliased as `Meeting`) which is better aligned to the terms used by Meeting Guide and, hopefully, Central.

Additionally, `GroupDetails` provides group specifics, including other meetings.

See the [specifics of the interfaces](src/endpoints.types.ts).

The draft `MeetingsOptions` [interface](src/endpoint-options.types.ts) has been implemented for experimentation.

These should still be considered unstable.

### Events

Ignore, unless testing server-side proof of concept. These were added for testing, and will eventually be removed after suitable e2e tests are added.

## Testing

### Unit Tests

Run unit tests with Jest:

```bash
npm test              # Run all tests
npm run test-dev      # Watch mode
```

Unit tests use MongoDB Memory Server, so no external database is needed.

### E2E Tests

E2E tests use Cypress with MongoDB Memory Server for a zero-dependency setup:

```bash
# Terminal 1: Start the e2e environment
npm run e2e:start     # Starts Memory Server + seeds data + runs app on :5001

# Terminal 2: Run Cypress
npm run e2e:open      # Interactive mode
npm run e2e:run       # Headless mode
```

The e2e server automatically:

- Starts MongoDB Memory Server (in-memory, temporary)
- Seeds test data from `cypress/fixtures/`
- Starts the application on port 5001
- Cleans up everything on exit (Ctrl+C)

**No Docker, MongoDB installation, or .env file needed** - everything runs in memory with predictable fixture data.

To check coverage, execute `NODE_OPTION=--experimental-vm-modules npx jest --coverage` in the terminal. Currently 100% of the `utils` and `common` functions are covered by tests. A smaller percentage of the `storage` functions are covered in unit tests, but more of them are covered through Cypress.

### Integration/End-to-End

To use Cypress to run tests during dev, start the api server using `npm run start-dev`. You should see output similar to:

```sh
1/13/2024, 10:54:41 PM debug: Routes registered.
1/13/2024, 10:54:41 PM info: Server listening on port 5001 with database connected to central-exp.
listening on port 5001
```

In another terminal, execute `npx cypress open`. You may be presented with some configuration options, but then get a screen asking you to select E2E Testing. Do that, and then chose which browser to use. I use FireFox.

Integration tests can be found under the `cypress/e2e` folder.

Please ask for a demo if you're unfamiliar with Cypress. There is no reason to struggle, and once it is working, it is really a powerful dev environment.

### Deployment

This repo contains a Dockerfile used to build an image of the API server. Although not currently included, a Makefile has been created to create and push the image to the author's GitHub. Until this process is updated, the original author can push the images and update the demo on the C4R VPS.

## Commits and Coding Styles

Prefer to use the [Udacity style guide](https://udacity.github.io/git-styleguide/) for commits. There are other practices which are similar and should be fine, so feel free to discuss options.

Some, but not all, of the coding style choices are included in `.prettierrc`. This needs to be updated as we go along. For example, my `vscode` settings enforce two spaces for indents as I find it more readable with modern fonts. I'm also in the camp that agrees semi-colons are unnecessary. All of these style choices can be discussed, of course.

## Managed View Definitions

The current MongoDB view definitions live in
[docs/views](./docs/views). Each JSON file is self-contained and includes the managed view name, its `viewOn` source
collection, and the aggregation `pipeline` used to recreate it.

## To-Do

- [ ] Add validation in the route file
- [ ] Discuss and implement API token requirements
- [ ] Document proposed database changes (Central) to support this API
- [ ] Add/refine endpoint filter options based on type, language and other criteria
- [ ] Re-work process to push image to C4R repo vice the original author's repo
