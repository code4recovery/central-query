/** TODO: Replace this file with Integration test through Cypress, otherwise update from server-side-demo */
import { jest } from "@jest/globals"

import { PrevWeekday } from "../utils/dates.js"
import {
  addMeetings,
  getAllMeetings,
  meetingCollection,
} from "./meeting.mongodb.service.js"
import { mongoClient } from "./mongodb-storage-service.js"

async function setupDatabase(data: TestData[]) {
  await meetingCollection.insertMany(data)
}

export interface TestData {
  day: PrevWeekday
  time: string
  timezone: string
  name: string
}

const testEvents: TestData[] = [
  {
    name: "Su-1830", // 2330Z; in DST 22:30Z
    time: "18:30",
    day: 0,
    timezone: "America/New_York",
  },
  {
    name: "Su-2300", // 2300Z
    time: "23:00",
    day: 0,
    timezone: "Atlantic/Reykjavik",
  },
  {
    name: "Su-1645", // 2345Z
    time: "16:45",
    day: 0,
    timezone: "America/Phoenix",
  },
  {
    name: "Su-2200", // 0300Z on Monday; in DST 0200Z on Monday
    time: "22:00",
    day: 0,
    timezone: "America/New_York",
  },
  {
    name: "Su-1500", // 2000Z; in DST 1900Z
    time: "15:00",
    day: 0,
    timezone: "America/New_York",
  },
]

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

test("getAllMeetings returns five documents", async () => {
  await setupDatabase(testEvents)
  expect(await getAllMeetings()).toHaveLength(5)
})

test("addMeetings works", async () => {
  expect((await addMeetings(testEvents)).insertedCount).toBe(5)
})
