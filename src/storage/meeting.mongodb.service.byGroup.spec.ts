import { ObjectId } from "mongodb"

import { MeetingView } from "./storage.types.js"

import { byGroup } from "./meeting.mongodb.service.js"
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

test("byGroup without viewType should query combined view", async () => {
  const groupID = new ObjectId()

  const combinedMeetings: MeetingView[] = [
    {
      slug: "combined-meeting-1",
      name: "Combined Meeting 1",
      groupID,
      nextEventUTC: "2026-01-13T10:00:00Z",
      rtc: "3:10:00",
      types: ["O"],
      languages: [],
      timezone: "UTC",
    },
    {
      slug: "combined-meeting-2",
      name: "Combined Meeting 2",
      groupID,
      nextEventUTC: "2026-01-13T11:00:00Z",
      rtc: "3:11:00",
      types: ["O"],
      languages: [],
      timezone: "UTC",
    },
  ]

  await combined.insertMany(combinedMeetings)

  const result = await byGroup(groupID.toString())

  expect(result).toHaveLength(2)
  expect(result[0].name).toBe("Combined Meeting 1")
})

test("byGroup with viewType=scheduled should query only scheduled view", async () => {
  const groupID = new ObjectId()

  const scheduledMeetings: MeetingView[] = [
    {
      slug: "scheduled-meeting-1",
      name: "Scheduled Meeting 1",
      groupID,
      nextEventUTC: "2026-01-13T10:00:00Z",
      rtc: "3:10:00",
      types: ["O"],
      languages: [],
      timezone: "UTC",
    },
    {
      slug: "scheduled-meeting-2",
      name: "Scheduled Meeting 2",
      groupID,
      nextEventUTC: "2026-01-13T11:00:00Z",
      rtc: "3:11:00",
      types: ["O"],
      languages: [],
      timezone: "UTC",
    },
  ]

  const unscheduledMeetings: MeetingView[] = [
    {
      slug: "unscheduled-meeting",
      name: "Unscheduled Meeting",
      groupID,
      nextEventUTC: null,
      rtc: null,
      types: ["O"],
      languages: [],
      timezone: "UTC",
    },
  ]

  await scheduled.insertMany(scheduledMeetings)
  await unscheduled.insertMany(unscheduledMeetings)

  const result = await byGroup(groupID.toString(), "scheduled")

  expect(result).toHaveLength(2)
  expect(result.every((m) => m.nextEventUTC !== null)).toBe(true)
})

test("byGroup with viewType=unscheduled should query only unscheduled view", async () => {
  const groupID = new ObjectId()

  const scheduledMeetings: MeetingView[] = [
    {
      slug: "scheduled-meeting",
      name: "Scheduled Meeting",
      groupID,
      nextEventUTC: "2026-01-13T10:00:00Z",
      rtc: "3:10:00",
      types: ["O"],
      languages: [],
      timezone: "UTC",
    },
  ]

  const unscheduledMeetings: MeetingView[] = [
    {
      slug: "unscheduled-meeting-1",
      name: "Unscheduled Meeting 1",
      groupID,
      nextEventUTC: null,
      rtc: null,
      types: ["O"],
      languages: [],
      timezone: "UTC",
    },
    {
      slug: "unscheduled-meeting-2",
      name: "Unscheduled Meeting 2",
      groupID,
      nextEventUTC: null,
      rtc: null,
      types: ["O"],
      languages: [],
      timezone: "UTC",
    },
  ]

  await scheduled.insertMany(scheduledMeetings)
  await unscheduled.insertMany(unscheduledMeetings)

  const result = await byGroup(groupID.toString(), "unscheduled")

  expect(result).toHaveLength(2)
  expect(result.every((m) => m.nextEventUTC === null)).toBe(true)
})

test("byGroup with viewType=combined should query combined view", async () => {
  const groupID = new ObjectId()

  const combinedMeetings: MeetingView[] = [
    {
      slug: "combined-meeting-1",
      name: "Combined Meeting 1",
      groupID,
      nextEventUTC: "2026-01-13T10:00:00Z",
      rtc: "3:10:00",
      types: ["O"],
      languages: [],
      timezone: "UTC",
    },
    {
      slug: "combined-meeting-2",
      name: "Combined Meeting 2",
      groupID,
      nextEventUTC: null,
      rtc: null,
      types: ["O"],
      languages: [],
      timezone: "UTC",
    },
  ]

  await combined.insertMany(combinedMeetings)

  const result = await byGroup(groupID.toString(), "combined")

  expect(result).toHaveLength(2)
})
