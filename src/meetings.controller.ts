import express from "express"

// import { currentTimestamp } from "../common/utils.js"
// import DbOperationError from "./common/custom_errors/DbOperationError.js"
import Logger from "./common/logger.js"
import * as meetingsService from "./meetings.service.js"

export const meetingsNext = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  Logger.debug(`query = ${JSON.stringify(req.query)}`)
  const start =
    req.query.start != undefined
      ? (req.query.start as string)
      : new Date().toISOString()
  const hours =
    req.query.hours != undefined ? parseInt(req.query.hours as string) : 2
  const limit =
    req.query.limit != undefined ? parseInt(req.query.limit as string) : 25
  const types: string[] =
    req.query.types != undefined
      ? JSON.parse(req.query["types"] as string)
      : undefined
  const { ok, val } = await meetingsService.getNext({
    start,
    hours,
    limit,
    types,
  })
  if (ok) {
    Logger.info(`fetch result includes ${val.length} meetings.`)
    res.status(200).json(val)
  } else {
    Logger.error(`${JSON.stringify(val)}`)
    next(val)
  }
}

export const byDay = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  const weekday = Number(req.query.weekday as string)
  const offset = Number(req.query.offset as string)
  Logger.debug(`Request params for getByDay: ${JSON.stringify(req.query)}`)
  const { ok, val } = await meetingsService.getDay({ weekday, offset })
  if (ok) {
    Logger.info(`fetch result being returned includes ${val.length} meetings.`)
    res.status(200).json(val)
  } else {
    Logger.error(`${JSON.stringify(val)}`)
    next(val)
  }
}
