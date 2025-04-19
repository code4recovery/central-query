import type { ObjectId } from "mongodb"

import type {
  Community,
  Feature,
  Format,
  Type,
} from "../utils/categorizeMeeting"

type Minutes = number

type MeetingBase = {
  slug: string
  name: string
  timezone: string
  timeUTC: string
  rtc: string
  communities: Community[]
  duration?: Minutes
  groupEmail?: string
  groupWebsite?: string
  groupNotes?: string
  conference_provider?: string
  conference_url?: string
  conference_url_notes?: string
  conference_phone?: string
  conference_phone_notes?: string
  notes?: string[]
}
export interface MeetingModel extends MeetingBase {
  _id?: ObjectId
  types?: string[]
  groupID: ObjectId
}

export interface Meeting extends MeetingBase {
  features: Feature[]
  formats: Format[]
  type: Type
  communities: Community[]
  groupID: string
}

// Use format of data in groups.json file to provide an interface for the group
interface Group {
  name: string
  recordID: string
  accountID: string
  createdAt: Date
  updatedAt: Date
  email?: string
  website?: string
}

export interface GroupModel extends Group {
  _id?: ObjectId
}

export interface MeetingGroup extends Meeting {
  groupEmail?: string
  groupWebsite?: string
}
