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

test("pipeline should reflect languages filter using `or` logic", () => {
  const testOptions: MeetingsOptions = {
    languages: ["en", "fr"],
  }

  expect(pipelineFromQuery(testOptions)).toStrictEqual([
    {
      $match: {
        languages: { $in: ["en", "fr"] },
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
        languages: { $in: ["en"] },
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
        languages: { $in: ["en"] },
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
        languages: { $in: ["en"] },
      },
    },
  ])
})
test("pipeline should reflect nameQuery as a case-insensitive regex match", () => {
  const testOptions: MeetingsOptions = {
    nameQuery: "serenity",
  }

  const pipeline = pipelineFromQuery(testOptions)

  // Assert the stage shape, not the regex bytes — the pattern is built by
  // makeFlexibleRegex (quote/accent flexible) and is covered behaviorally in
  // stringUtils.spec.ts. Pinning the literal pattern here re-couples this
  // structural test to regex internals (see central-query #31).
  expect(pipeline).toStrictEqual([
    {
      $match: {
        name: { $regex: expect.any(String), $options: "i" },
      },
    },
  ])

  // ...but the stage must still functionally match the query, case-insensitively.
  const { $regex, $options } = (pipeline[0].$match as { name: { $regex: string; $options: string } }).name
  expect(new RegExp($regex, $options).test("Serenity Group")).toBe(true)
})

test("pipeline should combine nameQuery with rtcRanges", () => {
  const testOptions: MeetingsOptions = {
    rtcRanges: [
      {
        lowerRTC: "1:00:00",
        upperRTC: "1:30:00",
      },
    ],
    nameQuery: "step",
  }

  expect(pipelineFromQuery(testOptions)).toStrictEqual([
    {
      $match: {
        rtc: { $gte: "1:00:00", $lte: "1:30:00" },
      },
    },
    {
      $match: {
        name: { $regex: expect.any(String), $options: "i" },
      },
    },
  ])
})

test("pipeline should combine nameQuery with types and languages", () => {
  const testOptions: MeetingsOptions = {
    formats: ["D"],
    languages: ["en"],
    nameQuery: "hope",
  }

  expect(pipelineFromQuery(testOptions)).toStrictEqual([
    {
      $match: {
        types: { $all: ["D"] },
        languages: { $in: ["en"] },
      },
    },
    {
      $match: {
        name: { $regex: expect.any(String), $options: "i" },
      },
    },
  ])
})
