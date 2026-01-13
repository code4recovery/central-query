import { ObjectId } from "mongodb"

import { jest } from "@jest/globals"

import { MeetingView } from "./storage/storage.types.js"

const mockMeetingStore = {
  meetingCollection: {} as unknown,
  query: jest.fn(),
  bySlug: jest.fn<(slug: string) => Promise<MeetingView | null>>(),
  byGroup: jest.fn(),
  getActiveTypes: jest.fn(),
  getActiveLanguages: jest.fn(),
}

const mockGroupStore = {
  groupView: {} as unknown,
  byId: jest.fn(),
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
})

test("should return a meeting when found", async () => {
  const mockMeeting: MeetingView = {
    slug: "test-meeting",
    name: "Test Meeting",
    groupID: new ObjectId("507f1f77bcf86cd799439011"),
    nextEventUTC: "2026-01-06T10:00:00Z",
    rtc: "3:10:00",
    types: ["O", "B"],
    languages: [],
    timezone: "UTC",
  }

  mockMeetingStore.bySlug.mockResolvedValue(mockMeeting)

  const result = await meetingsService.getBySlug("test-meeting")

  assertOk(result)
  expect(result.val.slug).toBe("test-meeting")
  expect(result.val.name).toBe("Test Meeting")
  expect(result.val.groupID).toBe("507f1f77bcf86cd799439011")
  expect(result.val.timeUTC).toBe("2026-01-06T10:00:00Z")
})

test("should return error when meeting not found", async () => {
  mockMeetingStore.bySlug.mockResolvedValue(null)

  const result = await meetingsService.getBySlug("nonexistent-meeting")

  expect(result.ok).toBe(false)
  expect(result.val).toBe("Meeting not found")
})

test("should call bySlug with combined when no viewType specified", async () => {
  const mockMeeting: MeetingView = {
    slug: "test-default",
    name: "Test Default Meeting",
    groupID: new ObjectId("507f1f77bcf86cd799439011"),
    nextEventUTC: "2026-01-06T10:00:00Z",
    rtc: "3:10:00",
    types: ["O"],
    languages: [],
    timezone: "UTC",
  }

  mockMeetingStore.bySlug.mockResolvedValue(mockMeeting)

  const result = await meetingsService.getBySlug("test-default")

  assertOk(result)
  expect(mockMeetingStore.bySlug).toHaveBeenCalledWith(
    "test-default",
    "combined",
  )
})

test("should call bySlug with scheduled when viewType=scheduled", async () => {
  const mockMeeting: MeetingView = {
    slug: "test-scheduled",
    name: "Test Scheduled Meeting",
    groupID: new ObjectId("507f1f77bcf86cd799439011"),
    nextEventUTC: "2026-01-06T10:00:00Z",
    rtc: "3:10:00",
    types: ["O"],
    languages: [],
    timezone: "UTC",
  }

  mockMeetingStore.bySlug.mockResolvedValue(mockMeeting)

  const result = await meetingsService.getBySlug("test-scheduled", "scheduled")

  assertOk(result)
  expect(mockMeetingStore.bySlug).toHaveBeenCalledWith(
    "test-scheduled",
    "scheduled",
  )
})

test("should call bySlug with unscheduled when viewType=unscheduled", async () => {
  const mockMeeting: MeetingView = {
    slug: "test-unscheduled",
    name: "Test Unscheduled Meeting",
    groupID: new ObjectId("507f1f77bcf86cd799439011"),
    nextEventUTC: null,
    rtc: null,
    types: ["O"],
    languages: [],
    timezone: "UTC",
  }

  mockMeetingStore.bySlug.mockResolvedValue(mockMeeting)

  const result = await meetingsService.getBySlug(
    "test-unscheduled",
    "unscheduled",
  )

  assertOk(result)
  expect(mockMeetingStore.bySlug).toHaveBeenCalledWith(
    "test-unscheduled",
    "unscheduled",
  )
})

test("should map null nextEventUTC to null timeUTC in return value", async () => {
  const mockMeeting: MeetingView = {
    slug: "unscheduled-meeting",
    name: "Unscheduled Meeting",
    groupID: new ObjectId("507f1f77bcf86cd799439011"),
    nextEventUTC: null,
    rtc: null,
    types: ["O"],
    languages: [],
    timezone: "UTC",
  }

  mockMeetingStore.bySlug.mockResolvedValue(mockMeeting)

  const result = await meetingsService.getBySlug("unscheduled-meeting")

  assertOk(result)
  expect(result.val.timeUTC).toBeNull()
  expect(result.val.slug).toBe("unscheduled-meeting")
})
