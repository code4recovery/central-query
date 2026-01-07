import fs from "fs"

/** TODO: Replace this file with Integration test through Cypress, otherwise update from server-side-demo */
import { jest } from "@jest/globals"

import { MeetingView } from "./storage.types.js"

import { bySlug, meetingCollection, query } from "./meeting.mongodb.service.js"
import {
  configuredMongoDatabase,
  mongoClient,
  useCollection,
} from "./mongodb-storage-service.js"

const testData = JSON.parse(
  fs.readFileSync(
    "cypress/fixtures/test-data.meeting-view-sorted-rtc.json",
    "utf-8",
  ),
)

const scheduled = useCollection<MeetingView>("scheduled-meetings")(
  configuredMongoDatabase,
)

async function resetDatabase() {
  await meetingCollection.deleteMany({})
  await scheduled.deleteMany({})
}

beforeEach(async () => {
  await resetDatabase()
})

afterAll(async () => {
  await mongoClient.close()
  jest.useRealTimers()
})

test("bySlug returns a single document", async () => {
  await scheduled.insertMany(testData)
  const result = await bySlug("vegas-women-in-the-big-book-1")

  expect(result).not.toBeNull()
  expect(result!.name).toBe("Vegas Women In The Big Book")
})

test("query returns multiple documents", async () => {
  await scheduled.insertMany(testData)
  const result = await query([
    { $match: { rtc: { $gte: "2:14:48" } } },
    { $limit: 25 },
  ])

  expect(result).not.toBeNull()
  expect(result.length).toBe(25)
})
