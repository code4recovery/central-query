type ISOString = string // TODO see if there is a way to better reflect where this needs to come from

interface BasicFilter {
  limit?: number
  types?: string[]
}
export interface MeetingsOptions extends BasicFilter {
  scheduled?: boolean
  rtcRanges?: RTCRange[]
  start?: ISOString
  hours?: number
  formats?: string[]
  features?: string[]
  communities?: string[]
  type?: string
  languages?: string[]
  nameQuery?: string
}

export interface DayOptions extends BasicFilter {
  weekday: number
  offset: number
}

export type RTCRange = {
  lowerRTC: string
  upperRTC: string
}
