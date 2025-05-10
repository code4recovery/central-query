import express from "express"

import Logger from "./common/logger.js"
import * as meetingsService from "./meetings.service.js"

export const meetings = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  Logger.debug(`Request params for meetings: ${JSON.stringify(req.params)}`)
  Logger.debug(`Request query for meetings: ${req.query}`)
  Logger.debug(`query = ${JSON.stringify(req.query)}`)

  const start = req.query.start
    ? (req.query.start as string)
    : new Date().toISOString()

  const parseQueryParam = <T>(param: string | undefined): T | undefined =>
    param
      ? (() => {
          try {
            const parsed = JSON.parse(param)
            return Array.isArray(parsed)
              ? (parsed as T)
              : (param as unknown as T) // Handle arrays and plain strings
          } catch {
            return param as unknown as T // Handle plain strings
          }
        })()
      : undefined

  const queryParams = [
    "type",
    "formats",
    "features",
    "communities",
    "hours",
  ].reduce(
    (acc, key) => ({
      ...acc,
      [key]: parseQueryParam(req.query[key] as string),
    }),
    {} as Record<string, unknown>,
  )

  const { type, formats, features, communities, hours } = queryParams as {
    type?: string
    formats?: string[]
    features?: string[]
    communities?: string[]
    hours?: number
  }

  const validatedHours = typeof hours === "number" && !isNaN(hours) ? hours : 1

  const limit = req.query.limit
    ? parseInt(req.query.limit as string)
    : [start, validatedHours].every((param) => param === undefined)
    ? 300
    : 1000

  const { ok, val } = await meetingsService.getMeetings({
    start,
    hours: validatedHours,
    limit,
    type,
    formats,
    features,
    communities,
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
