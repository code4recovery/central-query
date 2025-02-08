import type { DateTime } from "luxon"
import type { ObjectId } from "mongodb"

import type {
  Community,
  Feature,
  Format,
  Type,
} from "../utils/categorizeMeeting"

type Minutes = number
export interface Meeting {
  slug: string
  name: string
  timezone: string
  day: number
  time: string
  duration: Minutes
  start?: DateTime
  end?: DateTime
  conference_provider?: string
  conference_url?: string
  conference_url_notes?: string
  conference_phone?: string
  conference_phone_notes?: string
  notes?: string[]
  languages: string[]
  features: Feature[]
  formats: Format[]
  type: Type
  communities: Community[]
  group_id?: string
  tags: string[]
  search: string
  edit_url?: string
}

export interface MeetingModel extends Meeting {
  _id?: ObjectId
  types?: string[]
}
