import express from "express"

import Logger from "./common/logger.js"

import { validateMeetingsQuery } from "./utils/validateMeetingsQuery.js"

import * as meetingsService from "./meetings.service.js"

export const meetings = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  try {
    const validatedQuery = validateMeetingsQuery(req.query)
    Logger.debug(
      `Parsed and validated query params: ${JSON.stringify(validatedQuery)}`,
    )

    const { ok, val } = await meetingsService.getMeetings({
      ...validatedQuery,
    })

    if (ok) {
      Logger.info(`fetch result includes ${val.length} meetings.`)
      res.status(200).json(val)
    } else {
      Logger.error(`${JSON.stringify(val)}`)
      next(val)
    }
  } catch (error) {
    next(error)
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

export const meetingsFacets = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  Logger.debug("Request for meetingsFacets")
  const { ok, val } = await meetingsService.getFacets()
  if (ok) {
    Logger.info(`fetch result being returned includes ${JSON.stringify(val)}.`)
    res.status(200).json(val)
  } else {
    Logger.error(`${JSON.stringify(val)}`)
    next(val)
  }
}
