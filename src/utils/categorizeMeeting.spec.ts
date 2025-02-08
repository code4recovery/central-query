import { getTypesForLanguage } from "@code4recovery/spec"

import type { Category } from "./categorizeMeeting"
import {
  categorizedMeeting,
  COMMUNITIES,
  FEATURES,
  FORMATS,
  TYPE,
} from "./categorizeMeeting"

const types = getTypesForLanguage("en")

export const languageCodes = [
  "AM",
  "BG",
  "DA",
  "DE",
  "EL",
  "EN",
  "FA",
  "FR",
  "HE",
  "HI",
  "HR",
  "HU",
  "ITA",
  "JA",
  "KOR",
  "LT",
  "ML",
  "MT",
  "NE",
  "NO",
  "POL",
  "POR",
  "PUN",
  "RUS",
  "S",
  "SK",
  "SV",
  "TH",
  "TL",
  "TUR",
  "UK",
]

const allTypes = Object.fromEntries(
  Object.entries(types).filter(([key]) => !languageCodes.includes(key)),
)

const allTypesKeys = Object.keys(allTypes) as Category[]

test("Category bins created from all types list", () => {
  const meetingData = {
    name: "Meeting 1",
    types: allTypesKeys,
  }

  const newMeetingData = categorizedMeeting(meetingData)

  expect(newMeetingData.type.sort()).toStrictEqual(TYPE.sort())
  expect(newMeetingData.communities.sort()).toStrictEqual(COMMUNITIES.sort())
  expect(newMeetingData.features.sort()).toStrictEqual(FEATURES.sort())
  expect(newMeetingData.formats.sort()).toStrictEqual(FORMATS.sort())
})

test("Gracefully handles null `types`", () => {
  const meetingData = {
    name: "Meeting 2",
  }

  const newMeetingData = categorizedMeeting(meetingData)

  expect(newMeetingData.type).toStrictEqual([])
  expect(newMeetingData.communities.sort()).toStrictEqual([])
  expect(newMeetingData.features).toStrictEqual([])
  expect(newMeetingData.formats).toStrictEqual([])
})
