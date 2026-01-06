import express from "express"

import Logger from "./common/logger.js"

import { arrayToUpper, toUpper } from "./utils/stringUtils.js"
import { parsedQueryParams } from "./utils/queryParser.js"

import * as meetingsService from "./meetings.service.js"

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
      "nameQuery",
    ],
    { hours: "number" },
  )

  const {
    type,
    formats,
    features,
    communities,
    hours,
    start,
    languages,
    nameQuery,
  } = queryParams as {
    type?: string
    formats?: string[]
    features?: string[]
    communities?: string[]
    hours?: number
    start?: string
    languages?: string[]
    nameQuery?: string
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
    languages: languages,
    nameQuery,
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
