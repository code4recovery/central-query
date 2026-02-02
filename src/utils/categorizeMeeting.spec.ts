import { ObjectId } from "mongodb"

import {
  Category,
  COMMUNITIES,
  FEATURES,
  FORMATS,
  TYPE,
} from "../common/types.js"
import { MeetingView } from "../storage/storage.types"
import { categorizedMeeting } from "./categorizeMeeting"

const oiaaTypes = {
  "11": "11th Step Meditation",
  "12x12": "12 Steps & 12 Traditions",
  "AL-AN": "Concurrent with Al-Anon",
  "BV-I": "Blind / Visually Impaired",
  "D-HOH": "Deaf / Hard of Hearing",
  A: "Secular",
  ABSI: "As Bill Sees It",
  AL: "Concurrent with Alateen",
  ASL: "American Sign Language",
  B: "Big Book",
  BA: "Babysitting Available",
  BE: "Newcomer",
  BI: "Bisexual",
  BRK: "Breakfast",
  C: "Closed",
  CAN: "Candlelight",
  CF: "Child-Friendly",
  D: "Discussion",
  DB: "Digital Basket",
  DD: "Dual Diagnosis",
  DR: "Daily Reflections",
  FF: "Fragrance Free",
  G: "Gay",
  GR: "Grapevine",
  H: "Birthday",
  L: "Lesbian",
  LGBTQ: "LGBTQIAA+",
  LIT: "Literature",
  LS: "Living Sober",
  "LO-I": "Loners / Isolationists",
  M: "Men",
  MED: "Meditation",
  N: "Native American",
  NDG: "Indigenous",
  O: "Open",
  OUT: "Outdoor",
  P: "Professionals",
  POA: "Proof of Attendance",
  POC: "People of Color",
  RSL: "Russian Sign Language",
  SEN: "Seniors",
  SM: "Smoking Permitted",
  SP: "Speaker",
  ST: "Step Study",
  T: "Transgender",
  TC: "Location Temporarily Closed",
  TR: "Tradition Study",
  W: "Women",
  X: "Wheelchair Access",
  XB: "Wheelchair-Accessible Bathroom",
  XT: "Cross Talk Permitted",
  Y: "Young People",
}

test("Category bins created from all types list", () => {
  const meetingData: MeetingView = {
    slug: "meeting-1",
    name: "Meeting 1",
    types: Object.getOwnPropertyNames(oiaaTypes).map((key) => key as Category),
    timezone: "America/New_York",
    rtc: "1:10:00",
    duration: 60,
    languages: ["en"],
    features: [],
    formats: [],
    communities: [],
    groupID: new ObjectId("123456789012345678901234"),
    nextEventUTC: null,
  }

  const newMeetingData = categorizedMeeting(meetingData)

  expect(newMeetingData.type).toStrictEqual(TYPE)
  expect(newMeetingData.communities.sort()).toStrictEqual(
    [...COMMUNITIES].sort(),
  )
  expect(newMeetingData.features.sort()).toStrictEqual([...FEATURES].sort())
  expect(newMeetingData.formats.sort()).toStrictEqual([...FORMATS].sort())
})

test("Gracefully handles null `types`", () => {
  const meetingData: MeetingView = {
    slug: "meeting-2",
    name: "Meeting 2",
    timezone: "America/New_York",
    rtc: "1:10:00",
    duration: 60,
    languages: ["en"],
    features: [],
    formats: [],
    communities: [],
    type: "O",
    groupID: new ObjectId("123456789012345678901234"),
    nextEventUTC: null,
  }
  const newMeetingData = categorizedMeeting(meetingData)

  expect(newMeetingData.type).toStrictEqual([])
  expect(newMeetingData.communities.sort()).toStrictEqual([])
  expect(newMeetingData.features).toStrictEqual([])
  expect(newMeetingData.formats).toStrictEqual([])
})
