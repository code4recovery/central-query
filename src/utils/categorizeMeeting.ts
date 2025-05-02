import {
  Category,
  COMMUNITIES,
  FEATURES,
  FORMATS,
  Type,
  TYPE,
} from "../common/types.js"
import { MeetingView } from "../storage/storage.types.js"

function intersection<T>(arr1: T[], arr2: T[]): T[] {
  const set1 = new Set(arr1)
  return arr2.filter((value) => set1.has(value))
}

export function categorizedMeeting(meeting: MeetingView) {
  const { types } = meeting

  delete meeting.types

  return {
    ...meeting,
    communities: intersection<Category>(types, COMMUNITIES),
    features: intersection<Category>(types, FEATURES),
    formats: intersection<Category>(types, FORMATS),
    type: intersection<Category>(types, TYPE)[0] as Type,
  }
}
