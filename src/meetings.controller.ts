import express from "express"

import Logger from "./common/logger.js"
import * as meetingsService from "./meetings.service.js"

export const meetings = async (
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
    req.query.hours != undefined ? parseInt(req.query.hours as string) : 1
  const limit =
    req.query.limit != undefined ? parseInt(req.query.limit as string) : 1000
  const types: string[] =
    req.query.types != undefined
      ? JSON.parse(req.query["types"] as string)
      : undefined
  const { ok, val } = await meetingsService.getMeetings({
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

export const byGroup = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  const groupID = req.params.groupID as string
  Logger.debug(`Request params for byGroup: ${JSON.stringify(req.params)}`)
  const { ok, val } = await meetingsService.getByGroup(groupID)
  if (ok) {
    Logger.info(`fetch result being returned includes ${val.length} meetings.`)
    res.status(200).json(val)
  } else {
    Logger.error(`${JSON.stringify(val)}`)
    next(val)
  }
}
