import { dayLimits, lowerUpperLimits } from "./dates.js"

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
