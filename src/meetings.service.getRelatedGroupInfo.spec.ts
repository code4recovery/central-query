import { ObjectId } from "mongodb"

import { jest } from "@jest/globals"

import { MeetingView } from "./storage/storage.types.js"

import { Group } from "./endpoints.types.js"

const mockMeetingStore = {
  meetingCollection: {} as unknown,
  query: jest.fn(),
  bySlug: jest.fn<(slug: string) => Promise<MeetingView | null>>(),
  byGroup:
    jest.fn<(groupID: string, viewType?: string) => Promise<MeetingView[]>>(),
  getActiveTypes: jest.fn(),
  getActiveLanguages: jest.fn(),
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
})

test("should return group info and group meetings", async () => {
  const mockMeeting: MeetingView = {
    slug: "test-meeting",
    name: "Test Meeting",
    groupID: new ObjectId("507f1f77bcf86cd799439011"),
    nextEventUTC: "2026-01-06T10:00:00Z",
    rtc: "3:10:00",
    types: ["O"],
    languages: [],
    timezone: "UTC",
  }

  const mockGroup = {
    _id: new ObjectId("507f1f77bcf86cd799439011"),
    name: "Test Group",
  }

  const mockGroupMeetings: MeetingView[] = [
    mockMeeting,
    {
      slug: "another-meeting",
      name: "Another Meeting",
      groupID: new ObjectId("507f1f77bcf86cd799439011"),
      nextEventUTC: "2026-01-07T10:00:00Z",
      rtc: "4:10:00",
      types: ["C"],
      languages: [],
      timezone: "UTC",
    },
  ]

  mockMeetingStore.bySlug.mockResolvedValue(mockMeeting)
  mockGroupStore.byId.mockResolvedValue(mockGroup)
  mockMeetingStore.byGroup.mockResolvedValue(mockGroupMeetings)

  const result = await meetingsService.getRelatedGroupInfo("test-meeting")

  assertOk(result)
  expect(result.val.groupInfo).toEqual(mockGroup)
  expect(result.val.groupMeetings).toHaveLength(2)
  expect(result.val.groupMeetings[0].slug).toBe("test-meeting")
  expect(result.val.groupMeetings[0].timeUTC).toBe("2026-01-06T10:00:00Z")
  expect(result.val.groupMeetings[0].groupID).toBe("507f1f77bcf86cd799439011")
  expect(result.val.groupMeetings[1].slug).toBe("another-meeting")
  expect(result.val.groupMeetings[1].timeUTC).toBe("2026-01-07T10:00:00Z")
  expect(result.val.groupMeetings[1].groupID).toBe("507f1f77bcf86cd799439011")

  expect(mockMeetingStore.bySlug).toHaveBeenCalledWith(
    "test-meeting",
    "combined",
  )
  expect(mockGroupStore.byId).toHaveBeenCalledWith("507f1f77bcf86cd799439011")
  expect(mockMeetingStore.byGroup).toHaveBeenCalledWith(
    "507f1f77bcf86cd799439011",
    "combined",
  )
})

test("should return error when meeting not found", async () => {
  mockMeetingStore.bySlug.mockResolvedValue(null)

  const result = await meetingsService.getRelatedGroupInfo("nonexistent")

  expect(result.ok).toBe(false)
  expect(result.val).toBe("Meeting not found")
  expect(mockGroupStore.byId).not.toHaveBeenCalled()
  expect(mockMeetingStore.byGroup).not.toHaveBeenCalled()
})

test("should pass scheduled viewType to bySlug and byGroup", async () => {
  const mockMeeting: MeetingView = {
    slug: "scheduled-meeting",
    name: "Scheduled Meeting",
    groupID: new ObjectId("507f1f77bcf86cd799439011"),
    nextEventUTC: "2026-01-06T10:00:00Z",
    rtc: "3:10:00",
    types: ["O"],
    languages: [],
    timezone: "UTC",
  }

  const mockGroup = {
    _id: new ObjectId("507f1f77bcf86cd799439011"),
    name: "Test Group",
  }

  mockMeetingStore.bySlug.mockResolvedValue(mockMeeting)
  mockGroupStore.byId.mockResolvedValue(mockGroup)
  mockMeetingStore.byGroup.mockResolvedValue([mockMeeting])

  const result = await meetingsService.getRelatedGroupInfo(
    "scheduled-meeting",
    "scheduled",
  )

  assertOk(result)
  expect(mockMeetingStore.bySlug).toHaveBeenCalledWith(
    "scheduled-meeting",
    "scheduled",
  )
  expect(mockMeetingStore.byGroup).toHaveBeenCalledWith(
    "507f1f77bcf86cd799439011",
    "scheduled",
  )
})

test("should pass unscheduled viewType to bySlug and byGroup", async () => {
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

  const mockGroup = {
    _id: new ObjectId("507f1f77bcf86cd799439011"),
    name: "Test Group",
  }

  mockMeetingStore.bySlug.mockResolvedValue(mockMeeting)
  mockGroupStore.byId.mockResolvedValue(mockGroup)
  mockMeetingStore.byGroup.mockResolvedValue([mockMeeting])

  const result = await meetingsService.getRelatedGroupInfo(
    "unscheduled-meeting",
    "unscheduled",
  )

  assertOk(result)
  expect(mockMeetingStore.bySlug).toHaveBeenCalledWith(
    "unscheduled-meeting",
    "unscheduled",
  )
  expect(mockMeetingStore.byGroup).toHaveBeenCalledWith(
    "507f1f77bcf86cd799439011",
    "unscheduled",
  )
})

test("should map null nextEventUTC to null timeUTC in groupMeetings", async () => {
  const mockMeeting: MeetingView = {
    slug: "scheduled-meeting",
    name: "Scheduled Meeting",
    groupID: new ObjectId("507f1f77bcf86cd799439011"),
    nextEventUTC: "2026-01-06T10:00:00Z",
    rtc: "3:10:00",
    types: ["O"],
    languages: [],
    timezone: "UTC",
  }

  const mockGroup = {
    _id: new ObjectId("507f1f77bcf86cd799439011"),
    name: "Test Group",
  }

  const mockGroupMeetings: MeetingView[] = [
    mockMeeting,
    {
      slug: "unscheduled-in-group",
      name: "Unscheduled in Group",
      groupID: new ObjectId("507f1f77bcf86cd799439011"),
      nextEventUTC: null,
      rtc: null,
      types: ["O"],
      languages: [],
      timezone: "UTC",
    },
  ]

  mockMeetingStore.bySlug.mockResolvedValue(mockMeeting)
  mockGroupStore.byId.mockResolvedValue(mockGroup)
  mockMeetingStore.byGroup.mockResolvedValue(mockGroupMeetings)

  const result = await meetingsService.getRelatedGroupInfo("scheduled-meeting")

  assertOk(result)
  expect(result.val.groupMeetings).toHaveLength(2)
  expect(result.val.groupMeetings[0].timeUTC).toBe("2026-01-06T10:00:00Z")
  expect(result.val.groupMeetings[1].timeUTC).toBeNull()
  expect(result.val.groupMeetings[1].slug).toBe("unscheduled-in-group")
})
