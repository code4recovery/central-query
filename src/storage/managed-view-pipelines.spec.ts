import * as MongoDB from "mongodb"

import {
  loadManagedViewDefinitions,
  ManagedViewDefinition,
} from "./managed-view-definitions.js"

// Runs the real view pipelines from docs/views on a meeting and its group.
// The views read the database clock ($$NOW), which fake timers can't move,
// so every "$$NOW" is replaced with a fixed date.
const withNow = (value: unknown, now: Date): unknown => {
  if (value === "$$NOW") return now
  if (Array.isArray(value)) return value.map((item) => withNow(item, now))
  if (value !== null && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, withNow(item, now)]),
    )
  }
  return value
}

type Case = {
  label: string
  now: string
  timezone: string
  day: number
  time: string
  nextEventUTC: string
  rtc: string
}

const cases: Case[] = [
  {
    label: "New York, Sunday 06:00, before clocks go forward (14 Mar 2027)",
    now: "2027-03-10T17:00:00Z",
    timezone: "America/New_York",
    day: 7,
    time: "06:00",
    nextEventUTC: "2027-03-14T10:00:00.000Z",
    rtc: "7:10:00",
  },
  {
    label: "New York, Sunday 06:00, an hour after it on Sun 7 Mar 2027",
    now: "2027-03-07T12:00:00Z",
    timezone: "America/New_York",
    day: 7,
    time: "06:00",
    nextEventUTC: "2027-03-14T10:00:00.000Z",
    rtc: "7:10:00",
  },
  {
    label: "New York, Sunday 06:00, before clocks go back (1 Nov 2026)",
    now: "2026-10-28T16:00:00Z",
    timezone: "America/New_York",
    day: 7,
    time: "06:00",
    nextEventUTC: "2026-11-01T11:00:00.000Z",
    rtc: "7:11:00",
  },
  {
    label: "New York, Sunday 06:00, no clock change this week",
    now: "2026-11-23T17:00:00Z",
    timezone: "America/New_York",
    day: 7,
    time: "06:00",
    nextEventUTC: "2026-11-29T11:00:00.000Z",
    rtc: "7:11:00",
  },
  {
    label: "London, Sunday 10:00, before clocks go forward (28 Mar 2027)",
    now: "2027-03-24T12:00:00Z",
    timezone: "Europe/London",
    day: 7,
    time: "10:00",
    nextEventUTC: "2027-03-28T09:00:00.000Z",
    rtc: "7:09:00",
  },
  {
    label: "Sydney, Sunday 10:00, before clocks go back (4 Apr 2027)",
    now: "2027-03-31T12:00:00Z",
    timezone: "Australia/Sydney",
    day: 7,
    time: "10:00",
    nextEventUTC: "2027-04-04T00:00:00.000Z",
    rtc: "7:00:00",
  },
]

const viewNames = ["scheduled-meetings", "combined-meetings"]

const client = new MongoDB.MongoClient(`${process.env.MONGO_URI}`)
// A database of its own: other specs keep plain collections under the view
// names in the shared test database.
const db = client.db("view-pipelines")
let definitions: ManagedViewDefinition[]

beforeAll(async () => {
  await client.connect()
  await db.dropDatabase()
  definitions = await loadManagedViewDefinitions()
})

beforeEach(async () => {
  await db.collection("meeting").deleteMany({})
  await db.collection("group").deleteMany({})
})

afterAll(async () => {
  await db.dropDatabase()
  await client.close()
})

describe.each(viewNames)("%s view", (viewName) => {
  test.each(cases)(
    "nextEventUTC and rtc: $label",
    async ({ now, timezone, day, time, nextEventUTC, rtc }) => {
      const definition = definitions.find((d) => d.name === viewName)
      if (!definition) throw new Error(`No view definition for ${viewName}`)

      const groupID = new MongoDB.ObjectId()
      await db.collection("group").insertOne({
        _id: groupID,
        name: "Test Group",
        email: "group@example.org",
      })
      await db.collection(definition.viewOn).insertOne({
        slug: "test-meeting",
        name: "Test Meeting",
        groupID,
        timezone,
        day,
        time,
        types: ["O"],
        languages: ["en"],
        updatedAt: new Date("2026-01-01T00:00:00Z"),
      })

      const pipeline = withNow(
        definition.pipeline,
        new Date(now),
      ) as MongoDB.Document[]
      const [meeting] = await db
        .collection(definition.viewOn)
        .aggregate(pipeline)
        .toArray()

      expect(meeting.nextEventUTC.toISOString()).toBe(nextEventUTC)
      expect(meeting.rtc).toBe(rtc)
    },
  )
})
