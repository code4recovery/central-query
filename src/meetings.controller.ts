import express from "express"

import Logger from "./common/logger.js"
import * as meetingsService from "./meetings.service.js"
import { parsedQueryParams } from "./utils/queryParser.js"
import {
  arrayToUpper,
  toUpper,
} from "./utils/stringUtils.js"

export const meetings = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  const queryParams = parsedQueryParams(
    req.query as Record<string, string>,
    [
      "type",
      "formats",
      "features",
      "communities",
      "hours",
      "start",
      "languages",
    ],
    { hours: "number" },
  )

  const { type, formats, features, communities, hours, start, languages } =
    queryParams as {
      type?: string
      formats?: string[]
      features?: string[]
      communities?: string[]
      hours?: number
      start?: string
      languages?: string[]
    }

  Logger.debug(`Parsed query params: ${JSON.stringify(queryParams)}`)

  // A start time is required for the meetings endpoint
  const validatedStart = start || new Date().toISOString()
  Logger.debug(`Hours: ${hours}, ${typeof hours}`)
  const onlyStartDefined =
    Object.keys(queryParams).filter((k) => queryParams[k] !== undefined)
      .length === 1 && queryParams.start !== undefined

  const noneDefined = Object.keys(queryParams).every(
    (k) => queryParams[k] === undefined,
  )

  const validatedHours =
    typeof hours === "number" && !isNaN(hours)
      ? hours
      : (onlyStartDefined || noneDefined) && validatedStart
      ? 1
      : undefined

  const limit = req.query.limit
    ? parseInt(req.query.limit as string)
    : [validatedStart, validatedHours].every((param) => param === undefined)
    ? 300
    : 1000

  const { ok, val } = await meetingsService.getMeetings({
    start: validatedStart,
    hours: validatedHours,
    limit,
    type: toUpper(type),
    formats: arrayToUpper(formats),
    features: arrayToUpper(features),
    communities: arrayToUpper(communities),
    languages: arrayToUpper(languages),
  })

  if (ok) {
    Logger.info(`fetch result includes ${val.length} meetings.`)
    res.status(200).json(val)
  } else {
    Logger.error(`${JSON.stringify(val)}`)
    next(val)
  }
}

export const bySlug = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  const slug = req.params.slug as string
  Logger.debug(`Request params for bySlug: ${JSON.stringify(req.params)}`)
  const { ok, val } = await meetingsService.getBySlug(slug)
  if (ok) {
    Logger.info(`fetch result being returned includes ${JSON.stringify(val)}.`)
    res.status(200).json(val)
  } else {
    Logger.error(`${JSON.stringify(val)}`)
    next()
  }
}

export const relatedGroupInfo = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  const slug = req.params.slug as string
  Logger.debug(
    `Request params for relatedGroupInfo: ${JSON.stringify(req.params)}`,
  )
  const { ok, val } = await meetingsService.getRelatedGroupInfo(slug)
  if (ok) {
    Logger.info(`fetch result being returned includes ${JSON.stringify(val)}.`)
    res.status(200).json(val)
  } else {
    Logger.error(`${JSON.stringify(val)}`)
    next()
  }
}

/** The following functions are not fully implemented yet. */
// export const byDay = async (
//   req: express.Request,
//   res: express.Response,
//   next: express.NextFunction,
// ) => {
//   const weekday = Number(req.query.weekday as string)
//   const offset = Number(req.query.offset as string)
//   Logger.debug(`Request params for getByDay: ${JSON.stringify(req.query)}`)
//   const { ok, val } = await meetingsService.getDay({ weekday, offset })
//   if (ok) {
//     Logger.info(`fetch result being returned includes ${val.length} meetings.`)
//     res.status(200).json(val)
//   } else {
//     Logger.error(`${JSON.stringify(val)}`)
//     next(val)
//   }
// }

// export const byGroup = async (
//   req: express.Request,
//   res: express.Response,
//   next: express.NextFunction,
// ) => {
//   const groupID = req.params.groupID as string
//   Logger.debug(`Request params for byGroup: ${JSON.stringify(req.params)}`)
//   const { ok, val } = await meetingsService.getByGroup(groupID)
//   if (ok) {
//     Logger.info(`fetch result being returned includes ${val.length} meetings.`)
//     res.status(200).json(val)
//   } else {
//     Logger.error(`${JSON.stringify(val)}`)
//     next(val)
//   }
// }
