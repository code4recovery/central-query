import { ObjectId } from "mongodb"

import { categorizedMeeting } from "./categorizeMeeting"
import {
  Category,
  COMMUNITIES,
  FEATURES,
  FORMATS,
  TYPE,
} from "../common/types.js"
import { MeetingView } from "../storage/storage.types"

test("Category bins created from all types list", () => {
  const allTypes: Category[] = [
    ...COMMUNITIES,
    ...FEATURES,
    ...FORMATS,
    ...TYPE,
  ]

  const meetingData: MeetingView = {
    slug: "meeting-1",
    name: "Meeting 1",
    types: allTypes,
    timezone: "America/New_York",
    rtc: "1:10:00",
    duration: 60,
    languages: ["en"],
    nextEventUTC: null,
    groupID: new ObjectId("123456789012345678901234"),
  }

  const newMeetingData = categorizedMeeting(meetingData)

  expect(newMeetingData.type).toBe("C")
  expect(newMeetingData.communities.sort()).toStrictEqual(
    [...COMMUNITIES].sort(),
  )
  expect(newMeetingData.features.sort()).toStrictEqual([...FEATURES].sort())
  expect(newMeetingData.formats.sort()).toStrictEqual([...FORMATS].sort())
})

test("Gracefully handles null `types`", () => {
  const meetingData: MeetingView = {
    slug: "meeting-2",
    name: "Meeting 2",
    timezone: "America/New_York",
    rtc: "1:10:00",
    duration: 60,
    languages: ["en"],
    nextEventUTC: null,
    groupID: new ObjectId("123456789012345678901234"),
  }
  const newMeetingData = categorizedMeeting(meetingData)

  expect(newMeetingData.type).toBeUndefined()
  expect(newMeetingData.communities).toStrictEqual([])
  expect(newMeetingData.features).toStrictEqual([])
  expect(newMeetingData.formats).toStrictEqual([])
})

test("handles empty types array", () => {
  const meetingData: MeetingView = {
    slug: "meeting-3",
    name: "Meeting 3",
    timezone: "America/New_York",
    rtc: "1:10:00",
    duration: 60,
    languages: ["en"],
    types: [],
    nextEventUTC: null,
    groupID: new ObjectId("123456789012345678901234"),
  }
  const newMeetingData = categorizedMeeting(meetingData)

  expect(newMeetingData.type).toBeUndefined()
  expect(newMeetingData.communities).toStrictEqual([])
  expect(newMeetingData.features).toStrictEqual([])
  expect(newMeetingData.formats).toStrictEqual([])
})

test("deletes types property from input meeting", () => {
  const meetingData: MeetingView = {
    slug: "meeting-4",
    name: "Meeting 4",
    timezone: "America/New_York",
    rtc: "1:10:00",
    duration: 60,
    languages: ["en"],
    types: ["O", "D"],
    nextEventUTC: null,
    groupID: new ObjectId("123456789012345678901234"),
  }

  expect(meetingData.types).toEqual(["O", "D"])

  categorizedMeeting(meetingData)

  expect(meetingData.types).toBeUndefined()
})

test("prefers closed ('C') over open ('O') when both types are present", () => {
  const meetingData: MeetingView = {
    slug: "meeting-5",
    name: "Meeting 5",
    timezone: "America/New_York",
    rtc: "1:10:00",
    duration: 60,
    languages: ["en"],
    types: ["C", "O"],
    nextEventUTC: null,
    groupID: new ObjectId("123456789012345678901234"),
  }

  const result = categorizedMeeting(meetingData)

  expect(result.type).toBe("C")
})
test("returns first type when multiple values for the type category are present", () => {
  const meetingData: MeetingView = {
    slug: "meeting-5",
    name: "Meeting 5",
    timezone: "America/New_York",
    rtc: "1:10:00",
    duration: 60,
    languages: ["en"],
    types: ["C", "O"],
    nextEventUTC: null,
    groupID: new ObjectId("123456789012345678901234"),
  }

  const result = categorizedMeeting(meetingData)

  expect(result.type).toBe("C")
})
