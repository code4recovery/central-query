# Central Query

## Overview

Central Query (working name subject to change) is a set of endpoints to query a MongoDB database containing meeting data. The current iteration pulls meeting name using a copy of the OIAA database as a demo of the capability.

## Motivation

The demo provides a venue for Code for Recovery to create a more advanced proof-of-concept providing centralized management of meetings for entities around the globe.

## Contributing

### Installation for dev work

1. Request access to a MongoDB Collection of meeting data that is set up for testing and development. Or create your own locally:

   1. Set up a local instance of MongoDB.
   1. Create a database called `central-exp` or whatever you wish; the name can be set in `.env`.
   1. Create a sample collection called `meeting` with the following minimum fields in each record:

      ```json
      name: string // Some identifier
      timezone: string // from the official ICANN tz identifier list
      day: number // 1-7, week starts with Monday
      startDateUTC: Date // Next meeting occurrence after update in the database.
      ```

      Notes:

      a. This minimum data set supports proof of concept for server-side sorting. It is not sufficient for full testing of filtering. This will be updated when those features are added.

      b. The approach to the weekday, which changes Central's format (0-6, Sunday start), arises due to limitations of MongoDB and Luxon.

      c. `startDateUTC` is essential magical sauce as an input to the `meeting-view` logic, used to determine DST on the fly. For example, if a new meeting to be held on Mondays at 7pm in New York is entered on January 1st, 2024 at noon, `startDateUTC` should be captured as `2024-01-02T00:00:00.000+00:00`. However, if the same meeting was entered on Tuesday, January 2nd at noon, the correct `startDateUTC` would be `2024-01-09T00:00:00.00+00:00`.

      d. [This gist](https://gist.github.com/tim-rohrer/5a18691f3ba206c6c6ce7a90514b0de0) provides sample code to determine `startDateUTC`.

   1. Create the [view](#aggregation-pipeline-for-view) on the MongoDB server.

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

Please note: This app uses "pure" ES modules and not the older CommonJS modules. Please stick with this approach.

### Issues

Bugs and feature requests are tracked using GitHub Issues for the repo. Please consider coordinating via Slack prior to opening an issue or PR.

## Endpoints

### Meetings

### `/api/v1/meetings/next`

Gets the next hour of meetings based on the UTC time when the request is received. The controller limits the fetch to 100 meetings.

To Do:

- [ ] If the fetched results are <10 meetings, re-fetch for the next two hours.

Options include:

`limit`: A number representing how many meetings will be returned. Defaults to 100 if not included.
`start` (not fully implemented): A timestamp reflecting the start time for meetings to be returned. For example, to get the next meeting starting after 2300 UTC: `/api/v1/meetings/next?limit=1&start=20240113T230000Z`

Note: The API adjusts the query to include meetings started within the past 10 minutes.

### `/api/v1/meetings/:slug`

Uses the slug to determine and provide details from a meeting and associated group. See `MeetingGroup` interface.

### `/api/v1/meetings/by-day?weekday=<1-7>&offset=<proper offset in minutes>`

Currently, the requesting app must provide the weekday and offset as no defaults are coded. Consider this endpoint unstable.

## Active interfaces

This API provides the `Meeting` interface which is better aligned to the terms used by Meeting Guide and, hopefully, Central.

These should still be considered unstable:

```ts
interface Meeting {
  slug: string
  name: string
  timezone: string
  day: number
  time: string
  duration: Minutes
  languages: string[]
  features: Feature[]
  formats: Format[]
  type: Type
  communities: Community[]
  groupID: string
  tags: string[]
  search: string
  groupEmail?: string
  groupWebsite?: string
  groupNotes?: string
  conference_provider?: string
  conference_url?: string
  conference_url_notes?: string
  conference_phone?: string
  conference_phone_notes?: string
  notes?: string[]
  edit_url?: string
}
```

### Events

Ignore, unless testing server-side proof of concept. These were added for testing, and will eventually be removed after suitable e2e tests are added.

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

## Aggregation Pipeline for View

Using MongoDB's Compass app connected to the local database, create an aggregation against the `meeting` collection and then create the view `meeting-view` using Save->Create view.

```json
[
  {
    "$addFields": {
      "adjustedUTC": {
        "$dateFromParts": {
          "year": {
            "$year": {
              "date": "$$NOW",
              "timezone": "$timezone"
            }
          },
          "month": {
            "$month": {
              "date": "$$NOW",
              "timezone": "$timezone"
            }
          },
          "day": {
            "$dayOfMonth": {
              "date": "$$NOW",
              "timezone": "$timezone"
            }
          },
          "hour": {
            "$hour": {
              "date": "$startDateUTC",
              "timezone": "$timezone"
            }
          },
          "minute": {
            "$minute": {
              "date": "$startDateUTC",
              "timezone": "$timezone"
            }
          },
          "timezone": "$timezone"
        }
      },
      "nowWeekday": {
        "$toInt": {
          "$dateToString": {
            "date": "$$NOW",
            "format": "%u"
          }
        }
      },
      "rtcWeekday": {
        "$toInt": {
          "$dateToString": {
            "date": "$startDateUTC",
            "format": "%u"
          }
        }
      },
      "dayOfWeekStr": {
        "$dateToString": {
          "date": "$startDateUTC",
          "format": "%u"
        }
      }
    }
  },
  {
    "$project": {
      "_id": 0,
      "day": 1,
      "name": 1,
      "time": 1,
      "timezone": 1,
      "contact_1_email": 1,
      "contact_1_name": 1,
      "contact_2_email": 1,
      "contact_2_name": 1,
      "email": 1,
      "group": 1,
      "group_id": 1,
      "notes": 1,
      "slug": 1,
      "types": 1,
      "phone": 1,
      "adjustedUTC": 1,
      "startDateUTC": 1,
      "sortRTCDay": {
        "$cond": {
          "if": {
            "$gte": ["$rtcWeekday", "$nowWeekday"]
          },
          "then": {
            "$subtract": ["$rtcWeekday", 7]
          },
          "else": "$rtcWeekday"
        }
      },
      "sortRTCTime": {
        "$dateToString": {
          "date": "$adjustedUTC",
          "format": "%H:%M"
        }
      },
      "rtc": {
        "$concat": [
          "$dayOfWeekStr",
          ":",
          {
            "$dateToString": {
              "date": "$adjustedUTC",
              "format": "%H:%M"
            }
          }
        ]
      }
    }
  },
  {
    "$sort": {
      "sortRTCDay": 1,
      "sortRTCTime": 1,
      "name": 1
    }
  }
]
```

## To-Do

- [ ] Add validation in the route file
- [ ] Discuss and implement API token requirements
- [ ] Document proposed database changes (Central) to support this API
- [ ] Add/refine endpoint filter options based on type, language and other criteria
- [ ] Re-work process to push image to C4R repo vice the original author's repo
