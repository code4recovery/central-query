type ISOString = string // TODO see if there is a way to better reflect where this needs to come from

interface BasicFilter {
  limit?: number
  types?: string[]
}
export interface MeetingsOptions extends BasicFilter {
  start: ISOString
  hours: number
  formats?: string[]
  features?: string[]
  communities?: string[]
  type?: string
}

export interface DayOptions extends BasicFilter {
  weekday: number
  offset: number
}

export type RTCRange = {
  lowerRTC: string
  upperRTC: string
}

export interface PipelineFields extends MeetingsOptions {
  rtcRanges: RTCRange[]
}
