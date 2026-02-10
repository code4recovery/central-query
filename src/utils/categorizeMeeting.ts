import {
  COMMUNITIES,
  Community,
  Feature,
  FEATURES,
  Format,
  FORMATS,
  Type,
  TYPE,
} from "../common/types.js"
import { MeetingView } from "../storage/storage.types.js"

export function intersection<T>(arr1: T[], arr2: T[]): T[] {
  const set1 = new Set(arr1)
  return arr2.filter((value) => set1.has(value))
}

export function categorizedMeeting(meeting: MeetingView): Omit<
  MeetingView,
  "types"
> & {
  communities: Community[]
  features: Feature[]
  formats: Format[]
  type?: Type
} {
  const { types } = meeting

  delete meeting.types

  const typeIntersection = intersection<Type>(types as Type[], [...TYPE])
  const meetingType = typeIntersection.includes("C")
    ? "C"
    : typeIntersection.includes("O")
    ? "O"
    : undefined

  return {
    ...meeting,
    communities: intersection<Community>(types as Community[], [
      ...COMMUNITIES,
    ]),
    features: intersection<Feature>(types as Feature[], [...FEATURES]),
    formats: intersection<Format>(types as Format[], [...FORMATS]),
    type: meetingType as Type,
  }
}
