import { ObjectId } from "mongodb"

import { MeetingView } from "./storage.types.js"

import { bySlug } from "./meeting.mongodb.service.js"
import {
  configuredMongoDatabase,
  mongoClient,
  useCollection,
} from "./mongodb-storage-service.js"

const scheduled = useCollection<MeetingView>("scheduled-meetings")(
  configuredMongoDatabase,
)

const unscheduled = useCollection<MeetingView>("unscheduled-meetings")(
  configuredMongoDatabase,
)

const combined = useCollection<MeetingView>("combined-meetings")(
  configuredMongoDatabase,
)

async function resetDatabase() {
  await scheduled.deleteMany({})
  await unscheduled.deleteMany({})
  await combined.deleteMany({})
}

beforeEach(async () => {
  await resetDatabase()
})

afterAll(async () => {
  await mongoClient.close()
})

test("bySlug queries combined view and returns meeting by slug", async () => {
  const meeting: MeetingView = {
    slug: "test-meeting",
    name: "Test Meeting",
    groupID: new ObjectId(),
    nextEventUTC: "2026-01-13T10:00:00Z",
    rtc: "3:10:00",
    types: ["O"],
    languages: [],
    timezone: "UTC",
  }

  await combined.insertOne(meeting)
  const result = await bySlug("test-meeting")

  expect(result).not.toBeNull()
  expect(result!.name).toBe("Test Meeting")
  expect(result!.slug).toBe("test-meeting")
})

test("bySlug returns null when meeting not found", async () => {
  const result = await bySlug("nonexistent-slug")

  expect(result).toBeNull()
})
