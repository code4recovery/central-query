import {
  categorizedMeeting,
  COMMUNITIES,
  FEATURES,
  FORMATS,
  TYPE,
} from "./categorizeMeeting"

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
  const meetingData = {
    name: "Meeting 1",
    types: Object.getOwnPropertyNames(oiaaTypes),
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
