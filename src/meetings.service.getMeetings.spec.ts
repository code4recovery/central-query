import { ObjectId } from "mongodb"

import { jest } from "@jest/globals"

import { MeetingView } from "./storage/storage.types.js"

import { Group } from "./endpoints.types.js"
import { MeetingsOptions } from "./endpoint-options.types.js"

const mockMeetingStore = {
  meetingCollection: {} as unknown,
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

test("should return meetings with temporal filtering when start and hours are provided", async () => {
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
    {
      slug: "meeting-2",
      name: "Test Meeting 2",
      groupID: new ObjectId("507f1f77bcf86cd799439012"),
      nextEventUTC: "2026-01-06T11:00:00Z",
      rtc: "3:11:00",
      types: ["C"],
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

  const result = await meetingsService.getMeetings(options)

  assertOk(result)
  expect(result.val).toHaveLength(2)
  expect(result.val[0].slug).toBe("meeting-1")
  expect(result.val[0].groupID).toBe("507f1f77bcf86cd799439011")
  expect(result.val[0].timeUTC).toBe("2026-01-06T10:00:00Z")
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

test("should call query with a pipeline not containing temporal filtering when `scheduled: false` is present", async () => {
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
  console.log("Called pipeline:", JSON.stringify(calledPipeline, null, 2))
  expect(calledPipeline).toBeDefined()
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

test("should handle empty start time by not including temporal ranges", async () => {
  const mockMeetings: MeetingView[] = []
  mockMeetingStore.query.mockResolvedValue(mockMeetings)

  const options: MeetingsOptions = {
    limit: 100,
    type: "O",
  }

  const result = await meetingsService.getMeetings(options)

  assertOk(result)
  expect(result.val).toHaveLength(0)
  expect(mockMeetingStore.query).toHaveBeenCalledWith(
    expect.any(Array),
    "scheduled",
  )

  const calledPipeline = (mockMeetingStore.query as jest.Mock).mock.calls[0][0]
  console.log("Called pipeline:", JSON.stringify(calledPipeline, null, 2))
  expect(calledPipeline).toBeDefined()
  expect(calledPipeline).toEqual(
    expect.not.arrayContaining([
      expect.objectContaining({
        $match: expect.objectContaining({ rtc: expect.anything() }),
      }),
    ]),
  )
})

test("should pass through filter options to the pipeline", async () => {
  const mockMeetings: MeetingView[] = []
  mockMeetingStore.query.mockResolvedValue(mockMeetings)

  const options: MeetingsOptions = {
    start: "2026-01-06T09:00:00Z",
    hours: 2,
    limit: 50,
    type: "O",
    formats: ["IN_PERSON"],
    features: ["WHEELCHAIR"],
    communities: ["LGBTQ"],
    languages: ["en", "es"],
    nameQuery: "test",
  }

  await meetingsService.getMeetings(options)

  expect(mockMeetingStore.query).toHaveBeenCalledTimes(1)
  const calledPipeline = (mockMeetingStore.query as jest.Mock).mock.calls[0][0]
  expect(calledPipeline).toBeDefined()
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
  console.log("Result:", result)
  assertOk(result)
  expect(result.val[0].timeUTC).toBe(testDate)
})
