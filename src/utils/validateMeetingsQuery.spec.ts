import type { ParsedQs } from "qs"

import ReqParamFormatError from "../common/custom_errors/ReqParamFormatError.js"
import { validateMeetingsQuery } from "./validateMeetingsQuery.js"

const query = (q: Record<string, unknown>): ParsedQs => q as ParsedQs

describe("validateMeetingsQuery", () => {
  test("applies default start and hours when query is empty", () => {
    const result = validateMeetingsQuery(query({}))

    expect(result.start).toEqual(expect.any(String))
    expect(result.hours).toBe(1)
    expect(result.limit).toBe(1000)
  })

  test("does not apply default hours when start and limit are provided", () => {
    const result = validateMeetingsQuery(
      query({
        start: "2026-05-30T00:00:00Z",
        limit: "25",
      }),
    )

    expect(result.start).toBe("2026-05-30T00:00:00Z")
    expect(result.hours).toBeUndefined()
    expect(result.limit).toBe(25)
  })

  test("adds start=now when only hours is provided", () => {
    const result = validateMeetingsQuery(query({ hours: "24" }))

    expect(result.start).toEqual(expect.any(String))
    expect(result.hours).toBe(24)
  })

  test("defaults hours=1 when only start is provided", () => {
    const result = validateMeetingsQuery(
      query({ start: "2026-05-30T00:00:00Z" }),
    )

    expect(result.start).toBe("2026-05-30T00:00:00Z")
    expect(result.hours).toBe(1)
  })

  test("throws 400 validation error for malformed start", () => {
    expect(() => validateMeetingsQuery(query({ start: "garbage" }))).toThrow(
      ReqParamFormatError,
    )
  })

  test("throws 400 validation error for hours out of range", () => {
    expect(() =>
      validateMeetingsQuery(
        query({ start: "2026-05-30T00:00:00Z", hours: "999" }),
      ),
    ).toThrow(ReqParamFormatError)
  })

  test("throws 400 validation error for invalid format code", () => {
    expect(() => validateMeetingsQuery(query({ formats: "XYZ" }))).toThrow(
      ReqParamFormatError,
    )
  })

  test("throws 400 validation error for invalid languages", () => {
    expect(() =>
      validateMeetingsQuery(query({ languages: "english" })),
    ).toThrow(ReqParamFormatError)
  })

  test("validates enum arrays and normalizes values", () => {
    const result = validateMeetingsQuery(
      query({
        formats: JSON.stringify(["d", "lit"]),
        features: "al",
        communities: "lgbtq",
        type: "o",
        languages: JSON.stringify(["EN", "es"]),
      }),
    )

    expect(result.formats).toEqual(["D", "LIT"])
    expect(result.features).toEqual(["AL"])
    expect(result.communities).toEqual(["LGBTQ"])
    expect(result.type).toBe("O")
    expect(result.languages).toEqual(["en", "es"])
  })

  test("ignores temporal params for scheduled=false", () => {
    const result = validateMeetingsQuery(
      query({
        scheduled: "false",
        start: "2026-05-30T00:00:00Z",
        hours: "24",
      }),
    )

    expect(result.scheduled).toBe(false)
    expect(result.start).toBeUndefined()
    expect(result.hours).toBeUndefined()
    expect(result.limit).toBe(1000)
  })
})
