import {
  Err,
  Ok,
} from "ts-results-es"

import Logger from "./common/logger.js"
import {
  DayOptions,
  NextOptions,
} from "./endpoint-options.types.js"
import * as groupStore from "./storage/group.mongodb.service.js"
import * as meetingStore from "./storage/meeting.mongodb.service.js"
import { MeetingModel } from "./storage/storage.types.js"
import { categorizedMeeting } from "./utils/categorizeMeeting.js"
import {
  dayLimits,
  lowerUpperLimits,
} from "./utils/dates.js"
import { pipelineFromQuery } from "./utils/pipelineFromQuery.js"

export const getMeetings = async (options: NextOptions) => {
  Logger.debug(`Time is now: ${options.start}`)
  const limits = lowerUpperLimits(options.start, options.hours)
  const result = (await meetingStore.query(
    pipelineFromQuery({
      ...options,
      rtcRanges: limits,
    }),
  )) as MeetingModel[]
  Logger.debug(`meetingStore fetch ${result.length} meetings.`)
  const meetings = result.map((meeting) => categorizedMeeting(meeting))
  return Ok(meetings)
}

export const getBySlug = async (slug: string) => {
  Logger.debug(`Getting meeting with slug ${slug}`)
  const result = await meetingStore.bySlug(slug)
  if (!result) {
    Logger.error(`Meeting with slug ${slug} not found`)
    return Err("Meeting not found")
  }
  Logger.debug(`Meeting with slug ${slug}: ${JSON.stringify(result)}`)
  return Ok(categorizedMeeting(result))
}

export const getRelatedGroupInfo = async (slug: string) => {
  const { err, val } = await getBySlug(slug)
  if (err) {
    Logger.error(`Meeting with slug ${slug} not found`)
    return Err("Meeting not found")
  }
  const meeting = val as MeetingModel
  const groupID = meeting.groupID.toString()
  const groupInfo = await groupStore.byId(groupID)
  Logger.debug(
    `Group info for meeting with slug ${slug}: ${JSON.stringify(
      groupInfo,
    )} using groupID ${groupID}`,
  )
  const groupMeetings = await meetingStore.byGroup(groupID)

  return Ok({
    groupInfo,
    groupMeetings: groupMeetings.map((mtg) => categorizedMeeting(mtg)),
  })
}

export const getDay = async (options: DayOptions) => {
  Logger.debug(`Getting all meetings for day ${options.weekday}`)
  const limits = dayLimits(options.weekday, options.offset)
  const result = await meetingStore.query(
    pipelineFromQuery({
      rtcRanges: limits,
    }),
  )
  Logger.debug(`meetingStore fetch ${result.length} meetings.`)
  return Ok(result)
}

export const getByGroup = async (groupID: string) => {
  Logger.debug(`Getting all meetings for group ${groupID}`)
  const result = await meetingStore.byGroup(groupID)
  if (!result) {
    Logger.error(`Group with ID ${groupID} not found`)
    return Err("Group not found")
  }
  Logger.debug(`Meetings for group ${groupID}: ${JSON.stringify(result)}`)
  return Ok(result)
}
