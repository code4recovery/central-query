export const TYPE = ["O", "C"]
export const FORMATS = [
  "11",
  "12x12",
  "A",
  "ABSI",
  "B",
  "BE",
  "D",
  "DR",
  "GR",
  "H",
  "LIT",
  "LS",
  "MED",
  "SP",
  "ST",
  "TR",
]
export const FEATURES = [
  "AL-AN",
  "BA",
  "BRK",
  "CAN",
  "CF",
  "DB",
  "DD",
  "X",
  "XB",
  "XT",
  "POA",
  "OUT",
  "FF",
]
export const COMMUNITIES = [
  "M",
  "W",
  "LGBTQ",
  "Y",
  "N",
  "BI",
  "T",
  "SEN",
  "POC",
  "P",
  "NB",
  "L",
  "G",
]

export function categorizedMeeting(meeting: { name: string; types: string[] }) {
  const { types } = meeting

  delete meeting.types

  return {
    ...meeting,
    communities: types.filter((type) => COMMUNITIES.includes(type)),
    features: types.filter((type) => FEATURES.includes(type)),
    formats: types.filter((type) => FORMATS.includes(type)),
    type: types.filter((type) => TYPE.includes(type)),
  }
}
