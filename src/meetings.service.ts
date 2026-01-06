import { Err, Ok } from "ts-results-es"

import {
  ActiveCommunity,
  ActiveFeature,
  ActiveFormat,
  COMMUNITIES,
  Community,
  Feature,
  FEATURES,
  Format,
  FORMATS,
  Type,
  TYPE,
} from "./common/types.js"
import Logger from "./common/logger.js"

import { ActiveType, MeetingView } from "./storage/storage.types.js"
import * as groupStore from "./storage/group.mongodb.service.js"
import * as meetingStore from "./storage/meeting.mongodb.service.js"

import { categorizedMeeting, intersection } from "./utils/categorizeMeeting.js"
import { lowerUpperLimits } from "./utils/dates.js"
import { pipelineFromQuery } from "./utils/pipelineFromQuery.js"

import {
  Group,
  GroupDetails,
  Meeting,
  MeetingFacets,
} from "./endpoints.types.js"
import { MeetingsOptions } from "./endpoint-options.types.js"

const preparedMeetings = (meetings: MeetingView[]): Meeting[] =>
  meetings.map(categorizedMeeting).map(({ groupID, ...rest }) => ({
    ...rest,
    groupID: groupID.toString(),
    timeUTC: rest.nextEventUTC,
  }))

export const getMeetings = async (
  options: MeetingsOptions,
): Promise<Ok<Meeting[]>> => {
  Logger.debug(`Time is now: ${options.start}`)
  Logger.debug(`Hours is: ${options.hours}`)
  Logger.debug(`Getting meetings with options: ${JSON.stringify(options)}`)
  const limits = options.start
    ? lowerUpperLimits(options.start, options.hours)
    : []
  Logger.debug(`Limits: ${JSON.stringify(limits)}`)
  const pipeline = pipelineFromQuery({
    ...options,
    rtcRanges: limits,
  })
  Logger.debug(`Pipeline: ${JSON.stringify(pipeline)}, ${typeof pipeline}`)
  const result = await meetingStore.query(pipeline)
  Logger.debug(`meetingStore fetch ${result.length} meetings.`)

  return Ok(preparedMeetings(result))
}

export const getFacets = async (): Promise<Ok<MeetingFacets>> => {
  Logger.debug("Getting facets (categories and languages)")
  const [activeTypes, languages] = await Promise.all([
    meetingStore.getActiveTypes(),
    meetingStore.getActiveLanguages(),
  ])

  const categories = {
    communities: activeTypes
      .filter((t) => intersection([t.code], [...COMMUNITIES]).length > 0)
      .map((t) => ({
        code: t.code as Community,
        desc: t.desc,
      })) as ActiveCommunity[],
    features: activeTypes
      .filter((t) => intersection([t.code], [...FEATURES]).length > 0)
      .map((t) => ({
        code: t.code as Feature,
        desc: t.desc,
      })) as ActiveFeature[],
    formats: activeTypes
      .filter((t) => intersection([t.code], [...FORMATS]).length > 0)
      .map((t) => ({ code: t.code as Format, desc: t.desc })) as ActiveFormat[],
    type: activeTypes
      .filter((t) => intersection([t.code], [...TYPE]).length > 0)
      .map((t) => ({ code: t.code as Type, desc: t.desc })) as ActiveType[],
  }

  Logger.debug(
    `Facets result: categories=${JSON.stringify(categories)}, languages=${
      languages.length
    }`,
  )

  return Ok({
    categories,
    languages,
  })
}

export const getBySlug = async (
  slug: string,
): Promise<Ok<Meeting> | Err<string>> => {
  Logger.debug(`Getting meeting with slug ${slug}`)
  const result = await meetingStore.bySlug(slug)
  if (!result) {
    Logger.error(`Meeting with slug ${slug} not found`)
    return Err("Meeting not found")
  }
  Logger.debug(`Meeting with slug ${slug}: ${JSON.stringify(result)}`)

  const meeting = {
    ...categorizedMeeting(result),
    timeUTC: result.nextEventUTC,
    groupID: result.groupID.toString(),
  } as Meeting

  return Ok(meeting)
}

export const getRelatedGroupInfo = async (slug: string) => {
  const { err, val } = await getBySlug(slug)
  if (err) {
    Logger.error(`Meeting with slug ${slug} not found`)
    return Err("Meeting not found")
  }
  const meeting = val as Meeting
  const groupID = meeting.groupID.toString()
  const groupInfo = await groupStore.byId(groupID)
  Logger.debug(
    `Group info for meeting with slug ${slug}: ${JSON.stringify(
      groupInfo,
    )} using groupID ${groupID}`,
  )
  const groupMeetings = await meetingStore.byGroup(groupID)
  Logger.debug(
    `Group meetings for group with ID ${groupID}: ${JSON.stringify(
      groupMeetings,
    )}`,
  )

  return Ok({
    groupInfo: groupInfo as Group, // ToDo: Confirm that `_id` should be removed or if not, add to the interface
    groupMeetings: preparedMeetings(groupMeetings) as Meeting[],
  } as GroupDetails)
}
