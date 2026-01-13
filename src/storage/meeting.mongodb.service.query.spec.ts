import { ObjectId } from "mongodb"

import { MeetingView } from "./storage.types.js"

import {
  configuredMongoDatabase,
  mongoClient,
  useCollection,
} from "./mongodb-storage-service.js"
import { query } from "./meeting.mongodb.service.js"

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

test("query returns multiple scheduled meetings", async () => {
  const meetings: MeetingView[] = [
    {
      slug: "meeting-1",
      name: "Meeting 1",
      groupID: new ObjectId(),
      nextEventUTC: "2026-01-13T10:00:00Z",
      rtc: "3:10:00",
      types: ["O"],
      languages: [],
      timezone: "UTC",
    },
    {
      slug: "meeting-2",
      name: "Meeting 2",
      groupID: new ObjectId(),
      nextEventUTC: "2026-01-13T11:00:00Z",
      rtc: "3:11:00",
      types: ["O"],
      languages: [],
      timezone: "UTC",
    },
  ]

  await scheduled.insertMany(meetings)
  const result = await query([{ $match: { types: "O" } }], "scheduled")

  expect(result).not.toBeNull()
  expect(result.length).toBe(2)
})

test("query without viewType should query combined view", async () => {
  const combinedMeetings: MeetingView[] = [
    {
      slug: "combined-1",
      name: "Combined Meeting 1",
      groupID: new ObjectId(),
      nextEventUTC: "2026-01-13T10:00:00Z",
      rtc: "3:10:00",
      types: ["O"],
      languages: [],
      timezone: "UTC",
    },
    {
      slug: "combined-2",
      name: "Combined Meeting 2",
      groupID: new ObjectId(),
      nextEventUTC: "2026-01-13T11:00:00Z",
      rtc: "3:11:00",
      types: ["O"],
      languages: [],
      timezone: "UTC",
    },
  ]

  await combined.insertMany(combinedMeetings)

  const result = await query([{ $match: { types: "O" } }])

  expect(result.length).toBe(2)
})

test("query with viewType=unscheduled should query only unscheduled view", async () => {
  const scheduledMeetings: MeetingView[] = [
    {
      slug: "scheduled-1",
      name: "Scheduled Meeting 1",
      groupID: new ObjectId(),
      nextEventUTC: "2026-01-13T10:00:00Z",
      rtc: "3:10:00",
      types: ["O"],
      languages: [],
      timezone: "UTC",
    },
  ]

  const unscheduledMeetings: MeetingView[] = [
    {
      slug: "unscheduled-1",
      name: "Unscheduled Meeting 1",
      groupID: new ObjectId(),
      nextEventUTC: null,
      rtc: null,
      types: ["O"],
      languages: [],
      timezone: "UTC",
    },
    {
      slug: "unscheduled-2",
      name: "Unscheduled Meeting 2",
      groupID: new ObjectId(),
      nextEventUTC: null,
      rtc: null,
      types: ["O"],
      languages: [],
      timezone: "UTC",
    },
  ]

  await scheduled.insertMany(scheduledMeetings)
  await unscheduled.insertMany(unscheduledMeetings)

  const result = await query([{ $match: { types: "O" } }], "unscheduled")

  expect(result.length).toBe(2)
  expect(result.every((m) => m.nextEventUTC === null)).toBe(true)
})

test("query with viewType=combined should query combined view", async () => {
  const combinedMeetings: MeetingView[] = [
    {
      slug: "combined-1",
      name: "Combined Meeting 1",
      groupID: new ObjectId(),
      nextEventUTC: "2026-01-13T10:00:00Z",
      rtc: "3:10:00",
      types: ["O"],
      languages: [],
      timezone: "UTC",
    },
    {
      slug: "combined-2",
      name: "Combined Meeting 2",
      groupID: new ObjectId(),
      nextEventUTC: null,
      rtc: null,
      types: ["O"],
      languages: [],
      timezone: "UTC",
    },
  ]

  await combined.insertMany(combinedMeetings)

  const result = await query([{ $match: { types: "O" } }], "combined")

  expect(result.length).toBe(2)
})
