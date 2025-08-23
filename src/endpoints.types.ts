import {
  ActiveCommunity,
  ActiveFeature,
  ActiveFormat,
  OptionalEndpointData,
} from "./common/types.js"
import { ActiveLanguage, ActiveType } from "./storage/storage.types.js"

// Use format of data in groups.json file to provide an interface for the group
export type Group = {
  name: string
  email?: string
  website?: string
  phone?: string
  notes?: string
}

export interface GroupDetails {
  groupInfo: Group
  groupMeetings: Meeting[]
}

export interface OnlineMeeting extends OptionalEndpointData {
  groupID: string
  languages: string[]
  name: string
  rtc?: string // Technically optional and could be removed if found not to be useful in OIAA Direct or other applications.
  slug: string
  timeUTC: string
  timezone: string
}

export type Meeting = OnlineMeeting

export interface MeetingFacets {
  categories: {
    communities: ActiveCommunity[]
    features: ActiveFeature[]
    formats: ActiveFormat[]
    type: ActiveType[]
  }
  languages: ActiveLanguage[]
}
