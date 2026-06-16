import { ObjectId } from "mongodb"

import { jest } from "@jest/globals"

import { MeetingView } from "./storage/storage.types.js"

import { Group } from "./endpoints.types.js"
import { MeetingsOptions } from "./endpoint-options.types.js"

const mockMeetingStore = {
  query:
    jest.fn<
      (queryPipeline: unknown[], viewType?: string) => Promise<MeetingView[]>
    >(),
  bySlug: jest.fn<(slug: string) => Promise<MeetingView | null>>(),
  byGroup:
    jest.fn<(groupID: string, viewType?: string) => Promise<MeetingView[]>>(),
  getActiveTypes:
    jest.fn<() => Promise<Array<{ code: string; desc: string }>>>(),
  getActiveLanguages:
    jest.fn<() => Promise<Array<{ English: string; alpha2: string }>>>(),
}

const mockGroupStore = {
  groupView: {} as unknown,
  byId: jest.fn<(id: string) => Promise<Group | null>>(),
}

jest.unstable_mockModule(
  "./storage/meeting.mongodb.service.js",
  () => mockMeetingStore,
)
jest.unstable_mockModule(
  "./storage/group.mongodb.service.js",
  () => mockGroupStore,
)

const meetingsService = await import("./meetings.service.js")

function assertOk<T>(
  result: { ok: true; val: T } | { ok: false; val: string },
): asserts result is { ok: true; val: T } {
  expect(result.ok).toBe(true)
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.useFakeTimers()
  jest.setSystemTime(new Date("2026-01-06T09:00:00Z"))
})

afterEach(() => {
  jest.useRealTimers()
})

test("should call query with scheduled viewType when start and hours are provided", async () => {
  const mockMeetings: MeetingView[] = [
    {
      slug: "meeting-1",
      name: "Test Meeting 1",
      groupID: new ObjectId("507f1f77bcf86cd799439011"),
      nextEventUTC: "2026-01-06T10:00:00Z",
      rtc: "3:10:00",
      types: ["O"],
      languages: [],
      timezone: "UTC",
    },
  ]

  mockMeetingStore.query.mockResolvedValue(mockMeetings)

  const options: MeetingsOptions = {
    start: "2026-01-06T09:00:00Z",
    hours: 3,
    limit: 100,
  }

  await meetingsService.getMeetings(options)

  expect(mockMeetingStore.query).toHaveBeenCalledWith(
    expect.any(Array),
    "scheduled",
  )
})

test("should call query with viewType 'unscheduled' when the `scheduled: false` is present", async () => {
  const mockMeetings: MeetingView[] = []
  mockMeetingStore.query.mockResolvedValue(mockMeetings)

  const options: MeetingsOptions = {
    limit: 100,
    scheduled: false,
  }

  await meetingsService.getMeetings(options)

  expect(mockMeetingStore.query).toHaveBeenCalledWith(
    expect.any(Array),
    "unscheduled",
  )
})

test("should exclude rtc temporal filters from pipeline when scheduled=false", async () => {
  const mockMeetings: MeetingView[] = []
  mockMeetingStore.query.mockResolvedValue(mockMeetings)

  const options: MeetingsOptions = {
    type: "O",
    scheduled: false,
    start: "2026-01-06T09:00:00Z",
    hours: 3,
  }

  await meetingsService.getMeetings(options)

  const calledPipeline = (mockMeetingStore.query as jest.Mock).mock.calls[0][0]
  expect(calledPipeline).toEqual(
    expect.not.arrayContaining([
      expect.objectContaining({
        $match: expect.objectContaining({ rtc: expect.anything() }),
      }),
    ]),
  )
  expect(mockMeetingStore.query).toHaveBeenCalledWith(
    expect.any(Array),
    "unscheduled",
  )
})

test("should default to scheduled viewType when no temporal params provided", async () => {
  const mockMeetings: MeetingView[] = []
  mockMeetingStore.query.mockResolvedValue(mockMeetings)

  const options: MeetingsOptions = {
    limit: 100,
    type: "O",
  }

  await meetingsService.getMeetings(options)

  expect(mockMeetingStore.query).toHaveBeenCalledWith(
    expect.any(Array),
    "scheduled",
  )
})

test("should include rtc filters in pipeline when start and hours provided", async () => {
  const mockMeetings: MeetingView[] = []
  mockMeetingStore.query.mockResolvedValue(mockMeetings)

  const options: MeetingsOptions = {
    start: "2026-01-06T09:00:00Z",
    hours: 3,
    limit: 100,
  }

  await meetingsService.getMeetings(options)

  const calledPipeline = (mockMeetingStore.query as jest.Mock).mock.calls[0][0]
  expect(calledPipeline).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        $match: expect.objectContaining({ rtc: expect.anything() }),
      }),
    ]),
  )
})

test("should transform groupID from ObjectId to string", async () => {
  const mockMeetings: MeetingView[] = [
    {
      slug: "meeting-1",
      name: "Test Meeting",
      groupID: new ObjectId("507f1f77bcf86cd799439011"),
      nextEventUTC: "2026-01-06T10:00:00Z",
      rtc: "3:10:00",
      types: ["O"],
      languages: [],
      timezone: "UTC",
    },
  ]

  mockMeetingStore.query.mockResolvedValue(mockMeetings)

  const result = await meetingsService.getMeetings({ limit: 100 })

  assertOk(result)
  expect(result.val[0].groupID).toBe("507f1f77bcf86cd799439011")
  expect(typeof result.val[0].groupID).toBe("string")
})

test("should map nextEventUTC to timeUTC in response", async () => {
  const testDate = "2026-01-06T15:30:00Z"
  const mockMeetings: MeetingView[] = [
    {
      slug: "meeting-1",
      name: "Test Meeting",
      groupID: new ObjectId("507f1f77bcf86cd799439011"),
      nextEventUTC: testDate,
      rtc: "3:15:30",
      types: ["O"],
      languages: [],
      timezone: "UTC",
    },
  ]

  mockMeetingStore.query.mockResolvedValue(mockMeetings)

  const result = await meetingsService.getMeetings({ limit: 100 })
  assertOk(result)
  expect(result.val[0].timeUTC).toBe(testDate)
})

test("should map null nextEventUTC to null timeUTC for unscheduled meetings", async () => {
  const mockMeetings: MeetingView[] = [
    {
      slug: "unscheduled-meeting",
      name: "Unscheduled Meeting",
      groupID: new ObjectId("507f1f77bcf86cd799439011"),
      nextEventUTC: null,
      rtc: null,
      types: ["O"],
      languages: [],
      timezone: "UTC",
    },
  ]

  mockMeetingStore.query.mockResolvedValue(mockMeetings)

  const result = await meetingsService.getMeetings({
    limit: 100,
    scheduled: false,
  })
  assertOk(result)
  expect(result.val[0].timeUTC).toBeNull()
  expect(result.val[0].slug).toBe("unscheduled-meeting")
})
