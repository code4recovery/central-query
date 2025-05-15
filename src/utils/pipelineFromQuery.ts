import * as MongoDB from "mongodb"

import Logger from "../common/logger.js"
import { MeetingsOptions } from "../endpoint-options.types.js"

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

const buildRtcMatch = (
  rtcRanges: { lowerRTC: string; upperRTC?: string }[],
) => {
  if (!rtcRanges || rtcRanges.length === 0) return {}
  if (rtcRanges.length === 1) {
    const { lowerRTC, upperRTC } = rtcRanges[0]
    return {
      rtc: {
        ...(lowerRTC ? { $gte: lowerRTC } : {}),
        ...(upperRTC !== undefined ? { $lte: upperRTC } : {}),
      },
    }
  }
  return {
    $or: rtcRanges.map(({ lowerRTC, upperRTC }) => ({
      rtc: {
        ...(lowerRTC ? { $gte: lowerRTC } : {}),
        ...(upperRTC !== undefined ? { $lte: upperRTC } : {}),
      },
    })),
  }
}

const buildTypesMatch = (
  formats: string | string[] | undefined,
  features: string | string[] | undefined,
  communities: string | string[] | undefined,
  type: string | undefined,
) => {
  const mergedTypes = [
    ...normalizeToArray(formats),
    ...normalizeToArray(features),
    ...normalizeToArray(communities),
  ]
  if (type) mergedTypes.push(type)
  return mergedTypes.length > 0 ? { types: { $all: mergedTypes } } : {}
}

const mergeMatches = (
  rtcMatch: Record<string, unknown>,
  typesMatch: Record<string, unknown>,
) => {
  if (Object.keys(rtcMatch).length && Object.keys(typesMatch).length) {
    if (rtcMatch.$or) {
      return { $and: [rtcMatch, typesMatch] }
    }
    return { ...rtcMatch, ...typesMatch }
  }
  return Object.keys(rtcMatch).length ? rtcMatch : typesMatch
}

export const pipelineFromQuery = (query: MeetingsOptions) => {
  const { rtcRanges, limit, formats, features, communities, type } = query

  Logger.debug(`Formats: ${formats}`)
  Logger.debug(`Features: ${features}`)
  Logger.debug(`Communities: ${communities}`)
  Logger.debug(`Type: ${type}`)
  Logger.debug(`RTC Ranges: ${rtcRanges}`)
  Logger.debug(`Limit: ${limit}`)
  Logger.debug(`Query: ${JSON.stringify(query)}`)

  const rtcMatch = buildRtcMatch(rtcRanges)
  const typesMatch = buildTypesMatch(formats, features, communities, type)
  const match = mergeMatches(rtcMatch, typesMatch)

  const pipeline: MongoDB.Document[] = []
  if (Object.keys(match).length) pipeline.push({ $match: match })
  if (limit !== undefined) pipeline.push({ $limit: limit })

  Logger.debug(`pipeline built: ${JSON.stringify(pipeline)}`)
  return pipeline
}
