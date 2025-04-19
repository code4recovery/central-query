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
import {
  MeetingGroup,
  MeetingModel,
} from "./storage/storage.types.js"
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

export const getGroupContact = async (slug: string) => {
  Logger.debug(`Getting the groupID for the meeting: ${slug}`)
  const meetingResult = await meetingStore.bySlug(slug)
  if (!meetingResult) {
    Logger.error(`Meeting with slug ${slug} not found`)
    return Err("Meeting not found")
  }
  Logger.debug(`Meeting for slug ${slug}: ${JSON.stringify(meetingResult)}`)
  const groupID = meetingResult.groupID
  const groupResult = await groupStore.byId(groupID)
  if (!groupResult) {
    Logger.error(`Group with ID ${groupID} not found`)
    return Ok(null)
  }
  Logger.debug(
    `Group details for meeting ${slug}: ${JSON.stringify(groupResult)}`,
  )
  const meetingWithGroupContact: MeetingGroup = {
    ...meetingResult,
    groupWebsite: groupResult.website,
    groupEmail: groupResult.email,
  }
  Logger.debug(
    `Meeting with group contact for slug ${slug}: ${JSON.stringify(
      meetingWithGroupContact,
    )}`,
  )
  return Ok(meetingWithGroupContact)
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
