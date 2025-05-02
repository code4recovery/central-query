import * as MongoDB from "mongodb"

import Logger from "../common/logger.js"
import { PipelineFields } from "../endpoint-options.types.js"

export const pipelineFromQuery = (query: PipelineFields) => {
  const pipeline: MongoDB.Document[] = []
  const { rtcRanges, limit, types } = query
  let match: Record<string, unknown> = {}
  if (rtcRanges.length === 1) {
    match = {
      $and: [
        { rtc: { $gte: rtcRanges[0].lowerRTC } },
        { rtc: { $lte: rtcRanges[0].upperRTC } },
      ],
    }
  } else {
    match = {
      $or: [
        {
          rtc: {
            $gte: rtcRanges[0].lowerRTC,
            $lte: rtcRanges[0].upperRTC,
          },
        },
        {
          rtc: {
            $gte: rtcRanges[1].lowerRTC,
            $lte: rtcRanges[1].upperRTC,
          },
        },
      ],
    }
  }

  if (types != undefined) {
    match = {
      ...match,
      types: { $all: types },
    }
  }

  pipeline.push({ $match: match })
  if (limit != undefined) pipeline.push({ $limit: limit })
  Logger.debug(`pipeline built: ${JSON.stringify(pipeline)}`)
  return pipeline
}

// const preparedPipeline = () => {
//   let match = {}
//   if (q.timezone) {
//     match = {
//       ...match,
//       timezone: q.timezone,
//     }
//   }
//   if (q.weekday) {
//     const searchDay = Weekdays[q.weekday as string]
//     match = {
//       ...match,
//       rtc: { $regex: `^${searchDay}` },
//     }
//   }
//   if (q.timeEqual && q.timezone && q.weekday) {
//     const day = Weekdays[q.weekday as string]
//     const now = DateTime.now()
//     const next = nextOccurrence(day, now)
//     // console.log(next)
//     console.log(DateTime.fromISO(next.toISO(), { zone: q.timezone as string }))
//   }
//   return [
//     {
//       $match: match,
//     },
//   ]
// }
