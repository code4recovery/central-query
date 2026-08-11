import { DateTime } from "luxon"
import type { ParsedQs } from "qs"

import { COMMUNITIES, FEATURES, FORMATS, TYPE } from "../common/types.js"
import { MeetingsOptions } from "../endpoint-options.types.js"
import ReqParamFormatError from "../common/custom_errors/ReqParamFormatError.js"

type QueryValue = string | string[] | ParsedQs | ParsedQs[] | undefined

const readString = (raw: QueryValue): string | undefined => {
  if (typeof raw === "string") return raw
  if (Array.isArray(raw))
    return raw.find((item): item is string => typeof item === "string")
  return undefined
}

const readArray = (raw: QueryValue): string[] | undefined => {
  if (raw === undefined) return undefined

  if (Array.isArray(raw)) {
    const values = raw.filter(
      (item): item is string => typeof item === "string",
    )
    return values.length > 0 ? values : undefined
  }

  if (typeof raw !== "string") return undefined

  const parsed = tryParseJson(raw)
  if (Array.isArray(parsed)) {
    const values = parsed.filter(
      (item): item is string => typeof item === "string",
    )
    return values.length > 0 ? values : undefined
  }

  return [raw]
}

const tryParseJson = (raw: string): unknown => {
  try {
    return JSON.parse(raw)
  } catch {
    return undefined
  }
}

const parseInteger = (
  raw: QueryValue,
  param: string,
  min: number,
  max: number,
): number | undefined => {
  const value = readString(raw)
  if (value === undefined) return undefined
  if (!/^-?\d+$/.test(value)) {
    throw new ReqParamFormatError(param, "must be an integer")
  }

  const parsed = Number.parseInt(value, 10)
  if (parsed < min || parsed > max) {
    throw new ReqParamFormatError(param, `must be between ${min} and ${max}`)
  }

  return parsed
}

const parseISOStart = (raw: QueryValue): string | undefined => {
  const value = readString(raw)
  if (value === undefined) return undefined

  const dt = DateTime.fromISO(value, { setZone: true })
  if (!dt.isValid) {
    throw new ReqParamFormatError("start", "must be a valid ISO 8601 datetime")
  }

  return value
}

const parseBoolean = (raw: QueryValue, param: string): boolean | undefined => {
  const value = readString(raw)
  if (value === undefined) return undefined
  if (value === "true") return true
  if (value === "false") return false
  throw new ReqParamFormatError(param, "must be true or false")
}

const parseEnum = <T extends string>(
  raw: QueryValue,
  param: string,
  allowed: readonly T[],
): T | undefined => {
  const value = readString(raw)
  if (value === undefined) return undefined

  const normalized = value.toUpperCase() as T
  if (!allowed.includes(normalized)) {
    throw new ReqParamFormatError(param, `must be one of ${allowed.join(", ")}`)
  }

  return normalized
}

const parseEnumArray = <T extends string>(
  raw: QueryValue,
  param: string,
  allowed: readonly T[],
): T[] | undefined => {
  const values = readArray(raw)
  if (values === undefined) return undefined

  if (values.length === 0) {
    throw new ReqParamFormatError(param, "must not be empty")
  }

  const normalized = values.map((v) => v.toUpperCase())
  const invalid = normalized.find((v) => !allowed.includes(v as T))
  if (invalid) {
    throw new ReqParamFormatError(param, `contains invalid value '${invalid}'`)
  }

  return normalized as T[]
}

const parseLanguages = (raw: QueryValue): string[] | undefined => {
  const values = readArray(raw)
  if (values === undefined) return undefined

  if (values.length === 0) {
    throw new ReqParamFormatError("languages", "must not be empty")
  }

  const invalid = values.find((v) => !/^[a-z]{2}$/i.test(v))
  if (invalid) {
    throw new ReqParamFormatError(
      "languages",
      "must contain only 2-letter ISO 639-1 language codes",
    )
  }

  return values.map((v) => v.toLowerCase())
}

const parseNameQuery = (raw: QueryValue): string | undefined => {
  const value = readString(raw)
  if (value === undefined) return undefined

  if (value.length === 0) {
    throw new ReqParamFormatError("nameQuery", "must not be empty")
  }

  if (value.length > 100) {
    throw new ReqParamFormatError(
      "nameQuery",
      "must be 100 characters or fewer",
    )
  }

  return value
}

const isDefined = (raw: QueryValue): boolean => raw !== undefined

const hasAnyDefined = (values: QueryValue[]): boolean =>
  values.some((v) => isDefined(v))

export const validateMeetingsQuery = (query: ParsedQs): MeetingsOptions => {
  const scheduled = parseBoolean(query.scheduled, "scheduled")
  const start = parseISOStart(query.start)
  const hours = parseInteger(query.hours, "hours", 1, 168)
  const limit = parseInteger(query.limit, "limit", 1, 1000)

  const formats = parseEnumArray(query.formats, "formats", FORMATS)
  const features = parseEnumArray(query.features, "features", FEATURES)
  const communities = parseEnumArray(
    query.communities,
    "communities",
    COMMUNITIES,
  )
  const type = parseEnum(query.type, "type", TYPE)
  const languages = parseLanguages(query.languages)
  const nameQuery = parseNameQuery(query.nameQuery)

  if (scheduled === false) {
    return {
      scheduled,
      start: undefined,
      hours: undefined,
      limit: limit ?? 1000,
      formats,
      features,
      communities,
      type,
      languages,
      nameQuery,
    }
  }

  const noQueryParams = Object.keys(query).length === 0
  const hasStart = isDefined(query.start)
  const hasHours = isDefined(query.hours)
  const hasOtherParams = hasAnyDefined([
    query.limit,
    query.formats,
    query.features,
    query.communities,
    query.type,
    query.languages,
    query.nameQuery,
    query.scheduled,
  ])

  const validatedStart =
    noQueryParams || (hasHours && !hasStart) ? new Date().toISOString() : start

  const validatedHours =
    noQueryParams || (hasStart && !hasHours && !hasOtherParams) ? 1 : hours

  const validatedLimit =
    limit ??
    ([validatedStart, validatedHours].every((param) => param === undefined)
      ? 300
      : 1000)

  return {
    scheduled,
    start: validatedStart,
    hours: validatedHours,
    limit: validatedLimit,
    formats,
    features,
    communities,
    type,
    languages,
    nameQuery,
  }
}
