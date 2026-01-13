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

test("bySlug returns a single scheduled meeting", async () => {
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

  await scheduled.insertOne(meeting)
  const result = await bySlug("test-scheduled-meeting", "scheduled")

  expect(result).not.toBeNull()
  expect(result!.name).toBe("Test Scheduled Meeting")
})

test("bySlug without viewType should query combined (both scheduled and unscheduled)", async () => {
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
})

test("bySlug with viewType=scheduled should query only scheduled view", async () => {
  const scheduledMeeting: MeetingView = {
    slug: "test-meeting",
    name: "Scheduled Meeting",
    groupID: new ObjectId(),
    nextEventUTC: "2026-01-13T10:00:00Z",
    rtc: "3:10:00",
    types: ["O"],
    languages: [],
    timezone: "UTC",
  }

  const unscheduledMeeting: MeetingView = {
    slug: "unscheduled-meeting",
    name: "Unscheduled Meeting",
    groupID: new ObjectId(),
    nextEventUTC: null,
    rtc: null,
    types: ["O"],
    languages: [],
    timezone: "UTC",
  }

  await scheduled.insertOne(scheduledMeeting)
  await unscheduled.insertOne(unscheduledMeeting)

  const result = await bySlug("test-meeting", "scheduled")

  expect(result).not.toBeNull()
  expect(result!.name).toBe("Scheduled Meeting")

  const notFound = await bySlug("unscheduled-meeting", "scheduled")
  expect(notFound).toBeNull()
})

test("bySlug with viewType=unscheduled should query only unscheduled view", async () => {
  const scheduledMeeting: MeetingView = {
    slug: "scheduled-meeting",
    name: "Scheduled Meeting",
    groupID: new ObjectId(),
    nextEventUTC: "2026-01-13T10:00:00Z",
    rtc: "3:10:00",
    types: ["O"],
    languages: [],
    timezone: "UTC",
  }

  const unscheduledMeeting: MeetingView = {
    slug: "test-meeting",
    name: "Unscheduled Meeting",
    groupID: new ObjectId(),
    nextEventUTC: null,
    rtc: null,
    types: ["O"],
    languages: [],
    timezone: "UTC",
  }

  await scheduled.insertOne(scheduledMeeting)
  await unscheduled.insertOne(unscheduledMeeting)

  const result = await bySlug("test-meeting", "unscheduled")

  expect(result).not.toBeNull()
  expect(result!.name).toBe("Unscheduled Meeting")

  const notFound = await bySlug("scheduled-meeting", "unscheduled")
  expect(notFound).toBeNull()
})

test("bySlug with viewType=combined should query combined view", async () => {
  const testMeeting: MeetingView = {
    slug: "combined-test",
    name: "Combined Test Meeting",
    groupID: new ObjectId(),
    nextEventUTC: "2026-01-13T10:00:00Z",
    rtc: "3:10:00",
    types: ["O"],
    languages: [],
    timezone: "UTC",
  }

  await combined.insertOne(testMeeting)

  const result = await bySlug("combined-test", "combined")

  expect(result).not.toBeNull()
  expect(result!.name).toBe("Combined Test Meeting")
})
