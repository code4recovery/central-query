import fs from "fs"
import { ObjectId } from "mongodb"

/** TODO: Replace this file with Integration test through Cypress, otherwise update from server-side-demo */
import { jest } from "@jest/globals"

import {
  bySlug,
  meetingCollection,
} from "./meeting.mongodb.service.js"
import {
  configuredMongoDatabase,
  mongoClient,
  useCollection,
} from "./mongodb-storage-service.js"
import { MeetingModel } from "./storage.types.js"

const meetingsTestData = JSON.parse(
  fs.readFileSync("cypress/fixtures/meetings.json", "utf-8"),
)

// Copilot: Process meetingsTestData and groupsTestData to strip out $oid and associated braces
const cleanedMeetingsTestData = meetingsTestData.map((meeting) => {
  meeting.groupID = new ObjectId(meeting.groupID.$oid)
  return meeting
})

const testMeetingsCollection = useCollection("meeting")<MeetingModel>(
  configuredMongoDatabase,
)

async function resetDatabase() {
  await meetingCollection.deleteMany({})
}

beforeEach(async () => {
  await resetDatabase()
})
afterAll(async () => {
  await mongoClient.close()
  jest.useRealTimers()
})

test("bySlug returns a single document", async () => {
  await testMeetingsCollection.insertMany(cleanedMeetingsTestData)

  const result = await bySlug("global-mens-meditation-6")

  expect(result).not.toBeNull()
  expect(result!.name).toBe("Global Men's Meditation")
})
