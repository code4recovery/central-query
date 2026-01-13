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

test("bySlug always queries combined view for scheduled meetings", async () => {
  const meeting: MeetingView = {
    slug: "test-scheduled-meeting",
    name: "Test Scheduled Meeting",
    groupID: new ObjectId(),
    nextEventUTC: "2026-01-13T10:00:00Z",
    rtc: "3:10:00",
    types: ["O"],
    languages: [],
    timezone: "UTC",
  }

  await combined.insertOne(meeting)
  const result = await bySlug("test-scheduled-meeting")

  expect(result).not.toBeNull()
  expect(result!.name).toBe("Test Scheduled Meeting")
  expect(result!.nextEventUTC).toBe("2026-01-13T10:00:00Z")
})

test("bySlug always queries combined view for unscheduled meetings", async () => {
  const unscheduledMeeting: MeetingView = {
    slug: "unscheduled-only",
    name: "Unscheduled Only Meeting",
    groupID: new ObjectId(),
    nextEventUTC: null,
    rtc: null,
    types: ["O"],
    languages: [],
    timezone: "UTC",
  }

  await combined.insertOne(unscheduledMeeting)

  const result = await bySlug("unscheduled-only")

  expect(result).not.toBeNull()
  expect(result!.name).toBe("Unscheduled Only Meeting")
  expect(result!.nextEventUTC).toBeNull()
})
