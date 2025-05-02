import { type ObjectId } from "mongodb"

import { OptionalStorageData } from "../common/types.js"

export interface MeetingView extends OptionalStorageData {
  groupID: ObjectId
  languages: string[]
  name: string
  rtc: string
  slug: string
  timezone: string
  types?: string[] // Optional, used for categorization
}

// Use format of data in groups.json file to provide an interface for the group
export interface GroupView {
  name: string
  email?: string
  website?: string
  phone?: string
  notes?: string
}
