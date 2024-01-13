# Central Query

## Overview

Central Query (working name subject to change) is a set of endpoints to query a MongoDB database containing meeting data. The current iteration pulls meeting name using a copy of the OIAA database as a demo of the capability.

## Motivation

The demo provides a venue for Code for Recovery to create a more advanced proof-of-concept providing centralized management of meetings for entities around the globe.

## Contributing

### Installation for dev work

1. Ask for access to a MongoDB Collection of meeting data that is set up for testing and development (alternatively, you can create your own locally).

1. Add a `.env` file containing:

   ```sh
   NODE_ENV=development
   MONGO_DB_NAME=central-exp
   #LOCAL MONGODB Server example
   #MONGO_URI=mongodb://root:example@localhost:27017/?authSource=admin&readPreference=primary&directConnection=true&ssl=false
   MONGO_URI=mongodb+srv://<username>:<password>@<databaseURL>
   ```

1. Clone the repo, and run `npm install` inside the root folder.

1. Run `npm run test` to see the results of the unit tests.

1. Run the server, using `npm run build && npm run start` or `npm run start-dev` to execute a version that will reload upon saving code changes.

Please note: This app uses "pure" ES modules and not the older commonjs modules. Please stick with is approach.

### Issues

Bugs and feature requests are tracked using GitHub Issues for the repo. Please consider coordinating via Slack prior to opening an issue or PR.

## Endpoints

### Meetings

`/api/v1/meetings/next` returns the next set (default 25) of meetings based on a start time (default now).

Options include:

`limit`: A number representing how many meetings will be returned. Defaults to 25 if not included.
`start` (not fully implemented): A timestamp reflecting the start time for meetings to be returned. For example, to get the next meeting starting after 2300 UTC: `/api/v1/meetings/next?limit=1&start=20240113T230000Z`

Note: The API adjusts the query to include meetings started within the past 10 minutes.

`/api/v1/meetings/by-day?weekday=<1-7>&offset=<proper offset in minutes>`

Currently, the requesting app must provide the weekday and offset as no defaults are coded.

### Events

Ignore. These were added for testing, and will be removed.

## Testing

`central-query` comes with jest for unit tests and Cypress for integration tests. Please continue to write tests for new code.

### Unit

To make node work with ES modules, the node option of `--experimental-vm-modules` must be used as of node 18. This requirement should go away in the future.

To check coverage, execute `NODE_OPTION=--experimental-vm-modules npx jest --coverage` in the terminal. Currently 100% of the `utils` and `common` functions are covered by tests. A smaller percentage of the `storage` functions are covered in unit tests, but more of them are covered through Cypress.

### Integration/End-to-End

To use Cypress to run tests during dev, start the api server using `npm run start-dev`. You should see output similar to:

```sh
1/13/2024, 10:54:41 PM debug: Routes registered.
1/13/2024, 10:54:41 PM info: Server listening on port 5000 with database connected to central-exp.
listening on port 5000
```

In another terminal, execute `npx cypress open`. You may be presented with some configuration options, but then get a screen asking you to select E2E Testing. Do that, and then chose which browser to use. I use FireFox.

Integration tests can be found under the `cypress/e2e` folder.

Please ask for a demo if you're unfamiliar with Cypress. There is no reason to struggle, and once it is working, it is really a powerful dev environment.

### Deployment

This repo contains a Dockerfile used to build an image of the API server. Although not currently included, a Makefile has been created to create and push the image to the author's GitHub. Until this process is updated, the original author can push the images and update the demo on the C4R VPS.

## Commits and Coding Styles

Prefer to use the [Udacity style guide](https://udacity.github.io/git-styleguide/) for commits. There are other practices which are similar and should be fine, so feel free to discuss options.

Some, but not all, of the coding style choices are included in `.prettierrc`. This needs to be updated as we go along. For example, my `vscode` settings enforce two spaces for indents as I find it more readable with modern fonts. I'm also in the camp that agrees semi-colons are unnecessary. All of these style choices can be discussed, of course.

## To-Do

- [ ] Add validation in the route file
- [ ] Discuss and implement API token requirements
- [ ] Document proposed database changes (Central) to support this API
- [ ] Add/refine endpoint filter options based on type, language and other criteria
- [ ] Re-work process to push image to C4R repo vice the original author's repo
