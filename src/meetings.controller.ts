import express from "express"

import Logger from "./common/logger.js"

import { arrayToUpper, toUpper } from "./utils/stringUtils.js"
import { parsedQueryParams } from "./utils/queryParser.js"

import { MeetingsOptions } from "./endpoint-options.types.js"
import * as meetingsService from "./meetings.service.js"

const validateTemporalParams = (
  queryParams: Partial<MeetingsOptions>,
  rawLimit?: string,
) => {
  if (queryParams.scheduled === false) {
    return {
      validatedStart: undefined,
      validatedHours: undefined,
      limit: rawLimit ? parseInt(rawLimit) : 1000,
    }
  }

  const validatedStart = queryParams.start ?? new Date().toISOString()

  const onlyStartDefined =
    Object.keys(queryParams).filter((k) => queryParams[k] !== undefined)
      .length === 1 && queryParams.start !== undefined

  const noneDefined = Object.keys(queryParams).every(
    (k) => queryParams[k] === undefined,
  )

  const validatedHours =
    typeof queryParams.hours === "number" && !isNaN(queryParams.hours)
      ? queryParams.hours
      : (onlyStartDefined || noneDefined) && validatedStart
      ? 1
      : undefined

  const limit = rawLimit
    ? parseInt(rawLimit)
    : [validatedStart, validatedHours].every((param) => param === undefined)
    ? 300
    : 1000

  return { validatedStart, validatedHours, limit }
}

export const meetings = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  const queryParams = parsedQueryParams<MeetingsOptions>(
    req.query as Record<string, string>,
    [
      "scheduled",
      "type",
      "formats",
      "features",
      "communities",
      "hours",
      "start",
      "languages",
      "nameQuery",
    ],
    { hours: "number", scheduled: "boolean" },
  )

  const {
    scheduled,
    type,
    formats,
    features,
    communities,
    languages,
    nameQuery,
  } = queryParams

  Logger.debug(`Parsed query params: ${JSON.stringify(queryParams)}`)

  const { validatedStart, validatedHours, limit } = validateTemporalParams(
    queryParams,
    req.query.limit as string | undefined,
  )

  if (validatedStart) {
    Logger.debug(`Hours: ${queryParams.hours}, ${typeof queryParams.hours}`)
  }

  const { ok, val } = await meetingsService.getMeetings({
    scheduled,
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
