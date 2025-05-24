import { DateTime } from "luxon"

import { jest } from "@jest/globals"

import { convertRTCtoUTC } from "./dates.js"

jest.useFakeTimers({ doNotFake: ["nextTick", "setImmediate"] })

const setMockTime = (dateTime: string) => jest.setSystemTime(new Date(dateTime))

/** Given Monday, 28 April, 1 minute past midnight UTC,
 * When the RTC is 1:01:00
 * Then convertRTCtoUTC should return 2025-04-28T01:00:00Z
 */
test("convertRTCtoUTC works correctly when meeting scheduled for later that same day", () => {
  setMockTime("2025-04-28T00:01:00.000Z")

  expect(convertRTCtoUTC("1:01:00")).toEqual(
    DateTime.fromISO("2025-04-28T01:00:00Z").toUTC(),
  )
})

/** Given Monday, 28 April, at 1 minute past 0100 UTC
 * When the RTC is 1:01:00
 * Then convertRTCtoUTC should return 2025-05-05T01:00:00Z
 */
test("convertRTCtoUTC works correctly when meeting schedule already has passed for that day", () => {
  setMockTime("2025-04-28T01:01:00.000Z")

  expect(convertRTCtoUTC("1:01:00")).toEqual(
    DateTime.fromISO("2025-05-05T01:00:00Z").toUTC(),
  )
})

/** Given a Tuesday in late April
 * When the RTC is 1:01:00
 * Then convertRTCtoUTC should return 2025-05-05T01:00:00Z
 */
test("convertRTCtoUTC works correctly when meeting scheduled is previous day", () => {
  setMockTime("2025-04-29T00:00:00.000Z")

  expect(convertRTCtoUTC("1:01:00")).toEqual(
    DateTime.fromISO("2025-05-05T01:00:00Z").toUTC(),
  )
})

/** Given a Wednesday in late April
 * When the RTC is 1:01:00
 * Then convertRTCtoUTC should return 2025-04-30T01:00:00Z
 */
test("convertRTCtoUTC works correctly for a meeting scheduled on Monday when it is currently Wednesday", () => {
  setMockTime("2025-04-30T02:00:00.000Z")

  expect(convertRTCtoUTC("1:01:00")).toEqual(
    DateTime.fromISO("2025-05-05T01:00:00Z").toUTC(),
  )
})

/** Given a Sunday in late April
 * When the RTC is 1:01:00
 * Then convertRTCtoUTC should return 2025-04-28T01:00:00Z
 */
test("convertRTCtoUTC works correctly for a meeting scheduled on Monday when it is currently Sunday at 2300", () => {
  setMockTime("2025-04-27T23:00:00.000Z")

  expect(convertRTCtoUTC("1:01:00")).toEqual(
    DateTime.fromISO("2025-04-28T01:00:00Z").toUTC(),
  )
})

/** Given Sunday, 27 April, at noon UTC
 * When the RTC is 4:01:00
 * Then convertRTCtoUTC should return 2025-05-01T01:00:00Z
 */
test("convertRTCtoUTC works correctly for a meeting scheduled on Thursday when it is currently Sunday at noon UTC", () => {
  setMockTime("2025-04-27T12:00:00.000Z")

  expect(convertRTCtoUTC("4:01:00")).toEqual(
    DateTime.fromISO("2025-05-01T01:00:00Z").toUTC(),
  )
})

/** Given Thursday, May 1, 2025, at 01:00 UTC
 * When the RTC is 4:01:00
 * Then convertRTCtoUTC should return 2025-05-01T01:00:00Z
 */
test("convertRTCtoUTC works correctly for a meeting is scheduled on Monday for now", () => {
  setMockTime("2025-05-01T01:00:00.000Z")

  expect(convertRTCtoUTC("4:01:00")).toEqual(
    DateTime.fromISO("2025-05-01T01:00:00Z").toUTC(),
  )
})

/** Given Monday, 28 April, at 00:00 UTC
 * When the RTC is 7:01:00 (Sunday at 01:00 UTC)
 * Then convertRTCtoUTC should return the next Sunday, 2025-05-04T01:00:00Z
 */
test("convertRTCtoUTC works correctly for a meeting scheduled on Sunday when it is currently Monday (week wrap-around)", () => {
  setMockTime("2025-04-28T00:00:00.000Z")

  expect(convertRTCtoUTC("7:01:00")).toEqual(
    DateTime.fromISO("2025-05-04T01:00:00Z").toUTC(),
  )
})

/** Given Monday, 28 April, at exactly 01:01:00 UTC
 * When the RTC is 1:01:00
 * Then convertRTCtoUTC should return 2025-04-28T01:01:00Z
 */
test("convertRTCtoUTC works correctly when the current time exactly matches the RTC", () => {
  setMockTime("2025-04-28T01:00:00.000Z")

  expect(convertRTCtoUTC("1:01:00")).toEqual(
    DateTime.fromISO("2025-04-28T01:00:00Z").toUTC(),
  )
})
