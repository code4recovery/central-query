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

  const normalizeToArray = (input: string | string[] | undefined): string[] => {
    if (!input) return []
    if (Array.isArray(input)) return input
    try {
      const parsed = JSON.parse(input)
      if (Array.isArray(parsed)) return parsed
    } catch {
      // not JSON, fall through
    }
    return [input]
  }

  // Merge formats, features, communities, and type into a single `types` array to comply with the database schema
  const mergedTypes = [
    ...normalizeToArray(formats),
    ...normalizeToArray(features),
    ...normalizeToArray(communities),
  ]
  if (type) mergedTypes.push(type)
  Logger.debug(`Merged types: ${mergedTypes}`)

  if (rtcRanges && rtcRanges.length > 0) {
    if (rtcRanges.length === 1) {
      const rtcMatch: Record<string, string> = {
        $gte: rtcRanges[0].lowerRTC,
      }
      if (rtcRanges[0].upperRTC !== undefined) {
        rtcMatch.$lte = rtcRanges[0].upperRTC
      }
      match = { rtc: rtcMatch }
    } else {
      match = {
        $or: rtcRanges.map((range) => {
          const rtcMatch: Record<string, string> = { $gte: range.lowerRTC }
          if (range.upperRTC !== undefined) {
            rtcMatch.$lte = range.upperRTC
          }
          return { rtc: rtcMatch }
        }),
      }
    }
  }

  let updatedMatch: Record<string, unknown>
  if (mergedTypes.length > 0) {
    if (match.$or) {
      updatedMatch = { $and: [match, { types: { $all: mergedTypes } }] }
    } else {
      updatedMatch = { ...match, types: { $all: mergedTypes } }
    }
  } else {
    updatedMatch = match
  }

  pipeline.push({ $match: updatedMatch })

  if (limit != undefined) pipeline.push({ $limit: limit })
  Logger.debug(`pipeline built: ${JSON.stringify(pipeline)}`)
  return pipeline
}
