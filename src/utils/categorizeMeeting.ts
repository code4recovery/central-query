export const TYPE = ["O", "C"] // 2
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
] // 16
export const FEATURES = [
  "AL-AN",
  "AL",
  "ASL",
  "BA",
  "BRK",
  "CAN",
  "CF",
  "DB",
  "X",
  "XB",
  "XT",
  "POA",
  "OUT",
  "FF",
  "RSL",
  "TC",
] // 15
export const COMMUNITIES = [
  "M",
  "W",
  "DD",
  "LGBTQ",
  "Y",
  "N",
  "BI",
  "T",
  "SEN",
  "POC",
  "P",
  "NDG",
  "L",
  "G",
  "BV-I",
  "D-HOH",
  "LO-I",
] // 18

export type Community = (typeof COMMUNITIES)[keyof typeof COMMUNITIES]
export type Feature = (typeof FEATURES)[keyof typeof FEATURES]
export type Format = (typeof FORMATS)[keyof typeof FORMATS]
export type Type = (typeof TYPE)[keyof typeof TYPE]

export type Category = Community | Feature | Format | Type

function intersection<T>(arr1: T[], arr2: T[]): T[] {
  const set1 = new Set(arr1)
  return arr2.filter((value) => set1.has(value))
}

export function categorizedMeeting(meeting: {
  name: string
  types?: Category[]
}) {
  const { types } = meeting

  delete meeting.types

  return {
    ...meeting,
    communities: intersection<Category>(types, COMMUNITIES),
    features: intersection<Category>(types, FEATURES),
    formats: intersection<Category>(types, FORMATS),
    type: intersection<Category>(types, TYPE),
  }
}
