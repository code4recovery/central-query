export const TYPE = ["O", "C"] as const // 2
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
] as const // 16
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
] as const // 15
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
] as const // 18

export type Community = (typeof COMMUNITIES)[number]
export type Feature = (typeof FEATURES)[number]
export type Format = (typeof FORMATS)[number]
export type Type = (typeof TYPE)[number]

export type Category = Community | Feature | Format | Type

export interface ActiveCategory<T extends string> {
  code: T
  desc: string
}
export type ActiveCommunity = ActiveCategory<Community>
export type ActiveFeature = ActiveCategory<Feature>
export type ActiveFormat = ActiveCategory<Format>
export type ActiveType = ActiveCategory<Type>

type Categories = {
  communities: Community[]
  features: Feature[]
  formats: Format[]
  type?: Type
}

type ConferenceOptions = {
  conference_provider?: string
  conference_url?: string
  conference_url_notes?: string
  conference_phone?: string
  conference_phone_notes?: string
}

type GroupContactOptions = {
  groupEmail?: string
  groupWebsite?: string
  groupNotes?: string
  groupPhone?: string
}

type Minutes = number

type OtherOptions = {
  duration?: Minutes
  notes?: string[]
}

export type OptionalStorageData = ConferenceOptions &
  GroupContactOptions &
  OtherOptions &
  Partial<Categories> // Future proofing for putting categories in database vice overloaded `types` field.

export type OptionalEndpointData = ConferenceOptions &
  GroupContactOptions &
  OtherOptions &
  Categories
