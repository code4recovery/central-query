import { jest } from "@jest/globals"

const mockMeetingStore = {
  meetingCollection: {} as unknown,
  query: jest.fn(),
  bySlug: jest.fn(),
  byGroup: jest.fn(),
  getActiveTypes:
    jest.fn<() => Promise<Array<{ code: string; desc: string }>>>(),
  getActiveLanguages:
    jest.fn<() => Promise<Array<{ English: string; alpha2: string }>>>(),
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

test("should return categorized facets and languages", async () => {
  const mockScheduledActiveTypes = [
    { code: "O", desc: "Open" },
    { code: "C", desc: "Closed" },
    { code: "IN_PERSON", desc: "In Person" },
    { code: "ONLINE", desc: "Online" },
    { code: "WHEELCHAIR", desc: "Wheelchair Accessible" },
    { code: "LGBTQ", desc: "LGBTQ" },
  ]
  const mockUnscheduledActiveTypes = [
    { code: "C", desc: "Closed" },
    { code: "ONLINE", desc: "Online" },
  ]
  const mockScheduledLanguages = [
    { English: "en", alpha2: "English" },
    { English: "es", alpha2: "Spanish" },
  ]
  const mockUnscheduledLanguages = [{ English: "fr", alpha2: "French" }]

  mockMeetingStore.getActiveTypes
    .mockResolvedValueOnce(mockScheduledActiveTypes)
    .mockResolvedValueOnce(mockUnscheduledActiveTypes)
  mockMeetingStore.getActiveLanguages
    .mockResolvedValueOnce(mockScheduledLanguages)
    .mockResolvedValueOnce(mockUnscheduledLanguages)

  const result = await meetingsService.getFacets()

  assertOk(result)
  expect(result.val.scheduled).toBeDefined()
  expect(result.val.unscheduled).toBeDefined()

  expect(result.val.scheduled.categories).toBeDefined()
  expect(result.val.scheduled.categories.type).toBeDefined()
  expect(result.val.scheduled.categories.formats).toBeDefined()
  expect(result.val.scheduled.categories.features).toBeDefined()
  expect(result.val.scheduled.categories.communities).toBeDefined()
  expect(result.val.scheduled.languages).toEqual(mockScheduledLanguages)

  expect(result.val.unscheduled.categories).toBeDefined()
  expect(result.val.unscheduled.categories.type).toBeDefined()
  expect(result.val.unscheduled.categories.formats).toBeDefined()
  expect(result.val.unscheduled.categories.features).toBeDefined()
  expect(result.val.unscheduled.categories.communities).toBeDefined()
  expect(result.val.unscheduled.languages).toEqual(mockUnscheduledLanguages)
})

test("should call storage methods for active types and languages", async () => {
  mockMeetingStore.getActiveTypes.mockResolvedValue([])
  mockMeetingStore.getActiveLanguages.mockResolvedValue([])

  await meetingsService.getFacets()

  expect(mockMeetingStore.getActiveTypes).toHaveBeenCalledTimes(2)
  expect(mockMeetingStore.getActiveLanguages).toHaveBeenCalledTimes(2)
})
