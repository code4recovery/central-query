import * as MongoDB from "mongodb"

import Logger from "../common/logger.js"
import { MeetingsOptions } from "../endpoint-options.types.js"

export const pipelineFromQuery = (query: MeetingsOptions | MeetingsOptions) => {
  const pipeline: MongoDB.Document[] = []
  const { rtcRanges, limit, formats, features, communities, type } = query

  Logger.debug(`Formats: ${formats}`)
  Logger.debug(`Features: ${features}`)
  Logger.debug(`Communities: ${communities}`)
  Logger.debug(`Type: ${type}`)
  Logger.debug(`RTC Ranges: ${rtcRanges}`)
  Logger.debug(`Limit: ${limit}`)
  Logger.debug(`Query: ${JSON.stringify(query)}`)

  let match: Record<string, unknown> = {}

  const normalizeToArray = (input: string | string[] | undefined): string[] =>
    input ? (Array.isArray(input) ? input : [input]) : []

  // Merge formats, features, communities, and type into a single `types` array to comply with the database schema
  const mergedTypes = [
    ...normalizeToArray(formats),
    ...normalizeToArray(features),
    ...normalizeToArray(communities),
    ...normalizeToArray(type),
  ]
  Logger.debug(`Merged types: ${mergedTypes}`)

  if (rtcRanges && rtcRanges.length > 0) {
    if (rtcRanges.length === 1) {
      match = {
        rtc: {
          $gte: rtcRanges[0].lowerRTC,
          $lte: rtcRanges[0].upperRTC,
        },
      }
    } else {
      match = {
        $or: rtcRanges.map((range) => ({
          rtc: {
            $gte: range.lowerRTC,
            $lte: range.upperRTC,
          },
        })),
      }
    }
  }

  const updatedMatch =
    mergedTypes.length > 0 && Object.keys(match).length > 0
      ? {
          $and: [
            match, // Combine `rtc` conditions into a single object
            { types: { $all: mergedTypes } },
          ],
        }
      : mergedTypes.length > 0
      ? { types: { $all: mergedTypes } }
      : Object.keys(match).length > 0
      ? match
      : {}

  pipeline.push({ $match: updatedMatch })

  if (limit != undefined) pipeline.push({ $limit: limit })
  Logger.debug(`pipeline built: ${JSON.stringify(pipeline)}`)
  return pipeline
}
