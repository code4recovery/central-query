import { MeetingsOptions } from "../endpoint-options.types.js"
import { pipelineFromQuery } from "./pipelineFromQuery.js"

test("pipeline should reflect same day time range", () => {
  const testRanges: MeetingsOptions = {
    rtcRanges: [
      {
        lowerRTC: "7:01:00",
        upperRTC: "7:03:00",
      },
    ],
  }
  expect(pipelineFromQuery(testRanges)).toStrictEqual([
    {
      $match: {
        rtc: { $gte: "7:01:00", $lte: "7:03:00" },
      },
    },
  ])
})
test("pipeline should reflect Sunday => Monday", () => {
  const testRanges: MeetingsOptions = {
    rtcRanges: [
      {
        lowerRTC: "7:23:00",
        upperRTC: "7:24:00",
      },
      {
        lowerRTC: "1:00:00",
        upperRTC: "1:01:00",
      },
    ],
  }
  expect(pipelineFromQuery(testRanges)).toStrictEqual([
    {
      $match: {
        $or: [
          {
            rtc: {
              $gte: "7:23:00",
              $lte: "7:24:00",
            },
          },
          {
            rtc: {
              $gte: "1:00:00",
              $lte: "1:01:00",
            },
          },
        ],
      },
    },
  ])
})
test("pipeline should reflect correct types for the query", () => {
  const testOptions: MeetingsOptions = {
    formats: ["D", "B", "BE"],
    communities: ["M"],
    type: "O",
  }

  expect(pipelineFromQuery(testOptions)).toStrictEqual([
    {
      $match: {
        types: {
          $all: ["D", "B", "BE", "M", "O"],
        },
      },
    },
  ])
})
test("pipeline should reflect correct types for the query when rtcRanges are present", () => {
  const testRanges: MeetingsOptions = {
    rtcRanges: [
      {
        lowerRTC: "7:23:00",
        upperRTC: "7:24:00",
      },
    ],
    formats: ["D", "B", "BE"],
    communities: ["M"],
    type: "O",
  }

  expect(pipelineFromQuery(testRanges)).toStrictEqual([
    {
      $match: {
        rtc: { $gte: "7:23:00", $lte: "7:24:00" },

        types: {
          $all: ["D", "B", "BE", "M", "O"],
        },
      },
    },
  ])
})
test("pipeline should be correct when types are present and RTC transitions from Sunday ==> Monday", () => {
  const testData: MeetingsOptions = {
    rtcRanges: [
      {
        lowerRTC: "7:23:00",
        upperRTC: "7:24:00",
      },
      {
        lowerRTC: "1:00:00",
        upperRTC: "1:01:00",
      },
    ],
    formats: ["D", "B", "BE"],
    communities: ["M"],
    type: "O",
  }

  expect(pipelineFromQuery(testData)).toStrictEqual([
    {
      $match: {
        $and: [
          {
            $or: [
              {
                rtc: {
                  $gte: "7:23:00",
                  $lte: "7:24:00",
                },
              },
              {
                rtc: {
                  $gte: "1:00:00",
                  $lte: "1:01:00",
                },
              },
            ],
          },
          {
            types: {
              $all: ["D", "B", "BE", "M", "O"],
            },
          },
        ],
      },
    },
  ])
})

test("pipeline should reflect languages filter", () => {
  const testOptions: MeetingsOptions = {
    languages: ["en", "fr"],
  }

  expect(pipelineFromQuery(testOptions)).toStrictEqual([
    {
      $match: {
        languages: { $all: ["en", "fr"] },
      },
    },
  ])
})
test("pipeline should reflect correct languages when rtcRanges are present", () => {
  const testQueryOptions: MeetingsOptions = {
    rtcRanges: [
      {
        lowerRTC: "7:23:00",
        upperRTC: "7:24:00",
      },
    ],
    languages: ["en"],
  }

  expect(pipelineFromQuery(testQueryOptions)).toStrictEqual([
    {
      $match: {
        rtc: { $gte: "7:23:00", $lte: "7:24:00" },
        languages: { $all: ["en"] },
      },
    },
  ])
})
test("pipeline should reflect correct languages when types are present", () => {
  const testQueryOptions: MeetingsOptions = {
    formats: ["D", "B", "BE"],
    communities: ["M"],
    type: "O",
    languages: ["en"],
  }

  expect(pipelineFromQuery(testQueryOptions)).toStrictEqual([
    {
      $match: {
        types: { $all: ["D", "B", "BE", "M", "O"] },
        languages: { $all: ["en"] },
      },
    },
  ])
})
test("pipeline should reflect correct languages when types and rtcRanges are present", () => {
  const testQueryOptions: MeetingsOptions = {
    rtcRanges: [
      {
        lowerRTC: "7:23:00",
        upperRTC: "7:24:00",
      },
    ],
    formats: ["D", "B", "BE"],
    communities: ["M"],
    type: "O",
    languages: ["en"],
  }

  expect(pipelineFromQuery(testQueryOptions)).toStrictEqual([
    {
      $match: {
        rtc: { $gte: "7:23:00", $lte: "7:24:00" },
        types: { $all: ["D", "B", "BE", "M", "O"] },
        languages: { $all: ["en"] },
      },
    },
  ])
})
