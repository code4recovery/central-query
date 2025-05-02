import { DateTime } from "luxon"

import { jest } from "@jest/globals"

import {
  convertRTCtoUTC,
  dayLimits,
  lowerUpperLimits,
} from "./dates.js"

jest.useFakeTimers({ doNotFake: ["nextTick", "setImmediate"] })

const setMockTime = (dateTime: string) => jest.setSystemTime(new Date(dateTime))

test("lowerUpperLimits succeeds on Monday", () => {
  expect(lowerUpperLimits("2023-09-11T13:00:00Z", 2)).toEqual([
    {
      lowerRTC: "1:12:51",
      upperRTC: "1:15:00",
    },
  ])
})
test("lowerUpperLimits succeeds on Sunday", () => {
  expect(lowerUpperLimits("2023-09-10T23:00:00Z", 2)).toEqual([
    {
      lowerRTC: "7:22:51",
      upperRTC: "7:24:00",
    },
    {
      lowerRTC: "1:00:00",
      upperRTC: "1:01:00",
    },
  ])
})
test.skip("lowerUpperLimits handles multi-day starting Sunday", () => {
  expect(lowerUpperLimits("2023-09-10T23:00:00Z", 168)).toEqual([
    {
      lowerRTC: "7:22:51",
      upperRTC: "7:24:00",
    },
    {
      lowerRTC: "1:00:00",
      upperRTC: "7:23:00",
    },
  ])
})

test("dayLimits set lower/upper properly when behind UTC", () => {
  expect(dayLimits(1, -480)).toEqual([
    {
      lowerRTC: "1:08:00",
      upperRTC: "1:24:00",
    },
    {
      lowerRTC: "2:00:00",
      upperRTC: "2:08:00",
    },
  ])
})

test("dayLimits set lower/upper properly when ahead of UTC", () => {
  expect(dayLimits(1, 480)).toEqual([
    {
      lowerRTC: "7:16:00",
      upperRTC: "7:24:00",
    },
    {
      lowerRTC: "1:00:00",
      upperRTC: "1:16:00",
    },
  ])
})

test("dayLimits set lower/upper properly when ahead of UTC and non-even hour offset is provided", () => {
  expect(dayLimits(1, 570)).toEqual([
    {
      lowerRTC: "7:14:30",
      upperRTC: "7:24:00",
    },
    {
      lowerRTC: "1:00:00",
      upperRTC: "1:14:30",
    },
  ])
})

test("dayLimits set lower/upper properly when ahead of UTC and non-even hour offset is provided on  Sunday", () => {
  expect(dayLimits(7, 570)).toEqual([
    {
      lowerRTC: "6:14:30",
      upperRTC: "6:24:00",
    },
    {
      lowerRTC: "7:00:00",
      upperRTC: "7:14:30",
    },
  ])
})

/** Given a Monday in late April
 * When the RTC is 1:01:00
 * Then convertRTCtoUTC should return 2025-04-28T01:00:00Z
 */
test("convertRTCtoUTC works correctly when meeting scheduled for later that same day", () => {
  setMockTime("2025-04-28T00:00:00.000Z")

  expect(convertRTCtoUTC("1:01:00")).toEqual(
    DateTime.fromISO("2025-04-28T01:00:00Z").toUTC(),
  )
})

/** Given a Monday at noon-ish UTC in late April
 * When the RTC is 1:01:00
 * Then convertRTCtoUTC should return 2025-05-05T01:00:00Z
 */
test("convertRTCtoUTC works correctly when meeting schedule already has passed for that day", () => {
  setMockTime("2025-04-28T12:01:23.124Z")

  expect(convertRTCtoUTC("1:01:00")).toEqual(
    DateTime.fromISO("2025-05-05T01:00:00Z").toUTC(),
  )
})

/** Given a Tuesday in late April
 * When the RTC is 1:01:00
 * Then convertRTCtoUTC should return 2025-05-05T01:00:00Z
 */
test("convertRTCtoUTC converts RTC to UTC on Tuesday", () => {
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
  setMockTime("2025-04-30T00:00:00.000Z")

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
